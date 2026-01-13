# frozen_string_literal: true

class BusinessProfilePolicy < ApplicationPolicy
  def show?
    record_in_workspace?
  end

  def create?
    can?(:manage_workspace)
  end

  def update?
    record_in_workspace? && can?(:manage_workspace)
  end

  def destroy?
    record_in_workspace? && workspace_owner?
  end

  class Scope < Scope
    def resolve
      return scope.none unless user && current_workspace

      scope.where(workspace_id: current_workspace.id)
    end
  end

  private

  def record_in_workspace?
    return false unless current_workspace
    return false unless record.respond_to?(:workspace_id)

    record.workspace_id == current_workspace.id
  end
end
