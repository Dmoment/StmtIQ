# frozen_string_literal: true

# Preload Workspace model for acts_as_tenant
# This is needed because acts_as_tenant :workspace in other models
# tries to resolve the Workspace class immediately during eager loading.
# Since models load alphabetically, Account loads before Workspace,
# causing a NameError.

Rails.application.config.before_eager_load do
  require Rails.root.join('app/models/workspace')
end
