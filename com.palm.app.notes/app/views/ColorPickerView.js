// @@@LICENSE
//
//      Copyright (c) 2010-2013 LG Electronics, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// LICENSE@@@

/*global enyo, Memo */

var ColorPickerView = "ColorPickerView";

enyo.kind({
  name: ColorPickerView,
  kind: "RadioGroup",
  className: 'color-picker',
  flex:1,
  events: {
    onColorChosen: ""
  },
  components: [
    {
      name: 'blue',
      onmousedown: "cancelMouseDown",
      icon: 'images/title-bar/color-picker-blue.png'
    },
    {
      name: 'yellow',
      onmousedown: "cancelMouseDown",
      icon: 'images/title-bar/color-picker-yellow.png'
    },
    {
      name: 'green',
      onmousedown: "cancelMouseDown",
      icon: 'images/title-bar/color-picker-green.png'
    },
    {
      name: 'pink',
      onmousedown: "cancelMouseDown",
      icon: 'images/title-bar/color-picker-pink.png'
    },
    {
      name: 'salmon',
      onmousedown: "cancelMouseDown",
      icon: 'images/title-bar/color-picker-salmon.png'
    }
  ],

  create: function() {
    this.inherited(arguments);
  },

  setColor: function(newColor) {
    this.setValue(Memo.colors.indexOf(newColor));
  },

  valueChanged: function() {
    this.inherited(arguments);
    var self = this;

    function setIcon(color, selected) {
      self.$[color].setIcon('images/title-bar/color-picker-' + (selected ? 'selected-' : '') + color + '.png');
    }

    if (this.currentColor) {
      setIcon(this.currentColor, false);
    }

    var newColor = Memo.colors[this.value];
    this.currentColor = newColor;

    setIcon(newColor, true);
    this.doColorChosen(newColor);
  },

  cancelMouseDown: function(inSender, inEvent) {
    enyo.stopEvent(inEvent);
  }
});
