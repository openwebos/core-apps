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

/*global Folder, EmailApp, AccountPreferences, Email, mail, EmailAccount, enyo, $L */

enyo.VirtualScroller.prototype.accelerated = true;

enyo.kind({
    name: "Mail",
    kind: "VFlexBox",
    className: "mail-back",
    published: {
        folder: "",
        activateOnRefresh: false // set to true to cause us to activate the window the next time the list is refreshed.
    },
    events: {
        onSelect: "",
        onComposeMessage: "",
        onHeaderTap: "",
        onMessageDeleted: "",
        onItemClick: ""
    },
    components: [
        {kind: "DbService", dbKind: "com.palm.email:1", onFailure: "dbFail", components: [
            {name: "emailFind", method: "find", subscribe: true, resubscribe: true, onSuccess: "queryResponse", onWatch: "queryWatch", onFailure: "findFail"},
            {name: "emailDel", method: "del"}
        ]},

        //{kind: "MockDb", dbKind: "com.palm.email:1", onSuccess: "queryResponse", onWatch: "queryWatch"},
        {className: "header-shadow"},

        {name: "multiselectHeader", showing: false, onmousehold: "puntList", style: "background-position:top left;", components: [
            {className: "enyo-row", components: [
                {kind: "HFlexBox", style: "padding: 4px 14px; height: 50px;", className: "enyo-toolbar enyo-toolbar-light multiselect-color", components: [
                    {name: "multiselectHeaderText", style: "padding: 8px 0; color: white; width: 180px", className: "ellipsis"},
                    {flex: 1},
                    {kind: "Button", className: "enyo-button-blue", style: "min-width: 70px;", caption: $L("Cancel"), onclick: "multiselectDone"}
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
                    {name: "errorIcon", kind: "Image", src: "../images/header-warning-icon.png", showing: false, flex: 0, style: "margin-right: 12px", onclick: "errorClick"},
                    {name: "folderUnread", className: "mail-unread-header", flex: 0, style: "margin-right: 8px;", showing: false},
                    {name: "spinner", nodeTag: "div", className: "sync-activity-animation", showing: false},
                ]}
            ]},
            {components: [
                {name: "searchBox", style: "-webkit-border-image: none; background: white;", className: "enyo-box-input", kind: "SearchInput", hint: $L("Search"), changeOnInput: true, onchange: "filterMail", onblur: "hideKeyboard", onCancel: "filterMail"}
            ]}
        ]},
//		{kind: "Divider", caption: "TODAY", showing: false, className: "today-divider"},

        {flex: 1, name: "mailList", className: "mail-list", kind: "DbList", pageSize: 50, onQuery: "listQuery", onSetupRow: "renderItem", desc: true, components: [
            // {name: "divider", showing: false, kind: "Control", className: "enyo-divider", components: [
            //     {name: "dividerLabel", content: "Sometime", className: "divider-label", nodeTag: "span"}
            // ]},
            {name: "divider", captureState: false, kind: "Divider", showing: false, caption: "Sometime"},
            {name: "mailItem", kind: "DarkSwipeable", tapHighlight: true, className: "mail-item", onclick: "itemClick", onDrag: "selectDraggedMessage", onConfirm: "deleteMessage",
                components: [
                    {kind: "HFlexBox", height: "89px", components: [
                        {name: "icons", kind: "VFlexBox", width: "18px", align: "center", pack: "center", style: "margin-left:3px; margin-right:3px;", components: [
                            {name: "flag", captureState: false, kind: "Image", className: "mail-icon-padding", src: "../images/list-flagged.png", wantsEvents: false},
                            {name: "priorityFlag", captureState: false, kind: "Image", className: "mail-icon-padding", src: "../images/list-priority-flagged.png", wantsEvents: false},
                            {name: "status", captureState: false, kind: "Image", className: "mail-icon-padding", src: "", wantsEvents: false},
                            {name: "invite", captureState: false, kind: "Image", className: "mail-icon-padding", src: "../images/list-cal-invite.png", wantsEvents: false}
                        ]},
                        {name: "rightflex", kind: "VFlexBox", height: "60px", width: "284px", style: "margin-top:14px; padding-bottom:14px", components: [
                            {kind: "HFlexBox", components: [
                                {name: "from", captureState: false, className: "mail-from", width: "100%", wantsEvents: false},
                                {name: "attach", captureState: false, canGenerate: false, kind: "Image", className: "mail-attach-icon", src: "../images/attachment-icon.png", wantsEvents: false},
                                {name: "when", captureState: false, className: "mail-when", wantsEvents: false},
                            ] },
                            {name: "subject", captureState: false, className: "mail-subject", wantsEvents: false},
                            {name: "blurb", captureState: false, className: "mail-blurb", wantsEvents: false}
                        ]}
                    ]}
                ]
            }
        ]},
        {className: "footer-shadow"},
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
            //
            // {kind: "VFlexBox", showing:"false", components: [
            // 	{flex:1},
            // 	{name: 'editButton', kind:"Button", style:"min-width:64px;line-height:", caption: "edit", toggling:true,  onclick: "editClick"},
            // 	{flex:1}
            // ]}
            {name: 'editButton', icon: "../images/icons/toolbar-icon-multiselect.png", onclick: "editClick"}
        ]},

        {name: "aboutFolderPopup", kind: "FolderInfoPopup", caption: $L("About this folder")},
        {name: "folderErrorPopup", kind: "FolderInfoPopup", caption: $L("Error")},
        {name: "moveToFolderPopup", kind: "SelectFolderPopup", caption: $L("Move to Folder"), iconStyle: "full", onSelect: "moveToFolderSelected"}
    ],

    hideKeyboard: function () {
        console.log("### hide that keyboard");
        enyo.keyboard.forceHide();
        enyo.keyboard.setManualMode(false);
        console.log("### we hid that keyboard, fool!");
    },

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


    // Temporary code to try to inform sporadic reports of blank message lists.
    safelyFigureHeight: function (which) {
        which = which && which.hasNode();
        return which && which.clientHeight;
    },

    /*
     Temporary code to try to inform sporadic reports of blank message lists.
     Returns true if list > 0 height.
     */
    checkList: function (label, skipRecovery) {
        try {
            var listHeight = this.safelyFigureHeight(this.$.mailList);

            // Clear possible pending recovery attempt.
            if (this.listHackId) {
                console.error("Clearing pending recovery attempt.");
                window.clearTimeout(this.listHackId);
                this.listHackId = undefined;
            }

            if (!listHeight) {
                console.error("Detected 0-size list component: " + label);
                console.error("   mailList height: " + listHeight);

                if (!skipRecovery) {
                    console.error("Scheduling recovery.");
                    var that = this;
                    this.listHackId = window.setTimeout(function () {
                        if (that.checkList("recovery callback", true) === false) {
                            if (that.$.mailList.resized) {
                                that.$.mailList.resized();
                            }
                            that.$.mailList.punt();
                            console.error("Attempted recovery.");
                        } else {
                            console.error("Recovery appears unnecessary.");
                        }
                        that.listHackId = undefined;
                    }, 2000);
                }

                return false;
            }
        } catch (e) {
            console.error("Error in checkList: " + e);
        }

        return true;
    },

    puntList: function (target, event) {
        this.$.mailList.punt();
    },

    dbFail: function (inSender, inResponse) {
        console.error("dbService failure: " + JSON.stringify(inResponse));
    },

    reset: function () {
        this.$.mailList.reset();
    },

    create: function () {
        this.inherited(arguments);
        this.lastFolder = {};
        this.initLastEmailHash();
        this.syncStateWatches = {};

        this.setUpTimeFormatter();

        // Watch for account changes
        this.accountsChangedBound = this.accountsChanged.bind(this);
        enyo.application.accounts.addListener(this.accountsChangedBound);
    },

    setUpTimeFormatter: function () {
        this.timeFormatter = new enyo.g11n.DateFmt({
            time: "short"
        });
        this.dateFormatter = new enyo.g11n.DateFmt({
            date: "short"
        });
    },

    destroy: function () {
        this.cancelSyncStateWatches();

        enyo.application.accounts.removeListener(this.accountsChangedBound);

        this.inherited(arguments);
    },

    cancelSyncStateWatches: function () {
        if (this.syncStateWatches) {
            var syncyWatchy = this.syncStateWatches;
            Object.keys(this.syncStateWatches).forEach(
                function (folderId) {
                    if (syncyWatchy[folderId]) {
                        syncyWatchy[folderId].cancel();
                    }
                });
        }
        this.syncStateWatches = {};
    },

    rendered: function () {
        this.inherited(arguments);
    },

    resizeHandler: function () {
        if (this.$.mailList.resized) {
            this.$.mailList.resized();
        }
        this.inherited(arguments);
    },

    folderChanged: function () {
        // REFAC, this is way too long
        this.checkList("pre-folderChanged");
        var folderId = this.folder && this.folder._id;

        // protect us from other components changing the object.
        this.folder = this.folder && enyo.clone(this.folder);

//		console.log("Switching to folder " + folderId);

        if (folderId === (this.lastFolder && this.lastFolder._id)) {
//			console.log("Already displaying folder " + folderId);
            return;
        }

        this.isSentFolder = false;
        this.cancelSyncStateWatches();
        this.continueAnimation = false;
        this.stopSyncAnimation();

        this.$.header.setShowing(true);
        // NOTE: with the clip locking optimization added in 0.9, lists are now explicitly sized
        // and must be told when they are resized. Changing the showing state of the header
        // results in the list being resized. Call "resized" to tell the list to update.
        if (this.$.mailList.resized) {
            this.$.mailList.resized();
        }
        //
        this.$.folderTitle.setContent((this.folder && enyo.application.folderProcessor.getLocalizedFolderName(this.folder)) || "");
        this.$.accountIcon.setSrc(enyo.application.accounts.getIconById(this.folder && this.folder.accountId));
        this.$.accountIcon.show();

        this.$.folderUnread.setShowing(this.folder && this.folder.unreadCount);
        this.$.folderUnread.setContent(this.folder && this.folder.unreadCount);

        this.lastFolder = this.folder;

        this.$.searchBox.setValue("");
//		console.log("Punting mailList");
        this.$.mailList.punt();
//		console.log("Checking unread count");
        this.getUnreadCount(folderId);

        // If we're not setting the folder to undefined/empty, then we have to do this stuff too:
        if (this.folder) {

            this.$.mailList.getSelection().clear();
            this.setMultiselect(false);

            if (this.owner.changingFolders) {
                this.owner.changingFolders = false;
                return;
            }

            var lastEmailId = this.getLastEmail(this.folder._id);
            this.owner.handleDisplayMessage(lastEmailId, this.folder);

            // If synthetic folder, sync inboxes on all folders
            // If not, sync this folder & setup error & syncState watches
            if (this.folder.accountId === Folder.kFavoriteFoldersAccountID) {
                this._syncAllInboxes();
            } else {
                if (this.folder._id === this._getAccountFromFolder(this.folder).getSentFolderId()) {
                    this.isSentFolder = true;
                }

                this.autoSyncAccount(this._getAccountFromFolder(this.folder), this.folder._id);

                this.syncStateWatches[this.folder._id] = enyo.create({kind: "SyncStateWatch", folderId: this.folder._id, accountId: this.folder.accountId, mail: this});
            }

            this.checkFolderError();
        } else {
            // No folder; clear out header
            this.$.folderTitle.setContent("");
            this.$.accountIcon.hide();
            this.$.folderUnread.hide();
            this.$.errorIcon.hide();
            this.$.spinner.hide();
        }

        this.checkList("post-folderChanged");
    },

    /**
     * used to sync every inbox for configured accounts
     */
    _syncAllInboxes: function () {
        var that = this;
        enyo.application.accounts.getAccounts().
            forEach(function (account) {
                var inboxFolderId = account.getInboxFolderId();
                if (inboxFolderId) {
                    that.autoSyncAccount(account, inboxFolderId);
                    that.syncStateWatches[inboxFolderId] = enyo.create({kind: "SyncStateWatch", folderId: inboxFolderId, accountId: account.getId(), mail: that});
                }
            });
    },
    accountsChanged: function () {
        try {
            // Update error icon
            this.checkFolderError();
        } catch (e) {
            console.error("exception in Mail.accountsChanged: " + e);
        }
    },

    // See if the folder or account has an error (currently only accounts can have errors)
    checkFolderError: function () {
        if (!this.folder) {
            return;
        }

        var hasError = false;
        var accts = enyo.application.accounts, that = this;
        if (this.folder.accountId === Folder.kFavoriteFoldersAccountID) {
            // Check all folders

            accts.getAccounts().
                forEach(function (account) {
                    var error = that.getErrorForAccount(account);
                    if (error) {
                        hasError = true;
                    }
                });
        } else {
            // Check this folder only
            var error = this.getErrorForAccount(this._getAccountFromFolder(this.folder));
            if (error) {
                hasError = true;
            }
        }

        this.$.errorIcon.setShowing(hasError);
    },

    clearSelection: function () {
        this.$.mailList.getSelection().clear();
    },

    filterMail: function (inSender, filter) {
        this.$.mailList.punt();
    },

    autoSyncAccount: function (account, folderId) {
        if (account.getSyncFrequency() !== AccountPreferences.SYNC_MANUAL) {
            mail.syncFolder(account.getId(), folderId, false);
        }
    },

    getUnreadCount: function (folderId) {
        if (this.unreadCountRequest) {
            this.unreadCountRequest.cancel();
        }

        //console.log("subscribing to unread count for folder " + folderId);

        if (folderId) {
            var callback = enyo.hitch(this, "updateUnreadCount", folderId);
            if (EmailApp.Util.onDevice()) {
                //we pass true as the fifth param so that we get a count
                this.unreadCountRequest = new EmailApp.Util.MojoDBAutoFinder(EmailApp.Util.generateUnreadCountQuery(folderId), callback, undefined, undefined, true);
            } else {
                setTimeout(callback.bind(this, [], 99), 50);
            }
        }
    },

    updateUnreadCount: function (folderId, ignored, count) {
        //console.log("unread count update for folder " + folderId + ": " + count);

        if (this.folder && folderId == this.folder._id) {
            this.folder.unreadCount = count;

            this.$.folderUnread.setShowing(this.folder.unreadCount);
            this.$.folderUnread.setContent(this.folder.unreadCount);

            if (count === 0) {
                this.unreadCountLength = "count0";
                this.lastFrameSync = 10;
                this.lastFrameStop = 11;
            } else if (count < 10) {
                this.unreadCountLength = "count1";
                this.lastFrameSync = 10;
                this.lastFrameStop = 18;
            } else if (count < 100) {
                this.unreadCountLength = "count2";
                this.lastFrameSync = 12;
                this.lastFrameStop = 20;
            } else if (count < 1000) {
                this.unreadCountLength = "count3";
                this.lastFrameSync = 14;
                this.lastFrameStop = 22;
            } else {
                this.unreadCountLength = "count4";
                this.lastFrameSync = 16;
                this.lastFrameStop = 24;
            }
        }
    },

    getListQuery: function (inQuery) {
        var query = {};
        var filterString;

        enyo.mixin(query, inQuery);

        //console.error("listQuery: query = "+JSON.stringify(query));

        // If we have no folder, we end up sending an invalid query -- no index available.
        // However, there's currently no simple way around it. If we return undefined instead of a request object, the list is left in a funky state.
        var folderId = this.folder && this.folder._id;
        if (folderId === Folder.kAllInboxesFolderID) {
            query.where = [
                { prop: "flags.visible", op: "=", val: true },
                { prop: "withinInbox", op: "=", val: true }
            ];
            query.orderBy = "sortKeys.allInboxes";
            /*
             //we need a new index for this one, so I'm leaving it commented out
             //this is fine - since it has a fake id, the search should return no results when we use the default where clause below
             } else if (folderId === Folder.kAllUnreadFolderID) {
             query.where = [{ prop: "flags.visible", op: "=", val: true }, { prop: "flags.read", op: "=", val: false }];
             query.orderBy = "sortKeys.allUnread";
             */
        } else if (folderId === Folder.kAllFlaggedFolderID) {
            query.where = [
                { prop: "flags.visible", op: "=", val: true },
                { prop: "flags.flagged", op: "=", val: true }
            ];
            query.orderBy = "sortKeys.allFlagged";
        } else if (folderId) {
            query.where = [
                { prop: "flags.visible", op: "=", val: true },
                { prop: "folderId", op: "=", val: folderId }
            ];
            query.orderBy = "sortKeys.list"; // FIXME: tweak dbkind to keep index on timestamp.
        } else {
            //else folderId is falsy and we don't want to display anything, so return undefined
            console.log("Mail: skipping query since folderId is " + folderId);
            return;
        }

        filterString = this.$.searchBox.getValue();
        if (filterString) {
            // Add search string:
            query.where.push({prop: "searchText", op: "?", val: filterString, collate: "primary"});

            // If we're filtering, we need to pick out the 2nd term in
            // the where clause and move it to a filter clause instead.
            // This allow us to use the universal search index for typedown in all views.
            // The additional criteria for the specific view is used to post-filter the data instead.
            query.filter = query.where.splice(1, 1);

            query.limit = 100;
        }
        this.$.bovineButton.setShowing(filterString && filterString.toLowerCase() === "supercowpowers");

        return query;
    },

    listQuery: function (inSender, inQuery) {
        console.log("mailList: got listQuery");
        var query = this._lastQuery = this.getListQuery(inQuery);
        var search;
        var result;
        if (query) {
            search = query.filter ? {method: 'search'} : undefined;
            if (enyo.application.dbServiceHook) {
                enyo.application.dbServiceHook(this.$.emailFind);
            }
            result = this.$.emailFind.call({query: query}, search);
        }

        console.log("mailList listQuery request: " + (!!result));
        return result;
    },

    queryWatch: function () {
        //
        // NOTE: list.reset() can cause a visible flash on desktop browsers due to asynchrony between
        // rendering and data acquisition. We're working on a solution.
        //
        this.$.mailList.reset();
    },

    queryResponse: function (inSender, inResponse, inRequest) {
//		console.log("mailList queryResponse: results = "+(inResponse && inResponse.results && inResponse.results.length));
        this.checkList("pre-queryResponse");
        // we need to pre-process the contact-names before passing them off to the list
        // this is to get around the flywheel used for display
        var cache = enyo.application.contactCache;

        var resultsLeft = inResponse.results.length;
        this._needDisplayNameReset = false;
        var that = this;
        inResponse.results.forEach(function (m) {
            if (!m.from || !m.from.addr) {
                resultsLeft--;
                if (resultsLeft === 0 && that._needDisplayNameReset) {
                    that.$.mailList.reset();
                    that._needDisplayNameReset = false;
                }
                return;
            }
            if (window.ContactsLib) {
                cache.lookupContact(m.from.addr, function (res) {
                    m.hackySenderDisplayName = (res.getName() || m.from.name || m.from.addr || "");
                    resultsLeft--;

                    if (resultsLeft === 0 && that._needDisplayNameReset) {
                        that.$.mailList.reset();
                        that._needDisplayNameReset = false;
                    }
                });
            }
        });
        this.$.mailList.queryResponse(inResponse, inRequest);
        this.checkList("post-queryResponse");
//		this.maybeActivateOnRefresh();
    },

    findFail: function (inSender, inResult) {
        console.error("emailFind response failure: " + inResult.errorText);
    },

    formatDateOrTime: function (timestamp) {
        if (EmailApp.Util.isToday(timestamp)) {
            return this.timeFormatter.format(new Date(timestamp));
        } else {
            return this.dateFormatter.format(new Date(timestamp));
        }
    },

    renderItem: function (inSender, inRecord, inIndex) {
        var m = inRecord;
        this.getDivider(m, inIndex);

        var imageRoot = "../images/";
        var flags = m.flags || {read: true};

        if (inIndex === 0) {
            this.$.mailItem.addClass("first");
        } else {
            this.$.mailItem.removeClass("first");
        }

        var confirmDeleteOnSwipe = enyo.application.prefs.get("confirmDeleteOnSwipe");
        this.$.mailItem.setConfirmRequired(confirmDeleteOnSwipe);

        var sel = this.$.mailList.getSelection();
        this.$.mailItem.$.client.addRemoveClass("active-msg", sel.isSelected(m._id));
        this.$.mailItem.setSwipeable(!sel.multi);

        this.$.mailItem.domStyles["font-weight"] = flags.read ? null : "bold";
        this.$.subject.setContent(m.subject || $L("No Subject"));
        this.$.blurb.setContent(m.summary || "");
        this.$.when.setContent(this.formatDateOrTime(m.timestamp));

        // if this is a Sent folder, then display recipients; for all other folders, display sender
        if (this.isSentFolder) {
            var to, toArr = (m.to || []), toString = "", toLen = toArr.length;
            for (var i = 0; i < toLen - 1; ++i) {
                to = toArr[i].name || toArr[0].addr || "";
                if (to) {
                    toString += to + ", ";
                }
            }
            if (toLen > 0) {
                toString += toArr[toLen - 1].name || toArr[toLen - 1].addr || "";
            }

            this.$.from.setContent(toString);
        } else {
            var nameElem = this.$.from;
            if (m.hackySenderDisplayName === undefined) {
                this._needDisplayNameReset = true;
            }
            nameElem.setContent(m.hackySenderDisplayName || (m.from && (m.from.name || m.from.addr)) || "");
        }

        // Configure priority/flagged
        this.$.priorityFlag.setShowing(m.priority === "high");
        this.$.flag.setShowing(flags.flagged);

        // Configure send/reply/fwd
        if (m.sendStatus && m.sendStatus.fatalError) {
            this.$.status.setSrc(imageRoot + "list-error.png");
        } else if (flags.replied && flags.forwarded) {
            this.$.status.setSrc(imageRoot + "list-reply-forward.png");
        } else if (flags.replied) {
            this.$.status.setSrc(imageRoot + "list-reply.png");
        } else if (flags.forwarded) {
            this.$.status.setSrc(imageRoot + "list-forward.png");
        } else {
            // clear the source so we don't unexpectedly have it set
            this.$.status.setSrc("");
        }

        this.$.status.setShowing(flags.replied || flags.forwarded || (m.sendStatus && m.sendStatus.fatalError));
        this.$.attach.setShowing(this.hasAttachment(m));
        this.$.invite.setShowing(!!m.meetingInfo);

        // Do not generate HTML for hidden pieces.
        this.$.flag.canGenerate = this.$.flag.showing;
        this.$.status.canGenerate = this.$.status.showing;
        this.$.attach.canGenerate = this.$.attach.showing;
        this.$.invite.canGenerate = this.$.invite.showing;

        // adjust padding if we are display all 4 icons.
        if (this.$.flag.showing && this.$.priorityFlag.showing && this.$.status.src && this.$.invite.showing) {
            this.$.priorityFlag.addStyles("margin-top: -10px");
            this.$.status.addStyles("margin-top: -16px");
            this.$.invite.addStyles("margin-top: -22px");
        } else {
            this.$.priorityFlag.addStyles("margin-top: 0px");
            this.$.status.addStyles("margin-top: 0px");
            this.$.invite.addStyles("margin-top: 0px");
        }

        // Divider
    },
    getDivider: function (inMessage, inIndex) {
        var nextMessage = this.$.mailList.fetch(inIndex + 1);
        var previousMessage = this.$.mailList.fetch(inIndex - 1);

        if (!inMessage.formattedDate) {
            inMessage.formattedDate = this.dateFormatter.formatRelativeDate(new Date(inMessage.timestamp), {verbosity: true});
        }
        if (nextMessage && !nextMessage.formattedDate) {
            nextMessage.formattedDate = this.dateFormatter.formatRelativeDate(new Date(nextMessage.timestamp), {verbosity: true});
        }
        if (previousMessage && !previousMessage.formattedDate) {
            previousMessage.formattedDate = this.dateFormatter.formatRelativeDate(new Date(previousMessage.timestamp), {verbosity: true});
        }
        if (!previousMessage || (previousMessage.formattedDate !== inMessage.formattedDate)) {
            this.$.divider.setShowing(true);
            this.$.divider.setCaption(inMessage.formattedDate);
            this.$.divider.canGenerate = true;
            this.$.mailItem.$.client.domStyles["border-top"] = "none";
        } else {
            // Do not generate HTML for hidden dividers.
            this.$.divider.canGenerate = false;
        }
        if (!nextMessage || (nextMessage.formattedDate !== inMessage.formattedDate)) {
            this.$.mailItem.$.client.domStyles["border-bottom"] = "none";
        }
    },

    hasAttachment: function (inMessage) {
        var parts = inMessage.parts || [];
        for (var i = 0, p; (p = parts[i]); i++) {
            if (p.type == "attachment") {
                return true;
            }
        }
        return false;
    },

    itemClick: function (inSender, inEvent) {
        var sel = this.$.mailList.getSelection();
        var msg = this.$.mailList.fetch(inEvent.rowIndex);

        // This should never happen, but it seems to in certain cases.
        if (!msg || !this.folder) {
            console.error("itemClick: Missing message or folder.");
            return;
        }

        var multiEnabled = this.$.mailList.getSelection().multi;

        if (multiEnabled) {
            // Multi-select is currently on

            sel.select(msg._id);
            var selected = Object.keys(sel.selected).length;
            var temp = new enyo.g11n.Template($L("0#Select Items...|1#1 item selected...|1>##{num} items selected..."));
            var formattedMultiselectText = temp.formatChoice(selected, {num: selected});
            this.$.multiselectHeaderText.setContent(formattedMultiselectText);

            if (this.folder && this.folder.accountId === Folder.kFavoriteFoldersAccountID) {
                // Check if all the emails are in the same folder
                // FIXME there's probably a more efficient way to do this
                this.getAccountIdForSelectedEmails(enyo.hitch(this, "updateMoveToButton"));
            } else {
                this.$.moveToButton.setDisabled(false);
            }
        } else {
            // Multi-select is off

            // if drafts or outbox, don't actually select the message, as these need to show in the compose view
            var account = this._getAccountFromFolder(this.folder);
            if (account && (account.getOutboxFolderId() === this.folder._id || account.getDraftsFolderId() === this.folder._id)) {
                sel.clear();
            } else {
                this.setLastEmail(this.folder._id, msg._id);
            }

            this.doSelect(msg, true);
        }

        this.doItemClick();
    },

    updateMoveToButton: function (accountId) {
        this.$.moveToButton.setDisabled(!accountId);
    },

    syncClick: function () {
        // check for a connection first
        if (!enyo.application.isConnectionAvailable()) {
            MailErrorDialog.displayError(this, {
                message: $L("No Internet Connection.")
            });
            return;
        }
        // sync all accounts
        if (this.folder.accountId === Folder.kFavoriteFoldersAccountID) {
            this._syncAllInboxes();
        } else {
            mail.syncFolder(this.folder.accountId, this.folder._id, true);
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

        // FIXME handle All Inboxes / All Flagged
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
        if (window.PalmSystem) {
            EmailApp.Util.callService('palm://com.palm.db/find',
                {query: {from: "com.palm.email:1", where: [
                    {prop: "folderId", op: "=", val: this.folder._id}
                ], limit: 0}, count: true},
                this.showAboutFolder.bind(this));
        } else {
            this.showAboutFolder({returnValue: true, count: 999});
        }
    },

    // FIXME: this will not work until mail kind supports sorting...
    sortClick: function (inSender) {
        this.sort = inSender.sort;
        //this.getMailItems();
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
        var query = this.getListQuery({from: Email.KIND});
        Email.setEmailFlags({query: query}, {read: true}, null);
    },

    isTrashFolder: function (folder) {
        if (folder && folder._id && folder.accountId && folder.accountId != Folder.kFavoriteFoldersAccountID) {
            var account = this._getAccountFromFolder(folder);
            return account && account.getTrashFolderId() === folder._id;
        } else {
            return false;
        }
    },

    _getAccountFromFolder: function (folder) {
        return folder && enyo.application.accounts.getAccount(folder.accountId);
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

    deleteMessage: function (inSender, itemIndex) {

        var id = this.$.mailList.fetch(itemIndex)._id;

        var newerMsg = this.$.mailList.fetch(itemIndex - 1);
        var olderMsg = this.$.mailList.fetch(itemIndex + 1);

        inSender.setShowing(false); // hide row
        Email.deleteEmails({id: id});
        // delete should actually prefer newer first
        this.doMessageDeleted({next: (newerMsg || olderMsg)});
    },

    getLastQuery: function () {
        return this._lastQuery;
    },

    startSyncAnimation: function () {
        if (this.$.spinner.hasNode()) {
            if (this.spinnerAnimationTimer) {
                this.continueAnimation = true;
            } else {
                this.$.spinner.setShowing(true);
                //this.$.errorIcon.hide();

                this.currentFrame = 1;
                this.continueAnimation = true;

                var spinSync = this.spinSyncAnimation.bind(this);
                this.spinnerAnimationTimer = setInterval(spinSync, 50);

                this.$.folderUnread.setClassName("mail-unread-header " + this.unreadCountLength + " frame1");
                this.$.spinner.setClassName("sync-activity-animation " + this.unreadCountLength + " frame1");
            }
        }
    },

    requestStopSyncAnimation: function () {
        for (var folderId in this.syncStateWatches) {
            if (this.syncStateWatches.hasOwnProperty(folderId)) {
                if (Folder.isSyncing(this.syncStateWatches[folderId].syncState)) {
                    return;
                }
            }
        }

        this.continueAnimation = false;
        this.stopSyncAnimation();
    },

    stopSyncAnimation: function () {
        if (this.spinnerAnimationTimer) {
            clearInterval(this.spinnerAnimationTimer);
            this.spinnerAnimationTimer = null;
        }
        this.spinCleanup();
    },

    spinCleanup: function () {
        this.$.folderUnread.setClassName("mail-unread-header");
        this.$.spinner.setShowing(false);

        this.checkFolderError();
    },

    spinSyncAnimation: function () {
        if (!this.continueAnimation) {
            this.stopSyncAnimation();
            return;
        }

        this.currentFrame++;

        if (this.currentFrame > this.lastFrameSync) {
            if (this.continueAnimation) {
                this.currentFrame = 1;
            } else if (!this.lastFrameStop || this.currentFrame > this.lastFrameStop) {
                this.stopSyncAnimation();
            }
        }

        if (this.spinnerAnimationTimer) {
            this.$.folderUnread.setClassName("mail-unread-header " + this.unreadCountLength + " frame" + this.currentFrame);
            this.$.spinner.setClassName("sync-activity-animation " + this.unreadCountLength + " frame" + this.currentFrame);
        }
    },

    composeClick: function () {
        this.doComposeMessage({accountId: this.folder && this.folder.accountId});
    },

    editClick: function () {
        this.multiselectDone();

        var sel = this.$.mailList.getSelection();
        var ms = !sel.getMulti();
        var key;

        // Turned multiselect off?
        // Make sure correct item is reflected in the message panel.
        if (!ms) {
            key = sel.getSelectedKeys()[0];
            this.setMultiselect(false);
            if (key) {
                enyo.windows.setWindowParams(window, {emailId: key});
            } else {
                this.doSelect(undefined);
            }
        }
        else {
            this.setMultiselect(true);
        }
    },

    setMultiselect: function (multi) {
        var selection = this.$.mailList.getSelection();

        if (selection.multi === multi) {
            return;
        }

        // Blank message area when entering multiselect mode.
        if (multi) {
            this.doSelect(undefined);
        }

        this.$.mailToolbar.addRemoveClass("multiselect-color", multi);

        selection.setMulti(multi);

        this.$.composeButton.setShowing(!multi);
        this.$.syncButton.setShowing(!multi);
        this.$.editButton.setShowing(!multi);
        this.$.moveToButton.setShowing(multi);
        this.$.deleteButton.setShowing(multi);
        this.$.flagButton.setShowing(multi);


        // Configure header properly.
        this.$.searchHeader.setShowing(!multi);
        this.$.multiselectHeader.setShowing(multi);
        if (multi) {
            this.$.multiselectHeaderText.setContent($L("Select Items..."));
        }

        this.$.mailList.resized();
    },

    selectMessage: function (messageId) {
        var sel = this.$.mailList.getSelection();
        this.setMultiselect(false);
        sel.select(messageId);
    },

    getSelectedEmailIds: function () {
        var sel = this.$.mailList.getSelection();
        var ids = sel.getSelectedKeys();

        return ids;
    },

    // Returns a list of unique account ids for the given list of emails
    getAccountIdsForEmails: function (emails) {
        var accountIds = {};

        for (var i = 0; i < emails.length; i++) {
            var folderId = emails[i].folderId;

            var accountId = folderId && enyo.application.folderProcessor.getFolderAccount(folderId);

            if (accountId) {
                accountIds[accountId] = true;
            } else {
                return null;
            }
        }

        return Object.keys(accountIds);
    },

    getAccountIdForSelectedEmails: function (callback) {
        if (this.folder && this.folder.accountId === Folder.kFavoriteFoldersAccountID) {
            // Get account id
            Email.getEmailProps({ids: this.getSelectedEmailIds()}, ["folderId"], enyo.hitch(this, "gotEmailFolderIds", callback));
        } else if (this.folder) {
            callback(this.folder.accountId);
        } else {
            callback(null);
        }
    },

    gotEmailFolderIds: function (callback, response) {
        if (response.results) {
            var accountIds = this.getAccountIdsForEmails(response.results);

            if (accountIds.length === 1) {
                callback(accountIds[0]);
            } else {
                callback(null);
            }
        } else {
            // FIXME log error
            callback(null);
        }
    },

    multiselectDone: function () {
        var sel = this.$.mailList.getSelection();
        sel.clear();
        this.setMultiselect(false);

        this.$.searchHeader.setShowing(true);
        this.$.multiselectHeader.setShowing(false);
        this.$.editButton.setShowing(true);

        this.$.mailList.resized();
    },

    multiselectDelete: function () {
        var ids = this.getSelectedEmailIds();

        if (ids.length > 0) {
            MailDialogPrompt.displayPrompt(this, {
                caption: $L("Delete Messages"),
                message: $L("Delete the selected messages?"),
                acceptButtonCaption: $L("Delete"),
                onAccept: "confirmDelete"
            });
        }
    },

    confirmDelete: function (sender, event) {
        //console.log("DELETING "+JSON.stringify(ids));
        var ids = this.getSelectedEmailIds();
        this.doSelect(undefined, true); // clear all selections
        Email.deleteEmails({ids: ids});
        this.multiselectDone();
    },

    resetList: function () {
        this.$.mailList.punt();
    },

    bovineStrikeForce: function () {
        enyo.application.launcher.openCard("spawn", undefined, true);
    },

    multiselectMove: function () {
        var sel = this.$.mailList.getSelection();
        var ids = sel.getSelectedKeys();

        if (ids.length > 0) {
            this.getAccountIdForSelectedEmails(enyo.hitch(this, "showMoveToFolderPopup"));
        }
    },

    showMoveToFolderPopup: function (accountId) {
        if (accountId) {
            this.$.moveToFolderPopup.loadFolders(accountId);
            this.$.moveToFolderPopup.openAtCenter();
        } else {
            console.error("Can't show move to folder popup");
        }
    },

    moveToFolderSelected: function (inSender, folder) {
        var ids = this.getSelectedEmailIds();

        var targetFolderId = folder._id;

        if (targetFolderId) {
            Email.moveEmailsToFolder({ids: ids}, targetFolderId);
        } else {
            console.error("bad destination folder for move to folder");
        }

        this.multiselectDone();
    },

    // set or reset "flagged" state on selected emails.
    // If all emails are currently flagged, unflag them. Otherwise, set flag on all messages
    multiselectToggleFlagged: function () {
        var ids = this.getSelectedEmailIds();

        Email.getEmailFlags({ids: ids}, function (result) {
            var flag = false;
            var results = result.results;
            var i;
            if (result.returnValue) {
                for (i = 0; i < results.length; i++) {
                    if (!results[i].flags.flagged) {
                        flag = true;
                        break;
                    }
                }
                Email.setEmailFlags({ids: ids}, {flagged: flag});
            } else {
                this.log("dbQuery failure: " + JSON.stringify(result));
            }
        });

        this.multiselectDone();
    },

    showAboutFolder: function (response) {
        var account = this._getAccountFromFolder(this.folder);

        var timestamp = this.folder.lastSyncTime;

        var lastUpdatedStr = "";
        var totalCountStr = "";

        if (timestamp > 0) {
            var template = new enyo.g11n.Template($L("Updated #{dateOrTime}"));
            lastUpdatedStr = template.evaluate({dateOrTime: this.formatDateOrTime(timestamp)});
        } else {
            lastUpdatedStr = $L("Not yet updated");
        }

        if (true) {
            var template = new enyo.g11n.Template($L("Total emails #{totalEmails}"));
            totalCountStr = template.evaluate({totalEmails: response.count});
        }

        if (!account || this.folder._id === Folder.kFavoriteFoldersAccountID) {
            // TODO synthetic folders case
        } else {
            var info = {
                account: account,
                components: [
                    {content: lastUpdatedStr},
                    // TODO need non-escaped HTML once escaping is enabled
                    {content: totalCountStr}
                ]
            };

            this.$.aboutFolderPopup.setItems([info]);
            this.$.aboutFolderPopup.openAtCenter();
        }
    },
    initLastEmailHash: function () {
        this.lastEmailHash = {}; // Hash of folder id -> message id of last message displayed for this folder
    },
    setLastEmail: function (folderId, msgId) {
        this.lastEmailHash[folderId] = msgId;
    },
    getLastEmail: function (folderId) {
        return this.lastEmailHash[folderId];
    },
    blurSearchBox: function () {
        this.$.searchBox.forceBlur();
    }
});

