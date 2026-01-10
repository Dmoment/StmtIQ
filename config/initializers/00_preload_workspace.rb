# frozen_string_literal: true

# Preload Workspace model for acts_as_tenant
# This is needed because acts_as_tenant :workspace in other models
# tries to resolve the Workspace class immediately during eager loading.
# Since models load alphabetically, Account loads before Workspace,
# causing a NameError.

# Define Workspace constant early to satisfy acts_as_tenant
# The real model will be properly loaded later and take precedence
unless defined?(Workspace)
  autoload :Workspace, Rails.root.join('app/models/workspace').to_s
end
