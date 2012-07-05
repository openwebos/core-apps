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
 * A list item in the agenda view.  This may represent an event, or a free-time item.
 */
enyo.kind({
    name      : "calendar.EventListItem",
    kind      : enyo.RowItem,
    className : "enyo-item event-item",
    published : {
        event     : null, // the data to display in this list item
        format    : null, // the time formatter to use
        isFreeTime: false // is this a free-time item or an event?
    },
    components: [
        {kind: enyo.HFlexBox, name: "box", components: [
            {name: "colorSwatch"},
            {name: "time", className: "label"},
            {kind: enyo.VFlexBox, components: [
                {name: "subject", className: "label"},
                {name: "location", className: "label"}
            ]}
        ]}
    ],

    create: function create() {
        this.inherited(arguments);
        this.timeMachine = new Date();
    },

    destroy: function destroy() {
        this.inherited(arguments);
    },

    eventChanged: function eventChanged(oldEvent) {
        if (!this.event) {
            return;
        }

        this.isFreeTime ? this.renderFreeTime(this.event) : this.renderEvent(this.event);

    },

    renderEvent: function renderEvent(event) {
        var formattedTime,
            ui = this.$;

        if (event.allDay) {
            formattedTime = $L("All Day");
        } else {
            this.timeMachine.setTime(event.currentLocalStart || event.dtstart);
            formattedTime = this.format.format(this.timeMachine);
        }

        ui.time.setContent(formattedTime);
        ui.subject.setContent(event.subject);
        ui.location.setContent(event.location);
        this.setItemColor(event.color);
    },

    renderFreeTime: function renderFreeTime(freeTime) {
        var hours = Math.floor(freeTime.duration / 100),
            minutes = Math.floor(Math.ceil(freeTime.duration) % 100 * .6),
            duration = Utilities.formatPeriod({hours: hours, minutes: minutes}),
            template = new enyo.g11n.Template($L("#{duration} free")),
            freeTimeLabel = template.evaluate({duration: duration}),
            ui = this.$;

        ui.box.addClass("free-time-item");
        ui.subject.setContent(freeTimeLabel);
    },

    setItemColor: function setItemColor(color) {
        var className = "theme-" + color.toLowerCase() + " legend";
        this.$.colorSwatch.setClassName(className);
    }
});


/**
 * The agenda view.
 * This shows a list of events, with options to divide the events onto separate days, and to show the free times between events.
 */

