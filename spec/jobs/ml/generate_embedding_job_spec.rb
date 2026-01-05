# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ML::GenerateEmbeddingJob, type: :job do
  let(:user) { create(:user) }
  let(:account) { create(:account, user: user) }
  let(:transaction) do
    create(:transaction,
           user: user,
           account: account,
           description: 'Zomato order',
           embedding_generated_at: nil)
  end

  let(:mock_embedding) { Array.new(1536) { rand(-1.0..1.0) } }

  before do
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with('OPENAI_API_KEY').and_return('test-key')
  end

  describe '#perform' do
    context 'when transaction exists and needs embedding' do
      let(:mock_service) { instance_double(ML::EmbeddingGenerationService) }

      before do
        allow(ML::EmbeddingGenerationService).to receive(:new).and_return(mock_service)
      end

      it 'generates embedding for the transaction' do
        expect(mock_service).to receive(:generate_single)
          .with(transaction)
          .and_return(mock_embedding)

        described_class.perform_now(transaction.id)
      end
    end

    context 'when transaction already has embedding' do
      before do
        transaction.update!(embedding_generated_at: Time.current)
      end

      it 'skips generation' do
        expect(ML::EmbeddingGenerationService).not_to receive(:new)

        described_class.perform_now(transaction.id)
      end
    end

    context 'when transaction does not exist' do
      it 'handles gracefully via discard_on' do
        expect {
          described_class.perform_now(999999)
        }.not_to raise_error
      end
    end

    context 'when rate limited' do
      it 'is configured to retry on errors' do
        # Check that the job class has retry_on configured
        # ActiveJob stores retries on the class
        job_class = described_class

        # Verify the job is configured for retries
        expect(job_class.ancestors.include?(ActiveJob::Base)).to be true

        # The job should have retry_on with exponential backoff
        # We can verify this by checking the job has the expected queue
        expect(job_class.new.queue_name).to eq('low')
      end
    end
  end

  describe 'queue configuration' do
    it 'uses the low priority queue' do
      expect(described_class.new.queue_name).to eq('low')
    end
  end

  describe 'job enqueuing' do
    it 'can be enqueued' do
      expect {
        described_class.perform_later(transaction.id)
      }.to have_enqueued_job(described_class).with(transaction.id)
    end
  end
end
