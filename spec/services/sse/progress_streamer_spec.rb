# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Sse::ProgressStreamer do
  let(:user) { create(:user) }
  let(:template) { create(:bank_template) }
  let(:statement) { create(:statement, user: user, bank_template: template, status: 'processing') }
  let(:mock_stream) { StringIO.new }
  let(:formatter) { Sse::EventFormatter }
  let(:streamer) { described_class.new(statement, mock_stream, formatter: formatter) }

  describe '#stream!' do
    context 'when parsing is in progress' do
      before do
        statement.update_column(:metadata, {
          'parsing_progress' => {
            'status' => 'processing',
            'processed' => 100,
            'updated_at' => Time.current.iso8601
          }
        })
      end

      it 'sends initial progress event' do
        # Break immediately after initial progress
        allow(streamer).to receive(:parsing_complete?).and_return(true)
        allow(streamer).to receive(:timeout_reached?).and_return(false)
        allow(streamer).to receive(:statement_deleted?).and_return(false)
        allow(statement).to receive(:reload)

        streamer.stream!

        output = mock_stream.string
        expect(output).to include('event: progress')
        expect(output).to include('data:')
      end

      it 'sends progress updates when metadata changes' do
        initial_time = Time.current.iso8601
        updated_time = 1.second.from_now.iso8601

        statement.update_column(:metadata, {
          'parsing_progress' => {
            'status' => 'processing',
            'processed' => 100,
            'updated_at' => initial_time
          }
        })

        # Return false first (to allow one iteration), then true to break
        call_count = 0
        allow(streamer).to receive(:parsing_complete?) do
          call_count += 1
          call_count > 1 # Break after first iteration
        end
        allow(streamer).to receive(:timeout_reached?).and_return(false)
        allow(streamer).to receive(:statement_deleted?).and_return(false)

        # Simulate progress update
        allow(statement).to receive(:reload) do
          statement.update_column(:metadata, {
            'parsing_progress' => {
              'status' => 'processing',
              'processed' => 200,
              'updated_at' => updated_time
            }
          })
        end

        streamer.stream!

        output = mock_stream.string
        expect(output.scan('event: progress').count).to be >= 1
      end
    end

    context 'when parsing completes' do
      before do
        statement.update_column(:metadata, {
          'parsing_progress' => {
            'status' => 'completed',
            'processed' => 500,
            'updated_at' => Time.current.iso8601
          }
        })
        statement.update_column(:status, 'parsed')
      end

      it 'sends final complete event' do
        allow(statement).to receive(:reload)
        streamer.stream!

        output = mock_stream.string
        expect(output).to include('event: complete')
        expect(output).to include('"completed":true')
      end
    end

    context 'when parsing fails' do
      before do
        statement.update_column(:metadata, {
          'parsing_progress' => {
            'status' => 'failed',
            'processed' => 50,
            'updated_at' => Time.current.iso8601
          }
        })
        statement.update_column(:status, 'failed')
      end

      it 'sends final complete event' do
        allow(statement).to receive(:reload)
        streamer.stream!

        output = mock_stream.string
        expect(output).to include('event: complete')
      end
    end

    context 'when timeout is reached' do
      it 'sends timeout event' do
        allow(streamer).to receive(:timeout_reached?).and_return(true)
        allow(statement).to receive(:reload)

        streamer.stream!

        output = mock_stream.string
        expect(output).to include('event: error')
        expect(output).to include('Connection timeout')
      end
    end

    context 'when statement is deleted' do
      it 'stops streaming' do
        allow(streamer).to receive(:statement_deleted?).and_return(true)
        allow(statement).to receive(:reload)

        streamer.stream!

        # Should have sent initial progress before detecting deletion
        output = mock_stream.string
        expect(output).to include('event: progress')
      end
    end

    context 'when client disconnects' do
      it 'handles IOError gracefully' do
        erroring_stream = double('stream')
        allow(erroring_stream).to receive(:write).and_raise(IOError.new('Connection closed'))
        streamer = described_class.new(statement, erroring_stream, formatter: formatter)

        expect { streamer.stream! }.not_to raise_error
      end

      it 'handles Errno::EPIPE gracefully' do
        erroring_stream = double('stream')
        allow(erroring_stream).to receive(:write).and_raise(Errno::EPIPE.new('Broken pipe'))
        streamer = described_class.new(statement, erroring_stream, formatter: formatter)

        expect { streamer.stream! }.not_to raise_error
      end
    end

    describe 'polling behavior' do
      it 'polls at correct interval' do
        # Return false twice (allowing 2 iterations with sleep), then true
        call_count = 0
        allow(streamer).to receive(:parsing_complete?) do
          call_count += 1
          call_count > 2 # Break after 2 iterations
        end
        allow(streamer).to receive(:timeout_reached?).and_return(false)
        allow(streamer).to receive(:statement_deleted?).and_return(false)
        allow(statement).to receive(:reload)

        start_time = Time.current
        streamer.stream!
        elapsed = Time.current - start_time

        # Should have slept at least once (0.5 seconds)
        expect(elapsed).to be >= 0.5
      end
    end
  end

  describe 'private methods' do
    describe '#parsing_complete?' do
      it 'returns true when status is completed' do
        statement.update_column(:metadata, {
          'parsing_progress' => { 'status' => 'completed' }
        })
        expect(streamer.send(:parsing_complete?)).to be true
      end

      it 'returns true when status is failed' do
        statement.update_column(:metadata, {
          'parsing_progress' => { 'status' => 'failed' }
        })
        expect(streamer.send(:parsing_complete?)).to be true
      end

      it 'returns true when statement status is parsed' do
        statement.update_column(:status, 'parsed')
        statement.update_column(:metadata, {
          'parsing_progress' => { 'status' => 'processing' }
        })
        expect(streamer.send(:parsing_complete?)).to be true
      end

      it 'returns false when still processing' do
        statement.update_column(:metadata, {
          'parsing_progress' => { 'status' => 'processing' }
        })
        expect(streamer.send(:parsing_complete?)).to be false
      end
    end

    describe '#timeout_reached?' do
      it 'returns false initially' do
        expect(streamer.send(:timeout_reached?)).to be false
      end

      it 'returns true after max duration' do
        streamer.instance_variable_set(:@start_time, 6.minutes.ago)
        expect(streamer.send(:timeout_reached?)).to be true
      end
    end

    describe '#statement_deleted?' do
      it 'returns false when statement exists' do
        expect(streamer.send(:statement_deleted?)).to be false
      end

      it 'returns true when statement is deleted' do
        statement_id = statement.id
        statement.destroy
        streamer.instance_variable_set(:@statement, Statement.new(id: statement_id))
        expect(streamer.send(:statement_deleted?)).to be true
      end
    end
  end
end
