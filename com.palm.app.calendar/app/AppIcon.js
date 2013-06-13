// @@@LICENSE
//
//      Copyright (c) 2010-2013 LG Electronics, Inc.
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
 NOTE: calendar.AppIcon handles the app's icon changing responsibilities.

 **/
enyo.kind({
    name      : "calendar.AppIcon",
    kind      : enyo.Component,
    published : {
        clock: null                // Date		: For watching clock changes.
    },
    components: [
        {kind: enyo.PalmService, service: enyo.palmServices.application, components: [
            {name: "updateIcon", method: "updateLaunchPointIcon", onSuccess: "updatedIcon", onFailure: "updateIconFailed"}
        ]},
        {name: "setupMidnightIconUpdate", kind: enyo.PalmService, service: "palm://com.palm.activitymanager/", method: "create", onResponse: "setupMidnightIconUpdateResponse"},
        {name: "activityComplete", kind: enyo.PalmService, service: "palm://com.palm.activitymanager/", method: "complete", onResponse: "activityCompleteResponse"}
    ],

    constructor: function constructor() {
        this.inherited(arguments);
        this.timeMachine = new Date();	// For calculating date/times without creating new Date instances.
        this.updatedIcon = enyo.bind(this, this.updatedIcon);
        this.updateIconFailed = enyo.bind(this, this.updateIconFailed);
    },

    create: function create() {
        this.inherited(arguments);
        enyo.application.watch({clock: this});
    },

    destroy: function destroy() {
        enyo.application.ignore({clock: this});
        this.$.updateIcon && this.$.updateIcon.cancel();
        this.inherited(arguments);
    },

// BEGIN :-------: Published Property Handlers :--------------------------------------------------------------------------------------------------------------//

    clockChanged: function clockChanged(oldClock) {
        var clock = this.clock instanceof Date && this.clock || new Date();
        this.updateIcon(clock.getDate());
    },

// BEGIN :-------: Custom Methods :---------------------------------------------------------------------------------------------------------------------------//

    activityCompleteResponse: function activityCompleteResponse(inSender, response) {
        DEBUG && this.log("================== activity completed response received: ", response);
    },

    createRecurringIconUpdateActivity: function createRecurringIconUpdateActivity(params) {
        var timeMachine = this.timeMachine;
        timeMachine.setTime(Date.now());
        timeMachine.setDate(timeMachine.getDate() + 1);
        timeMachine.clearTime();

        var dateString = Utilities.getUTCFormatDateString(timeMachine, {format: "activity"}); //YYYY-MM-DD HH:MM:SSZ

        var activityArgs = {
            "start"   : true,
            "replace" : true,
            "activity": {
                "name"       : "calendar.updateIcon",
                "description": "Update icon date at midnight",
                "type"       : {
                    "persist"   : false,
                    "foreground": true
                },
                "schedule"   : {"start": dateString},
                "callback"   : {
                    "method": "palm://com.palm.applicationManager/launch",
                    "params": {
                        "id"    : "com.palm.app.calendar",
                        "params": {"dayChange": true}
                    }
                }
            }
        }
        this.$.setupMidnightIconUpdate.call(activityArgs);
        this.$.activityComplete.call({activityId: params.$activity.activityId});
    },

    handleLaunchParams: function handleLaunchParams(params) {
        if ("dayChange" in params) {
            this.updateIcon();
            this.createRecurringIconUpdateActivity(params);
        }
    },

    setupMidnightIconUpdateResponse: function setupMidnightIconUpdateResponse(inSender, response) {
        DEBUG && this.log("---:---: activity to update icon at midnight response received");
    },

    updatedIcon: function updatedIcon(inSender, response) {
        DEBUG && this.log("---:---: app icon update worked");
    },

    updateIcon: function updateIcon(monthDay) {
        isNaN(monthDay) && (monthDay = new Date().getDate());

        if (monthDay < 10) {
            var formatter = new enyo.g11n.DateFmt({date: "short"}),
                zeroPadded = (formatter.dateTimeFormatHash.shortDate.search(/dd/i) !== -1);
            zeroPadded && (monthDay = "0" + monthDay);
        }

        if (this.currentIcon && this.currentIcon === monthDay) {    // Return if we don't need to change anything.
            return;
        }
        this.currentIcon = monthDay;

        var iconUrl = "images/launcher/icon-" + monthDay + ".png";
        DEBUG && this.log("\tUpdating icon to ", iconUrl, "\t");

        this.$.updateIcon.call({
            icon         : iconUrl,
            launchPointId: "com.palm.app.calendar_default"
        });
    },

    updateIconFailed: function updateIconFailed(inSender, response) {
        this.error("---:---: app icon update failed");
        this.currentIcon = undefined;								// Reset currentIcon to undefined if the update failed.
    }
});
