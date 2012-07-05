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


/*
 NOTE: Better to use ListSelector than Picker b/c:
 - It will probably be easier to integrate localization.
 - It works like a Picker.

 NOTE: Active Attendees
 - Every time the base attendee list is modified, make sure that the active attendee list is reset to undefined.
 This is because the active attendee list (when retrieved through the Utilities.getActiveAttendees(..) method)
 is cached and may not include your modification, and thus the cache needs to be reset.

 TODO: FIX: Enyo: onblur doesn't capture field's new value if (ESC) backing out of the view; see editLocation or editNote.
 TODO: FIX: Enyo: RichTextField's doesn't convert "\n" characters to "<br />" when using setValue(); see calendar.edit.EditView.eventChanged().
 TODO: FIX: Update displayed times per 24hr. clock mode setting.

 TODO: PERF: Clear event and eventGUI references on exit.

 TODO: PLAN: Move Attendee support methods into a separate MeetingManager component. Future releases will need the exact logic to support another GUI.
 */

enyo.kind({
    name        : "calendar.edit.CalendarSelector",
    kind        : enyo.CustomListSelector,
    itemKind    : "calendar.edit.ColorNameIconItem",
    setItemProps: function (inItem) {
        this.inherited(arguments);
        this.item.setIcon(inItem.iconSrc);
        this.item.setLabel(inItem.label);
        this.item.setColor(inItem.color);
    }
});

enyo.kind({
    name           : "calendar.edit.ColorNameIconItem",
    kind           : enyo.MenuItem,
    className      : "edit",
    published      : {
        color: "",
        icon : "",
        label: ""
    },
    needsItemChrome: true,
    chrome         : [
        {name: "item", kind: enyo.Item, tapHighlight: true, align: "center", onclick: "itemClick"}
    ],
    itemChrome     : [
        {kind: enyo.HFlexBox, flex: 3, components: [
            {name: "colorSwatch"},
            {name: "caption", flex: 1, width: "450px", className: "color-space ellipsis"},
            {name: "icon", kind: enyo.Image, className: "color-space"},
            {name: "arrow", kind: enyo.CustomButton, toggling: false, showing: false, disabled: true} // NOTE: only here because MenuItem parent is unhappy if it's missing
        ]}
    ],
    create         : function create() {
        this.inherited(arguments);
        this.colorChanged();
        this.labelChanged();
        this.iconChanged();
    },
    colorChanged   : function colorChanged() {
        var className = "menu theme-" + this.color.toLowerCase() + " legend";
        this.$.colorSwatch.setClassName(className);
    },
    labelChanged   : function labelChanged() {
        this.$.caption.setContent(this.label);
    },
    iconChanged    : function iconChanged() {
        this.inherited(arguments);
    },
    openChanged    : function openChanged() {   //MenuItem parent changes arrow properties in here. We don't want that.
    }
});

