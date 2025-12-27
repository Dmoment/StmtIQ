# frozen_string_literal: true

class AddTemplateIdToStatements < ActiveRecord::Migration[8.0]
  def change
    add_reference :statements, :bank_template, null: true, foreign_key: true
  end
end
