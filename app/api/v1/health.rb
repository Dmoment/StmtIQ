# frozen_string_literal: true

module V1
  class Health < Grape::API
    resource :health do
      desc 'Health check endpoint'
      get do
        {
          status: 'ok',
          timestamp: Time.current.iso8601,
          version: 'v1'
        }
      end
    end
  end
end
