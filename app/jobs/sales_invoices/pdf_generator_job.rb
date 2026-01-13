# frozen_string_literal: true

module SalesInvoices
  class PdfGeneratorJob < ApplicationJob
    queue_as :default

    def perform(invoice_id)
      invoice = ::SalesInvoice.find(invoice_id)

      generator = PdfGenerator.new(invoice)
      pdf_content = generator.render_to_string

      invoice.pdf_file.attach(
        io: StringIO.new(pdf_content),
        filename: "#{invoice.invoice_number}.pdf",
        content_type: 'application/pdf'
      )

      invoice.update!(pdf_generated_at: Time.current)

      Rails.logger.info("Generated PDF for invoice #{invoice.invoice_number}")
    end
  end
end
