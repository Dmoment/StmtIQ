# frozen_string_literal: true

module Gmail
  # SOLID: Single Responsibility - Only creates Invoice records from Gmail attachments
  # SOLID: Dependency Inversion - Accepts extraction job class as dependency
  class InvoiceCreator
    def initialize(extraction_job_class: InvoiceExtractionJob)
      @extraction_job_class = extraction_job_class
    end

    # Creates an invoice from PDF content
    # @param user [User] The user who owns the invoice
    # @param message_id [String] Gmail message ID
    # @param content [String] Binary PDF content
    # @param filename [String] Original attachment filename
    # @return [Invoice] Created invoice record
    def create_from_pdf(user:, message_id:, content:, filename:)
      invoice = user.invoices.create!(
        source: 'gmail',
        gmail_message_id: message_id,
        status: 'pending',
        currency: 'INR'
      )

      attach_pdf(invoice, content, filename)
      queue_extraction(invoice)

      invoice
    end

    private

    def attach_pdf(invoice, content, filename)
      invoice.file.attach(
        io: StringIO.new(content),
        filename: sanitize_filename(filename),
        content_type: 'application/pdf'
      )
    end

    def queue_extraction(invoice)
      @extraction_job_class.perform_later(invoice.id)
    end

    # Sanitizes filename for security
    # SECURITY: Prevents path traversal attacks
    def sanitize_filename(filename)
      # Remove path separators
      name = File.basename(filename.to_s)
      # Remove special characters except word chars, spaces, hyphens, dots
      name = name.gsub(/[^\w\s\-\.]/, '_')
      # Fallback if empty
      name = "invoice_#{Time.current.to_i}.pdf" if name.blank?
      # Limit length to prevent DOS
      name[0..100]
    end
  end
end
