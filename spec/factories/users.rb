# frozen_string_literal: true

FactoryBot.define do
  factory :user do
    phone_number { "9999999999" }
    name { "Test User" }
    phone_verified { true }
    session_token { SecureRandom.hex(32) }
    session_expires_at { 1.year.from_now }
  end
end


