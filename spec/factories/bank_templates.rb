# frozen_string_literal: true

FactoryBot.define do
  factory :bank_template do
    bank_name { "ICICI Bank" }
    bank_code { "icici" }
    account_type { "savings" }
    file_format { "xlsx" }
    description { "ICICI Savings Account statement" }
    is_active { true }
    display_order { 1 }
    column_mappings do
      {
        "date" => "Value Date",
        "transaction_date" => "Transaction Date",
        "narration" => "Transaction Remarks",
        "reference" => "Cheque Number",
        "withdrawal" => "Withdrawal Amount(INR)",
        "deposit" => "Deposit Amount(INR)",
        "balance" => "Balance(INR)"
      }
    end
    parser_config do
      {
        "date_formats" => ["%d/%m/%Y", "%d-%m-%Y"],
        "header_indicators" => ["S No.", "Value Date", "Transaction Remarks"],
        "skip_patterns" => ["opening balance", "closing balance", "transactions list"],
        "parser_class" => "BankParsers::Icici::SavingsParser"
      }
    end

    trait :savings_xlsx do
      account_type { "savings" }
      file_format { "xlsx" }
      parser_config do
        {
          "date_formats" => ["%d/%m/%Y", "%d-%m-%Y"],
          "header_indicators" => ["S No.", "Value Date", "Transaction Remarks"],
          "skip_patterns" => ["opening balance", "closing balance", "transactions list"],
          "parser_class" => "BankParsers::Icici::SavingsParser"
        }
      end
    end

    trait :savings_xls do
      account_type { "savings" }
      file_format { "xls" }
      parser_config do
        {
          "date_formats" => ["%d/%m/%Y", "%d-%m-%Y"],
          "header_indicators" => ["S No.", "Value Date", "Transaction Remarks"],
          "skip_patterns" => ["opening balance", "closing balance", "transactions list"],
          "parser_class" => "BankParsers::Icici::SavingsParser"
        }
      end
    end

    trait :current_xls do
      account_type { "current" }
      file_format { "xls" }
      column_mappings do
        {
          "date" => "Value Date",
          "narration" => "Description",
          "reference" => "Transaction ID",
          "amount" => "Transaction Amount(INR)",
          "balance" => "Available Balance(INR)",
          "cr_dr" => "Cr/Dr"
        }
      end
      parser_config do
        {
          "date_formats" => ["%d/%m/%Y", "%d-%m-%Y"],
          "header_indicators" => ["Transaction ID", "Value Date", "Cr/Dr"],
          "credit_indicators" => ["cr", "credit"],
          "debit_indicators" => ["dr", "debit"],
          "skip_patterns" => ["opening balance", "closing balance"],
          "parser_class" => "BankParsers::Icici::CurrentParser"
        }
      end
    end
  end
end
