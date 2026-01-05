# frozen_string_literal: true

module ML
  # Generates embeddings for labeled examples (user feedback)
  # These are used to improve future categorization accuracy
  class GenerateLabeledExampleEmbeddingJob < ApplicationJob
    queue_as :low # Lower priority than transaction categorization

    retry_on StandardError, attempts: 3, wait: :polynomially_longer

    def perform(labeled_example_id)
      example = LabeledExample.find_by(id: labeled_example_id)
      return unless example
      return if example.embedding.present?

      text = example.normalized_description.presence || example.description
      return if text.blank?
      return unless ENV['OPENAI_API_KEY'].present?

      # Generate embedding
      client = OpenAI::Client.new(access_token: ENV['OPENAI_API_KEY'])
      response = client.embeddings(
        parameters: {
          model: 'text-embedding-3-small',
          input: text
        }
      )

      embedding_data = response.dig('data', 0, 'embedding')
      return unless embedding_data

      # Store embedding using raw SQL (pgvector requires it)
      embedding_string = "[#{embedding_data.join(',')}]"
      ActiveRecord::Base.connection.execute(
        "UPDATE labeled_examples SET embedding = '#{embedding_string.gsub("'", "''")}'::vector WHERE id = #{example.id}"
      )

      Rails.logger.info("ML::GenerateLabeledExampleEmbeddingJob: Generated embedding for example ##{example.id}")
    rescue => e
      if e.message.include?('429')
        # Rate limited - will retry with backoff
        raise
      end
      Rails.logger.error("ML::GenerateLabeledExampleEmbeddingJob: Failed for example ##{labeled_example_id}: #{e.message}")
    end
  end
end
