# frozen_string_literal: true

# Register pgvector type with ActiveRecord
# This removes the "unknown OID 335292" warning
Rails.application.config.after_initialize do
  if defined?(ActiveRecord::ConnectionAdapters::PostgreSQLAdapter)
    ActiveRecord::ConnectionAdapters::PostgreSQLAdapter.class_eval do
      def initialize_type_map(m = type_map)
        super
        # Register vector type (OID 335292) as a string type
        # ActiveRecord will treat it as a string, but PostgreSQL handles it as vector
        m.register_type 'vector', ActiveRecord::Type::String.new
      end
    end
  end
end
