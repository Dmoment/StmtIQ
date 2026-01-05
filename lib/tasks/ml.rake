# frozen_string_literal: true

namespace :ml do
  desc 'Create IVFFlat index for pgvector (requires existing embeddings)'
  task create_vector_index: :environment do
    puts 'Creating IVFFlat index for transactions.embedding...'

    # Count embeddings first
    embedding_count = ActiveRecord::Base.connection.execute(
      "SELECT COUNT(*) FROM transactions WHERE embedding IS NOT NULL"
    ).first['count'].to_i

    if embedding_count < 100
      puts "Warning: Only #{embedding_count} embeddings found. IVFFlat works best with 1000+ vectors."
      puts "Skipping index creation. Run again after generating more embeddings."
      next
    end

    # Calculate optimal number of lists (sqrt of row count)
    lists = [Math.sqrt(embedding_count).ceil, 10].max
    lists = [lists, 1000].min # Cap at 1000

    puts "Creating index with #{lists} lists for #{embedding_count} embeddings..."

    begin
      # Drop existing index if any
      ActiveRecord::Base.connection.execute(
        "DROP INDEX IF EXISTS idx_transactions_embedding_ivfflat"
      )

      # Create IVFFlat index for cosine distance
      ActiveRecord::Base.connection.execute(<<-SQL)
        CREATE INDEX idx_transactions_embedding_ivfflat
        ON transactions
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = #{lists})
      SQL

      puts "Index created successfully!"
    rescue => e
      puts "Error creating index: #{e.message}"
      puts "You may need to run: CREATE EXTENSION IF NOT EXISTS vector;"
    end

    # Also create index for labeled_examples
    labeled_count = ActiveRecord::Base.connection.execute(
      "SELECT COUNT(*) FROM labeled_examples WHERE embedding IS NOT NULL"
    ).first['count'].to_i rescue 0

    if labeled_count >= 50
      lists_labeled = [Math.sqrt(labeled_count).ceil, 10].max

      puts "Creating index for labeled_examples with #{lists_labeled} lists..."

      ActiveRecord::Base.connection.execute(
        "DROP INDEX IF EXISTS idx_labeled_examples_embedding_ivfflat"
      )

      ActiveRecord::Base.connection.execute(<<-SQL)
        CREATE INDEX idx_labeled_examples_embedding_ivfflat
        ON labeled_examples
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = #{lists_labeled})
      SQL

      puts "Labeled examples index created!"
    end
  end

  desc 'Generate embeddings for all transactions missing them'
  task generate_embeddings: :environment do
    unless ENV['OPENAI_API_KEY'].present?
      puts "Error: OPENAI_API_KEY not set"
      exit 1
    end

    batch_size = ENV.fetch('BATCH_SIZE', 100).to_i
    delay_seconds = ENV.fetch('DELAY_SECONDS', 1).to_f

    transactions = Transaction.where(embedding: nil)
                              .where.not(description: nil)
                              .limit(ENV.fetch('LIMIT', 1000).to_i)

    total = transactions.count
    puts "Generating embeddings for #{total} transactions..."

    processed = 0
    transactions.find_in_batches(batch_size: batch_size) do |batch|
      batch.each do |tx|
        ML::GenerateEmbeddingJob.perform_later(tx.id)
        processed += 1
        print "\rProgress: #{processed}/#{total} (#{(processed * 100.0 / total).round(1)}%)"
      end

      # Rate limiting
      sleep(delay_seconds)
    end

    puts "\nEnqueued #{processed} embedding generation jobs"
  end

  desc 'Show ML categorization statistics'
  task stats: :environment do
    total = Transaction.count
    categorized = Transaction.where.not(ai_category_id: nil).count
    uncategorized = total - categorized

    puts "\n=== ML Categorization Stats ==="
    puts "Total transactions: #{total}"
    puts "Categorized: #{categorized} (#{(categorized * 100.0 / total).round(1)}%)"
    puts "Uncategorized: #{uncategorized} (#{(uncategorized * 100.0 / total).round(1)}%)"

    puts "\n--- By Method ---"
    methods = Transaction.where.not(metadata: nil)
                         .group("metadata->>'categorization_method'")
                         .count

    methods.each do |method, count|
      next unless method
      pct = (count * 100.0 / categorized).round(1)
      puts "  #{method}: #{count} (#{pct}%)"
    end

    puts "\n--- Confidence Distribution ---"
    high = Transaction.where('confidence >= 0.8').count
    medium = Transaction.where('confidence >= 0.5 AND confidence < 0.8').count
    low = Transaction.where('confidence > 0 AND confidence < 0.5').count

    puts "  High (>=80%): #{high}"
    puts "  Medium (50-80%): #{medium}"
    puts "  Low (<50%): #{low}"

    puts "\n--- Embeddings ---"
    with_embeddings = ActiveRecord::Base.connection.execute(
      "SELECT COUNT(*) FROM transactions WHERE embedding IS NOT NULL"
    ).first['count'].to_i
    puts "  Transactions with embeddings: #{with_embeddings}"

    labeled = LabeledExample.count rescue 0
    puts "  Labeled examples: #{labeled}"

    user_rules = UserRule.count rescue 0
    puts "  User rules: #{user_rules}"
  end

  desc 'Recategorize all transactions (resets AI categories)'
  task recategorize: :environment do
    unless ENV['CONFIRM'] == 'true'
      puts "This will recategorize ALL transactions."
      puts "Run with CONFIRM=true to proceed."
      exit 1
    end

    # Reset AI categories
    Transaction.update_all(ai_category_id: nil, confidence: nil, ai_explanation: nil)

    # Enqueue categorization
    Transaction.find_in_batches(batch_size: 500) do |batch|
      ML::CategorizeBatchJob.perform_later(batch.pluck(:id))
    end

    puts "Recategorization jobs enqueued"
  end
end
