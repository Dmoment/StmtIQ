# frozen_string_literal: true

module Helpers
  module WorkspaceHelpers
    extend Grape::API::Helpers

  # Get current workspace from header, params, or user's current workspace
  def current_workspace
    return @current_workspace if defined?(@current_workspace)

    @current_workspace = resolve_workspace
  end

  # Require a workspace to be set
  def require_workspace!
    error!({ error: 'Workspace required', detail: 'Please select a workspace' }, 400) unless current_workspace
  end

  # Set workspace context for models that use WorkspaceScoped concern
  def with_workspace_scope(&block)
    return yield unless current_workspace

    # Set workspace context for all WorkspaceScoped models
    set_workspace_context(current_workspace, &block)
  end

  # Check if user has permission in current workspace
  def workspace_can?(permission)
    return false unless current_user && current_workspace

    current_user.can_in?(current_workspace, permission)
  end

  # Get user's role in current workspace
  def workspace_role
    return nil unless current_user && current_workspace

    current_user.role_in(current_workspace)
  end

  # Get user's membership in current workspace
  def workspace_membership
    return nil unless current_user && current_workspace

    current_user.membership_in(current_workspace)
  end

  # Authorize access to current workspace
  def authorize_workspace!
    error!({ error: 'Not authorized' }, 403) unless workspace_membership&.status == 'active'
  end

  # Switch user's current workspace
  def switch_to_workspace!(workspace)
    return false unless current_user.workspaces.include?(workspace)

    current_user.switch_workspace!(workspace)
    @current_workspace = workspace
    true
  end

  private

  def resolve_workspace
    workspace_id = workspace_id_from_request
    return nil unless workspace_id

    workspace = find_accessible_workspace(workspace_id)
    return workspace if workspace

    # Fall back to user's current workspace if requested workspace not found
    current_user&.current_workspace
  end

  def workspace_id_from_request
    # Priority: Header > Query param > User's current workspace
    header_value = headers['X-Workspace-Id'] || headers['X_WORKSPACE_ID']
    return header_value.to_i if header_value.present?

    param_value = params[:workspace_id]
    return param_value.to_i if param_value.present?

    current_user&.current_workspace_id
  end

  def find_accessible_workspace(workspace_id)
    return nil unless current_user && workspace_id

    # Only return workspaces the user has active membership in
    current_user.workspaces
                .active
                .joins(:workspace_memberships)
                .where(workspace_memberships: { user_id: current_user.id, status: 'active' })
                .find_by(id: workspace_id)
  end

  def set_workspace_context(workspace)
    # Store the workspace context for WorkspaceScoped models
    workspace_scoped_models.each do |model|
      model.current_workspace = workspace
    end

    yield
  ensure
    # Clear the workspace context after the block
    workspace_scoped_models.each do |model|
      model.current_workspace = nil
    end
  end

  def workspace_scoped_models
    [Account, Statement, Transaction, Invoice, UserRule, LabeledExample, GmailConnection,
     Client, SalesInvoice, RecurringInvoice, Workflow, WorkflowExecution]
  end
  end
end
