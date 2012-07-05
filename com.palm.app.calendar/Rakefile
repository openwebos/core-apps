require 'jasmine'

namespace :jasmine do
  task :server do
    require 'jasmine'
    require 'eris/lib/jasmine_config_overrides'

    puts "your tests are here:"
    puts "  http://localhost:8888/"

    Jasmine::Config.new.start_server
  end

  desc "Run continuous integration tests"
  task :ci do
    require 'jasmine'
    require 'eris/lib/jasmine_config_overrides'
    require "rspec"
    require "rspec/core/rake_task"
    require 'eris'
    ENV['JASMINE_BROWSER'] = 'chrome'

    RSpec::Core::RakeTask.new(:jasmine_continuous_integration_runner) do |t|
      t.rspec_opts = ["--color", "--format", "progress"]
      t.verbose = true
      t.pattern = ["#{Eris::FILE_PATH}/eris/lib/jasmine_rspec_runner.rb"]
    end
    Rake::Task["jasmine_continuous_integration_runner"].invoke
  end
end

desc "Run specs with local config"
task :jasmine => ['jasmine:server']