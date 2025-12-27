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
        requires :template_id, type: Integer, desc: 'Bank template ID for parsing'
        optional :account_id, type: Integer, desc: 'Associated bank account'
      end
      post do
        require_authentication!

        uploaded_file = params[:file]

        # Find the bank template
        template = BankTemplate.find(params[:template_id])

        # Determine file type
        file_name = uploaded_file[:filename]
        file_type = File.extname(file_name).delete('.').downcase

        # Validate file type matches template
        unless file_type == template.file_format
          error!({
            error: "File format mismatch. Expected #{template.file_format.upcase} for #{template.display_name}"
          }, 422)
        end

        statement = current_user.statements.create!(
          file_name: file_name,
          file_type: file_type,
          account_id: params[:account_id],
          bank_template_id: template.id,
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
        optional :template_id, type: Integer, desc: 'Use a different template for re-parsing'
      end
      post ':id/reparse' do
        require_authentication!

        statement = current_user.statements.find(params[:id])

        # Update template if provided
        if params[:template_id]
          template = BankTemplate.find(params[:template_id])
          statement.bank_template_id = template.id
        end

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
