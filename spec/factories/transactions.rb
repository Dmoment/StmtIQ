# frozen_string_literal: true

FactoryBot.define do
  factory :transaction do
    association :statement
    user { statement.user }
    transaction_date { Date.today }
    description { "Test Transaction" }
    original_description { "Test Transaction" }
    amount { 1000.0 }
    transaction_type { "debit" }
    balance { 5000.0 }
    reference { "REF123" }
    is_reviewed { false }
    confidence { 0.85 }
    metadata { {} }
  end
end

