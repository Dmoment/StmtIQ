# frozen_string_literal: true

module ML
  # In-memory cache for subcategories to avoid N+1 queries during categorization
  #
  # Usage:
  #   cache = ML::SubcategoryCache.instance
  #   subcategory = cache.find_by_slug('food-delivery')
  #   subcategory = cache.find_by_category_and_keyword(food_category, 'swiggy')
  #   subcategory = cache.default_for_category(food_category)
  #
  class SubcategoryCache
    include Singleton

    CACHE_TTL = 1.hour

    def initialize
      @by_slug = Concurrent::Map.new
      @by_id = Concurrent::Map.new
      @by_category_id = Concurrent::Map.new  # category_id => [subcategories]
      @defaults_by_category_id = Concurrent::Map.new  # category_id => default subcategory
      @last_refresh = nil
      @refresh_mutex = Mutex.new
    end

    # Find subcategory by slug
    # @param slug [String]
    # @return [Subcategory, nil]
    def find_by_slug(slug)
      ensure_loaded
      @by_slug[slug.to_s.downcase]
    end

    # Find subcategory by ID
    # @param id [Integer]
    # @return [Subcategory, nil]
    def find_by_id(id)
      ensure_loaded
      @by_id[id.to_i]
    end

    # Get all subcategories for a category
    # @param category [Category]
    # @return [Array<Subcategory>]
    def for_category(category)
      return [] unless category

      ensure_loaded
      @by_category_id[category.id] || []
    end

    # Get default subcategory for a category
    # @param category [Category]
    # @return [Subcategory, nil]
    def default_for_category(category)
      return nil unless category

      ensure_loaded
      @defaults_by_category_id[category.id]
    end

    # Find subcategory by keyword match within a category (fast, in-memory)
    # @param category [Category]
    # @param keywords [Array<String>] Keywords to match
    # @return [Subcategory, nil]
    def find_by_category_and_keyword(category, keywords)
      return nil unless category

      ensure_loaded
      subcategories = @by_category_id[category.id] || []
      keyword_text = Array(keywords).join(' ').downcase

      # Find first matching subcategory
      matched = subcategories.find do |sub|
        next false if sub.keywords.blank?

        sub.keywords.any? { |kw| keyword_text.include?(kw.downcase) }
      end

      # Return matched or default
      matched || @defaults_by_category_id[category.id]
    end

    # Force refresh the cache
    def refresh!
      load_subcategories
    end

    # Clear the cache
    def clear!
      @by_slug.clear
      @by_id.clear
      @by_category_id.clear
      @defaults_by_category_id.clear
      @last_refresh = nil
    end

    # Check if cache is stale
    def stale?
      @last_refresh.nil? || Time.current - @last_refresh > CACHE_TTL
    end

    # Get cache statistics
    def stats
      {
        size: @by_id.size,
        categories_with_subcategories: @by_category_id.size,
        last_refresh: @last_refresh,
        stale: stale?
      }
    end

    private

    def ensure_loaded
      return unless stale?

      return unless @refresh_mutex.try_lock

      begin
        load_subcategories if stale?
      ensure
        @refresh_mutex.unlock
      end
    end

    def load_subcategories
      subcategories = Subcategory.includes(:category).order(:display_order, :name).to_a

      # Clear existing
      @by_slug.clear
      @by_id.clear
      @by_category_id.clear
      @defaults_by_category_id.clear

      # Group by category
      grouped = subcategories.group_by(&:category_id)

      # Populate caches
      subcategories.each do |sub|
        @by_slug[sub.slug.downcase] = sub
        @by_id[sub.id] = sub
      end

      grouped.each do |category_id, subs|
        @by_category_id[category_id] = subs
        # Find default for this category
        default = subs.find(&:is_default)
        @defaults_by_category_id[category_id] = default if default
      end

      @last_refresh = Time.current

      Rails.logger.info("ML::SubcategoryCache: Loaded #{subcategories.size} subcategories for #{grouped.size} categories")
    end
  end
end
