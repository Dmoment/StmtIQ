class BucketItem < ApplicationRecord
  belongs_to :bucket
  belongs_to :document

  validates :document_id, uniqueness: { scope: :bucket_id, message: "is already in this bucket" }

  scope :ordered, -> { order(:position) }

  def move_to(new_position)
    update!(position: new_position)
  end
end
