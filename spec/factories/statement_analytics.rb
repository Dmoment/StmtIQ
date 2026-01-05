FactoryBot.define do
  factory :statement_analytic do
    statement { nil }
    computed_at { "2026-01-01 18:33:00" }
    monthly_spend { "" }
    category_breakdown { "" }
    merchant_breakdown { "" }
    recurring_expenses { "" }
    silent_drains { "" }
    weekend_weekday { "" }
    largest_expense { "" }
    income_expense_ratio { "" }
  end
end
