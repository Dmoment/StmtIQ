# frozen_string_literal: true

module V1
  class Statements < Grape::API
    resource :statements do
      desc 'List all statements'
      params do
        optional :page, type: Integer, default: 1
        optional :per_page, type: Integer, default: 20
        optional :status, type: String, values: %w[pending processing parsed failed]
      end
      get do
        require_authentication!

        statements = current_user.statements.recent
        statements = statements.where(status: params[:status]) if params[:status]
        statements = statements.page(params[:page]).per(params[:per_page])

        present statements, with: V1::Entities::Statement
      end

      desc 'Get a single statement'
      params do
        requires :id, type: Integer
      end
      get ':id' do
        require_authentication!

        statement = current_user.statements.find(params[:id])
        present statement, with: V1::Entities::Statement, full: true
      end

      desc 'Upload a new statement'
      params do
        requires :file, type: File, desc: 'Bank statement file (CSV, Excel, or PDF)'
        optional :account_id, type: Integer, desc: 'Associated bank account'
      end
      post do
        require_authentication!

        uploaded_file = params[:file]

        # Determine file type
        file_name = uploaded_file[:filename]
        file_type = File.extname(file_name).delete('.').downcase

        unless StatementParser::SUPPORTED_FORMATS.include?(file_type)
          error!({ error: "Unsupported file format. Supported: #{StatementParser::SUPPORTED_FORMATS.join(', ')}" }, 422)
        end

        statement = current_user.statements.create!(
          file_name: file_name,
          file_type: file_type,
          account_id: params[:account_id],
          status: 'pending'
        )

        # Attach file
        statement.file.attach(
          io: uploaded_file[:tempfile],
          filename: file_name,
          content_type: uploaded_file[:type]
        )

        # Queue parsing job
        StatementParserJob.perform_later(statement.id)

        present statement, with: V1::Entities::Statement
      end

      desc 'Delete a statement'
      params do
        requires :id, type: Integer
      end
      delete ':id' do
        require_authentication!

        statement = current_user.statements.find(params[:id])
        statement.destroy!

        { success: true }
      end

      desc 'Re-parse a failed statement'
      params do
        requires :id, type: Integer
      end
      post ':id/reparse' do
        require_authentication!

        statement = current_user.statements.find(params[:id])

        # Clear existing transactions
        statement.transactions.destroy_all
        statement.update!(status: 'pending', error_message: nil)

        # Queue parsing job
        StatementParserJob.perform_later(statement.id)

        present statement, with: V1::Entities::Statement
      end

      desc 'Get statement summary'
      params do
        requires :id, type: Integer
      end
      get ':id/summary' do
        require_authentication!

        statement = current_user.statements.find(params[:id])

        {
          id: statement.id,
          status: statement.status,
          transaction_count: statement.transaction_count,
          total_debits: statement.total_debits,
          total_credits: statement.total_credits,
          categories: statement.transactions.group(:category_id).count,
          date_range: {
            start: statement.transactions.minimum(:transaction_date),
            end: statement.transactions.maximum(:transaction_date)
          }
        }
      end
    end
  end
end
