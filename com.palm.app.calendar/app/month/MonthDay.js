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
 NOTE: calendar.MonthDay is the Calendar app's Month Day's GUI.

 **/
enyo.kind({
    name                   : "calendar.month.MonthDay",
    className              : "day",
    kind                   : enyo.Control,
    flex                   : 1,
    published              : {
        calendars: null,// Object	: For monitoring on/off state - needed to calculate "+ 3 more" label
        date     : null,// Date		: This Month Day's actual date.
        maxEvents: NaN, // Number	: Maximum # of events to display per month day.
        days     : null // Array	: For watching day events.
    },
    G11N                   : {
        moreEvents: new enyo.g11n.Template($L("#plus #{remaining} more events")),
        shortFmt  : new enyo.g11n.DateFmt({date: "short", dateComponents: "d"})
    },
    components             : [
        {kind: enyo.ApplicationEvents, onWindowRotated: "windowRotatedHandler"},
        {name: "date", className: "date"},
        {name: "eventList", className: "events", kind: enyo.Control, defaultKind: "calendar.EventView"}
    ],
    maxEventsOrientationMap: {
        "up"  : 4, "down": 4,   // Maximum number of events that can be displayed in Landscape Mode.
        "left": 7, "right": 7   // Maximum number of events that can be displayed in Portrait Mode.
    },

    create: function create() {
        this.inherited(arguments);
        this.date = new Date();
        this.monthDate = new Date();
        this.windowRotatedHandler();
        this.changeEventColor = enyo.bind(this, this.changeEventColor);
        this.resetEventColor = enyo.bind(this, this.resetEventColor);
    },

    destroy: function destroy() {
        this.broadcastMessage("isActive", [false]);
        this.inherited(arguments);
    },

// BEGIN :-------: Framework Handlers :-----------------------------------------------------------------------------------------------------------------------//

    clickHandler: function monthDayClicked(from, domEvent) {    // Capture click events from MonthDay & any of its sub-components
        domEvent.dispatchTarget = this;							// then bubble the click event up to MonthCarousel with MonthDay as the event's source element.
    },

    windowRotatedHandler: function windowRotated(from, event) {
        var orientation = window.PalmSystem ? enyo.getWindowOrientation() : "up";	// Default to Landscape Mode when not in a webOS environment.
        this.setMaxEvents(this.maxEventsOrientationMap [orientation]);
    },

// BEGIN :-------: Custom Handlers :-----------------------------------------------------------------------------------------------------------------------//

    isActiveHandler: function isActiveHandler(isActive) {
        this.isActive = isActive;

        var handle = (isActive) ? "watch" : "ignore";   // Prepare to watch or ignore if this day's active or in the current month.
        enyo.application [handle]({calendars: this});   // Only handle events if this day is active.

        this.$.eventList.broadcastMessage("isActive", [isActive]);  // Don't use inCurrentMonth b/c calendars should always be watched.
    },

    mousedownHandler: function (from, domEvent) {
        this.timerOn = false;
        this.mouseDownTimeOut = setTimeout(this.changeEventColor, 150);
        this.timerOn = true;
        //this.log('============= MOUSE DOWN FIRST TIME');
    },

    mouseupHandler: function (from, domEvent) {
        if (this.timerOn) {
            this.changeEventColor();
            this.mouseUpTimeOut = setTimeout(this.resetEventColor, 250);
            //this.log('============= MOUSE UP TIMER ON');
        }
        else {
            this.resetEventColor();
            //this.log('============= MOUSE UP TIMER OFF');
        }
    },

    dragstartHandler: function (inSender, inEvent) {
        if (this.timerOn) {
            clearTimeout(this.mouseDownTimeOut);
            this.timerOn = false;
        }
        else {
            this.resetEventColor();
            clearTimeout(this.mouseDownTimeOut);
        }
    },
// BEGIN :-------: Published Property Handlers :--------------------------------------------------------------------------------------------------------------//

    calendarsChanged: function calendarsChanged(oldCalendars) {
        var day = this.day;

        if (!day) {
            return;
        }

        var allEvents = [];
        Array.isArray(day.allDayEvents) && (allEvents = allEvents.concat(day.allDayEvents));
        Array.isArray(day.hiddenAllDay) && (allEvents = allEvents.concat(day.hiddenAllDay));
        Array.isArray(day.events) && (allEvents = allEvents.concat(day.events));
        Array.isArray(day.hiddenEvents) && (allEvents = allEvents.concat(day.hiddenEvents));
        var events = enyo.application.cacheManager.mapEventsByDate(enyo.application.cacheManager.filterEvents(allEvents, [this.date]));
        this.setDays(events);
    },

    dateChanged: function dateChanged(oldDate) {
        this.day = undefined;
        this.$.date.setContent(this.G11N.shortFmt.format(this.date));

        this.inCurrentMonth = this.monthDate.getMonth() == this.date.getMonth();
        this.removeClass(this.inCurrentMonth ? "other-month" : "current-month");
        this.addClass(this.inCurrentMonth ? "current-month" : "other-month");

        this.clearEventDisplay();

        var currDate = (new Date()).clearTime();
        (+currDate == +this.date) ? this.addClass("today") : this.removeClass("today");
    },

    daysChanged: function daysChanged(oldDays) {
        /* days: { Date:{allDayEvents:[CalendarEvent],events:[CalendarEvent],hiddenAllDay:[CalendarEvent],hiddenEvents:[CalendarEvent]}}
         */
        var eventViews = this.$.eventList;

        if (!this.isActive || !eventViews || !this.showing) {    // This MonthDay has no calendars or isn't rendered or isn't showing or isn't in the current month so:
            return;												//	Avoid updating it with events.
        }

        var dateString = String(+this.date),
            day = this.days && this.days[dateString] && (this.day = this.days[dateString]);

        if (!day || !this.inCurrentMonth) {
            !this.inCurrentMonth && this.clearEventDisplay();	// Remove all of this day's existing events. TODO: Reuse them instead.
            return;
        }

        this.clearEventDisplay();	// Remove all of this day's existing events. TODO: Reuse them instead.

        if (!(day.allDayEvents || day.events || day.hiddenEvents || day.hiddenAllDay)) {                // There are no events for this MonthDay or this day isn't in the current month, so:
            enyo.application.ignore({calendars: this});		//	Ignore calendars updates.
            return;											//	Avoid updating the display.
        }

        var events = [];
        events = events.concat(day.allDayEvents);
        events = events.concat(day.events);

        enyo.application.watch({calendars: this});			//	Needed by this day to respond to calendar toggles after Start Of Week changes.

        DEBUG && this.log("\tRendering [", events.length, "] events for [", this.date, "]\n\n");//, events, "\n\t");

        var calendar,
            calendars = this.calendars,
            extras = [],
            event,
            eventView = { className: "event ellipsis", watchCalendars: false, calendars: calendars },
            hasRenderContent = enyo.isFunction(eventViews.renderContent), // PERF: Enyo team deprecating more performant renderContent :-(
            maxEvents = this.maxEvents,
            numShown = 0,
            showing,
            totalEvents = events.length;

        for (var i = 0; i < totalEvents; i++) {
            event = events[i];
            calendar = calendars [event.calendarId];
            showing = calendar && calendar.on;
            if (!showing) {
                continue;
            }

            if (++numShown > (maxEvents - 1)) {
                (extras.length < 3) && extras.push({ className: "event ellipsis", event: event, watchCalendars: false, calendars: calendars });
            } else {
                eventView.event = event;
                eventViews.createComponent(eventView);
            }
        }
        if (extras.length == 1) {
            eventViews.createComponent(extras[0]);
            hasRenderContent ? eventViews.renderContent() : eventViews.render();	// PERF: Enyo team deprecating more performant renderContent :-(
            return;
        }
        var remaining = numShown - maxEvents + 1;

        if (remaining > 0) {                            // If there're more events than the maximum # to display:
            eventViews.createComponent({                //		Show a message indicating how many more aren't being shown.
                kind     : enyo.Control,
                className: "more-events ellipsis",
                content  : this.G11N.moreEvents.formatChoice(remaining, {remaining: remaining})
            });
        }
        hasRenderContent ? eventViews.renderContent() : eventViews.render();	// PERF: Enyo team deprecating more performant renderContent :-(
    },

    maxEventsChanged : function maxEventsChanged(lastMaxEvents) {
        if (!this.isActive) {
            return;
        }

        if (isFinite(this.maxEvents) && isFinite(lastMaxEvents)) {      // If the maximum number of events is valid:
            (this.maxEvents !== lastMaxEvents) && this.daysChanged();       // And has changed, refresh the day's displayed events.
        }
    },

// BEGIN :-------: Custom Methods :---------------------------------------------------------------------------------------------------------------------------//
    changeEventColor : function changeEventColor() {
        if (!this.hasClass("held")) {
            this.timerOn = false;
            this.addClass("held");
        }
    },
    resetEventColor  : function resetEventColor() {
        if (this.hasClass("held")) {
            this.timerOn = false;
            clearTimeout(this.mouseDownTimeOut);
            this.removeClass("held");
        }
    },
    clearEventDisplay: function clearEventDisplay() {
        var eventViews = this.$.eventList;
        eventViews.getComponents().length && eventViews.destroyComponents();
    }
});
