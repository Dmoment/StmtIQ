# frozen_string_literal: true

module V1
  module Entities
    class User < Grape::Entity
      expose :id
      expose :email
      expose :name
      expose :avatar_url
      expose :settings
      expose :onboarded_at
      expose :created_at
      expose :updated_at
    end
  end
end
