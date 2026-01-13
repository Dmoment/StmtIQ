# frozen_string_literal: true

class InvoiceOverdueJob < ApplicationJob
  queue_as :default

  def perform
    Rails.logger.info("Running invoice overdue check at #{Time.current}")

    # Find invoices that should be marked as overdue
    SalesInvoice.where(status: %w[sent viewed])
                .where('due_date < ?', Date.current)
                .find_each do |invoice|
      invoice.update!(status: 'overdue')
      Rails.logger.info("Marked invoice #{invoice.invoice_number} as overdue")
    end
  end
end
