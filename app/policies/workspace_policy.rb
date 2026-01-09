# frozen_string_literal: true

class WorkspacePolicy < ApplicationPolicy
  def index?
    user.present?
  end

  def show?
    member?
  end

  def create?
    user.present?
  end

  def update?
    owner? || admin?
  end

  def destroy?
    owner? && !record.personal?
  end

  def invite?
    owner? || admin?
  end

  def manage_members?
    owner? || admin?
  end

  def leave?
    member? && !owner?
  end

  def transfer_ownership?
    owner?
  end

  class Scope < Scope
    def resolve
      return scope.none unless user

      # Return all workspaces where user is a member
      scope.joins(:workspace_memberships)
           .where(workspace_memberships: { user_id: user.id, status: 'active' })
           .active
           .distinct
    end
  end

  private

  def member?
    return false unless user && record

    record.member?(user)
  end

  def owner?
    return false unless user && record

    record.owner?(user)
  end

  def admin?
    return false unless user && record

    membership = record.membership_for(user)
    membership&.admin?
  end
end
