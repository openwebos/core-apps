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
    name: "MeetingInfo",
    kind: "LazyControl",

    published: {
        meetingInfo: null,
        allowResponse: false,
        showPrompt: false
    },

    events: {
        onRemoveFromCalendarClick: "",
        onResponseClick: ""
    },

    components: [
        {name: "meetingInfo", wantsEvents: true, kind: "Control", components: [
            {style: "display:inline-block;", components: [
                {name: "meetingInfoHeader", kind: "HFlexBox", className: "mail-body-meeting-invite", components: [
                    {kind: "Image", style: "margin:-4px 0;", src: "../images/email-invite-event.png"},
                    {kind: "VFlexBox", components: [
                        {name: "meetingInfoText", style: "font-size:16px; font-weight:bold; padding: 9px 0px 0px 0px;"},
                        {name: "meetingInfoLocationText", style: "font-size:16px; font-weight:bold;"}
                    ]}
                ]},
                {name: "meetingInfoConflictText", style: "color: red;margin:0 14px;", content: $L("Conflicts with another event")}
            ]},
            {name: "meetingButtons", style: "display:inline-block;margin:0 11px 4px 11px;", components: [
                {name: "removeFromCalendar", showing: false, kind: "Button", className: "enyo-button-negative", caption: $L("Remove From Calendar"), onclick: "removeFromCalendarClick"},
                {name: "requestButtons", kind: "HFlexBox", width: "300px", components: [
                    {kind: "CustomButton", className: "enyo-button enyo-button-affirmative", caption: $L("Accept"), width: "77px", onclick: "acceptClick", components: [
                        {kind: "Control", className: "accept-icon"}
                    ]},
                    {kind: "CustomButton", className: "enyo-button enyo-button-dark", caption: $L("Maybe"), width: "77px", onclick: "tentativeClick", components: [
                        {kind: "Control", className: "maybe-icon"}
                    ]},
                    {kind: "CustomButton", className: "enyo-button enyo-button-negative", width: "77px", align: "center", onclick: "declineClick", components: [
                        {kind: "Control", className: "decline-icon"}
                    ]}
                ]}
            ]}
        ]}
    ],

    create: function () {
        this.inherited(arguments);

        this.startTimeFormatter = new enyo.g11n.DateFmt({date: 'long', time: 'short', dateComponents: 'dm', weekday: 'medium'});
        this.endTimeFormatter = new enyo.g11n.DateFmt({time: 'short'});
    },

    meetingInfoChanged: function () {
        var meetingInfo = this.meetingInfo;

        if (this.lazy && !meetingInfo) {
            return;
        }

        // Create components to display
        this.validateComponents();

        // Always update and show time and location
        var startDate = new Date(meetingInfo.startTime);
        var endDate = new Date(meetingInfo.endTime);

        var startTime = this.startTimeFormatter.format(startDate);
        var endTime;
        if (startDate.getDate() === endDate.getDate()) {
            endTime = this.endTimeFormatter.format(endDate);
        } else {
            endTime = this.startTimeFormatter.format(endDate);
        }

        // FIXME Need to handle recurrences, multiple days, etc!
        var timeFormat = new enyo.g11n.Template($L("#{startTime} - #{endTime}"));
        this.$.meetingInfoText.setContent(timeFormat.evaluate({startTime: startTime, endTime: endTime}));
        this.$.meetingInfo.setShowing(true);

        if (meetingInfo.location) {
            this.$.meetingInfoLocationText.setContent(meetingInfo.location);
        }

        // Hide conflict text by default to make sure it doesn't show unless there's a conflict
        // TODO: get conflict info from calendar so it works across all accounts instead of EAS only
        this.$.meetingInfoConflictText.setShowing(false);

        if (meetingInfo.type === Email.kMeetingRequest) {
            this.$.removeFromCalendar.setShowing(false);
            this.$.requestButtons.setShowing(true);

            if (meetingInfo.busyStatus === Email.kBusyStatusBusy) {
                this.$.meetingInfoConflictText.setShowing(true);
            }
        } else if (meetingInfo.type === Email.kMeetingCancellation) {
            this.$.requestButtons.setShowing(false);
            this.$.removeFromCalendar.setShowing(true);
        } else {
            this.$.requestButtons.setShowing(false);
            this.$.removeFromCalendar.setShowing(false);
        }
    },

    allowResponseChanged: function () {
        if (this.lazy) {
            return;
        }

        this.validateComponents();
        this.$.meetingButtons.setShowing(this.allowResponse);
    },

    acceptClick: function () {
        return this.handleResponseClick(Email.kAcceptResponse);
    },

    tentativeClick: function () {
        return this.handleResponseClick(Email.kTentativeResponse);
    },

    declineClick: function () {
        return this.handleResponseClick(Email.kDeclineResponse);
    },

    handleResponseClick: function (responseType) {
        if (this.showPrompt) {
            MeetingResponseDialog.displayPrompt(this, {responseType: responseType, onSendResponse: "doResponseClick"});
        } else {
            this.doResponseClick(responseType, true);
        }

        return true;
    },

    removeFromCalendarClick: function () {
        return this.handleResponseClick(Email.kRemoveResponse);
    },

    /* [public]
     * Updates the calendar and optionally sends a response to the organizer
     *
     * responseType: type of response (Email.kAcceptResponse, etc)
     * sendEmailToOrganizer: whether to send a response email to the organizer
     * responseText: optional text to send to the organizer (not implemented)
     */
    sendMeetingResponse: function (email, responseType, sendEmailToOrganizer, responseText) {
        var format = "";

        switch (responseType) {
        case Email.kAcceptResponse:
            format = Email.kInviteSubjectAcceptedFormat;
            break;
        case Email.kTentativeResponse:
            format = Email.kInviteSubjectTentativeFormat;
            break;
        case Email.kDeclineResponse:
            format = Email.kInviteSubjectDeclinedFormat;
            break;
        case Email.kRemoveResponse:
            break;
        default:
            responseType = undefined;
            break;
        }

        var id = email.getId();
        var subject = "";

        if (format) {
            var template = new enyo.g11n.Template(format);
            subject = template.evaluate({subject: email.getSubject() || $L("No Subject")});
        }

        var toSave = {
            "meetingInfo": {
                "response": responseType,
                "responseSubject": subject
            },
            flags: {
                visible: false
            }
        };

        Email.updateEmailProps({id: id}, toSave);

        this.log("updating email with meeting response");

        if (responseType === Email.kRemoveResponse) {
            enyo.application.dashboardManager.generalNotification($L("Removing from calendar"));
        } else {
            enyo.application.dashboardManager.generalNotification($L("Sending invitation response"));
        }
    }
});

