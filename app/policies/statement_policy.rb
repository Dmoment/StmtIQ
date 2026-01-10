# frozen_string_literal: true

class StatementPolicy < ApplicationPolicy
  def index?
    can?(:view_statements)
  end

  def show?
    record_in_workspace? && can?(:view_statements)
  end

  def create?
    can?(:upload_statements)
  end

  def update?
    record_in_workspace? && can?(:upload_statements)
  end

  def destroy?
    record_in_workspace? && can?(:delete_data)
  end

  def parse?
    record_in_workspace? && can?(:upload_statements)
  end

  class Scope < Scope
    def resolve
      return scope.none unless user && current_workspace

      # acts_as_tenant automatically scopes to current tenant
      scope.all
    end
  end
end
