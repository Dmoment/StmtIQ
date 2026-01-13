# frozen_string_literal: true

class RecurringInvoicePolicy < ApplicationPolicy
  def index?
    can?(:view_invoices)
  end

  def show?
    record_in_workspace? && can?(:view_invoices)
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

  def pause?
    record_in_workspace? && can?(:edit_transactions) && record.active?
  end

  def resume?
    record_in_workspace? && can?(:edit_transactions) && record.paused?
  end

  class Scope < Scope
    def resolve
      return scope.none unless user && current_workspace

      scope.all # WorkspaceScoped handles the filtering
    end
  end
end
