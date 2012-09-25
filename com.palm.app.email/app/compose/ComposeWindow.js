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

/*global enyo, window, console, mail, EmailApp, Email, EmailRecipient, setTimeout, $L
 */

enyo.string.isBlankRegExp = /^\s*$/;
enyo.string.isBlank = function (str) {
    return enyo.string.isBlankRegExp.test(str);
};

enyo.kind({
    name: "DesktopBackground",
    kind: "Control",
    className: "enyo-fit desktop-background",
    components: [
        {name: "getWallpaper", kind: "PalmService", service: "palm://com.palm.systemservice/", method: "getPreferences", onSuccess: "updateBackground"},
        {kind: "ApplicationEvents", onWindowActivated: "windowActivated", onWindowDeactivated: "windowDeactivated"},
        {name: "shade", className: "enyo-fit desktop-background-shade", components: [
            {name: "center", className: "enyo-fit desktop-background-center", components: [
                {name: "client", className: "enyo-fit desktop-background-gradient"}
            ]}
        ]}
    ],
    create: function (self) {
        this.inherited(arguments);
        this.$.getWallpaper.call({"keys": ["wallpaper"]});
    },
    windowActivated: function () {
        if (this.hasNode()) {
            this.node.style.backgroundImage = 'url("' + this.backgroundImage + '")';
        }
        if (this.$.shade.hasNode()) {
            this.$.shade.node.style.background = "";
        }
    },
    windowDeactivated: function () {
        if (this.$.shade.hasNode()) {
            this.$.shade.node.style.background = "#9b9b9b";
        }
    },
    rendered: function () {
        this.inherited(arguments);
        if (this.backgroundImage) {
            this.windowActivated();
        }
    },
    updateBackground: function (self, result, response) {
        var path = result.wallpaper.wallpaperFile;
        this.backgroundImage = path;
        this.windowActivated();
    }

});

