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
/*Copyright 2011 Palm, Inc.  All rights reserved. */



/*jslint laxbreak: true, white: false, devel: true */
/*global $L, enyo */

/**
 NOTE: CalendarsManager manages the Calendar app's accounts and calendars.

 **/
enyo.kind({
    name      : "CalendarsManager",
    kind      : enyo.Component,
    components: [
        {name: "getAccounts", kind: "Accounts.getAccounts", onGetAccounts_AccountsAvailable: "gotAccounts"},
        {name: "syncAccount", kind: enyo.PalmService, service: "palm://com.palm.activitymanager/", method: "create", onResponse: "syncAccountResponse"}
    ],

    constructor: function CalendarsManager() {
        this.inherited(arguments);
        this.getCalendarsFailed = enyo.bind(this, this.getCalendarsFailed);
        this.gotCalendars = enyo.bind(this, this.gotCalendars);
        this.setCalendarColorCallback = enyo.bind(this, this.setCalendarColorCallback);
        this.setCalendarsCallback = enyo.bind(this, this.setCalendarsCallback);
        this.watchCalendarsFired = enyo.bind(this, this.watchCalendarsFired);
    },

    create: function create() {
        var enyoApp = enyo.application;
        this.inherited(arguments);
        enyoApp.calendarsManager = this;
        this.db = enyoApp.databaseManager;
        this.calendarIcons = {};
        this.calendarMenuIcons = {};
        this.rawAccounts = {};
        this.accountTemplates = {};
        this.excludeFromAllList = {};

        this.colorList = ["blue", "green", "yellow", "orange", "pink", "red", "purple", "teal"]; // Do NOT Localize
        this.usedCalendarColors = {};
        this.nextColorIndex = 0;
        this.lastRevSet = 0;
    },

    ready: function ready() {
        this.getAccounts();
    },

    destroy: function destroy() {
        delete enyo.application.calendarsManager;
        this.inherited(arguments);
    },

    cmlog: function calmgrlog(string) {
        //console.info("======= CalMgr: "+string);
    },

    getAccounts: function getAccounts() {
        //this.cmlog("1: getAccounts");
        this.$.getAccounts.getAccounts({capability: "CALENDAR"});	// Get accounts that have a calendar capability.  This also returns the icons tied to the capability.
    },

    gotAccounts: function gotAccounts(inSender, inResponse) {
        //this.cmlog("2: gotAccounts");
        var accounts = inResponse.accounts, // Accounts are returned as an array
            templates = inResponse.templates, // Array of all account templates
            account;

        this.rawAccounts = {};
        var accountsLength = accounts && accounts.length;
        for (var i = 0; i < accountsLength; i++) {
            account = accounts[i];
            //this.log("Raw account:"+JSON.stringify(account));

            // Hook up raw accounts with their sync providers
            account.provider = this.getCalendarProvider(account);
            if (!account.provider) {
                //this.cmlog("2A: gotAccounts: account: "+account._id+" does not have a provider. SKIPPING.");
                continue;
            }
            account.accountName = account.loc_name;
            this.rawAccounts[account._id] = account;
            //this.cmlog("2B: gotAccounts: adding account: "+account._id);
        }
        this.gotAccountTemplates(templates);
    },

    gotAccountTemplates: function gotAccountTemplates(templateResults) {
        //this.cmlog("3: gotAccountTemplates: " + JSON.stringify(templateResults));
        this.accountTemplates = {};
        var len = templateResults.length;
        for (var i = 0; i < len; ++i) {
            DEBUG && this.log("Account template: " + JSON.stringify(templateResults[i]));
            this.accountTemplates[templateResults[i].templateId] = templateResults[i];
        }
        this.getCalendars();
    },

    getCalendars      : function getCalendars() {
        //this.cmlog ("4: getCalendars");
        this.db.getAllCalendars(this.gotCalendars, this.getCalendarsFailed, false);
    },
    gotCalendars      : function gotCalendars(response) {
        //this.cmlog("5: gotCalendars: "+JSON.stringify(response));
        var responses = response.responses;

        if (!responses || responses.length < 3 || response.returnValue === false) {
            console.error("CalendarsManager: getCalendars call failed: %j", responses);
            return;
        }

        //{"returnValue":true,"responses":[
        //	{"returnValue":true,"results":[{event},{event},{event}]}, - query for all live calendars in table
        //  {"returnValue":true,"results":[{event}]}, - query for last rev number of live calendars
        //  {"returnValue":true,"results":[{event}]}]}  - query for last rev number of deleted calendars
        var queryResult = responses[0];
        var revsetResponse1 = responses[1];
        var revsetResponse2 = responses[2];

        function getRevsetNumber(response) {
            var revsetNumber = 0;
            if (response) {
                var result = response.results;
                if (result && result.length) {
                    revsetNumber = result[0].calendarRevset;
                }
            }
            return revsetNumber;
        }

        var revsetNum1 = getRevsetNumber(revsetResponse1) || 0;
        var revsetNum2 = getRevsetNumber(revsetResponse2) || 0;
        this.lastRevSet = Math.max(revsetNum1, revsetNum2);

        var added = false;
        var calendars = queryResult && queryResult.results;
        if (calendars && calendars.length === 0) {
            var db = this.db;
            var colorList = this.colorList;
            for (var acct in this.rawAccounts) {
                if (this.rawAccounts.hasOwnProperty(acct) && this.rawAccounts[acct]) {
                    var accountInfo = this.rawAccounts[acct];
                    if (accountInfo.templateId == "com.palm.palmprofile") {
                        this.localCalendarId = accountInfo._id;
                        var palmProfileCalendar = {
                            "_kind"         : "com.palm.calendar:1",
                            "accountId"     : accountInfo._id,
                            "name"          : accountInfo.loc_name,
                            "isReadOnly"    : false,
                            "syncSource"    : "Local",
                            "excludeFromAll": false,
                            "color"         : colorList[0] //if we have no calendars, then no colors are used, and we can just grab this one.
                            //this will save injecting colors later, and one iteration through this init process.
                        };
                        //this.cmlog("5A: gotCalendars: ADDING PALM PROFILE CALENDAR");
                        console.log("CalendarsManager: Adding profile calendar");
                        db.addPalmProfileCalendar(palmProfileCalendar);
                        added = true;
                    }
                }
            }

            if (added) {
                this.watchCalendars();
                return;
            }
        }
        this.rawCalendars = calendars || [];
        this.watchCalendars();
        //this generates the calendar object-hash and the accounts array
        this.generateAccountsAndCalendarArray();
    },
    getCalendarsFailed: function getCalendarsFailed(response) {
        this.error("CalendarsManager: getCalendars call failed: ", response);
    },

    watchCalendars     : function watchCalendars() {
        //this.cmlog ("6: watchCalendars");
        this.watch = this.db.watchCalendars(this.lastRevSet, this.watchCalendarsFired, this.watchCalendarsFired);
    },
    watchCalendarsFired: function watchCalendarsFired(response) {
        //this.cmlog ("6a: watchCalendarsFired: "+JSON.stringify(response));

        if (response && response.returnValue === true && !response.fired) {
            //this.cmlog ("6b: watchCalendarsFired: success response");
            return;
        }
        if (response && response.fired) {
            //this.cmlog ("6c: watchCalendarsFired: fired response");
            //this is the case when the watch statement has fired
            //so we need to requery the calendar list as it has changed
            this.getCalendars();
            return;
        }
        console.error("CalendarsManager: watchCalendars call failed: " + JSON.stringify(response));
    },

    generateAccountsAndCalendarArray: function generateAccountsAndCalendarArray() {
        //this.cmlog("7: generateAccountsAndCalendarArray");

        var accountExists,
            cal,
            i,
            numRawCals = this.rawCalendars.length;
        this.accounts = [];
        this.calendars = {};
        var oldExcludeList = JSON.stringify(this.excludeFromAllList);
        this.excludeFromAllList = {};

        this.rawCalendars.sort(this.sortCalendarsByAccountId);

        for (i = 0; i < numRawCals; i++) {
            cal = this.rawCalendars[i];

            if (cal.excludeFromAll) {
                this.excludeFromAllList[cal._id] = true;
            }
            var rawAccount = this.rawAccounts[cal.accountId];
            if (!rawAccount) {
                continue;
            }
            var accountTemplate = rawAccount && this.accountTemplates[rawAccount.templateId];
            cal.subKind = accountTemplate && this.findAccountSubkind(accountTemplate);

            // Make sure that old Palm Profile accounts get the correct HP webOS Account name.
            (rawAccount.templateId == "com.palm.palmprofile") && (cal._kind == "com.palm.calendar:1") && ( cal.name = rawAccount.alias || rawAccount.loc_name || $L("HP webOS Account"));

            if (!cal.subKind) {
                cal.subKind = enyo.application.databaseManager.eventTable;
            }

            this.setCalendarShowName(cal, i, rawAccount);

            // Generate the calendars object-hash:
            this.calendars[cal._id] = cal;
            accountExists = false;

            // Generate the accounts array for menu:
            for (var j = 0; j < this.accounts.length; j++) {
                if (cal.accountId == this.accounts[j].accountId) {
                    //this.cmlog ("**** account found, previously added: "+ cal.accountId);
                    accountExists = true;
                    this.accounts[j].calendars.push(cal);
                    break;
                }
            }

            // First time around the account entry doesn't exist yet and needs to be created:
            if (!accountExists) {
                //this.cmlog ("*** account not found, adding for first time: "+ cal.accountId);
                this.accounts.push({
                    accountId  : cal.accountId,
                    accountName: accountTemplate && accountTemplate.loc_name,
                    calendars  : [cal],
                    provider   : accountTemplate && this.getCalendarProvider(accountTemplate)
                });
            }
        }

        //inject colors
        var calendarColorsUpdated = this.injectColors();


        //add all calendar item
        this.calendars["all"] = {
            _id       : 'all', // Do NOT Localize
            name      : $L('All calendars'),
            isReadOnly: false,
            syncSource: 'All calendars'
        };

        // Validate the default calendar preference
        enyo.application.prefsManager && enyo.application.prefsManager.validateDefaultCalPref();
        enyo.application.share({accountsAndCalendars: this.calendars}, {keep: true});	// TODO: We may want to share a *copy* of calendars.
        //this.cmlog ("7A account array: "+ JSON.stringify(this.accounts));
        //this.cmlog ("7B calendars object: "+ JSON.stringify(this.calendars));
    },

    saveCalendarOnOffState: function saveCalendarOnOffState(calStateMap) {
        var objects = [];
        var value;
        for (cal in calStateMap) {
            if (calStateMap.hasOwnProperty(cal)) {
                value = calStateMap[cal].on;
                objects.push({_id: cal, visible: value});
            }
        }
        enyo.application.databaseManager.updateCalendars(objects, this.saveCalendarOnOffStateCallback, this.saveCalendarOnOffStateCallback);
    },

    saveCalendarOnOffStateCallback: function onOffCallback(response) {
        DEBUG && this.log("==== response: " + response);
    },

    getCalendarProvider: function getCalendarProvider(template) {
        var providers = template.capabilityProviders;
        var providersLength = providers && providers.length;
        for (var i = 0; i < providersLength; i++) {
            var prov = providers[i];
            if (prov.capability === "CALENDAR" && ("_id" in prov)) {
                return prov;
            }
        }
    },

    findAccountSubkind: function findAccountSubkind(template) {
        var capabilityProviders = template.capabilityProviders;
        var len = capabilityProviders.length;
        var provider;
        var subkind;
        for (var i = 0; i < len; i++) {
            provider = capabilityProviders[i];
            if (provider.capability === "CALENDAR") {
                subkind = (provider.dbkinds && provider.dbkinds.calendarevent)
                    || (provider.db_kinds && provider.db_kinds.calendarevent)
                    || (provider.subKind && provider.subKind);
                break;
            }
        }
        return subkind;
    },

    injectColors: function injectColors() {
        // Reinit the usedCalendarColors object-hash, so the colors for any calendars that
        // have been purged, are "released"
        this.usedCalendarColors = {};

        // Iterate through the color prefs to figure out which colors have been used
        for (var calendar in this.calendars) {
            if (this.calendars.hasOwnProperty(calendar) && this.calendars[calendar]) {
                var cal = this.calendars[calendar];
                if (cal.color != "none" && cal.color !== undefined) { // Do NOT Localize
                    this.usedCalendarColors[cal.color] = true;
                }
            }
        }

        var setDefaultColors = false;
        var updatedCalendars = [];

        for (var calendar in this.calendars) {
            if (this.calendars.hasOwnProperty(calendar) && this.calendars[calendar]) {
                var cal = this.calendars[calendar];
                var color = cal.color;
                if (color === undefined) {
                    // Assign a default color here and save its pref.
                    var unusedColor = this.findUnusedColor();
                    cal.color = unusedColor;
                    cal.colorStyle = 'cal-color-' + unusedColor;
                    this.usedCalendarColors[unusedColor] = true;
                    updatedCalendars.push({"_id": cal._id, "color": unusedColor});
                    setDefaultColors = true;
                } else {
                    cal.colorStyle = 'cal-color-' + color;
                }


                if (cal.syncSource == "Local") {    // Do NOT Localize
                    this.localCalendarId = cal._id;

                    // The Local calendar is NOT allowed to be excluded from the All Calendars
                    // view, so we force it to be false
                    if (cal.excludeFromAll) {
                        cal.excludeFromAll = false;
                        updatedCalendars.push({"_id": cal._id, "excludeFromAll": cal.excludeFromAll});
                        setDefaultColors = true;
                    }
                }
            }
        }

        //If any calendar colors changed, we need to update the db.
        if (setDefaultColors) {
            this.db.updateCalendars(updatedCalendars, this.setCalendarsCallback, this.setCalendarsCallback);
        }

        return setDefaultColors;
    },

    findUnusedColor: function findUnusedColor() {
        var unusedColor = "";

        for (var list = this.colorList, i = 0, j = list.length; i < j; ++i) {
            color = list [i];
            if (!this.usedCalendarColors [color] && unusedColor == "") {
                unusedColor = color;
                break;
            }
        }

        if (unusedColor == "") {
            // If all of the colors are used, then cycle through the
            // list of colors
            unusedColor = this.colorList[this.nextColorIndex];
            this.nextColorIndex++;
            if (this.nextColorIndex >= this.colorList.length) {
                this.nextColorIndex = 0;
            }
        }

        return unusedColor;
    },

    setCalendarsCallback: function setCalendarsCallback(response) {
        //this.cmlog("********** CalendarsManager: setCalendarsCallback");
    },

    sortCalendarsByAccountId: function sortCalendarsByAccountId(calA, calB) {
        if (calA.accountId == calB.accountId) {
            return 0;
        }
        if (calA.accountId < calB.accountId) {
            return -1;
        }
        if (calA.accountId > calB.accountId) {
            return 1;
        }
    },

    setCalendarShowName: function setCalendarShowName(cal, index, rawAccount) {
        var rawCals = this.rawCalendars;
        var numCals = rawCals.length;
        var prev = rawCals[index - 1];
        var next = rawCals[index + 1];
        var accountId = cal.accountId;
        if (cal.syncSource == "Local") {
            cal.showName = cal.name;
            return;
        }

        if (prev && prev.accountId == accountId || next && next.accountId == accountId) {
            if (cal.name == rawAccount.username) {
                //This is not the only calendar on this account, and the calendar name is the same as the username. Use account alias.
                cal.showName = rawAccount.alias;
            }
            else {
                //This is not the only calendar on this account, but the calendar name is not the same as the username. Use calendar name.
                cal.showName = cal.name;
            }
        }
        else {
            //This is the only calendar on this account. Use account alias.
            cal.showName = rawAccount.alias;
        }
        if (!cal.showName) {
            cal.showName = cal.name;
        }
    },


    getCalAccount: function getCalAccount(id) {
        var accountsLength = this.accounts.length;
        for (var i = 0; i < accountsLength; i++) {
            var acct = this.accounts[i];
            if (acct.accountId == id) {
                return acct;
            }
        }
    },

    getCalAccountIcon: function getCalAccountIcon(accountId) {
        var account = this.getCalAccount(accountId);

        if (!account) {
            return undefined;
        }

        // TODO: account.provider.icon is never found so the following is never executed:
        if (account.provider && account.provider.icon && account.provider.icon.loc_32x32) {
            // this.log("Using the provider icon: " + accountTemplate.icon.loc_32x32);
            // There is an icon in this account's template just for calendars
            return account.provider.icon.loc_32x32;
        }

        // Use the account template's generic icon
        var rawAccount = this.rawAccounts[account.accountId];
        var accountTemplate = rawAccount && this.accountTemplates[rawAccount.templateId];

        if (accountTemplate && accountTemplate.icon && accountTemplate.icon.loc_32x32) {
            // this.log("Using the account template icon: " + accountTemplate.icon.loc_32x32);
            return accountTemplate.icon.loc_32x32;
        } else if (rawAccount && rawAccount.icon && rawAccount.icon.loc_32x32) { // Let's see if there is an icon attached to the rawAccount.
            // this.log("Using the raw account icon: " + rawAccount.icon.loc_32x32);
            return rawAccount.icon.loc_32x32
        }
        //If didn't find anything, pass empty string, so path parser further on will not crash
        return "";
    },

    getCalColor: function getCalColor(calId) {
        //this.cmlog('getCalColor for cal '+ calId);

        if (calId === 0) {
            //Trying to retrieve the color for the local calendar
            return this.getCal(this.localCalendarId).color;
        }

        var cal = this.getCal(calId);
        if (cal === undefined) {
            return undefined;
        }

        return cal.color;
    },

    getCalColorStyle: function getCalColorStyle(calId) {
        //this.cmlog('getCalColorStyle for cal '+ calId);

        if (calId === 0) {
            //Trying to retrieve the color for the local calendar
            return this.getCal(this.localCalendarId).colorStyle;
        }

        var cal = this.getCal(calId);
        if (cal === undefined) {
            return 'cal-color-blue';
            //return undefined;
        }

        return cal.colorStyle;
    },

    getCalName: function getCalName(calId) {
        var cal = this.getCal(calId);


        if (cal === undefined) {
            return undefined;
        }

        return cal.showName;
    },

    getCalSyncSource: function getCalSyncSource(calId) {
        var cal = this.getCal(calId);


        if (cal === undefined) {
            return undefined;
        }

        return cal.syncSource;
    },

    getCalIcon: function getCalIcon(calId) {
        var cal = this.getCal(calId);
        return cal && this.getCalAccountIcon(cal.accountId);
    },

    isCalendarReadOnly: function isCalendarReadOnly(calId) {
        if (this.calendars) {
            var cal = this.getCal(calId);

            if (cal === undefined) {
                return undefined;
            }

            return cal.isReadOnly;
        }
        return undefined;
    },

    isInvitationEnabledCalendar: function isInvitationEnabledCalendar(calendarId) {
        var kind = this.getCalAccountKind(calendarId);
        return (kind == "com.palm.calendarevent.eas:1");
    },

    getCal: function getCal(calId) {
        if (calId == "MOCKDATA") { //for tester page
            return;
        }

        var cal = this.calendars && this.calendars[calId];

        return cal;
    },

    getCalAccountName: function getCalAccountName(calId) {
        var cal = this.getCal(calId);


        if (cal === undefined) {
            return undefined;
        }

        var rawAccount = this.rawAccounts[cal.accountId];
        var name = (rawAccount && rawAccount.alias) || cal.showName || cal.name || cal.accountId;
        return name;
    },

    getCalAccountKind: function getCalAccountKind(calId) {
        if (calId == "MOCKDATA") { //for tester page
            return;
        }
        var cal = this.getCal(calId);
        if (cal && cal.subKind) {
            return cal.subKind;
        }
        else {
            return enyo.application.databaseManager.eventTable;
        }
    },

    getCalAccountUser: function getCalAccountUser(calId) {
        var cal = this.getCal(calId);

        if (cal === undefined) {
            return undefined;
        }

        var rawAccount = this.rawAccounts[cal.accountId];
        return rawAccount && rawAccount.username;
    },

    getLocalCalendar: function getLocalCalendar() {
        return this.getCal(this.localCalendarId);
    },

    getLocalCalendarId: function getLocalCalendarId() {
        return this.localCalendarId;
    },

    getExcludeFromAllList: function getExcludeFromAllList() {
        return this.excludeFromAllList;
    },

    // Returns the id of the "first" non-local calendar.  NOTE: Ordering
    // of the calendars seem to be arbitrary, so essentially this function
    // just retrieves A non-local calendar id.
    getNonLocalCalendarId: function getNonLocalCalendarId(excludeReadOnly) {
        //this.cmlog("getNonLocalCalendarId: this.calendars: " + JSON.stringify(this.calendars));
        // By default the list of calendars include All and Local

        var firstCal = undefined;
        for (var calendar in this.calendars) {
            if (this.calendars.hasOwnProperty(calendar) && this.calendars[calendar]) {
                var cal = this.calendars[calendar];
                if (excludeReadOnly && cal.isReadOnly) {
                    continue;
                }
                else if (cal._id !== 0 && cal._id != 'all' && cal.syncSource != "Local") {
                    firstCal = cal;
                    break;
                }
            }
        }
        if (firstCal) {
            //this.cmlog("getNonLocalCalendarId: "+ firstCal._id);
            return firstCal._id;
        } else {
            return 0;
        }
    },

    getCalendarsList: function getCalendarsList(options) {
        var list = [];
        for (var calendar in this.calendars) {
            if (this.calendars.hasOwnProperty(calendar) && this.calendars[calendar]) {
                var cal = this.calendars[calendar];
                if (cal._id != 'all' && !(options && options.excludeReadOnly && cal.isReadOnly)) {
                    list.push(cal);
                }
            }
        }
        if (options && options.sorted) {
            function calsort(a, b) {
                //sort by account id, then by calendar name
                if (a.accountId < b.accountId) {
                    return -1;
                }
                if (a.accountId > b.accountId) {
                    return 1;
                }
                if (a.accountId == b.accountId) {
                    return a.showName.localeCompare(b.showName);
                }
            }

            list.sort(calsort);
        }
        //this.cmlog("getCalendarList: "+JSON.stringify(list));
        return list;
    },

    setCalendarColor: function setCalendarColor(calendarId, colorName) {
        var calendar = this.calendars[calendarId];
        if (calendar) {
            calendar.color = colorName;
            var calendarSlice = [
                {_id: calendar._id, color: calendar.color}
            ];
            this.updateCalendarsRequest = this.db.updateCalendars(calendarSlice, this.setCalendarColorCallback, this.setCalendarColorCallback);
        }
    },

    setCalendarColorCallback: function setCalendarColorCallback(response) {
        //console.log("==== Calendar color changed.");
    },

    syncAllCalendars: function syncAllCalendars() {

        var account
            , accounts = this.rawAccounts
            ;

        enyo.windows.addBannerMessage($L("Syncing accounts"), "{}");

        for (var id in accounts) {
            if (accounts.hasOwnProperty(id)) {
                account = accounts [id];
                account && account.provider && account.provider.sync && this.syncAccount(account);
            }
        }
    },

    syncAccount: function syncAccount(account) {
        this.log("---:---: Attempting to sync account: " + account.accountName);//JSON.stringify(account));

        var activityArgs = {
            start   : true,
            replace : true,
            activity: {
                name       : "sync " + account._id,
                description: "Background sync activity for account " + account._id,
                type       : {
                    userInitiated: true,
                    foreground   : true
                },
                callback   : {
                    method: account.provider.sync,
                    params: {accountId: account._id}
                }
            }
        };
        this.$.syncAccount.call(activityArgs);
    },

    syncAccountResponse: function syncAccountResponse(request, response) {
        this.log("---:---: Sync response: " + JSON.stringify(response));
    }

//	buildCalendarsMenu: function buildCalendarsList(includeAll, includeReadOnly, includeExcludedFromAll) {
//		//this.cmlog('buildCalendarsMenu ');
//		var listItems = [];
//
//		// All Calendars
//		if (includeAll) {
//			var name = 'Show All'; // Do NOT Localize
//			// Add the All Calendars item
//			listItems.push({
//				label: $L("All calendars"),
//				//command: name,
//				secondaryIcon: this.calendarMenuIcons["all"]
//			});
//		}
//
//		// Other calendars
//		this.accounts && this.accounts.forEach(function(account){
//			var addThisAccount = true;
//
//			if (includeReadOnly === false) {
//			// Do not add an account to the menu if all of its menus are readonly
//				var allCalsAreReadOnly = true;
//				account.calendars && account.calendars.forEach(function(calendar){
//
//					if (!calendar.isReadOnly) {
//						allCalsAreReadOnly = false;
//					}
//				});
//
//				if (allCalsAreReadOnly) {
//					addThisAccount = false;
//				}
//			}
//
//			if (addThisAccount && includeExcludedFromAll === false) {
//				// Do not add an account to the menu if all of its calendars are
//				// excluded from the "All Calendars" view
//				var allCalsAreExcluded = true;
//				account.calendars && account.calendars.forEach(function(calendar){
//					if (!calendar.excludeFromAll) {
//						allCalsAreExcluded = false;
//					}
//				});
//
//				if (allCalsAreExcluded) {
//					addThisAccount = false;
//				}
//			}
//
//			if (addThisAccount) {
//				listItems.push({label: account.accountName /*+ ' - ' + account.userName*/}); //removed username for sake of demo bug #NOV-37729
//				//this.cmlog("buildCalendarsMenu account: "+JSON.stringify(account));
//				account.calendars && account.calendars.forEach(function(cal){
//					if (cal.syncSource == "Local") {
//						cal.name =$L("Palm Profile");
//					}
//					if (includeReadOnly === false && cal.isReadOnly) {
//						// Do NOT include this read only calendar
//					} else if (includeExcludedFromAll === false && cal.excludeFromAll) {
//						// Do NOT include this calendar that is excluded from the "All Calendars" view
//					} else {
//						listItems.push({
//							label: cal.name,
//							command: cal._id,
//							secondaryIcon: "calendar-color color-chip " + "cal-color-" + cal.color
//						});
//					}
//				});
//			}
//		});
//		//finally push the view options item
//		if (includeAll) {
//			listItems.push({
//				label: $L("Calendar View Options..."),
//				command: "viewOptions"
//			});
//		}
//		return listItems;
//	},

//	updateCalendarMenuItems: function updateCalendarMenuItems() {
//		//this.cmlog('updateCalendarMenuItems ');
//		this.calendarIcons = {};
//		this.calendarMenuIcons = {};
//
//		for (var calendar in this.calendars) {
//			if (this.calendars.hasOwnProperty(calendar) && this.calendars[calendar]) {
//				var cal = this.calendars[calendar];
//				if (cal._id == "all") {
//					this.calendarMenuIcons[cal._id] = 'menu_all';
//				} else if (cal.icon) {
//					this.calendarIcons[cal._id] = cal.icon;
//				}
//			}
//		}
//
//		this.notifyObservers();
//	},

//	getCalendarsModel: function getCalendarsModel(){
//		var item;
//		var model = [];
//		var rawAccts = this.rawAccounts;
//		var templates = this.accountTemplates;
//
//		this.accounts.forEach(function(account){
//
//			var calendars = [];
//			account.calendars.forEach(function(cal){
//
//				var rawAccount = rawAccts[cal.accountId];
//				var template = templates[rawAccount.templateId];
//
//				item =
//				{	id: cal._id
//				,	color: cal.color
//				,	colorStyle: 'cal-color-' + cal.color	// Do NOT Localize
//				,	name: cal.name
//				,	displayInAll: !cal.excludeFromAll
//				,	username: rawAccount.username
//				,	source: template.loc_name
//				,	syncSource: cal.syncSource
//				};
//
//				calendars.push(item);
//			});
//			model.push(calendars);
//		});
//		return model;
//	}
});
