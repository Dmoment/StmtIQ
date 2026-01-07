# frozen_string_literal: true

# Job to sync all Gmail connections that need syncing
# This should be scheduled to run periodically (e.g., every hour)
# SOLID: Single Responsibility - Only schedules individual sync jobs
class GmailSyncAllJob < ApplicationJob
  queue_as :gmail

  def perform
    Rails.logger.info 'Starting Gmail sync for all connections'

    # Find connections that need syncing
    connections = GmailConnection.needs_sync

    Rails.logger.info "Found #{connections.count} Gmail connections needing sync"

    # Schedule individual sync jobs for each connection
    connections.find_each do |connection|
      GmailSyncJob.perform_later(connection.id)
    end
  end
end
