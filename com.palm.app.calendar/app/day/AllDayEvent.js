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


/**
 NOTE: calendar.day.AllDayEvent is the Calendar app's GUI representation of all-day calendar events.

 **/
enyo.kind({
    name      : "calendar.day.AllDayEvent",
    className : "allday-event",
    kind      : "calendar.EventView",
    components: [
        {name: "text", className: "text ellipsis", layoutKind: enyo.HLayout}
    ],

    create: function create() {
        this.inherited(arguments);
    },

    destroy: function destroy() {
        this.inherited(arguments);
    },

    clickHandler: function allDayEventClicked(from, domEvent) {
        enyo.application.share({showEvent: this});
        return true;
    },

    mousedownHandler: function (from, domEvent) {
        this.addClass("held");
    },

    mouseupHandler: function (from, domEvent) {
        this.removeClass("held");
    },

    dragstartHandler: function (inSender, inEvent) {
        this.removeClass("held");
    },

    eventChanged: function allDayEventChanged(oldEvent) {
        this.event && this.$.text.setContent(this.event.subject || $L("No Subject"));
        this.inherited(arguments);
    }
});
