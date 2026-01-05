# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ML::EmbeddingGenerationService do
  let(:user) { create(:user) }
  let(:account) { create(:account, user: user) }
  let!(:category) { create(:category, slug: 'food', name: 'Food') }

  # Create transactions without embeddings
  let!(:transaction1) do
    create(:transaction, user: user, account: account,
           description: 'Zomato order', embedding_generated_at: nil)
  end
  let!(:transaction2) do
    create(:transaction, user: user, account: account,
           description: 'Swiggy delivery', embedding_generated_at: nil)
  end
  let!(:transaction_with_embedding) do
    create(:transaction, user: user, account: account,
           description: 'Amazon shopping', embedding_generated_at: 1.day.ago)
  end

  # Mock embedding response
  let(:mock_embedding) { Array.new(1536) { rand(-1.0..1.0) } }

  before do
    # Stub OpenAI API
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with('OPENAI_API_KEY').and_return('test-key')
  end

  describe '#generate_batch' do
    context 'when OpenAI is not configured' do
      before do
        allow(ENV).to receive(:[]).with('OPENAI_API_KEY').and_return(nil)
      end

      it 'returns failure result' do
        service = described_class.new
        result = service.generate_batch(limit: 10)

        expect(result.success?).to be false
        expect(result.errors).to include('OpenAI API key not configured')
      end
    end

    context 'when OpenAI is configured' do
      let(:mock_client) { instance_double(OpenAI::Client) }

      before do
        allow(OpenAI::Client).to receive(:new).and_return(mock_client)
      end

      it 'generates embeddings for transactions without them' do
        # Mock batch response
        allow(mock_client).to receive(:embeddings).and_return({
          'data' => [
            { 'index' => 0, 'embedding' => mock_embedding },
            { 'index' => 1, 'embedding' => mock_embedding }
          ]
        })

        service = described_class.new(user_id: user.id)
        result = service.generate_batch(limit: 10)

        expect(result.success?).to be true
        expect(result.generated_count).to eq(2)
        expect(result.failed_count).to eq(0)
      end

      it 'does not process transactions that already have embeddings' do
        allow(mock_client).to receive(:embeddings).and_return({
          'data' => [
            { 'index' => 0, 'embedding' => mock_embedding },
            { 'index' => 1, 'embedding' => mock_embedding }
          ]
        })

        service = described_class.new(user_id: user.id)
        result = service.generate_batch(limit: 10)

        # Only 2 transactions need embeddings (transaction_with_embedding excluded)
        expect(result.generated_count).to eq(2)
      end

      it 'handles empty transaction list' do
        # Mark all as having embeddings
        Transaction.update_all(embedding_generated_at: Time.current)

        service = described_class.new(user_id: user.id)
        result = service.generate_batch(limit: 10)

        expect(result.success?).to be true
        expect(result.generated_count).to eq(0)
      end

      it 'respects the limit parameter' do
        allow(mock_client).to receive(:embeddings).and_return({
          'data' => [{ 'index' => 0, 'embedding' => mock_embedding }]
        })

        service = described_class.new(user_id: user.id)
        result = service.generate_batch(limit: 1)

        expect(result.total_processed).to be <= 1
      end

      it 'handles API errors gracefully' do
        allow(mock_client).to receive(:embeddings)
          .and_raise(StandardError.new('API error'))

        service = described_class.new(user_id: user.id)
        result = service.generate_batch(limit: 10)

        expect(result.errors).to include(match(/API error/))
      end

      it 'records duration' do
        allow(mock_client).to receive(:embeddings).and_return({
          'data' => [
            { 'index' => 0, 'embedding' => mock_embedding },
            { 'index' => 1, 'embedding' => mock_embedding }
          ]
        })

        service = described_class.new(user_id: user.id)
        result = service.generate_batch(limit: 10)

        expect(result.duration).to be >= 0
      end
    end
  end

  describe '#generate_single' do
    let(:mock_client) { instance_double(OpenAI::Client) }

    before do
      allow(OpenAI::Client).to receive(:new).and_return(mock_client)
    end

    context 'when successful' do
      before do
        allow(mock_client).to receive(:embeddings).and_return({
          'data' => [{ 'embedding' => mock_embedding }]
        })
      end

      it 'generates and stores embedding for a transaction' do
        service = described_class.new

        expect {
          embedding = service.generate_single(transaction1)
          expect(embedding).to be_present
          expect(embedding.length).to eq(1536)
        }.to change { transaction1.reload.embedding_generated_at }.from(nil)
      end
    end

    context 'when OpenAI is not configured' do
      before do
        allow(ENV).to receive(:[]).with('OPENAI_API_KEY').and_return(nil)
      end

      it 'returns nil' do
        service = described_class.new
        expect(service.generate_single(transaction1)).to be_nil
      end
    end

    context 'when transaction has blank description' do
      it 'returns nil for blank descriptions' do
        # Create a valid transaction first, then update description to blank (bypassing validation)
        blank_transaction = create(:transaction, user: user, account: account,
                                   description: 'placeholder', embedding_generated_at: nil)
        blank_transaction.update_column(:description, '')

        service = described_class.new
        expect(service.generate_single(blank_transaction.reload)).to be_nil
      end
    end
  end

  describe 'batch size handling' do
    let(:mock_client) { instance_double(OpenAI::Client) }

    before do
      allow(OpenAI::Client).to receive(:new).and_return(mock_client)
      allow(mock_client).to receive(:embeddings) do |params|
        inputs = params[:parameters][:input]
        {
          'data' => inputs.each_with_index.map { |_, i| { 'index' => i, 'embedding' => mock_embedding } }
        }
      end
    end

    it 'respects custom batch size' do
      # Create more transactions
      5.times do
        create(:transaction, user: user, account: account,
               description: 'Test transaction', embedding_generated_at: nil)
      end

      service = described_class.new(user_id: user.id, batch_size: 3)

      # Should make multiple API calls with batch size 3
      expect(mock_client).to receive(:embeddings).at_least(:twice)

      service.generate_batch(limit: 10)
    end
  end
end
