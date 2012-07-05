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
 NOTE: calendar.App is the Calendar app's controller.
 **/
enyo.kind({
    name      : "calendar.App",
    kind      : enyo.Component,
    published : {
        createEvent    : null, // Object	: For watching create event requests.
        currentDate    : null, // Date		: For watching when the current date changes.
        firstLaunchDone: undefined, // Boolean	: For watching when First Launch is done.
        is24Hr         : undefined, // Boolean	: Undefined when not yet shared.
        tzId           : undefined        // String	: Undefined when not yet shared.
    },
    components: [
        {kind                   : "ApplicationEvents",
//          onApplicationRelaunch: "applicationRelaunchHandler".		// Called by tapping on Calendar's Launcher icon while the app's carded or hidden via keep-alive.
            onUnload            : "unloadHandler",
            onWindowActivated   : "windowActivatedHandler",
            onWindowDeactivated : "windowDeactivatedHandler",
            onWindowParamsChange: "windowParamsChangeHandler"
        },
        {kind: enyo.SystemService, components: [
            {name: "getSystemPrefs", method: "getPreferences", subscribe: true, onSuccess: "gotSystemPrefs", onFailure: "gotSystemPrefsFailure"},
            {name: "getSystemTime", method: "time/getSystemTime", subscribe: true, onSuccess: "gotSystemTime", onFailure: "gotSystemTimeFailure"}
        ]},
        {name: "checkFirstLaunch", kind: "Accounts.checkFirstLaunch", onCheckFirstLaunchResult: "checkFirstLaunchResult"},
        {name: "appIcon", kind: "calendar.AppIcon"},
        // NOTE: Load order is important here.  We may want to modify this so that components load their respective dependencies.
        {kind: "DatabaseManager"},
        {kind: "CalendarsManager"},
        {kind: "calendar.PrefsManager"},
        {kind: "LunaAppManager"},
        {kind: "calendar.CacheManager"},
        {kind: "ReminderManager"}
    ],

    constructor: function App() {
        this.inherited(arguments);
        DataHub.enhance(enyo.application);
    },

    create: function create() {
        var enyoApp = enyo.application,
            a = this.$;
        this.timeMachine = new Date();							// For calculating date/times without creating new Date instances.

        // Initialize external dependencies before beginning create flow.
        this.loadLibraries();
        !window.PalmSystem && MOCK.initialize({override: true});	// NOTE: Must initialize mock before creating CalendarsManager, DatabaseManager, and EventManager because it overrides their prototypes for the browser environment

        // NOTE: We want to be first in line for these watches.
        enyoApp.watch({createEvent: this}, {name: "App"});
        enyoApp.watch({currentDate: this}, {wait: true});				// Watch currentDate synchronously so that the currentDate object on enyo.application is updated immediately

        // Continue creating...
        this.inherited(arguments);

        // Set up utility functions / objects
        enyoApp.shareCurrentDate = enyo.bind(this, this.shareCurrentDate);
        enyoApp.showCalendarView = enyo.bind(this, this.showCalendarView);
        enyoApp.fmts = new enyo.g11n.Fmts();				// Cached for getting format info.

        // Make initial service requests
        a.getSystemPrefs.call({keys: ["timeFormat"]});
        a.getSystemTime.call();

        // Start the clock
        this.watchClock(true);

        // Check to see if we need to show First Launch view.
        this.$.checkFirstLaunch.shouldFirstLaunchBeShown("com.palm.app.calendar");
    },

    destroy: function destroy() {

        var a = this.$,
            enyoApp = enyo.application;

        // Stop the clock
        this.watchClock(false);

        // Cancel service requests
        a && a.getSystemPrefs && a.getSystemPrefs.cancel();
        a && a.getSystemTime && a.getSystemTime.cancel();

        // Disable keepAlive and close the app window (if it isn't already)
        var appWindow = enyo.windows.fetchWindow("Calendar");
        if (appWindow) {
            appWindow.PalmSystem && appWindow.PalmSystem.keepAlive(false);
            appWindow.close();
        }

        // Save preferences.
        enyoApp.prefsManager.savePrefs(enyoApp.prefsManager.prefs);

        // Continue destroying.
        this.inherited(arguments);

        // Stop watching.
        enyoApp.ignore({createEvent: this, currentDate: this, firstLaunchDone: this});

        // If a view exists, destroy it.
        enyoApp.view && enyoApp.view.destroy();

        // Cleanup references.
        delete enyoApp.fmts;
        delete enyoApp.shareCurrentDate;
        delete enyoApp.app;

        enyoApp.clearHub();
    },

// BEGIN :-------: Framework Handlers :-----------------------------------------------------------------------------------------------------------------------//

    applicationRelaunchHandler: function applicationRelaunchHandler() {    // TODO: Re-enable now that enyo.ApplicationEvents supports this.
        DEBUG && this.log("======= RELAUNCHED\t");
        this.handleLaunchParams(enyo.windowParams);
    },

    unloadHandler: function unloadHandler() {
        DEBUG && this.log("======= UNLOADING\t");
        this.destroy();
    },

    windowActivatedHandler: function windowActivatedHandler() {
        DEBUG && this.log("======= ACTIVATED\t");
    },

    windowDeactivatedHandler: function windowDeactivatedHandler() {
        DEBUG && this.log("======= DEACTIVATED\t");
    },

    windowParamsChangeHandler: function windowParamsChangeHandler() {
        DEBUG && this.log("======= PARAMS CHANGED\t");
        this.handleLaunchParams(enyo.windowParams);
    },

    windowReactivatedHandler: function windowReactivatedHandler() {        // enyo.ApplicationEvents doesn't call this...
        DEBUG && this.log("======= REACTIVATED\t");
        this.handleLaunchParams(enyo.windowParams);
    },

// BEGIN :-------: Published Property Handlers :--------------------------------------------------------------------------------------------------------------//

    createEventChanged: function createEventChanged(lastCreatedEvent) {
        /* Handles "createEvent" requests:
         {	createEvent:
         {	event		: Object	- Partial or complete CalendarEvent object
         ,	keepTime	: Boolean	- Whether to keep the event's specified time as is.
         ,	then		: Function	- Function to send created event to.
         }
         }
         */
        DEBUG && this.log("\tcreateEvent: ", this.createEvent, "\t");

        var enyoApp = enyo.application,
            calMgr = enyoApp.calendarsManager,
            prefsMgr = enyoApp.prefsManager,
            prefs = prefsMgr && prefsMgr.getPrefs(),
            event = this.createEvent && this.createEvent.event,
            keepTime = !!(this.createEvent && this.createEvent.keepTime),
            accountId,
            calendar,
            alarm = event.alarm,
            color = event.color,
            start = event && parseInt(event.dtstart, 10),
            end = event && parseInt(event.dtend, 10),
            eventDate = this.timeMachine;

        event = new CalendarEvent(event);
        isNaN(start) && (event.dtstart = start = Date.now());
        eventDate.setTime(start);

        if (!keepTime) {
            var hour = eventDate.getHours(), // Keep the event's start hour.
                minute = Math.ceil(eventDate.getMinutes() / 15) * 15;		// Calculate the closest 15 minute interval after the current time.

            eventDate.clearTime();					// Set the event's start time to midnight.
            eventDate.setHours(hour);				// Set the event's start hour.
            eventDate.setMinutes(minute);			// Set the event's start minute. NOTE: DateJS' set ({minute:minute}) disallows minute=60.
            event.dtstart = start = +eventDate;		// Create event's dtstart timestamp.
        }

        if (!("calendarId" in event)) {
            event.calendarId = prefsMgr.getDefaultCalendar();
        }

        if (!("accountId" in event)) {
            calendar = calMgr.getCal(event.calendarId);
            accountId = (calendar && calendar.accountId);
            (accountId != null) && (event.accountId = accountId);
        }

        event.color = color == null                                                            // If the event had no color:
            ? ((calendar && calendar.color) || calMgr.getCalColor(event.calendarId) || "blue")    //	Use its calendar color or default to blue.
            : color;																				//	Otherwise reset its color since new CalendarEvent() strips it.

        if (isNaN(event.dtend)) {
            var duration = (prefs && prefs.defaultEventDuration && (prefs.defaultEventDuration * 6e4)) || 36e5	// Default to 1 hr. 6e4=60000ms=1minute, 36e5=3600000ms=1hour
            event.dtend = start + duration;
        }

        if (!alarm) {
            if (prefs) {
                alarm = event.allDay ? prefs.defaultAllDayEventReminder : prefs.defaultEventReminder;
            } else {
                alarm = event.allDay ? "-P1D" : "-PT15M";
            }
            Utilities.setAlarm(event.alarm[0], alarm);
        }

        DEBUG && this.log("\tevent:", event, "\t");

        var then = this.createEvent && this.createEvent.then;
        enyo.isFunction(then)                                        // If a then function was provided
        && setTimeout(enyo.bind(this, then, event), 15.625);	//	use it to return the newly created CalendarEvent asynchronously.

        this.createEvent = null;	// Clear the current "createEvent" request so its info won't be accidentally reused.
    },

    currentDateChanged: function currentDateChanged(oldDate) {
        var enyoApp = enyo.application,
            currentDate = enyoApp.currentDate;
        !currentDate && (currentDate = new Date()); //use new Date, because we're setting the value into enyoApp.currentDate
        this.currentDate && currentDate.setTime(+this.currentDate);
        enyoApp.currentDate = currentDate.clearTime();
    },

    firstLaunchDoneChanged: function firstLaunchDoneChanged(oldFirstLaunchDone) {
        var firstLaunchDone = !!this.firstLaunchDone;
        if (firstLaunchDone) {
            enyo.application.ignore({firstLaunchDone: this});					// Stop watching for First Launch to be done.

            // Share the new firstLaunch state.
            enyo.application.share({firstLaunch: false}, {keep: true});
            this.$.checkFirstLaunch.firstLaunchHasBeenShown();
        }
    },

    is24HrChanged: function is24HrChanged(oldIs24Hr) {
        var is24Hr = !!this.is24Hr;
        if (oldIs24Hr !== undefined && is24Hr == oldIs24Hr) {    // 24Hr mode was previously defined and still has the same value:
            return;												//	So do nothing.
        }

        var enyoApp = enyo.application;
        enyoApp.fmts = new enyo.g11n.Fmts();					// Rebuild the formats object since 24Hr format changed.

        enyoApp.share({is24Hr: is24Hr}, {keep: true});						// Share the 24Hr mode.
    },

    tzIdChanged: function tzIdChanged(oldTzId) {
        var tzId = this.tzId;
        if (oldTzId !== undefined && tzId == oldTzId) {            // tzId was previously defined and still has the same value:
            return;												//	So do nothing.
        }

        var enyoApp = enyo.application;

        // We need to notify everyone that the timezone changed both by re-issuing the clock and by sharing the new timezone itself.
        var time = {
            tzId : tzId,
            clock: new Date()
        }

        if (oldTzId || !enyoApp.currentDate) {    // If we just changed from a previous timezone we use the "concept date" as currentDate. If no currentDate exists, share a new currentDate.
            time.currentDate = new Date(enyoApp.currentDate ? enyoApp.cacheManager.eventManager.utils.timezoneManager.convertTime(+enyoApp.currentDate, tzId, oldTzId) : Date.now());
        }

        enyoApp.share(time, {keep: true});
    },

// BEGIN :-------: Custom Methods :---------------------------------------------------------------------------------------------------------------------------//

    checkFirstLaunchResult: function checkFirstLaunchResult(inSender, inResponse) {

        var showFirstLaunch = !!(inResponse && inResponse.showFirstLaunch);

        showFirstLaunch && enyo.application.watch({firstLaunchDone: this}, {wait: true});	// If we're going to show First Launch, watch for when it is done.

        // Share the result so that when the window is ready it will receive it and launch the appropriate view synchronously (perf).
        enyo.application.share({firstLaunch: showFirstLaunch}, {keep: true});
    },

    gotSystemPrefs: function gotSystemPrefs(from, response) {
        /* System preferences (timeFormat) service success response handler.
         */
        DEBUG && this.log("---:---: Got time format?", response.timeFormat);
        this.setIs24Hr(response && response.timeFormat === "HH24");
    },

    gotSystemPrefsFailure: function gotSystemPrefsFailure(from, response) {
        /* System preferences (timeFormat) service failure response handler.
         */
        this.error("---:---: Failed to retrieve system time format.\n\t", response);
    },

    gotSystemTime: function gotSystemTime(from, response) {
        /* System time service success response handler.
         */
        var tzId = response.timezone;
        DEBUG && this.log("---:---: Got system time? ", tzId);
        this.tzId != tzId ? this.setTzId(tzId) : this.watchClock(true);
    },

    gotSystemTimeFailure: function gotSystemTimeFailure(from, response) {
        /* System time service failure response handler.
         NOTE: enyo Mock service supplies mock data when "returnValue: true" isn't specified and merged into the returned results. bug?
         */
        this.error("---:---: Failed to retrieve system time.\n\t", response);
    },

    handleLaunchParams: function handleLaunchParams(params) {
        DEBUG && this.log("\tparams: ", params, "\t");

        if (params.launchedAtBoot) {
            DEBUG && this.log("========= LAUNCHED AT BOOT");
            return;
        }

        if (params.dayChange) {
            DEBUG && this.log("========= LAUNCHED DAY CHANGE");
            this.$.appIcon.handleLaunchParams(params);
            return;
        }
//	THIS CHUNK OF CODE IS FOR TESTING REMINDER LAUNCH PARAMS
//		if(!enyo.application.launchCount){
//			console.info("========= SETTING windowParams.alarm");
//			enyo.windowParams.alarm = [
//				{"_kind": "com.palm.service.calendar.reminders:1", "_id": "FAKEREMINDER1", "eventId": "2+801", "subject": "Reminder 1", "location": "somewhere", "isAllDay": false, "attendees":[], "emailAccountId": "", "startTime": 1271714400000, "endTime": 1271718000000, "alarmTime": 1271714100000, "autoCloseTime": 1271718000000, "isRepeating": false},
//				{"_kind": "com.palm.service.calendar.reminders:1", "_id": "FAKEREMINDER2", "eventId": "2+802", "subject": "Reminder 2", "location": "somewhere", "isAllDay": false,
//				"emailAccountId": "", "startTime": 1271714400000, "endTime": 1271718000000, "alarmTime": 1271714100000, "autoCloseTime": 1271718000000, "isRepeating": false, attendees: [{commonName: "Dana Sculley (FBI)", email:"dana.sculley@fbi.gov", role: "REQ-PARTICIPANT", organizer: true}, {commonName: "Fox Mulder (FBI)", role: "REQ-PARTICIPANT", email:"fox.mulder@fbi.gov"}]},
//				{"_kind": "com.palm.service.calendar.reminders:1", "_id": "FAKEREMINDER3", "eventId": "2+803", "subject": "Reminder 3", "location": "somewhere", "isAllDay": false, "attendees":[], "emailAccountId": "", "startTime": 1271714400000, "endTime": 1271718000000, "alarmTime": 1271714100000, "autoCloseTime": 1271718000000, "isRepeating": false}
//			];
//			enyo.application.launchCount = 1;
//		}

        if (params.alarm || params.alarmClose || params.alarmDeleted || params.alarmUpdated) {
            DEBUG && this.log("========= LAUNCHED REMINDER");
            enyo.application.reminderManager.handleLaunchParams(params);
        }

        else {
            // TODO: Going from no Calendar processes directly to launching a window means we initiate showing the view before we've gotten prefs.  Thus we only get defaults.  We need to defer until after we've gotten prefs.
            this.showCalendarView(params);

            DEBUG && this.log("======= LAUNCHING APP GUI...");
            enyo.windows.activate("app/calendar.html", "Calendar", params);	// Activate/open the Calendar GUI window.
        }

//		else if(params.makeABunchOfEvents){
//			this.db.makeABunchOfEvents(params.makeABunchOfEvents);
//		}
//		else if (params.launchType == "passwordInvalid") {
//			this.showPasswordNotification(params);
//		}
//		else{
//			if(app.exists){
//				if (params && params.reminders) {
//					//show reminders list
//				}
//
//				if(params && params.launchType == "editPassword"){
//					this.controller.closeStage("PasswordChangedNotification");
//					stageController.pushScene ("prefs");
//					stageController.pushScene ("accountlogin", params.accountId, params.login, null, null, "", null);
//				}
//			}
//		}
    },

    loadLibraries: function loadLibraries(global) {
        // Loads Calendar app's required libraries using MojoLoader:

        var libsInfo = [
            {
                name   : "calendar", // TODO: Create enyo-compatible version of Calendar loadable library.
                ourName: "Calendar",
                version: "1.0"
            }
//		,	{	name	: "unittest"
//			,	ourName	: "UnitTest"
//			,	version	: "1.0"
//			}
//		,	{	name	: "network.alerts"		// Replaces ConnectionWidget which wasn't used.
//			,	ourName	: "NetworkAlerts"		// Will need for send by bluetooth and before
//			,	version	: "1.0"					// launching account login view.
//			}
        ];

        var results = { pass: [], fail: [] };
        global = global || enyo.global || this.valueOf.apply() || this;			// Get a reference to the global scope

        // Attempt to load as many libraries as possible even if failures occur:
        libsInfo.forEach(function loadEachLibrary(info) {
            try {
                var lib = MojoLoader.require(info);

                if (info.ourName) {
                    if ("UnitTest" === info.ourName) {
                        global [info.ourName] = (global.Mojo || (Mojo = {})).Test = lib [info.name].UnitTest;

                    } else {
                        global [info.ourName] = lib [info.name];
                    }
                }
                results.pass.push(info.ourName ? info.ourName : info.name);
            } catch (e) {
                results.fail.push(info.ourName ? info.ourName : info.name);
                e.stack && console.error(e.stack);
            }
        });
        if (results.pass.length) {
            DEBUG && this.log("---:---: Successfully loaded libraries: ", results.pass);
        }
        if (results.fail.length) {
            this.error("---:---: Failed to load libraries: ", results.fail);
        }
        global.Calendar && (EventManager = Calendar.EventManager);
        return results;
    },

    shareCurrentDate: function shareCurrentDate(params) {
        enyo.application.share({
            currentDate: ((params && params.date && isFinite(+params.date) && new Date(params.date)) || new Date())
        }, {
            keep : (params && params.keep) ? !!params.keep : true,
            debug: (params && params.debug) ? !!params.debug : false
        });
    },

    showCalendarView: function showCalendarView(params) {
        var calendarWindow = enyo.windows.fetchWindow("Calendar"), // Find any pre-existing Calendar GUI Window.
            enyoApp = enyo.application;

        var launchDate,
            timeMachine = this.timeMachine,
            view;

        if (params && params.view) {
            view = params.view + "";	// Convert to string.
        } else {
            view = enyoApp.currentCalendarView || enyoApp.prefsManager.getNextLaunchView();
        }

        // Set up the launch date if there is one or if there isn't already a currentDate set && shared.
        if (params && params.date && isFinite(params.date)) {
            timeMachine.setTime(params.date);
            launchDate = new Date(timeMachine);
        } else if (!calendarWindow || !enyoApp.currentDate) {
            launchDate = new Date();
        }

        view && enyoApp.share({showView: {view: view, autoDate: launchDate ? false : true}}, {keep: true});

        if (launchDate) {

            // If the launch date is different than the current date, share it.
            timeMachine.setTime(+launchDate);
            var launch = +timeMachine.clearTime(),
                current = enyoApp.currentDate && (timeMachine.setTime(+enyoApp.currentDate), +timeMachine.clearTime());

            if (!current || launch != current) {
                enyoApp.share({currentDate: launchDate}, {keep: true});
            }
        }
    },

    watchClock: function defineWatchClock(keepGoing) {
        function watchClock(keepGoing) {
            /* Observes time changes and updates watchers.
             */

            top.clearTimeout(watchClock.thread);											// Clear any pre-existing watchClock timeout threads.
            if (keepGoing === false) {                                                      // If asked to stop, don't setup a new watchClock call.
                return;
            }
            var date = new Date(),
                delay = ((60 - date.getMinutes()) * 60000) - (date.getSeconds() * 1000);	// Calculate the milliseconds between now and the next hour
            watchClock.thread = top.setTimeout(watchClock, delay);							//		then delay watchClock until then.

            enyo.application.share({clock: date}, {keep: true});                            // Share the current date and time with clock watchers.
        }

        var self = this;			// Cache local reference to "this" used by local watchClock.
        this.watchClock = watchClock;	// Reassign this.watchClock to local watchClock closure.
        watchClock(keepGoing);			// First and only direct execution of local watchClock.
    }

});
