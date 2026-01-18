# frozen_string_literal: true

module SalesInvoices
  # Single Responsibility: Orchestrate email sending for invoices
  # Dependency Inversion: Uses PdfManager instead of generating PDFs directly
  class EmailService
    attr_reader :invoice, :mailer, :pdf_manager

    # Dependency Injection: Allow custom mailer and PDF manager for testing
    def initialize(invoice, mailer: SalesInvoiceMailer, pdf_manager: nil)
      @invoice = invoice
      @mailer = mailer
      @pdf_manager = pdf_manager || PdfManager.new(invoice)
    end

    def send_invoice(options = {})
      Rails.logger.info "[EmailService] Starting send_invoice for invoice #{invoice.id}"

      # Validate recipient email
      return false unless valid_recipient_email?(options)

      # Ensure PDF exists before sending
      ensure_pdf_generated

      # Send via Action Mailer with optional overrides
      send_email_via_mailer(options)

      Rails.logger.info "[EmailService] Email sent successfully for invoice #{invoice.id}"
      true
    rescue StandardError => e
      log_error(e)
      raise e
    end

    def send_reminder
      return false unless can_send_reminder?

      mailer.reminder_email(invoice).deliver_later
      true
    end

    def send_thank_you
      return false unless can_send_thank_you?

      mailer.thank_you_email(invoice).deliver_later
      true
    end

    private

    # Extract validation logic
    def valid_recipient_email?(options)
      to_email = options[:to].presence || invoice.client.email

      if to_email.blank?
        Rails.logger.warn "[EmailService] No recipient email for invoice #{invoice.id}"
        return false
      end

      true
    end

    # Extract PDF generation to separate concern
    def ensure_pdf_generated
      return if invoice.pdf_file.attached?

      Rails.logger.info "[EmailService] Generating PDF for invoice #{invoice.id}"
      pdf_manager.ensure_pdf_exists
    end

    # Extract email sending logic
    def send_email_via_mailer(options)
      to_email = options[:to].presence || invoice.client.email
      Rails.logger.info "[EmailService] Sending email to #{to_email}"

      mailer.invoice_email(invoice, options).deliver_now
    end

    # Extract validation logic - DRY principle
    def can_send_reminder?
      invoice.client.email.present? && invoice.outstanding?
    end

    def can_send_thank_you?
      invoice.client.email.present? && invoice.paid?
    end

    # Extract error logging
    def log_error(error)
      Rails.logger.error "[EmailService] Failed to send invoice #{invoice.id}: #{error.message}"
      Rails.logger.error error.backtrace.first(10).join("\n")
    end
  end
end
