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


/*global Contacts, ContactsUI, enyo */

/**
 NOTE: calendar.AttendeesView is the Calendar app's Meeting attendee list view.

 **/
enyo.kind({
    name      : "calendar.edit.AttendeesView",
    kind      : enyo.VFlexBox,
    className : "calendar-detail-view",
    showing   : false,
    events    : {
        onCloseClicked      : "",
        onExit              : "",
        onShowContactDetails: ""
    },
    published : {
        accountId     : null,
        attendees     : [],
        organizerIndex: null, // Made a published property in case we need to do more processing
        subject       : ""
    },
    G11N      : {
        attendeeCount: new enyo.g11n.Template($L("0#No participants|1#1 meeting participant|##{n} meeting participants")),
        runningLate  : $L("Running late. On my way...")
    },
    components: [
        {name: "count", showing: true, className: "attendees-view-count"},
        //enyo-item enyo-first
        {name: "btnContact", kind: enyo.Button, caption: $L("Contact Attendees"), i_con: "edit/images/menu-icon-compose.png", onclick: "contactAttendees", className: "enyo-button-light"},
        {kind: enyo.VFlexBox, className: "group detail-view-group", flex: 1, components: [
            {name: "attendeeScroller", autoHorizontal: false, horizontal: false, kind: enyo.Scroller, flex: 1, components: [
                {name: "list", kind: enyo.VirtualRepeater, onSetupRow: "getAttendee", components: [
                    {kind: enyo.RowItem, className: "contact-row", onclick: "attendeeClicked", components: [
                        {name: "contactImage", kind: enyo.Image, className: "contact-image"},
                        {className: "contact-image-border"},
                        {kind: enyo.Control, className: "contact-info", components: [
                            {name: "attendeeName", className: "enyo-text-ellipsis attendee-name"},
                            {name: "organizer", content: $L("Organizer"), className: "attendees-view-subject enyo-text-ellipsis"}
                        ]}
                    ]}
                ]}
            ]}
        ]},
        {kind: enyo.HFlexBox, components: [
            {kind: enyo.Button, caption: $L("Back"), onclick: "closeView", flex: 1, className: "enyo-button-light"},
            {name: "btnCancel", kind: enyo.Button, caption: $L("Close"), onclick: "closeClicked", flex: 1, className: "spaceButton enyo-button-dark"}
        ]},
        {kind: "ApplicationEvents", onWindowHidden: "closeView"
        }
    ],

    create: function create() {
        this.inherited(arguments);
        this.lookupAttendees = enyo.bind(this, this.lookupAttendees);
    },

    closeView: function closeView() {
        this.doExit();
        this.reset();
    },

    reset: function reset() {
        this.$.attendeeScroller.setScrollTop(0);	// Reset the scroll position.
    },

    contactAttendees: function contactAttendees(inSender) {
        enyo.application.share({
            launch: {
                appId    : "com.palm.app.email",
                accountId: this.accountId,
                body     : this.G11N.runningLate,
                subject  : this.subject,
                to       : this.attendees
            }
        });
    },

    attendeeClicked: function attendeeClicked(source, domEvent, rowIndex) {
        var attendee = this.attendees [rowIndex];
        this.doShowContactDetails(("personId" in attendee) ? {personId: attendee.personId} : attendee);
    },

    closeClicked: function closeClicked() {
        this.reset();
        this.doCloseClicked();
    },

    getAttendee: function getAttendee(inSender, inIndex) {
        var peeps = this.attendees,
            person = peeps && (inIndex < peeps.length) && peeps [inIndex],
            ui = this.$;
        if (!person) {
            return;
        }

        !person.name && (person.name = person.commonName || person.email || $L("Attendee"));
        !person.listPhotoPath && (person.listPhotoPath = "edit/images/list-avatar-default.jpg");
        ui.attendeeName.setContent(person.name);
        ui.contactImage.setAttribute("src", person.listPhotoPath);
        ui.organizer.setShowing(inIndex === this.organizerIndex);
        return true;
    },

    attendeesChanged: function attendeesChanged() {
        var count = this.attendees && this.attendees.length,
            ui = this.$;

        ui.count.setContent(this.G11N.attendeeCount.formatChoice(count, {n: count}));
        //ui.btnContact.setShowing (count);	// For 1 or more attendees show "Contact attendees" button.
        ui.list.render();
        setTimeout(this.lookupAttendees, 100);
    },

    lookupAttendees: function lookupAttendees() {
        // TODO: Since the contacts person APIs are asynchronous, we probably need to change how this works.
        // 1. We should render first with getListPhotoPath (synchronous, but possibly not up to date), then do the
        // asynchronous getPhotoPath call.  When the async call comes back, if the result is different, then we should re-render.
        // 2. If you are in the attendees list, and you tap an attendee and add a contact with a new photo,
        // we don't update our view, and we maybe should.  I don't know if there's something we can listen for to detect that though.
        var attendee,
            attendees = this.attendees;
        this.lookupCount = 0;					// Track number of lookups so we can update the list at reasonable times.
        try {
            for (var i = 0, j = attendees.length; i < j; ++i) {
                attendee = attendees [i];
                if (attendee.email) {
                    enyo.application.contactsManager.findByEmail(attendee.email, enyo.bind(this, this.lookupAttendeeReady, i));
                } else {
                    this.lookupAttendeeReady(i);
                }
            }
        } catch (e) {
            this.error("===:===: Contacts lookup failed: ", e);
        }
    },

    lookupAttendeeReady: function lookupAttendeeReady(index, person) {
        var attendee = this.attendees [index],
            list = this.$.list,
            total = this.attendees.length;
        this.lookupCount++;
        if (person) {
            person.displayName
                ? (attendee.name = person.displayName) :

                // Use the commonName, name, or email from the attendee as worst case
                attendee.commonName
                    ? (attendee.name = attendee.commonName) : (!attendee.name) && (attendee.name = attendee.email);

            person.listPhotoPath && (attendee.listPhotoPath = person.listPhotoPath);
            attendee.personId = person.personId;
        }
        ((this.lookupCount >= total) || !(this.lookupCount % list.pageSize)) && list.render();
    }

});
