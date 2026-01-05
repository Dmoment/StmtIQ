# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ML::RuleEngine do
  let(:user) { create(:user) }
  let(:statement) { create(:statement, user: user) }

  before do
    Category.seed_system_categories!
  end

  describe '#categorize' do
    context 'with food keywords' do
      it 'categorizes swiggy as food' do
        transaction = create(:transaction, user: user, statement: statement, description: 'SWIGGY ORDER FOOD')
        result = described_class.new(transaction, user: user).categorize

        expect(result[:category].slug).to eq('food')
        expect(result[:confidence]).to be >= 0.75
        expect(result[:method]).to eq('rule')
      end

      it 'categorizes zomato as food' do
        transaction = create(:transaction, user: user, statement: statement, description: 'ZOMATO ONLINE ORDER')
        result = described_class.new(transaction, user: user).categorize

        expect(result[:category].slug).to eq('food')
      end
    end

    context 'with transport keywords' do
      it 'categorizes uber as transport' do
        transaction = create(:transaction, user: user, statement: statement, description: 'UBER TRIP MUMBAI')
        result = described_class.new(transaction, user: user).categorize

        expect(result[:category].slug).to eq('transport')
      end

      it 'categorizes petrol as transport' do
        transaction = create(:transaction, user: user, statement: statement, description: 'INDIAN OIL PETROL PUMP')
        result = described_class.new(transaction, user: user).categorize

        expect(result[:category].slug).to eq('transport')
      end
    end

    context 'with shopping keywords' do
      it 'categorizes amazon as shopping' do
        transaction = create(:transaction, user: user, statement: statement, description: 'AMAZON PAY PURCHASE')
        result = described_class.new(transaction, user: user).categorize

        expect(result[:category].slug).to eq('shopping')
      end
    end

    context 'with transfer keywords' do
      it 'categorizes NEFT as transfer' do
        transaction = create(:transaction, user: user, statement: statement, description: 'NEFT TRANSFER TO SELF')
        result = described_class.new(transaction, user: user).categorize

        expect(result[:category].slug).to eq('transfer')
      end

      it 'categorizes IMPS as transfer' do
        transaction = create(:transaction, user: user, statement: statement, description: 'IMPS PAYMENT')
        result = described_class.new(transaction, user: user).categorize

        expect(result[:category].slug).to eq('transfer')
      end
    end

    context 'with tax keywords' do
      it 'categorizes income tax as tax' do
        transaction = create(:transaction, user: user, statement: statement, description: 'INCOME TAX PAYMENT ADVANCE TAX')
        result = described_class.new(transaction, user: user).categorize

        expect(result[:category].slug).to eq('tax')
        expect(result[:confidence]).to be >= 0.90 # Multi-word keyword match
      end
    end

    context 'with no matching keywords' do
      it 'returns nil category' do
        transaction = create(:transaction, user: user, statement: statement, description: 'RANDOM TRANSACTION XYZ')
        result = described_class.new(transaction, user: user).categorize

        expect(result[:category]).to be_nil
        expect(result[:confidence]).to eq(0.0)
      end
    end

    context 'with multi-word keywords' do
      it 'gives higher confidence for multi-word matches' do
        transaction = create(:transaction, user: user, statement: statement, description: 'UBER EATS DELIVERY')
        result = described_class.new(transaction, user: user).categorize

        expect(result[:category].slug).to eq('food')
        expect(result[:confidence]).to be >= 0.90
      end
    end

    context 'with user rules' do
      it 'prioritizes user rules over system rules' do
        investment_category = Category.find_by(slug: 'investment')
        UserRule.create!(
          user: user,
          category: investment_category,
          pattern: 'cursor.com',
          pattern_type: 'keyword'
        )

        transaction = create(:transaction, user: user, statement: statement, description: 'CURSOR.COM SUBSCRIPTION')
        result = described_class.new(transaction, user: user).categorize

        expect(result[:category].slug).to eq('investment')
        expect(result[:method]).to eq('user_rule')
      end
    end
  end
end
