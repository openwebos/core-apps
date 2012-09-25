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
    name: "MessageView",
    kind: "Item",

    className: "message-view accel",

    published: {
        email: null,
        expanded: false,
        collapsible: true,
        preloadBody: false,
        standalone: false,
        enableFooter: true
    },

    events: {
        onExpandedChanged: "",
        onComposeMessage: ""
    },
    
    // static, do not modify
    todayFormatter: new enyo.g11n.DateFmt({
        time: "short"
    }),
    
    // static, do not modify
    recentFormatter: new enyo.g11n.DateFmt({
        time: "short",
        date: "EEE"
    }),

    // static, do not modify
    dateFormatter: new enyo.g11n.DateFmt({
        date: "short"
    }),

    components: [
        {name: "appMgrOpen", method: "open", kind: "enyo.PalmService", service: enyo.palmServices.application},
        {name: "bodyDownloader", kind: "PartDownloader"},
        {name: "bodyPinner", kind: "CachedFile", onSuccess: "displayBody", onReload: "pinFailed"},

        {name: "header", className: "message-view-header", onclick: "toggleBody", components: [
            {kind: "HFlexBox", classes: "unclickable", align: "baseline", components: [
                {className: "message-view-contact-icon clickable", onclick: "senderClick", components: [
                    {name: "contactPhotoSmall", showing: true, kind: "Image", className: "message-view-contact-photo-small", src: "../images/detail_avatar.png"},
                    {kind: "Image", src: "../images/bg_icon_mask.png", className: "message-view-contact-photo-mask"}
                ]},
                {name: "from", flex: 1, className: "message-view-from"},
                {name: "when", className: "message-view-when"},
                {name: "arrow", className: "message-view-expander", kind: "Image", src: "../images/arrow-down.png"}
            ]},
            {name: "recipientsBox", layoutKind: "HFlexLayout", components: [
                {name: "recipientsSummary", flex: 1, allowHtml: true /* MUST ESCAPE */, className: "message-view-recipients", onclick: "recipientsClick"}
            ]},
            {kind: "HFlexBox", name: "subjectBox", className: "message-view-subjectbox", showing: false, components: [
                {name: "subjectLabel", className: "message-view-label", content: $L("Subject:")},
                {name: "subject", flex: 1, className: "message-view-subject message-view-text"}
            ]},
            {name: "meetingInfo", kind: "MeetingInfo", className: "message-view-header-item", onResponseClick: "handleMeetingResponse", showing: false},
            {name: "attachments", kind: "AttachmentsDrawer", lazy: true, collapsible: true, className: "message-view-header-item", onInlineDownloaded: "handleInlineDownloaded",
                onOpenAnimationComplete: "resized"},
            {name: "remoteContentWarning", className: "message-view-remote-content-warning", showing: false, components: [
                {nodeTag: "span", className: "message-view-remote-content-warning-text", content: $L("This message contains remote images. ")},
                {nodeTag: "span", className: "message-view-remote-content-warning-button", content: $L("Load remote images."), onclick: "unblockRemoteContent"}
            ]}
        ]},
        {name: "missing", showing: false, components: [
            {name: "missingSpinner", kind: "enyo.SpinnerLarge", showing: false},
            {content: $L("Retrieving email text ...")}
        ]},
        {name: "preview", className: "truncated-text preview", onclick: "toggleBody"},
        {name: "bodyWrapper", className: "body-wrapper", components: [
            {name: "body", kind: "DivHtmlView", allowRemoteContent: false, onViewReady: "viewReady", onViewSizeChange: "viewSizeChange",
                onLinkClick: "openLink",
                onInspectElement: "inspectElement"},
            {name: "inspectElementContextMenu", kind: "PopupSelect", onSelect: "inspectElementContextMenuSelect"},
            {name: "replyContextMenu", kind: "PopupSelect", onSelect: "composeMessage", items: [
                {caption: $L("Reply"), value: "reply"},
                {caption: $L("Reply All"), value: "replyall"},
                {caption: $L("Forward"), value: "forward"}
            ]},
            {name: "footer", kind: "Toolbar", className: "footer", style: "background: white", components: [
                {flex: 1},
                {name: "replyButton", onclick: "showReplyContext", kind: "ToolButton", icon: "../images/icons/toolbar-icon-reply.png"},
                {name: "moveButton", onclick: "moveToFolderClick", kind: "ToolButton", icon: "../images/icons/toolbar-icon-moveto.png"},
                {name: "deleteButton", kind: "ToolButton", onclick: "deleteClick", icon: "../images/icons/toolbar-icon-delete.png"},
                {name: "moreButton", kind: "ToolButton", onclick: "moreClick", icon: "../images/drawer_arrow.png" /* need real icon */}
            ]}
        ]},
        {name: "moveToDialog", kind: "SelectFolderPopup", caption: $L("Move to Folder"), iconStyle: "full", onSelect: "moveToFolderSelected"},
        {name: "pseudoDetails", kind: "com.palm.library.contactsui.detailsDialog", onCancelClicked: "closePseudoDetails"},
        {name: "recipientsPopup", kind: "PopupSelect", onSelect: "recipientSelect"},
        {name: "morePopup", kind: "PopupSelect", onSelect: "moreSelect"}
    ],

    create: function () {
        this.inherited(arguments);

        this.autoReadTriggered = false;
        this.blockRemoteContent = true;
        
        this.emailChanged();
        this.enableFooterChanged();
    },

    showReplyContext: function (sender, event) {
        this.$.replyContextMenu.openAtEvent(event);
    },
    
    composeMessage: function (sender, selection) {
        this.doComposeMessage({
            action: selection.getValue(),
            originalMessage: this.email.data
        });
    },

    destroy: function () {
        this.inherited(arguments);
    },

    emailChanged: function (old) {
        if (old === this.email) {
            return;
        }
    
        if (old) {
            old.destroy();
        }

        // Take over ownership
        if (this.email) {
            this.email.setOwner(this);
        }
        
        if (this.email) {
            this.updateHeader();
            this.updateBody();
            this.updateAttachments();
        }
    },
    
    enableFooterChanged: function () {
        this.$.footer.setShowing(this.expanded && this.enableFooter);
    },

    handleInlineDownloaded: function () {
        this.updateBody();
    },

    updateEmailData: function (updatedData) {
        var oldAttachmentCount = this.email.getAttachments(true).length;
    
        this.email.setData(updatedData);

        this.updateHeader();
        this.updateBody();
        
        // FIXME currently only re-renders if attachment list length has changed
        // Need to handle case where part is downloaded from outside the email app
        var newAttachmentCount = this.email.getAttachments(true).length;
        
        if (newAttachmentCount !== oldAttachmentCount) {
            console.log("attachment count changed");
            this.updateAttachments();
        }
    },

    updateHeader: function () {
        var sender = this.email.getFrom();

        this.$.from.setContent(sender && (sender.name || sender.addr));
        this.$.subject.setContent(this.email.getSubject() || $L("No Subject"));
        this.$.header.addRemoveClass("unread", !this.email.getFlags().read);

        this.$.preview.setContent(this.email.getSummary());

        this.$.meetingInfo.setShowing(!!this.email.data.meetingInfo);
        this.$.meetingInfo.setMeetingInfo(this.email.data.meetingInfo);

        this.updateMeetingButtons();
        
        this.$.when.setContent(this.formatTime(this.email.getTimestamp()));

        var recipSummary = this.makeRecipientsSummaryHtml(this.email.getRecipients());
        this.$.recipientsSummary.setContent(recipSummary);
        
        if (!this.email.canModifyEmail()) {
            this.$.deleteButton.hide();
            this.$.moveButton.hide();
        }
        
        this.lookupSenderPhoto();
    },
    
    updateAttachments: function() {
        //console.log("updating attachments");
        this.$.attachments.setEmail(this.email);
    },

    updateBody: function () {
        // TODO handle multiple body parts
        var body = this.email.getBodyPart();

        // Check if we should block remote content; this may be turned off if the user says yes
        if (this.blockRemoteContent) {
            var loadRemoteContent = enyo.application.prefs.get("loadRemoteContent");
        
            if (!loadRemoteContent || loadRemoteContent === AccountPreferences.LOAD_REMOTE_ALWAYS) {
                this.blockRemoteContent = false;
                this.$.body.setAllowRemoteContent(true);
            }
        }
        
        // Check if setting changed
        if (this.$.body.getAllowRemoteContent() === this.blockRemoteContent) {
            this.$.body.setAllowRemoteContent(!this.blockRemoteContent);
            this.currentBodyPath = null;
        }
        
        // Replace cids with inline images
        this.$.body.setCidMap(this.email.buildCidMap());

        if (body && body.path) {
            if (this.expanded) {
                this.$.body.show();
            }
            this.$.missing.hide();
            this.$.missingSpinner.hide();

            if (!this.loadBodyQueued && body.path !== this.currentBodyPath && (this.preloadBody || this.expanded)) {
                this.loadBodyQueued = true;
                enyo.asyncMethod(this, enyo.bind(this, "loadBody", body));
            }
        } else {
            this.$.body.hide();
            this.$.missing.show();
            this.$.missingSpinner.show();

            this.downloadBody();
        }
    },

    downloadBody: function () {
        // TODO: handle multiple body parts
        var body = this.email.getBodyPart();

        var accountId = enyo.application.folderProcessor.getFolderAccount(this.email.getFolderId());
        var account = enyo.application.accounts.getAccount(accountId);

        // Download body. If body is null (no part list), the transport will download the body parts from the server.
        this.$.bodyDownloader.downloadPart(account, this.email.getFolderId(), this.email.getId(), body);
    },

    updateMeetingButtons: function () {
        if (this.email.data.meetingInfo) {
            var isOwnEmail = false;

            // check sender email address to make sure it's not our own meeting email
            var account = enyo.application.accounts.getAccount(this.email.getAccountId());
            if (account.getEmailAddress().toLowerCase() === this.email.getSenderAddress().toLowerCase()) {
                isOwnEmail = true;
            }

            this.$.meetingInfo.setAllowResponse(!isOwnEmail && this.expanded);
        }
    },

    deleteClick: function () {
        if (this.ignoreDeleteTaps) {
            return;
        }

        if (enyo.application.prefs.get('confirmDeleteOnSwipe')) {
            MailDialogPrompt.displayPrompt(this, {
                caption: $L("Delete Message"),
                message: $L("Delete the selected message?"),
                acceptButtonCaption: $L("Delete"),
                onAccept: "confirmDelete"
            });
        } else {
            this.confirmDelete();
        }
    },

    confirmDelete: function () {
        Email.deleteEmails({id: this.email.getId()}, enyo.dispatchBack);
        this.setExpanded(false);
    },

    moveToFolderClick: function (sender, event) {
        var accountId = enyo.application.folderProcessor.getFolderAccount(this.email.getFolderId());
        this.$.moveToDialog.loadFolders(accountId);
        this.$.moveToDialog.openAtCenter();
    },

    moveToFolderSelected: function (inSender, folder) {
        var targetFolderId = folder._id;
        Email.moveEmailsToFolder({id: this.email.getId()}, targetFolderId);
        this.setExpanded(false);
    },
    
    getAccount: function () {
        var accountId = enyo.application.folderProcessor.getFolderAccount(this.email.getFolderId());
        
        return enyo.application.accounts.getAccount(accountId);
    },
    
    canArchive: function () {
        if (!this.email.canModifyEmail()) {
            return false;
        }
    
        var account = this.getAccount();
        var inboxFolderId = account && account.getInboxFolderId();
        var archiveFolderId = account && account.getArchiveFolderId();
        
        return archiveFolderId && this.email.getFolderId() === inboxFolderId;
    },
    
    moreClick: function (sender, event) {
        var items = [];
        
        if (!this.standalone) {
            items.push({content: $L("Open in New Card"), value: "openInNewCard"});
        }
        
        items.push({content: $L("Print"), value: "print"});

        if (this.canArchive()) {
            items.push({content: $L("Archive"), value: "archive"});
        }
    
        this.$.morePopup.setItems(items);
        this.$.morePopup.openAtEvent(event);
    },
    
    moreSelect: function (sender, selected) {
        var action = selected.getValue();
        
        if (action === "print") {
            MailErrorDialog.displayError(this, {caption: "Not implemented"});
        } else if (action === "archive") {
            this.archiveClick();
        } else if (action === "openInNewCard") {
            enyo.application.launcher.launchEmailViewer({emailId: this.email.getId()});
        }
        
        return true;
    },
    
    archiveClick: function () {
        if (true) {
            MailDialogPrompt.displayPrompt(this, {
                caption: $L("Archive Email"),
                message: $L("Archive the selected email?"),
                acceptButtonCaption: $L("Archive"),
                onAccept: "archiveConfirmed"
            });
        }
        
        return true;
    },
    
    archiveConfirmed: function (sender, event) {
        var account = this.getAccount();
        var archiveFolderId = account && account.getArchiveFolderId();
        
        if (archiveFolderId) {
            Email.moveEmailsToFolder({id: this.email.getId()}, archiveFolderId);
            this.conversationDeleted();
        } else {
            console.error("no archive folder");
        }
    },

    toggleBody: function (sender, event) {
        this.setExpanded(this.collapsible ? !this.expanded : true);
        this.doExpandedChanged();

        this.autoMarkRead(true);
        
        return true;
    },

    loadBody: function (body) {
        this.loadBodyQueued = false;

        if (this.expanded && body && body.path && body.path !== this.currentBodyPath) {
            console.log("setting url to " + body.path);

            // attempt to pin body so it doesn't get purged while we're displaying it
            // on success, calls displayBody; on failure, calls pinFailed
            this.currentBodyPath = body.path;
            this.$.bodyPinner.setPath(body.path);
        }
    },

    displayBody: function () {
        var body = this.email.getBodyPart();
        this.$.body.loadUrl("file://" + body.path, body.mimeType);
    },

    pinFailed: function () {
        // Failed to pin file. Might have been purged from filecache. Need to download again.
        this.downloadBody();
    },

    openLink: function (sender, url) {
        // TODO remove this logging
        this.log("### Opening URL", url);

        // Launch default app for handling this url
        this.$.appMgrOpen.call({target: url, subscribe: false});
    },
    
    inspectElement: function(sender, event, props) {
        var tapInfo = props;
    
        if (tapInfo.linkUrl || tapInfo.imageSrc) {
            var items = [];
        
            if (tapInfo.linkUrl) {
                items.push({caption: $L("Open Link"), value: "bodyOpenLink"});
                items.push({caption: $L("Copy URL"), value: "bodyCopyUrl"});
            }

            if (tapInfo.imageSrc) {
                // FIXME only works with webview
                items.push({caption: $L("Copy To Photos"), value: "bodyCopyImage"});
            }
            
            // save tap info
            this.bodyTapInfo = tapInfo;
            
            // open menu
            this.$.inspectElementContextMenu.setItems(items);
            this.$.inspectElementContextMenu.openAtEvent(event);
            
            return true;
        }
    },
    
    inspectElementContextMenuSelect: function (inSender, selected) {
        var action = selected.getValue();
        
        var tapInfo = this.bodyTapInfo;
        this.bodyTapInfo = null;

        if (this[action]) {
            this[action](tapInfo);
        }
    },

    bodyOpenLink: function (tapInfo) {
        if (tapInfo.linkUrl) {
            this.$.appMgrOpen.call({target: tapInfo.linkUrl});
        }
    },

    bodyCopyUrl: function (tapInfo) {
        enyo.dom.setClipboard(tapInfo.linkUrl);
        enyo.application.dashboardManager.generalNotification($L("Link Copied to clipboard"));
    },
    
    bodyCopyImage: function() {
        MailErrorDialog.displayError(this, {message: $L("Not implemented")});
    },

    changeReadStatus: function (isRead) {
        Email.updateEmailProps({id: this.email.getId()}, {flags: {read: isRead}});
        this.email.data.flags.read = true;
        this.updateHeader();
    },
    
    // FIXME merge and refactor with code in EmailList.js
    isToday: function (timestamp) {
        var lastMidnight = new Date();
        lastMidnight.setHours(0);
        lastMidnight.setMinutes(0);
        lastMidnight.setSeconds(0);
        var todayStart = lastMidnight.getTime();
        var tomorrowStart = todayStart + 86400000; // (1000 * 60 * 60 *24)
        return timestamp >= todayStart && timestamp < tomorrowStart;
    },
    
    formatTime: function(timestamp) {
        if (this.isToday(timestamp)) {
            // Today
            return this.todayFormatter.format(new Date(timestamp));
        } else if (new Date().getTime() < timestamp + 86400000 * 6) {
            // Last six days (roughly)
            return this.recentFormatter.format(new Date(timestamp));
        } else {
            return this.dateFormatter.format(new Date(timestamp));
        }
    },

    recipientTable: {
        to: $L("To"),
        cc: $L("Cc"),
        bcc: $L("Bcc")
    },

    makeRecipientsSummaryHtml: function (recipients, recipientTable) {
        var o = "";
        for (var i = 0, t = "", nt, r; !!(r = recipients[i]); i++) {
            if (r.type === "to" || r.type === "cc") {
                nt = r.type != t;
                if (nt) {
                    var caption = EmailApp.Util.interpolate($L("#{hdr}:"), {hdr: this.recipientTable[r.type || "to"]});
                    if (o) {
                        caption = "&nbsp;&nbsp;" + caption;
                    }
                    o += '<div class="mail-body-recipients-caption">' + caption + "</div>";
                } else if (i <= recipients.length - 1) {
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
    
    resizeHandler: function() {
        //console.log("MessageView resized!");
        this.inherited(arguments);
        
        if (this.$.body.isReady()) {
            this.$.body.fitWidth(true);
        }
    },

    expandedChanged: function () {
        //console.log("setting message " + this.email.getId() + " to expanded = " + this.expanded);

        if (this.expanded) {
            this.$.preview.hide();
            this.$.body.show();
            
            if (this.enableFooter) {
                this.$.footer.show();
            }
            this.$.body.activate();

            this.$.recipientsBox.show();
            this.$.subjectBox.show();
            this.$.header.addClass("expanded");

            this.updateBody();
            this.checkBlocked();
        } else {
            this.$.preview.show();
            this.$.body.deactivate();
            this.$.body.hide();
            this.$.footer.hide();

            this.$.recipientsBox.hide();
            this.$.subjectBox.hide();
            this.$.header.removeClass("expanded");
            this.$.remoteContentWarning.hide();
        }

        // Hide/show meeting buttons
        this.updateMeetingButtons();
        
        this.resized();
    },
    
    checkBlocked: function() {
        if (this.$.body.wasRemoteContentBlocked()) {
            var loadRemoteContent = enyo.application.prefs.get("loadRemoteContent");
            if (loadRemoteContent === AccountPreferences.LOAD_REMOTE_ASK) {
                this.$.remoteContentWarning.show();
            }
        }
    },
    
    checkDisableAccel: function () {
        // work around accelerated rendering limits on some versions of webOS
        var bounds = this.getBounds();
        
        if (bounds.width > 4096 || bounds.height > 4096) {
            this.removeClass("accel");
        }
        
        return true;
    },

    viewReady: function () {
        this.checkBlocked();
        
        // Collapse quoted text
        this.$.body.collapseQuotedText();
        
        this.checkDisableAccel();
    },
    
    viewSizeChange: function () {
        this.checkDisableAccel();
    },
    
    unblockRemoteContent: function(sender) {
        this.$.remoteContentWarning.hide();
        this.blockRemoteContent = false;
        this.updateBody();
        
        return true;
    },
    
    // [public]
    isRead: function () {
        return !!this.email.getFlags().read;
    },

    // [public]
    autoMarkRead: function (force) {
        if (!this.email.canModifyEmail() || this.email.getFlags().read) {
            return;
        }
    
        if (force || (!this.autoReadTriggered && this.expanded && this.$.body.isReady())) {
            // mark as read -- FIXME, only do this if the email isn't readonly
            this.changeReadStatus(true);
            this.autoReadTriggered = true;
        }
    },

    /* Called when the user responds to a meeting invite/update/cancellation */
    handleMeetingResponse: function (sender, responseType, sendEmailToOrganizer, responseText) {
        this.$.meetingInfo.sendMeetingResponse(this.email, responseType, sendEmailToOrganizer, responseText);
    },
    
    lookupSenderPhoto: function () {
        if (!EmailApp.Util.onDevice()) {
            return;
        }

        var imgBlock = this.$.contactPhotoSmall;
        var self = this;
        var cache = enyo.application.contactCache;
        
        cache.lookupContact(this.email.data.from.addr, function (contactDetails) {
            if (contactDetails) {
                var name = contactDetails.getName();
                
                if (name) {
                    self.$.from.setContent(name);
                }
            
                contactDetails.lookupPhoto(function (path) {
                    imgBlock.setSrc(path);
                });
            }
        });
    },
    
    senderClick: function () {
        this.log("sender click");
        this.showPseudoDetails(this.email.getFrom());
        
        return true;
    },
    
    showPseudoDetails: function (contactDetails) {
        this.$.pseudoDetails.validateComponents();

        var thisInstance = this;
        ContactsLib.Person.findByEmail(contactDetails.addr).then(function (fut) {
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
    
    recipientsClick: function (sender, event) {
        var items = enyo.map(this.email.getRecipients(), function (recipient) {
            var caption = EmailApp.Util.interpolate($L("#{hdr}:"), {hdr: this.recipientTable[recipient.type || "to"]});
            return { caption: caption + " " + (recipient.name || recipient.addr), value: recipient };
        }, this);
        
        // Add "copy" item
        // Disabled because address widget doesn't support paste
        //items.unshift({caption: $L("Copy Recipients"), value: "", copyAll: true});
        
        this.$.recipientsPopup.setItems(items);
        this.$.recipientsPopup.openAtEvent(event);
    
        return true;
    },
    
    recipientSelect: function (sender, selected) {
        var recipient = selected.getValue();
        
        if (recipient) {
            this.showPseudoDetails(recipient);
        } else if (selected.copyAll) {
            var recipientsString = enyo.map(this.email.getRecipients(), function (recipient) {
                return recipient.addr;
            }).join(", ");
        
            enyo.dom.setClipboard(recipientsString);
            enyo.application.dashboardManager.generalNotification($L("Recipients Copied to clipboard"));
        }
    }
});

