# frozen_string_literal: true

class InvoiceExtractionJob < ApplicationJob
  queue_as :default

  retry_on StandardError, wait: :polynomially_longer, attempts: 3

  def perform(invoice_id)
    invoice = Invoice.find_by(id: invoice_id)
    return unless invoice
    return unless invoice.pending?

    Rails.logger.info "Starting extraction for invoice #{invoice_id}"

    result = Invoices::ExtractionService.new(invoice).call

    if result[:success]
      Rails.logger.info "Extraction successful for invoice #{invoice_id}, confidence: #{invoice.extraction_confidence}"
      # Automatically try to match after successful extraction
      InvoiceMatchingJob.perform_later(invoice_id)
    else
      Rails.logger.warn "Extraction failed for invoice #{invoice_id}: #{result[:error]}"
    end
  end
end
