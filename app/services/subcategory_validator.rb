# frozen_string_literal: true

# Validates that a subcategory belongs to the specified category
# Follows Single Responsibility Principle - only validates subcategory relationships
class SubcategoryValidator
  def initialize(category_id:, subcategory_id:)
    @category_id = category_id
    @subcategory_id = subcategory_id
  end

  def valid?
    return true if @subcategory_id.nil?
    return false if @category_id.nil?

    subcategory = Subcategory.find_by(id: @subcategory_id)
    return false unless subcategory

    subcategory.category_id == @category_id
  end

  def error_message
    'Subcategory does not belong to the selected category'
  end

  # Class method for convenience
  def self.validate!(category_id:, subcategory_id:)
    validator = new(category_id: category_id, subcategory_id: subcategory_id)
    return true if validator.valid?

    raise ValidationError, validator.error_message
  end

  class ValidationError < StandardError; end
end
