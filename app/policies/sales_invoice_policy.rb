# frozen_string_literal: true

class SalesInvoicePolicy < ApplicationPolicy
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
    record_in_workspace? && can?(:edit_transactions) && record.can_edit?
  end

  def destroy?
    record_in_workspace? && can?(:delete_data) && record.draft?
  end

  def send_invoice?
    record_in_workspace? && can?(:edit_transactions) && record.can_send?
  end

  def record_payment?
    record_in_workspace? && can?(:edit_transactions) && record.can_record_payment?
  end

  def duplicate?
    record_in_workspace? && can?(:edit_transactions)
  end

  def download?
    record_in_workspace? && can?(:export_data)
  end

  class Scope < Scope
    def resolve
      return scope.none unless user && current_workspace

      scope.all # WorkspaceScoped handles the filtering
    end
  end
end
