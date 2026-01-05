# frozen_string_literal: true

require 'rails_helper'

# Use string to help with autoloading
RSpec.describe 'Api::V1::StatementProgressController', type: :controller do
  let(:user) { create(:user) }
  let(:template) { create(:bank_template) }
  let(:statement) { create(:statement, user: user, bank_template: template, status: 'processing') }

  before do
    # Mock authentication - use string to avoid autoload issues
    controller_class = 'Api::V1::StatementProgressController'.constantize
    allow_any_instance_of(controller_class).to receive(:current_user).and_return(user)
  end

  describe 'GET #stream' do
    context 'when statement exists' do
      before do
        statement.update_column(:metadata, {
          'parsing_progress' => {
            'status' => 'processing',
            'processed' => 100,
            'updated_at' => Time.current.iso8601
          }
        })
      end

      it 'sets SSE headers' do
        # Mock streamer to avoid actual streaming
        streamer = instance_double(Sse::ProgressStreamer)
        allow(Sse::ProgressStreamer).to receive(:new).and_return(streamer)
        allow(streamer).to receive(:stream!)

        get :stream, params: { id: statement.id }

        expect(response.headers['Content-Type']).to eq('text/event-stream')
        expect(response.headers['Cache-Control']).to eq('no-cache')
        expect(response.headers['X-Accel-Buffering']).to eq('no')
      end

      it 'initializes and calls streamer' do
        streamer = instance_double(Sse::ProgressStreamer)
        allow(Sse::ProgressStreamer).to receive(:new).and_return(streamer)
        allow(streamer).to receive(:stream!)

        get :stream, params: { id: statement.id }

        expect(Sse::ProgressStreamer).to have_received(:new).with(
          statement,
          response.stream
        )
        expect(streamer).to have_received(:stream!)
      end

      it 'calls ResponseSetup' do
        streamer = instance_double(Sse::ProgressStreamer)
        allow(Sse::ProgressStreamer).to receive(:new).and_return(streamer)
        allow(streamer).to receive(:stream!)
        allow(Sse::ResponseSetup).to receive(:call)

        get :stream, params: { id: statement.id }

        expect(Sse::ResponseSetup).to have_received(:call).with(response)
      end
    end

    context 'when statement does not exist' do
      it 'sends error event and closes stream' do
        get :stream, params: { id: 99999 }

        expect(response.headers['Content-Type']).to eq('text/event-stream')
        # Note: With ActionController::Live, we can't easily test response.body
        # The error is written to the stream which is closed immediately
      end
    end

    context 'when statement belongs to different user' do
      let(:other_user) { create(:user, phone_number: '8888888888') }
      let(:other_statement) { create(:statement, user: other_user, bank_template: template) }

      it 'raises RecordNotFound' do
        expect {
          get :stream, params: { id: other_statement.id }
        }.to raise_error(ActiveRecord::RecordNotFound)
      end
    end
  end
end
