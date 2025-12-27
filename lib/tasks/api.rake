# frozen_string_literal: true

namespace :api do
  desc "Generate OpenAPI specification from Grape API"
  task generate_spec: :environment do
    require "json"
    
    # Use Rack::MockRequest to get the swagger doc
    app = Rails.application
    request = Rack::MockRequest.new(app)
    response = request.get(
      "/api/v1/swagger_doc",
      "CONTENT_TYPE" => "application/json",
      "HTTP_HOST" => "localhost"
    )
    
    if response.status == 200
      swagger_doc = JSON.parse(response.body)
      
      # Write to public directory
      output_path = Rails.root.join("public", "api-spec-generated.json")
      File.write(output_path, JSON.pretty_generate(swagger_doc))
      
      puts "✅ OpenAPI spec generated at: #{output_path}"
      puts "   Endpoints: #{swagger_doc.dig('paths')&.keys&.count || 0}"
    else
      puts "❌ Failed to generate OpenAPI spec. Status: #{response.status}"
      puts response.body
      exit 1
    end
  end
end
