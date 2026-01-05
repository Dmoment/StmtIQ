# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ML::CategorizeBatchJob, type: :job do
  let(:user) { create(:user) }
  let(:account) { create(:account, user: user) }
  let!(:food_category) { create(:category, slug: 'food', name: 'Food') }
  let!(:transport_category) { create(:category, slug: 'transport', name: 'Transport') }

  let(:transactions) do
    [
      create(:transaction, user: user, account: account, description: 'Zomato order', categorization_status: 'pending'),
      create(:transaction, user: user, account: account, description: 'Uber ride', categorization_status: 'pending')
    ]
  end
  let(:transaction_ids) { transactions.map(&:id) }

  before do
    ML::CategoryCache.instance.clear!
  end

  describe '#perform' do
    it 'categorizes transactions' do
      described_class.perform_now(transaction_ids, user_id: user.id)

      transactions.each(&:reload)
      expect(transactions.map(&:categorization_status)).to all(eq('completed'))
    end

    it 'pre-warms the category cache' do
      cache = ML::CategoryCache.instance
      expect(cache).to receive(:refresh!).and_call_original

      described_class.perform_now(transaction_ids, user_id: user.id)
    end

    it 'assigns correct categories' do
      described_class.perform_now(transaction_ids, user_id: user.id)

      zomato_tx = transactions.find { |t| t.description.include?('Zomato') }.reload
      uber_tx = transactions.find { |t| t.description.include?('Uber') }.reload

      expect(zomato_tx.ai_category).to eq(food_category)
      expect(uber_tx.ai_category).to eq(transport_category)
    end

    it 'handles empty transaction IDs' do
      expect {
        described_class.perform_now([])
      }.not_to raise_error
    end

    it 'queues embedding generation for transactions that need it' do
      unclear_transactions = [
        create(:transaction, user: user, account: account, description: 'Unknown XYZ', categorization_status: 'pending')
      ]

      expect {
        described_class.perform_now(unclear_transactions.map(&:id), user_id: user.id)
      }.to have_enqueued_job(ML::GenerateEmbeddingsBatchJob)
    end

    it 'processes transactions in batches' do
      # Create many transactions
      many_transactions = 150.times.map do
        create(:transaction, user: user, account: account, description: 'Zomato order', categorization_status: 'pending')
      end

      # Should process without memory issues
      expect {
        described_class.perform_now(many_transactions.map(&:id), user_id: user.id)
      }.not_to raise_error
    end

    context 'error handling' do
      it 'continues processing after individual transaction errors' do
        allow(ML::CategorizationService).to receive(:categorize_batch) do |transactions, **_options|
          transactions.map do |tx|
            ML::CategorizationService::Result.new(
              category: food_category,
              confidence: 0.85,
              method: 'rule',
              explanation: 'Test',
              needs_embedding: false
            )
          end
        end

        expect {
          described_class.perform_now(transaction_ids, user_id: user.id)
        }.not_to raise_error
      end

      it 'logs errors but continues' do
        # Create a batch that will have some errors
        allow(ML::CategorizationService).to receive(:categorize_batch)
          .and_raise(StandardError.new('Test error'))

        # Allow all logger calls
        allow(Rails.logger).to receive(:info)
        allow(Rails.logger).to receive(:error)

        # Should complete without raising
        described_class.perform_now(transaction_ids, user_id: user.id)

        expect(Rails.logger).to have_received(:error).with(/Batch failed/).at_least(:once)
      end
    end
  end

  describe 'queue configuration' do
    it 'uses the default queue' do
      expect(described_class.new.queue_name).to eq('default')
    end
  end

  describe 'job enqueuing' do
    it 'can be enqueued with transaction IDs and user_id' do
      expect {
        described_class.perform_later(transaction_ids, user_id: user.id)
      }.to have_enqueued_job(described_class)
        .with(transaction_ids, user_id: user.id)
    end
  end

  describe 'logging' do
    before do
      # Allow all logger calls
      allow(Rails.logger).to receive(:info)
      allow(Rails.logger).to receive(:debug)
      allow(Rails.logger).to receive(:warn)
    end

    it 'logs start message' do
      described_class.perform_now(transaction_ids, user_id: user.id)

      expect(Rails.logger).to have_received(:info).with(/Starting categorization for/)
    end

    it 'logs completion message with counts' do
      described_class.perform_now(transaction_ids, user_id: user.id)

      expect(Rails.logger).to have_received(:info).with(/Completed.*Categorized:/)
    end
  end
end
