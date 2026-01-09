# frozen_string_literal: true

class InvoicePolicy < ApplicationPolicy
  def index?
    can?(:view_invoices)
  end

  def show?
    record_in_workspace? && can?(:view_invoices)
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

  def match?
    record_in_workspace? && can?(:edit_transactions)
  end

  def unlink?
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
