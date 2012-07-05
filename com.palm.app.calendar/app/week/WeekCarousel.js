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
 NOTE: WeekCarousel supports scrolling through weeks horizontally.

 + WeekCarousel:    <------------ This module.
 + WeekViewFrame
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


 TODO: BUG: enyo.DomNode.showingChanged() should be called on destroy() as it is on create()!
 TODO: BUG: enyo.Carousel.fetchView ("center") returns left view after 1st scroll!
 TODO: PLAN: Change "events" watch type to "cache" since we're watching cache changes.
 TODO: PLAN: Create base component for Day, Week, and month Carousels to inherit from.

 **/
enyo.kind({
    name      : "calendar.week.WeekCarousel",
    kind      : enyo.VFlexBox,
    showing   : false,
    published : {
        agendaMode : false, // Boolean	: For watching agendaMode state
        currentDate: null,  // Date		: For watching when the current date changes.
        events     : null,  // Array	: For watching events (aka cache updates).		// TODO: Change to "cache": null // Boolean: ...
        prefs      : null   // Object	: For watching preferences changes.
    },
    components: [
        {name: "weekCarousel", kind: calendar.VirtualCarouselAdaptor, flex: 1, onSetupView: "setupView", viewControl: {kind: calendar.week.WeekViewFrame}}
    ],

    constructor: function WeekCarousel() {
        this.startOfWeek = 0;
        this.timeMachine = new Date();

        this.inherited(arguments);
    },

    create: function create() {
        this.inherited(arguments);
        enyo.application.watch({ agendaMode: this, events: this, prefs: this });
    },

    destroy: function destroy() {
        enyo.application.ignore({ agendaMode: this, events: this, prefs: this });
        this.inherited(arguments);
    },

// BEGIN :-------: Framework Handlers :-----------------------------------------------------------------------------------------------------------------------//

    clickHandler: function weekClicked(from, domEvent) {
        var name = from.name,
            regexp = (/dayLabel[0-6]/gi);
        if (name && name.match(regexp)) {       // If this is a day label from the weekHeader:
            this.weekdayHeaderClicked = true;
            this.currentWeek.setTime(from.date);    // update the currentWeek with that specific date's timestamp
            enyo.application.share({ showView: {view: this.agendaMode ? "DayAgendaView" : "DayView"}});	// and switch to DayView (or DayAgendaView, whichever is appropriate).
            return true;
        }
    },

// BEGIN :-------: Published Property Handlers :--------------------------------------------------------------------------------------------------------------//

    currentDateChanged: function currentDateChanged(oldDate) {

        // NOTE: this.generated is a protected enyo property!!!
        if (!(this.generated && this.showing)) {    // Avoid GUI updates if not rendered or showing.
            return;
        }

        var currentDate = enyo.application.currentDate;

        DEBUG && this.log("\tCurrentWeek: [", this.currentWeek, "]\tCurrentDate: [", currentDate, "]\t");

        var oldCurrentWeek = this.currentWeek && +this.currentWeek;
        !this.currentWeek && (this.currentWeek = new Date());			//	Create the current week if it doesn't exist.
        currentDate && (this.currentWeek.setTime(+currentDate));		//	Update the current week to the actual current date if it exists.

        var notStartOfWeek = this.currentWeek.getDay() != this.startOfWeek;
        notStartOfWeek && this.currentWeek.clearTime().moveToDayOfWeek(this.startOfWeek, -1);	// Move currentWeek to the 1st day of that week.

        DEBUG && this.log("\n\n============ WEEK:", String(this.currentWeek), "============\n\n");

        if (+this.currentWeek != oldCurrentWeek) {
            this.viewsReady = false;			// VirtualCarousel doesn't allow you to pass through any additional parameters to setupView so we have to do this.
            this.$.weekCarousel.renderViews(0);
            this.viewsReady = true;
        }

        this.eventsChanged();													// Fetch a full range of events.
    },

    eventsChanged: function eventsChanged(oldEvents) {
        if (!this.showing || !this.currentWeek) {                                // Avoid updating the GUI if it's not visible or currentWeek doesn't exist.
            return;
        }
        var date = new Date(this.currentWeek).clearTime().addDays(3), // Start from middle of week.
            expand = 10;//Math.floor ((7 * 3) / 2)								// Half of the total visible days: (days * carouselSize) / 2.
        enyo.application.cacheManager.getDays({ date: date, expand: expand });	// Center-out querying requerys carousel's left & right views' events.
    },

    prefsChanged: function prefsChanged(oldPrefs) {
        var prefs = this.prefs || enyo.application.prefsManager.prefs,
            startOfWeek = prefs && prefs.startOfWeek;
        if (isNaN(startOfWeek) || (startOfWeek < 1 || startOfWeek > 7)) {
            this.warn("Invalid startOfWeek:", startOfWeek, "found in Preferences:", prefs);
            return;									// Invalid startOfWeek so do nothing.
        }
        --startOfWeek;								// Date.getDay() is zero-based, but Calendar prefs startOfWeek is 1-based.

        if (this.startOfWeek == startOfWeek) {
            return;									// Start of week hasn't changed so do nothing.
        }
        this.startOfWeek = startOfWeek;
        this.currentDateChanged();
    },

    showingChanged: function showingChanged(wasShowing) {
        this.inherited(arguments);

        var showing = this.showing;

        // NOTE: this.generated is a protected enyo property!!!
        if (!this.generated) {  // Avoid GUI updates if not rendered.
            return;
        }

        this.broadcastMessage("isActive", [showing]);				// Activate carousel views so they watch/ignore events as needed.
    },

// BEGIN :-------: Custom Handlers :--------------------------------------------------------------------------------------------------------------------------//

    viewSwitchedHandler: function viewSwitchedHandler(viewName) {
        this.broadcastMessage("becameCurrentPane", [(viewName == "weekCarousel")]);
    },

// BEGIN :-------: Custom Methods :---------------------------------------------------------------------------------------------------------------------------//

    fetchCurrentView: function fetchCurrentView() {
        var view = this.$.weekCarousel.fetchCurrentView();
        return view && view.fetchCurrentView();
    },

    getCurrentDay: function getCurrentDay(currentDate) {
        if (!currentDate) {
            return new Date(enyo.application.currentDate);
        }
        var start = +currentDate,
            time = this.timeMachine;
        time.setTime(start);			// Reuse the date instance
        time.addDays(7);				// Advance to midnight 1 week ahead of currentDate.
        var end = +time;				// Store that timestamp.

        time.setTime(Date.now());		// Reuse the date instance,
        var today = +time.clearTime();	// to create "today".

        // Return today if it occurs in this month:
        return (start <= today && end >= today) ? today : currentDate;
    },

    getViewDate: function getViewDate() {
        var viewDate = new Date(this.weekdayHeaderClicked ? this.currentWeek : this.getCurrentDay(this.currentWeek));
        this.weekdayHeaderClicked = false;
        return viewDate;
    },

    setupView: function setupView(inSender, inView, inViewIndex) {
        var viewDate = (new Date(this.currentWeek)).addWeeks(inViewIndex),
            timeMachine = this.timeMachine;

        if (this.viewsReady) {

            // Start from middle of week.
            var rangeDate = (new Date(viewDate)).addDays(3);

            // Update currentWeek to the center view.
            this.currentWeek.addWeeks(inViewIndex > 0 ? 1 : -1);

            DEBUG && this.log("\n\n============ WEEK:", String(this.currentWeek), "============\n\n");

            // Immediately update the app's current date to the current week's date.
            enyo.application.currentDate.setTime(+this.currentWeek);

            enyo.application.cacheManager.getDays({date: rangeDate, expand: 3});		// We may need to do this after setting the date on the view if we switch to synchronous Days shares.
        }

        timeMachine.setTime(viewDate);
        timeMachine.addDays(7).addSeconds(-1);

        inView.setDate(viewDate);
        //this.log("Current View index",inViewIndex, "Carousel view index",this.$.weekCarousel.viewIndex,"Center index",this.$.weekCarousel.centerIndex,"SnapScroll index",this.$.weekCarousel.index);
        return true;
    }
});
