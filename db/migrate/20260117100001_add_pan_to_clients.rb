# frozen_string_literal: true

class AddPanToClients < ActiveRecord::Migration[8.0]
  def change
    add_column :clients, :pan, :string, limit: 10
  end
end
