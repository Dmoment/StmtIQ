# frozen_string_literal: true

module V1
  module Entities
    class InvoiceLineItem < Grape::Entity
      expose :id
      expose :position
      expose :description
      expose :hsn_sac_code
      expose :quantity
      expose :unit
      expose :rate
      expose :amount
      expose :tax_rate

      expose :unit_display
      expose :formatted_quantity
    end
  end
end
