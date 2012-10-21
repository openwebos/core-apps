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
    name: "EmailList",
    kind: "VFlexBox",

    published: {
        folder: null,
        searchString: ""
    },

    events: {
        onListLoaded: "", // list is ready to display
        onConversationClick: "", // conversation is clicked
        onSelectionChanged: "", // multi-select selection changed
        onSwipeDelete: ""            // deleted an email by swiping; parameter is VirtualConversation
    },

    components: [
        {kind: "DbService", onFailure: "dbFail", components: [
            {name: "conversationFinder", method: "find", subscribe: true, resubscribe: true, onSuccess: "queryResponse", onWatch: "queryWatch"}
        ]},

        /* Custom selection (not using the DbList selection) */
        {name: "mailSel", kind: "CustomSelection", onSelect: "updateRecord", onDeselect: "updateRecord"},

        /* Notice that appears when there's no emails */
        {name: "noEmailsNotice", className: "emailList-no-emails-notice", showing: false},

        /* Main DbList */
        {kind: "DbList", name: "dbList", flex: 1, pageSize: 50, onQuery: "listQuery", onSetupRow: "renderItem", desc: true, components: [
            {name: "divider", captureState: false, kind: "Divider", showing: false, className: "divider-bg", caption: ""},
            {name: "item", kind: "DarkSwipeable", tapHighlight: true, className: "mail-item", onclick: "itemClick", onDrag: "selectDraggedMessage", onConfirm: "deleteMessage", components: [
                {name: "emailItem", kind: "HFlexBox", components: [
                    {name: "icons", kind: "VFlexBox", width: "18px", align: "center", pack: "center", style: "margin-left:3px; margin-right:3px;", components: [
                        {name: "flag", captureState: false, kind: "Image", className: "mail-icon-padding", src: "../images/list-flagged.png", wantsEvents: false},
                        {name: "priorityFlag", captureState: false, kind: "Image", className: "mail-icon-padding", src: "../images/list-priority-flagged.png", wantsEvents: false},
                        {name: "status", captureState: false, kind: "Image", className: "mail-icon-padding", src: "", wantsEvents: false},
                        {name: "invite", captureState: false, kind: "Image", className: "mail-icon-padding", src: "../images/list-cal-invite.png", wantsEvents: false}
                    ]},
                    {kind: "VFlexBox", className: "emailItem-text", height: "60px", width: "284px", components: [
                        {kind: "HFlexBox", components: [
                            {name: "line1", flex: 1, className: "truncated-text emailItem-line1", wantsEvents: false, captureState: false},
                            {name: "attach", kind: "Image", className: "emailItem-attach-icon", src: "../images/attachment-icon.png", wantsEvents: false, captureState: false},
                            {name: "when", className: "mail-when", captureState: false}
                        ]},
                        {name: "line2", className: "truncated-text emailItem-line2", flex: 1, wantsEvents: false, captureState: false},
                        {name: "summary", className: "truncated-text emailItem-blurb", wantsEvents: false, captureState: false}
                    ]}
                ]}
            ]}
        ]}
    ],

    create: function () {
        this.inherited(arguments);

        this.timeFormatter = new enyo.g11n.DateFmt({
            time: "short"
        });

        this.dateFormatter = new enyo.g11n.DateFmt({
            date: "short"
        });

        this.subjectCountFormat = new enyo.g11n.Template($L("(#{count}) #{subject}"));

        this.idToIndexMap = {};
    },

    rendered: function () {
        this.inherited(arguments);

        this.rendered = true;
    },
    
    getCurrentAccount: function () {
        return this.folder && enyo.application.accounts.getAccount(this.folder.accountId);
    },

    folderChanged: function () {
        // FIXME ideally this check shouldn't be necessary, but DbList is buggy
        if (this.rendered) {
            // Reset list (re-render and scroll to top)
            // FIXME currently causes flicker; framework team needs to investigate
            this.$.dbList.punt();
        }

        this.$.noEmailsNotice.hide();
    },

    searchStringChanged: function () {
        //this.log("email list search string changed");
        this.$.dbList.punt();
    },

    // [public]
    getEmailsQuery: function (queryParams) {
        //console.log("getEmailsQuery called");

        var query = {
            from: "com.palm.email:1"
        };

        // If we have no folder, we end up sending an invalid query -- no index available.
        // However, there's currently no simple way around it. If we return undefined instead of a request object, the list is left in a funky state.
        var folderId = this.folder && this.folder._id;
        if (folderId === Folder.kAllInboxesFolderID) {
            query.where = [
                { prop: "flags.visible", op: "=", val: true },
                { prop: "withinInbox", op: "=", val: true }
            ];
            query.orderBy = "sortKeys.allInboxes";
        } else if (folderId === Folder.kAllFlaggedFolderID) {
            query.where = [
                { prop: "flags.visible", op: "=", val: true },
                { prop: "flags.flagged", op: "=", val: true }
            ];
            query.orderBy = "sortKeys.allFlagged";
        } else {
            query.where = [
                { prop: "flags.visible", op: "=", val: true },
                { prop: "folderId", op: "=", val: folderId || [] }
            ];
            query.orderBy = "sortKeys.list"; // FIXME: tweak dbkind to keep index on timestamp.
        }

        if (this.searchString) {
            // Add search string:
            query.where.push({prop: "searchText", op: "?", val: this.searchString, collate: "primary"});

            // If we're filtering, we need to pick out the 2nd term in
            // the where clause and move it to a filter clause instead.
            // This allow us to use the universal search index for typedown in all views.
            // The additional criteria for the specific view is used to post-filter the data instead.
            query.filter = query.where.splice(1, 1);

            query.limit = 100;
        }

        enyo.mixin(query, queryParams);

        return query;
    },

    getConversationsQuery: function (queryParams) {
        var folderKey = "#NONE#";

        if (this.folder) {
            folderKey = this.folder._id;
        }

        if (folderKey == Folder.kAllInboxesFolderID) {
            folderKey = "#INBOXES#";
        } else if (folderKey == Folder.kAllFlaggedFolderID) {
            folderKey = "#FLAGGED#";
        }

        var whereClause = [
            {prop: "folderKeys", op: "=", val: folderKey}
        ];

        if (this.searchString && this.searchString.length > 0) {
            whereClause.push({prop: "searchText", op: "?", val: this.searchString, collate: "primary"});
        }

        var query = {
            from: "com.palm.email.conversation:1",
            where: whereClause,
            orderBy: "timestamp"
        };

        query = enyo.mixin(query, queryParams);

        return query;
    },
    
    // [public]
    getQueryInfo: function (queryParams) {
        queryParams = queryParams || {};
    
        var query = EmailApp.Util.isThreadingEnabled() ? this.getConversationsQuery(queryParams) : this.getEmailsQuery(queryParams);
        
        var method = "find";
        if (this.searchString && this.searchString.length > 0) {
            method = "search";
        }
        
        return {query: query, method: method};
    },

    listQuery: function (inSender, queryParams) {
        //console.log("listQuery called");

        var queryInfo = this.getQueryInfo(queryParams);

        this.gotSomeResults = false;
        return this.$.conversationFinder.call({query: queryInfo.query}, {method: queryInfo.method});
    },

    updateEmptyFolderMessage: function (isEmpty) {
        var wasShowing = this.$.noEmailsNotice.getShowing();

        // No results?
        if (isEmpty && this.folder) {
            var account = enyo.application.accounts.getAccount(this.folder.accountId);
            var lookback = account && account.getSyncLookback();
            var text = "";

            var folderId = this.folder._id;

            // Adjust lookback based on protocol / transport implementation
            // TODO: use some kind of capability flag in template instead of hardcoding by type
            if (account && folderId === account.getOutboxFolderId()) {
                // Outbox never syncs
                lookback = 0;
            }
            if (account && account.getType() == "EAS") {
                // Hack to deal with EAS hardcoded lookbacks for specific folders
                if (folderId === account.getTrashFolderId()) {
                    lookback = 1;
                } else if (folderId === account.getSentFolderId()) {
                    lookback = 3;
                }
            } else if (account && account.getType() == "POP" && folderId !== account.getInboxFolderId()) {
                // POP only syncs inbox
                lookback = 0;
            }

            // FIXME get proper wording/styling from HI
            if (this.searchString) {
                text = $L("No matching emails found.");
            } else if (lookback > 0) {
                text = new enyo.g11n.Template($L("1>#No emails in the last #{days} days.|1#No emails in the last day.")).formatChoice(lookback, {days: lookback});
            } else {
                // FIXME check for lastSyncTime or initial sync
                text = $L("No emails in this folder.");
            }

            this.$.noEmailsNotice.setContent(text);
            this.$.noEmailsNotice.show();
        } else {
            this.$.noEmailsNotice.hide();
        }

        var isShowing = this.$.noEmailsNotice.getShowing();

        // check if we need to send a resized event to the list
        if (wasShowing !== isShowing) {
            this.$.dbList.resized();
        }
    },

    queryResponse: function (inSender, response, request) {
        //console.log("got query response");
        
        this.$.dbList.queryResponse(response, request);

        if (response && response.results) {
            if (response.results.length > 0) {
                this.gotSomeResults = true;
                this.updateEmptyFolderMessage(false);
            } else if (!this.gotSomeResults) {
                // no results
                this.updateEmptyFolderMessage(true);
            }
        }
        
        // Let everyone know the list is ready to display
        this.doListLoaded();
    },

    queryWatch: function () {
        this.$.dbList.reset();
        this.idToIndexMap = {};

        this.updateEmptyFolderMessage(false);
    },

    isToday: function (timestamp) {
        var lastMidnight = new Date();
        lastMidnight.setHours(0);
        lastMidnight.setMinutes(0);
        lastMidnight.setSeconds(0);
        var todayStart = lastMidnight.getTime();
        var tomorrowStart = todayStart + 86400000; // (1000 * 60 * 60 *24)
        return timestamp >= todayStart && timestamp < tomorrowStart;
    },
    
    formatSender: function (obj) {
        var account = this.getCurrentAccount();
    
        if (account && obj.addr && obj.addr === account.getEmailAddress()) {
            return $L("me");
        } else {
            return obj.name || obj.addr || "";
        }
    },

    // Renders a row in the email list
    // NOTE: as an optimization, most of the item components have captureState: false set.
    // This means that every item should have its content/showing/canGenerate updated to avoid
    // rendering stale data since the state isn't reset between calls to renderItem.
    renderItem: function (inSender, record, index) {
        //console.log("rendering item " + record._id + " index = " + index);

        var thread = new VirtualConversation(record);

        // Record row for future reference
        this.idToIndexMap[record._id] = index;

        // Set highlight
        var sel = this.$.mailSel;
        this.$.item.$.client.addRemoveClass("active-msg", sel.isSelected(record._id));

        // Indirection to make it easier to try different arrangements
        var subjectLine = this.$.line2;
        var senderLine = this.$.line1;
        var displayAllSenders = false;
        
        var isOutgoing = thread.getAccount().isOutgoingFolderId(thread.getFolderId());
        if (isOutgoing) {
            displayAllSenders = true;
        }

        // Set subject
        var subject = thread.getSubject() || $L("No Subject");
        if (thread.getEmailCount() > 1) {
            subjectLine.setContent(this.subjectCountFormat.evaluate({count: thread.getEmailCount(), subject: subject}));
        } else {
            subjectLine.setContent(subject);
        }
        
        var sendersText = "";
        var senders = thread.getSenders();
        var sender;
        
        if (displayAllSenders) {
            var senderNames = [];

            for (var si = 0; si < senders.length; si += 1) {
                senderNames.push(this.formatSender(senders[si]));
            }
            sendersText = senderNames.join(", ");

            if (senderNames.length > 2) {
                sendersText += " (" + senderNames.length + ")";
            }
        } else {
            // get most recent sender
            sendersText = this.formatSender(senders[0]);
        }
        senderLine.setContent(sendersText);

        // Set summary
        this.$.summary.setContent(thread.getSummary());

        // Flags
        var flags = thread.getFlags();
        this.$.item.domStyles["font-weight"] = flags.read ? null : "bold";

        this.$.flag.canGenerate = !!flags.flagged;
        this.$.priorityFlag.canGenerate = thread.getPriority() === "high";
        this.$.invite.canGenerate = thread.hasMeetingInfo();

        // Status
        // Configure send/reply/fwd
        var imageRoot = "../images/";
        
        this.$.status.canGenerate = true;
        if (thread.hasError()) {
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
            this.$.status.canGenerate = false;
        }

        // Timestamp
        var timestamp = thread.getTimestamp();
        var when = this.isToday(timestamp) ? this.timeFormatter.format(new Date(timestamp)) : this.dateFormatter.format(new Date(timestamp));
        this.$.when.setContent(when);

        this.$.attach.canGenerate = thread.hasAttachment();

        // Confirm delete?
        var confirmDeleteOnSwipe = enyo.application.prefs.get("confirmDeleteOnSwipe");
        this.$.item.setConfirmRequired(confirmDeleteOnSwipe);
        this.$.item.setSwipeable(!sel.multi);

        if (sel.multi) {
            this.$.item.setConfirmShowing(false);
        }

        this.getDivider(record, index);
    },

    getDivider: function (inMessage, inIndex) {
        var nextMessage = this.$.dbList.fetch(inIndex + 1);
        var previousMessage = this.$.dbList.fetch(inIndex - 1);

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
            this.$.item.$.client.domStyles["border-top"] = "none";
        } else {
            // Do not generate HTML for hidden dividers.
            this.$.divider.canGenerate = false;
        }

        if (!nextMessage || (nextMessage.formattedDate !== inMessage.formattedDate)) {
            this.$.item.$.client.domStyles["border-bottom"] = "none";
        }
    },

    itemClick: function (inSender, inEvent) {
        var record = this.$.dbList.fetch(inEvent.rowIndex);

        // FIXME keep for debugging for right now, but remove later
        //console.log("Selecting conversation " + JSON.stringify(record));

        var virtualConv = new VirtualConversation(record);

        var sel = this.$.mailSel;

        if (sel && sel.multi) {
            // update selection
            sel.toggle(record._id);
            this.doSelectionChanged();
        }

        this.doConversationClick(virtualConv);
    },

    // Look up the row index of a given messageId
    getCachedRowIndex: function (messageId) {
        return this.idToIndexMap[messageId];
    },

    // Re-render a row (usually to change selection highlight)
    updateRecord: function (sender, messageId) {
        //this.log("updating selection for " + messageId);

        var index = this.getCachedRowIndex(messageId);

        if (index !== undefined) {
            this.$.dbList.updateRow(index);
        }
    },

    // [public]
    // Select/highlight a given messageId in the list
    // NOTE: The email may not be in the current window, but adding it to the selection
    // ensures that it'll show up as selected (highlighted) if the user scrolls to it later.
    setSelected: function (messageId) {
        var sel = this.$.mailSel;

        sel.setMulti(false);

        if (!messageId) {
            sel.clear();
            return;
        }

        sel.select(messageId);
    },

    // [public]
    // ensure that a given id isn't selected
    forceDeselect: function (id) {
        var sel = this.$.mailSel;

        if (sel.isSelected(id)) {
            sel.deselect(id);

            // FIXME add event to let owner know
        }
    },

    // [public]
    reset: function () {
        this.$.dbList.reset();
    },

    // [public]
    setMultiSelect: function (enabled) {
        var sel = this.$.mailSel;

        sel.clear();
        sel.setMulti(enabled);

        // Re-render list to get rid of swipe-delete confirmations, etc
        this.$.dbList.refresh();
    },

    // [public]
    getSelectedIds: function () {
        // This is using our modified MessageSelection.js code
        return this.$.mailSel.getSelectedKeys() || [];
    },

    deleteMessage: function (sender, index) {
        var record = this.$.dbList.fetch(index);
        var virtualConv = new VirtualConversation(record);

        this.doSwipeDelete(virtualConv);
    }
});
