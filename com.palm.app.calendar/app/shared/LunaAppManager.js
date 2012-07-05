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
/*global enyo */

enyo.kind({
    name      : "LunaAppManager",
    kind      : enyo.Component,
    published : {
        app   : null,
        launch: null    // For watching launch requests.
    },
    components: [
        {kind: enyo.PalmService, service: enyo.palmServices.application, components: [
            {name: "getOpenApps", method: "running", onSuccess: "gotOpenApps", onFailure: "getOpenAppsFailed"        },
            {name: "startApp", method: "open", onSuccess: "startedApp", onFailure: "startAppFailed"            },
            {name: "stopApp", method: "close", onSuccess: "stoppedApp", onFailure: "stopAppFailed"            },
            {name: "getOpeners", method: "listAllHandlersForUrl", onSuccess: "gotOpeners", onFailure: "getOpenersFailed"}
        ]}
    ],

    create: function create() {
        var enyoApp = enyo.application;
        this.inherited(arguments);
        enyoApp.lunaAppManager = this;
        enyo.application.watch({ launch: this }, {name: "LunaAppManager"});
    },

    destroy: function destroy() {
        var enyoApp = enyo.application;
        enyoApp.ignore({ launch: this });
        delete enyoApp.lunaAppManager;
        this.inherited(arguments);
    },

    gotOpenApps      : function gotOpenApps(from, response) {
        DEBUG && this.log("===:===: Found these running apps: " + JSON.stringify(response));
    },
    getOpenAppsFailed: function getOpenAppsFailed(from, response) {
        this.error("===:===: Failed to get list of running apps: " + JSON.stringify(response));
    },

    gotOpeners      : function gotOpeners(from, response) {
        DEBUG && this.log("===:===: Found these app handlers: " + JSON.stringify(response));
    },
    getOpenersFailed: function getOpenersFailed(from, response) {
        this.error("===:===: Failed to get app handlers: " + JSON.stringify(response));
    },

    startedApp    : function startedApp(from, response) {
        DEBUG && this.log("===:===: Started app: ");
    },
    startAppFailed: function startAppFailed(from, response) {
        this.error("===:===: Failed to start app: " + JSON.stringify(response));
    },

    stoppedApp   : function stoppedApp(from, response) {
        DEBUG && this.log("===:===: Stopped app: ");
    },
    stopAppFailed: function stopAppFailed(from, response) {
        this.error("===:===: Failed to stop app: " + JSON.stringify(response));
    },

    launchChanged: function launchChanged() {
        var info = this.launch,
            appId = info && info.appId;
        switch (appId) {
        case "restart":
            this.restartApp(info);
            break;

        case "com.palm.app.contacts":
            this.addContact(info);
            break;

        case "com.palm.app.email":
            this.composeEmail(info);
            break;

        case "com.palm.app.help":
            this.launchHelp(info);
            break;

        case "com.palm.app.maps":
            this.launchMaps(info);
            break;

        default:
            this.error("===:===: Unable to launch specified application: " + JSON.stringify(info));
            return;
        }
        DEBUG && this.log("===:===: Launching: " + JSON.stringify(info));
    },

    addContact: function addContact(launchInfo) {
        if (!(launchInfo && launchInfo.name && launchInfo.email)) {
            this.error("===:===: Unable to add contact using invalid name and/or email address: " + JSON.stringify(launchInfo));
            return;
        }
        var params = {
            launchType: "addToContacts",
            name      : launchInfo.name,
            points    : [
                { type: "email", value: launchInfo.email }
            ]
        };
        this.$.startApp.call({ target: "opencontact://" + JSON.stringify(params) });
    },

    composeEmail         : function (launchInfo) {
        if (!(launchInfo && launchInfo.accountId)) {
            this.error("===:===: Unable to compose an email using the invalid accountId supplied: " + JSON.stringify(launchInfo));
            return;
        }
        var params = {
            account   : String(launchInfo.accountId),
            recipients: this.createRecipientsArray(launchInfo.to),
            summary   : launchInfo.subject || "",
            text      : launchInfo.body || ""
        };
        this.$.startApp.call({ id: "com.palm.app.email", params: params });
    },
    createRecipientsArray: function createRecipientsArray(people) {
        var recipients = []
            ;
        for (var name, person, i = 0, j = people.length; i < j; ++i) {
            person = people [i];
            name = person.name || person.email;		// Set recipient's display name to name or email address.
            if (!name) {
                continue;
            }					// If neither's available, skip this recipient.

            recipients.push({
                type          : "email",        // Do NOT Localize
                role          : 1,              // TO: field
                value         : person.email,
                contactDisplay: name,
                contactId     : person.contactId// For reverse lookup
            });
        }
        return recipients;
    },

    launchHelp: function launchHelp() {
        this.$.startApp.call({
            id    : "com.palm.app.help",
            params: { target: "http://help.palm.com/calendar/index.html" }
        });
        // Try this if the help app doesn't work:
        // this.$.startApp.call (
        // {	id		: "com.palm.app.browser"
        // ,	params	: { scene: "page", url: "http://help.palm.com/calendar/index.html" }
        // });
    },

    launchMaps      : function launchMaps(launchInfo) {
        /*	Launch Maps using the Mapping application specified in the Launcher's
         Default Applications list.
         */
        if (!(launchInfo && launchInfo.address)) {
            this.error("===:===: Unable to launch maps using the invalid address: " + JSON.stringify(launchInfo));
            return;
        }

        // Perform some address cleanup
        var address = launchInfo.address.replace(/\n/g, " ").replace(/\r/g, " "),
            params;

        // Start maps with the right parameter parameter
        params = launchInfo.getDirections ? {route: {endAddress: address}} : {address: address};

        this.$.startApp.call({ id: "com.palm.app.maps", params: params});
        return;  // TODO: !IMPORTANT When the mapto:// and maploc:// parameters can be handled, this will have to be revisited to enable them!

        /*var target	=	launchInfo.getDirections ? "mapto://" : "maploc://";// "mapto:" : "maploc:";
         target		+=	launchInfo.address.replace (/\n/g, " ").replace (/\r/g, " ");

         this.findMapApp ({ target: target });*/
    },
    findMapApp      : function (params) {
        /*	Find and launch the user's preferred mapping application.
         */
        this.mappingParams = params;
        this.$.getOpeners.call({    // Find
            url: "mapto:"               // all mapping applications
        }, {
            onSuccess: this.foundMapApp,        // then launch the preferred one
            onFailure: this.findMapAppFailed    // or launch the default Maps app.
        });
    },
    findMapAppFailed: function findMapAppFailed(from, response) {
        /*	Launch the default Maps app since no others were found.
         */
        this.warn("===:===: Failed to find other mapping applications: " + JSON.stringify(response));
        this.$.startApp({ id: "com.palm.app.maps", params: this.mappingParams });
    },
    foundMapApp     : function foundMapApp(from, response) {
        /*	Launch the user's preferred Mapping application.
         */
        var source = response.redirectHandlers ? "redirectHandlers" : "resourceHandlers",
            appId = response [source].activeHandler.appId;
        this.info("===:===: Found mapping application: " + JSON.stringify(response));
        this.$.startApp({ id: appId, params: this.mappingParams });
    },

    restartApp: function restartApp(launchInfo) {
        /*	Launch Maps using the Mapping application specified in the Launcher's
         Default Applications list.
         */
        if (!(launchInfo && ("appId" in launchInfo))) {
            this.error("===:===: Unable to restart app using the invalid appId: " + JSON.stringify(launchInfo));
            return;
        }
        this.$.getOpenApps.call(null, {
            onResponse: function stopApp(from, response) {
                var running = response.running;
                DEBUG && this.log("===:===: Found these apps: " + JSON.stringify(running));
                if (running) {
                    for (var app, i = running.length; i--;) {
                        app = running[i];
                        if (app && (app.id == launchInfo.appId)) {
                            DEBUG && this.log("===:===: Found matching processId: " + JSON.stringify(app));
                            this.$.stopApp.call({    processId: app.processid }, {    onResponse: function startApp(from, response) {
                                DEBUG && this.log("===:===: Restarting: " + launchInfo.appId);
                                this.$.startApp.call({    id: launchInfo.appId, params: launchInfo.params });
                            }
                            });//break; // TODO: Is it possible to have more than one instance of an app running simultaneously?...
                        }
                    }
                }
            }
        });
    },

    launchCalendarDetails: function launchCalendarDetails(eventDetails) {

        // TODO: Implement this to relaunch the app into detail view.
        // Don't currently know what the params to detail view or edit view will be... Probably something like this...
        // minimum: event Id; better: eventId, currentLocalStart, currentLocalEnd; best: full event

        var details = {};
        if (eventDetails) {
            details.eventId = eventDetails.eventId;
            details.startTime = "" + eventDetails.startTime;	// Needs to be a string to get across the bus intact
            details.endTime = "" + eventDetails.endTime;
        }

        this.$.startApp.call({
            id    : "com.palm.app.calendar",
            params: { showDetailFromReminder: details}
        });
    },

    launchCalendarMissedReminders: function launchCalendarMissedReminders() {

        //TODO: Implement this to relaunch the app into missed reminders view.
        this.$.startApp.call({
            id    : "com.palm.app.calendar",
            params: { reminders: true}
        });
    }

});
