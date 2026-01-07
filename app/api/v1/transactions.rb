# frozen_string_literal: true

module V1
  class Transactions < Grape::API
    resource :transactions do
      desc 'List all transactions with filtering and pagination'
      params do
        optional :page, type: Integer, default: 1
        # Security: Limit max per_page to prevent DoS attacks
        optional :per_page, type: Integer, default: 50, values: 1..100
        optional :q, type: Hash, desc: 'Ransack query params'
      end
      get do
        authenticate!

        transactions = current_user.transactions.includes(:category, :ai_category, :subcategory, :account, :attached_invoice).recent

        # Security: Validate ransack params against whitelisted attributes only
        if params[:q].present?
          transactions = transactions.ransack(params[:q]).result(distinct: true)
        end

        paginate_collection(transactions) do |transaction|
          V1::Entities::Transaction.represent(transaction)
        end
      end

      desc 'Get a single transaction'
      params do
        requires :id, type: Integer
      end
      get ':id' do
        authenticate!

        transaction = current_user.transactions.find(params[:id])
        present transaction, with: V1::Entities::Transaction, full: true
      end

      desc 'Update a transaction'
      params do
        requires :id, type: Integer
        optional :category_id, type: Integer
        optional :subcategory_id, type: Integer
        optional :description, type: String
        optional :is_reviewed, type: Boolean
      end
      patch ':id' do
        authenticate!

        transaction = current_user.transactions.find(params[:id])
        update_params = declared(params, include_missing: false).except(:id)

        # Validate subcategory belongs to category if subcategory is provided
        if update_params[:subcategory_id].present?
          category_id = update_params[:category_id] || transaction.category_id

          begin
            SubcategoryValidator.validate!(
              category_id: category_id,
              subcategory_id: update_params[:subcategory_id]
            )
          rescue SubcategoryValidator::ValidationError => e
            error!({ error: e.message }, 422)
          end
        end

        transaction.update!(update_params)
        transaction.reload

        present transaction, with: V1::Entities::Transaction
      end

      desc 'Bulk update transactions'
      params do
        requires :transaction_ids, type: Array[Integer]
        optional :category_id, type: Integer
        optional :subcategory_id, type: Integer
        optional :is_reviewed, type: Boolean
      end
      patch :bulk do
        authenticate!

        transactions = current_user.transactions.where(id: params[:transaction_ids])
        update_params = declared(params, include_missing: false).except(:transaction_ids)

        transactions.update_all(update_params)

        { updated_count: transactions.count }
      end

      desc 'Get transaction statistics'
      params do
        optional :q, type: Hash, desc: 'Ransack query params', documentation: { in: 'query', type: 'object' }
        optional :detailed, type: Boolean, default: false, desc: 'Include detailed analytics', documentation: { in: 'query', type: 'boolean' }
        optional :statement_id, type: Integer, desc: 'Get analytics for specific statement', documentation: { in: 'query', type: 'integer', format: 'int32' }
      end
      get :stats do
        authenticate!

        transactions = current_user.transactions

        if params[:q].present?
          transactions = transactions.ransack(params[:q]).result(distinct: true)
        end

        # Use service to compute stats (follows SOLID principles)
        TransactionStatsService.new(
          transactions,
          detailed: params[:detailed],
          statement_id: params[:statement_id],
          user: current_user
        ).call
      end

      desc 'Get categorization progress'
      get 'categorization/progress' do
        authenticate!

        total = current_user.transactions.count
        pending = current_user.transactions.where(categorization_status: 'pending').count
        processing = current_user.transactions.where(categorization_status: 'processing').count
        completed = current_user.transactions.where(categorization_status: 'completed').count

        categorized = current_user.transactions.where.not(ai_category_id: nil).count

        {
          total: total,
          pending: pending,
          processing: processing,
          completed: completed,
          categorized: categorized,
          in_progress: processing > 0,
          progress_percent: total > 0 ? ((completed.to_f / total) * 100).round(1) : 100
        }
      end

      desc 'Categorize uncategorized transactions with ML'
      params do
        optional :limit, type: Integer, default: 100, desc: 'Maximum number of transactions to categorize'
      end
      post :categorize do
        authenticate!

        # Find transactions that need categorization
        transactions = current_user.transactions.needs_categorization.limit(params[:limit])

        if transactions.empty?
          return { message: 'No transactions need categorization', queued: 0 }
        end

        # Mark all as pending before enqueueing
        transaction_ids = transactions.pluck(:id)
        Transaction.where(id: transaction_ids).update_all(categorization_status: 'pending')

        # Enqueue ML categorization jobs in batches
        ::ML::CategorizeBatchJob.perform_later(transaction_ids, user_id: current_user.id)

        {
          queued: transaction_ids.count,
          message: 'ML categorization started',
          poll_url: '/api/v1/transactions/categorization/progress'
        }
      end

      desc 'Provide feedback on a transaction category (teaches the system)'
      params do
        requires :id, type: Integer, desc: 'Transaction ID'
        requires :category_id, type: Integer, desc: 'Correct category ID'
        optional :subcategory_id, type: Integer, desc: 'Optional subcategory ID'
        optional :apply_to_similar, type: Boolean, default: false, desc: 'Apply to similar uncategorized transactions'
      end
      post ':id/feedback' do
        authenticate!

        transaction = current_user.transactions.find(params[:id])
        category = Category.find(params[:category_id])
        subcategory = nil

        # Validate and load subcategory if provided
        if params[:subcategory_id].present?
          begin
            SubcategoryValidator.validate!(
              category_id: category.id,
              subcategory_id: params[:subcategory_id]
            )
            subcategory = Subcategory.find(params[:subcategory_id])
          rescue SubcategoryValidator::ValidationError => e
            error!({ error: e.message }, 422)
          end
        end

        feedback_service = ::ML::FeedbackService.new(transaction, user: current_user)
        result = feedback_service.process_correction!(category, subcategory: subcategory)

        unless result[:success]
          error!({ error: result[:message] }, 422)
        end

        response = {
          success: true,
          message: result[:message],
          transaction: V1::Entities::Transaction.represent(transaction.reload)
        }

        # Optionally apply to similar transactions
        if params[:apply_to_similar]
          similar_result = feedback_service.apply_to_similar!(category)
          response[:similar_updated] = similar_result[:updated]
          response[:similar_ids] = similar_result[:ids]
        end

        response
      end

      desc 'Get user rules for transaction categorization'
      get :rules do
        authenticate!

        rules = UserRule.for_user(current_user)
        rules.map do |rule|
          {
            id: rule.id,
            pattern: rule.pattern,
            pattern_type: rule.pattern_type,
            category: { id: rule.category_id, name: rule.category.name, slug: rule.category.slug },
            match_count: rule.match_count,
            is_active: rule.is_active,
            created_at: rule.created_at
          }
        end
      end

      desc 'Delete a user rule'
      params do
        requires :rule_id, type: Integer
      end
      delete 'rules/:rule_id' do
        authenticate!

        rule = UserRule.find_by!(id: params[:rule_id], user: current_user)
        rule.destroy!

        { success: true, message: 'Rule deleted' }
      end
    end
  end
end
