# frozen_string_literal: true

namespace :docs do
  desc "Sync documentation from docs/ to public/docs/ for web access"
  task sync: :environment do
    require "fileutils"

    source = Rails.root.join("docs")
    destination = Rails.root.join("public", "docs")

    unless source.exist?
      puts "Source docs/ directory not found"
      exit 1
    end

    # Create destination if it doesn't exist
    FileUtils.mkdir_p(destination)

    # Copy all markdown files recursively
    Dir.glob(source.join("**", "*.md")).each do |file|
      relative_path = Pathname.new(file).relative_path_from(source)
      dest_file = destination.join(relative_path)

      FileUtils.mkdir_p(dest_file.dirname)
      FileUtils.cp(file, dest_file)

      puts "📄 Copied: #{relative_path}"
    end

    puts ""
    puts "Documentation synced to public/docs/"
    puts "   View at: http://localhost:3000/docs/"
  end

  desc "Generate all documentation (API spec + sync docs)"
  task generate: :environment do
    Rake::Task["api:generate_spec"].invoke
    Rake::Task["docs:sync"].invoke

    puts ""
    puts "📚 Documentation generated!"
    puts "   API Docs: http://localhost:3000/swagger-ui/"
    puts "   ADRs:     http://localhost:3000/docs/"
  end
end
