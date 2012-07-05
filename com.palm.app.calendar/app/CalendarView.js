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
 NOTE: calendar.CalendarView controls the "calendar" views.

 TODO: FIX: enyo.Control.resizeHandler() is called on every carousel scroll!
 TODO: FIX: enyo.Control.resizeHandler() should only propagate resize events to children if parent is showing.
 TODO: FIX: broadcastMessage() still only exists on enyo.Control and not enyo.Component as of 2011.05.05.
 TODO: FIX: Handle screen rotation (i.e. adjust layout as needed for Portrait vs. Landscape mode).
 **/
enyo.kind({
    name      : "calendar.CalendarView",
    kind      : enyo.VFlexBox,
    classname : "calendar",
    events    : {
        onCreateNewEvent: "",
        onShowJumpTo    : ""
    },
    published : {
        showView   : null,  // Object	: For watching all show view requests.
        currentDate: null   // Date		: For watching currentDate changes.
    },
    statics   : {
        DAY_VIEW  : 0,
        WEEK_VIEW : 1,
        MONTH_VIEW: 2
    },
    components: [
        {kind: "calendar.CalendarList"},
        {name: "main", className: "view", kind: enyo.Pane, flex: 1, onSelectView: "viewSelected", transitionKind: "calendar.SimpleTransition", components: [
            // Using a custom transition until the discovered enyo issue in enyo.transitions.Simple is resolved (DFISH-28771)
            {name: "dayCarousel", kind: "calendar.day.DayCarousel", flex: 1, lazy: true},
            {name: "weekCarousel", kind: "calendar.week.WeekCarousel", flex: 1, lazy: true},
            {name: "monthCarousel", kind: "calendar.month.MonthCarousel", flex: 1, lazy: true}
        ]},
        {className: "view-controls", kind: enyo.HFlexBox, align: "center", pack: "center", components: [
            {name: "btnNew", kind: enyo.Button, className: "enyo-button-light", caption: $L("New event"), i_con: "../images/menu-icon-createNew.png", onclick: "doCreateNewEvent"},
            {kind: enyo.Spacer},
            {name: "viewSwitcher", kind: enyo.RadioGroup, className: "Rbutton", onChange: "switchViewHandler", onclick: "switchViewClicked", value: -1, components: [
                {name: "daySwitch", kind: enyo.RadioButton, lab_el: $L("Day"), icon: "../images/menu-icon-day.png" },
                // NOTE: lab_el is intentionally misspelled to keep but not use the display text per Calendar's Visual Design.
                {name: "weekSwitch", kind: enyo.RadioButton, lab_el: $L("Week"), icon: "../images/menu-icon-week.png" },
                // NOTE: lab_el is intentionally misspelled to keep but not use the display text per Calendar's Visual Design.
                {name: "monthSwitch", kind: enyo.RadioButton, lab_el: $L("Month"), icon: "../images/menu-icon-month.png" }    // NOTE: lab_el is intentionally misspelled to keep but not use the display text per Calendar's Visual Design.
            ]},
            {kind: enyo.Spacer},
            {name: "btnJump", kind: enyo.IconButton, className: "enyo-button-light", caption: $L("Jump to..."), i_con: "../images/menu-icon-jumpTo.png", onclick: "doShowJumpTo"}
        ]},
        {className: "footerPageEffect"}
    ],

    create: function create() {
        this.inherited(arguments);

        this.timeMachine = new Date();

        var enyoApp = enyo.application,
            ui = this.$;

        // NOTE: autoDate is a private property.
        this.autoDate = true;

        enyoApp.watch({ showView: this, currentDate: this });
    },

    destroy: function destroy() {
        enyo.application.ignore({ showView: this, currentDate: this });
        this.inherited(arguments);
    },

// BEGIN :-------: Framework Handlers :-----------------------------------------------------------------------------------------------------------------------//

    resizeHandler: function resizeHandler(from, domEvent) {
        this.inherited(arguments);
        var view = this.$.main.getView();
        view && view.showing && view.resized();
    },

// BEGIN :-------: Published Property Handlers :--------------------------------------------------------------------------------------------------------------//

    currentDateChanged: function currentDateChanged(oldDate) {
        var enyoApp = enyo.application,
            date = enyoApp.currentDate,
            ui = this.$,
            view,
            setViewDate;

        setViewDate = function setViewDate() {                        // Build the setViewDate closure to set the new date on the current view.
            view = ui.main.getView();
            view && view.setCurrentDate(date);
        };

        if (typeof this.gotCurrentDateThen == "function") {            // If we're switching views, we defer the date setting until the switch is done.
            this.gotCurrentDateThen();
            this.gotViewSelectedThen = setViewDate;
            this.gotCurrentDateThen = undefined;
        } else {
            setViewDate();
        }
    },

    showViewChanged: function showViewChanged(lastShowView) {
        var showView = this.showView,
            enyoApp = enyo.application;

        enyoApp.free({showView: true});	// Free the showView from datahub just in case it is being kept.

        if (!showView) {
            return;
        }

        var view = showView.view,
            agenda = true;

        this.autoDate = (showView.autoDate === false) ? false : true;

        // NOTE: I'm re-using the "view" variable here because this really is changing the abstract "view" to a more concrete and applicable "view".
        switch (view) {
        case "DayAgendaView":
            agenda = false;
        case "DayView":
            enyoApp.share({agendaMode: !agenda}, {keep: true});
            view = calendar.CalendarView.DAY_VIEW;
            break;

        case "WeekAgendaView":
            agenda = false;
        case "WeekView":
            enyoApp.share({agendaMode: !agenda}, {keep: true});
            view = calendar.CalendarView.WEEK_VIEW;
            break;

        case "MonthView":
            view = calendar.CalendarView.MONTH_VIEW;
            break;

        default:
            this.warn("\tUnable to show unrecognized view:\n\n\t", this.showView, "\t");
            return;
        }

        this.switchView(view);

    },

// BEGIN :-------: Custom Methods :---------------------------------------------------------------------------------------------------------------------------//

    fetchCurrentView: function fetchCurrentView() {
        var currentView = this.$.main.getView();

        return currentView && currentView.fetchCurrentView();
    },

    viewIdNameMap: ["dayCarousel", "weekCarousel", "monthCarousel"],

    switchView: function switchView(i) {
        this.$.viewSwitcher.setValue(i);
        this.switchViewHandler(null, i);
    },

    switchViewHandler: function switchViewHandler(from, i) {        // This is called when switching between views.
        var ui = this.$,
            name = this.viewIdNameMap [i], // Look up the name
            view = ui.main.getView(), // Get the current view
            viewDate,
            oldName = view && view.name;						// If there is a current view, get its name.

        if (name != oldName) {
            this.gotCurrentDateThen = function selectView() {            // Build a closure to run after we've received a shared currentDate.
                ui.main.validateView(name);							// Validate that the view is created; if it isn't yet, it will be created synchronously.
                ui.main.selectViewByName(name);
            }
        }

        if (this.autoDate) {                                        // If autoDate is set, we share currentDate.  Otherwise, we expect it from somewhere else.
            if (name != oldName) {                                        // Get the current view's date if we are moving to a new view.
                viewDate = view && view.getViewDate();
            }
            (from === ui.viewSwitcher || viewDate) && enyo.application.shareCurrentDate({date: viewDate});
        }

        // NOTE: lastClickedViewName is a private property.
        this.lastClickedViewName = name;							// Set the view switching flag.
        this.log(" ENYO PERF: SINGLE CLICK OCCURED time: " + Date.now());
        this.autoDate = true;										// Reset the autoDate flag.
    },

    switchViewClicked: function switchViewClicked(from, domEvent) {    // This is automatically called after switchViewHandler.
        var nowShowing = this.$.main.getViewName();					// Which view is currently showing

        // NOTE: lastClickedViewName is a private property.
        if (nowShowing == this.lastClickedViewName) {               // Is that the last-clicked view, meaning we're already showing it?
            enyo.application.shareCurrentDate();					    //  Then show today within the current view.
        }
        return true;												// Stop the click event from being handled by any ancestor component.
    },

    viewSwitchedHandler: function viewSwitchedHandler(viewName) {
        (viewName == "calendarView") && this.broadcastMessage("viewSwitched", [this.$.main.getViewName()]);
    },

    viewSelected: function viewSelected(from, view, lastview) {
        if (typeof this.gotViewSelectedThen == "function") {        // Run the deferred date setting if it exists.
            this.gotViewSelectedThen();
            this.gotViewSelectedThen = undefined;
        }
    }

});
