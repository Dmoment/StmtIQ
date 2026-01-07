# frozen_string_literal: true

module V1
  module Entities
    class Category < Grape::Entity
      expose :id
      expose :name
      expose :slug
      expose :icon
      expose :color
      expose :description
      expose :is_system
      expose :parent_id

      expose :subcategories, using: V1::Entities::Subcategory, if: ->(cat, _) {
        cat.subcategories.any?
      }

      expose :children, using: V1::Entities::Category, if: ->(cat, opts) {
        opts[:full] && cat.children.any?
      }
    end
  end
end
