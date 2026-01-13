# frozen_string_literal: true

module SalesInvoices
  class GstCalculator
    # Indian state codes as per GST
    STATE_CODES = {
      '01' => 'Jammu & Kashmir',
      '02' => 'Himachal Pradesh',
      '03' => 'Punjab',
      '04' => 'Chandigarh',
      '05' => 'Uttarakhand',
      '06' => 'Haryana',
      '07' => 'Delhi',
      '08' => 'Rajasthan',
      '09' => 'Uttar Pradesh',
      '10' => 'Bihar',
      '11' => 'Sikkim',
      '12' => 'Arunachal Pradesh',
      '13' => 'Nagaland',
      '14' => 'Manipur',
      '15' => 'Mizoram',
      '16' => 'Tripura',
      '17' => 'Meghalaya',
      '18' => 'Assam',
      '19' => 'West Bengal',
      '20' => 'Jharkhand',
      '21' => 'Odisha',
      '22' => 'Chhattisgarh',
      '23' => 'Madhya Pradesh',
      '24' => 'Gujarat',
      '26' => 'Dadra and Nagar Haveli and Daman and Diu',
      '27' => 'Maharashtra',
      '28' => 'Andhra Pradesh (Old)',
      '29' => 'Karnataka',
      '30' => 'Goa',
      '31' => 'Lakshadweep',
      '32' => 'Kerala',
      '33' => 'Tamil Nadu',
      '34' => 'Puducherry',
      '35' => 'Andaman and Nicobar',
      '36' => 'Telangana',
      '37' => 'Andhra Pradesh'
    }.freeze

    # Common GST rates
    GST_RATES = [0, 5, 12, 18, 28].freeze

    attr_reader :subtotal, :seller_state_code, :buyer_state_code, :tax_rate

    def initialize(subtotal:, seller_state_code:, buyer_state_code:, tax_rate: 18.0)
      @subtotal = subtotal.to_f
      @seller_state_code = seller_state_code.to_s.rjust(2, '0')
      @buyer_state_code = buyer_state_code.to_s.rjust(2, '0')
      @tax_rate = tax_rate.to_f
    end

    def calculate
      if intra_state?
        calculate_cgst_sgst
      else
        calculate_igst
      end
    end

    def intra_state?
      seller_state_code == buyer_state_code
    end

    def inter_state?
      !intra_state?
    end

    def tax_type
      intra_state? ? 'cgst_sgst' : 'igst'
    end

    def seller_state_name
      STATE_CODES[seller_state_code]
    end

    def buyer_state_name
      STATE_CODES[buyer_state_code]
    end

    private

    def calculate_cgst_sgst
      half_rate = tax_rate / 2.0
      half_tax = (subtotal * half_rate / 100.0).round(2)
      total_tax = half_tax * 2
      total = subtotal + total_tax

      {
        tax_type: 'cgst_sgst',
        subtotal: subtotal,
        cgst_rate: half_rate,
        cgst_amount: half_tax,
        sgst_rate: half_rate,
        sgst_amount: half_tax,
        igst_rate: nil,
        igst_amount: 0,
        total_tax: total_tax,
        total_amount: total.round(2),
        seller_state: seller_state_name,
        buyer_state: buyer_state_name,
        is_intra_state: true
      }
    end

    def calculate_igst
      tax_amount = (subtotal * tax_rate / 100.0).round(2)
      total = subtotal + tax_amount

      {
        tax_type: 'igst',
        subtotal: subtotal,
        cgst_rate: nil,
        cgst_amount: 0,
        sgst_rate: nil,
        sgst_amount: 0,
        igst_rate: tax_rate,
        igst_amount: tax_amount,
        total_tax: tax_amount,
        total_amount: total.round(2),
        seller_state: seller_state_name,
        buyer_state: buyer_state_name,
        is_intra_state: false
      }
    end

    class << self
      def state_codes
        STATE_CODES
      end

      def state_name(code)
        STATE_CODES[code.to_s.rjust(2, '0')]
      end

      def valid_state_code?(code)
        STATE_CODES.key?(code.to_s.rjust(2, '0'))
      end

      def gst_rates
        GST_RATES
      end
    end
  end
end
