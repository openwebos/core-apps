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


/*global enyo */
/**
 * NOTE: WeekViewFrame is the container for the grid week view, and the agenda week view.

 + WeekCarousel:
 + WeekViewFrame    <------------ This module.
 + WeekHeader
 + Date Header
 + Agenda Button
 + Pane
 + WeekView
 + Day of Week Header
 + Scroller
 + Week AllDay Header
 + weekhours:
 + DayHour (24)
 + weekdays:
 + DayView (7)
 + AgendaView
 */
enyo.kind({
    name      : "calendar.week.WeekViewFrame",
    kind      : enyo.VFlexBox,
    className : "week-view",
    flex      : 1,
    published : {
        addEvent  : null, // Object	: For watching "add event" requests.
        agendaMode: null, // Boolean: For watching agendaMode changes
        calendars : null, // Object	: For watching calendar changes
        date      : null, // Date	: This week's date.
        days      : null, // Array	: For watching day-formatted Calendar Events.
        prefs     : null
    },
    components: [
        {name: "header", kind: "calendar.week.WeekHeader"},
        {name: "agendaOrWeekViewPane", kind: "Pane", transitionKind: "calendar.SimpleTransition", flex: 1, components: [
            {name: "weekView", kind: "calendar.week.WeekView", flex: 1},
            {name: "weekAgendaView", kind: "calendar.AgendaView", flex: 1, divideIntoDays: true}
        ]}
    ],

    constructor: function WeekViewFrame() {
        this.timeMachine = new Date();	// For calculating date/times without creating new instances.
        this.inherited(arguments);
        this.alwaysWatches = { agendaMode: this };
        this.watches = {
            addEvent : this,
            calendars: this,
            days     : this
        };
    },

    create: function create() {
        this.inherited(arguments);
        //this.createEventThen = enyo.bind (this, this.createEventThen);
        this.prefsChanged();
        this.broadcastMessage("isActive", [true]);
        enyo.application.watch(this.alwaysWatches);
    },

    destroy: function destroy() {
        this.broadcastMessage("isActive", [false]);
        enyo.application.ignore(this.watches);
        enyo.application.ignore(this.alwaysWatches);
        this.inherited(arguments);
    },

// BEGIN :-------: Custom Handlers :-----------------------------------------------------------------------------------------------------------------------//

    isActiveHandler: function isActiveHandler(isActive) {
        isActive && this.showingChanged();
        var handle = isActive ? "watch" : "ignore";
        enyo.application [handle](this.watches);
        this.$.weekView.broadcastMessage("isActive", [isActive]);
    },

    becameCurrentPaneHandler: function becameCurrentPaneHandler(isCurrentPane) {
        this.$.weekView.broadcastMessage("becameCurrentPane", [isCurrentPane]);
    },

// BEGIN: Published Properties Change Handlers ---------------------------------------------------------------------------------------------------------------//

    addEventChanged: function addEventChanged(lastEventAdded) {
        DEBUG && this.log("Event: ", this.addEvent);

        var eventDate = this.timeMachine,
            event = this.addEvent && this.addEvent.event,
            start = event && parseInt(event.dtstart, 10);
        this.addEvent = null;							// Clear this week's add event request.
        enyo.application.free({addEvent: true});		// Clear any kept add event data.

        eventDate.setTime(isFinite(start) ? start : (start = Date.now()));
        eventDate.clearTime();
        start = +eventDate;							    // TODO: What about events ending on this day? Handled by EventManager? No...

        var rangeStart = +this.date;
        this.timeMachine.setTime(+this.date);
        this.timeMachine.addDays(7);
        var rangeEnd = +this.timeMachine;

        if (start >= rangeStart && start < rangeEnd) {  // If the event starts within this week:
            enyo.application.share({showEvent: event});	    // Display the newly added event.
        }

    },

    agendaModeChanged: function agendaModeChanged(oldAgendaMode) {
        var agendaMode = !!this.agendaMode;
        (agendaMode != !!oldAgendaMode) && this.$.agendaOrWeekViewPane.selectViewByName(agendaMode ? "weekAgendaView" : "weekView");
    },

    calendarsChanged: function calendarsChanged(oldCalendars) {
        var days = this.days;
        if (!days) {
            return;
        }

        var day,
            allEvents = [],
            dates = [],
            timeMachine = this.timeMachine;

        timeMachine.setTime(this.date);

        for (var i = 0; i < 7; i++) {
            day = days[+timeMachine];
            dates.push(new Date(timeMachine));
            timeMachine.addDays(1);

            Array.isArray(day.allDayEvents) && (allEvents = allEvents.concat(day.allDayEvents));
            Array.isArray(day.hiddenAllDay) && (allEvents = allEvents.concat(day.hiddenAllDay));
            Array.isArray(day.events) && (allEvents = allEvents.concat(day.events));
            Array.isArray(day.hiddenEvents) && (allEvents = allEvents.concat(day.hiddenEvents));
        }
        var events = enyo.application.cacheManager.mapEventsByDate(enyo.application.cacheManager.filterEvents(allEvents, dates));
        this.setDays(events);
    },

    dateChanged: function dateChanged(oldDate) {
        var date = this.date;
        if (!date) {
            return;
        }

        this.$.header && this.$.header.setDate(this.date);
        this.$.weekView.setDate(this.date);
    },

    daysChanged: function daysChanged(oldDays) {
        var days = this.days;
        if (!days || !days[String(+this.date)]) {                    // Skip modifying child days if this week's date isn't present in the days object.
            return;
        }

        //We're getting 21 days at a time... we only want 7.
        //since agendaview shows whatever you give it, we only give it one week's worth of data
        //and it reduces the amount of work to do when assigning colors
        this.timeMachine.setTime(this.date);
        var newDays = {};
        var date;
        var view;
        for (var i = 0; i < 7; i++) {
            date = +this.timeMachine;
            newDays[date] = days[date];
            this.timeMachine.addDays(1);
        }

        Utilities.assignEventColors(newDays, this.calendars);

        this.$.weekView.setDays(newDays);
        this.$.weekAgendaView.setDays(newDays);
    },

    prefsChanged: function prefsChanged(oldPrefs) {
        var header = this.$.header,
            prefs = this.prefs || enyo.application.prefsManager.prefs;
        if (!header || !this.prefs || isNaN(this.prefs.startOfWeek)) {
            return;
        }
        this.date && header.setDate(this.date);
        header.setStartOfWeek(this.prefs.startOfWeek - 1);	// Date.getDay() is zero-based, but Calendar prefs startOfWeek is 1-based.
        this.$.weekView.setStartOfWeek(this.prefs.startOfWeek - 1);
    },

// BEGIN :-------: Custom Methods :---------------------------------------------------------------------------------------------------------------------------//

    fetchCurrentView: function fetchCurrentView() {
        var view = this.$.agendaOrWeekViewPane.getView(),
            viewName = view && view.name;
        return viewName && viewName.charAt(0).toUpperCase() + viewName.substring(1);
    }
});
