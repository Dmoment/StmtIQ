# frozen_string_literal: true

module ML
  class CategorizeTransactionJob < ApplicationJob
    queue_as :default

    def perform(transaction_id)
      transaction = Transaction.find_by(id: transaction_id)
      return unless transaction

      ML::CategorizationService.new(transaction, user: transaction.user).categorize!
    end
  end
end
