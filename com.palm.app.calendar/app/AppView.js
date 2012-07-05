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
 NOTE: calendar.AppView is the Calendar App's GUI controller.

 TODO: PLAN: Move FirstUseView from calendar.App to here and rename to FirstLaunchView.
 **/
enyo.kind({
    name      : "calendar.AppView",
    className : "calendar",
    kind      : enyo.VFlexBox,
    published : {
        is24Hr   : null,// Boolean	: For watching 24hr clock mode changes.
        showEvent: null // Object	: For watching all show event requests (i.e. From Day, Week, or Month views, ReminderDialog, or Cross Launch).
    },
    components: [
        { kind                  : "ApplicationEvents",
            onBack              : "backHandler",
            onUnload            : "unloadHandler",
            onWindowActivated   : "windowActivatedHandler",
            onWindowDeactivated : "windowDeactivatedHandler",
            onWindowHidden      : "windowHiddenHandler",
            onWindowParamsChange: "windowParamsChangeHandler",
            onWindowRotated     : "windowRotatedHandler",
            onWindowShown       : "windowShownHandler"
        },
        { name                   : "appMenu", kind: "calendar.AppMenu", lazy: false,
            onCreateAllDayEvent  : "createAllDayEvent",
            onCreateEvent        : "createTimedEvent",
//          onDeleteEvent			: "showDeleteConfirm",
            onJumpTo             : "showJumpTo",
            onShowHelp           : "showHelp",
//          onShowMap				: "showMap",
//          onShowMapRoute			: "showMap",
            onShowMissedReminders: "showReminders",
            onShowPreferences    : "showPreferences",
            onShowToday          : "showDate",
            onSyncNow            : "syncNow"
        },
        {kind: enyo.Pane, flex: 1, onSelectView: "viewSelected", components: [
            {name: "calendarView", kind: "calendar.CalendarView", flex: 1, onCreateNewEvent: "createTimedEvent", onShowJumpTo: "showJumpTo"},
            {name: "editView", kind: "calendar.edit.EditView", lazy: true, showing: false, flex: 1, onExit: "closeView", onDelete: "showDeleteConfirm"},
            {name: "prefsView", kind: "calendar.prefs.PreferencesView", lazy: true, showing: false, onExit: "closeView"}
        ]}
    ],
    popups    : [
        // PERF: Store popups and dialogs separately from the main GUI components to avoid costly premature creation.
        {name: "jumpToDialog", kind: enyo.ModalDialog, caption: $L("Jump To..."), scrim: true, showing: false, onClose: "resetMenu", components: [
            {name: "jumpTo", kind: "calendar.JumpToView", onDateChanged: "jumpToDate"}
        ]},
        {name: "detailPopup", kind: enyo.ModalDialog, scrim: true, caption: $L("Event Details"), className: "enyo-modaldialog-customWidth", showing: false, onClose: "resetMenu", components: [
            {name: "detailView", kind: "calendar.edit.DetailView", showing: false, onEdit: "displayEvent", onDelete: "showDeleteConfirm"}
        ]},
        {name: "deleteDialog", kind: enyo.ModalDialog, scrim: true, showing: false, components: [
            {name: "deleteConfirm", kind: "calendar.edit.DeleteConfirm"}
        ]}
    ],

    constructor: function AppView() {
        this.inherited(arguments);
        this.EventView = calendar.EventView;
        this.timeMachine = new Date();
    },

    constructed: function constructed() {
        this.createEventThen = enyo.bind(this, this.createEventThen);
        this.createLaunchEventThen = enyo.bind(this, this.createLaunchEventThen);
        this.handleUniversalSearch = enyo.bind(this, this.handleUniversalSearch);

        this.inherited(arguments);
        //(typeof HACKS != "undefined")	&&	HACKS.HACK_ENYO_DEFAULT_TARGET_EVENT_HANDLER (this);
    },

    create: function create() {        // PERF: new AppView() takes ~350 ms.
        this.inherited(arguments);
        window.PalmSystem && window.PalmSystem.keepAlive(true);

        var enyoApp = enyo.application,
            ui = this.$;

        ui.pane.selectView(ui.calendarView);

        this.createComponents(this.popups);

        this.is24Hr = !enyoApp.fmts.isAmPm();	// Use the current 24hr mode system setting as default.

        enyoApp.watch({is24Hr: this, showEvent: this});
    },

    destroy: function destroy() {
        enyo.application.ignore({is24Hr: this, showEvent: this});
        this.inherited(arguments);
    },

// BEGIN :-------: Framework Handlers :-----------------------------------------------------------------------------------------------------------------------//

    backHandler: function backHandler(from, event) {
        //	NOTE: As of v0.3 enyo doesn't seem to support nested "back" handlers so this method
        //	determines how to handle "back" events for each multi-view pane.
        //	event.preventDefault() is used to stop accidental cardmode on "back" events.
        this.closeView();
        (this.$.pane.getViewName() != "calendar") && event.preventDefault();
    },

    unloadHandler: function unloadHandler() {
        DEBUG && this.log("======= UNLOADING...\t")

        // Triggers the chain of destroy handlers (appview -> dayview -> etc.)
        // Destroy handlers are where most views unsubscribe listeners from data hub and cancel service requests.
        this.destroy();
    },

    windowActivatedHandler: function windowActivatedHandler() {
        DEBUG && this.log("======= ACTIVATED\t");
    },

    windowDeactivatedHandler: function windowDeactivatedHandler() {
        DEBUG && this.log("======= DEACTIVATED\t");
        var calendarView = this.fetchCalendarView(),
            enyoApp = enyo.application,
            prefsManager = enyoApp.prefsManager;

        enyoApp.currentCalendarView = calendarView;		// When re-activating, use the currentCalendarView.
        prefsManager.setNextLaunchView(calendarView);	// Attempt to set the nextLaunchView.

    },

    windowHiddenHandler: function windowHiddenHandler() {    // TODO: Set start date based on user's app preferences.
        DEBUG && this.log("======= HIDDEN\t");
        var enyoApp = enyo.application;
        enyoApp.currentCalendarView = undefined;	// Use the nextLaunchView for the next launch instead of the currentCalendarView.
        enyoApp.showCalendarView();					// Show the nextLaunchView now so that the next time Calendar launches it will be ready.
    },

    windowParamsChangeHandler: function windowParamsChangeHandler() {
        DEBUG && this.log("======= PARAMS CHANGED: ", enyo.windowParams, "\t");
        this.handleLaunchParams(enyo.windowParams);
    },

    windowReactivatedHandler: function windowReactivatedHandler() {
        DEBUG && this.log("======= REACTIVATED\t");
    },

    windowRotatedHandler: function windowRotatedHandler(from, event) {
        DEBUG && this.log("======= ROTATED\t");
    },

    windowShownHandler: function windowShownHandler() {
        DEBUG && this.log("======= SHOWN\t");
    },

// BEGIN :-------: Published Property Handlers :--------------------------------------------------------------------------------------------------------------//

    is24HrChanged: function is24HrChanged(oldIs24Hr) {
        this.$.pane.broadcastMessage("is24Hr", [this.is24Hr]);	// Since we only get 24Hr changes from App, we pass them on immediately.
    },

    showEventChanged: function showEventChanged(lastEventShown) {
        this.log(" ENYO PERF: SINGLE CLICK OCCURED time: " + Date.now());
        this.displayEvent(this, this.showEvent);
        this.log(" ENYO PERF: TRANSITION DONE time: " + Date.now());
    },

// BEGIN :-------: Custom Methods :---------------------------------------------------------------------------------------------------------------------------//

    closeView: function closeView(event) {
        this.$.pane.back();
    },

    createAllDayEvent: function createAllDayEvent(from, domEvent) {
        var date = this.timeMachine;
        date.setTime(Date.now());

        var hour = date.getHours(),
            minutes = date.getMinutes();
        date.setTime(enyo.application.currentDate);
        date.clearTime();
        date.setHours(hour);
        date.setMinutes(minutes);

        var createEvent = {
            event: {allDay: true, dtstart: +date},
            then : this.createEventThen
        };
        enyo.application.share({createEvent: createEvent});	// Request event creation.
        return true;
    },

    createEventThen: function createEventThen(event) {
        if (!event) {
            this.error("\tFailed to create event GUI using event [", event, "].\t");
            return;
        }
        var addEvent = {event: event, show: true, then: undefined};	// "then" can be a Function or be omitted.
        enyo.application.share({addEvent: addEvent});				// Request adding the event to a view.
    },

    createLaunchEventThen: function createLaunchEventThen(event) {
        if (!event) {
            this.error("\tFailed to create cross-launched event using these properties [", event, "].\t");
            return;
        }
        enyo.application.shareCurrentDate({date: new Date(event.dtstart).clearTime(), wait: true});

        event.saveAsIs = true;										// Notifies Edit View that this event should be saved even if the user doesn't change it.
        var addEvent = {event: event, show: true, then: undefined};	// "then" can be a Function, falsey or be omitted.

        DEBUG && this.log("\tEvent: ", event, "\t");
        enyo.application.share({addEvent: addEvent}, {keep: true});	// Request adding the event to a view.
    },

    createTimedEvent: function createTimedEvent(from, domEvent) {
        var date = this.timeMachine;
        date.setTime(Date.now());

        var hour = date.getHours(),
            minutes = date.getMinutes();
        date.setTime(enyo.application.currentDate);
        date.clearTime();
        date.setHours(hour);
        date.setMinutes(minutes);

        var createEvent = {
            event: {dtstart: +date},
            then : this.createEventThen
        };
        enyo.application.share({createEvent: createEvent});	// Request event creation.
        return true;
    },

    displayEvent: function displayEvent(from, eventGUIOrEvent) {
        DEBUG && this.log("Event:", eventGUIOrEvent);

        if (!eventGUIOrEvent) {
            this.error("\tUnable to edit non-existent event.\t");
            return;
        }
        var event = eventGUIOrEvent.event || eventGUIOrEvent;
        var hasId = ("_id" in event),
            ui = this.$,
            view;

        // Had to add an additional case below for when detailView hasn't been loaded yet.  from == ui.detailView in this case, since they are both undefined.
        if ((!ui.detailView || (from != ui.detailView)) && hasId) { // Show Event Detail if not already doing so or performing a tap-to-create:
            ui.detailPopup.lazy && ui.detailPopup.validateComponents();
            view = ui.detailView;						//		cache detail view,
            this.viewSelected(from, view, from);		//		trigger menu update,
            view.setShowing(true);						//		trigger ContactsManager lazy loading if needed,
            view.setEvent(eventGUIOrEvent);				//		update the view with the event's content,
            ui.detailPopup.openAtCenter();				//		then show Detail View.
            //ui.detailPopup.resize();
        } else {                                    // Otherwise:
            ui.pane.validateView("editView");
            ui.editView.setEvent(eventGUIOrEvent);		//		Update Edit View with the event's content.
            ui.pane.selectView(ui.editView);			//		then show Edit View.
        }
    },

    fetchCalendarView: function fetchCalendarView() {
        return this.$.calendarView.fetchCurrentView();
    },

    handleLaunchParams: function handleLaunchParams(params) {
        DEBUG && this.log("\tParams: ", params, "\t");

        switch (true) {
        case !params || (typeof params != "object"):     // Ensure that params exist and that they're within an object.
            return;

        case ("newEvent"        in params):              // Supports "New Calendar Event" Spec on webOS Developer Network:
        case ("quickLaunchText"    in params):           // Supports Just Type "New Calendar Event" Quick Action:
            var createEvent = {
                event   : params.newEvent || {subject: params.quickLaunchText},
                keepTime: !!params.newEvent,
                then    : this.createLaunchEventThen
            };
            enyo.application.share({createEvent: createEvent});
            return;

        case ("showEventDetail" in params):
            enyo.application.databaseManager.getEvent(
                params.showEventDetail, // This launch param is expected to be an event id.
                this.handleUniversalSearch,
                this.handleUniversalSearch
            );
            return;

        case ("showDetailFromReminder" in params):
            var eventId = params.showDetailFromReminder.eventId,
                start = parseInt(params.showDetailFromReminder.startTime, 10),
                end = parseInt(params.showDetailFromReminder.endTime, 10);

            if (eventId === undefined || start === undefined || end === undefined) {
                return;
            }

            //This needs to be bound with the new arguments every time.
            var handleShowReminderDetail = enyo.bind(this, this.handleShowReminderDetail, start, end);
            enyo.application.databaseManager.getEvent(
                eventId,
                handleShowReminderDetail,
                handleShowReminderDetail
            );
            return;

        default:
            return;
        }
    },

    handleShowReminderDetail: function handleShowReminderDetail(startTime, endTime, response) {
        var event = response.returnValue && response.results && response.results.length && response.results[0];
        if (event) {
            event.currentLocalStart = startTime;
            event.currentLocalEnd = endTime;
            this.displayEvent(null, event);
            enyo.application.shareCurrentDate({date: startTime});
            return;
        }
        this.error("\tCalendar Detail From Reminder Failed: ", response, "\t");
    },

    handleUniversalSearch: function handleUniversalSearch(response) {
        var event = response.returnValue && response.results && response.results.length && response.results[0];
        if (event) {
            this.displayEvent(null, event);
            enyo.application.shareCurrentDate({date: event.dtstart});
            return;
        }
        this.error("\tCalendar Universal Search Failed: ", response, "\t");
    },

    jumpToDate: function jumpToDate(from, date) {
        this.showDate(date);
    },

    resetMenu: function resetMenu(from) {
        this.log(" ENYO PERF: SINGLE CLICK OCCURED time: " + Date.now());
        this.viewSelected(from, this.$.pane.getView(), from);
        this.log(" ENYO PERF: TRANSITION DONE time: " + Date.now());
    },

    showDate: function showDate(date) {
        enyo.application.shareCurrentDate({date: date});
    },

    showDeleteConfirm: function showDeleteConfirm(from, eventOrEventGUI) {
        DEBUG && this.log("########## Showing the delete confirmation popup.");
        var ui = this.$;
        ui.deleteDialog.lazy && ui.deleteDialog.validateComponents();
        ui.deleteConfirm.setEvent(eventOrEventGUI);
        ui.deleteDialog.openAtCenter();
    },

    showHelp: function showHelp() {
        enyo.application.share({launch: {appId: "com.palm.app.help"}});
    },

    showJumpTo: function showJumpTo() {
        var ui = this.$;
        ui.jumpToDialog.lazy && ui.jumpToDialog.validateComponents();
        ui.jumpToDialog.openAtCenter();
    },

    showPreferences: function showPreferences() {
        this.$.pane.selectViewByName("prefsView");
    },

    syncNow: function syncNow() {
        enyo.application.calendarsManager.syncAllCalendars();
    },

    viewSelected: function viewSelected(from, view, lastView) {
        var ui = this.$,
            viewName = view && view.name;

        ui.appMenu.setViews({current: view, last: lastView});
        ui.pane.broadcastMessage("viewSwitched", [viewName]);
    }
});
