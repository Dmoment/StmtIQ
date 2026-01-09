# frozen_string_literal: true

class UserRulePolicy < ApplicationPolicy
  def index?
    can?(:view_transactions)
  end

  def show?
    record_in_workspace? && can?(:view_transactions)
  end

  def create?
    can?(:create_rules)
  end

  def update?
    record_in_workspace? && can?(:create_rules)
  end

  def destroy?
    record_in_workspace? && can?(:create_rules)
  end

  class Scope < Scope
    def resolve
      return scope.none unless user && current_workspace

      scope.in_workspace(current_workspace)
    end
  end
end
