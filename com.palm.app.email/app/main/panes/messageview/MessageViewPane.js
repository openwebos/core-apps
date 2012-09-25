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
    name: "MessageViewPane",
    kind: "VFlexBox",

    style: "background-color: #e4e4e2; width: 100%",

    published: {
        conversation: null,
        nextPrevQueryInfo: null
    },

    events: {
        onComposeMessage: "",
        onConversationDeleted: "",
        onNext: "",
        onPrevious: ""
    },

    components: [
        {name: "loader", kind: "ConversationLoader", onEmailsLoaded: "emailsLoaded", onEmailsUpdated: "emailsUpdated", subscribe: true},
        {name: "nextPrevLoader", kind: "NextPrevLoader", onNextChanged: "nextUpdated", onPrevChanged: "prevUpdated"},
        
        /*{name: "dummyWebview", kind: "WebView", height: "0px", width: "0px", style: "position: absolute"},*/
        {style: "position: relative", components: [
            // not sure why this is needed; otherwise doesn't size properly when larger than 320px
            {className: "header-shadow", style: "position: absolute"}
        ]},
        {name: "headerToolbar", height: 50, kind: "Toolbar", className: "enyo-toolbar-light", style: "z-index:2;", components: [
            {name: "printButton", onclick: "printClick", showing: true, kind: "enyo.CustomButton", className: "print-button",
                components: [
                    {kind: "Control", className: "print-icon"}
                ]},
            {name: "archiveButton", kind: "Button", className: "no-overflow-button enyo-button-light", style: "margin-right:11px;", onclick: "archiveClick", caption: $L("Archive") },
            {flex: 1},
            {name: "flagButton", showing: true, kind: "enyo.CustomButton", toggling: true, onclick: "toggleFlagged", className: "enyo-button flag", components: [
                {kind: "Control", className: "flag-icon"}
            ]},
            {name: "markUnreadToggle", kind: "Button", className: "no-overflow-button mark-unread-button enyo-button-light", style: "margin-right:11px;", onclick: "toggleRead", caption: $L("Mark as unread") }
        ]},
        {name: "pane", kind: "Pane", flex: 1, components: [
            {name: "placeholderPane", layoutKind: "VFlexLayout", align: "center", pack: "center", components: [
                {kind: "Image", src: "../images/email-by-webos.png"}
            ]},
            {name: "conversationPane", layoutKind: "VFlexLayout", components: [
                {name: "threadHeader", kind: "enyo.HFlexBox", className: "thread-header", components: [
                    {name: "threadSubject", flex: 1, className: "thread-subject-text", onmousehold: "toggleCollapseAll"},
                    {name: "threadUnreadCount", className: "thread-unread-count", onclick: "unreadCountClick"}
                ]},
                {style: "position: relative", components: [
                    {className: "thread-header-shadow"}
                ]},
                {name: "conversationView", kind: "ConversationView", flex: 1, onComposeMessage: "doComposeMessage"}
            ]}
        ]},
        {kind: "Toolbar", flex: 0, name: "toolbar", className: "enyo-toolbar-light", components: [
            {name: "slidingDrag", slidingHandler: true, kind: "GrabButton" },
            {kind: "Control", className: "toolbar-spacer", width: "40px", flex: 1},
            {name: "replyCommandItem", icon: "../images/icons/toolbar-icon-reply.png", onclick: "showReplyContext"},
            {kind: "Control", className: "toolbar-spacer"},
            {name: "movetoCommandItem", icon: "../images/icons/toolbar-icon-moveto.png", onclick: "moveClick"},
            {kind: "Control", className: "toolbar-spacer"},
            {name: "deleteCommandItem", icon: "../images/icons/toolbar-icon-delete.png", onclick: "deleteClick"},
            
            {className: "toolbar-spacer", flex: 1},
            
            {kind: "enyo.OrderedContainer", className: "enyo-radiogroup", name: "nextPrevBox", style: "margin-right: 20px", components: [
                {kind: "enyo.RadioButton", className: "enyo-radiobutton", icon: "../images/previous-email-icon.png", disabled: false, name: "prevButton", onclick: "prevClick"},
                {kind: "enyo.RadioButton", className: "enyo-radiobutton", icon: "../images/next-email-icon.png", disabled: false, name: "nextButton", onclick: "nextClick"}
            ]},
            
            // Popup menus
            {name: "replyContextMenu", kind: "PopupSelect", onSelect: "composeMessage", items: [
                {caption: $L("Reply"), value: "reply"},
                {caption: $L("Reply All"), value: "replyall"},
                {caption: $L("Forward"), value: "forward"}
            ]},
            {name: "moveToDialog", kind: "SelectFolderPopup", caption: $L("Move to Folder"), iconStyle: "full", onSelect: "moveToFolderSelected"}
        ]},
        {style: "position: relative", components: [
            // not sure why this is needed; otherwise doesn't size properly when larger than 320px
            {className: "footer-shadow", style: "position: absolute; bottom: 0px"}
        ]}
    ],

    create: function () {
        this.inherited(arguments);

        this.emails = [];

        this.updateToolbars();
    },

    // [public]
    getAppMenuConfigs: function (viewHidden) {
        var result;
        result = {
            printMenuItem: {onclick: "printClick", disabled: !this.conversation}
        };
        return result;
    },

    // Display popup with choice of reply, reply all, or forward
    showReplyContext: function (sender, event) {
        this.$.replyContextMenu.openAtEvent(event);
    },

    deleteClick: function () {
        if (this.ignoreDeleteTaps) {
            return true;
        }

        if (enyo.application.prefs.get('confirmDeleteOnSwipe')) {
            var threading = EmailApp.Util.isThreadingEnabled();
        
            MailDialogPrompt.displayPrompt(this, {
                caption: threading ? $L("Delete Email Thread") : $L("Delete Email"),
                message: threading ? $L("Delete this email thread?") : $L("Delete this email?"),
                acceptButtonCaption: $L("Delete"),
                onAccept: "deleteConfirmed"
            });
        } else {
            this.deleteConfirmed();
        }
        
        return true;
    },

    deleteConfirmed: function () {
        Email.deleteEmails({ids: this.getEmailIds()});
        this.conversationDeleted();
    },

    getEmailIds: function () {
        var ids = [];
        this.emails.forEach(function (elem) {
            ids.push(elem._id);
        });
        return ids;
    },

    composeMessage: function (sender, selection) {
        if (!this.emails || this.emails.length === 0) {
            return;
        }
    
        var newestEmail = this.oldestFirst ? this.emails[this.emails.length - 1] : this.emails[0];
    
        this.doComposeMessage({
            action: selection.getValue(),
            originalMessage: newestEmail
        });
    },

    moveClick: function (sender, event) {
        if (!this.emails.length) {
            return true;
        }
        // we may have to tweak this if conversations ever span multiple accounts
        var accountId = enyo.application.folderProcessor.getFolderAccount(this.emails[0].folderId);
        this.$.moveToDialog.loadFolders(accountId);
        this.$.moveToDialog.openAtCenter();
        
        return true;
    },

    moveToFolderSelected: function (inSender, folder) {
        var targetFolderId = folder._id;
        
        // FIXME: filter out emails that are already in that folder
        Email.moveEmailsToFolder({ids: this.getEmailIds()}, targetFolderId);
        this.conversationDeleted();
    },
    
    archiveClick: function () {
        if (true) {
            var threading = EmailApp.Util.isThreadingEnabled();
        
            MailDialogPrompt.displayPrompt(this, {
                caption: threading ? $L("Archive Email Thread") : $L("Archive Email"),
                message: threading ? $L("Archive this email thread?") : $L("Archive this email?"),
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
            Email.moveEmailsToFolder({ids: this.getEmailIds()}, archiveFolderId);
            this.conversationDeleted();
        } else {
            console.error("no archive folder");
        }
    },

    getUnreadCount: function () {
        var unreadCount = 0;

        for (var i = 0; i < this.emails.length; i++) {
            if (!this.emails[i].flags.read) {
                unreadCount++;
            }
        }

        return unreadCount;
    },

    isAllRead: function () {
        return this.getUnreadCount() === 0;
    },

    isAnyFlagged: function () {
        for (var i = 0; i < this.emails.length; i++) {
            if (this.emails[i].flags.flagged) {
                return true;
            }
        }

        return false;
    },

    markReadClick: function () {
        this.changeReadStatus(true);
        
        return true;
    },

    markUnreadClick: function () {
        this.changeReadStatus(false);
        
        return true;
    },

    markFlaggedClick: function () {
        this.changeFlaggedStatus(true);
        
        return true;
    },

    markUnflaggedClick: function () {
        this.changeFlaggedStatus(false);
        
        return true;
    },

    changeReadStatus: function (readStatus) {
        Email.updateEmailProps({ids: this.getEmailIds()}, {flags: {read: readStatus}});
    },

    changeFlaggedStatus: function (flaggedStatus) {
        Email.updateEmailProps({ids: this.getEmailIds()}, {flags: {flagged: flaggedStatus}});
    },

    conversationChanged: function () {
        this.updateToolbars();
        
        this.oldestFirst = enyo.application.prefs.get("threadViewOldestFirst") || false;
        
        this.$.loader.setOldestFirst(this.oldestFirst);

        if (!this.conversation) {
            this.$.loader.setConversation(null);
            this.emails = [];
            this.$.conversationView.setEmails([]);
            this.$.threadHeader.hide();

            this.$.pane.selectViewByName("placeholderPane", true);

            return;
        }

        this.$.pane.selectViewByName("conversationPane", true);

        this.$.threadHeader.show();
        this.$.threadSubject.setContent(this.conversation.getSubject() || $L("No Subject"));

        this.$.loader.setConversation(this.conversation);
        
        // clear next/previous
        this.$.nextPrevLoader.setConversation(this.conversation);
    },
    
    getAccount: function () {
        var accountId = this.conversation && this.conversation.getAccountId();
        return enyo.application.accounts.getAccount(accountId);
    },
    
    canArchive: function () {
        var account = this.getAccount();
        var inboxFolderId = account && account.getInboxFolderId();
        var archiveFolderId = account && account.getArchiveFolderId();
        
        return archiveFolderId && this.conversation && this.conversation.getFolderId() === inboxFolderId;
    },

    updateToolbars: function () {
        var disabled = !this.conversation;

        // header toolbar
        this.$.markUnreadToggle.setShowing(!disabled);
        this.$.flagButton.setShowing(!disabled);
        this.$.printButton.setDisabled(disabled);
        
        this.$.archiveButton.setShowing(!disabled && this.canArchive());

        // footer toolbar
        this.$.deleteCommandItem.setDisabled(disabled);
        this.$.movetoCommandItem.setDisabled(disabled);
        this.$.replyCommandItem.setDisabled(disabled);

        if (this.conversation && !this.isAllRead()) {
            this.$.markUnreadToggle.setCaption($L("Mark As Read"));
            this.$.markUnreadToggle.onclick = "markReadClick";
        } else {
            this.$.markUnreadToggle.setCaption($L("Mark As Unread"));
            this.$.markUnreadToggle.onclick = "markUnreadClick";
        }

        if (this.conversation && !this.isAnyFlagged()) {
            this.$.flagButton.setDepressed(false);
            this.$.flagButton.onclick = "markFlaggedClick";
        } else {
            this.$.flagButton.setDepressed(true);
            this.$.flagButton.onclick = "markUnflaggedClick";
        }
        
        // Update unread count
        var unreadCount = this.getUnreadCount();
        this.$.threadUnreadCount.setShowing(unreadCount > 0);
        this.$.threadUnreadCount.setContent("" + unreadCount);
    },

    emailsLoaded: function (sender, emails) {
        // FIXME: already sorted; remove this later if we don't need it
        //this.emails = emails.sort(function (a, b) {
        //	return a.timestamp < b.timestamp;
        //});

        this.emails = emails;

        // FIXME this is pretty slow; may need to use a VirtualRepeater instead
        this.$.conversationView.setEmails(emails);

        // Expand the newest email as well as any unread emails
        // TODO: confirm behavior with HI
        
        var indexToSelect = -1;
        
        if (this.oldestFirst) {
            // Find first unread email
            this.$.conversationView.forEachMessageView(function (control, i) {
                var unread = !control.getEmail().getFlags().read;
                
                // Select first unread
                if (unread && indexToSelect < 0) {
                    indexToSelect = i;
                }
            });
            
            if (indexToSelect < 0) {
                // Set to last email, even if it's read
                indexToSelect = this.emails.length - 1;
            }
        } else {
            indexToSelect = 0;
        }
        
        // Expand unread emails and the latest email (whether unread or not)
        this.$.conversationView.forEachMessageView(function (control, i) {
            var unread = !control.getEmail().getFlags().read;

            control.setExpanded(i === indexToSelect || unread);
            
            // Selected email is also marked read
            if (i === indexToSelect) {
                control.autoMarkRead(true);
            }
            
            // Only show footer buttons if there's more than one email
            control.setEnableFooter(this.emails.length > 1);
        }, this);
        
        if (indexToSelect > 0) {
            // scroll to newest
            this.$.conversationView.scrollToMessageIndex(indexToSelect, true);
        } else {
            this.$.conversationView.scrollToTop(true);
        }

        this.updateToolbars();
    },

    emailsUpdated: function (sender, updates) {
        this.log("email updates: " + updates.newEmails.length +
            " new, " + updates.deletedEmails.length + " deleted, " +
            updates.updatedEmails.length + " updated");

        this.emails = updates.allEmails;
        this.$.conversationView.setEmails(updates.allEmails);

        if (this.emails && this.emails.length > 0) {
            this.updateToolbars();
        } else {
            // no emails
            this.conversationDeleted();
        }
    },
    
    conversationDeleted: function () {
        this.setConversation(null);
        this.doConversationDeleted();
    },

    toggleCollapseAll: function () {
        // Check if any are expanded
        var expandAll = true;
        this.$.conversationView.forEachMessageView(function (control, i) {
            if (control.getExpanded()) {
                // If any are expanded, we should collapse all instead of expand all
                expandAll = false;
            }
        }, this);

        this.$.conversationView.forEachMessageView(function (control, i) {
            control.setExpanded(expandAll);
        }, this);

        this.$.conversationView.scrollToTop();
        this.$.conversationView.resized();
    },
    
    // Scroll to next unread
    unreadCountClick: function () {
        var found = false;
        this.$.conversationView.forEachMessageView(function (control, i) {
            if (!control.isRead() && !found) {
                this.$.conversationView.scrollToMessageIndex(i);
                control.setExpanded(true);
                control.autoMarkRead(true);
                found = true;
            }
        }, this);
        
        return true;
    },
    
    resizeHandler: function () {
        var showNextPrev = this.getBounds().width >= 448;
        this.$.nextPrevBox.setShowing(showNextPrev);
        
        return this.inherited(arguments);
    },
    
    nextPrevQueryInfoChanged: function () {
        this.$.nextPrevLoader.setQueryInfo(this.nextPrevQueryInfo);
    },
    
    nextUpdated: function () {
        this.$.nextButton.setDisabled(!this.$.nextPrevLoader.getNextConversation());
    },
    
    prevUpdated: function () {
        this.$.prevButton.setDisabled(!this.$.nextPrevLoader.getPrevConversation());
    },
    
    nextClick: function () {
        this.doNext(this.$.nextPrevLoader.getNextConversation());
        return true;
    },
    
    prevClick: function () {
        this.doPrevious(this.$.nextPrevLoader.getPrevConversation());
        return true;
    }
});
