# frozen_string_literal: true

class TransactionPolicy < ApplicationPolicy
  def index?
    can?(:view_transactions)
  end

  def show?
    record_in_workspace? && can?(:view_transactions)
  end

  def create?
    can?(:edit_transactions)
  end

  def update?
    record_in_workspace? && can?(:edit_transactions)
  end

  def destroy?
    record_in_workspace? && can?(:delete_data)
  end

  def categorize?
    record_in_workspace? && can?(:edit_transactions)
  end

  def export?
    can?(:export_data)
  end

  class Scope < Scope
    def resolve
      return scope.none unless user && current_workspace

      scope.in_workspace(current_workspace)
    end
  end
end
