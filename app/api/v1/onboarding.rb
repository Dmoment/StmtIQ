# frozen_string_literal: true

module V1
  class Onboarding < Grape::API
    resource :onboarding do
      desc 'Complete user onboarding'
      params do
        requires :name, type: String, desc: 'User display name'
        requires :workspace_name, type: String, desc: 'Workspace name'
        requires :workspace_type, type: String, values: %w[personal business], desc: 'Workspace type'
      end
      post :complete do
        require_authentication!

        # Check if already onboarded
        if current_user.onboarded_at.present?
          error!({ error: 'User already onboarded' }, 422)
        end

        ActiveRecord::Base.transaction do
          # Update user name
          current_user.update!(name: params[:name])

          # Update the default workspace (created on user creation)
          workspace = current_user.current_workspace || current_user.owned_workspaces.first

          if workspace
            workspace.update!(
              name: params[:workspace_name],
              workspace_type: params[:workspace_type]
            )
          else
            # Create workspace if somehow doesn't exist
            workspace = current_user.owned_workspaces.create!(
              name: params[:workspace_name],
              workspace_type: params[:workspace_type]
            )
            current_user.update!(current_workspace: workspace)
          end

          # Mark as onboarded
          current_user.update!(onboarded_at: Time.current)
        end

        present current_user, with: V1::Entities::User
      end

      desc 'Check onboarding status'
      get :status do
        require_authentication!

        {
          onboarded: current_user.onboarded_at.present?,
          onboarded_at: current_user.onboarded_at,
          has_name: current_user.name.present?,
          has_workspace: current_user.current_workspace.present?
        }
      end
    end
  end
end