enyo.kind({
    name: "enyo.ComposeMailApp",
    kind: "VFlexBox",
    className: "basic-back",
    statics: {
        kForwardDraftDelimiter: "<span id='FORWARD_DRAFT_TEXT' class='display:none'></span>",
    },
    published: {
        draftIsDirty: false,
        forwardReplyIsDirty: false,
        smartTextDisabled: false
    },
    components: [
//		{kind: "ApplicationEvents", onUnload: "unloadHandler"},
        {kind: "DesktopBackground", components: [
            {name: "composeMainBody", kind: "VFlexBox", height: "100%", className: "compose-main-child", components: [
                {name: "sendHeader", height: "59px", kind: "VFlexBox", className: "compose-header-bar enyo-row", components: [
                    {name: "tornPaperEffect", className: "torn-paper-effect-tile", height: "2px" },
                    {content: "", flex: 1},
                    {name: "sendHeaderContent", style: "line-height:40px", kind: "HFlexBox", components: [
                        {name: "otherButton", className: "other-button", kind: "CustomButton", onclick: "otherClick", components: [
                            {name: "otherMenu", kind: "Menu", lazy: false, components: [
                                {name: "priorityMenuItem", caption: $L("Mark as High Priority"), onclick: "priorityMenuItemClicked"},
                                {name: "saveAsDraftMenuItem", caption: $L("Save As Draft"), onclick: "saveDraftClicked"},
                                {name: "discardMessageMenuItem", caption: $L("Discard Message"), onclick: "discardMessage"},
                            ]}
                            // {kind:"Image", style: "", src:"../images/attachments_button.png"}
                        ]},
                        {name: "attachButton", className: "attachment-button", kind: "CustomButton", onclick: "attachClick", style: "", components: [
                            // {kind:"Image", style: "", src:"../images/attachments_button.png"}
                        ]},
                        {name: "headerContent", className: "header-content", content: "", flex: 1},
                        //{kind: "CustomButton", caption:"Send", className: "compose-send-button", onclick: "sendClick" },
                        {name: "sendButton", kind: "Button", className: "enyo-button-blue", style: "margin: 6px 8px 0 0;min-width:64px;", height: "20px", onclick: "sendClick", components: [
                            //{kind:"Image", src:"../images/menu-icon-send.png", style:"style:"margin: -7px 2px 0px 0px;;display:inline-block;"},
                            {kind: "HFlexBox", components: [
                                {className: "header-send-icon"},
                                {content: $L("Send")}
                            ]}
                        ]}
                    ]},
                    {content: "", flex: 1}
                ]},
                {name: "composeScroller", className: "compose-scroller", style: "background-color: white;", kind: "Scroller", accelerated: false, height: "100%", flex: "1", onscroll: "scrollerScroll", components: [
                    {kind: "VFlexBox", components: [
                        {kind: "VFlexBox", className: "compose-header", style: "background-color: #f1f1f1;", components: [
                            {className: "enyo-row", className: "dotted-bottom", components: [
                                {kind: "HFlexBox", height: "54px", style: "padding: 0 14px;", components: [
                                    {name: "fromLabel", className: "compose-to-text", style: "line-height:54px;margin-right:4px;", content: $L("from:")},
                                    {name: "from", kind: "ListSelector", style: "font-size:16px;", onChange: "senderAccountChanged", flex: 1, value: 0, items: []}
                                ]}
                            ]},
                            {kind: "VFlexBox", name: "toRow", style: "padding: 0 0;", showing: true, className: "enyo-row dotted-bottom", components: [
                                {name: "toInput", style: "", kind: "AddressingPopup", expandButtonCaption: $L("To:"), onExpandButtonClick: "toClick", onkeydown: "addressKeyDown", tabIndex: 10, /*, hint: $L("Name or email address"), type: "email", defaultData: defaultContactsData*/ },
                            ]},
                            {kind: "VFlexBox", name: "ccRow", style: "padding: 0 0;", showing: false, className: "enyo-row dotted-bottom", components: [
                                {name: "ccInput", kind: "AddressingPopup", expandButtonCaption: $L("CC:"), onkeydown: "addressKeyDown", onfocus: "addressFocused", tabIndex: 20, /*, hint: $L("Name or email address"), type: "email", defaultData: defaultContactsData*/ },
                            ]},
                            {kind: "VFlexBox", name: "bccRow", style: "padding: 0 0;", showing: false, className: "enyo-row dotted-bottom", components: [
                                {name: "bccInput", kind: "AddressingPopup", expandButtonCaption: $L("BCC:"), onkeydown: "addressKeyDown", onfocus: "addressFocused", tabIndex: 30, /*, hint: $L("Name or email address"), type: "email", defaultData: defaultContactsData*/ },
                            ]},
                            {name: "subjectRow", className: "enyo-row dotted-bottom", components: [
                                {kind: "HFlexBox", height: "54px", name: "subjectBox", className: "subject-box", style: "padding: 0 14px;", components: [
                                    {content: $L("Subject:"), className: "compose-to-text"},
                                    {name: "subjectInput", style: "font-size:16px;", kind: "Input", className: "enyo-middle", flex: 1, onkeydown: "subjectKeydown", tabIndex: 40, oninput: "changeHandler"},
                                    {name: "priorityFlag", kind: "Image", src: "../images/compose-priority-flag.png", className: "compose-red-flag"}
                                ]}
                            ]},
                        ]},
                        {name: "attachments", kind: "AttachmentsDrawer", composeMode: true, collapsible: true, onAttachmentsRemoved: "handleAttachmentsRemoved"},
                        {name: "bodyContainer", style: " background-color: white; ", components: [
                            {name: "bodyInput", kind: "RichText", hint: "", placeholderClassName: "", flex: 1, styled: false, tabIndex: 50, style: "padding:14px 14px 0px 14px; min-height: 75px; background-color: white;font-size:16px;", oninput: "changeHandler"},
                            {name: "originalMessageBody", kind: "RichText", hint: "", placeholderClassName: "", styled: false, showing: false, flex: 1, style: "padding:0px 14px 14px 14px; background-color: white;", oninput: "changeHandler"},
                        ]}
                    ]}
                ]},
            ]},
            {kind: "FilePicker", allowMultiSelect: true, onPickFile: "attachFiles"}
        ]},
        {name: "appMenu", kind: "AppMenu", components: [
            {name: "help", caption: $L("Help")}
        ]},
        {name: "missingAttachmentsAlert", kind: "ModalDialog", dismissWithClick: true, onClose: "dialogClosed", caption: $L("Downloading Attachments"), components: [
            {className: "enyo-dialog-prompt-content", components: [
                {className: "enyo-dialog-prompt-message", content: $L("Sending now will only send the attachments that have finished downloading. All other attachments will not be sent.")},
                {kind: "Button", caption: $L("Send Without All Attachments"), onclick: "sendEmail"},
                {kind: "Button", caption: $L("Cancel"), onclick: "closeAttachmentAlert"}
            ]
            }
        ]
        },
        {name: "missingRecipientsAlert", kind: "ModalDialog", onClose: "dialogClosed", caption: $L("No recipients"), components: [
            {className: "enyo-dialog-prompt-content", components: [
                {className: "enyo-dialog-prompt-message", content: $L("No recipients have been specified.")},
                {kind: "Button", caption: $L("Enter Addresses"), onclick: "focusAddress"},
                {kind: "Button", caption: $L("Save As Draft"), onclick: "saveDraftClicked"},
                {kind: "Button", caption: $L("Discard"), onclick: "discardMessage"}
            ]}
        ]},
        {name: "badRecipientsAlert", kind: "ModalDialog", onClose: "dialogClosed", caption: $L("Invalid recipients"), components: [
            {className: "enyo-dialog-prompt-content", components: [
                {className: "enyo-dialog-prompt-message", content: $L("Some of the email addresses appear to be invalid. Edit addresses or send?")},
                {kind: "Button", caption: $L("Send"), onclick: "sendBadRecipients"},
                {kind: "Button", caption: $L("Edit Addresses"), onclick: "focusAddress"}
            ]}
        ]}
    ],
    messageDefaults: {
        mailTo: "",
        subject: "",
        message: ""
    },
    // NOTES: compose needs to:
    // have a complete account object to be able to do from
    // load a draft message
    // load a message to reply to or forward
    // load a list of recipients to reply to
    create: function () {
        this.inherited(arguments);
        console.info("WINLOG: ComposeApp create: " + window.name);

        // Temporarily work around sporadic non-delivery of unload events from the ApplicationEvents component.
        // Uncomment the ApplicationEvents component when removing this workaround.
        var that = this;
        var unloadFunc = function (e) {
            console.info("WINLOG: Compose window UNLOAD: " + window.name);
            that.unloadHandler(e);
            window.removeEventListener('unload', unloadFunc);
        }
        window.addEventListener('unload', unloadFunc);


        //this.log(enyo.json.stringify(enyo.windowParams, undefined, 2));

        // FIXME: experimental launch params use in conjunction with cards.js
        // likely to change.
        this.populateMessage(enyo.windowParams);
        this.configureSenderAccounts(enyo.windowParams.accountId);

        // Decide whether SmartForward/SmartReply is allowed at all
        // Unless we can use SmartForward, we need to download the attachments to forward.
        if (!this.isSmartTextAllowed()) {
            this.disableSmartText();
        }

        setTimeout((function () {
            if (enyo.windowParams.mailToURL) {
                this.$.subjectInput.forceFocus();
            } else if (enyo.windowParams.action === "replyall" || enyo.windowParams.action === "reply") {
                var bodyInputElem = this.$.bodyInput.hasNode();
                this.$.bodyInput.forceFocus();
                window.getSelection().setPosition(bodyInputElem, 0);
            } else {
                this.$.toInput.forceFocus();
            }
        }).bind(this), 0);
        //this.$.from.setItems([{caption: "whatever", value:2}, {caption: "foo", value:3}]);
        EmailApp.Util.setUpConnectionWatch();
    },

    closeAttachmentAlert: function () {
        this.$.missingAttachmentsAlert.close();
    },

    dialogClosed: function (inSender, inEvent) {
        this.$.sendButton.setDisabled(false);
    },

    unloadHandler: function (e) {

        if (this.draftIsDirty) {
            this.saveDraft(true);
        }

        // Destroy component tree on window unload, so we can rely on destructors for cleanup.
        this.destroy();
    },

    rendered: function () {
        this.inherited(arguments);
        if (window.windowLaunchTime) {
            this.log("launch -> render time: " + (Date.now() - window.windowLaunchTime) + " ms");
        }
        // In "reply" or "forward" situations, the signature element isn't created yet when the Compose.create finishes.
        if (this.delayedSignature) {
            this.senderAccountChanged(undefined, enyo.windowParams.accountId);
            this.delayedSignature = false;
        }
    },

    // Build a list of sender accounts from our accounts list, and populate the list selector.
    // Select teh appropriate default.
    configureSenderAccounts: function (accountId) {
        var accountItems = enyo.application.accounts.getAccounts().map(function (acct) {
            return {caption: acct.getEmailAddress(), value: acct.getId() };
        });
        this.$.from.setItems(accountItems);
        var accts = enyo.application.accounts;
        // make sure the account is a real acount, rather than a synthetic one
        accountId = (accountId && accts.getAccount(accountId)) ? accountId : accts.getDefaultAccountId();
        this.$.from.setValue(accountId);
        this.senderAccountChanged(undefined, accountId);
    },

    // Called when the sender account is changed.
    // Fixes up the signature text.
    senderAccountChanged: function (target, accountId) {
        var sigElement = document.getElementById("signature");
        if (sigElement) {
            sigElement.innerHTML = AccountPreferences.getSignature(accountId);
        } else {
            this.delayedSignature = true;
        }

        if (this.composition.isReplyForward() && accountId !== this.composition.getAccountId()) {
            this.log("account changed; disabling Smart Text");
            this.disableSmartText();
        }

        this.composition.setAccountId(accountId);
    },

    populateMessage: function (inParams) {
        var params = enyo.mixin(enyo.mixin({}, this.messageDefaults), inParams);
        this.composition = new EmailApp.Composition(params);

        // This flag indicates original fwd content has been modified,
        // and is used to enable "smart forward" for EAS when it's set to false.
        // This is always set when we save a draft, since we collapse forwarded content into the saved draft.
        // So, we need to copy the state from the existing email when editing a draft.
        if (inParams && inParams.edit && inParams.edit.flags && inParams.edit.flags.editedOriginal) {
            this.disableSmartText();
            this.setForwardReplyIsDirty(true);
        }

        this.populateRecipientComponents(this.composition.getDraftEmail().getRecipients());

        this.$.subjectInput.setValue(this.composition.getDraftEmail().getSubject());
        this.$.headerContent.setContent(this.composition.getDraftEmail().getSubject());
        this.$.bodyInput.setValue(this.composition.getBodyText());

        if (this.composition.originalText) {
            this.$.originalMessageBody.show();

           /* var sanitized = html_sanitize(this.composition.sanitizeOriginalText(), function (url) {
                return url;
            }, function (id) {
                return id;
            });*/
            var sanitized = this.sanitizeHtml(this.composition.sanitizeOriginalText());
            this.$.originalMessageBody.setValue(sanitized);
        }

        this.$.attachments.setEmail(this.composition.getDraftEmail());
        var draftEmail = this.composition.getDraftEmail();
        if (draftEmail.data.priority) {
            this.changePriority(draftEmail.data.priority);
        } else if (inParams.priority) {
            this.changePriority(inParams.priority);
        } else {
            this.changePriority(Email.NORMAL_PRIORITY);
        }
    },

    populateRecipientComponents: function (recipientList) {
        var i, recipObject, toRecipients = [], ccRecipients = [], bccRecipients = [];
        for (i = 0; i < recipientList.length; i++) {
            recipObject = recipientList[i];
            switch (recipObject.type) {
            case EmailRecipient.typeTo:
                toRecipients.push(
                    {
                        type: EmailRecipient.typeTo,
                        displayName: recipObject.name,
                        value: recipObject.addr
                    });
                break;
            case EmailRecipient.typeCc:
                ccRecipients.push(
                    {
                        type: EmailRecipient.typeCc,
                        displayName: recipObject.name,
                        value: recipObject.addr
                    });
                break;
            case EmailRecipient.typeBcc:
                bccRecipients.push(
                    {
                        type: EmailRecipient.typeBcc,
                        displayName: recipObject.name,
                        value: recipObject.addr
                    });
                break;
            }
        }

        //FixMe: set recipients here, as necessary
        this.$.toInput.setContacts(toRecipients);
        if (ccRecipients.length !== 0) {
            this.$.ccRow.show();
            this.$.bccRow.show();
            this.$.ccInput.setContacts(ccRecipients);
        }
        if (bccRecipients.length !== 0) {
            this.$.ccRow.show();
            this.$.bccRow.show();
            this.$.bccInput.setContacts(bccRecipients);
        }
    },
    changeHandler: function (inSender, inEvent) {
        // Any change makes the email dirty
        this.setDraftIsDirty(true);
        if (inSender.name === "subjectInput") {
            // copy new subject to header
            this.$.headerContent.setContent(this.$.subjectInput.value);
        } else if (inSender.name === "originalMessageBody") {
            // for smart forward/reply, mark original body dirty if edited
            this.setForwardReplyIsDirty(true);
        }
    },
    setDraftIsDirty: function (dirty) {
        // Only change if the dirty flag is different
        if (dirty !== this.draftIsDirty) {
            this.log("ComposeAssistant.setDirty ", dirty);
            this.draftIsDirty = dirty;

            // Disable "save" menu item
            this.$.saveAsDraftMenuItem.setDisabled(!dirty);
        }
    },

    disableSmartText: function () {
        if (!this.smartTextDisabled) {
            this.smartTextDisabled = true;

            this.log("disabling smart text");

            if (this.composition.isForward()) {
                this.downloadForwardedAttachments();
            }
        }
    },

    setForwardReplyIsDirty: function (dirty) {
        if (dirty && !this.forwardReplyIsDirty) {
            this.forwardReplyIsDirty = true;
            this.disableSmartText();
        }
    },

    getSelectedAccountId: function () {
        return this.$.from.getValue();
    },

    isSmartTextAllowed: function () {
        var accountId = this.getSelectedAccountId();

        var acct = enyo.application.accounts.getAccount(accountId);

        if (acct) {
            return (this.composition.isReply() && acct.isSmartReplyEnabled()) ||
                (this.composition.isForward() && acct.isSmartForwardEnabled());
        }

        return false;
    },

    _getRecipients: function () {
        // Set recipients
        var recipients = [];

        var toContacts = this.$.toInput.getContacts();
        this._addRecipients(toContacts, EmailRecipient.typeTo, recipients);
        var ccContacts = this.$.ccInput.getContacts();
        this._addRecipients(ccContacts, EmailRecipient.typeCc, recipients);
        var bccContacts = this.$.bccInput.getContacts();
        this._addRecipients(bccContacts, EmailRecipient.typeBcc, recipients);

        return recipients;
    },

    _formatPlainText: function (text, newline) {
        return text.replace("\u00A0", " ").replace(/\r\n|\n/g, newline);
    },

    // Get the values in the compose fields and body and update the draft email
    _updateEmailFromDom: function (saveAsDraft) {
        var draftEmail = this.composition.getDraftEmail();

        var accountId = this.$.from.value;
        var acct = enyo.application.accounts.getAccount(accountId);

        // Sanity checking
        if (!acct) {
            throw new Error("no such account " + accountId);
        }

        // Set accountId
        this.composition.setAccountId(accountId);

        // Set subject
        var subject = this.$.subjectInput.getValue() || "";
        draftEmail.setSubject(subject.trim());

        // Set timestamp
        draftEmail.data.timestamp = Date.now();

        // Set from address
        var addr = acct.getEmailAddress();
        var name = acct.getFromName();

        draftEmail.setFrom({type: EmailRecipient.typeFrom, name: name, addr: addr});

        // Set recipients
        var recipients = this._getRecipients();

        draftEmail.setRecipients(recipients);

        // Construct body
        var msgText = this.$.bodyInput.getHtml();
        var smartText = null;

        var originalText = "";

        var editedOriginal = true;

        if (this.forwardReplyIsDirty || this.smartTextDisabled) {
            // Original text has been modified.
            // Append the modified version of the original text
            originalText = this.$.originalMessageBody.getHtml();
        } else {
            // Original text unmodified.
            // We may be able to use SmartForward. If so, it contains just the edited body text, not the original text.
            if (this.isSmartTextAllowed()) {
                smartText = msgText;

                editedOriginal = false;
            }

            // Append a sanitized version of the otherwise untouched original text
            // FIXME: is this really a good idea?
            originalText = this.composition.sanitizeOriginalText();
        }

        // Append original text
        if (saveAsDraft) {
            // Add separator so we know where the original text was
            // FIXME do we still need this?
            msgText += Email.kForwardDraftDelimeter;
        }

        msgText += originalText;

        // Need to replace the local file locations back to original 'cid:' string
        msgText = this.composition.replaceURIs(msgText);

        // editedOriginal is set to true if the original was edited OR if we just want to disable SmartReply/SmartForward
        draftEmail.data.flags.editedOriginal = editedOriginal;

        // Plain text version of body
        var plainText;
        try {
            plainText = this._formatPlainText(this.$.bodyInput.getText(), "\r\n");

            var plainOriginalText = this.$.originalMessageBody.getText();

            if (plainOriginalText && plainOriginalText.length > 0) {
                plainText += "\r\n> " + this._formatPlainText(plainOriginalText, "\r\n> ");
            }
        } catch (e) {
            console.error("unable to generate plain text version of body: " + e);
        }

        // Update the body text parts
        draftEmail.setBodyContent(msgText, plainText, smartText);
    },

    _addRecipients: function (addrs, type, recipients) {
        for (var i = 0; i < addrs.length; i++) {
            recipients.push({
                type: type,
                name: addrs[i].displayName,
                addr: addrs[i].value
            });
        }
    },

    sendClick: function (inSender, inEvent) {
        this.$.sendButton.setDisabled(true);
        var recipientCount = this.$.toInput.getContacts().length + this.$.ccInput.getContacts().length + this.$.bccInput.getContacts().length;
        if (recipientCount === 0) {
            this.$.missingRecipientsAlert.openAtCenter();
        } else if (!this.checkValidRecipients()) {
            this.$.badRecipientsAlert.openAtCenter();
        } else if (this.composition.countMissingAttachments(!this.smartTextDisabled) > 0) {
            // Show alert
            this.$.missingAttachmentsAlert.openAtCenter();
        } else {
            this.sendEmail();
        }
    },

    sendBadRecipients: function (inSender, inEvent) {
        // at this point, have already checked for bad/no recipients
        if (this.composition.countMissingAttachments(!this.smartTextDisabled) > 0) {
            // Show alert
            this.$.missingAttachmentsAlert.openAtCenter();
        }
        this.sendEmail();
    },

    isValidEmail: function (email) {
        // Regex from regular-expressions.info
        return email && email.match(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,6}$/i);
    },

    checkValidRecipients: function () {
        var recipients = this._getRecipients();

        for (var i = 0; i < recipients.length; i++) {
            var recipient = recipients[i];

            if (!recipient.addr || !this.isValidEmail(recipient.addr.trim())) {
                console.log("invalid recipient: " + recipient.addr);
                return false;
            }
        }

        return true;
    },

    sendingEmail: false,

    sendEmail: function () {
        if (this.sendingEmail) {
            this.log("Already sending");
            return;
        }
        this.sendingEmail = true;
        this.$.badRecipientsAlert.close();

        this._updateEmailFromDom(false);

        var draftEmail = this.composition.getDraftEmail();

        var subject = draftEmail.getSubject();
        var numDiscarded = this.composition.countMissingAttachments(!this.smartTextDisabled);

        var sendDetails = {
            originalMsgId: draftEmail.data.originalMsgId,
            subject: subject,
            numDiscarded: numDiscarded,
            replied: this.composition.isReply(),
            forwarded: this.composition.isForward()
        };

        //this.log("sending mail from account: " + account._id);
        this.composition.send(enyo.bind(this, "_handleSendResponse", sendDetails));
    },

    _handleSendResponse: function (sendDetails, response) {
        this.sendingEmail = false;
        this.$.sendButton.setDisabled(false);
        this.log(enyo.json.stringify(response));
        //TODO: check for failure and display an error dialog

        // Clear the dirty flag so it doesn't attempt to save the email as a draft
        this.draftIsDirty = false;

        // FIXME display "saving email to outbox" if no network is available

        var message;

        var isNetConnection = enyo.application.isInternetConnectionAvailable;
        // if connection watch is not yet defined, still treat as if we have a connection
        var hasConnection = !isNetConnection || isNetConnection();

        if (sendDetails.subject && sendDetails.numDiscarded < 1) {
            message = hasConnection ? EmailApp.Util.interpolate($L("Sending \"#{subject}\""), sendDetails) :
                EmailApp.Util.interpolate($L("Saving \"#{subject}\" to outbox"), sendDetails);
        } else if (sendDetails.numDiscarded) {
            var temp = new enyo.g11n.Template("1#1 attachment discarded|1>##{numDiscarded} attachments discarded");
            var formatted = temp.formatChoice(sendDetails.numDiscarded, {numDiscarded: sendDetails.numDiscarded});
            message = hasConnection ? ($L("Sending email. ") + formatted) :
                ($L("Saving email to outbox. ") + formatted);
        } else {
            message = hasConnection ? $L("Sending email") : $L("Saving email to outbox");
        }

        //this.log(message);

        // Banner messages should not be HTML escaped
        enyo.application.dashboardManager.generalNotification(message);

        // Set replied/forwarded flag as needed
        if (sendDetails.originalMsgId) {
            if (sendDetails.replied) {
                Email.setEmailFlags({id: sendDetails.originalMsgId}, {replied: true});
            } else if (sendDetails.forwarded) {
                Email.setEmailFlags({id: sendDetails.originalMsgId}, {forwarded: true});
            }
        }

        // all done
        window.close();
    },

    saveDraftClicked: function (inSendr, inEvent) {
        this.saveDraft(false);
    },

    saveDraft: function (unloading) {
        var numDiscarded = 0;
        this.log("saveDraft");

        this.$.missingRecipientsAlert.close();
        this.$.badRecipientsAlert.close();

        // Final check: make sure the subject and message body contain something.
        // since message body contains html tags, check length of 5 or more

        var subject = this.$.subjectInput.getValue();
        var bodyText = this.$.bodyInput.getHtml();

        // Final check: make sure the subject and message body contain something.
        // Since message body contains html tags, check length of 5 or more

        if (!enyo.string.isBlank(subject) || bodyText.length > 5) {
            this._updateEmailFromDom(true);
            var sendDetails = {
                subject: subject,
                numDiscarded: 0
            };

            var responseFunction;
            if (unloading) {
                // This window is going closing - just display a banner
                responseFunction = enyo.bind(enyo.application.dashboardManager, "showSaveBanner", sendDetails);
            } else {
                // Update this window
                responseFunction = enyo.bind(this, "_handleSaveDraftResponse", sendDetails);
            }

            this.composition.saveDraft(responseFunction, false);
        }
    },

    _handleSaveDraftResponse: function (sendDetails, response) {
        if (response._id) {
            this.log("draft saved");
            enyo.windows.renameWindow(window, "compose" + "-" + response._id);
            // The file is no longer dirty, so disable the "save" command menu
            this.setDraftIsDirty(false);
            enyo.application.dashboardManager.showSaveBanner(sendDetails, response);
        } else {
            this._handleSaveFailResponse(response);
        }
    },

    _handleSaveFailResponse: function (response) {
        this.sending = false;

        console.error("Compose - send or save draft failed:", response.errorText);

        //TODO enyo-ize this dialog
        if (this.controller) {
            this.controller.showAlertDialog({
                onChoose: Mojo.doNothing,
                title: $L("Error"),
                message: $L(response.errorText), // The text from the service is stored in ServiceStrings.js so it can be localized
                choices: [
                    {label: $L('Done'), value: 'dismiss', type: 'alert'}
                ]
            });
        }
    },

    discardMessage: function () {
        // Clear the dirty flag so it doesn't attempt to save the email as a draft
        this.draftIsDirty = false;

        if (this.composition.email._id) {
            Email.deleteEmails({id: this.composition.email._id});
        }

        window.close();
    },


    // expand/contract cc and bcc rows when button on "To" line is clicked
    toClick: function (inSender) {
        this.$.toInput.close();
        this.$.ccRow.setShowing(this.$.ccRow.domStyles.display !== "");
        this.$.bccRow.setShowing(this.$.bccRow.domStyles.display !== "");
    },

    // In addressing fields, advance to the next field if tab is pressed, or if Enter is pressed, but only if nothing else was typed first
    addressKeyDown: function (inSender, inEvent) {
        if ((!inEvent.atomizedInput && inEvent.keyCode == 13) || inEvent.keyCode === 9) {
            var nextControl;
            if (inSender === this.$.toInput) {
                if (this.$.ccRow.showing) {
                    nextControl = this.$.ccInput;
                } else {
                    nextControl = this.$.subjectInput;
                }
            } else if (inSender === this.$.ccInput) {
                nextControl = this.$.bccInput;
            } else {
                nextControl = this.$.subjectInput;
            }
            if (nextControl.forceFocus) {
                nextControl.forceFocus();
            } else if (nextControl.$.input && nextControl.$.input.forceFocus) {
                nextControl.$.input.forceFocus();
            }
        }
    },
    // DFISH-8731 CC and BCC labels shouldn't be buttons
    addressFocused: function (inSender, inEvent) {
        var input = inSender.$.input;
        if (input && input.$.expandButton) {
            input.$.expandButton.removeClass("enyo-button");
        }
    },

    // in the subject field, advance to the bodyInout on Enter or Tab
    subjectKeydown: function (inSender, inEvent) {
        if (inEvent.keyCode == 13 || inEvent.keyCode === 9) {
            this.$.bodyInput.forceFocus();
        }
    },

    contactsClick: function (inSender) {
        // FIXME: hack to make input stay focused...
        inSender.container.mousedown();
        inSender.container.toggleShowList();
    },

    otherClick: function (inSender, inEvent) {
        this.$.otherMenu.openAtControl(this.$.otherButton);
    },

    changePriority: function (newPriority) {
        this.composition.email.priority = newPriority;
        if (newPriority == Email.HIGH_PRIORITY) {
            this.$.priorityMenuItem.setCaption($L("Mark as Normal Priority"));
            this.$.subjectBox.addClass("flagged");
        } else {
            this.$.priorityMenuItem.setCaption($L("Mark as High Priority"));
            this.$.subjectBox.removeClass("flagged");
        }
    },

    priorityMenuItemClicked: function (inSender) {
        var priority;
        if (this.composition.email.priority == Email.HIGH_PRIORITY) {
            priority = Email.NORMAL_PRIORITY;
        } else {
            priority = Email.HIGH_PRIORITY;
        }
        this.changePriority(priority);
    },

    attachClick: function (inSender) {
        this.$.filePicker.pickFile();
        this.log("Attachment Button pressed");
    },

    attachFiles: function (inSender, files) {

        if (!files || !files.length) {
            return;
        }

        var attachments = [];
        files.forEach(function (fileInfo) {
            var name = fileInfo.fullPath.split('/').pop();
            attachments.push({type: "attachment", name: name, path: fileInfo.fullPath,
                mimeType: EmailApp.Util.finagleMimeType(fileInfo.fullPath)});
        });

        // Add to draft email
        // FIXME: handle duplicates?
        var draftEmail = this.composition.getDraftEmail();

        for (var i = 0; i < attachments.length; i++) {
            draftEmail.addAttachment(attachments[i]);
        }

        // Add to attachment list
        this.$.attachments.addAttachments(attachments);
    },

    handleAttachmentsRemoved: function (inSender, attachments) {
        // Remove from draft email
        var draftEmail = this.composition.getDraftEmail();

        var removedForwardedAttachment = false;

        for (var i = 0; i < attachments.length; i++) {
            this.log("removing attachment " + JSON.stringify(attachments[i]));
            draftEmail.removeAttachment(attachments[i]);

            if (attachments[i].originalPartId) {
                removedForwardedAttachment = true;
            }
        }

        if (removedForwardedAttachment) {
            this.disableSmartText();
        }
    },

    downloadForwardedAttachments: function () {
        this.log("started? " + this.attachmentDownloadStarted);

        if (this.attachmentDownloadStarted) {
            return;
        }

        this.attachmentDownloadStarted = true;

        var draftEmail = this.composition.getDraftEmail();

        var downloadStarted = false;

        draftEmail.getAttachments().forEach(function (part) {
            if (!part.path) { // FIXME check if file at path exists
                var sharedAttachment = enyo.create({kind: "SharedAttachment", message: draftEmail.data, part: part});

                sharedAttachment.download();

                // Don't really care about the progress
                sharedAttachment.destroy();

                downloadStarted = true;
            }
        });

        if (downloadStarted) {
            // Expand attachments drawer
            this.$.attachments.openDrawer();
        }
    },
    focusAddress: function () {
        this.$.missingRecipientsAlert.close();
        this.$.badRecipientsAlert.close();
        this.$.toInput.forceFocus();
    },
    sanitizeHtml: function (unsafeHtml) {
 	   var rEx = new RegExp("<(script|object|embed|iframe)[^>]*>([\\S\\s]*?)<\/(script|object|embed|iframe)>", "gim");
 	   
 	   return unsafeHtml.replace(rEx,"");
    }
});