enyo.kind({
    name: "MeetingResponseDialog",
    kind: "MailDialog",

    className: "enyo-popup enyo-modaldialog mail-wide-dialog",

    events: {
        onSendResponse: "",
        onCancel: ""
    },

    published: {
        responseType: ""
    },

    components: [
        {name: "message", content: "", className: "palm-subtext palm-paragraph"},
        {name: "responseText", kind: "RichText", alwaysLooksFocused: true, hint: $L("Optional response text [not implemented] ...")},
        {kind: "VFlexBox", components: [
            {name: "sendResponseButton", kind: "Button", flex: 1, onclick: "sendResponseClick", className: "enyo-button", caption: $L("Send response")},
            {name: "sendButton", kind: "Button", flex: 1, onclick: "skipResponseClick", className: "enyo-button", caption: $L("Skip response [not implemented]"), disabled: true},
            {name: "cancelButton", kind: "Button", flex: 1, onclick: "cancelClick", caption: $L("Cancel")}
        ]}
    ],

    statics: {
        displayPrompt: function (owner, params) {
            MailDialog._displayMailDialog(owner, this, params);
        }
    },

    create: function () {
        this.inherited(arguments);
    },

    componentsReady: function () {
        var text = "";

        if (this.responseType === Email.kAcceptResponse) {
            text = $L("Send accept response to meeting organizer?");
            className = "enyo-button-affirmative";
        } else if (this.responseType === Email.kTentativeResponse) {
            text = $L("Send tentative response to meeting organizer?");
            className = "enyo-button-gray";
        } else if (this.responseType === Email.kDeclineResponse) {
            text = $L("Send decline response to meeting organizer?");
            className = "enyo-button-negative";
        }

        this.$.message.setContent(text);
        this.$.sendResponseButton.addClass(className);
    },

    sendResponseClick: function () {
        // NOTE: response text handling not yet implemented on transport side
        this.doSendResponse(this.responseType, true, this.$.responseText.getValue());
        this.close();
    },

    skipResponseClick: function () {
        // NOTE: not yet implemented on transport side
        this.doSendResponse(this.responseType, false);
    },

    cancelClick: function () {
        this.doCancel();
        this.close();
    }
});