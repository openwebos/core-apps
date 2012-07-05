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
/* Copyright 2011 Palm, Inc.  All rights reserved. */



/*jslint laxbreak: true, white: false */
/*global CalendarsManager, DatabaseManager, Mojo
 */

enyo.kind({
    name     : "calendar.PrefsManager",
    kind     : enyo.Component,
    statics  : {
        alarmSoundOptions: {
            mute       : 0,
            systemSound: 1,
            ringtone   : 2,
            vibrate    : 3
        },
        defaultPrefs     : {
            _kind                     : null, // Should be DatabaseManager.calendarPrefsTable, but DatabaseManager may not yet be defined.
            alarmSoundOn              : 1, // systemSound
            autoDefaultCalendarID     : 0,
            defaultAllDayEventReminder: "-P1D",
            defaultCalendarID         : 0,
            defaultEventDuration      : 60,
            defaultEventReminder      : "-PT15M",
            defaultLaunchView         : "DayView", // Use "last" to remember last used calendar view.  Other values are DayView, DayAgendaView, WeekView, WeekAgendaView, and MonthView.
            endTimeOfDay              : -111599994, // This is based on UTC
            isFirstUse                : true,
            nextLaunchView            : "DayView", // View to use during next launch.  Values are DayView, DayAgendaView, WeekView, WeekAgendaView, and MonthView.
            startOfWeek               : 1, // Sunday
            startTimeOfDay            : -226799992, // This is based on UTC
            userChangedStartOfWeek    : false
        },
        // NOTE: Schema entries set to "true" will always validate as "true".
        // TODO: Need dynamic schema that can pull in data from other sources.
        schema           : {
            _kind                     : true,
            alarmSoundOn              : [
                {caption: $L("Vibrate"), value: 3},
                {caption: $L("System Sound"), value: 1},
                {caption: $L("Mute"), value: 0}
            ],
            autoDefaultCalendarID     : true,
            defaultAllDayEventReminder: [
                {caption: $L("No Reminder"), value: "none"},
                {caption: $L("At start time"), value: "-PT0M"},
                {caption: $L("1 day before"), value: "-P1D"},
                {caption: $L("2 days before"), value: "-P2D"},
                {caption: $L("3 days before"), value: "-P3D"},
                {caption: $L("1 week before"), value: "-P1W"}
            ],
            defaultCalendarID         : true,
            defaultEventDuration      : [
                {caption: $L("30 minutes"), value: 30},
                {caption: $L("1 hour"), value: 60},
                {caption: $L("2 hours"), value: 120}
            ],
            defaultEventReminder      : [
                {caption: $L("No Reminder"), value: "none"},
                {caption: $L("At start time"), value: "-PT0M"},
                {caption: $L("5 minutes before"), value: "-PT5M"},
                {caption: $L("10 minutes before"), value: "-PT10M"},
                {caption: $L("15 minutes before"), value: "-PT15M"},
                {caption: $L("30 minutes before"), value: "-PT30M"},
                {caption: $L("1 hour before"), value: "-PT1H"},
                {caption: $L("1 day before"), value: "-P1D"}
            ],
            defaultLaunchView         : [
                {caption: $L("Last Used"), value: "last"},
                {caption: $L("Day"), value: "DayView"},
                {caption: $L("Day Agenda"), value: "DayAgendaView"},
                {caption: $L("Week"), value: "WeekView"},
                {caption: $L("Week Agenda"), value: "WeekAgendaView"},
                {caption: $L("Month"), value: "MonthView"}
            ],
            endTimeOfDay              : true,
            isFirstUse                : [
                true,
                false
            ],
            nextLaunchView            : [
                "DayView",
                "DayAgendaView",
                "WeekView",
                "WeekAgendaView",
                "MonthView"
            ],
            startOfWeek               : [
                // TODO: g11n - update this when we implement alternate calendar support
                {caption: $L("Sunday"), value: 1},
                {caption: $L("Monday"), value: 2},
                {caption: $L("Tuesday"), value: 3},
                {caption: $L("Wednesday"), value: 4},
                {caption: $L("Thursday"), value: 5},
                {caption: $L("Friday"), value: 6},
                {caption: $L("Saturday"), value: 7}
            ],
            startTimeOfDay            : true,
            userChangedStartOfWeek    : [
                true,
                false
            ]
        }
    },
    published: {
        _kind                     : null, // Should be DatabaseManager.calendarPrefsTable, but DatabaseManager may not yet be defined.
        alarmSoundOn              : 1, // systemSound
        autoDefaultCalendarID     : 0,
        defaultAllDayEventReminder: "-P1D",
        defaultCalendarID         : 0,
        defaultEventDuration      : 60,
        defaultEventReminder      : "-PT15M",
        defaultLaunchView         : "DayView", // Use "last" to remember last used calendar view.  Other values are DayView, DayAgendaView, WeekView, WeekAgendaView, and MonthView.
        endTimeOfDay              : -111599994, // This is based on UTC
        isFirstUse                : true,
        nextLaunchView            : "DayView", // View to use during next launch.  Values are DayView, DayAgendaView, WeekView, WeekAgendaView, and MonthView.
        startOfWeek               : 1, // Sunday
        startTimeOfDay            : -226799992, // This is based on UTC
        userChangedStartOfWeek    : false
    },

    create: function PrefsManager() {
        var enyoApp = enyo.application;

        enyoApp.prefsManager = this;
        this.databaseManager = enyoApp.databaseManager;
        this.calendarsManager = enyoApp.calendarsManager;

        this.gotPrefs = enyo.bind(this, this.gotPrefs);
        this.readPrefsFailed = enyo.bind(this, this.readPrefsFailed);
        this.savedPrefs = enyo.bind(this, this.savedPrefs);
        this.readPrefs();

        this.inherited(arguments);

        this.schema = Utilities.deepCloneObject(calendar.PrefsManager.schema);	// Do a deep clone so we can do more dynamic schema manipulation.
    },

    destroy: function destroy() {
        delete enyo.application.prefsManager;
        delete this.databaseManager;
        delete this.calendarsManager;

        this.inherited(arguments);
    },

// BEGIN :-------: Published Property Handlers :--------------------------------------------------------------------------------------------------------------//
// TODO: Figure out a way to automate the below better.
// Too much redundancy.  It would great if I could automate the construction of the getters & setters; this may have to be done another way.

    alarmSoundOnChanged: function alarmSoundOnChanged(oldAlarmSoundOn) {
        if (!this.validatePref("alarmSoundOn", this.alarmSoundOn)) {
            this.alarmSoundOn = oldAlarmSoundOn;		// Undo the change since we need a valid value.
        }
        this.prefs.alarmSoundOn = this.alarmSoundOn;	// Pass through to prefs.
    },

    defaultAllDayEventReminderChanged: function defaultAllDayEventReminderChanged(oldDefaultAllDayEventReminder) {
        if (!this.validatePref("defaultAllDayEventReminder", this.defaultAllDayEventReminder)) {
            this.defaultAllDayEventReminder = oldDefaultAllDayEventReminder;		// Undo the change since we need a valid value.
        }
        this.prefs.defaultAllDayEventReminder = this.defaultAllDayEventReminder;	// Pass through to prefs.
    },

    defaultCalendarIDChanged: function defaultCalendarIDChanged(oldDefaultCalendarIDChanged) {
        if (!this.validatePref("defaultCalendarID", this.defaultCalendarID)) {
            this.defaultCalendarID = oldDefaultCalendarIDChanged;		// Undo the change since we need a valid value.
        }
        this.prefs.defaultCalendarID = this.defaultCalendarID;	// Pass through to prefs.
    },

    defaultEventDurationChanged: function defaultEventDurationChanged(oldDefaultEventDuration) {
        if (!this.validatePref("defaultEventDuration", this.defaultEventDuration)) {
            this.defaultEventDuration = oldDefaultEventDuration;		// Undo the change since we need a valid value.
        }
        this.prefs.defaultEventDuration = this.defaultEventDuration;	// Pass through to prefs.
    },

    defaultEventReminderChanged: function defaultEventReminderChanged(oldDefaultEventReminder) {
        if (!this.validatePref("defaultEventReminder", this.defaultEventReminder)) {
            this.defaultEventReminder = oldDefaultEventReminder;		// Undo the change since we need a valid value.
        }
        this.prefs.defaultEventReminder = this.defaultEventReminder;	// Pass through to prefs.
    },

    defaultLaunchViewChanged: function defaultLaunchViewChanged(oldDefaultLaunchView) {
        if (!this.validatePref("defaultLaunchView", this.defaultLaunchView)) {
            this.defaultLaunchView = oldDefaultLaunchView;		// Undo the change since we need a valid value.
        }
        this.prefs.defaultLaunchView = this.defaultLaunchView;	// Pass through to prefs.

        // Run setNextLaunchView() through again with the current setting since it may need to change.
        this.setNextLaunchView(this.nextLaunchView);
    },

    nextLaunchViewChanged: function nextLaunchViewChanged(oldNextLaunchView) {
        var defaultLaunchView = this.defaultLaunchView,
            nextLaunchView = this.nextLaunchView;

        if (!this.validatePref("nextLaunchView", nextLaunchView)) {
            this.nextLaunchView = oldNextLaunchView;		// Undo the change since we need a valid value.
        }

        if (defaultLaunchView != "last" && nextLaunchView != defaultLaunchView) {
            this.nextLaunchView = defaultLaunchView;		// Change back to the default launch view.
        }

        this.prefs.nextLaunchView = this.nextLaunchView;	// Pass through to prefs.
    },

    startOfWeekChanged: function startOfWeekChanged(oldStartOfWeek) {
        if (!this.validatePref("startOfWeek", this.startOfWeek)) {
            this.startOfWeek = oldStartOfWeek;		// Undo the change since we need a valid value.
        }
        this.prefs.startOfWeek = this.startOfWeek;	// Pass through to prefs.
    },

    userChangedStartOfWeekChanged: function userChangedStartOfWeekChanged(oldUserChangedStartOfWeek) {
        if (!this.validatePref("userChangedStartOfWeek", this.userChangedStartOfWeek)) {
            this.userChangedStartOfWeek = oldUserChangedStartOfWeek;		// Undo the change since we need a valid value.
        }
        this.prefs.userChangedStartOfWeek = this.userChangedStartOfWeek;	// Pass through to prefs.
    },

// BEGIN :-------: Custom Methods :---------------------------------------------------------------------------------------------------------------------------//

    deleteCB: function deleteCB(response) {
        //this.plog("Spares deleted: "+JSON.stringify(response));
    },

    getDefaultCalendar: function getDefaultCalendar() {
        //this.plog("getDefaultCalendar: defaultCalendarId: "+ this.prefs.defaultCalendarID + "autodDefaultCalendarId: " +this.prefs.autoDefaultCalendarID);

        if (!this.prefs.defaultCalendarID) {
            // The user hasn't manually set the default calendar, so let's use
            // some smarts to figure this one out
            if (this.prefs.autoDefaultCalendarID === 0) {
                // If there is a calendar account other than Local, let's use that one
                var nonLocalCalId = this.calendarsManager.getNonLocalCalendarId(true /*excludeReadOnly*/);
                if (nonLocalCalId !== 0) {
                    //this.plog("getDefaultCalendar: Found a non-local calendar");
                    // Save the setting so the same calendar is returned as default next time
                    this.prefs.autoDefaultCalendarID = nonLocalCalId;
                    // Save the updated autoDefaultCalendarID calendar preference to the database:
                    this.savePrefs(this.prefs);
                } else {
                    //this.plog("getDefaultCalendar: Could not find a non-local calendar");
                    // If there is no non-local account we return the local calendar, but
                    // DO NOT save it in the prefs
                    return this.calendarsManager.getLocalCalendarId();
                }
            }
            return this.prefs.autoDefaultCalendarID;
        } else {
            if (typeof this.prefs.defaultCalendarID == "string") {
                return this.prefs.defaultCalendarID;
            }
            else {
                return this.prefs.defaultCalendarID.calendarId;
            }

        }
    },

    getPrefs: function getPrefs() {
        return this.prefs;
    },

    gotPrefs: function gotPrefs(response) {
        //this.plog("gotPrefs: "+JSON.stringify(response));
        var fmts = new enyo.g11n.Fmts(),
            localeStartOfWeek = fmts.getFirstDayOfWeek() + 1,
            results = response && response.results,
            resultsLength = results && results.length,
            saveToDB = false;

        if (resultsLength === 0) {
            // No preferences exist in the db so create defaults:
            this.prefs = enyo.clone(calendar.PrefsManager.defaultPrefs);	// Since this is a simple object, we can use enyo.clone to perform a shallow copy.
            //this.plog("gotPrefs: using default prefs");
            this.prefs.startOfWeek = localeStartOfWeek;
            saveToDB = true;
        }
        else {
            this.prefs = results[0];
            //this.plog("gotPrefs: using db prefs");
        }

        if (resultsLength > 1) {
            var latestPrefIndex = 0;
            var latestPrefRev = results[0]._rev;
            var idsToDelete = [results[0]._id];
            //find the latest one
            for (var i = 1; i < resultsLength; i++) {
                var rev = results[i]._rev;
                idsToDelete.push(results[i]._id);
                if (rev > latestPrefRev) {
                    latestPrefIndex = i;
                    latestPrefRev = rev;
                }
            }
            this.prefs = results[latestPrefIndex];
            //this.plog("gotPrefs: spare prefs in the db!");
            idsToDelete.splice(latestPrefIndex, 1);

            //delete the spares
            this.databaseManager.deleteByIds(idsToDelete, this.deleteCB, this.deleteCB);
        }

        if (this.prefs.startOfWeek != localeStartOfWeek && !this.prefs.userChangedStartOfWeek) {
            //if system start of week is not the same as ours, and it's not because the user changed it, update our start of week.
            //don't notify, because notification will happen at the end of saveToDB.
            this.prefs.startOfWeek = localeStartOfWeek;
            saveToDB = true;
        }

        if (saveToDB) {
            //this.plog("gotPrefs: saving prefs");
            this.savePrefs(this.prefs);
        }

        // NOTE: Only override the default value if there is something override the default value WITH.
        // We need to set these directly when pulling from the database because the *Changed() methods may be interdependent.
        var schemaKeys = Object.keys(calendar.PrefsManager.schema);
        for (var x = 0, numKeys = schemaKeys.length; x < numKeys; ++x) {
            this.prefs[schemaKeys[x]] && (this[schemaKeys[x]] = this.prefs[schemaKeys[x]]);
        }

        enyo.application.share({prefs: this.prefs}, {keep: true});
    },

    plog: function plog(str) {
        //console.info("====== PrefsManager: "+str);
    },

    readPrefs: function readPrefs(options) {
        if (options && options.fromDB) {
            this.prefs = null;						// Clear local cache of preferences.
            enyo.application.free({prefs: true});	// Free any previously shared preferences that were kept.
        }
        if (this.prefs) {
            //this.plog("readPrefs: returning pre-exising prefs: "+JSON.stringify(this.prefs));
            enyo.application.share({prefs: this.prefs}, {keep: true});
            return;
        }
        if (!calendar.PrefsManager.defaultPrefs._kind) {
            calendar.PrefsManager.defaultPrefs._kind = enyo.application.databaseManager.calendarPrefsTable;
        }
        //this.plog("readPrefs: getting prefs from db");
        this.readRequest = this.databaseManager.getCalendarPrefs(this.gotPrefs, this.readPrefsFailed);
    },

    readPrefsFailed: function readPrefsFailed(response) {
        console.log("Reading preferences failed! " + JSON.stringify(response));
    },

    save: function save() {
        return this.savePrefs(this.prefs);
    },

    savedPrefs: function savedPrefs(response) {
        // Release the db service request:
        if (!response.returnValue || !response.results.length) {
            console.error("Calendar preferences not saved! " + JSON.stringify(response));
            return;
        }

        //this.plog("savedPrefs: "+JSON.stringify(response));
        // Update the _id and _rev fields of the cached preferences so subsequent updates will succeed:
        var results = response.results[0];
        this.prefs._id = results.id;
        this.prefs._rev = results.rev;

        //Notify observers
        enyo.application.share({prefs: this.prefs}, {keep: true});
    },

    savePrefs: function savePrefs(prefs) {
        if (!prefs) {
            //this.plog("savePrefs: asked to save, but no prefs supplied");
            return false;
        }
        if (!this.validatePrefs(prefs)) {
            return false;
        }

        this.prefs = prefs;

        //this.plog("savePrefs: saving: "+JSON.stringify(prefs));
        this.saveRequest = this.databaseManager.setCalendarPrefs(this.prefs, this.savedPrefs, this.savedPrefs);
        return true;
    },

    validateDefaultCalPref: function validateDefaultCalPref() {
        //this.plog("validateDefaultCalPref");

        if (!this.prefs) {
            return;
        }
        var prefsChanged = false;
        var calMgr = enyo.application.calendarsManager;
        var defaultCalId = this.prefs.defaultCalendarID;
        var calId;
        var cal;

        // NOTE: Prior to July 2011, defaultCalendarID was a calendar database ID.  However, since during backup/restore,
        //the id of a particular calendar is not the same, it was impossible to find the user's previously chosen
        //default calendar choice.  Thus, in July 2011, it was decided to store the defaultCalendarID as a
        //few pieces of information that should uniquely identify a calendar, regardless of its database ID.
        //New defaultCalendarID format:
        // { UID: UID of the calendar from the transport,
        //   name: name of the calendar,
        //   username: account username,
        //   calendarId: calendar database ID. Not used for comparison purposes, only for potentially easy lookup
        // }

        //If defaultCalendarID has a value, determine if it's old format (a string) or new format (an object)
        //and try to match it to one of the existing calendars.
        if (defaultCalId) {

            //If we have a defaultCalId, and it's a string, try to find a calendar with that database ID.  If it exists, convert the defaultCalId to the object format.
            if (typeof defaultCalId == "string") {
                calId = defaultCalId;
                cal = calMgr.getCal(calId);
                if (cal) {
                    //defaultCalendarID is a string, and it matches an existing calendar database ID. Convert it to the new object format
                    username = calMgr.getCalAccountUser(cal._id);
                    this.prefs.defaultCalendarID = {
                        UID       : cal.UID,
                        calendarId: cal._id,
                        name      : cal.name,
                        username  : username
                    }
                }
                else {
                    //defaultCalendarID is a string, but it does not match an existing calendar. Clear the value, so we know to use the autoDefaultCalendar.
                    this.prefs.defaultCalendarID = null;
                }
                prefsChanged = true;
            }

            //If we have a defaultCalId, and it's an object string, try to find the calendar.
            else if (typeof defaultCalId == "object") {

                //First look using the database ID.  If it exists, then the object is correct, and the default calendar pref is valid.
                calId = defaultCalId.calendarId;
                if (!calId || !calMgr.getCal(calId)) {

                    //If it doesn't exist, search the existing calendars for a match by comparing UID, username, and name.
                    var calList = calMgr.getCalendarsList({excludeReadOnly: true, sorted: true});
                    var numCals = calList && calList.length;
                    var username;
                    for (var i = 0; i < numCals; i++) {
                        cal = calList[i];
                        username = calMgr.getCalAccountUser(cal._id);
                        username = username && username.toLowerCase();
                        defaultUsername = defaultCalId.username && defaultCalId.username.toLowerCase();
                        //if our default calendar info matches an existing calendar but with a different id, use that calendar as the default.
                        //Set the calendarId to the right value, and the default calendar pref is valid.
                        if (cal.UID == defaultCalId.UID && cal.name == defaultCalId.name && username == defaultUsername) {
                            this.prefs.defaultCalendarID = {
                                UID       : cal.UID,
                                calendarId: cal._id,
                                name      : cal.name,
                                username  : username
                            }
                            prefsChanged = true;
                            break;
                        }
                    }
                    //If we made it through the whole list without breaking, then we didn't find the calendar.
                    //Clear the value, so we know to use the autoDefaultCalendar.
                    if (i == numCals) {
                        this.prefs.defaultCalendarID = null;
                        prefsChanged = true;
                    }
                }
            }
        }

        if (this.prefs.autoDefaultCalendarID !== 0) {
            if (this.calendarsManager.getCalName(this.prefs.autoDefaultCalendarID) === undefined) {
                //this.plog("validateDefaultCalPref: autoDefaultCalendarID is no longer available");
                // The calendar the app chose to be the default is no longer there
                this.prefs.autoDefaultCalendarID = 0;
                prefsChanged = true;
            }
        }

        if (prefsChanged) {
            // Save updated preferences to the database:
            this.savePrefs(this.prefs);
        }
    },

    validatePref: function validatePref(pref, val) {
        var valid;

        function validateSchemaValue(schemaValue) {
            return val === ((schemaValue && schemaValue.value) ? schemaValue.value : schemaValue);
        }

        if (!pref || typeof pref != "string") {
            this.log("Pref name is not a string.");
            return false;
        }

        if (!calendar.PrefsManager.schema[pref]) {
            this.log("Pref '", pref, "' is not in the schema.");
            return false;
        }

        valid = calendar.PrefsManager.schema[pref] === true || calendar.PrefsManager.schema[pref].some(validateSchemaValue);
        if (!valid) {
            this.log("Pref '", pref, "': Value '", val, "' is not valid.")
        }

        return valid;
    },

    validatePrefs: function validatePrefs(prefs) {
        if (!prefs) {
            return false;
        }

        var schemaKeys = Object.keys(calendar.PrefsManager.schema);
        for (var x = 0, numKeys = schemaKeys.length; x < numKeys; ++x) {
            if (!this.validatePref(schemaKeys[x], prefs[schemaKeys[x]])) {
                return false;
            }
        }
        return true;
    }
});

