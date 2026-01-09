# frozen_string_literal: true

class AccountPolicy < ApplicationPolicy
  def index?
    can?(:view_accounts)
  end

  def show?
    record_in_workspace? && can?(:view_accounts)
  end

  def create?
    can?(:upload_statements) # Same permission as uploading statements
  end

  def update?
    record_in_workspace? && can?(:edit_transactions)
  end

  def destroy?
    record_in_workspace? && can?(:delete_data)
  end

  class Scope < Scope
    def resolve
      return scope.none unless user && current_workspace

      scope.in_workspace(current_workspace)
    end
  end
end
