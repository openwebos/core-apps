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

/* Watches com.palm.account.syncstate:1 in tempdb for sync state changes */
enyo.kind({
    name: "SyncStateWatcher",
    kind: "enyo.Component",

    published: {
        folderId: null
    },

    events: {
        onSyncStateChanged: ""
    },

    components: [
        {kind: "TempDbService", components: [
            {name: "syncStateFinder", method: "find", onSuccess: "findResponse", onWatch: "watchFired", subscribe: true, resubscribe: true}
        ]}
    ],

    create: function () {
        this.inherited(arguments);

        this.syncState = null;

        this.folderIdChanged();
    },

    folderIdChanged: function () {
        this.$.syncStateFinder.cancel();

        if (this.folderId) {
            this.runQuery();
        }
    },

    getSyncState: function () {
        return this.syncState;
    },

    isSyncing: function () {
        // FIXME make into constants
        return this.syncState === "INCREMENTAL_SYNC" || this.syncState === "INITIAL_SYNC";
    },

    runQuery: function () {
        var folderId = this.folderId;
        var accountId = folderId && enyo.application.folderProcessor.getFolderAccount(folderId);

        if (!accountId) {
            this.error("no accountId");
            return;
        }

        var query = {
            from: "com.palm.account.syncstate:1",
            where: [
                {prop: "collectionId", op: "=", val: folderId},
                {prop: "accountId", op: "=", val: accountId}
            ]
        };

        this.$.syncStateFinder.call({query: query});
    },

    findResponse: function (sender, response) {
        //this.log( JSON.stringify(response) );

        if (response.results && response.results.length >= 1) {
            var syncStateObj = response.results[0];

            this.syncState = syncStateObj && syncStateObj.syncState;
        } else {
            this.syncState = null;
        }

        this.doSyncStateChanged();
    },

    watchFired: function () {
        this.runQuery();
    }
});

/* Monitors sync state of folder(s) */
enyo.kind({
    name: "FolderStateWatcher",
    kind: "Control",

    events: {
        onStateChanged: "" // called when isSyncing() changes or error occurs
    },

    published: {
        folderIds: null,
        hasError: null
    },

    components: [
        {kind: "EmailApp.BroadcastSubscriber", target: "enyo.application.accounts", onChange: "checkAccountErrors"}
    ],

    create: function () {
        this.inherited(arguments);

        this.syncStateWatchers = [];
        this.numFoldersSyncing = 0;
    },

    folderIdsChanged: function (old) {
        if (old !== this.folderIds) {
            this.destroySyncStateWatchers();

            // Start watching tempdb
            this.initSyncStateWatchers(this.folderIds);
        }
        
        this.hasError = false;
        this.checkAccountErrors();
    },

    initSyncStateWatchers: function (folderIds) {
        folderIds = folderIds || [];

        folderIds.forEach(function (folderId) {
            var watcher = this.createComponent({
                kind: "SyncStateWatcher",
                onSyncStateChanged: "syncStateChanged",
                folderId: folderId
            });

            this.syncStateWatchers.push(watcher);
        }, this);
    },

    destroySyncStateWatchers: function () {
        this.syncStateWatchers.forEach(function (watcher) {
            watcher.destroy();
        });

        this.syncStateWatchers = [];
        this.numFoldersSyncing = 0;
    },

    isSyncing: function () {
        return this.numFoldersSyncing > 0;
    },

    syncStateChanged: function (sender, folderId) {
        //this.log("sync state changed: folderId = " + folderId + " syncing = " + sender.isSyncing());

        this.numFoldersSyncing = 0;

        // Count number of folders currently syncing
        this.syncStateWatchers.forEach(function (watcher) {
            if (watcher.isSyncing()) {
                this.numFoldersSyncing++;
            }
        }, this);

        this.doStateChanged();
    },
    
    checkAccountErrors: function () {
        // Check relevant accounts
        var hasError = false;
        
        enyo.forEach(this.folderIds, function (folderId) {
            var accountId = folderId && enyo.application.folderProcessor.getFolderAccount(folderId);
            var account = accountId && enyo.application.accounts.getAccount(accountId);
            
            if (account && account.hasAnyError()) {
                hasError = true;
            }
        });
        
        if (hasError != this.hasError) {
            this.hasError = hasError;
            this.doStateChanged();
        }
    }
});

enyo.kind({
    name: "UnreadCountWatcher",
    kind: enyo.Component,
    
    published: {
        folderId: null,
        count: 0
    },
    
    events: {
        onUnreadCountChanged: ""
    },
    
    components: [
        {kind: "DbService", components: [
            {name: "unreadQuery", method: "find", onSuccess: "findResponse", onWatch: "watchFired", subscribe: true, resubscribe: true}
        ]}
    ],
    
    create: function() {
        this.inherited(arguments);
        
        this.folderIdChanged();
    },
    
    folderIdChanged: function() {
        this.$.unreadQuery.cancel();
        this.count = -1;
        
        if (this.folderId) {
            this.runQuery();
        }
    },
    
    runQuery: function() {
        var query;
    
        if (EmailApp.Util.isThreadingEnabled()) {
            folderKey = this.folderId;
    
            if (folderKey == Folder.kAllInboxesFolderID) {
                folderKey = "#INBOXES#";
            } else if (folderKey == Folder.kAllFlaggedFolderID) {
                folderKey = "#FLAGGED#";
            }
        
            query = {
                from: "com.palm.email.conversation:1",
                where: [
                    {prop: "folderKeys", op: "=", val: folderKey},
                    {prop: "flags.read", op: "=", val: false}
                ],
                limit: 0
            };
        } else {
            query = EmailApp.Util.generateUnreadCountQuery(this.folderId);
        }
        
        this.$.unreadQuery.call({query: query, count: true});
    },
    
    findResponse: function(sender, response, query) {
        if (response && response.count !== undefined) {
            if (response.count !== this.count) {
                this.count = response.count;
                this.doUnreadCountChanged(this.folderId, this.count);
            }
        } else {
            console.error("error getting unread count: " + JSON.stringify(response));
        }
    },
    
    watchFired: function() {
        this.runQuery();
    }
});