class Document < ApplicationRecord
  belongs_to :workspace
  belongs_to :folder, optional: true

  has_one_attached :file
  has_many :document_shares, dependent: :destroy
  has_many :bucket_items, dependent: :destroy

  DOCUMENT_TYPES = %w[
    invoice
    purchase_invoice
    bank_statement
    firc
    receipt
    expense
    contract
    tax_document
    gst_return
    tds_certificate
    audit_report
    balance_sheet
    profit_loss
    other
  ].freeze

  validates :name, presence: true
  validates :document_type, presence: true, inclusion: { in: DOCUMENT_TYPES }
  validates :file, presence: true

  scope :by_type, ->(type) { where(document_type: type) }
  scope :by_financial_year, ->(year) { where(financial_year: year) }
  scope :by_date_range, ->(start_date, end_date) { where(document_date: start_date..end_date) }
  scope :tagged_with, ->(tag) { where("? = ANY(tags)", tag) }
  scope :recent, -> { order(created_at: :desc) }
  scope :in_folder, ->(folder_id) { where(folder_id: folder_id) }
  scope :root_level, -> { where(folder_id: nil) }

  before_validation :set_name_from_file, if: -> { name.blank? && file.attached? }
  before_validation :set_financial_year, if: -> { financial_year.blank? && document_date.present? }

  def file_url
    return nil unless file.attached?
    Rails.application.routes.url_helpers.rails_blob_url(file, only_path: true)
  end

  def file_size
    return nil unless file.attached?
    file.blob.byte_size
  end

  def file_type
    return nil unless file.attached?
    file.blob.content_type
  end

  def pdf?
    file_type&.include?("pdf")
  end

  def image?
    file_type&.start_with?("image/")
  end

  private

  def set_name_from_file
    self.name = file.blob.filename.base if file.attached?
  end

  def set_financial_year
    # Indian financial year: April to March
    year = document_date.month >= 4 ? document_date.year : document_date.year - 1
    self.financial_year = "#{year}-#{(year + 1).to_s[-2..]}"
  end
end
