# frozen_string_literal: true

module V1
  module Entities
    class Subcategory < Grape::Entity
      expose :id
      expose :name
      expose :slug
      expose :description
      expose :icon
      expose :display_order
      expose :is_default
      expose :category_id
    end
  end
end
