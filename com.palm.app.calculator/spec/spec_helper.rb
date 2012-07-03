require 'bundler/setup'

require 'steak'
require 'capybara/rspec'
require 'selenium-webdriver'
require 'json'
require 'cgi'

require 'helpers/mock_device'

Capybara.default_wait_time = 30
Capybara.register_driver :selenium_chrome do |app|
  Capybara::Selenium::Driver.new(app, :browser => :chrome)
end

Capybara.default_driver = :selenium_chrome

$LOAD_PATH.unshift File.dirname(__FILE__) + '/..'

def escaped_launch_params(launch_params)
  CGI.escapeElement(JSON.generate(launch_params))
end

def launch_app(launch_params = {})
  query = ["?test=true"]

  launch_and_wait_until_loaded "http://localhost:9999/#{query.join('&')}"
end

def launch_app_with_db_fixtures(name = "defaultData")
  launch_app
  load_fixtures(name)
  launch_app
end

def launch_app_with_options(options = {})
  fixture = options.fetch(:fixture, "defaultData")

  launch_app(options)
  load_fixtures fixture
  launch_app(options)
end

def launch_app_with_empty_fixtures
  launch_app
  clear_fixtures
#  launch_app  # don't need to re-launch this app after a clear_fixtures at the moment
end

def set_device(device, orientation)
  @mock_device = MockDevice.new
  @mock_device.device(device).orientation(orientation)

  # switch to most recent window
  page.driver.browser.switch_to.window page.driver.browser.window_handles.last

  window_name = <<-JS
    (function() {
      return window.name;
    })();
JS

  if page.evaluate_script(window_name) != "test-runner"
    Capybara.current_session.visit 'http://localhost:9999/runner.html' # load
    find_css("a").click
    page.driver.browser.switch_to.window page.driver.browser.window_handles.last
  end

  resize_if_needed = <<-JS
  (function() {
    if (window.innerWidth != #{@mock_device.width}) {
      window.resizeTo(#{@mock_device.browser_width}, #{@mock_device.browser_height});
      return true;
    }
    return false;
  })();
JS
  resized = page.evaluate_script(resize_if_needed)

  sleep 0.5 if resized
end

def launch_and_wait_until_loaded(url)
  visit url
  puts "visited #{url}"
  wait_until {
    begin
      #one_of_these_images_is_visible(['backdrop'])
      puts "checking count"
      count_of_visible("#app_small_display") > 0
    rescue => e
      puts "failed"
      puts e.inspect
      sleep 0.5
    end
  }
end

def device_pixel_ratio
  page.evaluate_script('context().devicePixelRatio')
end

def image_visible(name)
  count_of_visible("img[src=\"#{image_path(name)}\"]") > 0
end

def image_selector(name)
  "img[src=\"#{image_path(name)}\"]"
end

def image_path(name)
  "images/#{name}.png"
end

def find_image(name)
  find_css(image_selector(name))
end

def one_of_these_images_is_visible(image_names)
  image_names.detect { |name| image_visible(name) }
end

def relaunch_with_params(launch_params)
  page.execute_script("relaunchWithParams('#{launch_params}');")
  sleep 2
end

def find_css(selector)
  find(:css, selector)
end

def count_of_visible(selector)
  puts "count_of_visible(#{selector})"
  throw "#count_of_visible.  Error: no single quotes allowed in selector, use double quotes instead" if selector =~ /'/
  puts "starting js"
  page.evaluate_script <<-JS
    (function() {
      var visibleCount = 0;
      var nodes = document.querySelectorAll('#{selector}');
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].clientHeight > 0) {
          visibleCount++;
        }
      }
      return visibleCount;
    })();
  JS
end

def height_of(selector)
  page.evaluate_script <<-JS
    (function() {
      return document.querySelector('#{selector}').clientHeight;
    })();
  JS
end

