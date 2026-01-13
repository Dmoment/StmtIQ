# frozen_string_literal: true

class ExchangeRateService
  # Cache key for storing rates
  CACHE_KEY = 'exchange_rates:current'
  CACHE_TTL = 24.hours

  # Fallback rates (approximate, updated periodically)
  FALLBACK_RATES = {
    'USD' => 83.50,
    'EUR' => 91.20,
    'GBP' => 106.00,
    'INR' => 1.0
  }.freeze

  class << self
    # Get current exchange rates (all currencies to INR)
    def current_rates
      cached_rates || fetch_and_cache_rates || FALLBACK_RATES
    end

    # Get the last update timestamp
    def last_updated_at
      Rails.cache.read("#{CACHE_KEY}:updated_at")
    end

    # Convert amount between currencies
    def convert(amount:, from:, to:)
      return { amount: amount, rate: 1.0, date: Date.current } if from == to

      rates = current_rates

      # Convert to INR first, then to target currency
      if from == 'INR'
        rate = 1.0 / rates[to]
      elsif to == 'INR'
        rate = rates[from]
      else
        # Cross rate: FROM -> INR -> TO
        rate = rates[from] / rates[to]
      end

      {
        amount: (amount * rate).round(2),
        rate: rate.round(6),
        date: last_updated_at&.to_date || Date.current
      }
    end

    # Get rate for a specific currency pair
    def rate(from:, to:)
      return 1.0 if from == to

      rates = current_rates

      if from == 'INR'
        1.0 / rates[to]
      elsif to == 'INR'
        rates[from]
      else
        rates[from] / rates[to]
      end.round(6)
    end

    # Force refresh rates
    def refresh!
      Rails.cache.delete(CACHE_KEY)
      Rails.cache.delete("#{CACHE_KEY}:updated_at")
      fetch_and_cache_rates
    end

    private

    def cached_rates
      Rails.cache.read(CACHE_KEY)
    end

    def fetch_and_cache_rates
      rates = fetch_rates_from_api
      return nil unless rates

      Rails.cache.write(CACHE_KEY, rates, expires_in: CACHE_TTL)
      Rails.cache.write("#{CACHE_KEY}:updated_at", Time.current, expires_in: CACHE_TTL)

      rates
    rescue StandardError => e
      Rails.logger.error("Failed to fetch exchange rates: #{e.message}")
      nil
    end

    def fetch_rates_from_api
      # Try multiple sources in order of preference
      fetch_from_exchange_rate_api ||
        fetch_from_free_currency_api ||
        nil
    end

    # Free API: https://www.exchangerate-api.com/
    def fetch_from_exchange_rate_api
      response = HTTP.timeout(5).get("https://api.exchangerate-api.com/v4/latest/INR")
      return nil unless response.status.success?

      data = JSON.parse(response.body.to_s)
      rates = data['rates']

      # Invert rates since we want currency -> INR
      {
        'USD' => (1.0 / rates['USD']).round(4),
        'EUR' => (1.0 / rates['EUR']).round(4),
        'GBP' => (1.0 / rates['GBP']).round(4),
        'INR' => 1.0
      }
    rescue StandardError => e
      Rails.logger.warn("Exchange rate API failed: #{e.message}")
      nil
    end

    # Fallback: https://freecurrencyapi.com/
    def fetch_from_free_currency_api
      api_key = ENV['FREE_CURRENCY_API_KEY']
      return nil unless api_key

      response = HTTP.timeout(5).get(
        "https://api.freecurrencyapi.com/v1/latest",
        params: { apikey: api_key, base_currency: 'INR' }
      )
      return nil unless response.status.success?

      data = JSON.parse(response.body.to_s)
      rates = data['data']

      {
        'USD' => (1.0 / rates['USD']).round(4),
        'EUR' => (1.0 / rates['EUR']).round(4),
        'GBP' => (1.0 / rates['GBP']).round(4),
        'INR' => 1.0
      }
    rescue StandardError => e
      Rails.logger.warn("Free currency API failed: #{e.message}")
      nil
    end
  end
end
