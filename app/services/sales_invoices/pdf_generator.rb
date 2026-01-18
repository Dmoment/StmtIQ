# frozen_string_literal: true

require 'prawn'
require 'prawn/table'

module SalesInvoices
  class PdfGenerator
    include Prawn::View

    attr_reader :invoice

    FONTS_PATH = Rails.root.join('app', 'assets', 'fonts')

    def initialize(invoice)
      @invoice = invoice
      @document = Prawn::Document.new(
        page_size: 'A4',
        margin: [40, 40, 40, 40]
      )
      setup_fonts
    end

    def generate
      add_header
      add_invoice_details
      add_addresses
      add_line_items
      add_totals
      add_bank_details
      add_notes_and_terms
      add_footer

      document
    end

    def render_to_file(path)
      generate
      document.render_file(path)
    end

    def render_to_string
      generate
      document.render
    end

    private

    def document
      @document
    end

    def setup_fonts
      # Register Noto Sans font for full UTF-8 support (including ₹ symbol)
      document.font_families.update(
        'NotoSans' => {
          normal: FONTS_PATH.join('NotoSans-Regular.ttf').to_s,
          bold: FONTS_PATH.join('NotoSans-Bold.ttf').to_s
        }
      )
      document.font 'NotoSans'
    end

    def profile
      @profile ||= invoice.business_profile
    end

    def client
      @client ||= invoice.client
    end

    def primary_color
      hex_to_rgb(invoice.effective_primary_color || '#F59E0B')
    end

    def secondary_color
      hex_to_rgb(invoice.effective_secondary_color || '#D97706')
    end

    def add_header
      # Company logo
      if profile.logo.attached?
        begin
          logo_path = ActiveStorage::Blob.service.path_for(profile.logo.key)
          image logo_path, width: 120, position: :left
        rescue StandardError
          # Skip logo if not available
        end
      end

      # Company name and details
      move_down 10
      text profile.business_name, size: 18, style: :bold, color: secondary_color
      text profile.full_address, size: 9, color: '666666'

      if profile.gstin.present?
        text "GSTIN: #{profile.gstin}", size: 9, color: '666666'
      end

      if profile.email.present? || profile.phone.present?
        contact = [profile.email, profile.phone].compact.join(' | ')
        text contact, size: 9, color: '666666'
      end

      move_down 20
    end

    def add_invoice_details
      # Invoice title bar
      fill_color primary_color
      fill_rectangle([0, cursor], bounds.width, 30)
      fill_color '000000'

      move_up 22
      text 'INVOICE', size: 14, style: :bold, color: 'FFFFFF', align: :center
      move_down 15

      # Invoice details table
      invoice_data = [
        ['Invoice Number:', invoice.invoice_number],
        ['Invoice Date:', invoice.invoice_date.strftime('%d %b %Y')],
        ['Due Date:', invoice.due_date.strftime('%d %b %Y')],
        ['Status:', invoice.status.titleize]
      ]

      if invoice.currency != 'INR'
        invoice_data << ['Currency:', "#{invoice.currency} (Rate: #{invoice.exchange_rate})"]
      end

      bounding_box([bounds.width - 200, cursor], width: 200) do
        invoice_data.each do |row|
          text "#{row[0]} #{row[1]}", size: 9, align: :right
        end
      end

      move_down 20
    end

    def add_addresses
      bounding_box([0, cursor], width: 250) do
        text 'Bill To:', size: 10, style: :bold
        move_down 5
        text client.display_name, size: 11, style: :bold
        text client.full_billing_address, size: 9, color: '444444' if client.full_billing_address.present?
        text "GSTIN: #{client.gstin}", size: 9, color: '444444' if client.gstin.present?
        text client.email, size: 9, color: '444444' if client.email.present?
      end

      if client.has_shipping_address?
        bounding_box([280, cursor + 60], width: 250) do
          text 'Ship To:', size: 10, style: :bold
          move_down 5
          text client.full_shipping_address, size: 9, color: '444444'
        end
      end

      move_down 30
    end

    def add_line_items
      items_data = [
        [
          { content: '#', align: :center },
          { content: 'Description', align: :left },
          { content: 'HSN/SAC', align: :center },
          { content: 'Qty', align: :center },
          { content: 'Rate', align: :right },
          { content: 'Amount', align: :right }
        ]
      ]

      invoice.line_items.ordered.each_with_index do |item, index|
        items_data << [
          { content: (index + 1).to_s, align: :center },
          { content: item.description, align: :left },
          { content: item.hsn_sac_code.to_s, align: :center },
          { content: "#{item.formatted_quantity} #{item.unit}", align: :center },
          { content: format_currency(item.rate), align: :right },
          { content: format_currency(item.amount), align: :right }
        ]
      end

      table(items_data, width: bounds.width, column_widths: calculate_column_widths) do |t|
        t.row(0).font_style = :bold
        t.row(0).background_color = secondary_color
        t.row(0).text_color = 'FFFFFF'
        t.cells.padding = [6, 4]
        t.cells.borders = [:bottom]
        t.cells.border_width = 0.5
        t.cells.border_color = 'DDDDDD'
      end

      move_down 20
    end

    def add_totals
      totals_data = []

      totals_data << ['Subtotal', format_currency(invoice.subtotal)]

      if invoice.discount_amount > 0
        discount_text = invoice.discount_type == 'percentage' ?
          "Discount (#{invoice.discount_amount}%)" : 'Discount'
        discount_value = if invoice.discount_type == 'percentage'
                           (invoice.subtotal * invoice.discount_amount / 100.0)
                         else
                           invoice.discount_amount
                         end
        totals_data << [discount_text, "-#{format_currency(discount_value)}"]
      end

      if invoice.tax_type == 'cgst_sgst'
        totals_data << ["CGST (#{invoice.cgst_rate}%)", format_currency(invoice.cgst_amount)]
        totals_data << ["SGST (#{invoice.sgst_rate}%)", format_currency(invoice.sgst_amount)]
      elsif invoice.tax_type == 'igst'
        totals_data << ["IGST (#{invoice.igst_rate}%)", format_currency(invoice.igst_amount)]
      end

      totals_data << [{ content: 'Total', font_style: :bold },
                      { content: format_currency(invoice.total_amount), font_style: :bold }]

      if invoice.amount_paid > 0
        totals_data << ['Amount Paid', format_currency(invoice.amount_paid)]
        totals_data << [{ content: 'Balance Due', font_style: :bold },
                        { content: format_currency(invoice.balance_due), font_style: :bold }]
      end

      bounding_box([bounds.width - 220, cursor], width: 220) do
        table(totals_data, width: 220) do |t|
          t.columns(0).width = 120
          t.columns(1).width = 100
          t.columns(1).align = :right
          t.cells.padding = [5, 5]
          t.cells.borders = []
          t.row(-1).borders = [:top]
          t.row(-1).border_width = 1
        end
      end

      move_down 30
    end

    def add_bank_details
      return unless profile.bank_name.present?

      text 'Bank Details', size: 11, style: :bold
      move_down 5

      bank_info = []
      bank_info << "Bank: #{profile.bank_name}" if profile.bank_name.present?
      bank_info << "Account: #{profile.account_number}" if profile.account_number.present?
      bank_info << "IFSC: #{profile.ifsc_code}" if profile.ifsc_code.present?
      bank_info << "UPI: #{profile.upi_id}" if profile.upi_id.present?

      text bank_info.join(' | '), size: 9, color: '444444'
      move_down 20
    end

    def add_notes_and_terms
      if invoice.notes.present?
        text 'Notes', size: 10, style: :bold
        move_down 3
        text invoice.notes, size: 9, color: '444444'
        move_down 15
      end

      if invoice.terms.present?
        text 'Terms & Conditions', size: 10, style: :bold
        move_down 3
        text invoice.terms, size: 9, color: '444444'
        move_down 15
      end
    end

    def add_footer
      # Signature area
      if profile.signature.attached?
        begin
          move_down 20
          bounding_box([bounds.width - 150, cursor], width: 150) do
            sig_path = ActiveStorage::Blob.service.path_for(profile.signature.key)
            image sig_path, width: 100
            move_down 5
            text 'Authorized Signatory', size: 8, align: :center
          end
        rescue StandardError
          # Skip signature if not available
        end
      end

      # Page numbers
      number_pages 'Page <page> of <total>',
                   at: [bounds.right - 100, 0],
                   width: 100,
                   align: :right,
                   size: 8,
                   color: '999999'
    end

    def format_currency(amount)
      symbol = case invoice.currency
               when 'USD' then '$'
               when 'EUR' then '€'
               when 'GBP' then '£'
               else '₹'
               end

      "#{symbol}#{format('%.2f', amount)}"
    end

    def calculate_column_widths
      # Calculate widths that fit within bounds.width (515.28 for A4 with 40pt margins)
      available_width = bounds.width
      # #, Description, HSN/SAC, Qty, Rate, Amount
      {
        0 => 20,                          # # column
        1 => available_width - 280,       # Description (flexible)
        2 => 50,                          # HSN/SAC
        3 => 50,                          # Qty
        4 => 80,                          # Rate
        5 => 80                           # Amount
      }
    end

    def hex_to_rgb(hex)
      # Prawn expects a 6-character hex string without the # prefix
      hex.to_s.gsub('#', '').upcase
    end
  end
end
