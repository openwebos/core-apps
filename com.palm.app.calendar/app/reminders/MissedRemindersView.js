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


enyo.kind({
    name      : "calendar.reminders.MissedRemindersView",
    kind      : enyo.VFlexBox,
    //className	: "enyo-bg",
    events    : {
        onExit            : "",
        onShowEventDetails: ""
    },
    components: [
        {kind: enyo.PageHeader, components: [
            {kind: enyo.Image, src: "./images/notification-large-calendar.png"},
            {content: $L("Missed Reminders")}
        ]},
        {flex: 1, name: "list", kind: enyo.VirtualList, className: "list", lookAhead: 0, pageSize: 1, onSetupRow: "listSetupRow", components: [
            {kind: enyo.SwipeableItem, className: "item", confirmRequired: false, onConfirm: "itemSwipe", onclick: "itemClick", components: [
                {kind: enyo.HFlexBox, components: [
                    {kind: enyo.Image, src: "./images/notification-large-calendar.png"},
                    {kind: enyo.VFlexBox, components: [
                        {name: "subject", className: "reminder-text reminder-event-subject"},
                        {name: "subtitle", className: "reminder-text reminder-event-location"} //"Today 5:30pm at Location"
                    ]}
                ]}
            ]}
        ]},
        {kind: enyo.HFlexBox, components: [
            {kind: enyo.Button, name: "btnDismissAll", caption: $L("Dismiss All"), onclick: "dismissAll" },
            {kind: enyo.Button, name: "btnDone", caption: $L("Done"), onclick: "exit" }
        ]}
    ],

    create: function create() {
        console.info("======= MRL: create");
        this.inherited(arguments);
        this.reminderManager = new ReminderManager();
        enyo.application.watch({reminderState: this});
        this.reminders = this.reminderManager.getAllReminders();
        this.showCount = 0;
    },

    showingChanged: function showingChanged() {
        this.inherited(arguments);
        if (this.getShowing()) {
            console.info("======= MRL: show");
            this.showCount++;
            if (this.showCount > 0) {
                this.$.list.refresh();
            }
        }
        else {
            //do nothing?
        }
    },

    exit: function exit() {
        console.info("======= MRL: exit");
        enyo.application.ignore({reminderState: this});
        this.doExit();
    },

    listSetupRow: function listSetupRow(inSender, inIndex) {
        console.info("======= MRL: listSetupRow");
        if (!this.reminders) {
            this.reminders = this.reminderManager.getAllReminders();
        }
        var remindersLength = this.reminders.length;

        if (inIndex < remindersLength) {
            var reminder = this.reminders[inIndex];
            this.$.subject.setContent(reminder.subject);
            this.$.subtitle.setContent(this.reminderManager.getReminderSubtitle(reminder));
            return true;
        }

    },

    itemClick: function itemClick(item, arg2, itemIndex) {
        console.info("======= MRL: itemClick");
        var reminder = this.reminders[itemIndex];
        //TODO: Launch edit view
        this.reminderManager.showEventDetails(reminder);
        this.reminderManager.dismissReminder(reminder);
        this.exit();
    },

    itemSwipe: function itemSwipe(item, itemIndex) {
        console.info("======= MRL: itemSwipe");
        var reminder = this.reminders[itemIndex];
        this.reminderManager.dismissReminder(reminder);
    },

    dismissAll: function dismissAll() {
        console.info("======= MRL: dismissAll");
        this.reminderManager.dismissAllReminders();
        this.exit();
    },

    remindersUpdated: function remindersDisplayUpdated(reminder) {
        console.info("======= MRL: remindersDisplayUpdated");
        this.reminders = this.reminderManager.getAllReminders();
        if (this.showCount > 0) {
            this.$.list.refresh();
        }
    }
});