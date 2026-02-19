# development/test에서 단일 DB 사용 시 Solid Cache/Queue/Cable 스키마를
# db/schema.rb 없이 로드합니다. db:create 직후 한 번 실행하세요.
namespace :db do
  desc "Load Solid Cache, Queue, Cable schemas (when using single DB without db/schema.rb)"
  task load_solid_schemas: :environment do
    %w[cache_schema queue_schema cable_schema].each do |name|
      path = Rails.root.join("db", "#{name}.rb")
      if File.exist?(path)
        load path
        puts "Loaded #{name}.rb"
      end
    end
  end
end
