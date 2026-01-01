# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Sse::EventFormatter do
  let(:user) { create(:user) }
  let(:template) { create(:bank_template) }
  let(:statement) { create(:statement, user: user, bank_template: template, status: 'processing') }

  describe '.progress_event' do
    before do
      statement.update_column(:metadata, {
        'parsing_progress' => {
          'status' => 'processing',
          'processed' => 150,
          'updated_at' => '2024-01-01T12:00:00Z',
          'duration_seconds' => 5.5
        }
      })
      create_list(:transaction, 150, statement: statement)
    end

    it 'formats progress event with all required fields' do
      event = described_class.progress_event(statement)

      expect(event).to include(
        id: statement.id,
        status: 'processing',
        parsing_status: 'processing',
        processed: 150,
        transaction_count: 150,
        duration_seconds: 5.5,
        updated_at: '2024-01-01T12:00:00Z'
      )
    end

    it 'handles missing processed count' do
      statement.update_column(:metadata, {
        'parsing_progress' => {
          'status' => 'pending',
          'updated_at' => '2024-01-01T12:00:00Z'
        }
      })

      event = described_class.progress_event(statement)
      expect(event[:processed]).to eq(0)
    end

    it 'handles nil duration_seconds' do
      statement.update_column(:metadata, {
        'parsing_progress' => {
          'status' => 'pending',
          'processed' => 0,
          'updated_at' => '2024-01-01T12:00:00Z'
        }
      })

      event = described_class.progress_event(statement)
      expect(event[:duration_seconds]).to be_nil
    end
  end

  describe '.complete_event' do
    before do
      statement.update_column(:metadata, {
        'parsing_progress' => {
          'status' => 'completed',
          'processed' => 500,
          'updated_at' => '2024-01-01T12:00:00Z',
          'duration_seconds' => 10.2
        }
      })
      create_list(:transaction, 500, statement: statement)
    end

    it 'includes completed flag' do
      event = described_class.complete_event(statement)

      expect(event).to include(
        id: statement.id,
        status: statement.status,
        parsing_status: 'completed',
        processed: 500,
        transaction_count: 500,
        completed: true
      )
    end
  end

  describe '.error_event' do
    it 'formats error event' do
      event = described_class.error_event(
        statement_id: 123,
        error: 'Statement not found'
      )

      expect(event).to include(
        id: 123,
        error: 'Statement not found',
        message: 'Statement not found'
      )
    end

    it 'includes custom message' do
      event = described_class.error_event(
        statement_id: 123,
        error: 'Connection timeout',
        message: 'Progress stream timed out after 5 minutes'
      )

      expect(event).to include(
        id: 123,
        error: 'Connection timeout',
        message: 'Progress stream timed out after 5 minutes'
      )
    end
  end

  describe '.timeout_event' do
    it 'formats timeout event' do
      event = described_class.timeout_event(123)

      expect(event).to include(
        id: 123,
        error: 'Connection timeout',
        message: 'Progress stream timed out after 5 minutes'
      )
    end
  end

  describe '.format' do
    it 'formats data as SSE event string' do
      data = { id: 1, status: 'processing' }
      result = described_class.format('progress', data)

      expect(result).to include('event: progress')
      expect(result).to include('data: {"id":1,"status":"processing"}')
      expect(result).to end_with("\n\n")
    end

    it 'handles complex nested data' do
      data = { id: 1, metadata: { count: 100 } }
      result = described_class.format('complete', data)

      expect(result).to include('event: complete')
      expect(result).to include('data:')
      expect(result).to match(/{"id":1,"metadata":\{"count":100\}}/)
    end
  end
end


