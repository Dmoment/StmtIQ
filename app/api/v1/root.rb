# frozen_string_literal: true

module V1
  class Root < Grape::API
    version 'v1', using: :path
    format :json

    # Mount API endpoints
    mount V1::Health
    mount V1::Users
    mount V1::Categories
    mount V1::Accounts
    mount V1::Statements
    mount V1::Transactions

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
