require 'spec_helper'

feature "Calculator" do
  describe "in fullscreen mode" do
    before :each do
      set_device :topaz, :landscape
      puts 'launching'
      launch_app
      puts 'launched'
    end

    describe "when pressing the 1 button" do
      before :each do
        puts 'before find_css'
        find_css('#app_small_1').click
        puts 'got it'
      end

      it "should display 1 inside the display" do
        puts 'in actual test'
        find_css('#app_small_display').text.should == '1'
        puts 'got it'
      end
    end
  end
end
