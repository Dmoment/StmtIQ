# frozen_string_literal: true

# Job to sync invoice emails from a single Gmail connection
# SOLID: Single Responsibility - Only handles job execution, delegates to service
class GmailSyncJob < ApplicationJob
  queue_as :gmail

  # Retry with exponential backoff on transient errors
  retry_on Google::Apis::TransmissionError, wait: :polynomially_longer, attempts: 3
  retry_on Gmail::OauthService::TokenError, wait: 5.minutes, attempts: 2

  # Don't retry on authorization errors - they need user intervention
  discard_on Google::Apis::AuthorizationError

  def perform(gmail_connection_id)
    connection = GmailConnection.find_by(id: gmail_connection_id)
    return unless connection
    return unless connection.active? || connection.status == 'error'
    return unless connection.sync_enabled?

    Rails.logger.info "Starting Gmail sync for connection #{gmail_connection_id} (#{connection.email})"

    result = Gmail::SyncService.new(connection).call

    if result[:success]
      stats = result[:stats]
      Rails.logger.info(
        "Gmail sync completed for #{connection.email}: " \
        "#{stats[:emails_found]} emails found, " \
        "#{stats[:attachments_processed]} attachments processed, " \
        "#{stats[:invoices_created]} invoices created"
      )
    else
      Rails.logger.warn "Gmail sync failed for #{connection.email}: #{result[:error]}"
    end
  end
end
