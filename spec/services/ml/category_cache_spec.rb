# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ML::CategoryCache do
  include ActiveSupport::Testing::TimeHelpers

  let(:cache) { described_class.instance }

  # Create test categories
  let!(:food_category) { create(:category, slug: 'food', name: 'Food & Dining') }
  let!(:transport_category) { create(:category, slug: 'transport', name: 'Transport') }
  let!(:shopping_category) { create(:category, slug: 'shopping', name: 'Shopping') }

  before do
    # Clear cache before each test
    cache.clear!
  end

  describe '#find_by_slug' do
    it 'returns category by slug' do
      expect(cache.find_by_slug('food')).to eq(food_category)
    end

    it 'returns category with case-insensitive slug' do
      expect(cache.find_by_slug('FOOD')).to eq(food_category)
      expect(cache.find_by_slug('Food')).to eq(food_category)
    end

    it 'returns nil for non-existent slug' do
      expect(cache.find_by_slug('nonexistent')).to be_nil
    end

    it 'loads categories on first access' do
      expect(cache).to receive(:load_categories).once.and_call_original
      cache.find_by_slug('food')
      cache.find_by_slug('transport') # Should not trigger another load
    end
  end

  describe '#find_by_id' do
    it 'returns category by ID' do
      expect(cache.find_by_id(food_category.id)).to eq(food_category)
    end

    it 'returns nil for non-existent ID' do
      expect(cache.find_by_id(99999)).to be_nil
    end
  end

  describe '#all' do
    it 'returns all categories' do
      categories = cache.all
      expect(categories).to include(food_category, transport_category, shopping_category)
    end
  end

  describe '#slug_to_id_map' do
    it 'returns a hash mapping slugs to IDs' do
      map = cache.slug_to_id_map
      expect(map['food']).to eq(food_category.id)
      expect(map['transport']).to eq(transport_category.id)
    end
  end

  describe '#id_to_slug_map' do
    it 'returns a hash mapping IDs to slugs' do
      map = cache.id_to_slug_map
      expect(map[food_category.id]).to eq('food')
      expect(map[transport_category.id]).to eq('transport')
    end
  end

  describe '#refresh!' do
    it 'reloads categories from database' do
      # Load cache
      cache.find_by_slug('food')

      # Create new category
      new_category = create(:category, slug: 'utilities', name: 'Utilities')

      # Before refresh, new category not in cache
      expect(cache.find_by_slug('utilities')).to be_nil

      # Refresh and verify
      cache.refresh!
      expect(cache.find_by_slug('utilities')).to eq(new_category)
    end
  end

  describe '#stale?' do
    it 'returns true when cache has never been loaded' do
      expect(cache.stale?).to be true
    end

    it 'returns false after loading' do
      cache.refresh!
      expect(cache.stale?).to be false
    end

    it 'returns true after TTL expires' do
      cache.refresh!
      travel(2.hours) do
        expect(cache.stale?).to be true
      end
    end
  end

  describe '#stats' do
    it 'returns cache statistics' do
      cache.refresh!
      stats = cache.stats

      expect(stats[:size]).to eq(3)
      expect(stats[:last_refresh]).to be_present
      expect(stats[:stale]).to be false
      expect(stats[:ttl_remaining]).to be > 0
    end
  end

  describe '#clear!' do
    it 'clears all cached data' do
      cache.refresh!
      expect(cache.find_by_slug('food')).to eq(food_category)

      cache.clear!
      expect(cache.stale?).to be true
    end
  end

  describe 'thread safety' do
    it 'handles concurrent access safely' do
      threads = 10.times.map do
        Thread.new do
          10.times do
            cache.find_by_slug(%w[food transport shopping].sample)
          end
        end
      end

      expect { threads.each(&:join) }.not_to raise_error
    end
  end

  describe 'singleton pattern' do
    it 'returns the same instance' do
      instance1 = described_class.instance
      instance2 = described_class.instance
      expect(instance1).to be(instance2)
    end
  end
end
