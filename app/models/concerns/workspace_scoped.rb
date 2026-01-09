# frozen_string_literal: true

module WorkspaceScoped
  extend ActiveSupport::Concern

  included do
    belongs_to :workspace, optional: true # Optional during migration period

    # Thread-local storage for current workspace context
    # This allows automatic scoping without passing workspace everywhere
    class_attribute :current_workspace, instance_writer: false

    # Default scope to current workspace when set
    # Note: We use a lambda to evaluate at query time
    default_scope do
      if current_workspace.present?
        where(workspace_id: current_workspace.id)
      else
        all
      end
    end

    # Scope to filter by specific workspace
    scope :in_workspace, ->(workspace) {
      unscoped.where(workspace_id: workspace.is_a?(Workspace) ? workspace.id : workspace)
    }

    # Scope to get records without workspace (legacy data)
    scope :without_workspace, -> { unscoped.where(workspace_id: nil) }

    # Validation to ensure workspace is set (after migration)
    # Uncomment after data migration is complete:
    # validates :workspace_id, presence: true

    # Callback to auto-assign workspace from current context
    before_validation :assign_workspace_from_context, on: :create
  end

  class_methods do
    # Set the current workspace context for queries
    # Usage: Model.with_workspace(workspace) { ... }
    def with_workspace(workspace)
      old_workspace = current_workspace
      self.current_workspace = workspace
      yield
    ensure
      self.current_workspace = old_workspace
    end

    # Clear workspace context
    def without_workspace_scope
      old_workspace = current_workspace
      self.current_workspace = nil
      yield
    ensure
      self.current_workspace = old_workspace
    end

    # Query in a specific workspace without affecting default scope
    def for_workspace(workspace)
      in_workspace(workspace)
    end
  end

  private

  def assign_workspace_from_context
    return if workspace_id.present?
    return unless self.class.current_workspace.present?

    self.workspace = self.class.current_workspace
  end
end
