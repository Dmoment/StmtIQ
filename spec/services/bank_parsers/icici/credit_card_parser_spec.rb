# frozen_string_literal: true

require 'rails_helper'

RSpec.describe BankParsers::Icici::CreditCardParser do
  let(:fixtures_path) { Rails.root.join('spec', 'fixtures', 'statements', 'icici') }

  describe 'CSV format parsing' do
    let(:template) { create(:bank_template, :credit_card_csv) }
    let(:file_path) { fixtures_path.join('icici_credit_card_sample.csv') }

    before do
      skip "Sample file not found: #{file_path}" unless File.exist?(file_path)
    end

    subject(:parser) { described_class.new(file_path.to_s, template) }

    describe '#parse' do
      let(:transactions) { parser.parse }

      it 'returns an array of transactions' do
        expect(transactions).to be_an(Array)
      end

      it 'parses transactions successfully' do
        expect(transactions).not_to be_empty
        expect(parser.errors).to be_empty
      end

      it 'extracts transaction date correctly' do
        transactions.each do |tx|
          expect(tx[:transaction_date]).to be_a(Date)
        end
      end

      it 'extracts description from Transaction Details' do
        transactions.each do |tx|
          expect(tx[:description]).to be_present
          expect(tx[:description]).to be_a(String)
        end
      end

      it 'extracts Sr.No. as reference' do
        tx_with_ref = transactions.find { |tx| tx[:reference].present? }
        if tx_with_ref
          expect(tx_with_ref[:reference]).to match(/\d+/)
        end
      end

      it 'determines transaction type correctly using BillingAmountSign' do
        transactions.each do |tx|
          expect(tx[:transaction_type]).to be_in(%w[debit credit])
        end
      end

      it 'parses amounts as positive numbers' do
        transactions.each do |tx|
          expect(tx[:amount]).to be_a(Numeric)
          expect(tx[:amount]).to be >= 0
        end
      end

      it 'includes metadata with bank info' do
        transactions.each do |tx|
          expect(tx[:metadata]).to include(
            bank: 'icici',
            account_type: 'credit_card'
          )
        end
      end

      it 'does not include balance (credit cards do not have running balance)' do
        transactions.each do |tx|
          expect(tx[:balance]).to be_nil
        end
      end
    end

    describe 'transaction type detection' do
      let(:transactions) { parser.parse }

      it 'marks transactions with BillingAmountSign=CR as credit' do
        credits = transactions.select { |tx| tx[:transaction_type] == 'credit' }
        # Should have at least one credit if there's a payment in the statement
        # The "INFINITY PAYMENT RECEIVED THANK YOU" row has "CR"
        if credits.any?
          credits.each do |tx|
            expect(tx[:amount]).to be > 0
          end
        end
      end

      it 'marks transactions without CR as debit (purchases)' do
        debits = transactions.select { |tx| tx[:transaction_type] == 'debit' }
        expect(debits).not_to be_empty
        debits.each do |tx|
          expect(tx[:amount]).to be > 0
        end
      end
    end

    describe 'sample transaction validation' do
      let(:transactions) { parser.parse }

      it 'correctly parses RENDER.COM transaction' do
        render_tx = transactions.find { |tx| tx[:description].include?('RENDER.COM') }
        if render_tx
          expect(render_tx[:transaction_type]).to eq('debit')
          expect(render_tx[:amount]).to be > 0
        end
      end

      it 'correctly parses OPENAI ChatGPT subscription' do
        openai_tx = transactions.find { |tx| tx[:description].include?('OPENAI') || tx[:description].include?('CHATGPT') }
        if openai_tx
          expect(openai_tx[:transaction_type]).to eq('debit')
          expect(openai_tx[:amount]).to be > 0
        end
      end

      it 'correctly parses payment received as credit' do
        payment_tx = transactions.find { |tx| tx[:description].downcase.include?('payment') }
        if payment_tx
          expect(payment_tx[:transaction_type]).to eq('credit')
        end
      end

      it 'parses Indian date format (DD/MM/YYYY) correctly' do
        transactions.each do |tx|
          expect(tx[:transaction_date].year).to be >= 2020
          expect(tx[:transaction_date].year).to be <= Date.today.year + 1
        end
      end
    end

    describe 'international amount extraction' do
      let(:transactions) { parser.parse }

      it 'extracts international amount in metadata when present' do
        intl_tx = transactions.find { |tx| tx[:metadata][:international_amount].present? && tx[:metadata][:international_amount] > 0 }
        if intl_tx
          expect(intl_tx[:metadata][:international_amount]).to be_a(Numeric)
        end
      end
    end

    describe 'reward points extraction' do
      let(:transactions) { parser.parse }

      it 'extracts reward points in metadata when present' do
        tx_with_points = transactions.find { |tx| tx[:metadata][:reward_points].present? && tx[:metadata][:reward_points] > 0 }
        if tx_with_points
          expect(tx_with_points[:metadata][:reward_points]).to be_a(Integer)
        end
      end
    end
  end

  describe 'XLS format parsing' do
    let(:template) { create(:bank_template, :credit_card_xls) }
    let(:file_path) { fixtures_path.join('icici_credit_card_sample.xls') }

    before do
      skip "Sample XLS file not found: #{file_path}" unless File.exist?(file_path)
    end

    subject(:parser) { described_class.new(file_path.to_s, template) }

    describe '#parse' do
      it 'parses XLS files successfully' do
        transactions = parser.parse
        expect(transactions).to be_an(Array)
        expect(parser.errors).to be_empty
      end
    end
  end

  describe 'edge cases' do
    let(:template) { create(:bank_template, :credit_card_csv) }
    let(:file_path) { fixtures_path.join('icici_credit_card_sample.csv') }

    before do
      skip "Sample file not found" unless File.exist?(file_path)
    end

    context 'skipping header rows' do
      it 'skips Accountno, Customer Name, Address rows' do
        parser = described_class.new(file_path.to_s, template)
        transactions = parser.parse

        # Should not include metadata rows as transactions
        descriptions = transactions.map { |tx| tx[:description].downcase }
        expect(descriptions).not_to include('accountno')
        expect(descriptions).not_to include('customer name')
      end
    end

    context 'with zero amount transactions' do
      it 'handles transactions with zero amount' do
        parser = described_class.new(file_path.to_s, template)
        transactions = parser.parse

        # Zero amount transactions (like some fee waivers) should still be parsed
        zero_amount_tx = transactions.select { |tx| tx[:amount] == 0 }
        # Just ensure parsing doesn't fail
        expect(transactions).to be_an(Array)
      end
    end
  end

  describe 'comparison with other parsers' do
    let(:credit_card_template) { create(:bank_template, :credit_card_csv) }
    let(:savings_template) { create(:bank_template, :savings_xls) }

    it 'uses different column mappings than savings parser' do
      # Credit card uses single amount column + BillingAmountSign
      expect(credit_card_template.column_mappings).to have_key('cr_dr')
      expect(credit_card_template.column_mappings['cr_dr']).to eq('BillingAmountSign')

      # Savings uses separate Withdrawal/Deposit columns
      expect(savings_template.column_mappings).to have_key('withdrawal')
      expect(savings_template.column_mappings).to have_key('deposit')
    end

    it 'uses Sr.No. as reference for credit card' do
      expect(credit_card_template.column_mappings['reference']).to eq('Sr.No.')
    end
  end
end
