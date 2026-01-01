# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Sse::ResponseSetup do
  let(:response) { ActionDispatch::Response.new }

  describe '.call' do
    it 'sets Content-Type header' do
      described_class.call(response)
      expect(response.headers['Content-Type']).to eq('text/event-stream')
    end

    it 'sets Cache-Control header' do
      described_class.call(response)
      expect(response.headers['Cache-Control']).to eq('no-cache')
    end

    it 'sets X-Accel-Buffering header' do
      described_class.call(response)
      expect(response.headers['X-Accel-Buffering']).to eq('no')
    end

    it 'sets all required headers' do
      described_class.call(response)

      expect(response.headers).to include(
        'Content-Type' => 'text/event-stream',
        'Cache-Control' => 'no-cache',
        'X-Accel-Buffering' => 'no'
      )
    end

    it 'does not override existing headers' do
      response.headers['X-Custom'] = 'custom-value'
      described_class.call(response)

      expect(response.headers['X-Custom']).to eq('custom-value')
      expect(response.headers['Content-Type']).to eq('text/event-stream')
    end
  end
end