enyo.kind({
    name      : "calendar.AgendaView",
    kind      : enyo.VFlexBox,
    className : "calendar-agenda-view",
    published : {
        days          : null, // Object	: Day-formatted Calendar Events.
        is24Hr        : undefined, // Boolean	: For accepting 24hr clock mode changes.
        showFreeTime  : false, // Boolean	: whether or not to show free time between events
        divideIntoDays: false    // Boolean	: To show the events in an undivided list, or divided by date
    },
    components: [
        {name: "formatterCache", kind: "calendar.FormatterCache", onFormatsChanged: "formatTimeLabel", formats: {
            time     : {time: "short"},
            monthName: {date: "MMMM"},
            dayOfWeek: {date: "EEE"}}
        },
        {name: "agendaScroller", kind: enyo.Scroller, autoHorizontal: false, horizontal: false, flex: 1, components: [
            {name: "dateList", kind: enyo.VirtualRepeater, onSetupRow: "makeDateListItem", components: [
                {name: "divider", kind: enyo.Divider, caption: ""},
                {kind: enyo.HFlexBox, components: [
                    {name: "dateBox", kind: enyo.VFlexBox, components: [
                        {name: "dateLabel", className: "date-label"},
                        {name: "dayOfWeekLabel", className: "label"}
                    ]},
                    {name: "emptyLabel", content: $L("Nothing planned! Free day! Oh, the possibilities!"), showing: false, className: "empty-day-label"},
                    {name: "eventList", flex: 1, kind: enyo.VirtualRepeater, onSetupRow: "makeEventListItem", className: "event-list", components: [
                        {kind: "calendar.EventListItem", name: "item", onclick: "eventClicked"}
                    ]}
                ]}

            ]}
        ]}
    ],

    create: function create() {
        this.inherited(arguments);
        this.timeMachine = new Date();
    },

    destroy: function destroy() {
        this.inherited(arguments);
    },

// BEGIN: Published Properties Change Handlers ---------------------------------------------------------------------------------------------------------------//

    daysChanged: function daysChanged() {
        this.createDatesArray(this.days);
        this.createEventsArray(this.days);
        this.$.dateList.render();
    },

    is24HrChanged: function is24HrChanged() {
        this.$.formatterCache.formatsChanged();	// Clear the cached formatters so that they can be rebuilt.
    },

// BEGIN: Event Handlers ---------------------------------------------------------------------------------------------------------------//

    eventClicked: function eventClicked(inSender) {
        var eventIndex = this.$.eventList.fetchRowIndex(),
            dateIndex = this.$.dateList.fetchRowIndex(),
            eventOrFreeTime = this.eventsArray[dateIndex][eventIndex];

        if (eventOrFreeTime.isFreeTime) {
            var freeTime = eventOrFreeTime,
                hour = Math.floor(freeTime.start_decimal / 100),
                minutes = Math.floor(freeTime.start_decimal % 100 * .6),
                defaultEventDuration = enyo.application.prefsManager.prefs.defaultEventDuration,
                freeDurationInMinutes = Math.ceil(freeTime.duration * .6),
                dtstart,
                dtend;

            this.timeMachine.setTime(this.datesArray[dateIndex]);
            this.timeMachine.setHours(hour);
            this.timeMachine.setMinutes(minutes);
            dtstart = +this.timeMachine;

            //If the free time block is less than the user's default event duration, use the free time, otherwise use the default.
            minutes = Math.min(freeDurationInMinutes, defaultEventDuration);
            this.timeMachine.addMinutes(minutes);
            dtend = +this.timeMachine;

            var createEvent = {
                event   : {dtstart: dtstart, dtend: dtend},
                keepTime: true,
                then    : enyo.bind(this, this.createEventThen)
            };
            enyo.application.share({createEvent: createEvent});					// Request event creation.
        }
        else {
            var event = JSON.parse(JSON.stringify(eventOrFreeTime));
            enyo.application.share({showEvent: event});
        }
    },


// BEGIN :-------: Custom Methods :---------------------------------------------------------------------------------------------------------------------------//

    createEventThen: function createEventThen(event) {
        if (!event) {
            this.error("Failed to create event GUI using event [", event, "]");
            return;
        }

        enyo.application.share({showEvent: event});		// Request showing the event.
    },

    formatTimeLabel : function formatTimeLabel() {
        this.$.eventList.render();
    },

    /*
     * Take the days object formatted:
     {	timestampAsString1: {events: [], allDayEvents: [], ...},
     timestampAsString2: {events: [], allDayEvents: [], ...},
     ...
     }
     and produce an array: [timestamp1, timestamp2, timestamp3, ...]
     We need this so we can easily tie a date to an index and use it with the VirtualRepeater.
     */
    createDatesArray: function makeDatesArray(days) {
        var dates = [];
        var sameMonth = true;
        for (var day in days) {
            if (days.hasOwnProperty(day)) {
                dates.push(Number(day));
            }
        }
        this.datesArray = dates;
    },

    sortByStartDecimal: function sortByStartDecimal(a, b) {
        if (a.start_decimal < b.start_decimal) {
            return -1;
        }
        if (a.start_decimal > b.start_decimal) {
            return 1;
        }
        return 0;
    },

    markFreeTimes    : function markFreeTimes(freeTimes) {
        var length = freeTimes.length;
        for (var i = 0; i < length; i++) {
            freeTimes[i].isFreeTime = true;
        }
    },

    /*
     * The agenda view shows a chronological list of all day events, followed by timed events,
     * possibly interspersed with free time items.  Since we're using a VirtualRepeater, we need
     * an ordered array of all these things together, so we can access it via index number.
     * This function takes the days object formatted:
     *	{	date1: {events: [], allDayEvents: [], ...},
     *	 	date2: {events: [], allDayEvents: [], ...},
     *	 	...
     *	}
     *  and produces an array: [ [date1_allDayEvents + date1_events (+ date1_freetimes_optional)], [date2_allDayEvents + date2_events (+ date2_freetimes_optional) ], ...]
     */
    createEventsArray: function makeEventsArray(days) {
        var allEvents = [],
            dayEvents,
            day,
            temp;

        for (var date in days) {
            day = days[date];
            dayEvents = [];
            if (this.showFreeTime) {
                //mark each free time as such, so we can tell it apart from an event
                this.markFreeTimes(day.freeTimes);

                //interleave the events and free times
                temp = [];
                temp = day.events.concat(day.freeTimes);
                temp.sort(this.sortByStartDecimal);

                //stick this day's events and free times together into one big array
                dayEvents = day.allDayEvents.concat(temp);
            }
            else {
                dayEvents = day.allDayEvents.concat(day.events);
            }

            allEvents.push(dayEvents);
        }
        this.eventsArray = allEvents;
    },

    /* Create the outer date list item:
     * date1 <---------------------
     *  -- event1
     *  -- event2
     * date2
     *  -- event1
     */
    makeDateListItem : function makeDateListItem(inSender, inIndex) {
        var dates = this.datesArray,
            date = dates && (inIndex < dates.length) && dates[inIndex],
            ui = this.$,
            tm = this.timeMachine,
            formatter;

        if (!date) {
            return;
        }

        this.eventsList = this.eventsArray[inIndex];
        ui.emptyLabel.setShowing(this.eventsList && this.eventsList.length == 0);

        if (this.divideIntoDays) {
            tm.setTime(date);
            formatter = ui.formatterCache.getFormatter("dayOfWeek");
            var dow = formatter.format(tm);
            ui.dateLabel.setContent(tm.getDate());
            ui.dayOfWeekLabel.setContent(dow);

            //Check if we changed months between any of the date list items.  If so,
            //Set the month name as the caption on the divider.
            if (inIndex > 0) {
                var month,
                    lastMonth;
                tm.setTime(dates[inIndex - 1]);
                lastMonth = tm.getMonth();

                tm.setTime(date);
                month = tm.getMonth();

                if (month != lastMonth) {
                    formatter = ui.formatterCache.getFormatter("monthName");
                    var monthName = formatter.format(tm);
                    ui.divider.setCaption(monthName);
                }
            }
        } else {
            //Don't want to be divided by days?  Hide the divider and date indicator.
            ui.divider.setShowing(false);
            ui.dateBox.setShowing(false);
        }

        return true;

    },

    /* Create the inner list item that may represent an event or a free-time item
     * date1
     *  -- event1 <---------------------
     *  -- freeTime2
     *  -- event 3
     *
     */
    makeEventListItem: function makeEventListItem(inSender, inIndex) {
        var events = this.eventsList,
            eventOrFreeTime = events && (inIndex < events.length) && events [inIndex],
            ui = this.$,
            formatter = ui.formatterCache.getFormatter("time");

        if (!eventOrFreeTime) {
            return;
        }

        ui.item.setFormat(formatter);
        ui.item.setIsFreeTime(eventOrFreeTime.isFreeTime);
        ui.item.setEvent(eventOrFreeTime);

        return true;
    }
});
