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

/*global console, enyo, $L, Email, EmailApp
 */

enyo.kind({
    name: "MessagePane",
    kind: enyo.VFlexBox,
    className: "basic-back",
    published: {
        /* setMessage() and setUri() are the two external triggers that start things going. */
        defaultAccountId: null, // use this as the default account id, if provided
        standalone: false
    },
    events: {
        onNext: "",
        onPrevious: "",
        onComposeMessage: "",
        onMessageDeleted: "",
        onOpenNewCard: "",
        onSelectionUpdated: ""
    },
    components: [
        {name: "pane", kind: "Pane", flex: 1, onSelectView: "paneViewSelected", components: [
            // DEFAULT PANE
            {name: "placeholder", className: "body-placeholder", style: "text-align: center;min-width:192px;", height: "100%", kind: "VFlexBox", components: [
                {kind: "Toolbar", className: "enyo-toolbar-light", style: "z-index:2;", components: [
                    {kind: "Control", className: "toolbar-spacer"},
                    {disabled: true, icon: "../images/header-print-icon.png"},
                    {kind: "Control", className: "toolbar-spacer"},
                    {disabled: true, icon: "../images/icons/toolbar-icon-moveto.png"},
                    {flex: 1}
                ]},
                {className: "header-shadow"},
                {kind: "Spacer", flex: 1},
                {kind: "Image", src: "../images/email-by-webos.png"},
                {kind: "Spacer"},
                {className: "footer-shadow"},
                {kind: "Toolbar", layoutKind: "HLayout", align: "center", className: "disabled-toolbar enyo-toolbar-light", components: [
                    {name: "placeholderSlidingDrag", slidingHandler: true, kind: "GrabButton" },
                    {kind: "Control", width: "40px", className: "toolbar-spacer"},
                    {disabled: true, icon: "../images/icons/toolbar-icon-reply.png"},
                    {kind: "Control", className: "toolbar-spacer"},
                    {disabled: true, icon: "../images/icons/toolbar-icon-replyall.png"},
                    {kind: "Control", className: "toolbar-spacer"},
                    {disabled: true, icon: "../images/icons/toolbar-icon-forward.png"},
                    {kind: "Control", className: "toolbar-spacer"},
                    {disabled: true, icon: "../images/icons/toolbar-icon-delete.png"}
                ]}
            ]},
            {name: "loadWait", className: "body-placeholder", align: "center", pack: "center", kind: "VFlexBox", lazy: true, components: [
                {name: "loadSpinner", kind: "SpinnerLarge"},
                {className: "mail-back", style: "line-height: 50px", content: $L("Loading email")}
            ]},

            // MESSAGE VIEW
            {name: "message", kind: "VFlexBox", style: "overflow: hidden;", flex: 1, components: [
                // top chrome
                {name: "bodyHeader", kind: "Toolbar", className: "enyo-toolbar-light", style: "z-index:2;", components: [
                    {name: "printButton", onclick: "printClick", showing: true, kind: "enyo.CustomButton", className: "print-button",
                        components: [
                            {kind: "Control", className: "print-icon"}
                        ]},
                    {kind: "Control", className: "toolbar-spacer"},
                    {name: "moveToFolderCommandItem", icon: "../images/icons/toolbar-icon-moveto.png", onclick: "moveToFolderClick"},
                    {flex: 1},
                    {name: "flagButton", showing: true, kind: "enyo.CustomButton", toggling: true, onclick: "toggleFlagged", className: "enyo-button flag", components: [
                        {kind: "Control", className: "flag-icon"}
                    ]},
                    {name: "markUnreadToggle", kind: "Button", className: "no-overflow-button mark-unread-button enyo-button-light", style: "margin-right:11px;", onclick: "toggleRead", caption: $L("Mark as unread") }
                ]},
                {className: "header-shadow"},
                {name: "messageLoader", kind: "MessageLoader"},
                {className: "footer-shadow"},
                {kind: "Toolbar", layoutKind: "HLayout", align: "center", name: "commandMenu", className: "enyo-toolbar-light", components: [
                    {name: "slidingDrag", slidingHandler: true, kind: "GrabButton" },
                    {kind: "Control", className: "toolbar-spacer", width: "40px"},
                    {icon: "../images/icons/toolbar-icon-reply.png", onclick: "replyClick"},
                    {kind: "Control", className: "toolbar-spacer"},
                    {icon: "../images/icons/toolbar-icon-replyall.png", onclick: "replyAllClick"},
                    {kind: "Control", className: "toolbar-spacer"},
                    {icon: "../images/icons/toolbar-icon-forward.png", onclick: "forwardClick"},
                    {kind: "Control", className: "toolbar-spacer"},
                    {name: "deleteCommandItem", icon: "../images/icons/toolbar-icon-delete.png", onclick: "deleteClick"},
                    {kind: "Control", name: "navgroupSpacer", className: "toolbar-spacer", showing: false},
                    {kind: enyo.VFlexBox, name: "navgroup", style: "position:absolute;right:14px;margin:6px 0;", showing: false, width: "118px", components: [
                        {kind: "RadioGroup", name: "radioSelection", components: [
                            {icon: "../images/previous-email-icon.png", disabled: true, name: "prevButton", onclick: "goToPrevEmail"},
                            {icon: "../images/next-email-icon.png", disabled: true, name: "nextButton", onclick: "goToNextEmail"}
                        ]}
                    ]}
                ]}
            ]}
        ]},
        // end pane

        {name: "moveToDialog", kind: "SelectFolderPopup", caption: $L("Move to Folder"), iconStyle: "full", onSelect: "moveToFolderSelected"}
    ],

    setupNextPreviousMessages: function () {
        var messageLoader = this.$.messageLoader;
        this.nextMessages = {};
        // Don't set up Next and Previous messages for drafts and sent folders
        if (messageLoader.isDraftEmail()) {
            return;
        }
        if (!this.filteredList) {
            // query db directly
            this.nextMessageRequest = Email.getNextMessage(messageLoader.message, true, this.nextPrevQueryBase, this.handleNextMessageResponse.bind(this, this.NEXT_KEY));
            this.prevMessageRequest = Email.getPreviousMessage(messageLoader.message, true, this.nextPrevQueryBase, this.handleNextMessageResponse.bind(this, this.PREV_KEY));
        } else {
            this._nextPrevFromFilteredSet(messageLoader);
        }
    },

    _nextPrevFromFilteredSet: function (messageLoader) {
        if (this.currentFilterPos === undefined) {
            this.currentFilterPos = -1;
            // filtered results can be very jumbled up depending on sort orders
            // Can't hope for anything more efficient than a linear search
            for (var i = 0; i < this.filteredList.length; ++i) {
                if (messageLoader.message._id === this.filteredList[i]._id) {
                    this.currentFilterPos = i;
                    break;
                }
            }
        }
        // fudge next and previous responses
        if (this.currentFilterPos > -1 && this.currentFilterPos < (this.filteredList.length - 1)) {
            this.handleNextMessageResponse(this.NEXT_KEY, {
                results: [this.filteredList[this.currentFilterPos + 1]]
            });
        } else {
            this.handleNextMessageResponse(this.NEXT_KEY, {});
        }
        if (this.currentFilterPos > 0) {
            this.handleNextMessageResponse(this.PREV_KEY, {
                results: [this.filteredList[this.currentFilterPos - 1]]
            });
        } else {
            this.handleNextMessageResponse(this.PREV_KEY, {});
        }
    },

    handleNextMessageResponse: function (typeString, resp) {
        // EmailApp.Util.printObj("### this is our response", resp);
        var navigationDiv = this.$[typeString + 'Button'];
        var target = resp.results && resp.results[0];
        this.nextMessages[typeString] = target;

        if (!navigationDiv) {
            console.log("navigation div does not yet exist");
        } else {
            navigationDiv.setDisabled(!target);
        }
    },

    goToNextEmail: function () {
        this.navigateEmail(this.NEXT_KEY, this.$.messageLoader);
    },

    goToPrevEmail: function () {
        this.navigateEmail(this.PREV_KEY, this.$.messageLoader);
    },
    nextMessage: function (direction) {
        if (this.nextMessages !== undefined && this.nextMessages[direction] !== undefined) {
            return this.nextMessages[direction];
        }
        return undefined;
    },
    navigateEmail: function (direction, messageLoader) {
        var details = this.nextMessage(direction);
        if (!details) {
            return;
        }
        if (this.currentFilterPos !== undefined) {
            this.currentFilterPos += ((direction === this.NEXT_KEY) ? 1 : -1);
        }
        this.setMessage(details, this.nextPrevQueryBase);
        this.doSelectionUpdated(messageLoader.message._id);
    },

    _cleanupNextPreviousQueries: function () {
        if (this.nextMessageRequest) {
            this.nextMessageRequest.cancel();
            this.nextMessageRequest = undefined;
        }

        if (this.prevMessageRequest) {
            this.prevMessageRequest.cancel();
            this.prevMessageRequest = undefined;
        }
    },


    exposeNextPrev: function () {
        this.$.navgroup.setShowing(true);
    },

    hideNextPrev: function () {
        this.$.navgroup.setShowing(false);
    },


    create: function () {

        this.inherited(arguments);

        if (this.standalone) {
            this.$.slidingDrag.hide();
        }
    },

    destroy: function () {
        if (this._deleteTimer) {
            clearTimeout(this._deleteTimer);
            this._deleteTimer = null;
        }
        this.inherited(arguments);
    },

    getAppMenuConfigs: function (viewHidden) {
        var messageLoader = this.$.messageLoader;
        var result;
        result = {
            printMenuItem: {onclick: "printClick", disabled: !messageLoader.email},
            openNewCard: {onclick: "openNewCardClick", disabled: !messageLoader.email, showing: false}
        };
        return result;
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

    getNextFocusableMessage: function (isDeletion) {
        // TODO: this will have to be enhanced later, now that we're
        // bringing back message sorting. I told you guys it was useful!
        if (!this.$.messageLoader.message || !this.nextMessages) {
            return undefined;
        }

        var next = this.nextMessages[this.NEXT_KEY],
            prev = this.nextMessages[this.PREV_KEY];

        // deletion flips the next/prev behavior
        return (isDeletion) ? (prev || next) : (next || prev);
    },

    confirmDelete: function () {
        var messageLoader = this.$.messageLoader;
        if (!messageLoader.email) {
            return;
        }
        messageLoader.email.deleteEmail(enyo.dispatchBack);
        this.doMessageDeleted({
            deleted: messageLoader.message,
            next: this.getNextFocusableMessage(true)
        });
        this._tempDisableDeletes();
    },

    _tempDisableDeletes: function () {
        var that = this;
        this.ignoreDeleteTaps = true;
        this._deleteTimer = setTimeout(function () {
            that.ignoreDeleteTaps = false;
        }, 1000);
    },
    activate: function () {
        this.log();
        this.$.messageLoader.callBody("activate");
    },
    replyClick: function () {
        var messageLoader = this.$.messageLoader;
        this.doComposeMessage({
            action: "reply",
            accountId: messageLoader.email.getAccountId() || this.defaultAccountId,
            originalMessage: messageLoader.email.data,
            bodyHTML: messageLoader.getBodyHTML()
        });
    },
    replyAllClick: function () {
        var messageLoader = this.$.messageLoader;
        this.doComposeMessage({
            action: "replyall",
            accountId: messageLoader.email.getAccountId() || this.defaultAccountId,
            originalMessage: messageLoader.email.data,
            bodyHTML: messageLoader.getBodyHTML()
        });
    },
    forwardClick: function () {
        var messageLoader = this.$.messageLoader;
        this.doComposeMessage({
            action: "forward",
            accountId: messageLoader.email.getAccountId() || this.defaultAccountId,
            originalMessage: messageLoader.email.data,
            bodyHTML: messageLoader.getBodyHTML()
        });
    },

    initPrintDialog: function () {
        if (!this.$.printDialog) {
            this.createComponent({kind: "PrintDialog",
                duplexOption: true,
                colorOption: true,
                onRenderDocument: "renderDocument",
                appName: "Email",
                owner: this
            });
        }
    },

    printClick: function () {
        if (this.$.messageLoader.email) {
            this.initPrintDialog();
            this.$.printDialog.openAtCenter();
        }
    },

    openNewCardClick: function () {
        var messageLoader = this.$.messageLoader;
        if (messageLoader.email) {
            this.doOpenNewCard("email", {message: messageLoader.email.data});
        }
    },

    renderDocument: function (inSender, inJobID, inPrintParams) {
        this.$.messageLoader.callBody("printFrame",
            ["",
             inJobID,
             inPrintParams.width,
             inPrintParams.height,
             inPrintParams.pixelUnits,
             false,
             inPrintParams.renderInReverseOrder]);
    },
    toggleRead: function () {
        var messageLoader = this.$.messageLoader;
        var read = !!messageLoader.email.getFlags().read;

        messageLoader.email.setRead(!read);

        this.updateMenu(messageLoader);
    },
    toggleFlagged: function () {
        var messageLoader = this.$.messageLoader;
        var flagged = !!messageLoader.email.getFlags().flagged;

        messageLoader.email.setFlagged(!flagged);

        this.updateMenu(messageLoader);

    },
    moveToFolderClick: function () {
        // this path is retarded. We should have an accountId on the email itself
        var folderId = this.$.messageLoader.message.folderId;
        var accountId = enyo.application.folderProcessor.getFolderAccount(folderId);

        this.$.moveToDialog.loadFolders(accountId);
        this.$.moveToDialog.openAtCenter();
    },

    moveToFolderSelected: function (inSender, folder) {
        var targetFolderId = folder._id;
        this.$.messageLoader.email.moveToFolder(targetFolderId);
    },

    // This exists so the date can be re-rendered using an updated
    // whenFormatter, and is exposed so the MailApp can call this when needed.
    tryUpdateHeaderTime: function () {
        this.$.messageLoader.tryUpdateHeaderTime();
    },

    updateMenu: function (messageLoader) {
        var isRead = messageLoader.email.getFlags().read;
        var isFlagged = messageLoader.email.getFlags().flagged;
        this.$.markUnreadToggle.setCaption(isRead ? $L("Mark As Unread") : $L("Mark As Read"));
        this.$.flagButton.setDepressed(isFlagged);
        this.updateFlagged(isFlagged);

        if (!messageLoader.email.canModifyEmail()) {
            // Hide some of the command menu items
            this.$.moveToFolderCommandItem.setShowing(false);
            this.$.deleteCommandItem.setShowing(false);
            this.$.markUnreadToggle.setShowing(false);
            this.$.flagButton.setShowing(false);
        }
    },
    showLoadingPane: function () {
        this.$.pane.selectViewByName("loadWait", true);
    },

    // Force showing the placeholder
    showPlaceholder: function (immediately) {
        this.$.pane.selectViewByName("placeholder", immediately);
    },


    resetNavButtons: function () {
        this.$.radioSelection.setValue(null);
        this.$.prevButton.setDepressed(false);
        this.$.nextButton.setDepressed(false);
    },

    grabFilteredList: function () {
        var that = this, query = this.nextPrevQueryBase;
        if (!query.from) {
            query.from = 'com.palm.email:1';
        }
        this.filteredListRequest = EmailApp.Util.callService('palm://com.palm.db/search', {
                query: query
            },
            function (resp) {
                that.filteredList = resp.results;
                that.setupNextPreviousMessages();
            }.bind(this)
        );
    },

    paneViewSelected: function (inSender, inView, inPrevious) {
        if (inView === this.$.loadWait) {
            // This is currently hogs CPU pretty badly; disabled until it improves
            //this.$.loadSpinner.show();
            //this.$.loadSpinner.start();
        } else {
            if (this.$.loadSpinner) {
                this.$.loadSpinner.hide();
            }
        }
    },

    confirmLoadFailed: function () {
        if (this.standalone) {
            window.close();
        }
    },


    bodyPaneViewSelected: function (inSender, inView, inPreviousView) {
        // TODO: figure this out

    },

    openResult: function (inSender, result) {
        console.error("### Open RESULT ");
        console.error("open success, " + JSON.stringify(result));
    },

    /* Ways to start the show. */
    setMessage: function (toSet, nextPrevQuery) {
        console.log("### MessagePane -- set message");
        var messageLoader = this.$.messageLoader;
        messageLoader.setMessage(toSet);
        this.currentFilterPos = undefined;
        this.nextPrevQueryBase = nextPrevQuery;
        this.messageChanged(messageLoader);
//		messageLoader.resize();
    },
    messageChanged: function (messageLoader) {
        this.cleanupMessage(messageLoader);

        if (!messageLoader.message) {
            // Cleanup
            messageLoader.updateAttachments(null);
            this.$.pane.selectViewByName("placeholder");
            return;
        }

        //this.$.pane.selectViewByName("message");
        console.log("Displaying message " + messageLoader._id);
        messageLoader.setRetries(4); // New message, allow 4 retries for loading the body.

        // Create a DatabaseEmail component representing this database object
        messageLoader.email = this.createComponent({
            kind: "DatabaseEmail",
            name: "email",
            data: messageLoader.message,
            subscribe: true,
            onEmailUpdated: "emailUpdated"
        });

        messageLoader.hookupSenderPhoto()

        // Mark message as read
        if (messageLoader.email.canModifyEmail() && !messageLoader.email.getFlags().read) {
            messageLoader.email.setRead(true);
        }

        messageLoader.emailLoaded();
        if (!this.nextPrevQueryBase || !this.nextPrevQueryBase.filter) {
            this.filteredList = undefined;
            this.setupNextPreviousMessages();//FIXME HRS
        } else {
            this.grabFilteredList();
        }
        this.resetNavButtons();
    },
    setUri: function (uri) {
        this.$.messageLoader.setUri(uri);
    },
    // Should be called to clean up any subscriptions/etc associated with the last loaded message
    cleanupMessage: function (messageLoader) {
        if (messageLoader.email) {
            // Remove old email component
            messageLoader.email.destroy();
            messageLoader.email = null;
        }
        messageLoader.cancel();
    },

    // ****************************************************************
    // FIXME: the following side-effects should probably be refactored.
    emailUpdated: function () {
        this.$.messageLoader.emailUpdated();
    },
    updateFlagged: function (isFlagged) {
        this.$.messageLoader.setFlagged(isFlagged);
    },
    reinitializeWebView: function () {
        var bod = this.$.messageLoader.$.body;
        bod && bod.reinitialize && bod.reinitialize();
    },
    disconnectWebView: function () {
        this.$.messageLoader.$.body.disconnect();
    },

    NEXT_KEY: 'next',
    PREV_KEY: 'prev'
});
