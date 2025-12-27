# frozen_string_literal: true

module V1
  class BankTemplates < Grape::API
    namespace :bank_templates do
      desc 'List all available bank templates'
      get do
        templates = BankTemplate.active.ordered

        # Group by bank for easier frontend consumption
        grouped = templates.group_by(&:bank_code).map do |bank_code, bank_templates|
          {
            bank_code: bank_code,
            bank_name: bank_templates.first.bank_name,
            logo_url: bank_templates.first.logo_url,
            templates: bank_templates.map do |t|
              {
                id: t.id,
                account_type: t.account_type,
                file_format: t.file_format,
                description: t.description,
                display_name: "#{t.account_type.titleize} (#{t.file_format.upcase})"
              }
            end
          }
        end

        grouped
      end

      desc 'Get a specific bank template'
      params do
        requires :id, type: Integer, desc: 'Template ID'
      end
      get ':id' do
        template = BankTemplate.find(params[:id])

        {
          id: template.id,
          bank_name: template.bank_name,
          bank_code: template.bank_code,
          account_type: template.account_type,
          file_format: template.file_format,
          description: template.description,
          display_name: template.display_name
        }
      end

      desc 'Get templates for a specific bank'
      params do
        requires :bank_code, type: String, desc: 'Bank code (e.g., hdfc, icici, sbi)'
      end
      get 'bank/:bank_code' do
        templates = BankTemplate.active.by_bank(params[:bank_code]).ordered

        templates.map do |t|
          {
            id: t.id,
            account_type: t.account_type,
            file_format: t.file_format,
            description: t.description,
            display_name: t.display_name
          }
        end
      end
    end
  end
end
