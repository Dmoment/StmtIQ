# frozen_string_literal: true

module V1
  class Workspaces < Grape::API
    helpers do
      def find_workspace!
        @workspace = current_user.workspaces
                                 .joins(:workspace_memberships)
                                 .where(workspace_memberships: { status: 'active' })
                                 .find(params[:id])
      end

      def find_membership!
        @membership = @workspace.workspace_memberships.find(params[:member_id])
      end

      def find_invitation!
        @invitation = @workspace.workspace_invitations.find(params[:invitation_id])
      end
    end

    resource :workspaces do
      before { authenticate! }

      # GET /api/v1/workspaces
      desc 'List all workspaces for current user'
      get do
        workspaces = policy_scope(Workspace)
        present workspaces, with: V1::Entities::WorkspaceSimple, current_user: current_user
      end

      # POST /api/v1/workspaces
      desc 'Create a new workspace'
      params do
        requires :name, type: String, desc: 'Workspace name'
        requires :workspace_type, type: String, values: %w[personal business], desc: 'Workspace type'
        optional :description, type: String, desc: 'Description'
        optional :logo_url, type: String, desc: 'Logo URL'
      end
      post do
        workspace = current_user.owned_workspaces.build(
          name: params[:name],
          workspace_type: params[:workspace_type],
          description: params[:description],
          logo_url: params[:logo_url]
        )

        authorize workspace, :create?
        workspace.save!

        present workspace, with: V1::Entities::Workspace, current_user: current_user
      end

      # GET /api/v1/workspaces/current
      desc 'Get current workspace'
      get :current do
        require_workspace!
        authorize current_workspace, :show?

        present current_workspace, with: V1::Entities::Workspace, current_user: current_user, include_owner: true
      end

      # POST /api/v1/workspaces/:id/switch
      desc 'Switch to a workspace'
      params do
        requires :id, type: Integer, desc: 'Workspace ID'
      end
      post ':id/switch' do
        find_workspace!
        authorize @workspace, :show?

        current_user.switch_workspace!(@workspace)

        present @workspace, with: V1::Entities::Workspace, current_user: current_user
      end

      # GET /api/v1/workspaces/:id
      desc 'Get workspace details'
      params do
        requires :id, type: Integer, desc: 'Workspace ID'
      end
      get ':id' do
        find_workspace!
        authorize @workspace, :show?

        present @workspace, with: V1::Entities::Workspace, current_user: current_user, include_owner: true
      end

      # PATCH /api/v1/workspaces/:id
      desc 'Update workspace'
      params do
        requires :id, type: Integer, desc: 'Workspace ID'
        optional :name, type: String, desc: 'Workspace name'
        optional :description, type: String, desc: 'Description'
        optional :logo_url, type: String, desc: 'Logo URL'
        optional :settings, type: Hash, desc: 'Settings'
      end
      patch ':id' do
        find_workspace!
        authorize @workspace, :update?

        @workspace.update!(declared(params, include_missing: false).except(:id))

        present @workspace, with: V1::Entities::Workspace, current_user: current_user
      end

      # DELETE /api/v1/workspaces/:id
      desc 'Delete workspace (soft delete)'
      params do
        requires :id, type: Integer, desc: 'Workspace ID'
      end
      delete ':id' do
        find_workspace!
        authorize @workspace, :destroy?

        @workspace.soft_delete!

        { success: true, message: 'Workspace deleted' }
      end

      # ============================================
      # Members Management
      # ============================================

      # GET /api/v1/workspaces/:id/members
      desc 'List workspace members'
      params do
        requires :id, type: Integer, desc: 'Workspace ID'
      end
      get ':id/members' do
        find_workspace!
        authorize @workspace, :show?

        members = @workspace.workspace_memberships.includes(:user).order(role: :desc, created_at: :asc)
        present members, with: V1::Entities::WorkspaceMember
      end

      # PATCH /api/v1/workspaces/:id/members/:member_id
      desc 'Update member role'
      params do
        requires :id, type: Integer, desc: 'Workspace ID'
        requires :member_id, type: Integer, desc: 'Member ID'
        requires :role, type: String, values: WorkspaceMembership::ROLES - ['owner'], desc: 'New role'
      end
      patch ':id/members/:member_id' do
        find_workspace!
        authorize @workspace, :manage_members?
        find_membership!

        # Can't change owner's role
        error!({ error: 'Cannot change owner role' }, 422) if @membership.owner?

        # Can only change to roles lower than your own
        current_membership = @workspace.membership_for(current_user)
        new_role_level = WorkspaceMembership::ROLES.index(params[:role])
        error!({ error: 'Cannot assign role higher than your own' }, 422) if new_role_level >= current_membership.role_level

        @membership.update!(role: params[:role])

        present @membership, with: V1::Entities::WorkspaceMember
      end

      # DELETE /api/v1/workspaces/:id/members/:member_id
      desc 'Remove member from workspace'
      params do
        requires :id, type: Integer, desc: 'Workspace ID'
        requires :member_id, type: Integer, desc: 'Member ID'
      end
      delete ':id/members/:member_id' do
        find_workspace!
        authorize @workspace, :manage_members?
        find_membership!

        # Can't remove owner
        error!({ error: 'Cannot remove workspace owner' }, 422) if @membership.owner?

        @membership.destroy!

        { success: true, message: 'Member removed' }
      end

      # POST /api/v1/workspaces/:id/leave
      desc 'Leave workspace'
      params do
        requires :id, type: Integer, desc: 'Workspace ID'
      end
      post ':id/leave' do
        find_workspace!
        authorize @workspace, :leave?

        membership = @workspace.membership_for(current_user)
        membership.destroy!

        # Switch to personal workspace
        current_user.switch_workspace!(current_user.personal_workspace)

        { success: true, message: 'Left workspace' }
      end

      # ============================================
      # Invitations Management
      # ============================================

      # GET /api/v1/workspaces/:id/invitations
      desc 'List pending invitations'
      params do
        requires :id, type: Integer, desc: 'Workspace ID'
      end
      get ':id/invitations' do
        find_workspace!
        authorize @workspace, :invite?

        invitations = @workspace.workspace_invitations.pending.includes(:invited_by)
        present invitations, with: V1::Entities::WorkspaceInvitationEntity
      end

      # POST /api/v1/workspaces/:id/invitations
      desc 'Invite user to workspace'
      params do
        requires :id, type: Integer, desc: 'Workspace ID'
        optional :email, type: String, desc: 'Email address'
        optional :phone_number, type: String, desc: 'Phone number'
        requires :role, type: String, values: WorkspaceMembership::ROLES - ['owner'], desc: 'Role to assign'
        at_least_one_of :email, :phone_number
      end
      post ':id/invitations' do
        find_workspace!
        authorize @workspace, :invite?

        # Check role level
        current_membership = @workspace.membership_for(current_user)
        new_role_level = WorkspaceMembership::ROLES.index(params[:role])
        error!({ error: 'Cannot invite with role higher than your own' }, 422) if new_role_level >= current_membership.role_level

        invitation = @workspace.workspace_invitations.build(
          invited_by: current_user,
          email: params[:email],
          phone_number: params[:phone_number],
          role: params[:role]
        )

        invitation.save!

        # TODO: Send invitation notification (email/SMS)

        present invitation, with: V1::Entities::WorkspaceInvitationEntity
      end

      # DELETE /api/v1/workspaces/:id/invitations/:invitation_id
      desc 'Revoke invitation'
      params do
        requires :id, type: Integer, desc: 'Workspace ID'
        requires :invitation_id, type: Integer, desc: 'Invitation ID'
      end
      delete ':id/invitations/:invitation_id' do
        find_workspace!
        authorize @workspace, :invite?
        find_invitation!

        @invitation.revoke!

        { success: true, message: 'Invitation revoked' }
      end
    end

    # ============================================
    # Accept Invitation (public endpoint)
    # ============================================

    resource :invitations do
      before { authenticate! }

      # POST /api/v1/invitations/:token/accept
      desc 'Accept workspace invitation'
      params do
        requires :token, type: String, desc: 'Invitation token'
      end
      post ':token/accept' do
        invitation = WorkspaceInvitation.find_valid_by_token(params[:token])
        error!({ error: 'Invalid or expired invitation' }, 404) unless invitation

        if invitation.accept!(current_user)
          present invitation.workspace, with: V1::Entities::Workspace, current_user: current_user
        else
          error!({ error: 'Could not accept invitation' }, 422)
        end
      end

      # GET /api/v1/invitations/:token
      desc 'Get invitation details'
      params do
        requires :token, type: String, desc: 'Invitation token'
      end
      get ':token' do
        invitation = WorkspaceInvitation.find_valid_by_token(params[:token])
        error!({ error: 'Invalid or expired invitation' }, 404) unless invitation

        {
          workspace_name: invitation.workspace.name,
          workspace_type: invitation.workspace.workspace_type,
          role: invitation.role,
          invited_by: invitation.invited_by.name,
          expires_at: invitation.expires_at
        }
      end
    end
  end
end
