# frozen_string_literal: true

# Register pgvector type with ActiveRecord
# This removes the "unknown OID" warning for vector types
#
# Note: Rails 8 changed type registration. Using the new approach.
Rails.application.config.after_initialize do
  if defined?(ActiveRecord::ConnectionAdapters::PostgreSQLAdapter)
    # Register vector type using the modern Rails 8 approach
    ActiveRecord::ConnectionAdapters::PostgreSQLAdapter::NATIVE_DATABASE_TYPES[:vector] = { name: 'vector' }

    # Register the OID type mapping when a connection is established
    ActiveSupport.on_load(:active_record) do
      ActiveRecord::Type.register(:vector, ActiveRecord::Type::String, adapter: :postgresql)
    end
  end
end
