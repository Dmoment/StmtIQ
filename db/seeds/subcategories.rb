# frozen_string_literal: true

# Subcategory definitions organized by category
# Each subcategory has keywords for rule-based matching

SUBCATEGORY_DEFINITIONS = {
  # ============================================
  # TRANSFERS (most important to get right)
  # ============================================
  'transfer' => [
    {
      name: 'Self Transfer',
      slug: 'transfer-self',
      description: 'Own account transfers, savings to current, CC payments',
      keywords: %w[self own\ account internal to\ self own\ transfer cc\ payment credit\ card\ payment hdfc\ cc icici\ cc axis\ cc],
      is_default: false,
      display_order: 1
    },
    {
      name: 'P2P Transfer',
      slug: 'transfer-p2p',
      description: 'Person-to-person transfers to friends/family',
      keywords: [], # Detected by TransferClassifier based on patterns
      is_default: true,
      display_order: 2
    },
    {
      name: 'Wallet Load',
      slug: 'transfer-wallet',
      description: 'Paytm, PhonePe, Amazon Pay wallet top-ups',
      keywords: %w[paytm\ wallet paytm\ add phonepe\ wallet amazon\ pay\ load wallet\ load wallet\ topup gpay\ load freecharge mobikwik],
      is_default: false,
      display_order: 3
    }
  ],

  # ============================================
  # FOOD & DINING
  # ============================================
  'food' => [
    {
      name: 'Food Delivery',
      slug: 'food-delivery',
      description: 'Swiggy, Zomato, Uber Eats orders',
      keywords: %w[swiggy zomato uber\ eats dunzo foodpanda box8 faasos freshmenu],
      is_default: false,
      display_order: 1
    },
    {
      name: 'Dining Out',
      slug: 'food-dining',
      description: 'Restaurants, cafes, bars',
      keywords: %w[restaurant cafe coffee starbucks ccd barista pub bar brewery lounge bistro],
      is_default: true,
      display_order: 2
    },
    {
      name: 'Groceries',
      slug: 'food-groceries',
      description: 'BigBasket, Blinkit, Zepto, local grocery',
      keywords: %w[bigbasket blinkit zepto instamart grofers dmart reliance\ fresh more\ supermarket grocery],
      is_default: false,
      display_order: 3
    },
    {
      name: 'Snacks & Street Food',
      slug: 'food-snacks',
      description: 'Bakery, juice shops, small vendors',
      keywords: %w[bakery sweet juice tea chai samosa snack],
      is_default: false,
      display_order: 4
    }
  ],

  # ============================================
  # TRANSPORT & TRAVEL
  # ============================================
  'transport' => [
    {
      name: 'Cab & Ride Hailing',
      slug: 'transport-cab',
      description: 'Uber, Ola, Rapido rides',
      keywords: %w[uber ola rapido meru],
      is_default: true,
      display_order: 1
    },
    {
      name: 'Fuel',
      slug: 'transport-fuel',
      description: 'Petrol, diesel, CNG, EV charging',
      keywords: %w[petrol diesel fuel hp\ petrol indian\ oil bharat\ petroleum cng ev\ charging],
      is_default: false,
      display_order: 2
    },
    {
      name: 'Public Transport',
      slug: 'transport-public',
      description: 'Metro, bus, trains',
      keywords: %w[metro bus irctc railway train local],
      is_default: false,
      display_order: 3
    },
    {
      name: 'Tolls & Parking',
      slug: 'transport-tolls',
      description: 'FASTag, parking, highway tolls',
      keywords: %w[fastag toll parking highway],
      is_default: false,
      display_order: 4
    },
    {
      name: 'Flights',
      slug: 'transport-flights',
      description: 'Air travel bookings',
      keywords: %w[indigo spicejet vistara air\ india goair akasa makemytrip goibibo cleartrip flight airline],
      is_default: false,
      display_order: 5
    },
    {
      name: 'Hotels & Stays',
      slug: 'transport-hotels',
      description: 'OYO, Airbnb, hotel bookings',
      keywords: %w[oyo airbnb hotel booking.com trivago treebo fabhotels zostel],
      is_default: false,
      display_order: 6
    }
  ],

  # ============================================
  # UTILITIES & BILLS
  # ============================================
  'utilities' => [
    {
      name: 'Mobile & Internet',
      slug: 'utilities-mobile',
      description: 'Airtel, Jio, broadband, data packs',
      keywords: %w[airtel jio vodafone vi bsnl idea act\ fibernet broadband wifi internet recharge mobile],
      is_default: true,
      display_order: 1
    },
    {
      name: 'Electricity',
      slug: 'utilities-electricity',
      description: 'Power bills, electricity payments',
      keywords: %w[electricity bescom tata\ power adani\ electricity power\ bill tangedco msedcl],
      is_default: false,
      display_order: 2
    },
    {
      name: 'Gas',
      slug: 'utilities-gas',
      description: 'LPG, piped gas, cylinder booking',
      keywords: %w[lpg indane hp\ gas bharat\ gas cylinder piped\ gas],
      is_default: false,
      display_order: 3
    },
    {
      name: 'Water',
      slug: 'utilities-water',
      description: 'Water bills, tanker payments',
      keywords: %w[water\ bill municipal\ water tanker],
      is_default: false,
      display_order: 4
    },
    {
      name: 'Subscriptions',
      slug: 'utilities-subscriptions',
      description: 'Netflix, Spotify, Amazon Prime, streaming',
      keywords: %w[netflix spotify amazon\ prime hotstar disney youtube\ premium apple\ music zee5 sonyliv subscription],
      is_default: false,
      display_order: 5
    }
  ],

  # ============================================
  # SHOPPING
  # ============================================
  'shopping' => [
    {
      name: 'Online Shopping',
      slug: 'shopping-online',
      description: 'Amazon, Flipkart, Myntra',
      keywords: %w[amazon flipkart myntra ajio nykaa meesho snapdeal tatacliq],
      is_default: true,
      display_order: 1
    },
    {
      name: 'Offline Retail',
      slug: 'shopping-offline',
      description: 'Mall, clothing store, electronics',
      keywords: %w[mall store reliance\ digital croma vijay\ sales shoppers\ stop lifestyle westside pantaloons],
      is_default: false,
      display_order: 2
    },
    {
      name: 'Pharmacy',
      slug: 'shopping-pharmacy',
      description: 'Apollo, MedPlus, online medicines',
      keywords: %w[apollo medplus netmeds pharmeasy 1mg tata\ 1mg chemist pharmacy],
      is_default: false,
      display_order: 3
    }
  ],

  # ============================================
  # HEALTH
  # ============================================
  'health' => [
    {
      name: 'Doctor & Clinic',
      slug: 'health-doctor',
      description: 'Consultations, OPD visits',
      keywords: %w[doctor clinic hospital consultation opd practo],
      is_default: true,
      display_order: 1
    },
    {
      name: 'Medicines',
      slug: 'health-medicines',
      description: 'Pharmacy purchases, prescriptions',
      keywords: %w[medicine pharmacy prescription],
      is_default: false,
      display_order: 2
    },
    {
      name: 'Diagnostics',
      slug: 'health-diagnostics',
      description: 'Lab tests, scans, blood tests',
      keywords: %w[lab diagnostic test pathology scan thyrocare lal\ path dr\ lal metropolis],
      is_default: false,
      display_order: 3
    },
    {
      name: 'Health Insurance',
      slug: 'health-insurance',
      description: 'Health insurance premiums',
      keywords: %w[health\ insurance mediclaim star\ health max\ bupa icici\ lombard],
      is_default: false,
      display_order: 4
    }
  ],

  # ============================================
  # HOUSING
  # ============================================
  'housing' => [
    {
      name: 'Rent',
      slug: 'housing-rent',
      description: 'Monthly rent payments',
      keywords: %w[rent rental lease pg\ rent],
      is_default: true,
      display_order: 1
    },
    {
      name: 'Maintenance',
      slug: 'housing-maintenance',
      description: 'Society maintenance, repairs',
      keywords: %w[maintenance society\ charges association repair plumber electrician],
      is_default: false,
      display_order: 2
    },
    {
      name: 'Furniture & Appliances',
      slug: 'housing-furniture',
      description: 'Rentomojo, Furlenco, home items',
      keywords: %w[rentomojo furlenco pepperfry urban\ ladder ikea furniture appliance],
      is_default: false,
      display_order: 3
    }
  ],

  # ============================================
  # SALARY & INCOME
  # ============================================
  'salary' => [
    {
      name: 'Salary',
      slug: 'salary-monthly',
      description: 'Monthly payroll, employer credits',
      keywords: %w[salary payroll wages cms credited\ by\ employer],
      is_default: true,
      display_order: 1
    },
    {
      name: 'Bonus & Incentives',
      slug: 'salary-bonus',
      description: 'Performance bonus, variable pay',
      keywords: %w[bonus incentive variable\ pay performance],
      is_default: false,
      display_order: 2
    },
    {
      name: 'Investment Income',
      slug: 'salary-investment',
      description: 'Dividends, interest, FD returns',
      keywords: %w[dividend intdiv interest fd\ interest rd\ interest nsdl cdsl],
      is_default: false,
      display_order: 3
    },
    {
      name: 'Refunds',
      slug: 'salary-refund',
      description: 'Merchant refunds, reversals',
      keywords: %w[refund reversal cashback],
      is_default: false,
      display_order: 4
    }
  ],

  # ============================================
  # INVESTMENTS
  # ============================================
  'investment' => [
    {
      name: 'Mutual Funds',
      slug: 'investment-mf',
      description: 'SIP, lumpsum MF investments',
      keywords: %w[mutual\ fund sip mf\ purchase kuvera groww coin zerodha\ mf],
      is_default: true,
      display_order: 1
    },
    {
      name: 'Stocks',
      slug: 'investment-stocks',
      description: 'Stock purchases, trading',
      keywords: %w[zerodha upstox groww\ stocks angel\ broking stock share demat],
      is_default: false,
      display_order: 2
    },
    {
      name: 'Fixed Income',
      slug: 'investment-fixed',
      description: 'FD, RD, bonds',
      keywords: %w[fixed\ deposit fd\ opening rd\ opening bond],
      is_default: false,
      display_order: 3
    },
    {
      name: 'Retirement',
      slug: 'investment-retirement',
      description: 'PPF, NPS, EPF contributions',
      keywords: %w[ppf nps epf pension pf],
      is_default: false,
      display_order: 4
    }
  ],

  # ============================================
  # EMI & LOANS
  # ============================================
  'emi' => [
    {
      name: 'Home Loan EMI',
      slug: 'emi-home',
      description: 'Housing loan payments',
      keywords: %w[home\ loan housing\ loan mortgage],
      is_default: false,
      display_order: 1
    },
    {
      name: 'Personal Loan EMI',
      slug: 'emi-personal',
      description: 'Personal loan repayments',
      keywords: %w[personal\ loan pl\ emi],
      is_default: true,
      display_order: 2
    },
    {
      name: 'Vehicle Loan EMI',
      slug: 'emi-vehicle',
      description: 'Car/bike loan payments',
      keywords: %w[car\ loan vehicle\ loan auto\ loan bike\ loan],
      is_default: false,
      display_order: 3
    },
    {
      name: 'BNPL & Consumer Finance',
      slug: 'emi-bnpl',
      description: 'Bajaj Finserv, PayLater, Amazon Pay Later',
      keywords: %w[bajaj\ finserv paylater amazon\ pay\ later simpl lazypay],
      is_default: false,
      display_order: 4
    }
  ],

  # ============================================
  # TAXES & FEES
  # ============================================
  'tax' => [
    {
      name: 'Income Tax',
      slug: 'tax-income',
      description: 'Advance tax, self-assessment',
      keywords: %w[income\ tax advance\ tax self\ assessment itr challan],
      is_default: true,
      display_order: 1
    },
    {
      name: 'GST',
      slug: 'tax-gst',
      description: 'GST payments, TDS',
      keywords: %w[gst tds tax\ deducted],
      is_default: false,
      display_order: 2
    },
    {
      name: 'Bank Charges',
      slug: 'tax-bank-charges',
      description: 'SMS, ATM, IMPS/NEFT charges',
      keywords: %w[sms\ charge atm\ charge imps\ charge neft\ charge service\ charge bank\ fee],
      is_default: false,
      display_order: 3
    },
    {
      name: 'Card Fees',
      slug: 'tax-card-fees',
      description: 'Annual fees, late payment, interest',
      keywords: %w[annual\ fee late\ payment\ fee interest\ charge card\ fee],
      is_default: false,
      display_order: 4
    }
  ],

  # ============================================
  # ENTERTAINMENT
  # ============================================
  'entertainment' => [
    {
      name: 'Movies & Events',
      slug: 'entertainment-movies',
      description: 'PVR, INOX, BookMyShow',
      keywords: %w[pvr inox cinepolis bookmyshow movie cinema],
      is_default: true,
      display_order: 1
    },
    {
      name: 'Gaming',
      slug: 'entertainment-gaming',
      description: 'PlayStation, Xbox, Steam, mobile games',
      keywords: %w[playstation xbox steam gaming game],
      is_default: false,
      display_order: 2
    },
    {
      name: 'Nightlife',
      slug: 'entertainment-nightlife',
      description: 'Pubs, bars, clubs',
      keywords: %w[pub bar club lounge brewery],
      is_default: false,
      display_order: 3
    }
  ],

  # ============================================
  # BUSINESS (for freelancers/SMBs)
  # ============================================
  'business' => [
    {
      name: 'Client Payments',
      slug: 'business-client',
      description: 'Incoming business income',
      keywords: %w[client\ payment invoice\ payment],
      is_default: false,
      display_order: 1
    },
    {
      name: 'Vendor Payments',
      slug: 'business-vendor',
      description: 'Payments to vendors/suppliers',
      keywords: %w[vendor supplier payment],
      is_default: true,
      display_order: 2
    },
    {
      name: 'Office Expenses',
      slug: 'business-office',
      description: 'Software, hosting, tools',
      keywords: %w[aws azure google\ cloud hosting software subscription],
      is_default: false,
      display_order: 3
    },
    {
      name: 'Business Travel',
      slug: 'business-travel',
      description: 'Work-related travel expenses',
      keywords: %w[business\ travel official\ travel],
      is_default: false,
      display_order: 4
    }
  ],

  # ============================================
  # OTHER (catch-all)
  # ============================================
  'other' => [
    {
      name: 'ATM Withdrawal',
      slug: 'other-atm',
      description: 'Cash withdrawals from ATM',
      keywords: %w[atm\ withdrawal atm\ wdl cash\ withdrawal nfs\ atm],
      is_default: false,
      display_order: 1
    },
    {
      name: 'Cash Deposit',
      slug: 'other-deposit',
      description: 'Cash deposits to account',
      keywords: %w[cash\ deposit cdm],
      is_default: false,
      display_order: 2
    },
    {
      name: 'Uncategorized',
      slug: 'other-uncategorized',
      description: 'Transactions pending categorization',
      keywords: [],
      is_default: true,
      display_order: 99
    }
  ]
}.freeze

# Seed method
def seed_subcategories!
  puts "Seeding subcategories..."

  SUBCATEGORY_DEFINITIONS.each do |category_slug, subcategories|
    category = Category.find_by(slug: category_slug)

    unless category
      puts "  WARNING: Category '#{category_slug}' not found, skipping..."
      next
    end

    puts "  #{category.name}:"

    subcategories.each do |attrs|
      subcategory = Subcategory.find_or_initialize_by(
        category: category,
        slug: attrs[:slug]
      )

      subcategory.assign_attributes(
        name: attrs[:name],
        description: attrs[:description],
        keywords: attrs[:keywords],
        is_default: attrs[:is_default],
        display_order: attrs[:display_order]
      )

      if subcategory.new_record?
        subcategory.save!
        puts "    + #{attrs[:name]}"
      else
        subcategory.save!
        puts "    ~ #{attrs[:name]} (updated)"
      end
    end
  end

  puts "Done! Created #{Subcategory.count} subcategories."
end

# Run if executed directly
seed_subcategories! if __FILE__ == $PROGRAM_NAME
