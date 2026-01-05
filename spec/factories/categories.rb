# frozen_string_literal: true

FactoryBot.define do
  factory :category do
    sequence(:name) { |n| "Category #{n}" }
    sequence(:slug) { |n| "category-#{n}" }
    description { "Test category description" }
    icon { "help-circle" }
    color { "#94a3b8" }
    is_system { false }

    trait :food do
      name { "Food & Dining" }
      slug { "food" }
      icon { "utensils" }
      color { "#f97316" }
      description { "Food & Dining" }
      is_system { true }
    end

    trait :transport do
      name { "Transport" }
      slug { "transport" }
      icon { "car" }
      color { "#3b82f6" }
      description { "Transportation & Travel" }
      is_system { true }
    end

    trait :shopping do
      name { "Shopping" }
      slug { "shopping" }
      icon { "shopping-bag" }
      color { "#ec4899" }
      description { "Shopping & Retail" }
      is_system { true }
    end

    trait :utilities do
      name { "Utilities" }
      slug { "utilities" }
      icon { "smartphone" }
      color { "#10b981" }
      description { "Bills & Utilities" }
      is_system { true }
    end

    trait :salary do
      name { "Salary" }
      slug { "salary" }
      icon { "wallet" }
      color { "#22c55e" }
      description { "Salary & Income" }
      is_system { true }
    end

    trait :other do
      name { "Other" }
      slug { "other" }
      icon { "help-circle" }
      color { "#94a3b8" }
      description { "Uncategorized" }
      is_system { true }
    end
  end
end
