# frozen_string_literal: true

module SalesInvoices
  # Manages PDF generation and caching for invoices
  # Single Responsibility: PDF lifecycle management
  # Open/Closed: Can support different PDF generators
  class PdfManager
    attr_reader :invoice, :generator_job

    def initialize(invoice, generator_job: PdfGeneratorJob)
      @invoice = invoice
      @generator_job = generator_job
    end

    def ensure_pdf_exists
      return if invoice.pdf_file.attached?

      generate_pdf_now
      invoice.reload
    end

    def generate_pdf_now
      generator_job.perform_now(invoice.id)
    end

    def generate_pdf_later
      generator_job.perform_later(invoice.id)
    end

    def pdf_attached?
      invoice.pdf_file.attached?
    end

    def download_pdf
      ensure_pdf_exists
      invoice.pdf_file.download
    end

    def pdf_filename
      "#{invoice.invoice_number}.pdf"
    end
  end
end
