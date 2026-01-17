# frozen_string_literal: true

module V1
  module Entities
    class WorkspaceSimple < Grape::Entity
      expose :id
      expose :name
      expose :slug
      expose :workspace_type
      expose :logo_url
      expose :is_active

      expose :current_user_role do |workspace, options|
        next unless options[:current_user]

        workspace.role_for(options[:current_user])
      end
    end
  end
end
