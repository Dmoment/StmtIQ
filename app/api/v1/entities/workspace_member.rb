# frozen_string_literal: true

module V1
  module Entities
    class WorkspaceMember < Grape::Entity
      expose :id
      expose :user_id
      expose :role
      expose :status
      expose :joined_at
      expose :last_accessed_at
      expose :created_at

      expose :user do |membership|
        {
          id: membership.user.id,
          name: membership.user.name,
          email: membership.user.email,
          avatar_url: membership.user.avatar_url
        }
      end

      expose :is_owner do |membership|
        membership.owner?
      end

      expose :is_admin do |membership|
        membership.admin?
      end
    end

    class WorkspaceInvitationEntity < Grape::Entity
      expose :id
      expose :email
      expose :phone_number
      expose :role
      expose :status
      expose :expires_at
      expose :created_at

      expose :invited_by do |invitation|
        {
          id: invitation.invited_by.id,
          name: invitation.invited_by.name
        }
      end

      expose :is_expired do |invitation|
        invitation.expired?
      end
    end
  end
end
