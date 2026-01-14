# frozen_string_literal: true

module V1
  module Entities
    class Folder < Grape::Entity
      expose :id
      expose :name
      expose :description
      expose :color
      expose :icon
      expose :position
      expose :parent_id

      expose :path
      expose :depth
      expose :root?, as: :is_root

      expose :children_count do |folder|
        folder.children.count
      end

      expose :documents_count do |folder|
        folder.documents.count
      end

      expose :children, using: V1::Entities::Folder, if: ->(_, options) { options[:include_children] }

      expose :created_at
      expose :updated_at
    end
  end
end
