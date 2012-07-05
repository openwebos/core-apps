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


/* Copyright 2010 Palm, Inc.  All rights reserved. */

/*jslint laxbreak: true, white: false, devel: true, browser: true */
/*global Class, Mojo, Hash, $L, getAppAssistant, EventManager, Template, Foundations, PalmCall */

enyo.kind({
    name      : "ReminderManager",
    kind      : enyo.Component,
    published : {
        prefs               : null,
        accountsAndCalendars: null,
        reminderState       : null //We generate and also listen to reminderState. See dashboard below.
    },
    components: [
        {name: "snooze", kind: enyo.PalmService, service: "palm://com.palm.service.calendar.reminders/", method: "onSnooze", onResponse: "snoozeResponse"},
        {name: "dismiss", kind: enyo.PalmService, service: "palm://com.palm.service.calendar.reminders/", method: "onDismiss", onResponse: "dismissResponse"}
    ],

    create: function create() {
        var enyoApp = enyo.application;

        this.inherited(arguments);
        enyoApp.reminderManager = this;

        enyo.application.watch({accountsAndCalendars: this, prefs: this, reminderState: this}, {name: "ReminderManager"});	//We generate and also listen to reminderState. See dashboard below.

        this.reminders = {};
        this.queuedReminders = {remindersAdded: [], remindersToUpdate: [], eventIdsToClose: []};
        this.currentReminder = undefined;

        this.databaseManager = enyoApp.databaseManager;
        this.calendarsManager = enyoApp.calendarsManager;
        this.lunaAppManager = enyoApp.lunaAppManager;
    },

    destroy: function destroy() {
        var a = this.$,
            enyoApp = enyo.application;

        this.closeDialog();
        this.dismissAllReminders();

        // Cancel Services:
        a && a.snooze && a.snooze.cancel();
        a && a.dismiss && a.dismiss.cancel();

        enyo.application.ignore({reminderState: this});

        // Cleanup references.
        delete enyoApp.reminderManager;
        delete this.lunaAppManager;
        delete this.calendarsManager;
        delete this.databaseManager;

        this.inherited(arguments);
    },

    logReminders: function logReminders() {
//		console.info("==========================================================START");
//		var i = 0;
//		for (var item in this.reminders) {
//			if(this.reminders.hasOwnProperty(item) && this.reminders[item]){
//				console.info("=== item "+i+": "+item + " / "+this.reminders[item].subject);
//				i++;
//			}
//		}
//		console.info("==========================================================END");
    },

    rmlog: function rmlog(str) {
        //console.info("========= RM: "+str);
    },

    handleLaunchParams         : function handleLaunchParams(launchParams) {
        if (launchParams.alarm) {
            this.addReminders(launchParams.alarm);
            return;
        }

        if (launchParams.alarmClose) {
            this.closeReminders(launchParams.alarmClose);
            return;
        }

        if (launchParams.alarmDeleted) {
            this.closeRemindersByEventId(launchParams.alarmDeleted);
            return;
        }

        if (launchParams.alarmUpdated) {
            this.updateReminders(launchParams.alarmUpdated.update, launchParams.alarmUpdated.close);
            return;
        }
    },

    //Checks for an existing reminder window, and if nonexistant, creates one of the appropriate size.
    //If a reminder window does exist, if it's the correct size it reuses it, otherwise it closes, then opens a new one.
    openReminderWindow         : function openReminderWindow(reminder) {
        if (!reminder) {
            return;
        }	// TODO: make sure this is safe.
        var createWindow = (function createWindow(size) {
            var attributes = this.getReminderWindowAttributes();
            return enyo.windows.openPopup("app/reminders/reminder.html", "ReminderDialog" + size, "", attributes, size, true);
        }).bind(this);
        var attendees = reminder.attendees,
            num = attendees && attendees.length,
            hasButton = !(num === 1 && attendees[0].organizer || !num),
            size = hasButton ? ReminderManager.WINDOWSIZE_L : ReminderManager.WINDOWSIZE_S;
        //check for existing window
        if (!this.reminderWindow || this.reminderWindow.closed) {
            //no window detected, or closed window detected
            this.reminderWindow = createWindow(size);
        }
        else {
            //window detected, check size
            if (this.reminderWindowSize == ReminderManager.WINDOWSIZE_S && size == ReminderManager.WINDOWSIZE_L ||
                this.reminderWindowSize == ReminderManager.WINDOWSIZE_L && size == ReminderManager.WINDOWSIZE_S) {
                this.closeDialog();
                this.reminderWindow = createWindow(size);
            }
            else {
            }
            //else reuse the existing window
        }
        this.reminderWindowSize = size;
    },


    //There is a chance when we receive reminders that the calendars manager and the prefs manager are not finished getting their data yet,
    //and so calls into them may fail.  At reminder manager creation, we register to listen for prefs and accounts and calendars.
    //When the managers are ready, we can proceed with showing/updating a reminder.  Until then, we store any incoming reminders in queuedReminders.
    //Once we receive their notification, we can stop listening.
    accountsAndCalendarsChanged: function accountsAndCalendarsChanged() {
        //this.rmlog("Got accountsAndCalendarsChanged");
        this.calendarsManagerReady = true;
        enyo.application.ignore({accountsAndCalendars: this});
        if (this.calendarsManagerReady && this.prefsManagerReady) {
            this.managersReady = true;
            this.processQueuedReminders();
        }
    },

    prefsChanged: function prefsChanged() {
        //this.rmlog("Got prefsChanged");
        this.prefsManagerReady = true;
        enyo.application.ignore({prefs: this});
        if (this.calendarsManagerReady && this.prefsManagerReady) {
            this.managersReady = true;
            this.processQueuedReminders();
        }
    },

    processQueuedReminders: function processQueuedReminders() {
        //this.rmlog("Processing queued reminders");
        var queue = this.queuedReminders;
        var somethingToShow = queue.remindersAdded.length + queue.remindersToUpdate.length + queue.eventIdsToClose.length;
        this.addReminders(queue.remindersAdded);
        this.updateReminders(queue.remindersToUpdate, queue.eventIdsToClose);

        //reset the queue to empty
        this.queuedReminders = {remindersAdded: [], remindersToUpdate: [], eventIdsToClose: []};
    },

    //adds reminders to the reminders hash, shows one of them, and notifies the observers
    addReminders          : function addReminders(reminders) {
        this.logReminders();
        if (!reminders) {
            return;
        }

        //if managers we rely on are not fully initialized yet, we have to queue these reminders
        if (!this.managersReady) {
            //this.rmlog("addReminders: Queueing reminders");
            this.queuedReminders.remindersAdded = this.queuedReminders.remindersAdded.concat(reminders);
            return;
        }

        var remindersLength = reminders.length;
        var reminder;

        if (remindersLength === 0) {
            return;
        }

        for (var i = 0; i < remindersLength; i++) {
            reminder = reminders[i];
            reminder.state = ReminderManager.HIDDEN;
            reminder.startTime = parseInt(reminder.startTime, 10);
            reminder.endTime = parseInt(reminder.endTime, 10);
            reminder.alarmTime = parseInt(reminder.showTime, 10);
            reminder.showTime = parseInt(reminder.showTime, 10);
            reminder.autoCloseTime = parseInt(reminder.autoCloseTime, 10);
            reminder.subtitle = this.getReminderSubtitle(reminder);
            var cal = this.calendarsManager.getCal(reminder.calendarId);
            if (cal) {
                reminder.emailAccountId = cal.accountId;
            }
            this.checkForReplacement(reminder);
            //this.rmlog("addReminders: adding "+reminder._id);
            this.reminders[reminder._id] = reminder;
        }

        //assume that if we've received something to add, we have something to show.  And whatever it is, it's in the
        //list we just got.
        if (remindersLength === 1) {
            this.currentReminder = reminders[0];
        }
        else {
            this.currentReminder = this.whichReminderToShow(reminders);
        }

        this.openReminderWindow(this.currentReminder);
        //this.rmlog("addReminders: all reminders:  "+JSON.stringify(this.reminders));

        //this.rmlog("addReminders: displaying reminder:  "+JSON.stringify(reminder));

        var state = {current: this.currentReminder, dashboardReminders: this.getDashboardReminders(), currentChanged: true};
        enyo.application.share({reminderState: state}, {keep: true});
        //this.logReminders();
        //this.rmlog("addReminders: out");

    },

    //if events were updated while we had reminders showing, we need to update them.
    //it's possible the event's text or time was changed.
    updateReminders       : function updateReminders(remindersToUpdate, eventIdsToClose) {
        //this.rmlog("updateReminders: in");
        if (!remindersToUpdate && !eventIdsToClose) {
            return;
        }

        //if managers we rely on are not fully initialized yet, we have to queue these reminders
        if (!this.managersReady) {
            this.queuedReminders.remindersToUpdate = this.queuedReminders.remindersToUpdate.concat(remindersToUpdate);
            this.queuedReminders.eventIdsToClose = this.queuedReminders.eventIdsToClose.concat(eventIdsToClose);
            return;
        }

        var displayChanged = false;
        var remindersLength = remindersToUpdate.length;
        var eventIdsLength = eventIdsToClose.length;

        if (remindersLength === 0 && eventIdsLength === 0) {
            return;
        }

        var reminder;
        var changedCurrent = false;
        var showingReminder = this.currentReminder;
        var showingReminderEventId = this.currentReminder && this.currentReminder.eventId;

        for (var i = 0; i < remindersLength; i++) {
            reminder = remindersToUpdate[i];
            changedCurrent = (reminder.eventId == showingReminderEventId);
            var replacementStatus = this.checkForReplacement(reminder);
            if (replacementStatus.existed) {
                reminder.state = replacementStatus.state;
                reminder.startTime = parseInt(reminder.startTime, 10);
                reminder.endTime = parseInt(reminder.endTime, 10);
                reminder.alarmTime = parseInt(reminder.showTime, 10);
                reminder.showTime = parseInt(reminder.showTime, 10);
                reminder.autoCloseTime = parseInt(reminder.autoCloseTime, 10);
                reminder.subtitle = this.getReminderSubtitle(reminder);
                var cal = this.calendarsManager.getCal(reminder.calendarId);
                if (cal) {
                    reminder.emailAccountId = cal.accountId;
                }
                //this.rmlog("updateReminders: overwriting "+reminder._id);
                this.reminders[reminder._id] = reminder;
                if (changedCurrent) {
                    showingReminder = reminder;
                    displayChanged = true;
                }
            }
        }

        this.closeRemindersByEventId(eventIdsToClose);
        this.currentReminder = showingReminder;

        if (displayChanged) {
            this.openReminderWindow(this.currentReminder);
        }

        var state = {current: this.currentReminder, dashboardReminders: this.getDashboardReminders(), currentChanged: displayChanged};
        enyo.application.share({reminderState: state}, {keep: true});
        this.logReminders();
        //this.rmlog("updateReminders: out");
    },

    checkForReplacement: function checkForReplacement(reminder) {
        //this.rmlog("checkForReplacement: in");
        var replacementStatus = {existed: false, showing: false};
        for (var item in this.reminders) {
            if (this.reminders.hasOwnProperty(item) && this.reminders[item]) {
                var reminderInList = this.reminders[item];
                if (reminderInList.eventId === reminder.eventId) {
                    replacementStatus.existed = true;
                    replacementStatus.state = reminderInList.state;
                    //this.rmlog("checkForReplacement: deleting "+item);
                    delete this.reminders[item];
                    this.logReminders();
                    return replacementStatus;
                }
            }
        }
        return replacementStatus;
    },

    //removes reminders from the reminders hash, and notifies the observers
    removeReminders    : function removeReminders(reminderIds) {
        //this.rmlog("removeReminders: in");
        var reminderIdsLength = reminderIds.length;
        for (var i = 0; i < reminderIdsLength; i++) {
            //this.rmlog("removeReminders: deleting "+reminderIds[i]);
            delete this.reminders[reminderIds[i]];
        }
        this.logReminders();
        //this.rmlog("removeReminders: out");
    },

    //called by the reminder assistant
    //sets the state of the reminder to snoozed, launches the service to update the snooze time, and
    //displays the next reminder
    snoozeReminder     : function snoozeReminder(reminder) {
        //this.rmlog("snoozeReminder: in");
        reminder.state = ReminderManager.SNOOZED;
        //this.rmlog("snoozeReminder: overwriting "+reminder._id);
        this.reminders[reminder._id] = reminder;

        this.$.snooze.call({"reminderId": reminder._id});

        this.currentReminder = this.findAnotherReminder("show");
        this.openReminderWindow(this.currentReminder);
        var state = {current: this.currentReminder, dashboardReminders: this.getDashboardReminders(), currentChanged: true};
        enyo.application.share({reminderState: state}, {keep: true});
        //this.rmlog("snoozeReminder: out");
    },

    snoozeResponse     : function snoozeResponse(inSender, response) {
        //this.rmlog("snoozeResponse received: "+JSON.stringify(response));
    },

    //called by the reminder assistant
    //removes the reminder from the hash, launches the service to dismiss the reminder, and
    //displays the next reminder
    dismissReminder    : function dismissReminder(reminder) {
        //this.rmlog("dismissReminder: in");

        this.removeReminders([reminder._id]);
        this.$.dismiss.call({"reminderId": reminder._id, "eventId": reminder.eventId, "startTime": reminder.startTime});

        this.currentReminder = this.findAnotherReminder("show");
        this.openReminderWindow(this.currentReminder);
        //this.rmlog("dismissReminder: nextReminder: "+JSON.stringify(this.currentReminder));
        var state = {current: this.currentReminder, dashboardReminders: this.getDashboardReminders(), currentChanged: true};
        enyo.application.share({reminderState: state}, {keep: true});
        //this.rmlog("dismissReminder: out");
    },

    //called by the reminder assistant
    //removes each reminder from the hash, launches the service to dismiss the reminder, and
    //displays the next reminder
    dismissAllReminders: function dismissAllReminders(reminders) {
        //TODO: Make dismiss take a list, and do them as a batch
        //this.rmlog("dismissAllReminder: in");
        for (var item in this.reminders) {
            if (this.reminders.hasOwnProperty(item) && this.reminders[item]) {
                //this.rmlog("dismissAllReminder: dismissing "+item);
                this.dismissReminder(this.reminders[item]);
            }
        }
    },

    dismissResponse: function dismissResponse(inSender, response) {
        //this.rmlog("dismissResponse received: "+JSON.stringify(response));
    },

    //called by reminder service (through the app assistant)
    //removes the reminders from the hash, updates the display, and notifies the observers
    closeReminders : function closeReminders(reminderIds) {
        //this.rmlog("closeReminders: in. closing: "+JSON.stringify(reminderIds));
        var reminderIdsLength = reminderIds.length;
        var reminder;
        var changeDisplay = false;
        for (var i = 0; i < reminderIdsLength; i++) {
            reminder = this.reminders[reminderIds[i]];
        }

        this.removeReminders(reminderIds);

        this.currentReminder = this.findAnotherReminder("show");
        this.openReminderWindow(this.currentReminder);

        var state = {current: this.currentReminder, dashboardReminders: this.getDashboardReminders(), currentChanged: true};
        enyo.application.share({reminderState: state}, {keep: true});

        //this.rmlog("closeReminders: out");
    },

    closeRemindersByEventId: function closeRemindersByEventId(eventIds) {
        //this.rmlog("closeRemindersByEventId: in");
        if (!eventIds) {
            //this.rmlog("closeRemindersByEventId: no event ids");
            return;
        }

        var reminderIds = [];
        var eventIdsLength = eventIds.length;
        var eventId;

        for (var i = 0; i < eventIdsLength; i++) {
            eventId = eventIds[i];
            for (var item in this.reminders) {
                if (this.reminders.hasOwnProperty(item) && this.reminders[item]) {
                    var reminder = this.reminders[item];
                    if (reminder.eventId == eventId) {
                        reminderIds.push(reminder._id);
                    }
                }
            }
        }
        if (reminderIds.length > 0) {
            this.closeReminders(reminderIds);
        }
        //this.rmlog("closeRemindersByEventId: out");
    },

    closeDialog: function closeDialog() {
        if (this.reminderWindow) {
            //this.rmlog("CLOSING DIALOG WINDOW");
            this.reminderWindow.close();
            this.reminderWindow = undefined;
        }
    },

    getNumReminders: function getNumReminders() {
        var count = 0;
        for (var item in this.reminders) {
            if (this.reminders.hasOwnProperty(item) && this.reminders[item]) {
                count++;
            }
        }
        //this.rmlog("numReminders: "+count);
        return count;
    },

    isValidReminder    : function isValidReminder(reminderId) {
        return !!(this.reminders[reminderId]);
    },

    //If the reminder's showTime is after its startTime, then that means it's waking up out of a snooze,
    //and should probably be the one shown.  Otherwise, find the one whose time is closest to now, and
    //show that one.
    whichReminderToShow: function whichReminderToShow(reminders) {
        //this.rmlog("whichReminderToShow: in");
        var reminder;
        var snoozedReminder;
        var remindersLength = reminders.length;

        if (remindersLength === 0) {
            //this.rmlog("whichReminderToShow: none");
            return reminder;
        }

        var now = new Date().getTime();
        var closestReminder = reminders[0];
        var timeDiff = now - closestReminder.startTime;

        for (var i = 0; i < remindersLength; i++) {
            reminder = reminders[i];
            if (reminder.showTime > reminder.startTime) {
                snoozedReminder = reminder;
            }
            else if ((now - reminder.startTime) < timeDiff) {
                timeDiff = now - reminder.startTime;
                closestReminder = reminders[i];
            }
        }
        reminder = (snoozedReminder ? snoozedReminder : closestReminder);
        //this.rmlog("whichReminderToShow: out: "+reminder._id);
        return reminder;
    },

    //Searches the reminder hash for something to show.  If showOrDash == show, will only select from reminders eligible
    //to be shown (not snoozed).  Otherwise, it will select from all the snoozed/hidden reminders
    findAnotherReminder: function findAnotherReminder(showOrDash) {
        //this.rmlog("findAnotherReminder: in:");
        var reminderList = [];
        var reminder;
        for (var item in this.reminders) {
            if (this.reminders.hasOwnProperty(item) && this.reminders[item]) {
                reminder = this.reminders[item];
                if (reminder.state == ReminderManager.HIDDEN) {
                    reminderList.push(reminder);
                }
            }
        }

        if (showOrDash == "show") {
            reminder = this.whichReminderToShow(reminderList);
        }
        else {
            if (reminderList.length > 0) {
                reminder = reminderList[0];
            }
        }
        if (reminder) {
            //this.rmlog("findAnotherReminder: out: "+reminder._id);
        }
        else {
            //this.rmlog("findAnotherReminder: out: no reminder");
        }
        return reminder;
    },

    //subtitle is used by the dashboard
    getReminderSubtitle: function getReminderSubtitle(reminder) {

        //We can either load date.js into a context available to reminder manager, or use these.
        //Since loading date.js more than once causes problems, let's just use these.
        function clearTime(date) {
            date.setHours(0);
            date.setMinutes(0);
            date.setSeconds(0);
            date.setMilliseconds(0);
            return date;
        }

        ;

        function addDays(date, incrm) {
            date.setDate(date.getDate() + incrm);
            return date;
        }

        ;

        var templateValues = {}
            , template = null
            , templateString
            , dateFormat = {date: "short"}
            , dateTimeFormat = {format: "short"};

        this.dateFormatter = this.dateFormatter || new enyo.g11n.DateFmt(reminder.isAllDay ? dateFormat : dateTimeFormat);

        if (reminder.startTime) {
            var eventDate = clearTime(new Date(reminder.startTime)).getTime()
                , today = clearTime(new Date()).getTime()
                , yesterday = clearTime(addDays(new Date(), -1)).getTime()
                , tomorrow = clearTime(addDays(new Date(), 1)).getTime();

            switch (eventDate) {
            case today:
                templateValues.day = $L('Today');
                break;
            case yesterday:
                templateValues.day = $L('Yesterday');
                break;
            case tomorrow:
                templateValues.day = $L('Tomorrow');
                break;
            default:
                templateValues.day = this.dateFormatter.format(new Date(eventDate));
                break;
            }
        }

        if (reminder.location) {
            templateValues.location = reminder.location;
            templateString = $L("#{day} at #{location}");
        }
        else {
            templateString = $L("#{day}");
        }

        template = new enyo.g11n.Template(templateString);
        return template.evaluate(templateValues);
    },

    getAllReminders: function getAllReminders() {
        var remindersList = [];
        for (var item in this.reminders) {
            if (this.reminders.hasOwnProperty(item) && this.reminders[item]) {
                remindersList.push(this.reminders[item]);
            }
        }
        return remindersList;
    },

    getReminderWindowAttributes: function getReminderWindowAttributes() {
        var sound;
        var useSound = false;
        var attrbs = {};
        var prefsManager = enyo.application.prefsManager;
        var prefs = prefsManager.prefs;
        var options = enyo.clone(calendar.PrefsManager.alarmSoundOptions);	// Since this is a simple object, we can use enyo.clone to perform a shallow copy.

        //due to previous implementations, it's possible that in the db, alarmSoundOn is a string ("1", "2", etc.)
        //OR a boolean (true, false), so let's convert it to a number, because switch statements use a strict equality test ( 2 != "2")
        if (typeof prefs.alarmSoundOn != "number") {
            prefs.alarmSoundOn = Number(prefs.alarmSoundOn);
        }
        switch (prefs.alarmSoundOn) {
        case options.mute:
            sound = "none";
            break;

        case options.ringtone:
            sound = prefs.ringtonePath;
            useSound = true;
            break;

        case options.vibrate:
            sound = "vibrate";
            break;

        case options.systemSound:
            sound = "calendar";
            break;

        default:
            sound = "calendar";
            break;
        }

        attrbs = {};
        attrbs [(useSound ? "sound" : "soundclass")] = sound;
        return attrbs;
    },

    //Attendees button clicked - crosslaunch email
    sendEmail                  : function sendEmail(subject, attendees, body, emailAccountId) {
        var launchInfo = {
            accountId: emailAccountId,
            to       : attendees,
            subject  : subject,
            body     : body
        };
        this.lunaAppManager.composeEmail(launchInfo);
    },

    showEventDetails: function showEventDetails(reminder) {
        //this.rmlog("show event details");
        this.lunaAppManager.launchCalendarDetails({eventId: reminder.eventId, startTime: reminder.startTime, endTime: reminder.endTime});
    },

    showMissedRemindersList: function showMissedRemindersList() {
        this.lunaAppManager.launchCalendarMissedReminders();
    },

    //Dashboard reminders is everything except the currently displayed reminder
    getDashboardReminders  : function getDashboardReminders() {
        var dr = JSON.parse(JSON.stringify(this.reminders));  //EVIL - Don't have ObjectUtils.clone anymore
        if (this.currentReminder) {
            delete dr[this.currentReminder._id];
        }
        var drList = [];
        for (var item in dr) {
            if (dr.hasOwnProperty(item) && dr[item]) {
                drList.push(dr[item]);
            }
        }
        return drList;
    },


    //===== DASHBOARD FUNCTIONS ===================================================================


    reminderStateChanged: function () {
        this.dashboardList = this.reminderState.dashboardReminders;
        //this.rmlog("DASH: remindersUpdated: dash list: "+JSON.stringify(this.dashboardList));
        this.updateDashboard();
    },

    updateDashboard   : function updateDashboard() {
        //this.rmlog("DASH: update dashboard");
        var length = this.dashboardList.length;
        var layers = [];

        //If we don't already have a dashboard, make one.
        if (!this.dashboard) {
            this.dashboard = this.createComponent({
                name        : "dashboard",
                kind        : enyo.Dashboard,
                onIconTap   : "dashIconTap",
                onMessageTap: "dashDetailsClicked",
                onUserClose : "dashDismissAll",
                onLayerSwipe: "dashDismissOne",
                smallIcon   : "images/header-icon-calendar.png"
            });
        }
        for (var i = 0; i < length; i++) {
            var reminder = this.dashboardList[i];
            var layer = {
                icon    : "images/notification-large-calendar.png",
                title   : reminder.subject,
                text    : this.getReminderSubtitle(reminder),
                reminder: reminder
            };
            layers.push(layer);
        }
        try {
            this.dashboard.setLayers(layers);
        } catch (e) {
            //do nothing.  There's a chance that we're setting the layers to empty after the window was closed.
            //Due to oddities in the dashboard's test for the existence of the window, it might try to close it twice, and
            //cause an error.
        }

    },

    //If there was more than one reminder in the list, launch the missed reminders list.
    //Otherwise, show the detail view of the event.
    dashIconTap       : function dashIconTap() {
        //this.rmlog("DASH: Icon tap");
        if (this.dashboardList.length > 1) {
            this.doShowMissedRemindersList();
        }
        else {
            this.showEventDetails(this.reminders[0]);
        }
    },

    //Launch the full app and show the detail view of the event.
    dashDetailsClicked: function dashDetailsClicked(inSender, layer) {
        //this.rmlog("DASH: Show event");
        //launch edit view
        this.showEventDetails(layer.reminder);
        this.dismissReminder(layer.reminder);
    },

    //Individual dashboard reminder swiped.  Dismiss the reminder.
    dashDismissOne    : function dashDismissOne(inSender, layer) {
        //this.rmlog("DASH: dashDismissOne");
        this.dismissReminder(layer.reminder);
    },

    //Last dashboard reminder swiped.  Dashboard is closed.  We shouldn't have any more reminders.
    dashDismissAll    : function dashDismissAll() {
        //this.rmlog("DASH: dashDismissAll");
        if (this.getDashboardReminders().length) {
            //this.rmlog("DASH: dashDismissAll: DISMISSING ALL");
            this.dismissAllReminders();
        }
    }
});

ReminderManager.HIDDEN = 1;
ReminderManager.SNOOZED = 2;
ReminderManager.SHOWING = 3;

ReminderManager.WINDOWSIZE_S = "116px";
ReminderManager.WINDOWSIZE_L = "158px";
