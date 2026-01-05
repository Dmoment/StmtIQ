# frozen_string_literal: true

FactoryBot.define do
  factory :labeled_example do
    association :user
    association :category
    description { 'Test transaction description' }
    normalized_description { 'test transaction' }
    source { 'user_feedback' }
    amount { 500.0 }
    transaction_type { 'debit' }
  end
end
