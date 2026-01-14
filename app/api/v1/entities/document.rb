# frozen_string_literal: true

module V1
  module Entities
    class Document < Grape::Entity
      expose :id
      expose :name
      expose :document_type
      expose :description
      expose :document_date
      expose :financial_year
      expose :tags
      expose :amount
      expose :currency
      expose :reference_number
      expose :source
      expose :metadata

      expose :folder_id
      expose :folder_name do |doc|
        doc.folder&.name
      end

      expose :file_url
      expose :file_size
      expose :file_type
      expose :pdf?, as: :is_pdf
      expose :image?, as: :is_image

      expose :file_name do |doc|
        doc.file.attached? ? doc.file.blob.filename.to_s : nil
      end

      expose :folder, using: V1::Entities::Folder, if: ->(_, options) { options[:include_folder] }

      expose :created_at
      expose :updated_at
    end
  end
end
