# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2026_01_01_200433) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "accounts", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "name"
    t.string "bank_name"
    t.string "account_number_last4"
    t.string "account_type"
    t.string "currency"
    t.boolean "is_active"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_accounts_on_user_id"
  end

  create_table "active_storage_attachments", force: :cascade do |t|
    t.string "name", null: false
    t.string "record_type", null: false
    t.bigint "record_id", null: false
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.string "key", null: false
    t.string "filename", null: false
    t.string "content_type"
    t.text "metadata"
    t.string "service_name", null: false
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.datetime "created_at", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "bank_templates", force: :cascade do |t|
    t.string "bank_name", null: false
    t.string "bank_code", null: false
    t.string "account_type", null: false
    t.string "file_format", null: false
    t.string "logo_url"
    t.text "description"
    t.jsonb "column_mappings", default: {}
    t.jsonb "parser_config", default: {}
    t.boolean "is_active", default: true
    t.integer "display_order", default: 0
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["bank_code", "account_type", "file_format"], name: "idx_bank_templates_unique", unique: true
    t.index ["is_active"], name: "index_bank_templates_on_is_active"
  end

  create_table "categories", force: :cascade do |t|
    t.string "name"
    t.string "slug"
    t.string "icon"
    t.string "color"
    t.integer "parent_id"
    t.boolean "is_system"
    t.text "description"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "statement_analytics", force: :cascade do |t|
    t.bigint "statement_id", null: false
    t.datetime "computed_at"
    t.jsonb "monthly_spend", default: {}
    t.jsonb "category_breakdown", default: {}
    t.jsonb "merchant_breakdown", default: {}
    t.jsonb "recurring_expenses", default: {}
    t.jsonb "silent_drains", default: {}
    t.jsonb "weekend_weekday", default: {}
    t.jsonb "largest_expense", default: {}
    t.jsonb "income_expense_ratio", default: {}
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "status", default: 0, null: false
    t.text "error_message"
    t.datetime "started_at"
    t.index ["computed_at"], name: "index_statement_analytics_on_computed_at"
    t.index ["statement_id"], name: "index_statement_analytics_on_statement_id", unique: true
    t.index ["status"], name: "index_statement_analytics_on_status"
  end

  create_table "statements", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "account_id"
    t.string "file_name"
    t.string "file_type"
    t.string "status"
    t.datetime "parsed_at"
    t.text "error_message"
    t.jsonb "metadata"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "bank_template_id"
    t.index ["account_id"], name: "index_statements_on_account_id"
    t.index ["bank_template_id"], name: "index_statements_on_bank_template_id"
    t.index ["user_id"], name: "index_statements_on_user_id"
  end

  create_table "transactions", force: :cascade do |t|
    t.bigint "statement_id"
    t.bigint "account_id"
    t.bigint "user_id", null: false
    t.bigint "category_id"
    t.date "transaction_date"
    t.text "description"
    t.text "original_description"
    t.decimal "amount"
    t.string "transaction_type"
    t.decimal "balance"
    t.string "reference"
    t.integer "ai_category_id"
    t.decimal "confidence"
    t.text "ai_explanation"
    t.boolean "is_reviewed"
    t.jsonb "metadata"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["account_id"], name: "index_transactions_on_account_id"
    t.index ["category_id"], name: "index_transactions_on_category_id"
    t.index ["statement_id"], name: "index_transactions_on_statement_id"
    t.index ["transaction_type", "category_id"], name: "index_transactions_on_transaction_type_and_category_id"
    t.index ["user_id", "category_id"], name: "index_transactions_on_user_id_and_category_id"
    t.index ["user_id", "transaction_date"], name: "index_transactions_on_user_id_and_transaction_date"
    t.index ["user_id", "transaction_type"], name: "index_transactions_on_user_id_and_transaction_type"
    t.index ["user_id"], name: "index_transactions_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "email"
    t.string "name"
    t.string "avatar_url"
    t.jsonb "settings"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "phone_number"
    t.boolean "phone_verified", default: false
    t.string "otp_code"
    t.datetime "otp_expires_at"
    t.string "session_token"
    t.datetime "session_expires_at"
    t.datetime "last_login_at"
    t.index ["email"], name: "index_users_on_email", unique: true, where: "(email IS NOT NULL)"
    t.index ["phone_number"], name: "index_users_on_phone_number", unique: true
    t.index ["session_token"], name: "index_users_on_session_token", unique: true
  end

  add_foreign_key "accounts", "users"
  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "statement_analytics", "statements"
  add_foreign_key "statements", "accounts"
  add_foreign_key "statements", "bank_templates"
  add_foreign_key "statements", "users"
  add_foreign_key "transactions", "accounts"
  add_foreign_key "transactions", "categories"
  add_foreign_key "transactions", "statements"
  add_foreign_key "transactions", "users"
end