enyo.kind({
    name: "FolderInfoPopup",
    kind: "enyo.ModalDialog",

    dismissWithClick: true,

    published: {
        items: [] // array of { account: account, components: UI components for folder }
    },

    components: [
        {name: "scroller", kind: "BasicScroller", autoVertical: true, vertical: false, style: "max-height: 300px;", components: [
            {name: "repeater", kind: "Repeater", onSetupRow: "getItem"},
        ]},
        {kind: "Button", caption: $L("Close"), onclick: "closeClick"}
    ],

    create: function () {
        this.inherited(arguments);

        if (!this.folders) {
            this.folders = [];
        }
    },

    componentsReady: function () {
        this.inherited(arguments);

        this.itemsChanged();
    },

    itemsChanged: function () {
        if (this.$.repeater) {
            this.$.repeater.render();
        }
    },

    getItem: function (inSender, index) {
        if (index < this.items.length) {
            var details = this.items[index];
            var acct = details.account;
            var accountIconPath = enyo.application.accounts.getIconById(acct.getId());


            return [
                {kind: "HFlexBox", className: "folder-info-item", components: [
                    {kind: "Image", style: "padding-right:4px", className: "account-icon", src: accountIconPath},
                    {kind: "Control", flex: 1, components: [
                        {className: "account-name", content: enyo.string.escapeHtml(acct.getAlias() || "")},
                        {className: "account-email", content: enyo.string.escapeHtml(acct.getEmailAddress())},
                        {kind: "Control", components: details.components, owner: details.owner}
                    ]},
                ]}
            ];
        }
    },

    closeClick: function () {
        this.close();
    }
});

enyo.kind({
    name: "SyncStateWatch",
    kind: enyo.Component,
    published: {
        folderId: "",
        accountId: "",
        mail: "",
        syncState: ""
    },

    create: function () {
        this.inherited(arguments);

        this.watch = new EmailApp.Util.MojoDBAutoFinder({
                select: ["collectionId", "syncState", "errorCode", "errorText"],
                from: 'com.palm.account.syncstate:1',
                where: [
                    {prop: "collectionId", op: "=", val: this.folderId},
                    {prop: "accountId", op: "=", val: this.accountId}
                ]
            },
            this.syncStateChanged.bind(this),
            undefined,
            true);
    },

    syncStateChanged: function (response) {
        var syncStateObj = response[0];
        this.syncState = syncStateObj ? syncStateObj.syncState : "";

        if (this.syncState && Folder.isSyncing(this.syncState)) {
            this.mail.startSyncAnimation();
        } else {
            this.mail.requestStopSyncAnimation();
        }
    },

    cancel: function () {
        this.watch.cancel();
        this.syncState = "";
    },

    destroy: function () {
        this.watch.cancel();
        this.mail = null;

        this.inherited(arguments);
    }
});
