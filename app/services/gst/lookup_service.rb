# frozen_string_literal: true

module Gst
  class LookupService
    # Indian State Codes as per GST
    STATE_CODES = {
      '01' => { name: 'Jammu and Kashmir', code: 'JK' },
      '02' => { name: 'Himachal Pradesh', code: 'HP' },
      '03' => { name: 'Punjab', code: 'PB' },
      '04' => { name: 'Chandigarh', code: 'CH' },
      '05' => { name: 'Uttarakhand', code: 'UK' },
      '06' => { name: 'Haryana', code: 'HR' },
      '07' => { name: 'Delhi', code: 'DL' },
      '08' => { name: 'Rajasthan', code: 'RJ' },
      '09' => { name: 'Uttar Pradesh', code: 'UP' },
      '10' => { name: 'Bihar', code: 'BR' },
      '11' => { name: 'Sikkim', code: 'SK' },
      '12' => { name: 'Arunachal Pradesh', code: 'AR' },
      '13' => { name: 'Nagaland', code: 'NL' },
      '14' => { name: 'Manipur', code: 'MN' },
      '15' => { name: 'Mizoram', code: 'MZ' },
      '16' => { name: 'Tripura', code: 'TR' },
      '17' => { name: 'Meghalaya', code: 'ML' },
      '18' => { name: 'Assam', code: 'AS' },
      '19' => { name: 'West Bengal', code: 'WB' },
      '20' => { name: 'Jharkhand', code: 'JH' },
      '21' => { name: 'Odisha', code: 'OD' },
      '22' => { name: 'Chhattisgarh', code: 'CG' },
      '23' => { name: 'Madhya Pradesh', code: 'MP' },
      '24' => { name: 'Gujarat', code: 'GJ' },
      '25' => { name: 'Daman and Diu', code: 'DD' },
      '26' => { name: 'Dadra and Nagar Haveli', code: 'DN' },
      '27' => { name: 'Maharashtra', code: 'MH' },
      '28' => { name: 'Andhra Pradesh (Old)', code: 'AP' },
      '29' => { name: 'Karnataka', code: 'KA' },
      '30' => { name: 'Goa', code: 'GA' },
      '31' => { name: 'Lakshadweep', code: 'LD' },
      '32' => { name: 'Kerala', code: 'KL' },
      '33' => { name: 'Tamil Nadu', code: 'TN' },
      '34' => { name: 'Puducherry', code: 'PY' },
      '35' => { name: 'Andaman and Nicobar Islands', code: 'AN' },
      '36' => { name: 'Telangana', code: 'TS' },
      '37' => { name: 'Andhra Pradesh', code: 'AP' },
      '38' => { name: 'Ladakh', code: 'LA' }
    }.freeze

    GSTIN_REGEX = /\A(\d{2})([A-Z]{5})(\d{4})([A-Z]{1})([A-Z\d]{1})([Z]{1})([A-Z\d]{1})\z/

    class << self
      def lookup(gstin)
        new(gstin).lookup
      end

      def valid_gstin?(gstin)
        gstin.present? && gstin.match?(GSTIN_REGEX)
      end
    end

    def initialize(gstin)
      @gstin = gstin&.upcase&.strip
    end

    def lookup
      return error_result('GSTIN is required') if @gstin.blank?
      return error_result('Invalid GSTIN format') unless valid_gstin?

      # Try external API first
      result = fetch_from_api
      return result if result[:success]

      # Fallback to basic extraction from GSTIN
      extract_from_gstin
    end

    private

    def valid_gstin?
      self.class.valid_gstin?(@gstin)
    end

    def fetch_from_api
      # Try multiple API sources
      result = try_gst_verification_api
      return result if result[:success]

      # Could add more API fallbacks here
      { success: false, error: 'API unavailable' }
    end

    def try_gst_verification_api
      # Using a public GST search endpoint
      # Note: For production, use a verified paid API like Master India, Signzy, etc.
      api_key = Rails.application.credentials.dig(:gst, :api_key)

      if api_key.present?
        fetch_from_master_india_api(api_key)
      else
        fetch_from_public_api
      end
    rescue StandardError => e
      Rails.logger.error("GST API error: #{e.message}")
      { success: false, error: e.message }
    end

    def fetch_from_master_india_api(api_key)
      uri = URI("https://commonapi.mastersindia.co/commonapis/searchgstin")
      uri.query = URI.encode_www_form(gstin: @gstin)

      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = true
      http.open_timeout = 5
      http.read_timeout = 10

      request = Net::HTTP::Get.new(uri)
      request['Authorization'] = "Bearer #{api_key}"
      request['Content-Type'] = 'application/json'

      response = http.request(request)

      if response.code == '200'
        data = JSON.parse(response.body)
        parse_master_india_response(data)
      else
        { success: false, error: "API returned #{response.code}" }
      end
    rescue StandardError => e
      Rails.logger.error("Master India API error: #{e.message}")
      { success: false, error: e.message }
    end

    def fetch_from_public_api
      # GSTINCheck API - get free key from https://gstincheck.co.in/
      api_key = ENV['GSTINCHECK_KEY'] || Rails.application.credentials.dig(:gst, :api_key)

      unless api_key.present?
        Rails.logger.info("GST Lookup: No API key configured. Set GSTINCHECK_KEY env var or add gst.api_key to credentials.")
        return { success: false, error: 'No GST API key configured' }
      end

      uri = URI("https://sheet.gstincheck.co.in/check/#{api_key}/#{@gstin}")

      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = true
      http.open_timeout = 10
      http.read_timeout = 15

      request = Net::HTTP::Get.new(uri)
      Rails.logger.info("GST Lookup: Calling API for #{@gstin}")
      response = http.request(request)

      if response.code == '200'
        data = JSON.parse(response.body)
        Rails.logger.info("GST Lookup: Full API Response:\n#{JSON.pretty_generate(data)}")
        parse_api_response(data)
      else
        Rails.logger.warn("GST Lookup: API returned #{response.code}")
        { success: false, error: "API returned #{response.code}" }
      end
    rescue StandardError => e
      Rails.logger.warn("GST API error: #{e.message}")
      { success: false, error: e.message }
    end

    def parse_api_response(data)
      return { success: false, error: data['message'] || 'Invalid response' } unless data['flag'] == true

      taxpayer = data['data'] || {}
      pradr = taxpayer['pradr'] || {}
      addr = pradr['addr'] || {}

      # Use full formatted address if available, otherwise build from parts
      full_address = pradr['adr']

      if full_address.present?
        # Parse the full address: "114/98 B, PANCHVATI VINAYAKPUR, UMA VIDHYA ASHARAM SCHOOL, Naveen Nagar, Kanpur, Kanpur Nagar, Uttar Pradesh, 208025"
        # Split and distribute across fields
        parts = full_address.split(',').map(&:strip)
        pincode = addr['pncd'] || parts.last&.match(/\d{6}/)&.to_s
        state = addr['stcd'] || STATE_CODES.dig(@gstin[0..1], :name)
        city = addr['dst'] || addr['loc']

        # Remove pincode and state from the end if present
        address_parts = parts.reject { |p| p.match?(/^\d{6}$/) || p == state }

        address = {
          line1: address_parts[0..1]&.join(', '),
          line2: address_parts[2..-1]&.join(', '),
          city: city,
          state: state,
          pincode: pincode
        }
      else
        address = {
          line1: [addr['bno'], addr['bnm'], addr['flno']].compact_blank.join(', '),
          line2: [addr['st'], addr['loc']].compact_blank.join(', '),
          city: addr['dst'],
          state: STATE_CODES.dig(@gstin[0..1], :name),
          pincode: addr['pncd']
        }
      end

      {
        success: true,
        source: 'gstincheck',
        data: {
          gstin: @gstin,
          pan: @gstin[2..11], # PAN is always characters 3-12 of GSTIN
          legal_name: taxpayer['lgnm'],
          trade_name: taxpayer['tradeNam'],
          business_type: taxpayer['ctb'],
          nature_of_business: taxpayer['nba']&.join(', '),
          registration_date: taxpayer['rgdt'],
          status: taxpayer['sts'],
          state_code: @gstin[0..1],
          state_name: STATE_CODES.dig(@gstin[0..1], :name),
          state_short_code: STATE_CODES.dig(@gstin[0..1], :code),
          address: address
        }
      }
    end

    def parse_master_india_response(data)
      return { success: false, error: data['message'] } unless data['data'].present?

      gst_data = data['data']
      address = parse_address(gst_data['pradr'] || gst_data['adadr']&.first)

      {
        success: true,
        source: 'master_india',
        data: {
          gstin: @gstin,
          pan: @gstin[2..11], # PAN is always characters 3-12 of GSTIN
          legal_name: gst_data['lgnm'],
          trade_name: gst_data['tradeNam'],
          business_type: gst_data['ctb'],
          registration_date: gst_data['rgdt'],
          status: gst_data['sts'],
          state_code: @gstin[0..1],
          state_name: STATE_CODES.dig(@gstin[0..1], :name),
          address: address
        }
      }
    end

    def parse_address(addr_data)
      return {} unless addr_data.is_a?(Hash)

      addr = addr_data['addr'] || addr_data
      {
        line1: [addr['bno'], addr['bnm'], addr['flno']].compact_blank.join(', '),
        line2: [addr['st'], addr['loc']].compact_blank.join(', '),
        city: addr['dst'] || addr['city'],
        state: addr['stcd'] ? STATE_CODES.dig(addr['stcd'], :name) : nil,
        pincode: addr['pncd']
      }
    end

    def extract_from_gstin
      # Basic extraction when API is unavailable
      state_info = STATE_CODES[@gstin[0..1]]
      pan = @gstin[2..11]

      {
        success: true,
        source: 'gstin_extraction',
        data: {
          gstin: @gstin,
          pan: pan,
          state_code: @gstin[0..1],
          state_name: state_info&.dig(:name),
          state_short_code: state_info&.dig(:code),
          entity_type: entity_type_from_gstin,
          legal_name: nil,
          trade_name: nil,
          address: {}
        },
        message: 'Basic info extracted from GSTIN. Company details not available without API.'
      }
    end

    def entity_type_from_gstin
      # 13th character indicates entity type
      case @gstin[12]
      when 'Z' then 'Regular'
      when 'C' then 'UN Body'
      when 'F' then 'Embassy'
      when 'G' then 'Government'
      when 'L' then 'Local Authority'
      when 'P' then 'Special Economic Zone'
      when 'T' then 'TDS Registration'
      when 'X' then 'TCS Registration'
      else 'Unknown'
      end
    end

    def error_result(message)
      { success: false, error: message }
    end
  end
end
