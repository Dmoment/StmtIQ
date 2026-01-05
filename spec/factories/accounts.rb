# frozen_string_literal: true

FactoryBot.define do
  factory :account do
    association :user
    name { "Savings Account" }
    bank_name { "HDFC Bank" }
    account_number_last4 { "1234" }
    account_type { "savings" }
    currency { "INR" }
    is_active { true }

    trait :credit_card do
      name { "Credit Card" }
      account_type { "credit_card" }
    end

    trait :inactive do
      is_active { false }
    end
  end
end
