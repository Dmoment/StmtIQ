# frozen_string_literal: true

# This file should contain all the record creation needed to seed the database with its default values.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).

puts "Seeding database..."

# Create system categories
puts "Creating system categories..."
Category.seed_system_categories!
puts "Created #{Category.count} categories"

# Create a demo user for development
if Rails.env.development?
  puts "Creating demo user..."
  demo_user = User.find_or_create_by!(auth0_id: 'dev_demo_user') do |user|
    user.email = 'demo@stmtiq.local'
    user.name = 'Demo User'
  end

  # Create sample accounts
  puts "Creating sample accounts..."
  hdfc_account = demo_user.accounts.find_or_create_by!(name: 'HDFC Savings') do |account|
    account.bank_name = 'HDFC Bank'
    account.account_number_last4 = '1234'
    account.account_type = 'savings'
    account.currency = 'INR'
  end

  icici_account = demo_user.accounts.find_or_create_by!(name: 'ICICI Salary') do |account|
    account.bank_name = 'ICICI Bank'
    account.account_number_last4 = '5678'
    account.account_type = 'savings'
    account.currency = 'INR'
  end

  puts "Created #{Account.count} accounts"

  # Create sample transactions for demo
  if demo_user.transactions.empty?
    puts "Creating sample transactions..."

    sample_transactions = [
      { description: 'ZOMATO ORDER #12345', amount: 450, type: 'debit', category: 'food' },
      { description: 'UBER TRIP BLR-HSR', amount: 180, type: 'debit', category: 'transport' },
      { description: 'SALARY CREDIT ACME CORP', amount: 75000, type: 'credit', category: 'salary' },
      { description: 'AMAZON SHOPPING', amount: 2499, type: 'debit', category: 'shopping' },
      { description: 'NETFLIX SUBSCRIPTION', amount: 649, type: 'debit', category: 'utilities' },
      { description: 'APOLLO PHARMACY', amount: 350, type: 'debit', category: 'health' },
      { description: 'SOCIETY MAINTENANCE', amount: 5000, type: 'debit', category: 'housing' },
      { description: 'IRCTC TICKET BOOKING', amount: 1200, type: 'debit', category: 'transport' },
      { description: 'SIP HDFC MF', amount: 10000, type: 'debit', category: 'investment' },
      { description: 'AIRTEL RECHARGE', amount: 599, type: 'debit', category: 'utilities' },
      { description: 'SWIGGY INSTAMART', amount: 890, type: 'debit', category: 'shopping' },
      { description: 'EMI HDFC PERSONAL LOAN', amount: 8500, type: 'debit', category: 'emi' },
      { description: 'BOOKMYSHOW PVR', amount: 650, type: 'debit', category: 'entertainment' },
      { description: 'STARBUCKS COFFEE', amount: 420, type: 'debit', category: 'food' },
      { description: 'NEFT TO SAVINGS', amount: 15000, type: 'debit', category: 'transfer' },
    ]

    sample_transactions.each_with_index do |tx, index|
      category = Category.find_by(slug: tx[:category])

      Transaction.create!(
        user: demo_user,
        account: hdfc_account,
        transaction_date: Date.today - rand(1..30).days,
        description: tx[:description],
        original_description: tx[:description],
        amount: tx[:amount],
        transaction_type: tx[:type],
        category: category,
        ai_category: category,
        confidence: rand(0.7..0.95).round(2),
        ai_explanation: "Matched keywords for #{tx[:category]}",
        is_reviewed: [true, false].sample,
        balance: 50000 - (index * 1000)
      )
    end

    puts "Created #{Transaction.count} sample transactions"
  end
end

puts "Seeding complete!"
