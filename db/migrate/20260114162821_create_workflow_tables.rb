# frozen_string_literal: true

class CreateWorkflowTables < ActiveRecord::Migration[8.0]
  def change
    # Workflow Definition
    create_table :workflows do |t|
      t.references :workspace, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true

      t.string :name, null: false
      t.text :description
      t.string :status, default: 'draft', null: false

      # Trigger configuration
      t.string :trigger_type, null: false
      t.jsonb :trigger_config, default: {}

      # Metadata
      t.jsonb :metadata, default: {}
      t.integer :executions_count, default: 0
      t.datetime :last_executed_at

      t.timestamps
    end

    add_index :workflows, [:workspace_id, :status]
    add_index :workflows, :trigger_type

    # Workflow Steps (ordered)
    create_table :workflow_steps do |t|
      t.references :workflow, null: false, foreign_key: true

      t.string :step_type, null: false
      t.string :name
      t.integer :position, null: false

      t.jsonb :config, default: {}
      t.jsonb :conditions, default: {}

      t.boolean :enabled, default: true
      t.boolean :continue_on_failure, default: false

      t.timestamps
    end

    add_index :workflow_steps, [:workflow_id, :position]
    add_index :workflow_steps, :step_type

    # Workflow Executions (runs)
    create_table :workflow_executions do |t|
      t.references :workflow, null: false, foreign_key: true
      t.references :workspace, null: false, foreign_key: true

      t.string :status, default: 'pending', null: false
      t.string :trigger_source

      t.jsonb :context, default: {}
      t.jsonb :trigger_data, default: {}

      t.integer :current_step_position, default: 0
      t.integer :completed_steps_count, default: 0
      t.integer :failed_steps_count, default: 0

      t.datetime :started_at
      t.datetime :completed_at
      t.integer :duration_ms

      t.text :error_message

      t.timestamps
    end

    add_index :workflow_executions, [:workflow_id, :status]
    add_index :workflow_executions, [:workspace_id, :created_at]
    add_index :workflow_executions, :status

    # Step Execution Logs
    create_table :workflow_step_logs do |t|
      t.references :workflow_execution, null: false, foreign_key: true
      t.references :workflow_step, null: false, foreign_key: true

      t.string :status, default: 'pending', null: false
      t.integer :position

      t.jsonb :input_data, default: {}
      t.jsonb :output_data, default: {}

      t.datetime :started_at
      t.datetime :completed_at
      t.integer :duration_ms

      t.text :error_message
      t.text :error_backtrace
      t.integer :retry_count, default: 0

      t.timestamps
    end

    add_index :workflow_step_logs, [:workflow_execution_id, :position]
    add_index :workflow_step_logs, :status

    # Workflow Templates (pre-built workflows - global, not workspace-scoped)
    create_table :workflow_templates do |t|
      t.string :name, null: false
      t.text :description
      t.string :category
      t.jsonb :definition, default: {}
      t.boolean :featured, default: false
      t.string :icon

      t.timestamps
    end

    add_index :workflow_templates, :category
    add_index :workflow_templates, :featured
  end
end
