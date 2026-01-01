# frozen_string_literal: true

FactoryBot.define do
  factory :statement do
    association :user
    association :bank_template
    file_name { "test_statement.xlsx" }
    file_type { "xlsx" }
    status { "pending" }
    metadata { {} }

    trait :with_progress do
      metadata do
        {
          'parsing_progress' => {
            'status' => 'processing',
            'processed' => 100,
            'updated_at' => Time.current.iso8601,
            'duration_seconds' => 5.5
          }
        }
      end
    end

    trait :parsed do
      status { "parsed" }
      metadata do
        {
          'parsing_progress' => {
            'status' => 'completed',
            'processed' => 500,
            'updated_at' => Time.current.iso8601,
            'duration_seconds' => 10.2
          }
        }
      end
    end

    trait :failed do
      status { "failed" }
      metadata do
        {
          'parsing_progress' => {
            'status' => 'failed',
            'processed' => 50,
            'updated_at' => Time.current.iso8601
          }
        }
      end
    end
  end
end


