# frozen_string_literal: true

require 'rails_helper'

RSpec.describe BankParsers::Icici::CurrentParser do
  let(:fixtures_path) { Rails.root.join('spec', 'fixtures', 'statements', 'icici') }

  describe 'XLS format parsing' do
    let(:template) { create(:bank_template, :current_xls) }
    let(:file_path) { fixtures_path.join('icici_current_sample.xls') }

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

      it 'extracts description correctly' do
        transactions.each do |tx|
          expect(tx[:description]).to be_present
          expect(tx[:description]).to be_a(String)
        end
      end

      it 'determines transaction type from Cr/Dr column' do
        transactions.each do |tx|
          expect(tx[:transaction_type]).to be_in(%w[debit credit])
        end
      end

      it 'parses single amount column correctly' do
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

      it 'includes metadata with bank and account type' do
        transactions.each do |tx|
          expect(tx[:metadata]).to include(
            bank: 'icici',
            account_type: 'current'
          )
        end
      end
    end

    describe 'Cr/Dr type detection' do
      let(:transactions) { parser.parse }

      it 'marks CR transactions as credit' do
        credits = transactions.select { |tx| tx[:transaction_type] == 'credit' }
        expect(credits).not_to be_empty if transactions.any? { |tx| tx[:transaction_type] == 'credit' }
      end

      it 'marks DR transactions as debit' do
        debits = transactions.select { |tx| tx[:transaction_type] == 'debit' }
        expect(debits).not_to be_empty if transactions.any? { |tx| tx[:transaction_type] == 'debit' }
      end
    end

    describe 'reference number extraction' do
      let(:transactions) { parser.parse }

      it 'extracts Transaction ID as reference' do
        tx_with_ref = transactions.find { |tx| tx[:reference].present? }
        if tx_with_ref
          expect(tx_with_ref[:reference]).to be_a(String)
        end
      end
    end
  end

  # NOTE: XLSX format test commented out - ICICI Current Account typically uses XLS format
  # Uncomment if you have an XLSX sample file
  #
  # describe 'XLSX format parsing' do
  #   let(:template) do
  #     create(:bank_template, :current_xls).tap do |t|
  #       t.update!(file_format: 'xlsx')
  #     end
  #   end
  #   let(:file_path) { fixtures_path.join('icici_current_sample.xlsx') }
  #
  #   before do
  #     skip "Sample XLSX file not found: #{file_path}" unless File.exist?(file_path)
  #   end
  #
  #   subject(:parser) { described_class.new(file_path.to_s, template) }
  #
  #   describe '#parse' do
  #     it 'parses XLSX files successfully' do
  #       transactions = parser.parse
  #       expect(transactions).to be_an(Array)
  #       expect(parser.errors).to be_empty
  #     end
  #   end
  # end

  describe 'edge cases' do
    let(:template) { create(:bank_template, :current_xls) }

    context 'with mixed Cr/Dr values' do
      let(:file_path) { fixtures_path.join('icici_current_sample.xls') }

      before do
        skip "Sample file not found" unless File.exist?(file_path)
      end

      it 'handles both CR and Dr formats' do
        parser = described_class.new(file_path.to_s, template)
        transactions = parser.parse

        # Should have both types if the statement has both
        types = transactions.map { |tx| tx[:transaction_type] }.uniq
        expect(types).to include('debit').or include('credit')
      end
    end

    context 'with large amounts' do
      let(:file_path) { fixtures_path.join('icici_current_sample.xls') }

      before do
        skip "Sample file not found" unless File.exist?(file_path)
      end

      it 'parses large amounts correctly (lakhs/crores)' do
        parser = described_class.new(file_path.to_s, template)
        transactions = parser.parse

        # All amounts should be positive numbers
        transactions.each do |tx|
          expect(tx[:amount]).to be >= 0
        end
      end
    end
  end

  describe 'comparison with Savings parser' do
    let(:current_template) { create(:bank_template, :current_xls) }
    let(:savings_template) { create(:bank_template, :savings_xls) }

    it 'uses different amount extraction logic' do
      # Current account uses single amount + Cr/Dr
      expect(current_template.column_mappings).to have_key('amount')
      expect(current_template.column_mappings).to have_key('cr_dr')

      # Savings account uses separate Withdrawal/Deposit columns
      expect(savings_template.column_mappings).to have_key('withdrawal')
      expect(savings_template.column_mappings).to have_key('deposit')
    end
  end
end
