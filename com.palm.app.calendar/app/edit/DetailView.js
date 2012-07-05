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


/*global enyo */

/*
 TODO: FIX: Update displayed times per 24hr. clock mode setting.

 TODO: Find out if enyo provides open & close events for a popup's content.
 */
enyo.kind({
    name     : "calendar.edit.DetailView",
    className: "calendar-detail-view",
    kind     : enyo.Pane,
    events   : {
        onDelete: "",
        onEdit  : "",
        onExit  : ""    // Used to notify external components (AppView.js) when exiting this view.
    },
    published: {
        accountsAndCalendars: null, // Object	: For watching calendars changing.
        event               : null, // Object	: Event data model.
        is24Hr              : false // Boolean	: For watching 24-hr clock mode changes.
    },

    G11N: {
        noSubject: $L("No Subject")
    },

    components: [
        {name: "attendeesView", kind: "calendar.edit.AttendeesView", lazy: true, onCloseClicked: "closeClicked", onExit: "closeView", onShowContactDetails: "showContactDetails"},
        {name: "contactDetails", kind: "calendar.edit.ContactView", lazy: true, onCloseClicked: "closeClicked", onExit: "closeView"},
        // NOTE: Detail view itself is below:
        {name: "detailView", kind: enyo.VFlexBox, components: [
            {kind: enyo.VFlexBox, className: "group detail-view-group", flex: 1, components: [
                {name: "contentScroller", kind: enyo.Scroller, autoHorizontal: false, horizontal: false, flex: 1, components: [
                    {name: "subject", className: "enyo-first detail-view-subject", pack: "center", allowHtml: true},
                    {kind: enyo.RowItem, layoutKind: enyo.HFlexLayout, align: "center", className: "first detail-view-row", components: [
                        {className: "detail-view-icon detail-view-icon-time"},
                        {kind: enyo.VFlexBox, flex: 1, components: [
                            {name: "dateTimeFrom"},
                            {name: "dateTimeTo"}
                        ]}
                    ]},
                    {name: "locationRow", kind: enyo.RowItem, showing: false, layoutKind: enyo.HFlexLayout, align: "center", className: "detail-view-row", onclick: "launchMaps", components: [
                        {className: "detail-view-icon detail-view-icon-location"},
                        {name: "location", flex: 1, className: "detail-view-location ellipsis"},
                        {name: "btnDirections", kind: enyo.IconButton, c_ontent: $L("Directions"), icon: "edit/images/icon-direction.png", onclick: "launchMaps"}
                    ]},
                    {name: "repeatRow", kind: enyo.RowItem, showing: false, layoutKind: enyo.HFlexLayout, align: "center", className: "detail-view-row", components: [
                        {className: "detail-view-icon detail-view-icon-repeat"},
                        {name: "repeat"}
                    ]},
                    {name: "reminderRow", kind: enyo.RowItem, showing: false, layoutKind: enyo.HFlexLayout, align: "center", className: "detail-view-row", components: [
                        {className: "detail-view-icon detail-view-icon-reminder"},
                        {name: "reminder"}
                    ]},
                    {name: "attendees", kind: enyo.RowItem, layoutKind: enyo.HFlexLayout, align: "center", onclick: "showAttendees", className: "detail-view-row", components: [
                        {className: "detail-view-icon detail-view-icon-attendees"},
                        {kind: enyo.VFlexBox, flex: 1, components: [
                            {name: "attendeesName", className: "detail-view-attendees-name ellipsis"},
                            {name: "attendeesCount", className: "ellipsis"}
                        ]}
                    ]},
                    {name: "noteContainer", kind: enyo.RowItem, className: "enyo-flat-shadow enyo-last", components: [
                        {name: "note", className: "detail-view-note", allowHtml: true}
                    ]}
                ]}
            ]},
            {kind: enyo.VFlexBox, components: [
                {name: "btnEdit", kind: enyo.Button, caption: $L("Edit"), onclick: "editClicked", flex: 1, className: "enyo-button-dark"},
                {name: "btnDelete", kind: enyo.Button, caption: $L("Delete"), onclick: "deleteClicked", flex: 1, className: "enyo-button-negative"},
                //{kind: enyo.HFlexBox, components: [
                {name: "btnCancel", kind: enyo.Button, caption: $L("Close"), onclick: "closeClicked", flex: 1, className: "enyo-button-light"}
                //]}
            ]}
        ]},
        {kind             : "ApplicationEvents",
            onWindowHidden: "closeClicked"
        },
        {name: "formatterCache", kind: "calendar.FormatterCache", onFormatsChanged: "formatDateTimeLabels", formats: {
            longDate : {date: "medium", dateComponents: "mdy", weekday: "medium"},
            shortDate: {date: "medium", dateComponents: "mdy"}
        }}
    ],

    create: function create() {
        this.inherited(arguments);
        enyo.application.watch({accountsAndCalendars: this, is24Hr: this});							// Watch for 24Hr and account/calendar changes.
        this.setupOnClose();
        this.setupOnOpen();
        (typeof ContactsManager == "undefined") && enyo.loadScript("shared/ContactsManager.js");	// Lazy load the Contacts Manager->Contacts Library
        this.lookupOrganizer = enyo.bind(this, this.lookupOrganizer);
        this.lookupOrganizerReady = enyo.bind(this, this.lookupOrganizerReady);
        DEBUG && this.log("########## Detail view created.");
    },

    destroy: function destroy() {
        enyo.application.ignore({accountsAndCalendars: this, is24Hr: this});					    // Ignore 24Hr and account/calendar changes.
        this.inherited(arguments);
        DEBUG && this.log("########## Detail view destroyed.");
    },

    closeClicked: function closeClicked() {
        this.exitView();
        return true;
    },

    closeView: function closeView(e) {
        this.back();
    },

    deleteClicked: function deleteClicked() {
        var event = this.eventGUI || this.event;	// Save a reference to one of these, because they'll get reset to null/undefined in exitView
        this.exitView();
        this.doDelete(event);
        return true;
    },

    editClicked: function editClicked() {
        var event = this.eventGUI || this.event;	// Save a reference to one of these, because they'll get reset to null/undefined in exitView
        this.exitView();
        this.doEdit(event);
        return true;
    },

    exitView: function exitView() {
        DEBUG && this.log("########## Exit DetailView view.");
        if (enyo.isFunction(this.container.close)) {
            this.container.close();
        } else {
            this.doExit();
            this.reset();					//	always reset the view (i.e. pane, scroll position, and event references)
        }
    },

    reset: function reset() {
        var ui = this.$;
        this.event = this.eventGUI = null;	// Release the event references since we're resetting the view state.
        ui.contentScroller.setScrollTop(0);	// Reset the scroll position.
        this.selectView(ui.detailView);     // Set the default view.
    },

    setupOnClose: function setupOnClose() {
        if (!enyo.isFunction(this.container.doClose)) {
            return;
        }
        var view = this,
            doClose = this.container.doClose;
        this.container.doClose = function closeManager() {  // Override this popup's onClose handler to:
            DEBUG && this.log("########## Hiding DetailView popup.");
            view.doExit();
            doClose.apply(this, arguments);					    // then run any defined "onClose" handler.
            view.reset();										// always reset the view (i.e. pane and scroll position)
        };
    },

    setupOnOpen: function setupOnOpen() {
        if (!enyo.isFunction(this.container.doOpen)) {
            return;
        }
        var view = this,
            doOpen = this.container.doOpen;

        this.container.doOpen = function openDetailView() { // Override this popup's onOpen handler.
            doOpen.apply(this, arguments);				        // Run any existing "onOpen" handlers.
        };
    },

    showAttendees: function showAttendees() {
        var people = this.validateView("attendeesView");

        if (this.attendeesFirstTime) {
            var event = this.event,
                cal = enyo.application.calendarsManager.getCal(event.calendarId);	// TODO: FIX: Per webOS Calendar spec all events (including EAS) must have an accountID.

            cal && people.setAccountId(cal.accountId);
            people.setOrganizerIndex(event.organizerIndex);
            people.setAttendees(Utilities.getActiveAttendees(event));
            people.setSubject(event.subject || this.G11N.noSubject);
            this.attendeesFirstTime = false;
        }

        this.selectView(people);
    },

    showContactDetails: function showContactDetails(inSender, contactInfo) {
        if (!contactInfo) {
            return;
        }

        var isKnownPerson = ("personId" in contactInfo);

        if (!isKnownPerson) {
            if (typeof ContactsLib == "undefined") {
                this.error("===:===: Unable to display contact details without the Contacts Library :===:===");
                return;
            }

            var attendee = contactInfo,
                contact = ContactsLib.ContactFactory.createContactDisplay(),
                contactName = contact.getName(),
                parsedName = new enyo.g11n.Name(attendee.name);
            parsedName.givenName && contactName.setGivenName(parsedName.givenName);
            parsedName.familyName && contactName.setFamilyName(parsedName.familyName);
            contact.getEmails().add(new ContactsLib.EmailAddress({ value: attendee.email }));
        }

        try {
            var contactDetails = this.validateView("contactDetails");

            (isKnownPerson)                                     // If this is a known person (i.e. in the user's Contacts)
                ? contactDetails.setPersonId(contactInfo.personId)  // display their full reverse-looked-up contact details
                : contactDetails.setContact(contact)                // otherwise create a simple contact display.
            ;
            this.selectView(contactDetails);
        } catch (e) {
            this.error("===:===: Unable to display contact details: ", (e.stack || ''));
        }
    },

    accountsAndCalendarsChanged: function accountsAndCalendarsChanged() {
        var event = this.event;
        if (!event) {
            return;
        }

        var color = enyo.application.calendarsManager.getCalColor(this.event.calendarId) || "none";	// Since the accounts and/or calendars changed, re-grab the color. If there is no color, set a non-existant color.

        // TODO: What happens if the calendar is removed while we are viewing the event?
        if (color) {
            this.updateColorTheme(color);
            event.color = color;
        }
    },

    eventChanged: function eventChanged() {
        var event = this.event;
        if (!event) {
            return;
        }

        this.attendeesFirstTime = true;             // Attendees View only needs to do processing the first time after the event changes

        event.event                                 // This event is likely an event's GUI because it contains an event object:
            && (this.eventGUI = event)                  // so locally cache the event's GUI so it can be immediately updated after editing
        && (this.event = event = event.event)           // and locally cache the actual event.
        ;

        var ui = this.$;

        if ("color" in event) {
            this.updateColorTheme(event.color);
        } else if (this.accountsAndCalendars) {
            this.accountsAndCalendarsChanged();
        }

        ui.subject.setContent(event.subject ? enyo.string.runTextIndexer(enyo.string.escapeHtml(event.subject)) : this.G11N.noSubject);
        this.formatDateTimeLabels();

        ui.location.setContent(event.location);
        ui.locationRow.setShowing(!!(event.location && event.location.length));

        var repeatLabel = this.findRepeatLabel(event);
        ui.repeat.setContent(repeatLabel);
        ui.repeatRow.setShowing(!!(repeatLabel.length));

        var reminderLabel = this.findReminderLabel(event);
        ui.reminder.setContent(reminderLabel);
        ui.reminderRow.setShowing(!!(reminderLabel.length));

        Utilities.findEventOrganizer(event);

        this.formatAttendeeLabels(event);

        ui.note.setContent(Utilities.getIndexedEventNote(event));

        ui.noteContainer.setShowing(!!(event.note && event.note.length));

        var isReadOnly = enyo.application.calendarsManager.isCalendarReadOnly(event.calendarId);
        ui.btnDelete.setShowing(!isReadOnly);
        ui.btnEdit.setShowing(!isReadOnly);
    },

    is24HrChanged: function is24HrChanged(oldIs24Hr) {
        var is24Hr = this.is24Hr = !!this.is24Hr;
        if (oldIs24Hr !== undefined && oldIs24Hr == is24Hr) {
            return;
        }

        this.$.formatterCache.formatsChanged();	// Clear the cached formatters so that they can be rebuilt.
    },

    launchMaps: function launchMaps(inSender) {
        var ui = this.$,
            location = ui.location.getContent(),
            directions = (inSender === ui.btnDirections);

        if (!location) {
            return true;
        }  // Quick escape since there is no location

        enyo.application.share({
            launch: {
                appId        : "com.palm.app.maps",
                address      : location,
                getDirections: directions
            }
        });
        return true;
    },

    updateColorTheme: function updateColorTheme(color) {
        if (!color) {
            return;
        }
        var header = this.$.subject;
        header.removeClass(this.colorThemeClass);
        this.colorThemeClass = "theme-" + color;
        header.addClass(this.colorThemeClass);
    },

    repeatLabelMap: {
        never        : "",
        daily        : $L("Daily"),
        weekly       : $L("Weekly"),
        weekday      : $L("Weekdays"),
        custom       : $L("Custom"),
        customDaily  : $L("Custom Daily"),
        customWeekly : $L("Custom Weekly"),
        customMonthly: $L("Custom Monthly"),
        customYearly : $L("Custom Yearly")
    },

    findRepeatLabel: function findRepeatLabel(event) {
        var value = Utilities.findRepeatValue(event.rrule);
        return this.repeatLabelMap[value];
    },

    findReminderLabel: function findReminderLabel(event) {

        // Get the active alarm's value and then process the value return readable text.
        return Utilities.getAlarmString(Utilities.findReminderValue(event.alarm));
    },

    attendeeLabelTemplate: new enyo.g11n.Template($L("1##{num} attendee|1>##{num} attendees")),

    formatAttendeeLabels: function formatAttendeeLabels(event) {
        var attendees = Utilities.getActiveAttendees(event),
            num = attendees && attendees.length,
            organizer = event.organizer,
            ui = this.$;

        if (!num || (num === 1 && organizer)) {
            ui.attendees.setShowing(false);
            return;
        }

        var str = this.attendeeLabelTemplate.formatChoice(num, {num: num});
        ui.attendeesCount.setContent(str);

        if (organizer) {
            !organizer.name && (organizer.name = organizer.commonName || organizer.email || $L("Unknown Organizer"));	// Initial value may be updated by lookup
            ui.attendeesName.setContent(organizer.name);
            setTimeout(this.lookupOrganizer, 100);
        } else {
            ui.attendeesName.setContent("");
        }
        ui.attendees.setShowing(!!num);
    },

    lookupOrganizer: function lookupOrganizer() {

        //TODO: Since the contacts person APIs are asynchronous, we probably need to change how this works.
        //1: If you are in the attendees list, and you tap an attendee and add a contact with a new photo,
        //we don't update our view, and we maybe should.  I don't know if there's something we can listen for to detect that though.
        var organizer = this.event.organizer;
        try {
            if (organizer && organizer.email) {
                //this.log("Performing an organizer lookup in Detail View.");
                enyo.application.contactsManager.findByEmail(organizer.email, this.lookupOrganizerReady);
            }
        } catch (e) {
            this.log("===:===: Organizer lookup failed: ", e);
        }
    },

    lookupOrganizerReady: function lookupOrganizerReady(person) {
        var organizer = this.event.organizer;

        if (person && organizer) {
            person.displayName
                ? (organizer.name = person.displayName) :

                // Use the commonName, name, or email from the attendee as worst case
                organizer.commonName
                    ? (organizer.name = organizer.commonName) :

                    (!organizer.name) && (organizer.name = organizer.email);

            //this.log("Name used: ",organizer.name);
            this.$.attendeesName.setContent(organizer.name);
        }
    },

    formatDateTimeLabels: function formatDateTimeLabels() {
        var event = this.event;
        if (!event) {
            return;
        }

        var start = new Date(event.currentLocalStart || event.dtstart),
            end = new Date(event.currentLocalEnd || event.dtend),
            ui = this.$,
            line1 = ui.dateTimeFrom,
            line2 = ui.dateTimeTo,
            line1Content,
            line2Content;

        //Format should be:
        // 12 hr format:              24 hr format:				AllDay events:
        //  Feb 5, 2011 11:00 PM to    Feb 5, 2011 23:00 to		Sat, Feb 5 2011 to
        //  Feb 6, 2011 1:00 AM        Feb 6, 2011 1:00			Sun, Feb 6 2011
        //or
        //  Sat, Feb 5 2011            Sat, Feb 5 2011			Sat, Feb 5 2011
        //  9:00 PM to 11:00 PM        21:00 to 23:00

        // NOTE: HACKY BIT: All day events may need to trim 1 second.  When switching to currentLocalStart/End, this shoudn't be necessary
        /*if(event.allDay && (event.dtstart !== event.dtend) &&
         end.getHours() == 0 && end.getMinutes() == 0 && end.getSeconds() == 0 && end.getMilliseconds() == 0){
         end = new Date(event.dtend - 1000);
         }*/

        var oneDate = (start.getFullYear() == end.getFullYear() && start.getMonth() == end.getMonth() && start.getDate() == end.getDate()),
            dateFormatter = ui.formatterCache.getFormatter((event.allDay || oneDate) ? "longDate" : "shortDate");

        if (oneDate && event.allDay) {
            line1Content = dateFormatter.format(start);
            line2Content = "";
        }
        else {
            line1Content = dateFormatter.formatRange(start, end);
            var length = this.is24Hr ? 18 : 21;
            var lines = Utilities.wrapIt(line1Content, oneDate, length);
            line1Content = lines[0];
            line2Content = lines[1];
        }
        line1.setContent(line1Content);
        line2.setContent(line2Content);
    }

});
