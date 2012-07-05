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
 TODO: FIX: enyo.Scroller::destroyComponents destroys .scroll component which then causes errors on .render()!
 - Workaround it by wrapping the .destroyComponents target in a Scroller.
 TODO: PLAN: Integrate LayoutManager for proper event layout (i.e. adjacency grouping & earliest to left).
 TODO: PLAN: Scroll day after loading events; if not today scroll to 1 hr. before the earliest event.

 */
enyo.kind({
    name      : "calendar.day.DayView",
    className : "day",
    kind      : enyo.VFlexBox,
    published : {
        calendars : null,
        clock     : null,       // Date		: For observing clock changes.
        date      : null,       // Date		: This day's date.
        days      : null,       // Object	: Day-formatted Calendar Events.
        inWeekView: false,      // Boolean	: Whether this view is being used within weekView.
        is24Hr    : undefined,  // Boolean	: For accepting 24hr clock mode changes.
        isToday   : false
    },
    G11N      : {
        Events: $L("Events:")
    },
    components: [
        {name: "allDayContainer", className: "allday-header", kind: enyo.HFlexBox, showing: false, components: [
            {name: "allDayLabel", className: "label"},
            {kind: enyo.Scroller, name: "allDayScroller", flex: 1, components: [
                {name: "allDayHeader", defaultKind: "calendar.day.AllDayEvent", onclick: "createAllDayEvent"}
            ]}
        ]}
    ],

    constructor: function DayView() {
        this.timeMachine = new Date();      // For calculating date/times without creating new instances.
        this.date = new Date();             // Creating a date for reuse (instead of using setDate() outside of the view.

        this.inherited(arguments);

        this.watches = {
            clock: this        // Date		: For watching the system clock's time changes.
        };
    },

    create: function create() {
        this.inherited(arguments);

        this.is24Hr === undefined && this.setIs24Hr(!enyo.application.fmts.isAmPm());	// If 24Hr isn't set yet, grab the default setting.

        this.updateCurrentHour = enyo.bind(this, this.updateCurrentHour);

        this.createDay();

        var ui = this.$;

        if (this.inWeekView) {
            ui.allDayLabel.destroy();
            ui.allDayHeader.setLayoutKind(enyo.VLayout);
            ui.allDayScroller.setAutoVertical(true);
            ui.allDayScroller.setAutoHorizontal(true);
            ui.allDayContainer.applyStyle("height", "100%");
        }
        else {
            ui.allDayLabel.setContent(this.G11N.Events);	// Show the all-day "Events:" label.
            ui.allDayHeader.setLayoutKind(enyo.HLayout);
            ui.allDayScroller.setVertical(false);
            this.broadcastMessage("isActive", [true]);		// Already would've been activated by WeekView.
        }
    },

    destroy: function destroy() {
        this.broadcastMessage("isActive", [false]);
        this.inherited(arguments);
    },

// BEGIN :-------: Custom Handlers :--------------------------------------------------------------------------------------------------------------------------//

    childrenNeedResizeHandler: function childrenNeedResizeHandler(resizeNeeded) {
        this.broadcastMessage("childNeedsResize", [resizeNeeded]);
    },

    becameCurrentPaneHandler: function becameCurrentPaneHandler(isCurrentPane) {
        this.eventGroup && this.eventGroup.broadcastMessage("becameCurrentPane", [isCurrentPane]);
    },

    isActiveHandler: function isActiveHandler(isActive) {                        // TODO: FIX: This is being double-called on DayCarousel.destroy()
        var handle = isActive ? "watch" : "ignore";

        isActive && this.showingChanged();
        this.inWeekViewChanged(this.inWeekView);	// We aren't changing whether we are in week view or not but inWeekViewChanged checks to see if this has changed, so pass in the current variable.

        enyo.application [handle](this.watches);
        this.$.allDayHeader.broadcastMessage("isActive", [isActive]);			// Notify all-day events of active state.
    },

    is24HrHandler: function is24HrHandler(is24Hr) {
        this.setIs24Hr(is24Hr);
        if (!this.inWeekView) {
            this.$.hourLabels.broadcastMessage("is24Hr", [is24Hr]);			// Pass the message on to the hour labels.
        }
    },

// BEGIN :-------: Published Property Handlers :--------------------------------------------------------------------------------------------------------------//

    clockChanged: function clockChanged(oldClock) {
        this.updateCurrentHour({scroll: false});		// Don't scroll when the hour changes; user may want to stay on the specific date and/or time. TODO: Auto-scroll preference?
    },

    dateChanged: function dateChanged(oldDate) {
        var date = this.date;
        if (!date) {
            return;
        }

        this.days = undefined;
        this.eventGroup.setDate(new Date(date));
        this.clearEventDisplay();

        if (!this.inWeekView) {
            this.updateCurrentHour({scroll: true});
        }
    },

    daysChanged: function daysChanged(oldDays) {
        var day = this.days && this.days[+this.date];

        if (!this.showing || !day) {
            DEBUG && this.warn("\tNo event updates available for: ", this.date, "\t");
            return;
        }
        DEBUG && this.log("\tRequest rendering events for day: ", this.date, "...:\n\n\t");//, days, "\n\n\t");

        this.updateHours({allDayEvents: day.allDayEvents, events: day.events});
    },

    inWeekViewChanged: function inWeekViewChanged(wasInWeekView) {
        this.showing && this.$.allDayContainer && this.$.allDayContainer.setShowing(!!this.inWeekView);	// Always show all-day header if in Week View.
    },

    showingChanged: function showingChanged(wasShowing) {
        this.inherited(arguments);
        if (this.showing) {
            this.updateCurrentHour({scroll: true});
            this.daysChanged();
        }
    },

// BEGIN :-------: Custom Methods :---------------------------------------------------------------------------------------------------------------------------//

    clearEventDisplay: function clearEventDisplay() {
        this.updateHours({allDayEvents: [], events: []});
    },

    createDay: function createDay() {
        var inWeekView = this.inWeekView,
            hourContainer = inWeekView ? {kind: enyo.Control} : {kind: enyo.Scroller, horizontal: false, vertical: true},
            hoursContainer,
            is24Hr = this.is24Hr;
        hourContainer.className = "hours";
        hourContainer.name = "hours";
        hourContainer.flex = 1;

        hourContainer = this.createComponent(hourContainer);

        this.inWeekView && (hoursContainer = hourContainer);

        if (!inWeekView) {
            var dayContainer = hourContainer.createComponent({name: "dayContainer", kind: enyo.HFlexBox, className: "day-container"}),
                hourLabels = dayContainer.createComponent({name: "hourLabels", kind: "calendar.day.DayHours", owner: this, is24Hr: is24Hr});	// Build hour labels with the retained 24hr setting.

            hoursContainer = dayContainer.createComponent({name: "hoursContainer", kind: enyo.Control, style: "height: 1440px; position: relative;", flex: 1});
        }

        this.eventGroup = hoursContainer.createComponent({
            kind : "calendar.day.DayEventGroup",
            flex : 1,
            style: "position: relative; height: 1440px;",
            owner: this,
            edge : inWeekView ? "none" : "default"
        });
    },

    createAllDayEvent: function createAllDayEvent(from, domEvent) {
        if (!this.createAllDayEvent.then) {
            this.createAllDayEvent.then = enyo.bind(this, this.createEventThen, null, true);
        }
        var createEvent = {
            event: {allDay: true, dtstart: +this.date},
            then : this.createAllDayEvent.then
        };
        enyo.application.share({createEvent: createEvent});	// Request event creation.
        return true;
    },

    createEventThen: function createEventThen(hour, show, event) {
        if (!event) {
            this.error("\tFailed to create event GUI using event [", event, "] and hour [", hour, "].\t");
            return;
        }

        var eventGUI;
        if (event.allDay) {
            eventGUI = this.$.allDayHeader.createComponent({event: event});					//	create an all-day event GUI
        }
        else {
            eventGUI = event;
        }
        show && eventGUI && enyo.application.share({showEvent: eventGUI});		// Request showing the event.
    },

    updateCurrentHour: function updateCurrentHour(options) {
        /*	Update the now indicator for the currently displayed day or hide it
         if today is not the currently viewed day.
         options?:	{scroll?:Boolean}
         */
        if (!this.showing || this.inWeekView || !this.$.hourLabels) {
            return;
        }

        var dayDate = new Date(this.date || Date.now()), // Copy date to avoid external side-effects .
            now = new Date(),
            currentHour = now.getHours(), // Store the actual current hour.
            isToday = this.isToday,
            ui = this.$,
            hourLabels = ui.hourLabels && ui.hourLabels.hours;

        isFinite(this.currentHour) && hourLabels[this.currentHour].setIsCurrentHour(false); // Clear the now indicator if this isn't today or the current hour is wrong.
        isToday && hourLabels[currentHour].setIsCurrentHour(true);				// If this day is today, update the now (current hour) indicator.
        this.currentHour = currentHour;

        if (options && options.scroll) {
            (currentHour > 0) && (--currentHour); 								// Scroll to the hour before the current hour.
            currentHour = Math.min(currentHour, 17); 							// Can't scroll past 4pm anyway
            var top = 59 * currentHour;
            isFinite(top) && ui.hours.setScrollTop(top);
        }
    },

    groupSort: function groupSort(a, b) {
        if (a.group_id < b.group_id) {
            return -1;
        }
        if (a.group_id > b.group_id) {
            return 1;
        }
        if (a.group_id == b.group_id) {
            if (a.overlap_index < b.overlap_index) {
                return -1;
            }
            if (a.overlap_index > b.overlap_index) {
                return 1;
            }
            if (a.overlap_index == b.overlap_index) {
                if (a.start_decimal < b.start_decimal) {
                    return -1;
                }
                if (a.start_decimal > b.start_decimal) {
                    return 1;
                }
                if (a.start_decimal == b.start_decimal) {
                    if (a.end_decimal < b.end_decimal) {
                        return 1;
                    }
                    if (a.end_decimal > b.end_decimal) {
                        return -1;
                    }
                }
            }
        }

        return 0;
    },

    updateHours: function updateHours(events) {
        /* Changes the events displayed in the day's hours:
         events	: Object	: A collection of events mapped by their ids.
         */
        if (!events) {
            this.error("\tUnable to render the day using the invalid events available:\n\n\t", events, "\n\n\t");
            return;
        }

        var control,
            event,
            allDayHeader = this.$.allDayHeader,
            allDayControls = allDayHeader.getControls(),
            allDayEvents = events.allDayEvents,
            controlIndex = 0,
            hasRenderContent = !!allDayHeader.renderContent,
            numAllDay = allDayEvents.length,
            numControls = allDayControls.length,
            hidSomething = false;

        // If we already have allDayEvent controls, let's reuse them.
        for (; controlIndex < numControls; ++controlIndex) {
            control = allDayControls[controlIndex];
            event = allDayEvents[controlIndex];

            // If we have a control and there is an event to go with it, set the event.  Otherwise, hide the control.
            if (event) {
                DEBUG && this.log("\tGrouping all-day event (Reusing existing control):\n\n\t", event, "\n\n\t");
                control.setEvent(event);
                control.show();
            } else {
                DEBUG && this.log("\tHiding all-day event control.\n\n\t");
                control.setEvent(null);
                control.hide();
                hidSomething = true;
            }
        }
        hidSomething && this.$.allDayScroller.setScrollLeft(0);  //reset the scroll position all the way to the left, so we didn't leave the user on a blank area of the scroller

        // If we ran out of available controls, build some for the rest of the allDayEvents.
        for (; controlIndex < numAllDay; ++controlIndex) {
            event = allDayEvents[controlIndex];
            DEBUG && this.log("\tGrouping all-day event (Creating new control):\n\n\t", event, "\n\n\t");
            allDayHeader.createComponent({event: event});
        }

        (numAllDay > 0) && (hasRenderContent ? allDayHeader.renderContent() : allDayHeader.render());	// renderContent does less work but the enyo team is deprecating it...
        this.$.allDayContainer.setShowing((numAllDay > 0) || !!this.inWeekView);

        var timedEvents = events.events;
        timedEvents.sort(this.groupSort);
        this.eventGroup.setEvents(timedEvents);
    }
});
