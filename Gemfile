source "https://rubygems.org"

# Bundle edge Rails instead: gem "rails", github: "rails/rails", branch: "main"
gem "rails", "~> 8.0.2"
# The modern asset pipeline for Rails [https://github.com/rails/propshaft]
gem "propshaft"
# Use postgresql as the database for Active Record
gem "pg", "~> 1.1"
# Use the Puma web server [https://github.com/puma/puma]
gem "puma", ">= 5.0"
# Bundle and transpile JavaScript [https://github.com/rails/jsbundling-rails]
gem "jsbundling-rails"
# Bundle and process CSS [https://github.com/rails/cssbundling-rails]
gem "cssbundling-rails"

# ============================================
# API & Serialization
# ============================================
gem "grape", "~> 2.0"
gem "grape-swagger", "~> 2.0"
gem "grape-swagger-entity", "~> 0.5"
gem "grape-entity", "~> 1.0"
gem "rack-cors"

# ============================================
# Authorization
# ============================================
gem "pundit", "~> 2.3"

# ============================================
# Authentication (Clerk)
# ============================================
gem "jwt", "~> 2.7"               # Clerk JWT verification

# ============================================
# Background Jobs
# ============================================
gem "sidekiq", "~> 7.0"
gem "sidekiq-cron", "~> 1.12"
gem "redis", "~> 5.0"
gem "fugit", "~> 1.9"                 # Cron parsing for workflow scheduler

# ============================================
# File Processing & Parsing
# ============================================
gem "pdf-reader", "~> 2.11"        # PDF text extraction
gem "prawn", "~> 2.4"              # PDF generation
gem "prawn-table", "~> 0.2"        # Tables for PDF invoices
gem "matrix"                       # Required by prawn in Ruby 3.1+
gem "roo", "~> 2.10"               # Excel/CSV parsing (fallback for XLS)
gem "roo-xls", "~> 1.2"            # .xls support
gem "creek", "~> 2.6"              # TRUE streaming XLSX parser (memory-efficient)

# ============================================
# AI Integration
# ============================================
gem "ruby-openai", "~> 7.0"        # OpenAI API client

# ============================================
# Google API / Gmail Integration
# ============================================
gem "google-apis-gmail_v1", "~> 0.30"  # Gmail API
gem "googleauth", "~> 1.8"             # Google OAuth2

# ============================================
# Storage & File Uploads
# ============================================
gem "aws-sdk-s3", require: false   # S3 storage

# ============================================
# Search & Pagination
# ============================================
gem "ransack", "~> 4.0"
gem "kaminari", "~> 1.2"

# ============================================
# Utilities
# ============================================
gem "hashie"                       # Hash utilities for API
gem "oj"                           # Fast JSON parsing
gem "csv"                          # CSV parsing (required in Ruby 3.4+)
gem "http"                         # HTTP client for exchange rates

# Windows does not include zoneinfo files, so bundle the tzinfo-data gem
gem "tzinfo-data", platforms: %i[ windows jruby ]

# Use the database-backed adapters for Rails.cache, Active Job, and Action Cable
gem "solid_cache"
gem "solid_queue"
gem "solid_cable"

# Reduces boot times through caching; required in config/boot.rb
gem "bootsnap", require: false

# Deploy this application anywhere as a Docker container [https://kamal-deploy.org]
gem "kamal", require: false

# Add HTTP asset caching/compression and X-Sendfile acceleration to Puma [https://github.com/basecamp/thruster/]
gem "thruster", require: false

group :development, :test do
  # See https://guides.rubyonrails.org/debugging_rails_applications.html#debugging-with-the-debug-gem
  gem "debug", platforms: %i[ mri windows ], require: "debug/prelude"

  # Static analysis for security vulnerabilities [https://brakemanscanner.org/]
  gem "brakeman", require: false

  # Omakase Ruby styling [https://github.com/rails/rubocop-rails-omakase/]
  gem "rubocop-rails-omakase", require: false

  # Environment variables
  gem "dotenv-rails"

  # ============================================
  # Testing
  # ============================================
  gem "rspec-rails", "~> 7.0"
  gem "factory_bot_rails", "~> 6.4"
  gem "shoulda-matchers", "~> 7.0"
  gem "faker", "~> 3.4"
end

group :development do
  # Use console on exceptions pages [https://github.com/rails/web-console]
  gem "web-console"

  # Email testing - web UI to view sent emails
  gem "letter_opener_web"
end
