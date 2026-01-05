class FixLabeledExamplesForeignKey < ActiveRecord::Migration[8.0]
  def change
    # Remove the existing foreign key that prevents transaction deletion
    remove_foreign_key :labeled_examples, :transactions

    # Re-add with ON DELETE SET NULL so LabeledExamples persist
    # even when source transaction is deleted (keeps the learned pattern)
    add_foreign_key :labeled_examples, :transactions, on_delete: :nullify
  end
end