enyo.kind({
    name     : "calendar.edit.EditView",
    kind     : enyo.VFlexBox,
    className: "edit enyo-bg",
    flex     : 1,
    showing  : false,

    events: {
        onDelete: "",
        onExit  : ""    // Used to notify external components (AppView.js) when exiting this view.
    },

    published: {
        accountsAndCalendars: null,
        event               : null,
        is24Hr              : false,
        prefs               : null,
        tzId                : null
    },

    G11N: { // Cached Globalization strings:
        header: {
            Edit: $L("Edit Calendar Event"),
            New : $L("New Calendar Event")
        }
    },

    components: [
        {kind: enyo.PageHeader, className: "enyo-toolbar-light edit-header", pack: "center", components: [
            {kind: enyo.Image, src: "../images/icon-48x48.png", className: "editIcon"},
            {name: "editHeader"}
        ]},
        {name: "contentScroller", kind: enyo.Scroller, flex: 1, height: "100%", className: "top-container", components: [
            //Scroller....
            {name: "contentContainer", className: "content-container", components: [
                {kind: enyo.RowGroup, className: "group", components: [
                    {name: "subject", kind: enyo.RichText, hint: $L("Event Name"), className: "event-name", onblur: "editSubject", autoLinking: true, allowHtml: true, onkeydown: "ignoreNewLines", inputClassName: "event-name-input", maxTextHeight: "23px"},
                    {name: "location", kind: enyo.Input, hint: $L("Event Location"), className: "event-location", onblur: "editLocation"},
                    {name: "calendarPicker", kind: "calendar.edit.CalendarSelector", onChange: "editCalendar", className: "list1", hideArrow: false}
                ]},
                {kind: enyo.Group, className: "group", components: [
                    {kind: enyo.HFlexBox, align: "center", height: "48px", components: [
                        {name: "allDay", kind: enyo.CheckBox, style: "margin-left: 10px", onChange: "changeAllDay"},
                        {content: $L("All day event"), style: "padding-left: 5px;"}
                    ]},
                    {components: [
                        {content: $L("From"), className: "edit-view-label"},
                        {kind: enyo.HFlexBox, className: "horizontal-space", components: [
                            {name: "startDate", kind: enyo.DatePicker, label: " ", onChange: "changeStartDate"},
                            {name: "startTimeDrawer", kind: enyo.BasicDrawer, animate: false, components: [
                                {name: "startTime", kind: enyo.TimePicker, label: " ", className: "spacer", onChange: "changeStartTime"}
                            ]}
                        ]},
                        {content: $L("To"), className: "edit-view-label"},
                        {kind: enyo.HFlexBox, className: "horizontal-space", components: [
                            {name: "endDate", kind: enyo.DatePicker, label: " ", onChange: "changeEndDate"},
                            {name: "endTimeDrawer", kind: enyo.BasicDrawer, animate: false, components: [
                                {name: "endTime", kind: enyo.TimePicker, label: " ", className: "spacer", onChange: "changeEndTime"}
                            ]}
                        ]}
                    ]},
                    {kind: enyo.HFlexBox, components: [
                        {kind: enyo.VFlexBox, className: "horizontal-space repeat-alert-space", components: [
                            {content: $L("Repeat"), className: "edit-view-label"},
                            { kind: enyo.HFlexBox, style: "margin-left: 6px;", components: [
                                {kind: "Button", className: "enyo-button-light list-selector", components: [
                                    {kind: enyo.HFlexBox, components: [
                                        {
                                            // {kind: enyo.Image, src: "edit/images/repeat-icon.png", style: "margin: 0px 4px;"},
                                            name     : "repeat",
                                            kind     : enyo.CustomListSelector,
                                            value    : "never",
                                            label    : "",
                                            hideArrow: false,
                                            onSelect : "editRepeat",
                                            className: "alert-list",
                                            items    : [
                                                {caption: $L("No Repeat"), value: "never"},
                                                {caption: $L("Daily"), value: "daily"},
                                                {caption: $L("Weekdays"), value: "weekday"},
                                                {caption: $L("Weekly"), value: "weekly"},
                                                {caption: $L("Custom"), value: "custom"}
                                            ]
                                        }
                                    ]}
                                ]}
                            ]}
                        ]},
                        {kind: enyo.VFlexBox, components: [
                            {content: $L("Alerts"), className: "edit-view-label"},
                            { kind: enyo.HFlexBox, style: "margin-left: 6px;", components: [
                                {kind: "Button", className: "enyo-button-light list-selector", components: [
                                    { kind: enyo.HFlexBox, components: [
                                        //{kind: enyo.Image, src: "edit/images/reminder-icon01.png", style: "margin: 8px 4px 0px;"},
                                        {name: "reminderTimed", kind: "calendar.prefs.TimedReminderSelector", value: "none", onChange: "editReminder", className: "alert-list", label: "", hideArrow: false},
                                        {name: "reminderAllDay", kind: "calendar.prefs.AllDayReminderSelector", value: "none", onChange: "editReminder", className: "alert-list", label: "", hideArrow: false}
                                    ]}
                                ]}
                            ]}
                        ]}
                    ]}
                ]},

                {name: "attendeesSummary", kind: enyo.Control, showing: false, className: "attendees-summary"},

                {name: "attendeesEditor", kind: enyo.Group, showing: false, onclick: "positionScroller", components: [
                    {name: "attendeesList", kind: "AddressingPopup", inputType: "email", onBeforePopupOpen: "positionScroller", onContactsChanged: "updateAttendeeWidgets"}
                ]},

                {kind: enyo.RowGroup, onclick: "focusNote", components: [
                    {name: "note", kind: enyo.RichText, hint: $L("Event Notes"), autoLinking: true, className: "note", onblur: "editNote", alwaysLooksFocused: true}    // TODO: FIX: HACK because onblur doesn't work well with back gesture!
                ]},
                {name: "btnDelete", className: "enyo-button-negative btn-del-edit", kind: enyo.Button, onclick: "closeView", showing: false, caption: $L("Delete"), align: "center"}
            ]}
        ]},
        {name: "repeatViewPopup", kind: enyo.ModalDialog, caption: $L("Set Custom Repeat"), className: "enyo-modaldialog-customWidth", modal: true, scrim: true, showing: false, components: [
            {name: "repeatView", kind: "calendar.edit.RepeatView", onExit: "closeView", onRepeatChange: "setupRepeatValue"}
        ]},
        {name: "repeatChangeDialog", kind: enyo.ModalDialog, scrim: true, showing: false, components: [
            {name: "repeatChangeConfirm", kind: "calendar.edit.RepeatChangeConfirm", onSave: "prepToSaveEvent"}
        ]},
        {kind: enyo.Toolbar, className: "toolbar1 enyo-toolbar-light", components: [
            {kind: enyo.Button, name: "btnCancel", caption: $L("Cancel"), onclick: "closeView", className: "enyo-button-light btn-cancel"},
            {kind: enyo.Button, name: "btnDone", caption: $L("Done"), onclick: "closeView", className: "enyo-button-dark btn-done"}
        ]},
        {kind: "ApplicationEvents", onWindowHidden: "windowHiddenHandler"
        }
    ],

    create: function create() {
        this.inherited(arguments);
        enyo.application.watch({ accountsAndCalendars: this, is24Hr: this, prefs: this, tzId: this });
        this.eventChanged();

        this.dbManager = enyo.application.databaseManager;
        this.saveEvent = enyo.bind(this, this.saveEvent);
        this.saveEventFailed = enyo.bind(this, this.saveEventFailed);
        this.eventMovedToDifferentCalendar = enyo.bind(this, this.eventMovedToDifferentCalendar);

        (typeof ContactsManager == "undefined") && enyo.loadScript("shared/ContactsManager.js");		// Lazy load the Contacts Manager->Contacts Library
        this.lookupOrganizer = enyo.bind(this, this.lookupOrganizer);
        this.lookupOrganizerReady = enyo.bind(this, this.lookupOrganizerReady);

        this.basicRepeatTypes = {"daily": 1, "weekly": 1, "weekday": 1, "custom": 1, "never": 1};
        this.customCaptions = {
            custom       : $L("Custom"),
            customDaily  : $L("Custom Daily"),
            customWeekly : $L("Custom Weekly"),
            customMonthly: $L("Custom Monthly"),
            customYearly : $L("Custom Yearly")
        };
    },

    destroy: function destroy() {
        // We don't always get showing: false before being destroyed, so unsubscribe here:
        enyo.application.ignore({ accountsAndCalendars: this, is24Hr: this, prefs: this, tzId: this});
        this.inherited(arguments);
    },

    rendered: function rendered() {
        this.inherited(arguments);
        this.isRendered = true;
    },
// BEGIN :-------: Framework Handlers :-----------------------------------------------------------------------------------------------------------------------//

    is24HrHandler: function () {/*doNothing*/
    },

    resizeHandler: function resizeHandler(from, domEvent) {
        DEBUG && this.log("======= RESIZED\t");
        if (this.waitForKeyboard && enyo.keyboard.isShowing()) {
            this.positionScroller();
        }
    },

    viewSwitchedHandler: function () {/*doNothing*/
    },

// BEGIN :-------: Published Property Handlers :--------------------------------------------------------------------------------------------------------------//

    accountsAndCalendarsChanged: function accountsAndCalendarsChanged() {
        this.setupCalendarPicker();
    },

    eventChanged: function eventChanged(oldEvent) {
        var event = this.event;
        if (!event) {
            return;
        }

        event.event                                                    // This event is likely an event's GUI because it contains an event object:
            && (this.eventGUI = event)                                //	so cache the event's GUI so it can be immediately updated after editing
        && (this.event = event = event.event);					//	and cache the actual event.

        DEBUG && this.log("event: " + JSON.stringify(event));

        var ui = this.$,
            indexedNote = Utilities.getIndexedEventNote(event),
            subject;

        if (event.subject && event.subject.length) {
            subject = enyo.string.escapeHtml(event.subject);
            subject = enyo.string.runTextIndexer(subject);
        }

        this.undoEvent = new CalendarEvent(event);	// undoEvent is used to reset the event if the user cancel's editing.
        this.undoEvent.color = event.color;					// Add the event color to undoEvent since it is sanitized out above.
        this.undoEvent.indexedNote = indexedNote;					// Add the cached indexed note to undoEvent, no need to process again if nothing changed

        ui.subject.setValue(subject || "");
        ui.location.setValue(event.location || "");
        ui.note.setValue(indexedNote);
        ui.btnDelete.setShowing("_id" in event);

        isNaN(event.currentLocalStart) && (event.currentLocalStart = event.dtstart);
        isNaN(event.currentLocalEnd) && (event.currentLocalEnd = event.dtend);

        ui.editHeader.setContent(("_id" in event) ? this.G11N.header.Edit : this.G11N.header.New);
        this.setupCalendarPicker(event.calendarId);

        //pickerStart and pickerEnd are the values displayed by the
        //time and date pickers.  If they change, they'll be merged back on to
        //the event before we save.
        this.pickerStart = event.currentLocalStart;
        this.pickerEnd = event.currentLocalEnd;
        var start = new Date(this.pickerStart);
        var end = new Date(this.pickerEnd);
        ui.startDate.setValue(start);
        ui.startTime.setValue(start);

        ui.endDate.setValue(end);
        ui.endTime.setValue(end);

        ui.allDay.setChecked(!!event.allDay);
        ui.startTimeDrawer.setOpen(!event.allDay);
        ui.endTimeDrawer.setOpen(!event.allDay);

        Utilities.findEventOrganizer(event);

        this.setupRepeatValue();
        this.setupReminder(event);
        this.setupAttendees(event);
        this.toggleDoneButtonText();

        this.waitForKeyboard = false;

        DEBUG && this.log("event: " + JSON.stringify(event));
    },

    is24HrChanged: function is24HrChanged() {
        var ui = this.$,
            state = this.getIs24Hr();
        ui.startTime.setIs24HrMode(state);
        ui.endTime.setIs24HrMode(state);
    },

    prefsChanged: function prefsChanged() {
        /* Prefs have changed so update to reflect the change. */
        // TODO: Update default alarm and default allday alarm
    },

    showingChanged: function showingChanged() {
        this.inherited(arguments);

        if (!this.showing) {
            var ui = this.$;
            this.event && this.editLocation(ui.location);		// TODO: FIX: Because onblur doesn't fire on back gesture so we miss location changes
            this.event && this.editNote(ui.note);			// TODO: FIX: Because onblur doesn't fire on back gesture so we miss note changes
            this.isRendered && this.closeView(ui.btnDone);		// If Edit view hasn't been rendered skip closeView().
            this.isRendered = false;
            this.eventGUI = this.undoEvent = null;
            this.startDateOld = this.endDateOld = null;
            this.pickerStart = this.pickerEnd = null;
            enyo.call(document.activeElement, "blur");

            if (this.hasCustomReminderItem && this.hasCustomReminderItem.selector) {
                var selector = this.hasCustomReminderItem.selector,
                    items = selector.getItems();
                items.pop();
                selector.setItems(items);
                this.hasCustomReminderItem = false;
            }

            this.reset();
            return;
        }
    },

    tzIdChanged: function tzIdChanged() {

        // In for logging purposes.  EditView needs to watch TZ changes so that saved events get the correct timezone.
        DEBUG && this.log("events created will use: " + this.tzId);
    },

// BEGIN :-------: Custom Methods :---------------------------------------------------------------------------------------------------------------------------//

    windowHiddenHandler: function windowHiddenHandler() {
        this.showing && this.closeView(this.$.btnCancel);
    },

    closeView: function closeView(source, domEvent) {
        var ui = this.$,
            confirmingSave = false;
        switch (source) {
        case ui.btnCancel:
            this.isRendered = false;
            if (this.eventGUI) {                                // If we have the event's GUI when canceling its creation:
                ("_id" in this.event)                            //		And the event has and id:
                    ? this.eventGUI.setEvent(this.undoEvent)        //			reset the event's GUI to its original state,
                    : this.eventGUI.destroy()                        //			otherwise destroy the event's GUI.
                ;
            }
            break;

        case ui.btnDelete:
            this.doDelete(this.eventGUI || this.event);
            break;

        case ui.btnDone:
            confirmingSave = this.confirmSave();
            break;

        case ui.repeatView:
            this.setupRepeatValue();
            return;
        }

        if (!confirmingSave) {
            this.doExit(this.event);
            this.resetEventModels();
        }
        return true;
    },

    focusNote: function focusNote() { // TODO: Make sure that there isn't a better way of doing this.
        this.$.note.forceFocus();
    },

    positionScroller: function positionScroller(sender) {
        var ui = this.$;

        if (sender === ui.attendeesEditor) {
            this.waitForKeyboard = true;
            return false;
        } else if (sender !== ui.attendeesList) {
            this.waitForKeyboard = false;
        }

        var top = ui.attendeesEditor.hasNode()
        top && (top = top.offsetTop);
        isFinite(top) && ui.contentScroller.setScrollTop(top);

        return false;
    },

    reset: function reset() {
        this.$.contentScroller.setScrollTop(0);	// Reset the scroll position.
    },

    setupRepeatValue: function setupRepeatValue(sender, repeatType) {
        var customType,
            event = this.event,
            valueType,
            repeat = this.$.repeat;

        if (event.parentId) {
            repeatType = "never";
            repeat.setValue(repeatType);
            repeat.setDisabled(true);
            return;
        }

        repeat.setDisabled(false);
        if (!repeatType) {
            repeatType = Utilities.findRepeatValue(event.rrule);
        }
        if (this.basicRepeatTypes[repeatType]) {
            customType = "custom";
            valueType = repeatType;
        }
        else {
            customType = repeatType;
            valueType = "custom";
        }
        this.setupCustomItem(customType);
        repeat.setValue(valueType);
    },

    setupCustomItem: function setupCustomItem(repeatType) {
        var repeat = this.$.repeat,
            newItem = {caption: this.customCaptions[repeatType], value: "custom"},
            items = repeat.getItems();

        items.pop(); //pop the last one - the custom one
        items.push(newItem);
        repeat.setItems(items);
    },

    setupReminder: function setupReminder(event, allDayChanged) {
        var ui = this.$;
        ui.reminderTimed.setShowing(!event.allDay);
        ui.reminderAllDay.setShowing(!!event.allDay);

        var selector = event.allDay ? ui.reminderAllDay : ui.reminderTimed;

        var reminderValue = Utilities.findReminderValue(event.alarm);
        var items;
        var alarmType = Utilities.isStandardAlarmValue(reminderValue, event.allDay);
        if (alarmType.isStandard && alarmType.isStandardForType && !allDayChanged) {
            selector.setValue(reminderValue);
            return;
        }

        if (alarmType.isStandard && (!alarmType.isStandardForType || allDayChanged)) {
            var prefs = enyo.application.prefsManager.getPrefs();
            if (prefs) {
                reminderValue = event.allDay ? prefs.defaultAllDayEventReminder : prefs.defaultEventReminder;
            } else {
                reminderValue = event.allDay ? "-P1D" : "-PT15M";
            }
            var displayAlarmIndex = Utilities.findDisplayAlarm(event.alarm);
            Utilities.setAlarm(event.alarm[displayAlarmIndex], reminderValue);
        }
        else {
            //If we already have a custom item, remove it so we don't get duplicates
            if (this.hasCustomReminderItem && this.hasCustomReminderItem.selector) {
                var sel = this.hasCustomReminderItem.selector;
                items = sel.getItems();
                items.pop();
                sel.setItems(items);
                this.hasCustomReminderItem = false;
            }

            //Create and add the custom item to the reminder selector
            var customAlarmString = Utilities.getAlarmString(reminderValue);
            items = selector.getItems();
            items.push({caption: customAlarmString, value: reminderValue});
            selector.setItems(items);
            this.hasCustomReminderItem = {value: true, selector: selector};
        }
        selector.setValue(reminderValue);
    },

    setupCalendarPicker: function setupCalendarPicker(calendarId) {
        var mgr = enyo.application.calendarsManager;
        this.calendars = mgr.getCalendarsList({sorted: true, excludeReadOnly: true});

        var ui = this.$,
            calLength = this.calendars.length,
            cal,
            items = [],
            item;

        for (var i = 0; i < calLength; i++) {
            cal = this.calendars[i];
            item = {label: cal.showName, caption: cal.showName, value: cal._id, icon: mgr.getCalAccountIcon(cal.accountId), /*className: "list theme-"+cal.color+" legend",*/ color: cal.color};
            items.push(item);
        }
        ui.calendarPicker.setItems(items);
        calendarId = calendarId || (this.event && this.event.calendarId) || enyo.application.prefsManager.getDefaultCalendar();
        ui.calendarPicker.setValue(calendarId);	// calendarId will be undefined on accountsAndCalendarsChanged().
    },

    ignoreNewLines: function ignoreNewLines(inSender, inResponse) {
        if (inResponse && inResponse.keyCode === 13) {
            enyo.stopEvent(inResponse);
        }
    },

    editSubject: function editSubject(subject) {
        this.event.subject = subject && subject.getText();
    },

    editLocation: function editLocation(location) {
        this.event.location = location && location.value;
    },

    editCalendar: function editCalendar(picker, newCalendarId, oldCalendarId) {
        var calmgr = enyo.application.calendarsManager,
            event = this.event;

        event.calendarId = newCalendarId;
        event._kind = calmgr.getCalAccountKind(newCalendarId);
        event.color = calmgr.getCalColor(newCalendarId);
        this.dbManager.setEventAccountId(event);

        // Change the organizer account if there is an organizer
        event.organizer && (event.organizer.email = enyo.application.calendarsManager.getCalAccountUser(newCalendarId));

        this.setupAttendees(event);
        this.toggleDoneButtonText();
        // TODO: If you go from an invite-enabled calendar to a non-invite calendar, what happens if you change attendees? Should we warn people with a popup?
        // TODO: We need to grab the right name to go with the new account and email (Contacts cross lookup?).  If you're named "Pookie" in gmail, you don't want that name to still be persisted attached to your Exchange calendar.
    },

    updateEndTime  : function updateEndTime(timestamp) {
        var ui = this.$,
            end = new Date(timestamp);
        ui.endTime.setValue(end);
        ui.endDate.setValue(end);
    },

    //Rules for date and time changes:
    // 1. Any START DATE changes adjust the END DATE so duration of event stays same.
    // 2. END DATE can be modified as you please as long as its > START DATE.
    // 3. Any END DATE changes which causes a END DATE < START DATE will adjust START DATE to be equal to END DATE
    //    and adjust the START TIME = END TIME resulting in a duration of 0 minutes.
    // 3a. If you change the month of the END DATE such that it is < month of the START DATE, the year of the END DATE gets bumped by one year (see NOV-66811).
    // 4. If you change the END TIME such that it is < START TIME, the END TIME will be adjusted forward 12 hours - if in am set to pm; if in pm set to next day am.
    changeStartTime: function changeStartTime() {
        var ui = this.$,
            date = ui.startDate.getValue(),
            time = ui.startTime.getValue(),
            event = this.event;

        time.setFullYear(date.getFullYear());
        time.setMonth(date.getMonth());
        time.setDate(date.getDate());

        var duration = this.pickerEnd - this.pickerStart;

        this.pickerStart = time.getTime();
        this.pickerEnd = this.pickerStart + duration;

        //if you change the start time, you have to update the until time too to use the same time
        if (this.event.rrule && this.event.rrule.until && isFinite(this.event.rrule.until)) {
            var until = new Date(this.event.rrule.until);
            until.setHours(time.getHours());
            until.setMinutes(time.getMinutes());
            until.setSeconds(0);
            until.setMilliseconds(0);
            this.event.rrule.until = until.getTime();
        }
        this.updateEndTime(this.pickerEnd);
    },

    changeStartDate: function changeStartDate() {
        var event = this.event;

        this.changeStartTime();

        if (this.pickerStart != this.undoEvent.dtstart && event.rrule && event.rrule.freq) {
            var removeDate = this.oldStartValue || event.dtstart;
            Utilities.updateByDayRRule(event.rrule, removeDate, this.pickerStart);
        }
        this.oldStartValue = this.$.startDate.getValue().getTime();
    },

    changeEndTime: function changeEndTime() {
        var ui = this.$,
            date = ui.endDate.getValue(),
            time = ui.endTime.getValue(),
            event = this.event,
            changedDate = false;

        time.setFullYear(date.getFullYear());
        time.setMonth(date.getMonth());
        time.setDate(date.getDate());

        if (time < this.pickerStart) {
            //12 hr clock: add 12 hrs and flip am to pm, or pm to am of the next day
            //24 hr clock: add 24 hrs and skip ahead to the next day, because there's no am/pm ambiguity about what hour you mean
            this.is24Hr ? time.addHours(24) : time.addHours(12);
            changedDate = true;
        }

        this.pickerEnd = event.renderEndTime = time.getTime();
        if (changedDate) {
            this.updateEndTime(this.pickerEnd);
        }
    },

    changeEndDate: function changeEndDate() {
        var ui = this.$,
            date = ui.endDate.getValue(),
            time = ui.endTime.getValue(),
            event = this.event,
            changedDate = false;

        time.setFullYear(date.getFullYear());
        time.setMonth(date.getMonth());
        time.setDate(date.getDate());

        if (time < this.pickerStart) {
            var startDate = new Date(this.pickerStart);
            changedDate = true;
            if (time.getMonth() < startDate.getMonth()) {
                time.setFullYear(startDate.getFullYear() + 1);
            }
            else {
                time = startDate;
            }
        }
        this.pickerEnd = event.renderEndTime = time.getTime();
        if (changedDate) {
            this.updateEndTime(this.pickerEnd);
        }
    },

    changeAllDay: function changeAllDay() {
        /* The All-Day checkbox has been altered, so update this view to reflect the change. */
        var ui = this.$,
            state = (ui.allDay.checked),
            event = this.event;

        if (state) {
            this.startDateOld = this.pickerStart;
            this.endDateOld = this.pickerEnd;
            var midnight = new Date(this.pickerStart);
            midnight.clearTime();

            var eleven59 = new Date(midnight);
            eleven59.setHours(23);
            eleven59.setMinutes(59);
            eleven59.setSeconds(59);
            eleven59.setMilliseconds(0);

            this.pickerStart = midnight.getTime();
            this.pickerEnd = eleven59.getTime();
        }
        else {
            if (this.startDateOld) {
                this.pickerStart = this.startDateOld;
                this.pickerEnd = this.endDateOld;
            }
            else {
                var nextHour = new Date().getHours();
                var temp = new Date(this.pickerStart);
                temp.setHours(nextHour);
                temp.setMinutes(0);
                temp.setSeconds(0);
                temp.setMilliseconds(0);
                this.pickerStart = temp.getTime();
                this.pickerEnd = this.pickerStart + (enyo.application.prefsManager.prefs.defaultEventDuration * 60000);
            }
        }

        var start = new Date(this.pickerStart);
        var end = new Date(this.pickerEnd);
        ui.endDate.setValue(end);
        ui.endTime.setValue(end);
        ui.startDate.setValue(start);
        ui.startTime.setValue(start);
        event.allDay = state;
        ui.startTimeDrawer.setOpen(!state);
        ui.endTimeDrawer.setOpen(!state);

        this.setupReminder(event, true);
    },

    editRepeat: function editRepeat(repeat) {
        var event = this.event;
        if (!event) {
            return;
        }

        var repeatType = repeat && repeat.getValue();

        if (repeatType == "never") {
            event.rrule = null;
            return;
        }
        if (repeatType != "custom") {
            this.event.repeatChanged = true;
            this.event.rrule = Utilities.makeBasicRRule(repeatType, this.pickerStart);
            this.setupRepeatValue(null, repeatType);
            return;
        }
        var ui = this.$;
        ui.repeatViewPopup.lazy && ui.repeatViewPopup.validateComponents();
        var repeatView = ui.repeatView;
        //If pickerStart==currentLocal, then start date is not changed, use event.dtstart
        //else they've edited start, so use that
        var currdate = (this.pickerStart === event.currentLocalStart) ? event.dtstart : this.pickerStart;
        repeatView.setCurrentDate(currdate);
        repeatView.setEvent(event);
        ui.repeatViewPopup.openAtCenter();
    },

    editReminder: function editReminder(reminder) {
        var alarm = this.event.alarm,
            displayAlarmIndex = Utilities.findDisplayAlarm(alarm);

        if (displayAlarmIndex == null) {
            !alarm && (alarm = []);
            displayAlarmIndex = alarm.push(new CalendarAlarm()) - 1;
        }

        var alarmValue = reminder && reminder.getValue();
        Utilities.setAlarm(alarm [displayAlarmIndex], alarmValue);
        this.event.alarm = alarm;
    },

    setupAttendees: function setupAttendees(event) { // TODO: Needs lookup off of organizer & delegatedTo.
        var canEditAttendees = enyo.application.calendarsManager.isInvitationEnabledCalendar(event.calendarId);

        this.setupAttendeesSummary(event);

        if (canEditAttendees) {
            this.setupEditableAttendees(event);
            this.$.attendeesEditor.setShowing(true);
        } else {
            this.$.attendeesEditor.setShowing(false);
        }
    },

    attendeeLabel: {
        youOrganizer : new enyo.g11n.Template($L("1#This event is organized by you and has 1 attendee.|1>#This event is organized by you and has #{num} attendees.")),
        withOrganizer: new enyo.g11n.Template($L("1#This event is organized by #{organizer} and has 1 attendee.|1>#This event is organized by #{organizer} and has #{num} attendees.")),
        noOrganizer  : new enyo.g11n.Template($L("1#This event has 1 attendee.|1>#This event has #{num} attendees."))
    },

    updateAttendeeWidgets: function updateAttendeeWidgets() {
        this.updateAttendeeCount();
        this.editAttendees();
    },

    updateAttendeeCount: function updateAttendeeCount() {
        var contacts = this.$.attendeesList.getContacts(),
            num = contacts && contacts.length,
            event = this.event,
            organizer = event && event.organizer,
            ui = this.$,
            labelType;

        if (organizer) {
            var accountUser = enyo.application.calendarsManager.getCalAccountUser(event.calendarId);

            !organizer.name && (organizer.name = organizer.commonName || organizer.email || $L("Unknown Organizer"));	// Initial value may be updated by lookup
            if (organizer.email && organizer.email.toLowerCase() == accountUser.toLowerCase()) {
                labelType = "youOrganizer";
            } else {
                labelType = "withOrganizer";
            }
            ui.attendeesSummary.setContent(this.attendeeLabel[labelType].formatChoice(num, {num: num, organizer: organizer.name}));
        } else {
            labelType = "noOrganizer";
            ui.attendeesSummary.setContent(this.attendeeLabel[labelType].formatChoice(num, {num: num}));
        }

        ui.attendeesSummary.setShowing(true);
    },

    setupAttendeesSummary: function setupAttendeesSummary(event) {
        var attendees = Utilities.getActiveAttendees(event),
            num = attendees && attendees.length,
            organizer = num && event.organizer,
            ui = this.$;

        if (!num || (num === 1 && organizer)) {
            ui.attendeesSummary.setShowing(false);
            return;
        }

        var labelType;

        if (organizer) {
            var accountUser = enyo.application.calendarsManager.getCalAccountUser(event.calendarId);

            !organizer.name && (organizer.name = organizer.commonName || organizer.email || $L("Unknown Organizer"));	// Initial value may be updated by lookup
            if (organizer.email && organizer.email.toLowerCase() == accountUser.toLowerCase()) {
                labelType = "youOrganizer";
            } else {
                labelType = "withOrganizer";
            }
            setTimeout(this.lookupOrganizer, 100);
            ui.attendeesSummary.setContent(this.attendeeLabel[labelType].formatChoice(num, {num: num, organizer: organizer.name}));
        } else {
            labelType = "noOrganizer";
            ui.attendeesSummary.setContent(this.attendeeLabel[labelType].formatChoice(num, {num: num}));
        }

        ui.attendeesSummary.setShowing(true);
    },

    lookupOrganizer: function lookupOrganizer() {

        //TODO: Since the contacts person APIs are asynchronous, we probably need to change how this works.
        //1: If you are in the attendees list, and you tap an attendee and add a contact with a new photo,
        //we don't update our view, and we maybe should.  I don't know if there's something we can listen for to detect that though.
        var organizer = this.event && this.event.organizer;
        try {
            if (organizer && organizer.email) {
                //this.log("Performing an organizer lookup in Detail View.");
                enyo.application.contactsManager.findByEmail(organizer.email, this.lookupOrganizerReady);
            }
        } catch (e) {
            this.log("===:===: Organizer lookup failed: " + e);
        }
    },

    lookupOrganizerReady: function lookupOrganizerReady(person) {
        var event = this.event,
            organizer = event && event.organizer;

        if (person && organizer) {
            var accountUser = enyo.application.calendarsManager.getCalAccountUser(event.calendarId),
                attendees = Utilities.getActiveAttendees(event),
                labelType,
                num = attendees && attendees.length;

            person.displayName
                ? (organizer.name = person.displayName) :

                // Use the commonName, name, or email from the attendee as worst case
                organizer.commonName
                    ? (organizer.name = organizer.commonName) :

                    (!organizer.name) && (organizer.name = organizer.email);


            if (organizer.email && organizer.email.toLowerCase() == accountUser.toLowerCase()) {
                labelType = "youOrganizer";
            } else {
                labelType = "withOrganizer";
            }
            this.$.attendeesSummary.setContent(this.attendeeLabel[labelType].formatChoice(num, {num: num, organizer: organizer.name}));
        }
    },

    setupEditableAttendees: function setupEditableAttendees(event) {
        var attendees = Utilities.getActiveAttendees(event),
            attendeesLength = attendees && attendees.length,
            contacts = [],
            attendee,
            contact;

        for (var i = 0; i < attendeesLength; i++) {
            attendee = attendees[i];
            contact = {displayName: attendee.name || attendee.commonName || attendee.email, value: attendee.email};
            contacts.push(contact);
        }
        this.$.attendeesList.setContacts(contacts);
    },

    // TODO: This handles the simple organizer case only. We need to also check for and preserve delegated organizers.
    editAttendees         : function editAttendees() {

        var event = this.event;

        if (!event) {
            return;
        }

        var contacts = this.$.attendeesList.getContacts(),
            contactsLength = contacts && contacts.length;

        event.activeAttendees = undefined;	// Reset the event's active attendee list
        this.waitForKeyboard = false;		// Reset the waitForKeyboard flag

        if (!contactsLength) {              // If there are no attendees, we reset everything.
            event.attendees = [];
            event.organizer = event.organizerIndex = false;
            this.setupAttendeesSummary(event);
            return;
        }

        var attendee,
            attendees = [],
            organizerSet = false,
            contact,
            contactEmail,
            currentOrganizer = event.organizer,
            organizerEmailLowerCase = currentOrganizer && currentOrganizer.email && currentOrganizer.email.toLowerCase();

        for (var i = 0; i < contactsLength; i++) {
            contact = contacts[i];
            contactEmail = contact.value;	// Cache the email value

            attendee = new CalendarAttendee({
                email           : contactEmail,
                commonName      : (contact.displayName || contact.name),
                role            : "REQ-PARTICIPANT",
                calendarUserType: "INDIVIDUAL"
            });

            // If we encounter the current organizer, re-add the organizer status.
            if (currentOrganizer && !organizerSet && contactEmail && contactEmail.toLowerCase() == organizerEmailLowerCase) {
                attendee.organizer = organizerSet = true;
                event.organizer = attendee;
                event.organizerIndex = 0;
                attendees.splice(0, 0, attendee);
                continue;						// Go to the next iteration since the organizer has been added
            }

            attendees.push(attendee);
        }
        event.attendees = attendees;

        if (!organizerSet) {            // Do something if no organizer was set.
            event.organizer = event.organizerIndex = false;	// We know no organizer exists.

            attendee = new CalendarAttendee({
                email           : enyo.application.calendarsManager.getCalAccountUser(event.calendarId),
                role            : "REQ-PARTICIPANT",
                calendarUserType: "INDIVIDUAL"
            });
            this.promoteAttendee(attendee);	// The active attendee list is generated at
        }
        this.setupAttendeesSummary(event);
        this.toggleDoneButtonText();
    },

    promoteAttendee: function promoteAttendee(attendee) {
        var event = this.event;
        if (!event || !attendee || !attendee.email) {
            return;
        }

        event.activeAttendees = undefined;	// Reset the event's active attendee list

        var organizer = event.organizer,
            emailLowerCase = attendee.email.toLowerCase();
        if (organizer && organizer.email && organizer.email.toLowerCase() == emailLowerCase) {
            return;										// This organizer already is set.
        } else {
            organizer && (organizer.organizer = false);	// Remove the current organizer's organizer status
        }

        var attendeeFound = false,
            attendees = event.attendees,
            num = attendees && attendees.length;
        for (var i = 0; i < num; ++i) {            // Check to see if the attendee is already listed; if so, promote the attendee.
            if (attendees[i].email && attendees[i].email.toLowerCase() == emailLowerCase) {
                event.organizer = attendees[i];
                if (i != 0) {                // We need to place the organizer at the beginning if not already so
                    attendees.splice(0, 0, attendees.splice(i, 1));	// Move the organizer to the beginning of the array
                }
                attendeeFound = true;
                break;
            }
        }

        if (!attendeeFound) {
            attendees.splice(0, 0, attendee);	// Place the organizer at the beginning of the array
            event.organizer = attendee;
        }

        event.organizerIndex = 0;	// Set the organizer's index.
        event.organizer.organizer = true;	// Make sure the new organizer's organizer status is set.

        this.setupEditableAttendees(event); // Rebuild the attendee editor with the change.
    },

    toggleDoneButtonText: function toggleDoneButtonText() {
        var btn = this.$.btnDone,
            event = this.event,
            attendees = Utilities.getActiveAttendees(event),
            hasAttendees = attendees && !!(attendees.length),
            isEditable = Utilities.isEventEditable(event),
            sendable = enyo.application.calendarsManager.isInvitationEnabledCalendar(event.calendarId);

        (hasAttendees && sendable && isEditable) ? btn.setCaption($L("Send")) : btn.setCaption($L("Done"));
    },

    editNote: function editNote(note) {
        this.event.note = note && note.getText();
    },

    confirmSave: function confirmSave() {
        var event = this.event;

        DEBUG && this.log("event: " + JSON.stringify(event));

        if (!event) {
            return false;
        }
        var ui = this.$;
        if (this.pickerStart != event.currentLocalStart || this.pickerEnd != event.currentLocalEnd) {
            var origStartDate = new Date(event.dtstart),
                origEndDate = new Date(event.dtend),
                newStartDate = new Date(this.pickerStart),
                newEndDate = new Date(this.pickerEnd),
                sameStartDate = (origStartDate.getFullYear() === newStartDate.getFullYear()
                    && origStartDate.getMonth() === newStartDate.getMonth()
                    && origStartDate.getDate() === newStartDate.getDate()),
                sameEndDate = (origEndDate.getFullYear() === newEndDate.getFullYear()
                    && origEndDate.getMonth() === newEndDate.getMonth()
                    && origEndDate.getDate() === newEndDate.getDate());
            if (!(sameStartDate && sameEndDate)) {
                //If the date changed on a repeating event, then the picker date/times are the new start of the series.  All previous occurrences are gone.
                event.dtstart = event.renderStartTime = this.pickerStart;
                event.dtend = event.renderEndTime = this.pickerEnd;
            }
            else {
                //If only the time changed on a repeating event, keep the original start/end date, but use the new start/end hour.
                var d1 = new Date(event.dtstart);
                var d2 = new Date(+this.pickerStart);
                var hour = d2.getHours();
                var min = d2.getMinutes();
                d1.setHours(hour);
                d1.setMinutes(min);
                event.dtstart = d1.getTime();

                d1.setTime(event.dtend);
                d2.setTime(+this.pickerEnd);
                hour = d2.getHours();
                min = d2.getMinutes();
                d1.setHours(hour);
                d1.setMinutes(min);
                event.dtend = d1.getTime();
            }
        }

        if (!event.saveAsIs && this.undoEvent && this.undoEvent.isEqualTo(event)) {
            if (this.eventGUI) {                                // If we have the event's GUI when canceling its creation
                ("_id" in event)                                //		and the event has an id
                    ? this.eventGUI.setEvent(this.undoEvent)        //		reset the event's GUI to its original state,
                    : this.eventGUI.destroy();					//		otherwise destroy the event's GUI.
            }
            this.resetEventModels();
            return false;
        }
        if (("_id" in event) && (event.rrule && event.rrule.freq) && (this.undoEvent && this.undoEvent.rrule && this.undoEvent.rrule.freq && this.undoEvent.calendarId === event.calendarId) && !this.event.repeatChanged) {
            ui.repeatChangeDialog.lazy && ui.repeatChangeDialog.validateComponents();

            var parentId = event._id,
                repeatChangeConfirm = ui.repeatChangeConfirm || this.validateView("repeatChangeConfirm");

            repeatChangeConfirm.setInfo({event: event, parentId: parentId});
            ui.repeatChangeDialog.openAtCenter();
            return true;
        }
        this.saveEvent();
        return false;
    },

    prepToSaveEvent: function prepToSaveEvent(inSender, parentId) {
        // This exists because RepeatConfirmDialog needs a method to do save & exit without going through closeView().
        this.saveEvent(parentId);
        this.doExit(this.event);
    },

    resetEventModels: function resetEventModels() {
        this.event = this.undoEvent = this.eventGUI = null;		// Reset the event, "undo" event, and event GUI models.
    },

    saveEvent: function saveEvent(parentId) {
        var event = this.event,
            eventHasId = ("_id" in event);

        DEBUG && this.log("event: " + JSON.stringify(event));

        if (!event || (!event.saveAsIs && this.undoEvent && this.undoEvent.isEqualTo(event))) {
            if (this.eventGUI) {                                // If we have the event's GUI when canceling its creation
                event && eventHasId                                //	and the event has an id
                    ? this.eventGUI.setEvent(this.undoEvent)        //	reset the event's GUI to its original state,
                    : this.eventGUI.destroy();					//	otherwise destroy the event's GUI.
            }
            this.resetEventModels();							// No edits made so reset event models.
            return;
        }

        // TODO: If the event is no longer in the same hour, move its GUI to the right one; if not in the same day, destroy its GUI.

        // if (this.eventGUI) {
        // 	var timeMachine = new Date (this.undoEvent.dtstart)
        // 	,	hourOld		= timeMachine.getHours()
        // 	,	hourNew		= (timeMachine.setTime (this.event.dtstart) , timeMachine.getHours())
        // 	;
        // 	(hourOld != hourNew)
        // 	&&	this.eventGUI && (this.eventGUI.owner.doHourChanged (oldHour)
        // 	:	this.eventGUI && this.eventGUI.eventChanged ();							// Updates the event's GUI with all changes.
        // }

        if (!event.tzId) {
            event.tzId = this.tzId;
        }

        if (eventHasId && (this.undoEvent && this.undoEvent.calendarId !== event.calendarId)) {        // Changing calendar is more important than all other changes.
            this.eventGUI && this.eventGUI.setEvent(event);										// Immediately updates the event's GUI with all changes.
            DEBUG && this.log("===:===: Changing this event's calendar from [" + this.undoEvent.calendarId + "] to [" + event.calendarId + "]\n\n\t: " + JSON.stringify(event) + "\n\t");
            this.dbManager.moveEventToDifferentCalendar(new CalendarEvent(event), this.eventMovedToDifferentCalendar);
            this.resetEventModels();
            return;
        }

        var parentEvent;
        if (parentId) {
            parentEvent = new CalendarEvent(this.undoEvent);					    // Create a parent event using the original event.
            var exceptionDate = new Date(event.currentLocalStart);				    // Create an exception date using the event's local start date.
            Utilities.addException(parentEvent, exceptionDate);					    // Add the exception for this occurrence to the parent event.

            event.parentId = parentId;											    // Set the child event's parent id
            event.recurrenceId = Utilities.getUTCFormatDateString(exceptionDate);   //		and its recurrenceId then
            event.dtstart = this.pickerStart;										// Set this occurrence start time
            event.dtend = this.pickerEnd;										    //      and end time.

            delete event._id;														// Then	remove its id,
            delete event.rrule;														//		remove its rrule,
            delete event.exdates;													//		remove any exdates,
            delete event.remoteId;													//		and remove its id.
        }

        // Update meeting time description
        try {
            event.whenDesc = MeetingTimeFormatter.describeEvent(event);
        } catch (e) {
            this.error("error generating when description: " + e);

            // Clear event description since the old one may be stale
            event.whenDesc = "";
        }
        var isEditable = Utilities.isEventEditable(event),
            sendInvites = enyo.application.calendarsManager.isInvitationEnabledCalendar(event.calendarId);
        if (sendInvites && isEditable) { // TODO: Should we check for existence of attendees here too?
            this.log("===:===: Processing attendees for invitations");
            event.attendees = this.diffAttendees(this.undoEvent.attendees, event.attendees);
            event.notify = true;
            event.status = "CONFIRMED";
        }

        this.eventGUI && this.eventGUI.setEvent(event);								// Immediately updates the event's GUI with all changes.

        var cleanEvent = new CalendarEvent(event), // Sanitize the event before saving it to the DB.
            savedEvent = enyo.bind(this, this.savedEvent, this.eventGUI);				// Keep the event's GUI for updating after async DB save.
        if (parentEvent) {
            DEBUG && this.log("===:===: Saving exception event:\n\n\t" + JSON.stringify(cleanEvent) + "\nFor parent event:\n\n\t" + JSON.stringify(parentEvent) + "\n\t");
            this.dbManager.updateParentAddChild(parentEvent, cleanEvent, savedEvent, this.saveEventFailed);
        } else {
            var modify = eventHasId ? "updateEvent" : "createEvent";
            DEBUG && this.log("===:===: " + modify + ": " + JSON.stringify(cleanEvent));
            this.dbManager [modify](cleanEvent, savedEvent, this.saveEventFailed);		// Updates the database with the new/modified event.
        }
        this.resetEventModels();
    },

    savedEvent: function savedEvent(eventGUI, response) {
        response.responses && (response = response.responses[1]);	// This is handling a batch response.
        if (eventGUI) {
            eventGUI.event._id = response.results[0].id;			// Keep view's event's id in sync with DB's. Allows "new event's" detail view in browser.
            eventGUI.event._rev = response.results[0].rev;			// Keep view's event's rev in sync with DB's.
        }

    },

    saveEventFailed: function saveEventFailed(response) {
        this.error("===:===: Save event failed: " + JSON.stringify(response));
    },

    eventMovedToDifferentCalendar: function eventMovedToDifferentCalendar(newEvent) {
        DEBUG && this.log("=== Event moved to different calendar.");
    },

    /* Used for testing only */
    testWhenDesc                 : function () {
        console.log("generating when desc");

        var filename = "/usr/palm/applications/com.palm.app.calendar/app/shared/MeetingTimeFormatter.js";

        // Reload file
        var source = palmGetResource(filename);
        eval("//@ sourceURL=\"" + filename + "\"\n" + source);

        var text;

        try {
            text = MeetingTimeFormatter.describeEvent(this.event);
        } catch (e) {
            text = e.toString();
        }

        this.$.whenDesc.setContent(text); // debug only; don't need to localize
        this.$.eventJson.setContent(JSON.stringify(this.event));
    },

    diffAttendees: function diffAttendees(oldList, newList) {
        var oldObj = {},
            newObj = {},
            bothObj = {},
            inBoth = [], //notify
            inOld = [], //deleted
            inNew = [], //added
            length,
            a,
            i;

        length = oldList && oldList.length;
        for (i = 0; i < length; i++) {
            a = oldList[i];
            oldObj[a.email.toLowerCase()] = i;
        }

        length = newList && newList.length;
        for (i = 0; i < length; i++) {
            a = newList[i];
            newObj[a.email.toLowerCase()] = i;
        }

        for (a in oldObj) {
            if (oldObj.hasOwnProperty(a) && newObj.hasOwnProperty(a)) {
                inBoth.push(oldList[oldObj[a]]);
                bothObj[a] = true;
            }
            else {
                inOld.push(oldList[oldObj[a]]);
            }
        }

        for (a in newObj) {
            if (newObj.hasOwnProperty(a) && oldObj.hasOwnProperty(a)) {
                if (!bothObj.hasOwnProperty(a)) {
                    inBoth.push(newList[newObj[a]]);
                    bothObj[a] = true;
                }
            }
            else {
                inNew.push(newList[newObj[a]]);
            }
        }
        var attendees = this.markAttendees(inBoth, inOld, inNew);
        return attendees;
    },

    markAttendees: function markAttendees(unchanged, deleted, added) {
        var length = unchanged && unchanged.length,
            i;

        for (i = 0; i < length; i++) {
            unchanged[i].notifyState = "NOTIFY";
        }

        length = deleted && deleted.length;
        for (i = 0; i < length; i++) {
            deleted[i].notifyState = "DELETED";
        }

        length = added && added.length;
        for (i = 0; i < length; i++) {
            added[i].notifyState = "ADDED";
        }

        var attendees = unchanged.concat(deleted, added);
        return attendees;
    }
});
