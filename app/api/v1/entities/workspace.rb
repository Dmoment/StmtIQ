# frozen_string_literal: true

module V1
  module Entities
    class Workspace < Grape::Entity
      expose :id
      expose :name
      expose :slug
      expose :workspace_type
      expose :plan
      expose :logo_url
      expose :description
      expose :is_active
      expose :created_at
      expose :updated_at

      # Owner info
      expose :owner_id
      expose :owner, using: V1::Entities::User, if: ->(workspace, options) { options[:include_owner] }

      # Current user's role in this workspace
      expose :current_user_role do |workspace, options|
        next unless options[:current_user]

        workspace.role_for(options[:current_user])
      end

      # Member count
      expose :member_count do |workspace|
        workspace.workspace_memberships.active.count
      end

      # Is this the user's personal workspace?
      expose :is_personal do |workspace|
        workspace.personal?
      end

      # Is the current user the owner?
      expose :is_owner do |workspace, options|
        next false unless options[:current_user]

        workspace.owner?(options[:current_user])
      end
    end

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
