class CreateAccounts < ActiveRecord::Migration[8.0]
  def change
    create_table :accounts do |t|
      t.references :user, null: false, foreign_key: true
      t.string :name
      t.string :bank_name
      t.string :account_number_last4
      t.string :account_type
      t.string :currency
      t.boolean :is_active

      t.timestamps
    end
  end
end
