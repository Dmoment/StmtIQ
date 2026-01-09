# frozen_string_literal: true

class ApplicationPolicy
  attr_reader :user, :record

  def initialize(user, record)
    @user = user
    @record = record
  end

  # Default: deny all
  def index?
    false
  end

  def show?
    false
  end

  def create?
    false
  end

  def new?
    create?
  end

  def update?
    false
  end

  def edit?
    update?
  end

  def destroy?
    false
  end

  # Scope class for collections
  class Scope
    attr_reader :user, :scope

    def initialize(user, scope)
      @user = user
      @scope = scope
    end

    def resolve
      raise NotImplementedError, "You must define #resolve in #{self.class}"
    end

    private

    def current_workspace
      user&.current_workspace
    end
  end

  private

  # Helper to get current workspace context
  def current_workspace
    user&.current_workspace
  end

  # Helper to get user's membership in current workspace
  def workspace_membership
    return nil unless current_workspace

    @workspace_membership ||= user.membership_in(current_workspace)
  end

  # Check if user has a specific permission in current workspace
  def can?(permission)
    workspace_membership&.can?(permission) || false
  end

  # Check if user is owner of current workspace
  def workspace_owner?
    workspace_membership&.owner?
  end

  # Check if user is admin of current workspace
  def workspace_admin?
    workspace_membership&.admin?
  end

  # Check if record belongs to current workspace
  def record_in_workspace?
    return false unless current_workspace
    return false unless record.respond_to?(:workspace_id)

    record.workspace_id == current_workspace.id
  end
end
