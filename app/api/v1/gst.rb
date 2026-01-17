# frozen_string_literal: true

module V1
  class Gst < Grape::API
    before { authenticate! }

    namespace :gst do
      desc 'Lookup company details by GSTIN'
      params do
        requires :gstin, type: String, desc: 'GST Identification Number (15 characters)'
      end
      get :lookup do
        gstin = params[:gstin]&.upcase&.strip

        unless ::Gst::LookupService.valid_gstin?(gstin)
          error!({ error: 'Invalid GSTIN format. Expected format: 22AAAAA0000A1Z5' }, 400)
        end

        result = ::Gst::LookupService.lookup(gstin)

        if result[:success]
          # Add logo URL if we can extract domain from trade name or legal name
          company_name = result.dig(:data, :trade_name) || result.dig(:data, :legal_name)
          if company_name.present?
            # Try to generate a potential domain from company name
            domain_guess = guess_domain_from_name(company_name)
            result[:data][:logo_url] = ::Company::LogoService.logo_url(domain_guess) if domain_guess
          end

          present result
        else
          error!({ error: result[:error] || 'GST lookup failed' }, 422)
        end
      end

      desc 'Get company logo by domain or email'
      params do
        requires :domain, type: String, desc: 'Company domain or email address'
        optional :size, type: Integer, default: 128, values: [32, 64, 128, 256], desc: 'Logo size'
      end
      get :logo do
        domain = params[:domain]&.strip&.downcase
        size = params[:size] || 128

        if domain.blank?
          error!({ error: 'Domain is required' }, 400)
        end

        result = ::Company::LogoService.fetch(domain)

        if result[:success]
          present({
            domain: result[:domain],
            logo_url: result[:primary_logo],
            alternatives: result[:logos]
          })
        else
          error!({ error: result[:error] || 'Logo fetch failed' }, 422)
        end
      end

      desc 'Validate GSTIN format'
      params do
        requires :gstin, type: String, desc: 'GST Identification Number'
      end
      get :validate do
        gstin = params[:gstin]&.upcase&.strip
        valid = ::Gst::LookupService.valid_gstin?(gstin)

        if valid
          state_code = gstin[0..1]
          state_info = ::Gst::LookupService::STATE_CODES[state_code]

          present({
            valid: true,
            gstin: gstin,
            state_code: state_code,
            state_name: state_info&.dig(:name),
            state_short_code: state_info&.dig(:code),
            pan: gstin[2..11]
          })
        else
          present({
            valid: false,
            gstin: gstin,
            error: 'Invalid GSTIN format. Expected format: 22AAAAA0000A1Z5'
          })
        end
      end

      desc 'Get list of Indian states with GST codes'
      get :states do
        states = ::Gst::LookupService::STATE_CODES.map do |code, info|
          {
            gst_code: code,
            name: info[:name],
            short_code: info[:code]
          }
        end

        present({ states: states })
      end
    end

    helpers do
      def guess_domain_from_name(company_name)
        return nil if company_name.blank?

        # Clean up common suffixes and create a domain guess
        name = company_name.downcase
          .gsub(/\s*(private|pvt|ltd|limited|llp|inc|corp|corporation|co|company)\s*/i, '')
          .gsub(/[^a-z0-9\s]/, '')
          .strip
          .gsub(/\s+/, '')

        return nil if name.length < 3

        "#{name}.com"
      end
    end
  end
end
