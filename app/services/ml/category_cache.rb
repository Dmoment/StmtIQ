# frozen_string_literal: true

module ML
  # In-memory cache for categories to avoid N+1 queries during batch processing
  #
  # SOLID Principles:
  # - Single Responsibility: Only handles category caching
  # - Open/Closed: Can extend cache strategies without modifying core logic
  # - Interface Segregation: Simple interface (find_by_slug, find_by_id)
  #
  # Thread-safe implementation using Concurrent::Map
  #
  # Usage:
  #   cache = ML::CategoryCache.instance
  #   category = cache.find_by_slug('food')
  #   category = cache.find_by_id(5)
  #
  class CategoryCache
    include Singleton

    CACHE_TTL = 1.hour
    REFRESH_LOCK_TIMEOUT = 5.seconds

    def initialize
      @by_slug = Concurrent::Map.new
      @by_id = Concurrent::Map.new
      @last_refresh = nil
      @refresh_mutex = Mutex.new
    end

    # Find category by slug (most common lookup in rule engine)
    # @param slug [String] Category slug
    # @return [Category, nil]
    def find_by_slug(slug)
      ensure_loaded
      @by_slug[slug.to_s.downcase]
    end

    # Find category by ID (common in embedding service)
    # @param id [Integer] Category ID
    # @return [Category, nil]
    def find_by_id(id)
      ensure_loaded
      @by_id[id.to_i]
    end

    # Get all categories (useful for LLM prompts)
    # @return [Array<Category>]
    def all
      ensure_loaded
      @by_id.values
    end

    # Get slug to ID mapping (useful for batch operations)
    # @return [Hash<String, Integer>]
    def slug_to_id_map
      ensure_loaded
      @by_slug.each_pair.to_h { |k, v| [k, v.id] }
    end

    # Get ID to slug mapping
    # @return [Hash<Integer, String>]
    def id_to_slug_map
      ensure_loaded
      @by_id.each_pair.to_h { |k, v| [k, v.slug] }
    end

    # Force refresh the cache (call after category changes)
    def refresh!
      load_categories
    end

    # Clear the cache (useful for testing)
    def clear!
      @by_slug.clear
      @by_id.clear
      @last_refresh = nil
    end

    # Check if cache is stale
    # @return [Boolean]
    def stale?
      @last_refresh.nil? || Time.current - @last_refresh > CACHE_TTL
    end

    # Get cache statistics (useful for monitoring)
    # @return [Hash]
    def stats
      {
        size: @by_id.size,
        last_refresh: @last_refresh,
        stale: stale?,
        ttl_remaining: @last_refresh ? [CACHE_TTL - (Time.current - @last_refresh), 0].max : 0
      }
    end

    private

    def ensure_loaded
      return unless stale?

      # Use mutex to prevent thundering herd on cache refresh
      return unless @refresh_mutex.try_lock

      begin
        load_categories if stale?
      ensure
        @refresh_mutex.unlock
      end
    end

    def load_categories
      categories = Category.all.to_a

      # Clear existing entries
      @by_slug.clear
      @by_id.clear

      # Populate caches
      categories.each do |category|
        @by_slug[category.slug.downcase] = category
        @by_id[category.id] = category
      end

      @last_refresh = Time.current

      Rails.logger.info("ML::CategoryCache: Loaded #{categories.size} categories")
    end
  end
end
