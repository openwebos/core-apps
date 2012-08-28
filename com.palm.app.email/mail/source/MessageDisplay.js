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

/**
 Display one complete email, including headers.
 // NOTE, this is really bizarre, because it expects a subkind to be its owner....
 // effectively an abstract class, but concerns aren't nicely separated at this point.
 // works entirely on properties belonging to the subkind
 Does not manage any loading. Instead, expects this.loader to be an owner or a "this" that we are mixed into. loader must define:
 loadMessage, retryDownload, retryBodyLoad.
 Here we do not depend on a separate "message" property.
 Currently expects this.email to be set by someone else (e.g., the loader).
 Requires several things to be in owner, including: updateMenu.
 */

enyo.kind({
    name: "MessageDisplay",
    kind: enyo.Control, flex: 1,
    style: "overflow: hidden; position: relative;",
    className: "sexyfresh-dough",
    components: [
        // email header

        // Email Body Content starts here
        // this sauce is weak. So weak.
        /*((window.fauxMail || !window.PalmSystem) ?
            // FAKE webview
        {name: "body", kind: "Control", nodeTag: "pre", flex: 1, className: "mail-body", resize: function () {
        },
            style: "background-color: white; padding:0px 16px 0px 16px; white-space: pre-wrap;"
        } : // OR
            // REAL webview
        {name: "body", kind: "WebView", flex: 1, style: "width: 100%; height: 100%; background-color: white;", onScrolledTo: "bodyScrolled",
            onUrlRedirected: "openLink", onMousehold: "webviewMousehold", className: "mail-body", enableJavascript: false, ignoreMetaTags: true,
            blockPopups: true, acceptCookies: false, autoFit: false, fitRender: true, onError: "webviewError", onDisconnected: "webviewDisconnected",
            onAlertDialog: "alertDialogHandler", onConfirmDialog: "confirmDialogHandler", onPromptDialog: "promptDialogHandler",
            onSSLConfirmDialog: "SSLConfirmDialogHandler"
        }
            ),*/
        
        // This goes second, even though it is displayed first, in order to float over the webview
        {kind:"Scroller", flex:1, style:"height:1000px;", components:[
        {name: "mailHeaderUnit", components: [
            {name: "header", className: "body-header", components: [
                {name: "bodyStamp", className: "body-stamp", components: [
                    {className: "mini-priority-box", components: [
                        {className: "mini-priority-text", content: $L("priority")},
                        {className: "mini-priority-image", kind: "Image", src: "../images/mini_priority_stamp_overlay.png"}
                    ]}
                ]},
                {name: "senderInfoBlock", kind: "Control", className: "enyo-item first dotted-bottom", style: "position:relative;z-index:2;min-height: 46px; padding: 13px 14px 14px 11px", components: [
                    {kind: "VFlexBox", flex: 1, pack: "center", className: "mail-body-from-box", onclick: "showFromContactDetails", components: [
                        {kind: "HFlexBox", components: [
                            {name: "avatarBox", showing: true, width: "121px", height: "121px", className: "avatar-image-box", components: [
                                {kind: "Image", name: "avatarImage", width: "105px", height: "105px", style: "padding:8px;", src: this.DEFAULT_SENDER_IMAGE}
                            ]},
                            {kind: "VFlexBox", flex: 1, pack: "bottom", components: [
                                {kind: "HFlexBox", flex: 1, pack: "bottom", components: [
                                    {flex: 1, showing: true, components: [/* Alternate location for onlineStatus */ ]},
                                    {kind: "Control", className: "time-box", components: [
                                        {name: "whenMonth", className: "mail-when-month"},
                                        {name: "whenDay", className: "mail-when-day"},
                                        {name: "whenTime", className: "mail-when-time"}
                                    ]}
                                ]},
                                {kind: "HFlexBox", flex: 1, style: "padding-top:16px", components: [
                                    {kind: "VFlexBox", pack: "center", flex: 0, components: [
                                        {name: "onlineStatus", showing: false, style: "padding:18px 0px 0px 0px;", kind: "Image", src: ""}
                                    ]},
                                    {name: "from", className: "mail-body-from", content: "&nbsp;", flex: 1}
                                ]}
                            ]}
                        ]}
                    ]}
                ]},
                {name: "toItem", layoutKind: "HFlexLayout", style: "position:relative;z-index:2;min-height: 50px; padding: 4px 14px 4px 14px", kind: "Item", className: "dotted-bottom", showing: false, onclick: "toggleRecipients", components: [
                    {name: "to", kind: "", flex: 1, allowHtml: true, className: "mail-body-recipients"},
                    {name: "ccBccButton", showing: true, kind: "Button", className: "enyo-button-light", width: "14px", height: "20px", style: "", components: [
                        {kind: "Image", style: "margin:  -6px 0px 0px -11px;", src: "../images/drawer_arrow.png"}
                    ]}
                ]},
                // if changing max-height, update value in this.resize as well
                {name: "recipients", style: "background-color:#EEEEEE; font-size: 16px", kind: "Drawer", open: false, onOpenChanged: "resize", onOpenAnimationComplete: "resize", components: [
                    {name: "recipientsScroll", kind: "BasicFadeScroller", autoVertical: true, vertical: false, style: "max-height:300px;", onclick: "holdyClick", components: [
                        {name: "recipientsList", className: "dotted-bottom", style: "padding: 0px 0px 0 10px;", kind: "VirtualRepeater", onSetupRow: "getRecipients", components: [
                            {name: "recipientDivider", kind: "Divider", showing: false},
                            {name: "recipientItem", kind: "Item", onclick: "showRecipientContactDetails", style: "font-size: 16px"}
                        ]}
                    ]}
                ]},
                {kind: "HFlexBox", name: "subjectBox", align: "center", className: "mail-body-subject", components: [
                    {name: "subjectLabel", className: "mail-body-subject-label", content: $L("Subject:")},
                    {name: "subject", flex: 1, width: 0, allowHtml: true, onPrevious: "doPrevious", style: 'line-height:22px', onNext: "doNext"}
                ]},
                {name: "attachments", style: "", kind: "AttachmentsDrawer", collapsible: true, onInlineDownloaded: "_loadMessage", onOpenAnimationComplete: "resize"},

                /* TODO meetingInfo needs to be styled appropriately:
                 /		 -- 2 lines for 2-3 panes, 1 line for 1 pane
                 /		 -- text should be right size
                 /		 -- we need to use the right glyphs
                 /		 -- VFlexBox shouldn't have a hardcoded height
                 */
                {name: "meetingInfo", style: "border-bottom: 1px solid rgba(0, 0, 0, 0.199219);", kind: "Control", showing: false, components: [
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
                            {kind: "CustomButton", className: "enyo-button enyo-button-affirmative", caption: $L("Accept"), width: "77px", onclick: "acceptMeetingInviteClick", components: [
                                {kind: "Control", className: "accept-icon"}
                            ]},
                            {kind: "CustomButton", className: "enyo-button enyo-button-dark", caption: $L("Maybe"), width: "77px", onclick: "tentativeMeetingInviteClick", components: [
                                {kind: "Control", className: "maybe-icon"}
                            ]},
                            {kind: "CustomButton", className: "enyo-button enyo-button-negative", width: "77px", align: "center", onclick: "declineMeetingInviteClick", components: [
                                {kind: "Control", className: "decline-icon"}
                            ]}
                        ]}
                    ]}
                ]}
            ]},
            // end email header
            {name: "body", kind: "DivHtmlView", showing: true, onViewReady: "viewReady", onLinkClick: "openLink"}, 
            {name: "messageErrors", kind: "Pane", showing: false, flex: 1, components: [
                {name: "downloadError", className: "body-placeholder", style: "text-align: center; background:white;", pack: "center", kind: "VFlexBox", components: [
                    {kind: "Image", src: "../images/list-error.png"},
                    {className: "mail-back", style: "line-height: 50px", content: $L("An error occurred downloading this message")},
                    {kind: "Button", caption: $L("Reload"), onclick: "_retryDownload"}
                ]},
                {name: "downloadWait", className: "body-placeholder", style: "text-align: center;background:white;", align: "center", kind: "VFlexBox", components: [
                    {flex: 1},
                    {kind: "HFlexBox", pack: "center", components: [
                        {name: "downloadSpinner", kind: "Spinner"}
                    ]},
                    {className: "mail-back", content: $L("Retrieving email text..."), style: "font-size:16px;line-height: 50px;"},
                    {flex: 1}
                ]}
            ]}
        ]}, // end mail header unit
        ]},
        {name: "appMgrOpen", method: "open", kind: "enyo.PalmService", service: enyo.palmServices.application},
        {name: "pseudoDetails", kind: "com.palm.library.contactsui.detailsDialog", onCancelClicked: "closePseudoDetails"},
        {name: "webviewContextMenu", kind: "PopupSelect", onSelect: "webviewContextMenuSelect"}
    ],

    holdyClick: function (sender, event) {
        event.preventDefault(); // prevent this from reaching the webview
    },
    create: function () {
        this.recipients = [];
        this.presenceWatches = {};
        this.setUpTimeFormatter();
        this.inherited(arguments);
    },

    resetHeaderPosition: function () {
        var header = this.$.mailHeaderUnit;
        if (header.hasNode()) {
            header.domStyles.webkitTransform = "";
            header.node.style.webkitTransform = "";
        }

    },
    setUpTimeFormatter: function () {
        var DateFmt = enyo.g11n.DateFmt;
        this.whenFormatter = new DateFmt({date: 'long', time: 'short', dateComponents: 'dm'});
        this.dateFormatter = new DateFmt({date: 'long', time: 'short'});
        // actual actual
        this.monthFormatter = new DateFmt({ date: 'MMMM' });
        this.timeFormatter = new DateFmt({ time: 'short' });
        this.whenDayFormatter = new DateFmt({date: 'short', dateComponents: 'd'});

        this.meetingInviteStartTimeFormatter = new DateFmt({date: 'long', time: 'short', dateComponents: 'dm', weekday: 'medium'});
        this.meetingInviteEndTimeFormatter = new DateFmt({time: 'short'});

        // below is what we want the start/end times to look like
        // this.meetingInviteStartTimeFormatter = new enyo.g11n.DateFmt({date: 'EEE. MMM d;', time: 'h:mm a'});
        // this.meetingInviteEndTimeFormatter = new enyo.g11n.DateFmt({date: '', time: 'h:mm a'});
    },
    _loadMessage: function () {
        console.log("### does this ever get called?");
        this.loader.loadMessage();
    },
    _retryDownload: function () {
        this.loader.retryDownload();
    },
    callBody: function (inMethod, inArgs) {
        if (window.PalmSystem) {
            var v = this.$.body;
            if (v[inMethod]) {
                v[inMethod].apply(v, inArgs);
            } else {
                v.callBrowserAdapter(inMethod, inArgs);
            }
        }
    },

    bodyScrolled: function (sender, x, y) {
        var header = this.$.mailHeaderUnit;
        if (header.hasNode()) {
            header.domStyles.webkitTransform = "translateY(" + y + "px)";
            header.node.style.webkitTransform = "translateY(" + y + "px)";
        }
    },
    openLink: function (inSender, url) {
        // TODO remove this logging
        //this.log("### Opening URL", url);

        // Launch default app for handling this url
        this.$.appMgrOpen.call({target: url, subscribe: false});
    },
    webviewMousehold: function (inSender, event, tapInfo) {
        //console.log("@@@@@@@@ MOUSE HOLD @@@@@@@@@@@");

        if (tapInfo.isLink || tapInfo.isImage) {
            var tapPosition = {left: event.pageX, top: event.pageY};

            this.webviewTapInfo = tapInfo;
            this.webviewTapInfo.tapPosition = tapPosition;

            var items = [];

            if (tapInfo.isLink) {
                items.push({caption: $L("Open Link"), value: "webviewOpenLink"});
                items.push({caption: $L("Copy URL"), value: "webviewCopyUrl"});
            }

            if (tapInfo.isImage) {
                items.push({caption: $L("Copy To Photos"), value: "webviewCopyImage"});
            }

            this.$.webviewContextMenu.setItems(items);
            this.$.webviewContextMenu.openAtControl(this.$.body, {left: event.pageX, top: event.pageY});
            return true;
        }
    },

    webviewContextMenuSelect: function (inSender, selected) {
        var action = selected.getValue();
        var tapInfo = this.webviewTapInfo;
        this.webviewTapInfo = null;

        if (this[action]) {
            this[action](tapInfo);
        }
    },

    webviewOpenLink: function (tapInfo) {
        if (tapInfo.linkUrl) {
            this.$.appMgrOpen.call({target: tapInfo.linkUrl});
        }
    },

    webviewCopyUrl: function (tapInfo) {
        enyo.dom.setClipboard(tapInfo.linkUrl);
        enyo.application.dashboardManager.generalNotification($L("Link Copied to clipboard"));
    },

    webviewCopyImage: function (tapInfo) {
        // FIXME: ideally webview would have a method for this instead of poking at the adapter
        this.callBody("saveImageAtPoint", [tapInfo.tapPosition.left, tapInfo.tapPosition.top, "/media/internal/downloads",
                                           enyo.hitch(this, "webviewCopyDone")]);
    },

    webviewCopyDone: function () {
        enyo.application.dashboardManager.generalNotification($L("Image was copied to Photos"));
    },
    webviewError: function (sender, errorCode, errorMsg) {
        console.error("WebView error " + errorCode + ": " + errorMsg);
        if (errorCode === 404 || errorCode === 1000) {
            window.clearTimeout(this.disconnectRetryTimeoutID);
            this.loader.retryBodyLoad(errorMsg);
        }
    },

    webviewDisconnected: function (sender, requested) {
        if (requested) {
            return;
        }
        // Because of the automatic crash recovery in the webview widget, and because our email body temp files are
        // deleted as soon as they are read, we may get a 404 "file not found" error whether or not we retry here.
        // If we retry both here and in webviewError() in response to 404, then we end up retrying twice for a crash.
        // So, we set a 2s timeout for this retry, and clear the timeout in the case where we receive the 404 error.
        console.error("Unexpected WebView disconnect.  WebView should retry automatically, and we'll handle a 404-file-not-found error");
        this.disconnectRetryTimeoutID = window.setTimeout(this.loader.retryBodyLoad.bind(this.loader, "Unexpected webview disconnect"), 8000); // 5-sec timeout in webview before it reconnects. Sorry.

    },
    alertDialogHandler: function () {
        this.$.body.cancelDialog();
    },

    confirmDialogHandler: function () {
        this.$.body.cancelDialog();
    },

    promptDialogHandler: function () {
        this.$.body.cancelDialog();
    },

    SSLConfirmDialogHandler: function () {
        this.$.body.cancelDialog();
    },
    toggleRecipients: function () {
        this.$.recipients.toggleOpen();

        this.$.to.addRemoveClass("expanded", !this.$.recipients.open);
        if (!this.$.recipients.open) {
            this.$.to.setContent(this.makeRecipientsSummary());
        } else {
            var numRecips = this.recipients.length;
            var temp = new enyo.g11n.Template($L("1#1 RECIPIENT|1>##{num} RECIPIENTS"));
            var formatted = temp.formatChoice(numRecips, {num: numRecips});

            this.$.to.setContent(formatted);
        }
        var scroller = this.$.recipientsScroll;

        this.owner.updateMenu(this);
    },
    _lastType: "",
    getRecipients: function (inSender, inIndex) {
        var r = this.recipients[inIndex];
        if (r) {
            this.$.recipientItem.setContent(r.name || r.addr);
            var c = this._lastType;
            var s = c !== r.type;
            this.$.recipientDivider.setShowing(s);
            if (s) {
                this.$.recipientDivider.setCaption(this.recipientTable[r.type]);
            }
            var noDividerAfter = r.type !== (this.recipients[inIndex + 1] || 0).type || inIndex === this.recipients.length - 1;
            this.$.recipientItem.domStyles["border-top"] = inIndex === 0 || s ? "none" : null;
            this.$.recipientItem.domStyles["border-bottom"] = noDividerAfter ? "none" : null;
            this._lastType = r.type;
            return true;
        } else {
            this.$.recipientDivider.setCaption("");
            this._lastType = "";
        }
    },
    showRecipientContactDetails: function (clicked) {
        var recipients = this.email.data.to;
        var nameOrAddr = clicked.content;

        for (var i = 0; i < recipients.length; i++) {
            if (nameOrAddr === recipients[i].addr || nameOrAddr === recipients[i].name) {
                this.showPseudoDetails(recipients[i]);
                return;
            }
        }
    },
    showFromContactDetails: function () {
        this.showPseudoDetails(this.email.data.from);
    },

    makeRecipientTag: function (inCaption) {
        return '<div class="mail-body-recipients-caption">' + inCaption + "</div>";
    },
    recipientTable: {
        to: $L("To"),
        cc: $L("Cc"),
        bcc: $L("Bcc")
    },
    makeRecipientsSummary: function () {
        var o = "";
        for (var i = 0, t = "", nt, r; !!(r = this.recipients[i]); i++) {
            if (r.type === "to" || r.type === "cc") {
                nt = r.type != t;
                if (nt) {
                    var caption = EmailApp.Util.interpolate($L("#{hdr}:"), {hdr: this.recipientTable[r.type || "to"]});
                    o += this.makeRecipientTag(caption);
                } else if (i <= this.recipients.length - 1) {
                    o += $L({key: "recipientdivider", value: ", "});
                }
                o += '<div class="mail-body-recipients-person">';
                o += enyo.string.escapeHtml(r.name || r.addr);
                o += "</div>";
                t = r.type;
            }
        }
        return o;
    },

    initPseudoDetails: function () {
        this.$.pseudoDetails.validateComponents();
    },

    showPseudoDetails: function (contactDetails) {
        this.initPseudoDetails();

        var thisInstance = this;
        EmailApp.Util.onDevice() && ContactsLib.Person.findByEmail(contactDetails.addr).then(function (fut) {
            if (fut.result) {
                thisInstance.showPseudoDetailsForExistingContact(fut.result);
            } else {
                thisInstance.showPseudoDetailsForNewContact(contactDetails);
            }
        });
    },
    showPseudoDetailsForExistingContact: function (contactDetails) {
        this.$.pseudoDetails.setPersonId(contactDetails.getId());
        this.$.pseudoDetails.openAtCenter();
    },

    showPseudoDetailsForNewContact: function (contactDetails) {
        var contact = ContactsLib.ContactFactory.createContactDisplay();
        var name = new enyo.g11n.Name(contactDetails.name);

        var contactName = contact.getName();
        contactName.setGivenName(name.givenName);
        contactName.setFamilyName(name.familyName);
        contact.getEmails().add(new ContactsLib.EmailAddress({value: contactDetails.addr}));

        this.$.pseudoDetails.setContact(contact);
        this.$.pseudoDetails.openAtCenter();
    },

    closePseudoDetails: function () {
        this.$.pseudoDetails.close();
    },

    acceptMeetingInviteClick: function () {
        this._sendMeetingResponse(Email.kAcceptResponse);
    },

    tentativeMeetingInviteClick: function () {
        this._sendMeetingResponse(Email.kTentativeResponse);
    },

    declineMeetingInviteClick: function () {
        this._sendMeetingResponse(Email.kDeclineResponse);
    },

    removeFromCalendarClick: function () {
        this._sendMeetingResponse(Email.kRemoveResponse);
    },

    _sendMeetingResponse: function (response) {
        var subject = subject;
        var format = "";

        switch (response) {
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
            response = undefined;
            break;
        }

        var id = this.email.getId();
        var subject = "";

        if (format) {
            var template = new enyo.g11n.Template(format);
            subject = template.evaluate({subject: this.email.getSubject() || $L("No Subject")});
        }

        var toSave = {
            "meetingInfo": {
                "response": response,
                "responseSubject": subject
            },
            flags: {
                visible: false
            }
        };

        Email.updateEmailProps({id: id}, toSave);

        this.log("updating email with meeting response");

        if (response === Email.kRemoveResponse) {
            enyo.application.dashboardManager.generalNotification($L("Removing from calendar"));
        } else {
            enyo.application.dashboardManager.generalNotification($L("Sending invitation response"));
        }
    },
    displayMeetingInvite: function () {
        var meetingInfo = this.email.data.meetingInfo;

        // Always update and show time and location
        var startDate = new Date(meetingInfo.startTime);
        var endDate = new Date(meetingInfo.endTime);

        var startTime = this.meetingInviteStartTimeFormatter.format(startDate);
        var endTime;
        if (startDate.getDate() === endDate.getDate()) {
            endTime = this.meetingInviteEndTimeFormatter.format(endDate);
        } else {
            endTime = this.meetingInviteStartTimeFormatter.format(endDate);
        }

        // FIXME Need to handle recurrences, multiple days, etc!
        var timeFormat = new enyo.g11n.Template($L("#{startTime} - #{endTime}"));
        this.$.meetingInfoText.setContent(timeFormat.evaluate({startTime: startTime, endTime: endTime}));
        this.$.meetingInfo.setShowing(true);

        if (meetingInfo.location) {
            this.$.meetingInfoLocationText.setContent(meetingInfo.location);
        }

        // Hide conflict text by default to make sure it doesn't show unless there's a conflict
        this.$.meetingInfoConflictText.setShowing(false);

        // hide acceptance/removal controls for meetings created by the user
        var account = enyo.application.accounts.getAccount(this.email.getAccountId());
        if (account.getEmailAddress().toLowerCase() === this.email.getSenderAddress().toLowerCase()) {
            this.$.meetingButtons.setShowing(false);
            return;
        } else {
            this.$.meetingButtons.setShowing(true);
        }


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

    updateMeeting: function () {
        // handle displaying meetingInvite
        if (this.email.data.meetingInfo) {
            this.displayMeetingInvite();
        } else {
            this.$.meetingInfo.setShowing(false);
        }

    },
    setPriority: function (isPriority) {
        this.$.bodyStamp.addRemoveClass("priority-stamp", isPriority);
    },
    setFlagged: function (isFlagged) {
        this.$.bodyStamp.addRemoveClass("flagged-stamp", isFlagged); // keep stamp in sync with flagged button.
    },

    _updateHeaderWithDate: function (date) {
        this.$.whenMonth.setContent(this.monthFormatter.format(date));
        this.$.whenDay.setContent(this.whenDayFormatter.format(date));
        this.$.whenTime.setContent(this.timeFormatter.format(date));
    },
    tryUpdateHeaderTime: function () {
        if (this.email) {
            var date = new Date(this.email.data.timestamp);
            // Ugh. Recreate timeFormatters so that we notice 12/24 hour changes.
            // See MailApp.windowActivatedHandler.
            this.setUpTimeFormatter();
            this._updateHeaderWithDate(date);
            this.updateMeeting();
        }
    },
    headersFromEmail: function (email) {
        var emailData = email.data;
        //this.$.from.setContent(emailData.from.name || emailData.from.addr);

        var date = new Date(emailData.timestamp);
        this._updateHeaderWithDate(date);

        this.setPriority(emailData.priority === "high");

        var subjectHtml = enyo.string.escapeHtml(email.getSubject() || $L("No Subject"));
        subjectHtml = enyo.string.runTextIndexer(subjectHtml); // linkify urls and phone numbers
        this.$.subject.setContent(subjectHtml); // must be escaped

        this.$.recipients.setOpen(false);
        this.recipients = email.getRecipients();
        this.recipients.sort(function compare(a, b) {
            if (a.type === 'to') {
                if (b.type !== 'to') {
                    return -1;
                } else if (a.type === 'cc') {
                    if (b.type === 'to') {
                        return 1;
                    } else if (b.type === 'bcc') {
                        return -1;
                    }
                } else {
                    if (b.type != 'bcc') {
                        return 1;
                    }
                }
            }
            return 0;
        });
        this.$.toItem.setShowing(this.recipients.length);
        this.$.to.setContent(this.makeRecipientsSummary());
        this.$.recipientsList.renderContent();

        this.$.attachments.setEmail(email);
    },

    setBody: function (email, isQuoting) {
        /*if (this.$.body.setHTML) { // i.e., a real WebView, which we use onDevice
            var body = email.getBodyPart();
            var html = this._buildMessageHTML(body.path, body.mimeType, isQuoting);
            
            //this.$.body.setHTML("file:///email-local-content.html", html);
            this.resize();
        } else {
            this.$.body.setContent(email.data.summary);

        }*/
    	var body = email.getBodyPart();
    	this.$.body.loadUrl("file://" + body.path, body.mimeType);
    	
    },
    _buildMessageHTML: function (path, mimeType, replyOrForward) {

        var cidMap = {};
        var parts;

        // Since this call is deferred, the message might actually be cleared by now.
        if (!this.email) {
            return "<html><head></head><body></body></html>";
        }

        // Build a mapping of contentIds -> attachment paths.
        // This is used to fix up embedded img elements to refer to the actual image files on disk.
        parts = this.email.getParts();
        if (parts) {
            parts.forEach(function (p) {
                if (p.contentId && (p.type === 'attachment' || p.type === 'inline')) {
                    cidMap["cid:" + p.contentId] = p.path || "";
                }
            });
        }

        // Build to and cc list
        var moreTo = 0, moreCc = 0;
        var toList = "", ccList = "";
        for (var i = 0, r; !!(r = this.recipients[i]); i++) {
            if (!r.type || r.type === "to") {
                if (toList.length > 0) {
                    toList += "; ";
                }
                if (toList.length + ccList.length <= 2048) {
                    toList += r.name || r.addr;
                } else {
                    moreTo++;
                }
            }
            else if (r.type === "cc") {
                if (ccList.length > 0) {
                    ccList += "; ";
                }
                if (toList.length + ccList.length <= 2048) {
                    ccList += r.name || r.addr;
                } else {
                    moreCc++;
                }
            }
        }
        if (moreTo) {
            toList += "; (" + moreTo + " more)";

        }
        if (moreCc) {
            ccList += "; (" + moreCc + " more)";
        }


        var headPrefix = [
            '<style type="text/css">',
            '@media screen {.print-content {display:none;}}',
            '@media print {.print-content {display:block;} body {font-family:prelude; font-weight:normal; font-size:9pt, line-height:11pt;}}',
            '</style>'
        ];

        var ccRow = '';
        if (ccList) {
            ccRow = '<tr><td>' + $L("Cc: ") + ccList + '</td></tr>';
        }

        var bodyPrefix = [
            '<div class="print-content">',
            '<table width="100%" style="border-bottom: 1pt solid black; font-family:prelude; font-weight:normal; font-size:9pt; line-height:18pt;">',
            '<tr><td>', $L("From: "), enyo.string.escapeHtml(this.email.data.from.name), '</td></tr>',
            '<tr><td>', $L("Date: "), this.dateFormatter.format(new Date(this.email.data.timestamp)), '</td></tr>',
            '<tr><td>', $L("To: "), toList, '</td></tr>',
            ccRow,
            '<tr></tr>',
            '</table>',
            '<table style="font-family:prelude; font-weight:bold; font-size:9pt; line-height:18pt;">',
            '<tr><td>', $L("Subject: "), enyo.string.escapeHtml(this.email.getSubject()), '</td></tr>',
            '</table>',
            '</div>'
        ];

        var html = [
            '<html><head></head><body>',
            '<object type="application/x-palm-email" path="',
            this._escapeQuotes(path),
            '" cids="', this._escapeQuotes(JSON.stringify(cidMap)), '"'
        ];

        // Add this attribute if the email is a reply or fwd.
        if (replyOrForward) {
            html.push(' replyorforward="" ');
        }

        // Mime type defaults to html.
        html.push(' contentmimetype="', mimeType || "text/html", '" ');

        // Add head prefix to html.
        html.push(' headprefix="', this._escapeQuotes(headPrefix.join("")), '" ');

        // Add body prefix to html.
        html.push(' bodyprefix="', this._escapeQuotes(bodyPrefix.join("")), '" ');

        html.push('></object>',
            '</body></html>');

        return html.join("");
    },

    // Used for making strings suitable for use as attribute values in HTML text.
    // These values should be quoted with double quotes, and this method will escape
    // any existing backslashes or double-quotes already in the value string.
    _escapeQuotes: function (s) {
        return s.replace(/&/g, "&amp;").replace(/\"/g, "&quot;");
    },

    hookupSenderPhoto: function () {
        if (!EmailApp.Util.onDevice()) {
            return;
        }

        var imgBlock = this.$.avatarImage, that = this;
        var cache = enyo.application.contactCache;
        var onlineBlock = this.$.onlineStatus;
        cache.lookupContact(this.email.data.from.addr, function (res) {
            that._hookupSenderName(res);
            res.lookupPhoto(function (path) {
                imgBlock.setSrc(path);
            });
            res.lookupOnlineStatus(function (status) {
                /* The status we currently get back is currently either 'online', 'offline', or 'noimaccount'.
                 If we were to get back finer grained status, this is where we would set the indicator picture.
                 Some HI-provided pictures are attached to https://jira.palm.com/browse/DFISH-29585 */
                onlineBlock.setShowing(status !== "noimaccount");
                onlineBlock.setSrc((status === "online") ? "../images/online.png" : "../images/offline.png");
            });
        });
    },

    _hookupSenderName: function (contactDetails) {
        var emailData = this.email.data;
        var base = emailData.from.name || emailData.from.addr;
        this.$.from.setContent(contactDetails.getName() || base);
    },

    showMessageError: function (divName) {
        if (!divName || !this.$[divName]) {
            this.$.messageErrors.setShowing(false);
            this.$.body.setShowing(true);
            // does this ever get started?
            if (this.$.downloadSpinner) {
                this.$.downloadSpinner.hide();
            }
        } else {
            this.$.messageErrors.selectViewByName(divName);
            this.$.body.setShowing(false);
            this.$.messageErrors.setShowing(true);
        }
        this.resize();
    },

    forwardMouseEventToBody: function (event) {
        // nested scroller stuff
        if (this._doingNestedScroll === true) {
            if (event.type == "mouseup" || event.type == "touchend") {
                this._doingNestedScroll = undefined;
            }
            return;
        } else if (this._doingNestedScroll === undefined) {
            var attachDrawer = this.$.attachments;
            if (attachDrawer && attachDrawer.$.drawer.open && attachDrawer.node.contains(event.target)) {
                this._doingNestedScroll = true;
                return;
            }

            var rD = this.$.recipients;
            if (rD && rD.open && rD.node.contains(event.target)) {
                this._doingNestedScroll = true;
                return;
            }
        }

        this._doingNestedScroll = false;

        if (event.target != this.$.body.$.view.node) {
            if (event.type == "mouseup" || event.type == "touchend") {
                this._doingNestedScroll = undefined;
            }
            if (true) {
                // FIXME not really clear why this is necessary, but events are getting lost/confused otherwise
                newEvent = document.createEvent("MouseEvents");
                newEvent.initMouseEvent(event.type, false, false, window, 0,
                    event.screenX, event.screenY, event.clientX, event.clientY,
                    false, false, false, false, 0, null);
                event = newEvent;
            }

            // Ugly hack to pass event directly to webview object
            // Note that it'll also bubble back up to us, which is why we have the target check above
            return this.$.body.$.view.node.dispatchEvent(event);
        }
    },

  /*  mousedownHandler: function (sender, event) {
        return this.forwardMouseEventToBody(event);
    },

    mouseupHandler: function (sender, event) {
        return this.forwardMouseEventToBody(event);
    },

    mousemoveHandler: function (sender, event) {
        return this.forwardMouseEventToBody(event);
    },

    dragfinishHandler: function (sender, event) {
        // prevent mouseup at end of drag from being interpreted as a click
        event.preventClick();
    },

    flickHandler: function (sender, event) {
        // Hack to call flick handler in header on body
        // FIXME should pass event instead?
        return this.$.body.$.view.flickHandler(sender, event);
    },*/

    headerResized: function (sender, event) {
        var view = this.$.body,
            header = this.$.mailHeaderUnit;
        var hb = header.getBounds(),
            vb = view.getBounds();
        view.applyStyle("width", vb.width + "px");
        view.applyStyle("top", vb.top + "px");
        // setHeaderHeight doesn't exist in browser

        if (hb.height && view.setHeaderHeight) { // sometimes height is missing for some reason
            view.setHeaderHeight(hb.height);

            // 300 is from the max height of the recipients list.
            // somehow that isn't accounted for, and this makes it all happy
            var minHeight = hb.height + 300;
            view.$.view.applyStyle("min-height", minHeight + "px");
        }
    },
    resize: function () {
    	
        /*this.headerResized();
        if (this.$.body.resize) {
            this.$.body.resize();
        }*/
        this.resized(); // provided by enyo. needed for vertical reflow
        this._doingNestedScroll = undefined;
    },
    rendered: function () {
        this.inherited(arguments);

        if (window.PalmSystem) {
            this.$.body.setRedirects([
                {regex: "^file:.*", cookie: "", enable: false},
                {regex: ".*", cookie: "", enable: true}
            ]);
        }
    },
    
    openLink: function (sender, url) {
        // TODO remove this logging
        this.log("### Opening URL", url);

        // Launch default app for handling this url
        this.$.appMgrOpen.call({target: url, subscribe: false});
    },

    DEFAULT_SENDER_IMAGE: '../images/detail_avatar.png'
});
