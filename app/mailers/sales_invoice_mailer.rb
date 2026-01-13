# frozen_string_literal: true

class SalesInvoiceMailer < ApplicationMailer
  def invoice_email(invoice)
    @invoice = invoice
    @client = invoice.client
    @profile = invoice.business_profile

    # Attach PDF
    if invoice.pdf_file.attached?
      attachments["#{invoice.invoice_number}.pdf"] = invoice.pdf_file.download
    end

    mail(
      to: @client.email,
      subject: "Invoice #{@invoice.invoice_number} from #{@profile.business_name}"
    )
  end

  def reminder_email(invoice)
    @invoice = invoice
    @client = invoice.client
    @profile = invoice.business_profile
    @days_overdue = invoice.days_overdue

    # Attach PDF
    if invoice.pdf_file.attached?
      attachments["#{invoice.invoice_number}.pdf"] = invoice.pdf_file.download
    end

    mail(
      to: @client.email,
      subject: "Payment Reminder: Invoice #{@invoice.invoice_number}"
    )
  end

  def thank_you_email(invoice)
    @invoice = invoice
    @client = invoice.client
    @profile = invoice.business_profile

    mail(
      to: @client.email,
      subject: "Thank You - Payment Received for Invoice #{@invoice.invoice_number}"
    )
  end
end
