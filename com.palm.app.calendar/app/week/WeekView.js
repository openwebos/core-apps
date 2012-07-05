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
 NOTE: WeekView is the visual representation of a week (i.e. 7 days).

 + WeekCarousel:
 + WeekViewFrame
 + WeekHeader
 + Date Header
 + Agenda Button
 + Pane
 + WeekView         <------------ This module.
 + Day of Week Header
 + Scroller
 + Week AllDay Header
 + weekhours:
 + DayHour (24)
 + weekdays:
 + DayView (7)
 + AgendaView

 TODO: Create base component for Day and Week views to inherit from.
 */
enyo.kind({
    name      : "calendar.week.WeekView",
    kind      : enyo.VFlexBox,
    //className	: "week-view",
    flex      : 1,
    published : {
        clock      : null,      // Date		: For watching time changes.
        date       : null,      // Date		: This week's date.
        days       : null,      // Array	: Day-formatted Calendar Events.
        is24Hr     : undefined, // Boolean	: For accepting 24hr clock mode changes.
        startOfWeek: 0          // Number	: The first day (0:Sunday -> 6:Saturday) of this week.
    },
    G11N      : {
        Events   : $L("Events:"),
        HeaderFmt: new enyo.g11n.DateFmt({date: "medium", dateComponents: "d", weekday: true})
    },
    components: [
        {name: "dayHeader", className: "days-header", kind: enyo.HFlexBox, components: [
            {name: "dayLabel0", className: "day", align: "center", pack: "center", flex: 1},
            {name: "dayLabel1", className: "day", align: "center", pack: "center", flex: 1},
            {name: "dayLabel2", className: "day", align: "center", pack: "center", flex: 1},
            {name: "dayLabel3", className: "day", align: "center", pack: "center", flex: 1},
            {name: "dayLabel4", className: "day", align: "center", pack: "center", flex: 1},
            {name: "dayLabel5", className: "day", align: "center", pack: "center", flex: 1},
            {name: "dayLabel6", className: "day", align: "center", pack: "center", flex: 1}
        ]},
        {name: "weekHours", className: "week-hours", kind: enyo.Scroller, flex: 1, autoHorizontal: false, horizontal: false, vertical: true, components: [
            {name: "weekContainer", className: "week-container", kind: enyo.Control, components: [
                {name: "allDayContainer", className: "allday-header", kind: enyo.HFlexBox, components: [
                    {name: "allDayLabel", className: "label enyo-text-ellipsis events-header"}
                ]},
                {name: "hourLabels", className: "hours", kind: "calendar.day.DayHours"},
                {name: "week", className: "days enyo-fit", kind: HJSFlex, defaultKind: "calendar.day.DayView"}
            ]}
        ]}
    ],

    constructor: function WeekView() {
        this.timeMachine = new Date();	// For calculating date/times without creating new instances.
        this.inherited(arguments);

        this.watches = {
            clock : this,
            is24Hr: this
        };
    },

    create: function create() {
        this.inherited(arguments);

        this.is24Hr === undefined && this.setIs24Hr(!enyo.application.fmts.isAmPm());	// If 24Hr isn't set yet, grab the current setting.

        var ui = this.$;
        ui.allDayLabel.setContent(this.G11N.Events);

        this.layoutManager = enyo.application.layoutManager;
        this.weekdays = [];

        for (var week = ui.week, i = 0; i < 7; i++) {
            this.weekdays[i] = week.createComponent({
                flex      : 1,
                inWeekView: true,
                owner     : this
            });
        }
        this.broadcastMessage("isActive", [true]);
    },

    destroy: function destroy() {
        this.broadcastMessage("isActive", [false]);
        this.inherited(arguments);
    },

// BEGIN :-------: Custom Handlers :-----------------------------------------------------------------------------------------------------------------------//

    becameCurrentPaneHandler: function becameCurrentPaneHandler(isCurrentPane) {
        this.$.week && this.$.week.broadcastMessage("becameCurrentPane", [isCurrentPane]);
    },

    isActiveHandler: function isActiveHandler(isActive) {
        isActive && this.showingChanged();
        var handle = isActive ? "watch" : "ignore";
        enyo.application [handle](this.watches);
        this.$.week && this.$.week.broadcastMessage("isActive", [isActive]);
    },

// BEGIN: Published Properties Change Handlers ---------------------------------------------------------------------------------------------------------------//

    clockChanged: function clockChanged(oldClock) {
        this.updateCurrentHour();
    },

    dateChanged: function dateChanged(oldDate) {
        var date = this.date;
        if (!date) {
            return;
        }

        var weekdays = this.weekdays;

        var timeMachine = this.timeMachine;
        timeMachine.setTime(+this.date);

        for (var i = 0; i < 7; i++) {
            weekdays[i].setDate(new Date(timeMachine).addDays(i).clearTime());
        }
        this.startOfWeekChanged();
        this.updateCurrentHour({scroll: true});
    },

    daysChanged: function daysChanged(oldDays) {
        var days = this.days;
        if (!days || !days[String(+this.date)]) {                    // Skip modifying child days if this week's date isn't present in the days object.
            return;
        }

        var weekdays = this.weekdays;
        this.timeMachine.setTime(this.date);
        var dateString,
            oneDay,
            day,
            maxAllDay = 0;
        for (var i = 0; i < 7; i++) {
            dateString = +this.timeMachine.getTime();
            day = this.days[dateString];
            maxAllDay = Math.max(maxAllDay, day.allDayEvents.length);
            this.layoutManager.positionEvents(day.events, {overlap: true});
            oneDay = {};
            oneDay[dateString] = day;
            weekdays[i].setDays(oneDay);
            this.timeMachine.addDays(1);
        }

        //TODO: We need to resize the all day header to show 1, 2 or 3 events (and then scroll vertically).  This was the
        //first hacky attempt.
//		var height;
//		switch(maxAllDay){
//			case 0:
//			case 1:
//				height = "35px";
//				break;
//			case 2:
//				height = "60px";
//				break;
//			default:
//				height = "95px";
//				break;
//
//		}
//		this.$.allDayContainer.applyStyle("max-height", height);
//		this.$.allDayContainer.applyStyle("height", height);
    },

    is24HrChanged: function is24HrChanged(was24Hr) {
        var is24Hr = this.is24Hr = !!this.is24Hr;		    // Ensure is24Hr is a boolean value.
        if (was24Hr !== undefined && is24Hr == was24Hr) {   // 24Hr mode was previously defined and still has the same value:
            return;											    //	So do nothing.
        }
        this.$.hourLabels.setIs24Hr(is24Hr);
    },

    showingChanged: function showingChanged(wasShowing) {
        this.inherited(arguments);
        this.showing && this.updateCurrentHour({scroll: true});
    },

    startOfWeekChanged: function startOfWeekChanged(oldStartOfWeek) {
        if (this.startOfWeek === oldStartOfWeek) {
            return;
        }
        var date = this.timeMachine;
        date.setTime(Date.now());
        var today = +date.clearTime();
        date.setTime(this.date);

        var name,
            day,
            ui = this.$;

        for (var i = 0; i < 7; i++) {
            name = "dayLabel" + i;
            day = ui[name];
            day.setContent(this.G11N.HeaderFmt.format(date));
            day.date = +date; // For the clickHandler
            (day.date == today) ? day.addClass("todayDate") : day.removeClass("todayDate");
            date.addDays(1);
        }
    },

// BEGIN: Custom Methods -------------------------------------------------------------------------------------------------------------------------------------//

    updateCurrentHour: function updateCurrentHour(options) {
        /*	Update the now indicator for the currently displayed day or hide it
         if today is not the currently viewed day.
         options?:	{scroll?:Boolean}
         */
        if (!this.showing) {
            return;
        }

        var now = new Date(),
            weekDate = +(this.date || +now),
            currentHour = now.getHours(), // Store the actual current hour.
            timeMachine = this.timeMachine,
            ui = this.$,
            hourLabels = ui.hourLabels.hours;

        timeMachine.setTime(weekDate);
        timeMachine.addDays(7).addSeconds(-1);

        now = +now;

        var isToday = (now >= weekDate && now <= +timeMachine);					// Store whether this week contains today.

        isFinite(this.currentHour) && hourLabels[this.currentHour].setIsCurrentHour(false);	// Clear the now indicator if this week doesn't contain today or the current hour is wrong.
        isToday && hourLabels[currentHour].setIsCurrentHour(true);				// If this week contains today, update the now (current hour) indicator.
        this.currentHour = currentHour;

        if (options && options.scroll) {
            (currentHour > 0) && (--currentHour);
            currentHour = Math.min(currentHour, 17); 							// Can't scroll past 4pm anyway
            var top = hourLabels [currentHour].hasNode();
            isFinite(top && (top = top.offsetTop)) && ui.weekHours.setScrollTop(top);			// Scroll to the hour before the current hour.
        }
    }
});
