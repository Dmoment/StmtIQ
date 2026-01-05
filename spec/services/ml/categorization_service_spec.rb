# frozen_string_literal: true

require 'rails_helper'

# Ensure all ML services are loaded
require_relative '../../../app/services/ml/llm_service'

RSpec.describe ML::CategorizationService do
  let(:user) { create(:user) }
  let(:account) { create(:account, user: user) }
  let!(:food_category) { create(:category, slug: 'food', name: 'Food & Dining') }
  let!(:transport_category) { create(:category, slug: 'transport', name: 'Transport') }
  let!(:shopping_category) { create(:category, slug: 'shopping', name: 'Shopping') }

  let(:transaction) do
    create(:transaction,
           user: user,
           account: account,
           description: 'Zomato food order',
           categorization_status: 'pending')
  end

  before do
    # Clear category cache before each test
    ML::CategoryCache.instance.clear!

    # Stub OpenAI for LLM tests
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with('OPENAI_API_KEY').and_return('test-key')
  end

  describe '#categorize!' do
    context 'when rules match with high confidence' do
      it 'categorizes using rules' do
        service = described_class.new(transaction, user: user)
        result = service.categorize!

        expect(result.success?).to be true
        expect(result.category).to eq(food_category)
        expect(result.method).to eq('rule')
        expect(result.confidence).to be >= 0.7
      end

      it 'updates transaction with category' do
        service = described_class.new(transaction, user: user)
        service.categorize!

        transaction.reload
        expect(transaction.ai_category).to eq(food_category)
        expect(transaction.categorization_status).to eq('completed')
        expect(transaction.confidence).to be_present
      end

      it 'stores metadata about categorization method' do
        service = described_class.new(transaction, user: user)
        service.categorize!

        transaction.reload
        expect(transaction.metadata['categorization_method']).to eq('rule')
        expect(transaction.metadata['normalized_description']).to be_present
      end
    end

    context 'when rules do not match' do
      let(:unclear_transaction) do
        create(:transaction,
               user: user,
               account: account,
               description: 'PAYMENT TO XYZ123',
               categorization_status: 'pending')
      end

      it 'tries embeddings if available' do
        # Mock embedding service to return nil (no match)
        embedding_service = instance_double(ML::EmbeddingService)
        allow(ML::EmbeddingService).to receive(:new).and_return(embedding_service)
        allow(embedding_service).to receive(:categorize).and_return(nil)

        service = described_class.new(unclear_transaction, user: user, options: { enable_llm: false })
        result = service.categorize!

        expect(result.needs_embedding).to be true
      end

      it 'queues embedding generation when needed' do
        service = described_class.new(unclear_transaction, user: user, options: { enable_llm: false })

        expect {
          service.categorize!
        }.to have_enqueued_job(ML::GenerateEmbeddingJob).with(unclear_transaction.id)
      end
    end

    context 'with embeddings disabled' do
      it 'skips embedding step' do
        expect(ML::EmbeddingService).not_to receive(:new)

        service = described_class.new(transaction, user: user, options: { enable_embeddings: false })
        service.categorize!
      end
    end

    context 'with LLM disabled' do
      let(:unclear_transaction) do
        create(:transaction,
               user: user,
               account: account,
               description: 'Unknown payment',
               categorization_status: 'pending')
      end

      it 'skips LLM step' do
        # Track whether LLM service is instantiated
        llm_instantiated = false
        original_new = ML::LLMService.method(:new)
        allow(ML::LLMService).to receive(:new) do |*args, **kwargs|
          llm_instantiated = true
          original_new.call(*args, **kwargs)
        end

        service = described_class.new(unclear_transaction, user: user, options: { enable_llm: false })
        service.categorize!

        expect(llm_instantiated).to be false
      end
    end

    context 'when LLM is needed' do
      let(:unclear_transaction) do
        create(:transaction,
               user: user,
               account: account,
               description: 'XYZQWERTY12345', # Nonsensical to ensure no rule matches
               categorization_status: 'pending')
      end

      let(:mock_client) { instance_double(OpenAI::Client) }

      before do
        # Refresh cache so shopping category is available
        ML::CategoryCache.instance.refresh!

        allow(OpenAI::Client).to receive(:new).and_return(mock_client)
        allow(mock_client).to receive(:chat).and_return({
          'choices' => [{
            'message' => {
              'content' => '{"category": "shopping", "confidence": 0.8, "explanation": "Appears to be a purchase"}'
            }
          }]
        })
      end

      it 'falls back to LLM when rules and embeddings fail' do
        # Ensure rule engine returns low confidence
        rule_engine = instance_double(ML::RuleEngine)
        allow(ML::RuleEngine).to receive(:new).and_return(rule_engine)
        allow(rule_engine).to receive(:categorize).and_return({
          confidence: 0.2,
          category: nil,
          method: 'none',
          explanation: 'No rule matched'
        })

        service = described_class.new(unclear_transaction, user: user, options: { enable_embeddings: false })
        result = service.categorize!

        expect(result.success?).to be true
        expect(result.method).to eq('llm')
        expect(result.category).to eq(shopping_category)
      end
    end

    context 'error handling' do
      it 'handles rule engine errors gracefully' do
        allow(ML::RuleEngine).to receive(:new).and_raise(StandardError.new('Rule error'))

        service = described_class.new(transaction, user: user)

        expect { service.categorize! }.to raise_error(StandardError)
      end

      it 'handles embedding errors gracefully and continues' do
        embedding_service = instance_double(ML::EmbeddingService)
        allow(ML::EmbeddingService).to receive(:new).and_return(embedding_service)
        allow(embedding_service).to receive(:categorize).and_raise(StandardError.new('Embedding error'))

        service = described_class.new(transaction, user: user, options: { enable_llm: false })
        result = service.categorize!

        # Should still succeed with rules
        expect(result.success?).to be true
      end

      it 'handles LLM errors gracefully' do
        unclear_transaction = create(:transaction,
                                     user: user,
                                     account: account,
                                     description: 'Unknown ABC',
                                     categorization_status: 'pending')

        mock_client = instance_double(OpenAI::Client)
        allow(OpenAI::Client).to receive(:new).and_return(mock_client)
        allow(mock_client).to receive(:chat).and_raise(StandardError.new('LLM error'))

        service = described_class.new(unclear_transaction, user: user, options: { enable_embeddings: false })
        result = service.categorize!

        # Should complete without crashing
        expect(result).to be_a(described_class::Result)
      end
    end
  end

  describe '.categorize_batch' do
    let(:transactions) do
      [
        create(:transaction, user: user, account: account, description: 'Zomato order', categorization_status: 'pending'),
        create(:transaction, user: user, account: account, description: 'Uber ride', categorization_status: 'pending'),
        create(:transaction, user: user, account: account, description: 'Amazon shopping', categorization_status: 'pending')
      ]
    end

    it 'categorizes multiple transactions' do
      results = described_class.categorize_batch(transactions, user: user, options: { queue_embeddings: false })

      expect(results.length).to eq(3)
      expect(results.all?(&:success?)).to be true
    end

    it 'pre-warms the category cache' do
      cache = ML::CategoryCache.instance
      expect(cache).to receive(:refresh!).and_call_original

      described_class.categorize_batch(transactions, user: user, options: { queue_embeddings: false })
    end

    it 'queues embedding generation for transactions that need it' do
      unclear_transactions = [
        create(:transaction, user: user, account: account, description: 'Unknown XYZ', categorization_status: 'pending'),
        create(:transaction, user: user, account: account, description: 'Random ABC', categorization_status: 'pending')
      ]

      expect {
        described_class.categorize_batch(unclear_transactions, user: user, options: { enable_llm: false })
      }.to have_enqueued_job(ML::GenerateEmbeddingsBatchJob)
    end

    it 'returns empty array for empty input' do
      results = described_class.categorize_batch([])
      expect(results).to eq([])
    end
  end

  describe 'Result struct' do
    let(:result) do
      described_class::Result.new(
        category: food_category,
        confidence: 0.85,
        method: 'rule',
        explanation: 'Matched keyword: zomato',
        needs_embedding: false
      )
    end

    it 'has success? method' do
      expect(result.success?).to be true
    end

    it 'reports failure when no category' do
      failed_result = described_class::Result.new(category: nil, confidence: 0, method: 'none', explanation: 'No match', needs_embedding: true)
      expect(failed_result.success?).to be false
    end

    it 'can be converted to hash' do
      hash = result.to_h
      expect(hash[:category]).to eq(food_category)
      expect(hash[:confidence]).to eq(0.85)
      expect(hash[:method]).to eq('rule')
    end
  end

  describe 'category cache integration' do
    it 'uses category cache for lookups' do
      cache = ML::CategoryCache.instance
      expect(cache).to receive(:find_by_slug).at_least(:once).and_call_original

      service = described_class.new(transaction, user: user)
      service.categorize!
    end

    it 'does not make N+1 Category queries' do
      transactions = 5.times.map do
        create(:transaction, user: user, account: account, description: 'Zomato order', categorization_status: 'pending')
      end

      cache = ML::CategoryCache.instance
      # Cache should only load categories once (via refresh!)
      expect(cache).to receive(:refresh!).once.and_call_original

      # find_by_slug should use cache, not DB
      original_find_by_slug = cache.method(:find_by_slug)
      slug_calls = 0
      allow(cache).to receive(:find_by_slug) do |slug|
        slug_calls += 1
        original_find_by_slug.call(slug)
      end

      described_class.categorize_batch(transactions, user: user, options: { queue_embeddings: false })

      # Multiple slug lookups should all hit the cache
      expect(slug_calls).to be > 0
    end
  end
end
