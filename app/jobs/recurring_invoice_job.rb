# frozen_string_literal: true

class RecurringInvoiceJob < ApplicationJob
  queue_as :default

  def perform
    Rails.logger.info("Running recurring invoice job at #{Time.current}")

    RecurringInvoice.due_before(Date.current).find_each do |recurring|
      process_recurring_invoice(recurring)
    end
  end

  private

  def process_recurring_invoice(recurring)
    invoice = recurring.generate_invoice!
    return unless invoice

    Rails.logger.info("Generated invoice #{invoice.invoice_number} from recurring #{recurring.name}")

    # Auto-send if configured
    if recurring.should_auto_send?
      SalesInvoices::EmailService.new(invoice).send_invoice
      invoice.mark_sent!
      Rails.logger.info("Auto-sent invoice #{invoice.invoice_number}")
    end
  rescue StandardError => e
    Rails.logger.error("Failed to process recurring invoice #{recurring.id}: #{e.message}")
    # Don't re-raise to allow other recurring invoices to process
  end
end
