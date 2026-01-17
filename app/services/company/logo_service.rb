# frozen_string_literal: true

module Company
  class LogoService
    CLEARBIT_LOGO_URL = 'https://logo.clearbit.com'
    GOOGLE_FAVICON_URL = 'https://www.google.com/s2/favicons'
    LOGO_DEV_URL = 'https://img.logo.dev'

    class << self
      def fetch(domain_or_email)
        new(domain_or_email).fetch
      end

      def logo_url(domain_or_email, size: 128)
        new(domain_or_email).logo_url(size: size)
      end
    end

    def initialize(domain_or_email)
      @input = domain_or_email&.strip&.downcase
      @domain = extract_domain(@input)
    end

    def fetch
      return error_result('Domain or email is required') if @domain.blank?

      logo_urls = generate_logo_urls

      {
        success: true,
        domain: @domain,
        logos: logo_urls,
        primary_logo: logo_urls[:clearbit] || logo_urls[:google_hd]
      }
    end

    def logo_url(size: 128)
      return nil if @domain.blank?

      # Return Clearbit URL as primary (best quality)
      # Frontend can fallback to alternatives if this fails
      "#{CLEARBIT_LOGO_URL}/#{@domain}?size=#{size}"
    end

    private

    def extract_domain(input)
      return nil if input.blank?

      # If it's an email, extract domain
      if input.include?('@')
        input.split('@').last
      # If it's a URL, extract domain
      elsif input.include?('://')
        URI.parse(input).host rescue input
      # If it starts with www, remove it
      elsif input.start_with?('www.')
        input.sub('www.', '')
      else
        # Assume it's already a domain
        input
      end
    end

    def generate_logo_urls
      {
        # Clearbit - Best quality, free tier: 10K/month
        clearbit: "#{CLEARBIT_LOGO_URL}/#{@domain}",
        clearbit_hd: "#{CLEARBIT_LOGO_URL}/#{@domain}?size=256",

        # Google Favicon - Unlimited, but lower quality
        google: "#{GOOGLE_FAVICON_URL}?domain=#{@domain}&sz=64",
        google_hd: "#{GOOGLE_FAVICON_URL}?domain=#{@domain}&sz=128",

        # Logo.dev - Alternative (requires API key for higher limits)
        logo_dev: "#{LOGO_DEV_URL}/#{@domain}?token=#{logo_dev_token}"
      }.compact
    end

    def logo_dev_token
      Rails.application.credentials.dig(:logo_dev, :token)
    end

    def error_result(message)
      { success: false, error: message }
    end
  end
end
