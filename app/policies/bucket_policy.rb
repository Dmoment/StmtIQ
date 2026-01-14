# frozen_string_literal: true

class BucketPolicy < ApplicationPolicy
  def index?
    can?(:view_documents)
  end

  def show?
    record_in_workspace? && can?(:view_documents)
  end

  def create?
    can?(:edit_documents)
  end

  def update?
    record_in_workspace? && can?(:edit_documents)
  end

  def destroy?
    record_in_workspace? && can?(:delete_data)
  end

  def share?
    record_in_workspace? && can?(:share_documents)
  end

  class Scope < Scope
    def resolve
      return scope.none unless user && current_workspace

      scope.where(workspace: current_workspace)
    end
  end

  private

  def record_in_workspace?
    record.workspace_id == current_workspace&.id
  end
end
