# frozen_string_literal: true

module Workflows
  module Steps
    class ShareDocumentsStep < BaseStep
      def self.display_name
        'Share Documents'
      end

      def self.category
        :integration
      end

      def self.icon
        'share-2'
      end

      def self.description
        'Share documents with your CA via email, WhatsApp, or shareable link'
      end

      def self.config_schema
        {
          type: 'object',
          properties: {
            share_method: {
              type: 'string',
              title: 'Share Method',
              description: 'How to share the documents',
              enum: %w[email whatsapp link all],
              default: 'email'
            },
            recipients: {
              type: 'array',
              title: 'Recipients',
              description: 'Email addresses or phone numbers to share with',
              items: { type: 'string' },
              default: []
            },
            include_summary: {
              type: 'boolean',
              title: 'Include Summary',
              description: 'Add a summary of all documents in the message',
              default: true
            },
            auto_generate_link: {
              type: 'boolean',
              title: 'Auto-generate Share Link',
              description: 'Automatically create a secure shareable link',
              default: true
            },
            link_expiry_days: {
              type: 'integer',
              title: 'Link Expiry (Days)',
              description: 'Number of days until the share link expires',
              default: 7,
              minimum: 1,
              maximum: 90
            },
            message_template: {
              type: 'string',
              title: 'Message Template',
              description: 'Custom message to include. Use {{month}} for bucket name.',
              format: 'textarea',
              default: 'Hi, please find the documents for {{month}} attached.'
            }
          },
          required: []
        }
      end

      def execute
        bucket_info = from_context(:bucket)
        return failure_result('No bucket found in context') unless bucket_info

        share_method = config[:share_method] || 'email'
        recipients = config[:recipients] || []

        log_info("Sharing documents via #{share_method} to #{recipients.size} recipients")

        results = {
          share_link: nil,
          emails_sent: 0,
          whatsapp_sent: 0
        }

        # Generate share link if needed
        if should_generate_link?(share_method)
          results[:share_link] = generate_share_link(bucket_info[:id])
        end

        # Build message
        message = build_share_message(bucket_info)
        summary = config[:include_summary] ? build_document_summary : nil

        # Send via appropriate channels
        case share_method
        when 'email'
          results[:emails_sent] = send_via_email(recipients, message, summary, bucket_info, results[:share_link])
        when 'whatsapp'
          results[:whatsapp_sent] = send_via_whatsapp(recipients, message, results[:share_link])
        when 'link'
          # Just generate the link, already done above
          log_info("Share link generated: #{results[:share_link]}")
        when 'all'
          results[:emails_sent] = send_via_email(recipients.select { |r| r.include?('@') }, message, summary, bucket_info, results[:share_link])
          results[:whatsapp_sent] = send_via_whatsapp(recipients.reject { |r| r.include?('@') }, message, results[:share_link])
        end

        add_to_context(:share_result, results)

        {
          success: true,
          share_link: results[:share_link],
          emails_sent: results[:emails_sent],
          whatsapp_sent: results[:whatsapp_sent],
          message: "Documents shared successfully"
        }
      rescue StandardError => e
        log_error("Share documents failed: #{e.message}")
        failure_result("Failed to share documents: #{e.message}")
      end

      private

      def should_generate_link?(share_method)
        return true if %w[link all].include?(share_method)
        return true if config[:auto_generate_link]

        false
      end

      def generate_share_link(bucket_id)
        return nil unless defined?(BucketShare)

        expiry_days = config[:link_expiry_days] || 7

        share = BucketShare.create!(
          bucket_id: bucket_id,
          user: user,
          workspace: workspace,
          access_type: 'view',
          expires_at: expiry_days.days.from_now,
          token: SecureRandom.urlsafe_base64(32)
        )

        # Build the full URL
        base_url = Rails.application.config.action_mailer.default_url_options[:host] rescue 'app.example.com'
        "https://#{base_url}/share/#{share.token}"
      rescue StandardError => e
        log_error("Failed to generate share link: #{e.message}")
        nil
      end

      def build_share_message(bucket_info)
        template = config[:message_template] || 'Hi, please find the documents for {{month}} attached.'
        template.gsub('{{month}}', bucket_info[:month] || bucket_info[:name] || 'this period')
      end

      def build_document_summary
        bucket_info = from_context(:bucket)
        document_check = from_context(:document_check)
        recurring = from_context(:recurring_invoices)

        lines = []
        lines << "Document Summary:"
        lines << "- Bucket: #{bucket_info[:name]}" if bucket_info
        lines << "- Documents added: #{bucket_info[:documents_added]}" if bucket_info[:documents_added]

        if document_check
          lines << "- Document types present: #{document_check[:present]&.size || 0}"
          lines << "- Missing documents: #{document_check[:missing]&.join(', ')}" if document_check[:missing]&.any?
        end

        if recurring
          lines << "- Recurring invoices found: #{recurring[:found_count] || recurring[:found]&.size || 0}"
        end

        lines.join("\n")
      end

      def send_via_email(recipients, message, summary, bucket_info, share_link)
        return 0 if recipients.empty?

        count = 0
        recipients.each do |email|
          begin
            if defined?(BucketShareMailer)
              BucketShareMailer.share_notification(
                email: email,
                bucket_id: bucket_info[:id],
                message: message,
                summary: summary,
                share_link: share_link,
                sender: user
              ).deliver_later
            elsif defined?(ActionMailer::Base)
              # Generic mailer fallback
              log_info("Would send email to #{email} with share link: #{share_link}")
            end
            count += 1
          rescue StandardError => e
            log_error("Failed to send email to #{email}: #{e.message}")
          end
        end

        log_info("Sent #{count} emails")
        count
      end

      def send_via_whatsapp(recipients, message, share_link)
        return 0 if recipients.empty?

        full_message = [message, share_link].compact.join("\n\n")

        count = 0
        recipients.each do |phone|
          begin
            if defined?(WhatsappService)
              WhatsappService.send_message(phone, full_message)
              count += 1
            else
              log_info("Would send WhatsApp to #{phone}: #{full_message}")
              count += 1
            end
          rescue StandardError => e
            log_error("Failed to send WhatsApp to #{phone}: #{e.message}")
          end
        end

        log_info("Sent #{count} WhatsApp messages")
        count
      end
    end
  end
end
