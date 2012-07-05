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
    name      : "calendar.edit.DeleteConfirm",
    kind      : enyo.VFlexBox,
    className : "calendar-delete-confirm",
    //width		: "375px",
    events    : {
        onDeleted: "",
        onExit   : ""
    },
    published : {
        event: null
    },
    components: [
        {kind: enyo.VFlexBox, name: "repeatDeleteDialog", components: [
            {content: $L("This is a repeating event"), className: "dialog-text"},
            {kind: enyo.VFlexBox, components: [
                {kind: enyo.Button, caption: $L("Delete The Whole Series"), onclick: "deleteSeries", className: "enyo-button-negative"},
                {kind: enyo.Button, caption: $L("Delete This Event Only"), onclick: "deleteSingle", className: "enyo-button-negative"},
                {kind: enyo.Button, caption: $L("Cancel"), onclick: "cancelClicked", className: "enyo-button-light"}
            ]}
        ]},
        {kind: enyo.VFlexBox, name: "simpleDeleteDialog", components: [
            {content: $L("Are you sure you want to delete this event?"), className: "dialog-text"},
            {kind: enyo.HFlexBox, components: [
                {kind: enyo.Button, caption: $L("Cancel"), onclick: "cancelClicked", flex: 1, className: "enyo-button-light"},
                {kind: enyo.Button, caption: $L("Delete"), onclick: "deleteSeries", flex: 1, className: "enyo-button-negative"}

            ]}
        ]},
        {kind: "ApplicationEvents", onWindowHidden: "cancelClicked"}
    ], //end components

    create: function create() {
        this.deletedEvent = enyo.bind(this, this.deletedEvent);
        this.inherited(arguments);
        this.setupOnClose();
        DEBUG && this.log("########## Created.");
    },

    destroy: function destroy() {
        this.inherited(arguments);
        DEBUG && this.log("########## Destroyed.");
    },

    eventChanged: function eventChanged() {
        var event = this.event;
        if (!event) {
            return false;
        }
        event.event && (this.eventGUI = event) && (this.event = event = event.event);

        if ((!event.rrule || !event.rrule.freq) && !event.parentId) {
            DEBUG && this.log("########## Showing a simple DeleteConfirm view.");
            this.$.simpleDeleteDialog.setShowing(true);
            this.$.repeatDeleteDialog.setShowing(false);
        } else {
            DEBUG && this.log("########## Showing a repeat DeleteConfirm view.");
            this.$.simpleDeleteDialog.setShowing(false);
            this.$.repeatDeleteDialog.setShowing(true);
        }
    },

    deleteSeries: function deleteSeries() {
        this.eventGUI && this.eventGUI.destroy();	// Remove the event from the GUI.
        var event = this.event,
            attendees = Utilities.getActiveAttendees(event),
            hasAttendees = attendees && !!(attendees.length),
            isEditable = Utilities.isEventEditable(event),
            sendable = enyo.application.calendarsManager.isInvitationEnabledCalendar(event.calendarId),
            shouldNotify = (hasAttendees && sendable && isEditable && event.status == "CONFIRMED");

        if ("_id" in this.event) {
            DEBUG && this.log("########## Delete everything.")
            //delete parent and children too
            enyo.application.databaseManager.deleteEvent(this.event._id, this.deletedEvent, this.deletedEvent, shouldNotify, this.event.parentId, true);
        }
        else {
            DEBUG && this.log("########## No need to delete the event since there is no event ID.")
            // If event._id == undefined (new event) no need to delete it, the Edit scene just won't save it
            this.deletedEvent({returnValue: true});
        }
        this.exitView();
    },

    deleteSingle: function deleteSingle() {
        this.eventGUI && this.eventGUI.destroy();	// Remove the event from the GUI.
        var event = this.event,
            attendees = Utilities.getActiveAttendees(event),
            hasAttendees = attendees && !!(attendees.length),
            isEditable = Utilities.isEventEditable(event),
            sendable = enyo.application.calendarsManager.isInvitationEnabledCalendar(event.calendarId),
            shouldNotify = (hasAttendees && sendable && isEditable && event.status == "CONFIRMED");

        if (event.rrule && event.rrule.freq) {
            DEBUG && this.log("########## A rrule & rrule frequency is defined.")
            var date = event.currentLocalStart || event.dtstart;
            Utilities.addException(event, new Date(date));

            if (shouldNotify) {    // Only create a child event to mark the deletion if we need to send a notification
                var deletedChild = this.createDeletedChild(date);
                enyo.application.databaseManager.updateParentAddChild(event, deletedChild, this.deletedEvent, this.deletedEvent, true);
            }
            else {
                enyo.application.databaseManager.updateEvent(event, this.deletedEvent, this.deletedEvent);
            }
        }
        else {
            DEBUG && this.log("########## A rrule & rrule frequency isn't defined..")
            enyo.application.databaseManager.deleteEvent(event._id, this.deletedEvent, this.deletedEvent, shouldNotify);
        }
        this.exitView();
    },

    deletedEvent: function deletedEvent(response) {
        if (response.returnValue === true) {
            DEBUG && this.log("########## Deleted event: ", response);
            this.doDeleted(response);
        } else {
            //TODO: ACK, IT FAILED
            DEBUG && this.log("########## Delete event FAILED: ", response);
        }
    },

    cancelClicked: function cancelClicked() {
        DEBUG && this.log("########## Clicked the cancel button in DeleteConfirm view.");
        this.exitView();
    },

    exitView: function exitView() {
        DEBUG && this.log("########## Exit DeleteConfirm view.");
        if (enyo.isFunction(this.container.close)) {
            this.container.close();
        } else {
            this.doExit();
        }
    },

    setupOnClose: function setupOnClose() {
        if (!enyo.isFunction(this.container.doClose)) {
            return;
        }
        var view = this,
            doClose = this.container.doClose;
        this.container.doClose = function closeManager() {  // If the view is contained within a popup or some other container that can be closed, we need to know about those close events
            DEBUG && this.log("########## Hiding DeleteConfirm popup.");
            view.doExit();
            doClose.apply(this, arguments);                     //then run any defined "onClose" handler.
        };
    },

    createDeletedChild: function createDeletedChild(exdate) {
        // TODO: Maybe make a unified utility function for this and edit view
        var event = this.event,
            deletedChild = new CalendarEvent(event),
            exdateString = Utilities.getUTCFormatDateString(new Date(exdate));

        deletedChild.dtstart = event.currentLocalStart;
        deletedChild.dtend = event.currentLocalStart + (event.dtend - event.dtstart);
        deletedChild.parentId = event._id;                                          // Set the child event's parent id
        deletedChild.recurrenceId = exdateString;									//      and its recurrenceId then
        deletedChild._del = true;													//      Mark it deleted
        deletedChild.notify = true;
        deletedChild.status = "CANCELLED";

        delete deletedChild._id;													// Then	remove its id,
        delete deletedChild.rrule;													//		remove its rrule,
        delete deletedChild.exdates;												//		remove any exdates,
        delete deletedChild.remoteId;												//		and remove its remoteId.

        try {
            deletedChild.whenDesc = MeetingTimeFormatter.describeEvent(deletedChild);
        } catch (e) {
            this.error("error generating when description: " + e);
            // Clear event description since the old one may be stale
            deletedChild.whenDesc = "";
        }

        return deletedChild;
    }
});
