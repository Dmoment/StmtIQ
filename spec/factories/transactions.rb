# frozen_string_literal: true

FactoryBot.define do
  factory :transaction do
    # Use account as the primary association
    association :account
    user { account.user }

    # Statement is optional (can be nil for manually added transactions)
    statement { nil }

    transaction_date { Date.today }
    description { "Test Transaction" }
    original_description { "Test Transaction" }
    amount { 1000.0 }
    transaction_type { "debit" }
    balance { 5000.0 }
    reference { "REF123" }
    is_reviewed { false }
    confidence { nil }
    categorization_status { "pending" }
    metadata { {} }

    trait :with_statement do
      association :statement
      user { statement.user }
    end

    trait :credit do
      transaction_type { "credit" }
      amount { 5000.0 }
    end

    trait :categorized do
      association :ai_category, factory: :category
      confidence { 0.85 }
      categorization_status { "completed" }
    end

    trait :with_embedding do
      embedding_generated_at { 1.day.ago }
    end

    trait :needs_embedding do
      embedding_generated_at { nil }
    end

    trait :food do
      description { "Zomato order #12345" }
    end

    trait :transport do
      description { "Uber trip to airport" }
    end

    trait :shopping do
      description { "Amazon.in order" }
    end
  end
end
