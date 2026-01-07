# frozen_string_literal: true

module V1
  module Entities
    class GmailConnection < Grape::Entity
      expose :id, documentation: { type: 'Integer', desc: 'Connection ID' }
      expose :email, documentation: { type: 'String', desc: 'Gmail email address' }
      expose :status, documentation: { type: 'String', desc: 'Connection status' }
      expose :display_status, documentation: { type: 'String', desc: 'Human-readable status' }
      expose :sync_enabled, documentation: { type: 'Boolean', desc: 'Whether sync is enabled' }
      expose :last_sync_at, documentation: { type: 'DateTime', desc: 'Last successful sync time' }
      expose :invoice_count, documentation: { type: 'Integer', desc: 'Number of invoices imported' }
      expose :error_message, documentation: { type: 'String', desc: 'Error message if any' },
             if: ->(connection, _) { connection.status == 'error' }
      expose :created_at, documentation: { type: 'DateTime', desc: 'Connection created at' }
    end
  end
end
