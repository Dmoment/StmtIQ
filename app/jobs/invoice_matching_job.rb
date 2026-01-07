# frozen_string_literal: true

class InvoiceMatchingJob < ApplicationJob
  queue_as :default

  retry_on StandardError, wait: :polynomially_longer, attempts: 3

  def perform(invoice_id)
    invoice = Invoice.find_by(id: invoice_id)
    return unless invoice
    return unless invoice.can_match?

    Rails.logger.info "Starting matching for invoice #{invoice_id}"

    result = Invoices::MatchingService.new(invoice).call

    if result[:success]
      if result[:matched]
        Rails.logger.info "Invoice #{invoice_id} matched to transaction #{result[:transaction].id} with confidence #{result[:confidence]}"
      elsif result[:suggestions]&.any?
        Rails.logger.info "Invoice #{invoice_id} has #{result[:suggestions].size} suggestions"
      else
        Rails.logger.info "Invoice #{invoice_id} unmatched - no candidates found"
      end
    else
      Rails.logger.warn "Matching failed for invoice #{invoice_id}: #{result[:error]}"
    end
  end
end
