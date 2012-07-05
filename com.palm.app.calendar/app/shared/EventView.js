// @@@LICENSE
//
//      Copyright (c) 2010-2012 Hewlett-Packard Development Company, L.P.
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
 NOTE: calendar.EventView is the Calendar app's Event GUI base kind.

 **/
enyo.kind({
    name     : "calendar.EventView",
    kind     : enyo.Control,
    showing  : false,
    published: {
        calendars     : null, // Object			: For watching calendar changes (i.e. color, on/off state)
        event         : null, // CalendarEvent	: Calendar event data model.
        watchCalendars: true  // Boolean		: Indicates whether this event should watch calendars changes.
    },

    create: function create() {
        this.inherited(arguments);
        this.event && this.eventChanged();
        this.broadcastMessage("isActive", [true]);
    },

    destroy: function destroy() {
//		this.addClass ("fade-out");
        enyo.application.ignore({ calendars: this });
        this.broadcastMessage("isActive", [false]);
        this.inherited(arguments);
    },

// BEGIN :-------: Custom Handlers :-----------------------------------------------------------------------------------------------------------------------//

    isActiveHandler: function isActiveHandler(isActive) {
        var handle = isActive && this.watchCalendars ? "watch" : "ignore";
        enyo.application [handle]({ calendars: this });
    },

// BEGIN :-------: Published Property Handlers :--------------------------------------------------------------------------------------------------------------//

    calendarsChanged: function calendarsChanged(oldCalendars) {
        var event = this.event;
        if (!event) {
            return;
        }

        var calendar = this.calendars && this.calendars [event.calendarId];
        if (!calendar) {
            return;
        }

        if (("color" in event) && (calendar.color != event.color) || (calendar.color != this.color)) {
            this.removeClass("theme-" + event.color);
            this.removeClass("theme-" + this.color);
        }
        if (("color" in calendar)) {
            event.color = this.color = calendar.color;
            this.addClass("theme-" + event.color);
        }
        (this.showing != calendar.on) && this.setShowing(!!calendar.on);		// Hide/Show this event based on its calendar's state.
    },

    eventChanged: function eventChanged(oldEvent) {
        var event = this.event;
        if (!event) {
            return;
        }
//		this.addClass ("fade-in");
        this.calendarsChanged();
        this.setContent(event.subject || $L("No Subject"));	// OK because, enyo.Control.render() overrides with children's content if present.
    }
});
