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


/*globals enyo */

/*	TODO: What does x-palm-popup-content actually do?
 */

enyo.kind({
    name      : "calendar.reminders.ReminderDialog",
    kind      : enyo.Control,
    className : "reminder",
    showing   : true,
    published : {
        reminderState: null
    },
    G11N      : {
        dateFormatter  : new enyo.g11n.DateFmt({
            date          : "medium",
            weekday       : "medium",
            time          : "short",
            dateComponents: "md"
        }),
        runningLate    : $L("Running late. On my way..."),
        snoozedTemplate: new enyo.g11n.Template($L("1#Snoozed for 1 minute|#Snoozed for #{num} minutes"))
    },
    components: [
        {kind: "ApplicationEvents", onUnload: "unloadHandler"},
        {kind: enyo.HFlexBox, domAttributes: {"x-palm-popup-content": " "}, components: [
            {kind: enyo.Image, src: "../../images/notification-large-calendar.png", className: "notification-icon"},
            {onclick: "detailClicked", className: "notification-text-box", components: [
                {name: "subject", className: "notification-subject"},
                {name: "location", className: "notification-body"},
                {name: "datetime", className: "notification-body"}
            ]}
        ]},
        {components: [
            {kind: "NotificationButton", name: "btnEmail", content: $L("Contact Meeting Attendees"), onclick: "emailClicked", showing: false, className: "enyo-notification-button button-top" },
            {kind: enyo.HFlexBox, components: [
                {
                    kind: "NotificationButton", name: "btnSnooze", content: $L("Snooze"), className: "enyo-notification-button-alternate button-right", flex: 1, onclick: "snoozeClicked"
                },
                {
                    kind: "NotificationButton", name: "btnDismiss", content: $L("Dismiss"), className: "enyo-notification-button-affirmative button-left", flex: 1, onclick: "dismissClicked"
                }
            ]}
        ]}
    ],

    create: function create() {
        //this.rdlog("create");
        this.inherited(arguments);
        this.DEFAULT_SNOOZE = 5;
        this.reminderManager = enyo.application.reminderManager;
        enyo.application.watch({reminderState: this});
    },

    destroy: function destroy() {
        this.inherited(arguments);
    },

    unloadHandler: function unloadHandler() {
        this.destroy();
    },

    rdlog: function rmlog(str) {
        //console.info("========= RDLG: "+str);
    },

    reminderStateChanged: function reminderStateChanged(oldReminderState) {
        //this.rdlog("remindersUpdated: updating display");
        this.reminder = this.reminderState.current;
        //this.rdlog("remindersUpdated: current reminder: "+JSON.stringify(this.reminder));
        this.updateDialog();
    },

    updateDialog: function updateDialog() {
        //this.rdlog("updateDialog");

        if (!this.reminder) {
            this.exit();
            return;
        }

        //this.rdlog("updateDialog: setting content");
        var ui = this.$;
        ui.subject.setContent(this.reminder.subject || $L("No Subject"));
        ui.location.setContent(this.reminder.location || $L("No Location"));
        ui.datetime.setContent(this.G11N.dateFormatter.format(new Date(this.reminder.startTime)));

        var attendees = this.reminder.attendees
            , num = attendees && attendees.length
            ;
        ui.btnEmail.setShowing(!(num === 1 && attendees[0].organizer || !num));
    },

    detailClicked: function detailClicked() {
        //this.rdlog("detailClicked: "+this.reminder._id);
        this.reminderManager.showEventDetails(this.reminder);
        this.reminderManager.dismissReminder(this.reminder);
        //this.rdlog("detailClicked 3");
    },

    dismissClicked: function dismissClicked() {
        //this.rdlog("dismissClicked: "+this.reminder._id);
        this.reminderManager.dismissReminder(this.reminder);
    },

    emailClicked: function emailClicked(event) {
        //this.rdlog ("emailClicked: "+ this.reminder._id);
        if (this.reminder.attendees && this.reminder.attendees.length > 0) {
            this.reminderManager.sendEmail(
                this.reminder.subject,
                this.reminder.attendees,
                this.G11N.runningLate,
                this.reminder.emailAccountId
            );
            this.reminderManager.dismissReminder(this.reminder);
        }
    },

    snoozeClicked: function snoozeClicked(event) {
        //this.rdlog ("snoozeClicked: "+ this.reminder._id);
        this.showSnoozedBanner(this.DEFAULT_SNOOZE, this.reminder);
        this.reminderManager.snoozeReminder(this.reminder);
    },

    showSnoozedBanner: function showSnoozedBanner(minutes, reminder) {
        var message = this.G11N.snoozedTemplate.formatChoice(minutes, {num: minutes});
        var details = {};
        details.eventId = reminder.eventId;
        details.startTime = "" + reminder.startTime;	//Needs to be a string to get across the bus intact
        details.endTime = "" + reminder.endTime;
        var paramString = JSON.stringify({showDetailFromReminder: details});
        enyo.windows.addBannerMessage(message, paramString);
    },

    exit: function exit() {
        //this.rdlog("exit");
        enyo.application.ignore({reminderState: this});
        this.reminderManager.closeDialog();
    }
});
