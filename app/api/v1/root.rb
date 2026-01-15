# frozen_string_literal: true

module V1
  class Root < Grape::API
    version 'v1', using: :path
    format :json

    # Mount API endpoints
    mount V1::Auth
    mount V1::Health
    mount V1::Users
    mount V1::Onboarding
    mount V1::Workspaces
    mount V1::BankTemplates
    mount V1::Categories
    mount V1::Accounts
    mount V1::Statements
    mount V1::Transactions
    mount V1::Invoices
    mount V1::Uploads
    mount V1::Gmail

    # Sales Invoice endpoints
    mount V1::BusinessProfiles
    mount V1::Clients
    mount V1::SalesInvoices
    mount V1::RecurringInvoices
    mount V1::ExchangeRates

    # Document Storage endpoints
    mount V1::Folders
    mount V1::Documents
    mount V1::Buckets

    # Workflow Automation endpoints
    mount V1::Workflows

    # Swagger documentation
    add_swagger_documentation(
      api_version: 'v1',
      hide_documentation_path: true,
      mount_path: '/swagger_doc',
      hide_format: true,
      info: {
        title: 'StmtIQ API',
        description: 'Expense Management & Bank Statement Parser API',
        contact_name: 'StmtIQ Team'
      }
    )
  end
end
