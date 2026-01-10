# frozen_string_literal: true

# ActsAsTenant Configuration
# https://github.com/ErwinM/acts_as_tenant

ActsAsTenant.configure do |config|
  # Require tenant to be set for all operations (recommended for security)
  # When true, queries without a tenant will raise an error
  config.require_tenant = false # Set to false initially to allow migration of existing data

  # Automatically add tenant to new records
  # This is the main benefit - no need to manually set workspace_id everywhere
  config.pkey = :id
end
