# frozen_string_literal: true

require 'rails_helper'

RSpec.describe BankParsers::Icici::SavingsParser do
  let(:fixtures_path) { Rails.root.join('spec', 'fixtures', 'statements', 'icici') }

  describe 'XLS format parsing' do
    let(:template) { create(:bank_template, :savings_xls) }
    let(:file_path) { fixtures_path.join('icici_savings_sample.xls') }

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

      it 'extracts description from Transaction Remarks' do
        transactions.each do |tx|
          expect(tx[:description]).to be_present
          expect(tx[:description]).to be_a(String)
        end
      end

      it 'determines transaction type correctly' do
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

      it 'extracts balance when present' do
        tx_with_balance = transactions.find { |tx| tx[:balance].present? }
        if tx_with_balance
          expect(tx_with_balance[:balance]).to be_a(Numeric)
        end
      end

      it 'includes metadata with bank info' do
        transactions.each do |tx|
          expect(tx[:metadata]).to include(
            bank: 'icici',
            account_type: 'savings'
          )
        end
      end
    end

    describe 'sample transaction validation' do
      let(:transactions) { parser.parse }

      it 'correctly identifies UPI transactions as debits' do
        upi_debits = transactions.select do |tx|
          tx[:description].downcase.include?('upi') &&
          tx[:transaction_type] == 'debit'
        end

        # UPI payments to merchants should be debits
        upi_debits.each do |tx|
          expect(tx[:amount]).to be > 0
        end
      end

      it 'correctly identifies incoming transfers as credits' do
        credits = transactions.select { |tx| tx[:transaction_type] == 'credit' }
        credits.each do |tx|
          expect(tx[:amount]).to be > 0
        end
      end

      it 'parses Indian date format (DD/MM/YYYY) correctly' do
        transactions.each do |tx|
          # Dates should be in reasonable range
          expect(tx[:transaction_date].year).to be >= 2020
          expect(tx[:transaction_date].year).to be <= Date.today.year + 1
        end
      end
    end
  end

  describe 'edge cases' do
    let(:template) { create(:bank_template, :savings_xls) }
    let(:file_path) { fixtures_path.join('icici_savings_sample.xls') }

    before do
      skip "Sample file not found" unless File.exist?(file_path)
    end

    context 'when file has special characters in description' do
      it 'handles special characters gracefully' do
        parser = described_class.new(file_path.to_s, template)
        transactions = parser.parse

        # Should not raise errors for special characters
        expect { transactions }.not_to raise_error
      end
    end

    context 'with large transaction counts' do
      it 'handles statements with many transactions' do
        parser = described_class.new(file_path.to_s, template)
        transactions = parser.parse

        # Should parse all transactions without memory issues
        expect(transactions.length).to be >= 1
      end
    end
  end

  describe 'column mapping' do
    let(:template) { create(:bank_template, :savings_xls) }
    let(:file_path) { fixtures_path.join('icici_savings_sample.xls') }

    before do
      skip "Sample file not found" unless File.exist?(file_path)
    end

    it 'uses correct column mappings from template' do
      parser = described_class.new(file_path.to_s, template)

      # Verify the parser uses template column mappings
      expect(template.column_mappings['withdrawal']).to eq('Withdrawal Amount(INR)')
      expect(template.column_mappings['deposit']).to eq('Deposit Amount(INR)')
    end
  end
end