def mouse_click(selector)
  events = <<-JS
    (function() {
     var edown = document.createEvent("MouseEvents");
     edown.initMouseEvent("mousedown", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
     var eup = document.createEvent("MouseEvents");
     eup.initMouseEvent("mouseup", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
     var el = document.querySelector("#{selector}");
     el.dispatchEvent(edown);
     el.dispatchEvent(edown);
     el.dispatchEvent(eup);
    })();
  JS
  page.execute_script(events);
end

def back_gesture
  page.execute_script <<-JS
    enyo.dispatch({
    type: "back",
    target: null,
    preventDefault: enyo.nop
  });
  JS
  sleep 3
end

def swipe_next(bar_name)
  page.execute_script <<-JS
    enyo.$.mapsApp.$.footerBars.$["#{bar_name}"].$.carousel.next();
  JS
  sleep 0.75
end

def swipe_previous(bar_name)
  page.execute_script <<-JS
    enyo.$.mapsApp.$.footerBars.$["#{bar_name}"].$.carousel.previous();
  JS
  sleep 0.75
end

def clear_fixtures
  loader = <<-JS
    (function() {
      var loader = new FixtureLoader();
      loader.clear();
    })();
  JS
  page.execute_script(loader)
  wait_until { find_css("body[@fixtures-loaded=true]") }
end

def load_fixtures(name)
  loader = <<-JS
    (function() {
      var fixturesName = '#{name}';
      var loader = new FixtureLoader({fixtures: fixturesName});
      loader.go();
    })();
  JS
  page.execute_script(loader)
  wait_until { find_css("body[@fixtures-loaded=true]") }
  sleep 2 # TODO: without this your fixtures may not be fully loaded by the time the app re-launches
end

def sleeep(seconds=120)
  puts "sleeping"
  sleep seconds
end

def open_route_entry
  find_css(".menu").click
  sleep 1
  find('.pullout.settings .enyo-item.directions-toggle').click
  wait_until { count_of_visible('.pullout') == 0 }
end

def drop_or_remove_pin
  find_css(".menu").click
  sleep 1
  find('.pullout.settings .enyo-item.drop-pin').click
  wait_until { count_of_visible('.pullout') == 0 }
end

def fill_in_route_inputs_and_route(start_value, end_value)
  fill_in "mapsApp_actionBar_routeEntry_startInput_input", :with => "#{start_value}\n"
  fill_in "mapsApp_actionBar_routeEntry_endInput_input", :with => "#{end_value}\n"
end

def fill_in_search_input(value)
  find_css("#mapsApp_actionBar_searchEntry_searchInput").click
  fill_in "mapsApp_actionBar_searchEntry_searchInput_input", :with => value
end


#TODO: collapse some fill_in_search_input's into search's
def search(text)
  find_css("#mapsApp_actionBar_searchEntry_searchInput").click
  fill_in "mapsApp_actionBar_searchEntry_searchInput_input", :with => "#{text}\n"
  wait_until { image_visible('poi_active') }
end

def fill_in_route_inputs(start_value, end_value)
  find_css("#mapsApp_actionBar_routeEntry_startInput_input").click()
  fill_in "mapsApp_actionBar_routeEntry_startInput_input", :with => start_value
  find_css("#mapsApp_actionBar_routeEntry_endInput_input").click()
  fill_in "mapsApp_actionBar_routeEntry_endInput_input", :with => end_value
end

def value_of_start_route
  find_css("#mapsApp_actionBar_routeEntry_startInput_input").value
end

def value_of_end_route
  find_css("#mapsApp_actionBar_routeEntry_endInput_input").value
end

def click_on_first_bookmark
  find_css("#mapsApp_actionBar_buttons_savesButton_icon").click

  # wait until pull-out is fully out
  sleep 0.25

  find_css('.saved-locations .list .item').click
end

def set_device_caps(caps_overrides = {})
  caps = {
      :platformVersionMajor => 3,
      :platformVersionMinor => 0,
      :platformVersionDot => 4
  }

  caps_json = JSON.generate(caps.merge(caps_overrides))

  puts caps_json

  caps_js = <<-JS
  (function() {
    var device_window = {
      PalmSystem: {
        deviceInfo: #{caps_json}
      },
      innerWidth: #{@chrome.width},
      innerHeight: #{@chrome.height}
    };

    DEVICE_CAPS = new DeviceCaps(device_window);
  })();
  JS

  puts caps_js

  page.execute_script(caps_js)
end

module Capybara
  module Node
    class Element < Base
      def has_class?(name)
        self[:class].split.include?(name)
      end

      def has_focus?
        id = self[:id]
        Capybara.current_session.execute_script <<-JS
          return document.activeElement.id == "#{id}";
        JS
      end

      def send_keys(str)
        base.native.send_keys(str)
      end
    end
  end
end

RSpec.configure do |config|
  config.before(:suite) do
    MockDevice.new
    Capybara.current_session.visit 'http://localhost:9999/icon.png' # load
  end
end
