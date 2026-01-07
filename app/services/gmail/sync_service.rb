# frozen_string_literal: true

require 'google/apis/gmail_v1'

module Gmail
  # Syncs invoice emails from Gmail and creates Invoice records
  # SOLID: Single Responsibility - Only handles email sync operations
  class SyncService
    # Search query for finding invoice emails
    # Customize based on common invoice email patterns
    INVOICE_SEARCH_QUERIES = [
      'subject:(invoice OR receipt OR bill OR order confirmation) has:attachment filename:pdf',
      'from:(noreply@amazon.in OR auto-confirm@amazon.in) has:attachment',
      'from:(noreply@flipkart.com) subject:invoice',
      'from:(noreply@swiggy.in OR noreply@swiggy.com) subject:(invoice OR order)',
      'from:(no-reply@zomato.com) subject:(invoice OR order)',
      'from:(*@uber.com) subject:(receipt OR invoice)',
      'from:(*@spicejet.com OR *@airindia.in OR *@goindigo.in) subject:invoice',
      'from:(*@makemytrip.com OR *@goibibo.com) subject:(invoice OR booking)',
      'subject:GST invoice has:attachment'
    ].freeze

    # Known invoice sender domains for prioritization
    INVOICE_SENDERS = %w[
      amazon.in flipkart.com swiggy.in swiggy.com zomato.com uber.com ola.com
      makemytrip.com goibibo.com irctc.co.in redbus.in spicejet.com airindia.in
      goindigo.in bookmyshow.com nykaa.com myntra.com bigbasket.com blinkit.in
      zepto.com dunzo.com urbancompany.com practo.com
    ].freeze

    # Max emails to process per sync
    MAX_EMAILS_PER_SYNC = 50

    # Max attachment size (10MB)
    MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024

    attr_reader :connection, :gmail_service, :stats

    def initialize(connection)
      @connection = connection
      @stats = { emails_found: 0, attachments_processed: 0, invoices_created: 0, errors: [] }
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
      # Build combined search query
      query = build_search_query

      Rails.logger.info("Searching Gmail with query: #{query}")

      # Search for emails
      messages = search_emails(query)
      @stats[:emails_found] = messages.size

      Rails.logger.info("Found #{messages.size} potential invoice emails")

      # Process each email
      messages.each do |message_stub|
        process_email(message_stub.id)
      rescue StandardError => e
        @stats[:errors] << { message_id: message_stub.id, error: e.message }
        Rails.logger.error("Error processing email #{message_stub.id}: #{e.message}")
      end
    end

    def build_search_query
      # Combine all invoice queries with OR
      base_query = INVOICE_SEARCH_QUERIES.map { |q| "(#{q})" }.join(' OR ')

      # Add date filter - only emails from last 90 days
      date_filter = "after:#{90.days.ago.strftime('%Y/%m/%d')}"

      # Exclude already processed emails
      processed_ids = connection.synced_message_ids
      exclude_filter = processed_ids.any? ? "-{#{processed_ids.first(100).join(' ')}}" : ''

      "#{base_query} #{date_filter} #{exclude_filter}".strip
    end

    def search_emails(query)
      messages = []
      page_token = nil

      loop do
        result = gmail_service.list_user_messages(
          'me',
          q: query,
          max_results: [MAX_EMAILS_PER_SYNC - messages.size, 100].min,
          page_token: page_token
        )

        messages.concat(result.messages || [])
        @last_history_id = result.history_id

        page_token = result.next_page_token
        break if page_token.nil? || messages.size >= MAX_EMAILS_PER_SYNC
      end

      messages.first(MAX_EMAILS_PER_SYNC)
    end

    def process_email(message_id)
      # Skip if already processed
      return if Invoice.exists?(user: connection.user, gmail_message_id: message_id)

      # Fetch full message
      message = gmail_service.get_user_message('me', message_id)

      # Extract email metadata
      email_data = extract_email_data(message)

      Rails.logger.debug("Processing email: #{email_data[:subject]} from #{email_data[:from]}")

      # Find PDF attachments
      pdf_attachments = find_pdf_attachments(message)

      return if pdf_attachments.empty?

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

    def find_pdf_parts(part, attachments)
      return unless part

      # Check if this part is a PDF attachment
      if part.filename.present? && part.filename.downcase.end_with?('.pdf')
        if part.body&.attachment_id.present?
          attachments << {
            filename: part.filename,
            attachment_id: part.body.attachment_id,
            size: part.body.size || 0
          }
        elsif part.body&.data.present?
          # Inline attachment
          attachments << {
            filename: part.filename,
            data: part.body.data,
            size: part.body.size || 0
          }
        end
      end

      # Recursively check nested parts
      part.parts&.each do |nested_part|
        find_pdf_parts(nested_part, attachments)
      end
    end

    def create_invoice_from_attachment(message_id, email_data, attachment)
      # Skip large attachments
      if attachment[:size] > MAX_ATTACHMENT_SIZE
        Rails.logger.warn("Skipping large attachment: #{attachment[:filename]} (#{attachment[:size]} bytes)")
        return
      end

      # Download attachment content
      content = download_attachment(message_id, attachment)
      return unless content

      @stats[:attachments_processed] += 1

      # Create invoice record
      invoice = connection.user.invoices.create!(
        source: 'gmail',
        gmail_message_id: message_id,
        status: 'pending',
        currency: 'INR'
      )

      # Attach the PDF file
      invoice.file.attach(
        io: StringIO.new(content),
        filename: sanitize_filename(attachment[:filename]),
        content_type: 'application/pdf'
      )

      # Queue extraction job
      InvoiceExtractionJob.perform_later(invoice.id)

      @stats[:invoices_created] += 1

      Rails.logger.info("Created invoice #{invoice.id} from Gmail message #{message_id}")

      invoice
    end

    def download_attachment(message_id, attachment)
      if attachment[:data]
        # Inline attachment - decode base64
        Base64.urlsafe_decode64(attachment[:data])
      elsif attachment[:attachment_id]
        # External attachment - fetch from Gmail
        att = gmail_service.get_user_message_attachment('me', message_id, attachment[:attachment_id])
        Base64.urlsafe_decode64(att.data)
      end
    rescue StandardError => e
      Rails.logger.error("Failed to download attachment: #{e.message}")
      nil
    end

    def sanitize_filename(filename)
      # Remove path separators and limit length
      name = File.basename(filename.to_s)
      name = name.gsub(/[^\w\s\-\.]/, '_')
      name = "invoice_#{Time.current.to_i}.pdf" if name.blank?
      name[0..100]
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
