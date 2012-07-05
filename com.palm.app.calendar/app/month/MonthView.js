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
 NOTE: calendar.MonthView is the Calendar app's Month View.

 **/
enyo.kind({
    name      : "calendar.month.MonthView",
    className : "month",
    kind      : enyo.VFlexBox,
    published : {
        addEvent    : null, // Object	: For watching "add event" requests.
        date        : null, // Date		: This month's date.
        days        : null, // Object	: For watching day events.
        range       : null, // Object	: {start:Number, end:Number}: This month's start and end timestamps.
        startOfWeek : 0,    // Number	: The zero-based start of the week.
        visibleWeeks: 6     // Number	: Number of weeks to show per Month view.
    },
    G11N      : {
        fmts: new enyo.g11n.Fmts()
    },
    components: [
        {name: "header", kind: "calendar.month.MonthHeader"},
        {name: "month", className: "weeks", kind: enyo.VFlexBox, defaultKind: "calendar.month.MonthWeek", flex: 1}
    ],

    constructor: function MonthView() {
        this.inherited(arguments);

        this.timeMachine = new Date();
        this.weeks = [];
        this.monthDays = [];
    },

    create: function create() {
        this.inherited(arguments);

        // TODO: g11n - modify this when we support different calendar types
        for (var i = 0; i < this.visibleWeeks; i++) {
            this.weeks.push(this.$.month.createComponent({
                name : "week" + i,
                owner: this
            }));
        }
        this.broadcastMessage("isActive", [true]);
    },

    destroy: function destroy() {
        this.broadcastMessage("isActive", [false]);
        enyo.application.ignore({ addEvent: this, days: this });
        this.inherited(arguments);
    },

// BEGIN :-------: Custom Handlers :-----------------------------------------------------------------------------------------------------------------------//

    isActiveHandler: function isActiveHandler(isActive) {
        enyo.application [isActive ? "watch" : "ignore"]({ addEvent: this, days: this });
        this.$.month.broadcastMessage("isActive", [isActive]);
    },

// BEGIN :-------: Published Property Handlers :--------------------------------------------------------------------------------------------------------------//

    addEventChanged: function addEventChanged(lastEventAdded) {
        DEBUG && this.log("Event: ", this.addEvent);
        var now = +enyo.application.currentDate,
            range = this.range,
            isCurrent = !!(range && range.start <= now && range.end > now);

        if (!isCurrent) {
            return;
        }

        var event = this.addEvent && this.addEvent.event;
        this.addEvent = null;							// Clear this day's add event request.
        enyo.application.free({addEvent: true});		// Clear any kept add event data.
        enyo.application.share({showEvent: event});     // Display the newly added event.
    },

    dateChanged: function dateChanged(oldDate) {
        var date = this.date,
            offset = (date.getDay() + 7 - this.startOfWeek) % 7,
            firstDate = new Date(date).addDays(-offset),
            timeMachine = this.timeMachine,
            weeks = this.weeks;

        this.$.header.setDate(date);

        for (var i = 0, w = weeks.length; i < w; ++i) {
            timeMachine.setTime(firstDate);
            timeMachine.addDays(7 * i);
            weeks[i].monthDate.setTime(date);		// Reuse the month week's existing Date object.
            weeks[i].date.setTime(timeMachine);     // Reuse the month week's existing Date object.
            weeks[i].dateChanged();					// Inform the monthWeek of the change.
        }
    },

    daysChanged: function daysChanged(oldDays) {
        var days = this.days;
        if (!days || !days[String(+this.date)]) {                    // Skip modifying child days if this month's date isn't present in the days object.
            return;
        }
        var weeks = this.weeks;

        for (var i = 0, numWeeks = weeks.length; i < numWeeks; i++) {
            weeks[i].setDays(days);
        }
    },

    startOfWeekChanged: function startOfWeekChanged(lastStartOfWeek) {
        var header = this.$.header;
        if (!this.showing || (this.startOfWeek == header.startOfWeek)) {    // If this view isn't showing or the start of week hasn't changed:
            return;															//	Avoid updating its display.
        }
        header.setStartOfWeek(this.startOfWeek);							// Reset each month week's start of week.
    }

// BEGIN :-------: Custom Methods :---------------------------------------------------------------------------------------------------------------------------//
});
