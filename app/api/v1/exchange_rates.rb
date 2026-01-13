# frozen_string_literal: true

module V1
  class ExchangeRates < Grape::API
    resource :exchange_rates do
      before { authenticate! }

      desc 'Get current exchange rates'
      get :current do
        rates = ExchangeRateService.current_rates

        {
          base: 'INR',
          rates: rates,
          updated_at: ExchangeRateService.last_updated_at&.iso8601
        }
      end

      desc 'Convert amount between currencies'
      params do
        requires :amount, type: Float
        requires :from, type: String, values: %w[INR USD EUR GBP]
        requires :to, type: String, values: %w[INR USD EUR GBP]
      end
      get :convert do
        result = ExchangeRateService.convert(
          amount: params[:amount],
          from: params[:from],
          to: params[:to]
        )

        {
          original_amount: params[:amount],
          original_currency: params[:from],
          converted_amount: result[:amount],
          target_currency: params[:to],
          exchange_rate: result[:rate],
          rate_date: result[:date]&.iso8601
        }
      end

      desc 'Get rate for a specific currency pair'
      params do
        requires :from, type: String, values: %w[INR USD EUR GBP]
        requires :to, type: String, values: %w[INR USD EUR GBP]
      end
      get :rate do
        rate = ExchangeRateService.rate(from: params[:from], to: params[:to])

        {
          from: params[:from],
          to: params[:to],
          rate: rate,
          updated_at: ExchangeRateService.last_updated_at&.iso8601
        }
      end
    end
  end
end
