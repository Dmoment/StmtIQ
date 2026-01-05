# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ML::NormalizationService do
  describe '.normalize' do
    it 'removes UPI prefix' do
      result = described_class.normalize('UPI/Swiggy ORDER FOOD')
      expect(result).not_to match(/\bupi\b/)
      expect(result).to include('swiggy')
    end

    it 'extracts known merchant names' do
      result = described_class.normalize('SWIGGY ORDER FOOD BANGALORE')
      expect(result).to start_with('swiggy')
    end

    it 'removes reference patterns with markers' do
      result = described_class.normalize('PAYMENT REF NO 12345 FOR GROCERIES')
      expect(result).to include('payment')
      expect(result).to include('groceries')
    end

    it 'removes dates' do
      result = described_class.normalize('PAYMENT 01/12/2024 FOR RENT')
      expect(result).not_to include('2024')
      expect(result).to include('rent')
    end

    it 'removes amount patterns' do
      result = described_class.normalize('PAYMENT Rs. 500 FOR UBER TRIP')
      expect(result).not_to include('500')
    end

    it 'preserves context after merchant extraction' do
      result = described_class.normalize('UBER TRIP TO AIRPORT')
      expect(result).to include('uber')
      expect(result).to include('trip')
    end

    it 'returns first 5 meaningful words' do
      result = described_class.normalize('THIS IS A VERY LONG DESCRIPTION WITH MANY WORDS')
      words = result.split(' ')
      expect(words.length).to be <= 5
    end

    it 'handles empty strings' do
      expect(described_class.normalize('')).to eq('')
      expect(described_class.normalize(nil)).to eq('')
    end

    it 'normalizes whitespace' do
      result = described_class.normalize('PAYMENT   FOR    GROCERIES')
      expect(result).not_to include('  ')
    end
  end
end
