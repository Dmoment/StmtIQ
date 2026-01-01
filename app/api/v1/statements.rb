# frozen_string_literal: true

module V1
  class Statements < Grape::API
    resource :statements do
      desc 'List all statements with filtering and pagination'
      params do
        optional :page, type: Integer, default: 1
        optional :per_page, type: Integer, default: 20
        optional :q, type: Hash, desc: 'Ransack query params'
      end
      get do
        authenticate!

        statements = current_user.statements.recent

        if params[:q].present?
          statements = statements.ransack(params[:q]).result(distinct: true)
        end

        paginate_collection(statements) do |statement|
          V1::Entities::Statement.represent(statement)
        end
      end

      desc 'Get a single statement'
      params do
        requires :id, type: Integer
      end
      get ':id' do
        authenticate!

        statement = current_user.statements.find(params[:id])
        present statement, with: V1::Entities::Statement, full: true
      end

      desc 'Upload a new statement'
      params do
        requires :file, type: File, desc: 'Bank statement file'
        requires :template_id, type: Integer, desc: 'Bank template ID'
        optional :account_id, type: Integer, desc: 'Associated account'
      end
      post do
        authenticate!

        uploaded_file = params[:file]
        template = BankTemplate.find(params[:template_id])

        file_name = uploaded_file[:filename]
        file_type = File.extname(file_name).delete('.').downcase

        unless file_type == template.file_format
          error!({ error: "File format mismatch. Expected #{template.file_format.upcase}" }, 422)
        end

        statement = current_user.statements.create!(
          file_name: file_name,
          file_type: file_type,
          account_id: params[:account_id],
          bank_template_id: template.id,
          status: 'pending'
        )

        statement.file.attach(
          io: uploaded_file[:tempfile],
          filename: file_name,
          content_type: uploaded_file[:type]
        )

        StatementParserJob.perform_later(statement.id)

        present statement, with: V1::Entities::Statement
      end

      desc 'Delete a statement'
      params do
        requires :id, type: Integer
      end
      delete ':id' do
        authenticate!

        statement = current_user.statements.find(params[:id])
        statement.destroy!

        { success: true }
      end

      desc 'Re-parse a failed statement'
      params do
        requires :id, type: Integer
        optional :template_id, type: Integer
      end
      post ':id/reparse' do
        authenticate!

        statement = current_user.statements.find(params[:id])

        if params[:template_id]
          template = BankTemplate.find(params[:template_id])
          statement.bank_template_id = template.id
        end

        statement.transactions.destroy_all
        statement.update!(status: 'pending', error_message: nil)

        StatementParserJob.perform_later(statement.id)

        present statement, with: V1::Entities::Statement
      end

      desc 'Get statement summary'
      params do
        requires :id, type: Integer
      end
      get ':id/summary' do
        authenticate!

        statement = current_user.statements.includes(:bank_template, :transactions).find(params[:id])
        present statement, with: V1::Entities::StatementSummary
      end

      desc 'Get parsing progress'
      params do
        requires :id, type: Integer
      end
      get ':id/progress' do
        authenticate!

        statement = current_user.statements.find(params[:id])
        progress = statement.parsing_progress

        {
          id: statement.id,
          status: statement.status,
          parsing_status: progress['status'],
          total: progress['total'],
          processed: progress['processed'],
          percentage: progress['percentage'],
          transaction_count: statement.transactions.count,
          updated_at: progress['updated_at']
        }
      end
    end
  end
end
