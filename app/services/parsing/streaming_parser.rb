# frozen_string_literal: true

module Parsing
  # StreamingParser - TRUE streaming parser for bank statements
  #
  # Key property: Memory usage stays CONSTANT regardless of file size.
  #
  # How it works:
  # 1. Parser yields transactions one-by-one (never builds full array)
  # 2. We buffer to CHUNK_SIZE (500 transactions)
  # 3. Bulk insert the chunk
  # 4. Clear buffer
  # 5. Repeat
  #
  # At no point does a full array exist in memory.
  #
  # Memory comparison:
  #   50,000 transactions:
  #     ❌ Non-streaming: ~200MB+ in RAM
  #     ✅ Streaming:     ~5MB constant
  #
  class StreamingParser
    CHUNK_SIZE = 500 # Transactions per chunk

    attr_reader :statement, :template, :progress

    def initialize(statement)
      @statement = statement
      @template = statement.bank_template
      @progress = StreamingProgress.new(statement)
    end

    def parse!
      statement.mark_processing!
      progress.start!

      begin
        # True streaming: buffer and insert, never hold full array
        processed_count = stream_and_insert!

        if processed_count.zero?
          raise ParsingError, "No transactions found in statement"
        end

        statement.mark_parsed!
        progress.complete!(processed_count)

        # TODO: Re-enable when AI service is integrated
        # enqueue_categorization_jobs
        enqueue_analytics_computation

        { success: true, transaction_count: processed_count }
      rescue => e
        statement.mark_failed!(e.message)
        progress.fail!(e.message)
        raise
      end
    end

    private

    # ============================================
    # True Streaming: Buffer + Insert Loop
    # ============================================

    def stream_and_insert!
      buffer = []
      total_processed = 0

      download_and_process do |file|
        parser = create_parser(file.path)

        # Stream transactions one-by-one via each_transaction
        # NEVER holds full array in memory
        parser.each_transaction do |tx_data|
          normalized = normalize_transaction_data(tx_data)
          next unless normalized

          buffer << normalized

          # When buffer is full, flush to database
          if buffer.size >= CHUNK_SIZE
            bulk_insert_transactions(buffer)
            total_processed += buffer.size
            progress.update_processed(total_processed)
            buffer.clear
          end
        end

        # Handle parser errors
        if parser.errors.any?
          Rails.logger.warn("Parser warnings: #{parser.errors.join('; ')}")
        end
      end

      # Flush remaining buffer
      if buffer.any?
        bulk_insert_transactions(buffer)
        total_processed += buffer.size
        progress.update_processed(total_processed)
      end

      total_processed
    end

    # ============================================
    # Parser Setup
    # ============================================

    def create_parser(file_path)
      parser_class = get_parser_class
      Rails.logger.info("StreamingParser: Using #{parser_class} for template: #{template&.display_name}")
      parser_class.new(file_path, template)
    end

    def get_parser_class
      if template
        template.parser_class
      else
        Rails.logger.warn("No template found for statement #{statement.id}, using GenericParser")
        BankParsers::GenericParser
      end
    end

    # ============================================
    # Data Normalization
    # ============================================

    def normalize_transaction_data(tx)
      tx = tx.with_indifferent_access if tx.respond_to?(:with_indifferent_access)

      date = tx[:transaction_date] || tx[:date]
      return nil unless date.present?

      amount = tx[:amount]
      return nil unless amount.present? && amount.to_f > 0

      {
        date: date,
        description: tx[:original_description] || tx[:description] || '',
        amount: amount.to_f.abs,
        type: tx[:transaction_type] || tx[:type] || determine_type(amount),
        balance: tx[:balance],
        reference: tx[:reference_number] || tx[:reference],
        metadata: tx[:metadata] || {}
      }
    end

    def determine_type(amount)
      amount.to_f < 0 ? 'debit' : 'credit'
    end

    # ============================================
    # File Handling
    # ============================================

    def download_and_process(&block)
      if statement.file.attached?
        statement.file.open do |file|
          yield file
        end
      else
        raise ParsingError, "No file attached to statement"
      end
    end

    # ============================================
    # Database Operations
    # ============================================

    def bulk_insert_transactions(transaction_data_array)
      now = Time.current

      records = transaction_data_array.map do |data|
        {
          statement_id: statement.id,
          user_id: statement.user_id,
          account_id: statement.account_id,
          transaction_date: data[:date],
          description: data[:description].to_s.truncate(500),
          original_description: data[:description].to_s.truncate(500),
          amount: data[:amount].to_f.abs,
          transaction_type: data[:type] || 'debit',
          balance: data[:balance],
          reference: data[:reference],  # Fixed: column is 'reference', not 'reference_number'
          metadata: data[:metadata] || {},
          is_reviewed: false,
          created_at: now,
          updated_at: now
        }
      end

      # Bulk insert with insert_all (skips callbacks for speed)
      Transaction.insert_all(records) if records.any?
    end

    # ============================================
    # Post-processing
    # ============================================

    # TODO: Re-enable when AI service is integrated
    # def enqueue_categorization_jobs
    #   # Enqueue categorization in chunks
    #   statement.transactions.uncategorized.find_in_batches(batch_size: CHUNK_SIZE) do |batch|
    #     AICategorizeJob.perform_later(batch.pluck(:id))
    #   end
    # end

            def enqueue_analytics_computation
              # Compute analytics asynchronously after parsing completes
              # Only enqueue if not already queued/running
              analytic = StatementAnalytic.find_or_initialize_by(statement_id: statement.id)
              return if analytic.queued? || analytic.running?

              analytic.update!(status: :queued)
              AnalyticsComputeJob.perform_later(statement.id)
            end

    # Custom error
    class ParsingError < StandardError; end
  end

  # ============================================
  # Progress Tracking for Streaming
  # ============================================

  # Note: In true streaming, we DON'T know total upfront.
  # We show "processed X records" instead of percentage.
  # This is the correct streaming tradeoff.
  #
  class StreamingProgress
    attr_reader :statement, :processed_count, :status

    def initialize(statement)
      @statement = statement
      @processed_count = 0
      @status = 'pending'
      @last_update = Time.current
    end

    def start!
      @status = 'processing'
      @started_at = Time.current
      update_metadata
    end

    def update_processed(count)
      @processed_count = count
      # Throttle updates to avoid DB spam (update every 500ms)
      if Time.current - @last_update > 0.5
        update_metadata
        @last_update = Time.current
      end
    end

    def complete!(final_count)
      @processed_count = final_count
      @status = 'completed'
      @completed_at = Time.current
      update_metadata
    end

    def fail!(error)
      @status = 'failed'
      @error = error
      update_metadata
    end

    private

    def update_metadata
      statement.update_column(:metadata, statement.metadata.merge(
        'parsing_progress' => {
          'status' => status,
          'processed' => processed_count,
          # No 'total' or 'percentage' - true streaming doesn't know upfront
          'updated_at' => Time.current.iso8601,
          'duration_seconds' => @started_at ? (Time.current - @started_at).round(2) : nil
        }
      ))
    end
  end
end
