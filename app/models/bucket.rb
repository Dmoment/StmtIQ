class Bucket < ApplicationRecord
  belongs_to :workspace
  belongs_to :created_by, class_name: "User"

  has_many :bucket_items, dependent: :destroy
  has_many :documents, through: :bucket_items
  has_many :bucket_shares, class_name: "BucketShare", dependent: :destroy

  BUCKET_TYPES = %w[monthly quarterly annual custom].freeze
  STATUSES = %w[draft finalized shared].freeze

  validates :name, presence: true
  validates :bucket_type, inclusion: { in: BUCKET_TYPES }
  validates :status, inclusion: { in: STATUSES }
  validates :month, numericality: { in: 1..12 }, allow_nil: true
  validates :year, numericality: { greater_than: 2000 }, allow_nil: true

  scope :monthly, -> { where(bucket_type: "monthly") }
  scope :for_month, ->(month, year) { monthly.where(month: month, year: year) }
  scope :for_financial_year, ->(fy) { where(financial_year: fy) }
  scope :draft, -> { where(status: "draft") }
  scope :finalized, -> { where(status: "finalized") }
  scope :shared, -> { where(status: "shared") }
  scope :recent, -> { order(year: :desc, month: :desc) }

  before_validation :set_name_from_period, if: -> { name.blank? && monthly? }
  before_validation :set_financial_year, if: -> { financial_year.blank? && month.present? && year.present? }

  def monthly?
    bucket_type == "monthly"
  end

  def finalize!
    return false unless draft?
    update!(status: "finalized", finalized_at: Time.current)
  end

  def draft?
    status == "draft"
  end

  def finalized?
    status == "finalized"
  end

  def shared?
    status == "shared"
  end

  def add_document(document, notes: nil)
    bucket_items.find_or_create_by!(document: document) do |item|
      item.notes = notes
      item.position = bucket_items.maximum(:position).to_i + 1
    end
  end

  def remove_document(document)
    bucket_items.find_by(document: document)&.destroy
  end

  def document_count
    bucket_items.count
  end

  def period_label
    return name unless monthly? && month && year
    Date.new(year, month, 1).strftime("%B %Y")
  end

  private

  def set_name_from_period
    return unless month && year
    self.name = Date.new(year, month, 1).strftime("%B %Y Documents")
  end

  def set_financial_year
    return unless month && year
    fy_year = month >= 4 ? year : year - 1
    self.financial_year = "#{fy_year}-#{(fy_year + 1).to_s[-2..]}"
  end
end
