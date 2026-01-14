class Folder < ApplicationRecord
  belongs_to :workspace
  belongs_to :parent, class_name: "Folder", optional: true

  has_many :children, class_name: "Folder", foreign_key: :parent_id, dependent: :destroy
  has_many :documents, dependent: :destroy

  validates :name, presence: true
  validates :name, uniqueness: { scope: [:workspace_id, :parent_id] }
  validates :color, inclusion: {
    in: %w[slate gray red orange amber yellow lime green emerald teal cyan sky blue indigo violet purple fuchsia pink rose],
    allow_blank: true
  }

  scope :roots, -> { where(parent_id: nil) }
  scope :ordered, -> { order(:position, :name) }

  def ancestors
    result = []
    current = parent
    while current
      result.unshift(current)
      current = current.parent
    end
    result
  end

  def path
    ancestors.map(&:name).push(name).join("/")
  end

  def depth
    ancestors.length
  end

  def root?
    parent_id.nil?
  end
end
