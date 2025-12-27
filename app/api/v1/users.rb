# frozen_string_literal: true

module V1
  class Users < Grape::API
    resource :users do
      desc 'Get current user profile'
      get :me do
        require_authentication!
        present current_user, with: V1::Entities::User
      end

      desc 'Update current user profile'
      params do
        optional :name, type: String, desc: 'User name'
        optional :settings, type: Hash, desc: 'User settings'
      end
      patch :me do
        require_authentication!

        current_user.update!(declared(params, include_missing: false))
        present current_user, with: V1::Entities::User
      end
    end
  end
end
