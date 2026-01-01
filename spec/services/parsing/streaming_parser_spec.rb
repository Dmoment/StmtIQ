# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Parsing::StreamingParser do
  let(:user) { create(:user) }
  let(:template) { create(:bank_template) }
  let(:statement) { create(:statement, user: user, bank_template: template, status: 'pending') }
  let(:parser) { described_class.new(statement) }

  describe '#initialize' do
    it 'sets statement and template' do
      expect(parser.statement).to eq(statement)
      expect(parser.template).to eq(template)
    end

    it 'creates progress tracker' do
      # Check that progress object exists and has expected methods
      expect(parser.progress).to respond_to(:start!)
      expect(parser.progress).to respond_to(:update_processed)
      expect(parser.progress).to respond_to(:complete!)
      expect(parser.progress.status).to eq('pending')
    end
  end

  describe '#parse!' do
    let(:mock_parser) { instance_double(BankParsers::BaseParser) }
    let(:mock_file) { double('file', path: '/tmp/test.xlsx') }

    before do
      # Mock file download
      allow(parser).to receive(:download_and_process).and_yield(mock_file)
      allow(parser).to receive(:create_parser).with(mock_file.path).and_return(mock_parser)
    end

    context 'when parsing succeeds' do
      let(:transaction_data) do
        [
          {
            transaction_date: Date.today,
            description: 'Test Transaction 1',
            amount: 1000.0,
            transaction_type: 'debit',
            balance: 5000.0
          },
          {
            transaction_date: Date.today,
            description: 'Test Transaction 2',
            amount: 2000.0,
            transaction_type: 'credit',
            balance: 7000.0
          }
        ]
      end

      before do
        # Mock streaming parser to yield transactions
        allow(mock_parser).to receive(:each_transaction).and_yield(transaction_data[0]).and_yield(transaction_data[1])
        allow(mock_parser).to receive(:errors).and_return([])
        allow(parser).to receive(:enqueue_categorization_jobs)
      end

      it 'processes transactions in chunks' do
        result = parser.parse!

        expect(result[:success]).to be true
        expect(result[:transaction_count]).to eq(2)
        expect(statement.transactions.count).to eq(2)
      end

      it 'marks statement as parsed' do
        parser.parse!
        statement.reload
        expect(statement.status).to eq('parsed')
      end

      it 'updates progress' do
        parser.parse!
        statement.reload

        progress = statement.parsing_progress
        expect(progress['status']).to eq('completed')
        expect(progress['processed']).to eq(2)
      end

      it 'enqueues categorization jobs' do
        expect(parser).to receive(:enqueue_categorization_jobs)
        parser.parse!
      end
    end

    context 'when no transactions found' do
      before do
        allow(mock_parser).to receive(:each_transaction)
        allow(mock_parser).to receive(:errors).and_return([])
      end

      it 'raises ParsingError' do
        expect {
          parser.parse!
        }.to raise_error(Parsing::StreamingParser::ParsingError, /No transactions found/)
      end

      it 'marks statement as failed' do
        begin
          parser.parse!
        rescue Parsing::StreamingParser::ParsingError
          # Expected
        end

        statement.reload
        expect(statement.status).to eq('failed')
      end
    end

    context 'when parsing fails' do
      before do
        allow(mock_parser).to receive(:each_transaction).and_raise(StandardError.new('Parse error'))
      end

      it 'marks statement as failed' do
        expect {
          parser.parse!
        }.to raise_error(StandardError, 'Parse error')

        statement.reload
        expect(statement.status).to eq('failed')
      end

      it 'updates progress with error' do
        begin
          parser.parse!
        rescue StandardError
          # Expected
        end

        statement.reload
        progress = statement.parsing_progress
        expect(progress['status']).to eq('failed')
      end
    end

    context 'chunking behavior' do
      let(:large_transaction_set) do
        (1..1200).map do |i|
          {
            transaction_date: Date.today,
            description: "Transaction #{i}",
            amount: 100.0 * i,
            transaction_type: i.even? ? 'credit' : 'debit',
            balance: 10000.0 + (100.0 * i)
          }
        end
      end

      before do
        # Mock parser to yield many transactions
        allow(mock_parser).to receive(:each_transaction) do |&block|
          large_transaction_set.each { |tx| block.call(tx) }
        end
        allow(mock_parser).to receive(:errors).and_return([])
        allow(parser).to receive(:enqueue_categorization_jobs)
      end

      it 'processes transactions in chunks of 500' do
        # Should insert in 3 chunks: 500, 500, 200
        expect(parser).to receive(:bulk_insert_transactions).exactly(3).times.and_call_original

        result = parser.parse!
        expect(result[:transaction_count]).to eq(1200)
        expect(statement.transactions.count).to eq(1200)
      end

      it 'updates progress during chunking' do
        parser.parse!
        statement.reload

        progress = statement.parsing_progress
        expect(progress['processed']).to eq(1200)
      end
    end
  end

  describe 'private methods' do
    describe '#normalize_transaction_data' do
      let(:raw_data) do
        {
          transaction_date: Date.today,
          description: 'Test Transaction',
          amount: 1000.0,
          transaction_type: 'debit',
          balance: 5000.0,
          reference: 'REF123'
        }
      end

      it 'normalizes transaction data' do
        normalized = parser.send(:normalize_transaction_data, raw_data)

        expect(normalized).to include(
          date: Date.today,
          description: 'Test Transaction',
          amount: 1000.0,
          type: 'debit',
          balance: 5000.0,
          reference: 'REF123'
        )
      end

      it 'sets description from transaction data' do
        normalized = parser.send(:normalize_transaction_data, raw_data)
        expect(normalized[:description]).to eq('Test Transaction')
      end
    end

    describe '#bulk_insert_transactions' do
      let(:transactions_data) do
        [
          {
            statement_id: statement.id,
            user_id: user.id,
            transaction_date: Date.today,
            description: 'Transaction 1',
            amount: 1000.0,
            transaction_type: 'debit',
            balance: 5000.0
          },
          {
            statement_id: statement.id,
            user_id: user.id,
            transaction_date: Date.today,
            description: 'Transaction 2',
            amount: 2000.0,
            transaction_type: 'credit',
            balance: 7000.0
          }
        ]
      end

      it 'bulk inserts transactions' do
        expect {
          parser.send(:bulk_insert_transactions, transactions_data)
        }.to change { Transaction.count }.by(2)
      end

      it 'skips validations for performance' do
        # Transactions should be inserted even without category
        parser.send(:bulk_insert_transactions, transactions_data)
        expect(Transaction.count).to eq(2)
      end
    end
  end
end
