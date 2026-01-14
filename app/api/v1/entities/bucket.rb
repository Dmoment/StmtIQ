# frozen_string_literal: true

module V1
  module Entities
    class Bucket < Grape::Entity
      expose :id
      expose :name
      expose :description
      expose :bucket_type
      expose :month
      expose :year
      expose :financial_year
      expose :status
      expose :finalized_at
      expose :shared_at

      expose :period_label
      expose :document_count
      expose :monthly?, as: :is_monthly
      expose :draft?, as: :is_draft
      expose :finalized?, as: :is_finalized
      expose :shared?, as: :is_shared

      expose :documents, using: V1::Entities::Document, if: ->(_, options) { options[:include_documents] }

      expose :created_at
      expose :updated_at
    end
  end
end
