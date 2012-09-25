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
    name: "EmailListPane",
    kind: "VFlexBox",

    events: {
        onListLoaded: "",
        onConversationSelected: "",
        onComposeMessage: ""
    },

    published: {
        folder: null
    },

    components: [
        {name: "folderStateWatcher", kind: "FolderStateWatcher", onStateChanged: "folderStateChanged"},
        {name: "unreadCountWatcher", kind: "UnreadCountWatcher", onUnreadCountChanged: "unreadCountChanged"},
        {name: "draftEmailLoader", kind: "DbService", method: "get", dbKind: "com.palm.email:1", onResponse: "gotDraftEmailData"},

        {className: "header-shadow"},

        {name: "multiselectHeader", showing: false, onmousehold: "puntList", style: "background-position:top left;", components: [
            {className: "enyo-row", components: [
                {kind: "HFlexBox", style: "padding: 4px 14px; height: 50px;", className: "enyo-toolbar enyo-toolbar-light multiselect-color", components: [
                    {name: "multiselectHeaderText", style: "padding: 8px 0; color: white; width: 180px", className: "ellipsis"},
                    {flex: 1},
                    {kind: "Button", className: "enyo-button-blue", style: "min-width: 70px;", caption: $L("Cancel"), onclick: "editModeDone"}
                ]}
            ]}
        ]},

        {name: "searchHeader", components: [
            {className: "search-shadow"},
            {components: [
                {name: "header", className: "enyo-toolbar enyo-toolbar-light", kind: "HFlexBox", align: "center", onmousehold: "puntList", components: [
                    {kind: "HFlexBox", flex: 1, pack: "center", components: [
                        {name: "accountIcon", kind: "Image", src: "", showing: false},
                        {name: "folderTitle", content: "", className: "account-folder-title"}
                    ]},
                    {name: "spinner", kind: "FolderSpinner", className: "emailList-spinner", onErrorClick: "errorClick"}
                ]}
            ]},
            {components: [
                {name: "searchBox", style: "-webkit-border-image: none; background: white;", className: "enyo-box-input", kind: "SearchInput", hint: $L("Search"), changeOnInput: true, onchange: "filterMail", onCancel: "filterMail"}
            ]}
        ]},

        {name: "emailList", kind: "EmailList", flex: 1, onListLoaded: "doListLoaded", onConversationClick: "conversationClick", onSelectionChanged: "editModeSelectionChanged", onSwipeDelete: "swipeDelete"},

        {kind: "Toolbar", style: "z-index:1;", name: "mailToolbar", className: "mail-command enyo-toolbar-light", components: [
            //changed the z-index to 1 to prevent the command menu from showing over the 3rd panel
            {name: "slidingDrag", slidingHandler: true, kind: "GrabButton" },
            {kind: "Control", width: "40px"},
            {name: 'composeButton', icon: "../images/icons/toolbar-icon-new.png", className: "enyo-light-menu-button", onclick: "composeClick"},
            {name: 'bovineButton', icon: "../images/icons/toolbar-icon-bovine.png", className: "enyo-light-menu-button", showing: false, onclick: "bovineStrikeForce"},
            {name: 'moveToButton', icon: "../images/icons/toolbar-icon-multi-moveto.png", showing: false, className: "enyo-light-menu-button", onclick: "multiselectMove"},
            {kind: "Control", width: "20px"},
            {name: 'syncButton', icon: "../images/icons/toolbar-icon-sync.png", className: "enyo-light-menu-button", onclick: "syncClick"},
            {name: 'deleteButton', icon: "../images/icons/toolbar-icon-multi-delete.png", showing: false, className: "enyo-light-menu-button", onclick: "multiselectDelete"},
            {kind: "Control", width: "20px"},
            {name: 'flagButton', icon: "../images/Flag.png", showing: false, className: "enyo-light-menu-button", onclick: "multiselectToggleFlagged"},
            {name: 'editButton', icon: "../images/icons/toolbar-icon-multiselect.png", onclick: "editModeClick"}
        ]},
        
        {style: "position: relative", components: [
            {className: "footer-shadow", style: "position: absolute; bottom: 0px"}
        ]},
        
        {name: "aboutFolderPopup", kind: "FolderInfoPopup", caption: $L("About this folder")},
        {name: "folderErrorPopup", kind: "FolderInfoPopup", caption: $L("Error")},
        
        {name: "moveToDialog", kind: "SelectFolderPopup", caption: $L("Move to Folder"), iconStyle: "full", onSelect: "moveToFolderSelected"}
    ],

    create: function () {
        this.inherited(arguments);
    },

    // [public]
    getAppMenuConfigs: function (viewHidden) {
        var result;
        if (this.folder) {
            var isTrash = this.isTrashFolder(this.folder);

            result = {
                emptyTrashItem: {onclick: "emptyTrashClick", showing: isTrash, disabled: viewHidden},
                markAllReadItem: {onclick: "markAllReadClick", showing: !isTrash, disabled: viewHidden},
                aboutThisFolder: {onclick: "aboutClick", disabled: viewHidden}
            };
        }
        return result;
    },
    
    // [public]
    getQueryInfo: function () {
        return this.$.emailList.getQueryInfo();
    },

    getCurrentAccount: function () {
        return this.folder && enyo.application.accounts.getAccount(this.folder.accountId);
    },

    isTrashFolder: function (folder) {
        if (folder && folder._id && folder.accountId && folder.accountId != Folder.kFavoriteFoldersAccountID) {
            var account = this.getCurrentAccount();
            return account && account.getTrashFolderId() === folder._id;
        } else {
            return false;
        }
    },

    isDraftsFolder: function () {
        var account = this.getCurrentAccount();
        return account && this.folder && this.folder._id && account.getDraftsFolderId() === this.folder._id;
    },

    getAllInboxFolderIds: function () {
        var ids = [];

        enyo.application.accounts.getAccounts().forEach(function (account) {
            ids.push(account.getInboxFolderId());
        });

        return ids;
    },

    folderChanged: function (old) {
        if (this.folder === old) {
            // unchanged
            this.doListLoaded();
            return;
        }

        this.$.emailList.setFolder(this.folder);
        this.$.emailList.setSelected(null);

        // TODO other setup
        this.$.folderTitle.setContent((this.folder && enyo.application.folderProcessor.getLocalizedFolderName(this.folder)) || "");
        this.$.accountIcon.setSrc(enyo.application.accounts.getIconById(this.folder && this.folder.accountId));
        this.$.accountIcon.setShowing(!!this.folder);

        // Setup watches for folder sync state
        var folderIds = [];
        if (this.folder) {
            if (this.folder.accountId === Folder.kFavoriteFoldersAccountID) {
                folderIds = this.getAllInboxFolderIds();
            } else {
                folderIds = this.folder && [this.folder._id];
            }
        }

        this.$.folderStateWatcher.setFolderIds(folderIds);
        this.$.unreadCountWatcher.setFolderId(this.folder && this.folder._id);

        // Clear search
        this.$.searchBox.setValue("");
        this.filterMail();

        // Stop any existing pending automatic sync attempt
        enyo.job.stop("autosync");
    },

    // [public]
    selectConversationById: function (id) {
        this.$.emailList.setSelected(id);
    },

    // [public]
    resetList: function () {
        this.$.emailList.reset();
    },

    // [public]
    reset: function () {
        this.$.emailList.reset();
    },
    
    // scroll to top
    puntList: function() {
        this.$.emailList.punt();
    },

    syncClick: function () {
        // check for a connection first
        if (!enyo.application.isConnectionAvailable()) {
            MailErrorDialog.displayError(this, {
                message: $L("No Internet Connection.")
            });
            return;
        }

        this.syncCurrentFolder(true);
    },

    // [public]
    // sync the folder automatically (usually when opening the folder)
    autoSyncFolder: function () {
        // Add a delay so it doesn't compete for CPU/database resources as much
        enyo.job("autosync", enyo.bind(this, "syncCurrentFolder", false), 500);
    },

    syncCurrentFolder: function (forceSync) {
        if (!this.folder) {
            return;
        }

        // stop pending autosync if any
        enyo.job.stop("autosync");

        // sync all accounts
        if (this.folder.accountId === Folder.kFavoriteFoldersAccountID) {
            this.syncAllInboxes();
        } else {
            this.syncOneFolder(this.getCurrentAccount(), this.folder._id, forceSync);
        }
    },

    syncAllInboxes: function (forceSync) {
        var that = this;
        enyo.application.accounts.getAccounts().
            forEach(function (account) {
                var inboxFolderId = account.getInboxFolderId();
                if (inboxFolderId) {
                    that.syncOneFolder(account, inboxFolderId, forceSync);
                }
            });
    },

    syncOneFolder: function (account, folderId, forceSync) {
        if (forceSync || account.getSyncFrequency() !== AccountPreferences.SYNC_MANUAL) {
            var transport = enyo.application.accounts.getTransport(account.getId());
            
            transport.syncFolder(account.getId(), folderId, {force: !!forceSync});
        }
    },

    folderStateChanged: function () {
        var syncing = this.$.folderStateWatcher.isSyncing();
        var hasError = this.$.folderStateWatcher.getHasError();
        this.$.spinner.setSpinning(syncing);
        
        this.$.spinner.setHasError(hasError);
    },
    
    unreadCountChanged: function (sender, folderId, count) {
        this.$.spinner.setUnreadCount(count);
    },

    // [public]
    blurSearchBox: function () {
        this.$.searchBox.forceBlur();
    },

    // started typing or cleared search box
    filterMail: function () {
        var searchString = this.$.searchBox.getValue();
        this.$.emailList.setSearchString(searchString);
    },

    // clicked on conversation in list
    conversationClick: function (sender, virtualConv) {
        if (!this.editMode) {
            if (this.isDraftsFolder()) {
                this.log("selected email in drafts folder");

                // Clear existing selection
                this.$.emailList.setSelected(null);
                this.doConversationSelected(null);

                // Load draft email
                this.loadAndEditDraft(virtualConv.getEmailIds());
            } else {
                // set selected email in list
                this.$.emailList.setSelected(virtualConv.getId());

                // Report that we want to display this conversation
                this.doConversationSelected(virtualConv);
            }
        }
    },

    loadAndEditDraft: function (ids) {
        this.$.draftEmailLoader.call({ids: ids});
    },

    gotDraftEmailData: function (sender, response) {
        if (response.results && response.results.length === 1) {
            var data = response.results[0];

            // Open draft email in compose window
            this.doComposeMessage({
                accountId: this.getCurrentAccount().getId(),
                edit: data
            });
        } else {
            // FIXME display error
        }
    },

    composeClick: function () {
        this.doComposeMessage({accountId: this.folder && this.folder.accountId});
    },

    // note this is private
    setEditMode: function (editEnabled) {
        this.editMode = editEnabled;
        this.$.emailList.setMultiSelect(editEnabled);

        // show edit mode header
        this.$.searchHeader.setShowing(!editEnabled);
        this.$.multiselectHeader.setShowing(editEnabled);

        // show toolbar
        this.$.composeButton.setShowing(!editEnabled);
        this.$.syncButton.setShowing(!editEnabled);
        this.$.editButton.setShowing(!editEnabled);
        this.$.moveToButton.setShowing(editEnabled);
        this.$.deleteButton.setShowing(editEnabled);
        this.$.flagButton.setShowing(editEnabled);

        if (editEnabled) {
            this.$.multiselectHeaderText.setContent($L("Select Items..."));
        }

        // need to tell list that it's been resized
        this.$.emailList.resized();
    },

    // clicked on edit/manage button
    editModeClick: function () {
        this.setEditMode(true);

        this.doConversationSelected(null);
    },

    editModeDone: function () {
        this.setEditMode(false);

        this.doConversationSelected(null);
    },

    editModeSelectionChanged: function () {
        var convoIds = this.$.emailList.getSelectedIds();
        var numSelected = convoIds.length;
        //console.log("num selected: " + numSelected);

        var temp = new enyo.g11n.Template($L("0#Select Items...|1#1 item selected...|1>##{num} items selected..."));
        var formattedMultiselectText = temp.formatChoice(numSelected, {num: numSelected});
        this.$.multiselectHeaderText.setContent(formattedMultiselectText);
        this.toggleMultiOptions(convoIds);
    },

    translateConvoIdsToMailIds: function (convoIds, callback) {

        this.getConversationsByIds(convoIds, pullMailIds);

        function pullMailIds(resp) {
            if (!resp.results || !resp.results.length) {
                return;
            }
            var convos = resp.results;
            var mailIds = [];
            convos.forEach(function (conv) {
                mailIds = mailIds.concat(conv.getEmailIds());
            });
            callback({results: mailIds, returnValue: true});
        }
    },

    getConversationsByIds: function (convoIds, callback) {
        EmailApp.Util.callService('palm://com.palm.db/get', {ids: convoIds}, makeVirtualConversations);

        function makeVirtualConversations(resp) {
            if (!resp.results || !resp.results.length) {
                return;
            }
            var convos = [];
            resp.results.forEach(function (con) {
                convos.push(new VirtualConversation(con));
            });
            callback({results: convos, returnValue: true});
        }
    },

    /**
     * Disables and enables multi-select operations (currently only moveto)
     * based on currently selected conversations. If conversations
     * span multiple accounts, operations that don't work cross account
     * will be disabled.
     */
    toggleMultiOptions: function (convoIds) {
        if (!convoIds) {
            return;
        }

        var movetoBtn = this.$.moveToButton;

        this.getConversationsByIds(convoIds, handleButtons);

        function handleButtons(resp) {
            if (!resp.returnValue || !resp.results.length) {
                return;
            }

            var acctId = resp.results[0].getAccountId();
            var optEnabled = true;
            for (var i = 1, len = resp.results.length; i < len; ++i) {
                if (resp.results[i].getAccountId() !== acctId) {
                    optEnabled = false;
                    break;
                }
            }
            movetoBtn.setDisabled(!optEnabled);
        }
    },


    multiselectDelete: function (sender, event) {
        if (enyo.application.prefs.get('confirmDeleteOnSwipe')) {
            var threading = EmailApp.Util.isThreadingEnabled();
        
            MailDialogPrompt.displayPrompt(this, {
                caption: $L("Delete Emails"),
                message: threading ? $L("Delete the selected email threads?") : $L("Delete the selected emails?"),
                acceptButtonCaption: $L("Delete"),
                onAccept: "confirmDelete"
            });
        } else {
            this.confirmDelete();
        }
    },

    confirmDelete: function () {
        var convoIds = this.$.emailList.getSelectedIds();
        this.translateConvoIdsToMailIds(convoIds, deleteThoseEmails);
        this.editModeDone();

        function deleteThoseEmails(resp) {
            Email.deleteEmails({ids: resp.results});
        }
    },

    multiselectMove: function (sender, event) {
        // we'll assume we have a proper conversation selection here.
        // button should be disabled otherwise
        var convoIds = this.$.emailList.getSelectedIds();
        var dialog = this.$.moveToDialog;
        this.translateConvoIdsToMailIds(convoIds, loadOneEmail);

        function loadOneEmail(resp) {
            if (!resp.returnValue || !resp.results.length) {
                return;
            }
            EmailApp.Util.callService('palm://com.palm.db/get', {ids: [resp.results[0]]}, loadAndDisplayFolders);
        }

        function loadAndDisplayFolders(resp) {
            if (!resp.returnValue || !resp.results.length) {
                return;
            }
            // we may have to tweak this if concersations ever span multiple accounts
            var accountId = enyo.application.folderProcessor.getFolderAccount(resp.results[0].folderId);
            dialog.loadFolders(accountId);
            dialog.openAtCenter();
        }
    },

    moveToFolderSelected: function (inSender, folder) {
        var targetFolderId = folder._id;

        var convoIds = this.$.emailList.getSelectedIds();
        this.translateConvoIdsToMailIds(convoIds, moveThoseEmails);
        this.editModeDone();

        function moveThoseEmails(resp) {
            Email.moveEmailsToFolder({ids: resp.results}, targetFolderId);
        }
    },


    multiselectToggleFlagged: function () {
        var convoIds = this.$.emailList.getSelectedIds();
        
        function determineToggle(respo) {
            var mailIds = respo.results;
            Email.getEmailFlags({ids: mailIds}, function (resp) {
                if (!resp.returnValue || !resp.results.length) {
                    return;
                }
                var flag = false;
                var results = resp.results;
                var i;

                for (i = 0; i < results.length; i++) {
                    if (!results[i].flags.flagged) {
                        flag = true;
                        break;
                    }
                }
                Email.setEmailFlags({ids: mailIds}, {flagged: flag});
            });
        }
        
        this.translateConvoIdsToMailIds(convoIds, determineToggle);

        this.editModeDone();
    },

    // requested deletion of email/conversation by swiping
    swipeDelete: function (sender, virtualConv) {
        Email.deleteEmails({ids: virtualConv.getEmailIds()});

        this.$.emailList.forceDeselect(virtualConv.getId());
    },

    markAllReadClick: function () {
        MailDialogPrompt.displayPrompt(this, {
            caption: $L("Mark All As Read?"),
            message: $L("Are you sure you want to mark all messages in the folder as read?"),
            acceptButtonCaption: $L("Mark As Read"),
            onAccept: "markAllReadConfirmClick"
        });
    },

    markAllReadConfirmClick: function () {
        var query = this.$.emailList.getEmailsQuery({from: Email.KIND});
        Email.setEmailFlags({query: query}, {read: true}, null);
    },

    emptyTrashClick: function () {
        // Show alert
        MailDialogPrompt.displayPrompt(this, {
            caption: $L("Empty Trash?"),
            message: $L("Are you sure you want to permanently delete these items?"),
            acceptButtonCaption: $L("Empty Trash"),
            onAccept: "emptyTrashConfirmClick"
        });
    },

    emptyTrashConfirmClick: function () {
        // Make sure this is the trash folder!
        if (this.isTrashFolder(this.folder)) {
            // Build our own query because we don't need filters or anything
            var query = { from: Email.KIND };
            query.where = [
                { prop: "folderId", op: "=", val: this.folder._id }
            ];
            Email.deleteEmails({query: query});
        } else {
            console.log("refusing to empty non-trash folder " + this.folder._id);
        }
    },
    
    // Get the incoming or outgoing account error, if any
    getErrorForAccount: function (account) {
        var error;

        if (account.getError() && account.getError().errorCode) {
            error = enyo.mixin({}, account.getError());
        } else if (account.getOutError() && account.getOutError().errorCode) {
            error = enyo.mixin({}, account.getOutError());
            error.isOutgoingAccount = true;
        }

        return error; // may be undefined
    },

    // Returns an entry describing the error for an account used in FolderInfoPopup
    getErrorPopupInfoForAccount: function (accountId) {
        var account = enyo.application.accounts.getAccount(accountId);
        var error = this.getErrorForAccount(account);

        if (!account || !error) {
            return null;
        }

        var errorStr = EmailAccount.getErrorString(error.errorCode, error.errorText);

        var components;

        if (!error.isOutgoingAccount) {
            components = [
                {className: "error-text", content: errorStr}
            ];
        } else {
            components = [
                {className: "error-outgoing-mail-server", content: $L("Outgoing Mail Server")},
                {className: "error-text", content: errorStr}
            ];
        }

        // info block to be used in FolderErrorPopup
        var info = {
            account: account,
            components: components
        };

        return info;
    },

    errorClick: function () {
        var errorItems = [];
        var errorInfo;

        // Handle All Inboxes / All Flagged
        if (this.folder.accountId === Folder.kFavoriteFoldersAccountID) {
            // TODO: Fix this. relies on com.palm.mail.account entries rather than CombinedAccount class
            var sortedAccounts = enyo.application.accounts.getSortedList();

            for (var i = 0; i < sortedAccounts.length; i++) {
                var account = sortedAccounts[i];

                if (account.getId() != Folder.kFavoriteFoldersAccountID) {

                    errorInfo = this.getErrorPopupInfoForAccount(account.getId());
                    if (errorInfo) {
                        errorItems.push(errorInfo);
                    }
                }
            }
        } else {
            errorInfo = this.getErrorPopupInfoForAccount(this.folder.accountId);
            if (errorInfo) {
                errorItems.push(errorInfo);
            }
        }

        if (errorItems.length > 0) {
            this.$.folderErrorPopup.setItems(errorItems);
            this.$.folderErrorPopup.openAtCenter();
        }

        return true;
    },

    aboutClick: function () {
        EmailApp.Util.callService('palm://com.palm.db/find',
            {query: {from: "com.palm.email:1", where: [
                {prop: "folderId", op: "=", val: this.folder._id}
            ], limit: 0}, count: true},
            this.showAboutFolder.bind(this));
    },
    
    showAboutFolder: function (response) {
        var account = this.getCurrentAccount();

        var timestamp = this.folder && this.folder.lastSyncTime;

        var lastUpdatedStr = "";
        var totalCountStr = "";
        
        var template;

        if (timestamp > 0) {
            template = new enyo.g11n.Template($L("Updated #{dateOrTime}"));
            var dateFormat = new enyo.g11n.DateFmt("short");
            lastUpdatedStr = template.evaluate({dateOrTime: dateFormat.format(new Date(timestamp))});
        } else {
            lastUpdatedStr = $L("Not yet updated");
        }

        if (true) {
            template = new enyo.g11n.Template($L("Total emails #{totalEmails}"));
            totalCountStr = template.evaluate({totalEmails: response.count});
        }

        if (!account || this.folder._id === Folder.kFavoriteFoldersAccountID) {
            // TODO synthetic folders case
        } else {
            var info = {
                account: account,
                components: [
                    {content: lastUpdatedStr},
                    {content: totalCountStr}
                ]
            };

            this.$.aboutFolderPopup.setItems([info]);
            this.$.aboutFolderPopup.openAtCenter();
        }
    }
});

enyo.kind({
    name: "FolderSpinner",
    kind: enyo.HFlexBox,

    published: {
        spinning: true,
        unreadCount: 0,
        hasError: false
    },
    
    events: {
        onErrorClick: ""
    },

    components: [
        {name: "errorIcon", kind: "Image", src: "../images/header-warning-icon.png", showing: false, flex: 0, style: "margin-right: 12px", onclick: "doErrorClick"},
        {name: "unreadCount", className: "mail-unread-header", flex: 0, style: "margin-right: 8px;", showing: false},
        {name: "spinner", kind: "Spinner"}
    ],

    create: function () {
        this.inherited(arguments);
    },

    spinningChanged: function () {
        this.$.spinner.setShowing(this.spinning);
        this.unreadCountChanged();
    },

    unreadCountChanged: function () {
        this.$.unreadCount.setContent(this.unreadCount ? ("" + this.unreadCount) : "");
        this.$.unreadCount.setShowing(!this.spinning && this.unreadCount > 0);
    },
    
    hasErrorChanged: function () {
        this.$.errorIcon.setShowing(this.hasError);
    }
});
