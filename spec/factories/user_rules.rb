# frozen_string_literal: true

FactoryBot.define do
  factory :user_rule do
    association :user
    association :category
    pattern { 'test pattern' }
    pattern_type { 'keyword' }
    match_field { 'description' }
    is_active { true }
    priority { 0 }
    match_count { 0 }
    source { 'manual' }
  end
end
