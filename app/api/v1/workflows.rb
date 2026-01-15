# frozen_string_literal: true

module V1
  class Workflows < Grape::API
    resource :workflows do
      before { authenticate! }

      # ============================================
      # Workflow CRUD
      # ============================================

      desc 'List all workflows in workspace'
      params do
        optional :page, type: Integer, default: 1
        optional :per_page, type: Integer, default: 25, values: 1..100
        optional :status, type: String, values: %w[draft active paused archived]
        optional :trigger_type, type: String, values: %w[schedule event manual]
      end
      get do
        require_workspace!

        workflows = policy_scope(Workflow)
                    .includes(:workflow_steps)
                    .order(updated_at: :desc)

        workflows = workflows.where(status: params[:status]) if params[:status].present?
        workflows = workflows.where(trigger_type: params[:trigger_type]) if params[:trigger_type].present?

        paginated = workflows.page(params[:page]).per(params[:per_page])

        header 'X-Total-Count', paginated.total_count.to_s
        header 'X-Total-Pages', paginated.total_pages.to_s
        header 'X-Current-Page', paginated.current_page.to_s
        header 'X-Per-Page', paginated.limit_value.to_s

        present paginated, with: V1::Entities::Workflow
      end

      desc 'Create a new workflow'
      params do
        requires :name, type: String
        optional :description, type: String
        requires :trigger_type, type: String, values: %w[schedule event manual]
        optional :trigger_config, type: Hash
        optional :steps, type: Array do
          requires :step_type, type: String
          optional :name, type: String
          requires :position, type: Integer
          optional :config, type: Hash
          optional :conditions, type: Hash
          optional :enabled, type: Boolean, default: true
          optional :continue_on_failure, type: Boolean, default: false
        end
      end
      post do
        require_workspace!
        authorize Workflow, :create?

        workflow = current_workspace.workflows.create!(
          user: current_user,
          name: params[:name],
          description: params[:description],
          trigger_type: params[:trigger_type],
          trigger_config: params[:trigger_config] || {},
          status: 'draft'
        )

        if params[:steps].present?
          params[:steps].each do |step_params|
            workflow.workflow_steps.create!(
              step_type: step_params[:step_type],
              name: step_params[:name],
              position: step_params[:position],
              config: step_params[:config] || {},
              conditions: step_params[:conditions] || {},
              enabled: step_params[:enabled] != false,
              continue_on_failure: step_params[:continue_on_failure] || false
            )
          end
        end

        present workflow, with: V1::Entities::Workflow, full: true
      end

      desc 'Get workflow details'
      params do
        requires :id, type: Integer
      end
      get ':id' do
        require_workspace!

        workflow = policy_scope(Workflow)
                   .includes(workflow_steps: [], workflow_executions: :workflow_step_logs)
                   .find(params[:id])
        authorize workflow, :show?

        present workflow, with: V1::Entities::Workflow, full: true
      end

      desc 'Update a workflow'
      params do
        requires :id, type: Integer
        optional :name, type: String
        optional :description, type: String
        optional :trigger_type, type: String, values: %w[schedule event manual]
        optional :trigger_config, type: Hash
        optional :status, type: String, values: %w[draft active paused archived]
        optional :metadata, type: Hash
      end
      patch ':id' do
        require_workspace!

        workflow = policy_scope(Workflow).find(params[:id])
        authorize workflow, :update?

        workflow.update!(declared(params, include_missing: false).except(:id))

        present workflow, with: V1::Entities::Workflow, full: true
      end

      desc 'Delete a workflow'
      params do
        requires :id, type: Integer
      end
      delete ':id' do
        require_workspace!

        workflow = policy_scope(Workflow).find(params[:id])
        authorize workflow, :destroy?

        workflow.destroy!
        { success: true, message: 'Workflow deleted' }
      end

      # ============================================
      # Workflow Actions
      # ============================================

      desc 'Activate a workflow'
      params do
        requires :id, type: Integer
      end
      post ':id/activate' do
        require_workspace!

        workflow = policy_scope(Workflow).find(params[:id])
        authorize workflow, :update?

        workflow.activate!

        present workflow, with: V1::Entities::Workflow
      end

      desc 'Pause a workflow'
      params do
        requires :id, type: Integer
      end
      post ':id/pause' do
        require_workspace!

        workflow = policy_scope(Workflow).find(params[:id])
        authorize workflow, :update?

        workflow.pause!

        present workflow, with: V1::Entities::Workflow
      end

      desc 'Trigger workflow execution manually'
      params do
        requires :id, type: Integer
        optional :trigger_data, type: Hash, desc: 'Additional data to pass to the workflow'
      end
      post ':id/trigger' do
        require_workspace!

        workflow = policy_scope(Workflow).find(params[:id])
        authorize workflow, :execute?

        execution = ::Workflows::Engine.new(workflow).execute(
          trigger_source: 'manual',
          trigger_data: (params[:trigger_data] || {}).merge(
            triggered_by: current_user.id,
            triggered_at: Time.current.iso8601
          )
        )

        present execution, with: V1::Entities::WorkflowExecution
      end

      # ============================================
      # Workflow Steps Management
      # ============================================

      desc 'Add a step to workflow'
      params do
        requires :id, type: Integer
        requires :step_type, type: String
        optional :name, type: String
        optional :position, type: Integer
        optional :config, type: Hash
        optional :conditions, type: Hash
        optional :enabled, type: Boolean, default: true
        optional :continue_on_failure, type: Boolean, default: false
      end
      post ':id/steps' do
        require_workspace!

        workflow = policy_scope(Workflow).find(params[:id])
        authorize workflow, :update?

        position = params[:position] || (workflow.workflow_steps.maximum(:position) || 0) + 1

        step = workflow.workflow_steps.create!(
          step_type: params[:step_type],
          name: params[:name],
          position: position,
          config: params[:config] || {},
          conditions: params[:conditions] || {},
          enabled: params[:enabled] != false,
          continue_on_failure: params[:continue_on_failure] || false
        )

        present step, with: V1::Entities::WorkflowStep
      end

      desc 'Update a workflow step'
      params do
        requires :id, type: Integer
        requires :step_id, type: Integer
        optional :name, type: String
        optional :position, type: Integer
        optional :config, type: Hash
        optional :conditions, type: Hash
        optional :enabled, type: Boolean
        optional :continue_on_failure, type: Boolean
      end
      patch ':id/steps/:step_id' do
        require_workspace!

        workflow = policy_scope(Workflow).find(params[:id])
        authorize workflow, :update?

        step = workflow.workflow_steps.find(params[:step_id])
        step.update!(declared(params, include_missing: false).except(:id, :step_id))

        present step, with: V1::Entities::WorkflowStep
      end

      desc 'Delete a workflow step'
      params do
        requires :id, type: Integer
        requires :step_id, type: Integer
      end
      delete ':id/steps/:step_id' do
        require_workspace!

        workflow = policy_scope(Workflow).find(params[:id])
        authorize workflow, :update?

        step = workflow.workflow_steps.find(params[:step_id])
        step.destroy!

        { success: true, message: 'Step deleted' }
      end

      desc 'Reorder workflow steps'
      params do
        requires :id, type: Integer
        requires :step_ids, type: Array[Integer], desc: 'Array of step IDs in desired order'
      end
      post ':id/steps/reorder' do
        require_workspace!

        workflow = policy_scope(Workflow).find(params[:id])
        authorize workflow, :update?

        params[:step_ids].each_with_index do |step_id, index|
          workflow.workflow_steps.find(step_id).update!(position: index + 1)
        end

        present workflow.reload, with: V1::Entities::Workflow, full: true
      end

      # ============================================
      # Execution History
      # ============================================

      desc 'Get workflow execution history'
      params do
        requires :id, type: Integer
        optional :page, type: Integer, default: 1
        optional :per_page, type: Integer, default: 20, values: 1..100
        optional :status, type: String, values: %w[pending running completed failed cancelled]
      end
      get ':id/executions' do
        require_workspace!

        workflow = policy_scope(Workflow).find(params[:id])
        authorize workflow, :show?

        executions = workflow.workflow_executions
                             .includes(:workflow_step_logs)
                             .order(created_at: :desc)

        executions = executions.where(status: params[:status]) if params[:status].present?

        paginated = executions.page(params[:page]).per(params[:per_page])

        header 'X-Total-Count', paginated.total_count.to_s
        header 'X-Total-Pages', paginated.total_pages.to_s

        present paginated, with: V1::Entities::WorkflowExecution
      end

      desc 'Get specific execution details'
      params do
        requires :id, type: Integer
        requires :execution_id, type: Integer
      end
      get ':id/executions/:execution_id' do
        require_workspace!

        workflow = policy_scope(Workflow).find(params[:id])
        authorize workflow, :show?

        execution = workflow.workflow_executions
                            .includes(workflow_step_logs: :workflow_step)
                            .find(params[:execution_id])

        present execution, with: V1::Entities::WorkflowExecution, full: true
      end

      desc 'Retry a failed execution'
      params do
        requires :id, type: Integer
        requires :execution_id, type: Integer
      end
      post ':id/executions/:execution_id/retry' do
        require_workspace!

        workflow = policy_scope(Workflow).find(params[:id])
        authorize workflow, :execute?

        execution = workflow.workflow_executions.find(params[:execution_id])

        unless execution.can_resume?
          error!({ error: 'Execution cannot be retried' }, 422)
        end

        ::Workflows::Engine.new(workflow).resume(execution)

        present execution.reload, with: V1::Entities::WorkflowExecution
      end

      desc 'Cancel a running execution'
      params do
        requires :id, type: Integer
        requires :execution_id, type: Integer
      end
      post ':id/executions/:execution_id/cancel' do
        require_workspace!

        workflow = policy_scope(Workflow).find(params[:id])
        authorize workflow, :execute?

        execution = workflow.workflow_executions.find(params[:execution_id])

        unless execution.pending? || execution.running?
          error!({ error: 'Execution cannot be cancelled' }, 422)
        end

        ::Workflows::Engine.new(workflow).cancel(execution)

        present execution.reload, with: V1::Entities::WorkflowExecution
      end

      # ============================================
      # Meta endpoints
      # ============================================

      desc 'Get available step types for building workflows'
      get 'meta/step_types' do
        authenticate!

        ::Workflows::Steps::Registry.available_steps
      end

      desc 'Get workflow templates'
      params do
        optional :category, type: String
        optional :featured_only, type: Boolean, default: false
      end
      get 'meta/templates' do
        authenticate!

        templates = WorkflowTemplate.order(:name)
        templates = templates.where(category: params[:category]) if params[:category].present?
        templates = templates.featured if params[:featured_only]

        present templates, with: V1::Entities::WorkflowTemplate
      end

      desc 'Get template details'
      params do
        requires :template_id, type: Integer
      end
      get 'meta/templates/:template_id' do
        authenticate!

        template = WorkflowTemplate.find(params[:template_id])
        present template, with: V1::Entities::WorkflowTemplate, full: true
      end

      desc 'Create workflow from template'
      params do
        requires :template_id, type: Integer
        optional :name, type: String, desc: 'Override template name'
        optional :trigger_config, type: Hash, desc: 'Override trigger configuration'
      end
      post 'from_template/:template_id' do
        require_workspace!
        authorize Workflow, :create?

        template = WorkflowTemplate.find(params[:template_id])

        workflow = ::Workflows::TemplateApplier.new(
          template: template,
          workspace: current_workspace,
          user: current_user,
          overrides: {
            name: params[:name],
            trigger_config: params[:trigger_config]
          }.compact
        ).apply

        present workflow, with: V1::Entities::Workflow, full: true
      end
    end
  end
end
