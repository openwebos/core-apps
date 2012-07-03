class MockDevice

  attr_accessor :width, :height

  CHROME_HEIGHT = 65

  class DeviceMap
    @@map = {}

    def self.add_device(name, opts)
      @@map[name] = {:width => opts[:width] || 320, :height => opts[:height] || 480}
    end

    def self.[](name)
      @@map[name]
    end
  end

  DeviceMap.add_device(:pixi, {:width => 320, :height => 400})
  DeviceMap.add_device(:veer, {:width => 320, :height => 400})
  DeviceMap.add_device(:pre, {:width => 320, :height => 480})
  DeviceMap.add_device(:pre2, {:width => 320, :height => 480})
  DeviceMap.add_device(:pre3, {:width => 480, :height => 800})
  DeviceMap.add_device(:manta, {:width => 480, :height => 800})
  DeviceMap.add_device(:windsor_not, {:width => 480, :height => 800})
  DeviceMap.add_device(:windsor_knot, {:width => 480, :height => 800})
  DeviceMap.add_device(:topaz, {:width => 768, :height => 1024})
  DeviceMap.add_device(:opal, {:width => 768, :height => 1024})

  def size(w, h)
    @width = w
    @height = h
    self
  end

  def device(name)
    @name = name
    dev = DeviceMap[@name]
    size(dev[:width], dev[:height])
    self
  end

  def orientation(orient)
    dev = DeviceMap[@name]

    if orient == :landscape
      size(dev[:height], dev[:width])
    else
      size(dev[:width], dev[:height])
    end

    self
  end

  # On linux, Chrome 14 additional pixels for browser chrome
  def browser_width
    @width + 8
  end

  # On linux, Chrome 14 additional pixels for browser chrome
  def browser_height
    @height + 57
  end
end
