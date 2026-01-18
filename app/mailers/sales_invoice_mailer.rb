# frozen_string_literal: true

# Single Responsibility: Handle email delivery for sales invoices
# Dependency Inversion: Uses injected TemplateVariableSubstituter
class SalesInvoiceMailer < ApplicationMailer
  def invoice_email(invoice, options = {})
    @invoice = invoice
    @client = invoice.client
    @profile = invoice.business_profile

    # Dependency Inversion: Inject substituter
    substituter = SalesInvoices::TemplateVariableSubstituter.new(invoice)

    # Determine email parameters (options override business profile defaults)
    to_email = options[:to].presence || @client.email
    cc_emails = options[:cc].presence || @profile.invoice_email_cc
    subject_template = options[:subject].presence || @profile.invoice_email_subject
    body_template = options[:body].presence || @profile.invoice_email_body

    # Substitute variables in templates
    @email_subject = substituter.substitute(subject_template)
    @email_body = substituter.substitute(body_template)

    # Attach PDF
    attach_invoice_pdf(invoice) if invoice.pdf_file.attached?

    mail(build_mail_options(to_email, cc_emails))
  end

  def reminder_email(invoice)
    @invoice = invoice
    @client = invoice.client
    @profile = invoice.business_profile
    @days_overdue = invoice.days_overdue

    # Attach PDF
    attach_invoice_pdf(invoice) if invoice.pdf_file.attached?

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

  private

  # Extract method to reduce complexity
  def attach_invoice_pdf(invoice)
    attachments["#{invoice.invoice_number}.pdf"] = invoice.pdf_file.download
  end

  # Extract method for building mail options
  def build_mail_options(to_email, cc_emails)
    options = { to: to_email, subject: @email_subject }

    # Parse CC emails if present
    if cc_emails.present?
      options[:cc] = parse_email_list(cc_emails)
    end

    options
  end

  # Extract method for parsing comma-separated emails
  def parse_email_list(email_string)
    email_string.split(',').map(&:strip).reject(&:blank?)
  end
end
