# frozen_string_literal: true

module Gmail
  # SOLID: Single Responsibility - Only builds Gmail search queries
  class QueryBuilder
    # Known vendor keywords and their email domains/patterns
    VENDOR_EMAIL_PATTERNS = {
      # E-commerce
      'amazon' => 'from:(*@amazon.in OR *@amazon.com)',
      'flipkart' => 'from:(*@flipkart.com)',
      'myntra' => 'from:(*@myntra.com)',
      'nykaa' => 'from:(*@nykaa.com)',
      'ajio' => 'from:(*@ajio.com)',

      # Food Delivery
      'swiggy' => 'from:(*@swiggy.in OR *@swiggy.com)',
      'zomato' => 'from:(*@zomato.com)',
      'blinkit' => 'from:(*@blinkit.in)',
      'zepto' => 'from:(*@zepto.com)',
      'bigbasket' => 'from:(*@bigbasket.com)',
      'dunzo' => 'from:(*@dunzo.com)',
      'instamart' => 'from:(*@swiggy.in)',

      # Travel & Transport
      'uber' => 'from:(*@uber.com)',
      'ola' => 'from:(*@olacabs.com)',
      'rapido' => 'from:(*@rapido.bike)',
      'makemytrip' => 'from:(*@makemytrip.com)',
      'goibibo' => 'from:(*@goibibo.com)',
      'irctc' => 'from:(*@irctc.co.in)',
      'redbus' => 'from:(*@redbus.in)',
      'spicejet' => 'from:(*@spicejet.com)',
      'indigo' => 'from:(*@goindigo.in)',
      'airindia' => 'from:(*@airindia.in)',
      'vistara' => 'from:(*@airvistara.com)',
      'cleartrip' => 'from:(*@cleartrip.com)',

      # Entertainment
      'bookmyshow' => 'from:(*@bookmyshow.com)',
      'pvr' => 'from:(*@pvrcinemas.com)',
      'netflix' => 'from:(*@netflix.com)',
      'spotify' => 'from:(*@spotify.com)',
      'hotstar' => 'from:(*@hotstar.com)',

      # Services
      'urbancompany' => 'from:(*@urbancompany.com)',
      'practo' => 'from:(*@practo.com)',

      # Payments
      'phonepe' => 'from:(*@phonepe.com)',
      'paytm' => 'from:(*@paytm.com)',
      'gpay' => 'from:(*@google.com) subject:payment',
      'razorpay' => 'from:(*@razorpay.com)',

      # Banks
      'icici' => 'from:(*@icicibank.com) subject:(GST OR invoice)',
      'hdfc' => 'from:(*@hdfcbank.com) subject:(GST OR invoice)',
      'sbi' => 'from:(*@sbi.co.in) subject:(GST OR invoice)',
      'axis' => 'from:(*@axisbank.com) subject:(GST OR invoice)',
      'kotak' => 'from:(*@kotak.com) subject:(GST OR invoice)'
    }.freeze

    # Fallback search patterns
    FALLBACK_QUERIES = [
      'subject:(invoice OR receipt) has:attachment filename:pdf',
      'subject:"GST Invoice" has:attachment filename:pdf'
    ].freeze

    # Builds targeted Gmail search queries
    # @param date_range [Hash] :start and :end dates in 'YYYY/MM/DD' format
    # @param vendor_keywords [Array<String>] Vendor keywords from transactions
    # @param exclude_message_ids [Array<String>] Message IDs to exclude
    # @return [Array<String>] Search query strings
    def build_queries(date_range:, vendor_keywords:, exclude_message_ids: [])
      queries = []
      date_filter = "after:#{date_range[:start]} before:#{date_range[:end]}"
      exclude_filter = build_exclude_filter(exclude_message_ids)

      # Vendor-specific queries
      vendor_keywords.each do |vendor|
        pattern = VENDOR_EMAIL_PATTERNS[vendor]
        next unless pattern

        query = "#{pattern} has:attachment filename:pdf #{date_filter} #{exclude_filter}".strip
        queries << query
      end

      # Fallback queries
      FALLBACK_QUERIES.each do |fallback|
        query = "#{fallback} #{date_filter} #{exclude_filter}".strip
        queries << query
      end

      queries.uniq
    end

    # Extracts vendor keywords from user transactions
    # @param user [User] The user whose transactions to analyze
    # @return [Array<String>] Vendor keywords found
    def extract_vendor_keywords(user)
      descriptions = user.transactions
                         .where(transaction_type: 'debit')
                         .where.not(description: nil)
                         .pluck(:description, :counterparty_name)
                         .flatten
                         .compact
                         .uniq

      keywords = Set.new
      descriptions.each do |desc|
        desc_lower = desc.to_s.downcase
        VENDOR_EMAIL_PATTERNS.keys.each do |vendor|
          keywords.add(vendor) if desc_lower.include?(vendor)
        end
      end

      keywords.to_a
    end

    # Calculates transaction date range for search
    # @param user [User] The user whose transactions to analyze
    # @return [Hash] :start and :end dates in 'YYYY/MM/DD' format
    def transaction_date_range(user)
      transactions = user.transactions.where.not(transaction_date: nil)

      if transactions.any?
        min_date = transactions.minimum(:transaction_date)
        max_date = transactions.maximum(:transaction_date)
        {
          start: (min_date - 7.days).strftime('%Y/%m/%d'),
          end: (max_date + 7.days).strftime('%Y/%m/%d')
        }
      else
        {
          start: 90.days.ago.strftime('%Y/%m/%d'),
          end: Date.current.strftime('%Y/%m/%d')
        }
      end
    end

    private

    def build_exclude_filter(message_ids)
      return '' if message_ids.empty?

      # Gmail has a limit on query length, so only exclude first 50
      "-{#{message_ids.first(50).join(' ')}}"
    end
  end
end
