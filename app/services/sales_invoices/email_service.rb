# frozen_string_literal: true

module SalesInvoices
  class EmailService
    attr_reader :invoice

    def initialize(invoice)
      @invoice = invoice
    end

    def send_invoice
      return false unless invoice.client.email.present?

      # Generate PDF if not already attached
      generate_pdf unless invoice.pdf_file.attached?

      # Send via Action Mailer
      SalesInvoiceMailer.invoice_email(invoice).deliver_later

      true
    end

    def send_reminder
      return false unless invoice.client.email.present?
      return false unless invoice.outstanding?

      SalesInvoiceMailer.reminder_email(invoice).deliver_later

      true
    end

    def send_thank_you
      return false unless invoice.client.email.present?
      return false unless invoice.paid?

      SalesInvoiceMailer.thank_you_email(invoice).deliver_later

      true
    end

    private

    def generate_pdf
      generator = PdfGenerator.new(invoice)
      pdf_content = generator.render_to_string

      invoice.pdf_file.attach(
        io: StringIO.new(pdf_content),
        filename: "#{invoice.invoice_number}.pdf",
        content_type: 'application/pdf'
      )

      invoice.update!(pdf_generated_at: Time.current)
    end
  end
end
