# frozen_string_literal: true

require 'google/apis/gmail_v1'

module Gmail
  # SOLID: Single Responsibility - Orchestrates Gmail sync workflow
  # SOLID: Dependency Inversion - Dependencies injected, not hardcoded
  class SyncService
    MAX_EMAILS_PER_SYNC = 50

    attr_reader :connection, :gmail_service, :stats

    # SOLID: Dependency Inversion - Accept dependencies as parameters
    def initialize(connection, query_builder: QueryBuilder.new,
                   pdf_filter: PdfFilter.new, invoice_creator: InvoiceCreator.new)
      @connection = connection
      @query_builder = query_builder
      @pdf_filter = pdf_filter
      @invoice_creator = invoice_creator
      @stats = { emails_found: 0, attachments_processed: 0, invoices_created: 0, errors: [] }
      @last_history_id = nil # PERFORMANCE: Cache history_id
    end

    def call
      return failure('Connection not active') unless connection.active?
      return failure('Sync disabled') unless connection.sync_enabled?

      connection.mark_syncing!

      # Ensure valid token
      ensure_valid_token!

      # Initialize Gmail service
      @gmail_service = build_gmail_service

      # Fetch and process invoice emails
      process_invoice_emails

      # Record successful sync
      connection.record_sync!(history_id: @last_history_id)
      connection.mark_active!

      success
    rescue Gmail::OauthService::TokenError => e
      handle_token_error(e)
    rescue Google::Apis::AuthorizationError => e
      handle_auth_error(e)
    rescue StandardError => e
      handle_error(e)
    end

    private

    def ensure_valid_token!
      return unless connection.token_expiring_soon?

      Rails.logger.info("Refreshing token for Gmail connection #{connection.id}")
      tokens = Gmail::OauthService.refresh_token(connection.refresh_token)
      connection.update_tokens!(
        access_token: tokens[:access_token],
        refresh_token: tokens[:refresh_token],
        expires_at: tokens[:expires_at]
      )
    end

    def build_gmail_service
      service = Google::Apis::GmailV1::GmailService.new
      service.authorization = Signet::OAuth2::Client.new(
        access_token: connection.access_token
      )
      service
    end

    def process_invoice_emails
      user = connection.user

      # SOLID: Delegate to QueryBuilder (Single Responsibility)
      date_range = @query_builder.transaction_date_range(user)
      vendor_keywords = @query_builder.extract_vendor_keywords(user)

      Rails.logger.info("Transaction date range: #{date_range[:start]} to #{date_range[:end]}")
      Rails.logger.info("Found #{vendor_keywords.size} vendor keywords: #{vendor_keywords.first(10).join(', ')}")

      queries = @query_builder.build_queries(
        date_range: date_range,
        vendor_keywords: vendor_keywords,
        exclude_message_ids: connection.synced_message_ids
      )

      Rails.logger.info("Running #{queries.size} targeted Gmail searches")

      # Search and collect unique messages
      all_messages = search_all_queries(queries)

      @stats[:emails_found] = all_messages.size
      Rails.logger.info("Found #{all_messages.size} potential invoice emails")

      # Process each email
      all_messages.values.first(MAX_EMAILS_PER_SYNC).each do |message_stub|
        process_email(message_stub.id)
      rescue StandardError => e
        @stats[:errors] << { message_id: message_stub.id, error: e.message }
        Rails.logger.error("Error processing email #{message_stub.id}: #{e.message}")
      end
    end

    # SOLID: Extracted method (Single Responsibility)
    def search_all_queries(queries)
      all_messages = {}

      queries.each do |query|
        Rails.logger.debug("Searching Gmail: #{query}")
        messages = search_emails(query)
        messages.each { |msg| all_messages[msg.id] = msg }

        break if all_messages.size >= MAX_EMAILS_PER_SYNC
      end

      all_messages
    end

    def search_emails(query)
      messages = []
      page_token = nil

      # PERFORMANCE: Fetch profile only once per sync (cached in @last_history_id)
      fetch_history_id_once!

      loop do
        result = gmail_service.list_user_messages(
          'me',
          q: query,
          max_results: [MAX_EMAILS_PER_SYNC - messages.size, 100].min,
          page_token: page_token
        )

        messages.concat(result.messages || [])

        page_token = result.next_page_token
        break if page_token.nil? || messages.size >= MAX_EMAILS_PER_SYNC
      end

      messages.first(MAX_EMAILS_PER_SYNC)
    end

    # PERFORMANCE: Cache history_id to avoid multiple profile fetches
    def fetch_history_id_once!
      return if @last_history_id

      profile = gmail_service.get_user_profile('me')
      @last_history_id = profile.history_id
    end

    def process_email(message_id)
      # Skip if already processed
      if Invoice.exists?(user: connection.user, gmail_message_id: message_id)
        Rails.logger.debug("Skipping already processed message: #{message_id}")
        return
      end

      # Fetch full message with explicit format to ensure we get attachments
      message = gmail_service.get_user_message('me', message_id, format: 'full')

      # Extract email metadata
      email_data = extract_email_data(message)

      Rails.logger.info("Processing email: #{email_data[:subject]} from #{email_data[:from]}")
      Rails.logger.debug("Message payload present: #{message.payload.present?}")
      Rails.logger.debug("Message payload parts count: #{message.payload&.parts&.size || 0}")

      # Find PDF attachments
      pdf_attachments = find_pdf_attachments(message)

      Rails.logger.info("Found #{pdf_attachments.size} PDF attachments in message #{message_id}")

      if pdf_attachments.empty?
        Rails.logger.debug("No PDF attachments found, skipping message")
        return
      end

      # Process each PDF attachment as an invoice
      pdf_attachments.each do |attachment|
        create_invoice_from_attachment(message_id, email_data, attachment)
      end
    end

    def extract_email_data(message)
      headers = message.payload.headers.to_h { |h| [h.name.downcase, h.value] }

      {
        subject: headers['subject'],
        from: headers['from'],
        to: headers['to'],
        date: parse_email_date(headers['date']),
        snippet: message.snippet
      }
    end

    def parse_email_date(date_str)
      return nil unless date_str

      DateTime.parse(date_str)
    rescue ArgumentError
      nil
    end

    def find_pdf_attachments(message)
      attachments = []

      # Recursively search for PDF parts
      find_pdf_parts(message.payload, attachments)

      attachments
    end

    def find_pdf_parts(part, attachments, depth = 0)
      return unless part

      indent = '  ' * depth
      Rails.logger.debug("#{indent}Checking part: mime=#{part.mime_type}, filename=#{part.filename.inspect}")

      # Check if this part is a PDF attachment
      if part.filename.present? && part.filename.downcase.end_with?('.pdf')
        filename = part.filename
        size = part.body&.size || 0

        # SOLID: Delegate filtering to PdfFilter (Single Responsibility)
        skip_reason = @pdf_filter.should_skip?(filename: filename, size: size)

        if skip_reason
          Rails.logger.info("#{indent}  -> Skipping PDF '#{filename}': #{skip_reason}")
        elsif part.body&.attachment_id.present?
          Rails.logger.debug("#{indent}  -> PDF accepted: #{filename} (#{size} bytes)")
          attachments << {
            filename: filename,
            attachment_id: part.body.attachment_id,
            size: size
          }
        elsif part.body&.data.present?
          Rails.logger.debug("#{indent}  -> PDF accepted (inline): #{filename} (#{size} bytes)")
          attachments << {
            filename: filename,
            data: part.body.data,
            size: size
          }
        else
          Rails.logger.debug("#{indent}  -> PDF has no attachment_id or data, skipping")
        end
      end

      # Recursively check nested parts
      if part.parts.present?
        Rails.logger.debug("#{indent}  -> Has #{part.parts.size} nested parts")
        part.parts.each do |nested_part|
          find_pdf_parts(nested_part, attachments, depth + 1)
        end
      end
    end

    def create_invoice_from_attachment(message_id, email_data, attachment)
      content = download_attachment(message_id, attachment)
      return unless content

      # SOLID: Delegate page validation to PdfFilter (Single Responsibility)
      unless @pdf_filter.valid_page_count?(content)
        page_count = @pdf_filter.pdf_page_count(content)
        Rails.logger.info("Skipping PDF '#{attachment[:filename]}': #{page_count} pages exceeds limit")
        return
      end

      @stats[:attachments_processed] += 1

      # SOLID: Delegate invoice creation to InvoiceCreator (Single Responsibility)
      invoice = @invoice_creator.create_from_pdf(
        user: connection.user,
        message_id: message_id,
        content: content,
        filename: attachment[:filename]
      )

      @stats[:invoices_created] += 1

      Rails.logger.info("Created invoice #{invoice.id} from Gmail message #{message_id}")

      invoice
    end

    def download_attachment(message_id, attachment)
      if attachment[:data]
        # Inline attachment - the Gmail API Ruby client returns raw data
        # that may need decoding if it's base64 encoded
        data = attachment[:data]
        # Check if it looks like base64 (no binary chars in first 100 bytes)
        if data[0..99]&.match?(/\A[A-Za-z0-9+\/_=-]*\z/)
          Base64.urlsafe_decode64(data)
        else
          data
        end
      elsif attachment[:attachment_id]
        # External attachment - fetch from Gmail
        # The Gmail API Ruby client automatically decodes the base64 data
        att = gmail_service.get_user_message_attachment('me', message_id, attachment[:attachment_id])
        att.data
      end
    rescue StandardError => e
      Rails.logger.error("Failed to download attachment: #{e.message}")
      Rails.logger.error(e.backtrace.first(3).join("\n"))
      nil
    end

    def handle_token_error(error)
      Rails.logger.error("Token error for Gmail connection #{connection.id}: #{error.message}")
      connection.mark_error!("Authentication failed: #{error.message}")
      failure(error.message)
    end

    def handle_auth_error(error)
      Rails.logger.error("Auth error for Gmail connection #{connection.id}: #{error.message}")

      if error.message.include?('invalid_grant') || error.message.include?('Token has been expired or revoked')
        connection.mark_disconnected!
        failure('Gmail access has been revoked. Please reconnect your Gmail account.')
      else
        connection.mark_error!("Authorization error: #{error.message}")
        failure(error.message)
      end
    end

    def handle_error(error)
      Rails.logger.error("Sync error for Gmail connection #{connection.id}: #{error.message}")
      Rails.logger.error(error.backtrace.first(5).join("\n"))
      connection.mark_error!(error.message)
      failure(error.message)
    end

    def success
      {
        success: true,
        stats: @stats
      }
    end

    def failure(error)
      {
        success: false,
        error: error,
        stats: @stats
      }
    end
  end
end
