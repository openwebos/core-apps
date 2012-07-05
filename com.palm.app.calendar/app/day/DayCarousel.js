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
 NOTE: calendar.day.DayCarousel allows interacting with Calendar's Day View as
 either a horizontal or vertical carousel.

 TODO: FIX: enyo.DomNode.showingChanged() should be called on destroy() as it is on create()!
 TODO: FIX: enyo.Carousel.fetchView ("center") returns left view after 1st scroll!
 TODO: PLAN: Change "events" watch type to "cache" since we're watching cache changes.
 TODO: PLAN: Create base component for Day, Week, and month Carousels to inherit from.
 **/

enyo.kind({
    name      : "calendar.day.DayCarousel",
    kind      : enyo.VFlexBox,
    published : {
        currentDate: null, // Date		: For watching when the current date changes.
        events     : null  // Object	: For watching Calendar Events (aka cache updates).
    },
    components: [
        {name: "dayCarousel", kind: calendar.VirtualCarouselAdaptor, flex: 1, onSetupView: "setupView", viewControl: {kind: calendar.day.DayViewFrame}}
    ],

    create: function create() {
        this.inherited(arguments);
        enyo.application.watch({ events: this });
    },

    destroy: function destroy() {
        enyo.application.ignore({ events: this });	// NOTE: Ignore currentDate here b/c DomNode.showingChanged() is only called on create() not on destroy()
        this.inherited(arguments);
    },

    currentDateChanged: function currentDateChanged(oldDate) {

        // NOTE: this.generated is a protected enyo property
        if (!(this.generated && this.showing)) {                        // Avoid GUI updates if not rendered or showing.
            return;
        }

        var currentDate = enyo.application.currentDate;

        DEBUG && this.log("\tCurrentDay: [", this.currentDay, "]\tCurrentDate: [", currentDate, "]\t");

        if (!this.currentDay || (+this.currentDay != +currentDate)) {   // If the current day isn't already being displayed:
            !this.currentDay && (this.currentDay = new Date());			    //	Create the current day if it doesn't exist.
            currentDate && (this.currentDay.setTime(+currentDate));	        //	Update the current day to the actual current date if it exists.
            this.currentDay.clearTime();									//	Reset the current day's time to midnight.

            DEBUG && this.log("\n\n============ DAY:", String(this.currentDay), "============\n\n");
            this.viewsReady = false;			                            // VirtualCarousel doesn't allow you to pass through any additional parameters to setupView so we have to do this.
            this.$.dayCarousel.renderViews(0);
            this.viewsReady = true;
        }
        this.eventsChanged();	                                        // Fetch a full range of events.
    },

    eventsChanged: function eventsChanged(oldEvents) {
        if (!this.showing || !this.currentDay) {                        // Avoid updating the GUI if it's not visible or currentDay doesn't exist.
            return;
        }
        var date = new Date(this.currentDay).clearTime(),
            expand = 1;
        enyo.application.cacheManager.getDays({ date: date, expand: expand });  // Center-out querying requerys carousel's left & right views' events.
    },

    showingChanged: function showingChanged(wasShowing) {
        this.inherited(arguments);

        var showing = this.showing;
        // NOTE: this.generated is a protected enyo property
        if (!this.generated) {                          // Avoid GUI updates if not rendered or if already showing.
            return;
        }

        this.broadcastMessage("isActive", [showing]);   // Activate carousel views so they watch/ignore events as needed.
    },

// BEGIN :-------: Custom Handlers :--------------------------------------------------------------------------------------------------------------------------//

    viewSwitchedHandler: function viewSwitchedHandler(viewName) {
        this.broadcastMessage("becameCurrentPane", [(viewName == "dayCarousel")]);
    },

// BEGIN :-------: Custom Methods :---------------------------------------------------------------------------------------------------------------------------//

    fetchCurrentView: function fetchCurrentView() {
        var view = this.$.dayCarousel.fetchCurrentView();
        return view && view.fetchCurrentView();
    },

    getViewDate: function getViewDate() {
        return new Date(this.currentDay || enyo.application.currentDate);
    },

    setupView: function setupView(inSender, inView, inViewIndex) {
        var viewDate = (new Date(this.currentDay)).addDays(inViewIndex);

        if (this.viewsReady) {

            // Update currentDay to the center view.
            var currentDayOffset = inViewIndex > 0 ? 1 : -1;
            // this.log("setupView(): currentDayOffset: " + currentDayOffset);

            this.currentDay.addDays(currentDayOffset);

            DEBUG && this.log("\n\n============ DAY:", String(this.currentDay), "============\n\n");

            // Immediately update the app's current date to the current day's date.
            enyo.application.currentDate.setTime(+this.currentDay);

            enyo.application.cacheManager.getDays({date: viewDate, expand: 0});	// We may need to do this after setting the date on the view if we switch to synchronous Days shares.
        }

        inView.setDate(viewDate);
        //this.log("Current View index",inViewIndex, "Carousel view index",this.$.dayCarousel.viewIndex,"Center index",this.$.dayCarousel.centerIndex,"SnapScroll index",this.$.dayCarousel.index);
        return true;
    }
});
