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


enyo.kind({
    name      : "calendar.day.DayViewFrame",
    className : "day",
    kind      : enyo.VFlexBox,
    published : {
        addEvent  : null, // Object	: For watching "add event" requests.
        agendaMode: false,// Boolean: For watching agendaMode changes
        calendars : null, // Object	: For watching calendar changes
        date      : null, // Date	: This day's date.
        days      : null  // Object	: For watching day-formatted Calendar Events.
    },
    G11N      : {
        DateFormat: {
            "short": new enyo.g11n.DateFmt({date: "medium", weekday: true}),
            full   : new enyo.g11n.DateFmt({date: "full"})
        },
        Today     : $L("Today")
    },
    components: [
        {name: "header", className: "header", kind: enyo.HFlexBox, components: [
            {name: "dateHeader", kind: "calendar.DateHeader", flex: 1},
            {name: "today", className: "today", showing: false},
            {name: "agendaButton", kind: enyo.CustomButton, toggling: true, caption: $L("Agenda"), onclick: "toggleAgendaMode", width: "100px", className: "enyo-button today"}
        ]},
        {name: "agendaOrDayViewPane", kind: "Pane", transitionKind: "calendar.SimpleTransition", flex: 1, components: [
            {name: "dayView", kind: "calendar.day.DayView", flex: 1},
            {name: "dayAgendaView", kind: "calendar.AgendaView", flex: 1, showFreeTime: true, divideIntoDays: false}
        ]}
    ],

    constructor: function DayViewFrame() {
        this.timeMachine = new Date();		// For calculating date/times without creating new instances.
        this.date = new Date();				// Creating a date for reuse (instead of using setDate() outside of the view.

        this.inherited(arguments);

        this.alwaysWatches = { agendaMode: this };
        this.watches = {
            addEvent : this, // Object	: For watching "add event" requests.
            calendars: this, // Object	: For watching calendar changes.
            days     : this  // Array	: For watching event updates formatted "by day".
        };
    },

    create: function create() {
        this.inherited(arguments);

        this.createEventThen = enyo.bind(this, this.createEventThen);
        this.layoutManager = enyo.application.layoutManager;
        this.busyFreeMgr = enyo.application.busyFreeManager

        this.$.dateHeader.setFormats(this.G11N.DateFormat);
        this.$.today.setContent(this.G11N.Today);		// Update the "Today" indicator.
        this.broadcastMessage("isActive", [true]);		// Already would've been activated by WeekView.
        enyo.application.watch(this.alwaysWatches);
    },

    destroy: function destroy() {
        this.broadcastMessage("isActive", [false]);
        enyo.application.ignore(this.watches);
        enyo.application.ignore(this.alwaysWatches);
        this.inherited(arguments);
    },

// BEGIN :-------: Custom Handlers :--------------------------------------------------------------------------------------------------------------------------//

    isActiveHandler: function isActiveHandler(isActive) {   // TODO: FIX: This is being double-called on DayCarousel.destroy()
        var handle = isActive ? "watch" : "ignore";
        isActive && this.showingChanged();
        enyo.application [handle](this.watches);
        this.$.dayView.broadcastMessage("isActive", [isActive]);			// Notify all-day events of active state.
    },

    becameCurrentPaneHandler: function becameCurrentPaneHandler(isCurrentPane) {
        this.$.dayView.broadcastMessage("becameCurrentPane", [isCurrentPane]);
    },


// BEGIN :-------: Published Property Handlers :--------------------------------------------------------------------------------------------------------------//

    addEventChanged: function addEventChanged(lastEventAdded) {
        DEBUG && this.log("Event: ", this.addEvent);

        var eventDate = this.timeMachine,
            event = this.addEvent && this.addEvent.event,
            show = !!(this.addEvent && this.addEvent.show),
            start = event && parseInt(event.dtstart, 10);
        this.addEvent = null;							// Clear this day's add event request.
        enyo.application.free({addEvent: true});		// Clear any kept add event data.

        eventDate.setTime(isFinite(start) ? start : (start = Date.now()));
        var hour = eventDate.getHours();

        eventDate.clearTime();
        start = +eventDate;                             // TODO: What about events ending on this day? Handled by EventManager? No...

        if (+start == +this.date) {                     // If the event starts on this day:
            this.createEventThen(hour, show, event);	    //	create its GUI.
        }
    },

    agendaModeChanged: function agendaModeChanged(oldAgendaMode) {
        var agendaMode = !!this.agendaMode;
        (agendaMode != !!oldAgendaMode) && this.$.agendaOrDayViewPane.selectViewByName(agendaMode ? "dayAgendaView" : "dayView");
        this.$.agendaButton.setDepressed(this.agendaMode);
    },

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
        var date = this.date;
        if (!date) {
            return;
        }

        this.day = undefined;
        this.$.dateHeader.setDate(new Date(date));
        this.$.dayView.setDate(date);
    },

    daysChanged: function daysChanged(oldDays) {
        var dateString = String(+this.date),
            day = this.days && this.days[dateString] && (this.day = this.days[dateString]);

        if (!this.showing || !day) {
            DEBUG && this.warn("\tNo event updates available for: ", this.date, "\t");
            return;
        }

        DEBUG && this.log("\tRequest rendering events for day: ", this.date, "...:\n\n\t");//, days, "\n\n\t");

        this.layoutManager.positionEvents(day.events, {overlap: true});

        day.busyTimes = this.busyFreeMgr.getBusyTimes(day.events,
            undefined,  //Events belonging to hidden calendars should already be excluded, so no need to pass in excludedCalendars
            true);		//Need to use the true_*_decimals on each event to get accurate busyTimes, and then accurate freeTimes.
        day.freeTimes = this.busyFreeMgr.getFreeTimes(day.busyTimes, 0, 0); //We have no minEventHeight or minFreeSize, but we don't want defaults. Get all free time.

        //since agendaview shows whatever you give it, we only give it one day's worth of data
        //and it reduces the amount of work to do when assigning colors
        var thisDay = {};
        thisDay[dateString] = day;

        Utilities.assignEventColors(thisDay, this.calendars);
        this.$.dayAgendaView.setDays(thisDay);
        this.$.dayView.setDays(thisDay);
    },

// BEGIN :-------: Custom Methods :---------------------------------------------------------------------------------------------------------------------------//

    createEventThen: function createEventThen(hour, show, event) {
        if (!event) {
            this.error("\tFailed to create event GUI using event [", event, "] and hour [", hour, "].\t");
            return;
        }

        var eventGUI;
        if (event.allDay) {
            eventGUI = this.$.allDayHeader.createComponent({event: event});		//	create an all-day event GUI
        }
        else {
            eventGUI = event;
        }
        show && eventGUI && enyo.application.share({showEvent: eventGUI});		// Request showing the event.
    },

    fetchCurrentView: function fetchCurrentView() {
        var view = this.$.agendaOrDayViewPane.getView(),
            viewName = view && view.name;
        return viewName && viewName.charAt(0).toUpperCase() + viewName.substring(1);
    },

    isToday: function isToday(date, today) {
        !date && (date = this.date);
        !today && (today = (this.timeMachine.setTime(Date.now()), this.timeMachine));
        var isToday = !!(date && (+date.clearTime() == +today.clearTime()));
        if (!this.currentIsToday || this.currentIsToday != isToday) {
            var ui = this.$;
            this.currentIsToday = isToday;
            ui.today.setShowing(isToday);
            ui.dateHeader.checkFormatFit();
        }
        ui.dayView.setIsToday(isToday);
        return isToday;
    },

    toggleAgendaMode: function toggleAgendaMode(inSender) {
        enyo.application.share({agendaMode: !this.agendaMode}, {keep: true});
    }
});
