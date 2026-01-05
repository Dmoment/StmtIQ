# frozen_string_literal: true

FactoryBot.define do
  factory :user do
    sequence(:phone_number) { |n| "99999#{n.to_s.rjust(5, '0')}" }
    name { "Test User" }
    phone_verified { true }
    session_token { SecureRandom.hex(32) }
    session_expires_at { 1.year.from_now }
  end
end


