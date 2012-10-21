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
    name: "EmailProcessor2",
    kind: "enyo.Component",

    /* Number of added/deleted conversations before purging old deleted conversations.
     * Normally, we allow mojodb to handle clearing deleted conversations (usually after
     * two weeks), but if the user is syncing a large number of emails (10,000+)
     * we may need to do it sooner to avoid running out of space.
     *
     * Don't make this too high or the purge request will be very slow.
     */
    PURGE_FREQUENCY: 2500,
    
    /**
     * Index version. Used to handle upgrades.
     */
    LATEST_PROCESSOR_STATE_VERSION: 1,
    
    /**
     * DB kind for processor state
     */
    PROCESSOR_STATE_KIND: "com.palm.email.processorstate:1",
    
    /**
     * Used to identify the app/service that owns the processor state record
     */
    PROCESSOR_NAME: "com.palm.app.email.processor",
    
    mixins: [
        EmailApp.Broadcaster
    ],

    components: [
        {name: "db", kind: "DbService", components: [
            {name: "emailWatch", kind: "DbService", method: "find",
                subscribe: true, resubscribe: true,
                onResponse: "subscribeChangesResponse",
                onWatch: "subscribeChangesResponse"
            },
            {name: "purgeDeleted", method: "del"}
        ]},
        {name: "initialRevQueue", kind: "InitialRevQueue"}
    ],

    create: function () {
        this.inherited(arguments);
        this.pendingRequests = {};
    },

    // [public]
    run: function () {
        this.loadProcessorState();
    },

    // [public]
    disableThreading: function () {
        this.pendingRequests.wipe = true;
        this.checkRequests();
    },

    // [public]
    rebuildIndex: function () {
        this.pendingRequests.wipe = true;
        this.checkRequests();
    },
    
    // [public]
    isRebuilding: function () {
        return this.rebuilding;
    },

    // [public]
    getProcessorState: function () {
        return this.processorState;
    },

    // [public]
    getInitialRevQueue: function () {
        return this.$.initialRevQueue;
    },

    // [public]
    getLastProcessedRev: function () {
        return this.processorState && this.processorState.lastProcessedRev;
    },

    // [public]
    setLastProcessedRev: function (rev) {
        this.processorState.lastProcessedRev = rev;
    },
    
    // [public]
    useThreading: function () {
        return this.processorState.threadingEnabled;
    },
    
    // Saves the current account info into the processor state so that it's
    // consistent while we're processing. Also, we can tell if there's been
    // a significant change to the accounts that requires reindexing or cleanup.
    // 
    // FIXME: currently processor commands are not using account states
    updateAccountStates: function () {
        if (!this.processorState) {
            return;
        }
    
        var accounts = enyo.application.accounts.getAccounts();
        var newStates = {};
        var existingStates = this.processorState.accounts || {};
        
        enyo.forEach(accounts, function (account) {
            newStates[account.getId()] = {
                // Currently not saving any data
                // Should track special folder ids later
            };
        });
        
        var deletedAccountIds = [];
        
        for (var accountId in existingStates) {
            if (!newStates[accountId]) {
                // deleted
                deletedAccountIds.push(accountId);
            }
        }
        
        this.processorState.accounts = newStates;
        
        return {
            deletedAccountIds: deletedAccountIds
        };
    },
    
    // [public]
    getAccountState: function (accountId) {
        return this.processorState.accounts[accountId];
    },
    
    // [public]
    // buggy / needs a lot of work to implement
    // changes needed:
    //  - stop using VirtualConversation folderId in app
    //  - hide duplicate emails (e.g. cc copy + sent copy) from view and count
    //  - auto-sync for sent folder (at minimum)
    //  - thread merging?
    //  - prevent merging emails in trash
    useCrossFolderThreading: function () {
        return this.processorState.crossFolderThreading;
    },

    // [public]
    // Track the number of added and deleted database records.
    // Periodically triggers a cleanup when the count passes a certain threshold.
    countAddDelete: function (numChanges) {
        this.processorState.addDeleteCount += numChanges;

        //console.log("add delete count " + this.processorState.addDeleteCount + " changes " + numChanges);

        if (this.processorState.addDeleteCount > this.PURGE_FREQUENCY) {
            this.log("purging old deleted conversations");

            this.processorState.addDeleteCount = 0;
            this.purgeDeleted();
        }
    },

    // Purge deleted conversation records from the database
    purgeDeleted: function () {
        var purgeQuery = {
            from: "com.palm.email.conversation:1", // FIXME use constant
            where: [
                {prop: "_del", op: "=", val: true}
            ]
        };

        this.$.purgeDeleted.call({query: purgeQuery, purge: true});
    },

    // Load version and configuration details about the email database
    loadProcessorState: function () {
        this.$.db.call({
            query: {
                from: this.PROCESSOR_STATE_KIND,
                where: [
                    {prop: "name", op: "=", val: this.PROCESSOR_NAME}
                ]
            }
        }, {method: "find", onResponse: "gotProcessorState"});
    },

    // Handle loaded processorstate record.
    // TODO: Check for version changes, new/removed accounts, etc.
    gotProcessorState: function (sender, response) {
        if (response && response.results && response.results.length > 0) {
            var record = response.results[0];

            this.processorState = record;

            this.log("loaded processor state: version=" + record.processorVersion + " rev= " + record.lastProcessedRev);

            this.processPendingRequests();
        } else {
            // Database record doesn't exist. Create one.
            this.createProcessorState();
        }
    },

    // Create new processor state record
    createProcessorState: function () {
        // Your concrete heart isn't beating
        this.processorState = {
            _kind: this.PROCESSOR_STATE_KIND,
            processorVersion: this.LATEST_PROCESSOR_STATE_VERSION,
            name: this.PROCESSOR_NAME,
            lastProcessedRev: 0,
            addDeleteCount: 0,
            threadingEnabled: EmailApp.Util.isThreadingEnabled(),
            crossFolderThreading: enyo.application.prefs.get("crossFolderThreading") || false
        };

        // And I've tried to make it come alive
        this.$.db.call({objects: [this.processorState]}, {method: "put", onResponse: "createProcessorStateResponse"});
    },

    createProcessorStateResponse: function (response) {
        if (!response || !response.returnValue) {
            this.error("error creating processorstate");
        } else {
            // I'm making a note here: HUGE SUCCESS
            this.log("created new processor state");
        }

        // It's hard to overstate my satisfaction.
        this.processPendingRequests();
    },

    // Start processing requests if there's nothing currently running
    checkRequests: function () {
        if (!this.$.currentCommand) {
            this.$.emailWatch.cancel();
            this.processPendingRequests();
        }
    },

    // This should be called when there are no active commands
    processPendingRequests: function () {
        // Load the latest account info
        // Will get saved after the next command executed completes
        var accountChanges = this.updateAccountStates();
    
        // Check if we need to rebuild the thread index
        if (this.pendingRequests.wipe) {
            this.log("wiping thread index");
            this.rebuilding = true;
            this.broadcast("rebuildIndexUpdate");
            
            delete this.pendingRequests.wipe;

            this.processorState.threadingEnabled = EmailApp.Util.isThreadingEnabled();
            this.processorState.crossFolderThreading = enyo.application.prefs.get("crossFolderThreading") || false;
            this.setLastProcessedRev(-1);
            this.runCommand("DisableThreadingCommand", {});
            return;
        }
        
        // Check if we need to clean up any deleted accounts
        if (accountChanges.deletedAccountIds.length > 0) {
            this.log("cleaning up orphaned conversations for accounts " +
                JSON.stringify(accountChanges.deletedAccountIds));
            
            this.runCommand("CleanupDeletedAccountsCommand", {
                deletedAccountIds: accountChanges.deletedAccountIds
            });
            
            return;
        }

        // TODO: Check other stuff like special folder assignment changes

        // If nothing else is going on, watch for new email changes.
        // This will also fire immediately if there's anything new.
        this.subscribeChanges();
    },

    subscribeChanges: function () {
        //console.log("checking for emails with rev > " + this.getLastProcessedRev());

        var query = {
            from: "com.palm.email:1",
            where: [
                {prop: "EmailProcessorRev", op: ">", val: this.getLastProcessedRev() || 0}
            ],
            incDel: true,
            limit: 0
        };

        this.$.emailWatch.call({query: query, watch: true, count: true});
    },

    subscribeChangesResponse: function (sender, response) {
        if (response.errorCode) {
            this.error("subscribeChanges response: " + JSON.stringify(response));
        }

        if (response.fired || response.count > 0) {
            this.$.emailWatch.cancel();
            this.indexUpToDate = false;

            this.runCommand("ProcessEmailChangesCommand", {processor: this, startRev: this.getLastProcessedRev()});
        } else if (response.count === 0) {
            this.indexUpToDate = true;
            this.rebuilding = false;
            this.broadcast("rebuildIndexUpdate");
        }
    },

    runCommand: function (commandName, props) {
        var createArgs = {name: "currentCommand", kind: commandName, processor: this, onDone: "handleCommandDone"};
        enyo.mixin(createArgs, props || {});

        var command = this.createComponent(createArgs);
        command.run();
    },

    handleCommandDone: function (sender) {
        sender.destroy();
        this.saveProcessorState();
    },

    // Update com.palm.email.processorstate record so that the sync transports know which
    // emails are safe to purge.
    saveProcessorState: function () {
        var stateProps = {
            processorVersion: this.LATEST_PROCESSOR_STATE_VERSION,
            lastProcessedRev: this.getLastProcessedRev(),
            addDeleteCount: this.processorState.addDeleteCount || 0,
            threadingEnabled: this.processorState.threadingEnabled,
            crossFolderThreading: this.processorState.crossFolderThreading,
            accounts: this.processorState.accounts || {}
        };

        this.$.db.call({
            props: stateProps,
            query: {
                from: this.PROCESSOR_STATE_KIND,
                where: [
                    {prop: "name", op: "=", val: this.PROCESSOR_NAME}
                ]
            }
        }, {method: "merge", onResponse: "saveProcessorStateResponse"});
    },

    saveProcessorStateResponse: function (sender, response) {
        this.processPendingRequests();
    },

    // [public]
    // returns stats for debugging
    getStatus: function () {
        var status = {
            processorState: enyo.clone(this.getProcessorState()),
            command: this.$.command && { name: this.$.command.name },
            pendingRequests: enyo.clone(this.pendingRequests)
        };

        return status;
    }
});

// Abstract command for processing emails
enyo.kind({
    name: "EmailProcessorCommand",
    kind: "enyo.Component",

    events: {
        onDone: ""
    },

    published: {
        processor: null,
        readOnly: false /* if true, observe changes but don't touch any email records */
    },

    components: [
        {name: "db", kind: "DbService", onFailure: "handleFailure"}
    ],

    run: function () {
        // this should be overridden
    },

    handleFailure: function (sender, response) {
        this.error("errorCode = " + response.errorCode + ", errorText = " + response.errorText);
        this.done();
    },

    done: function () {
        this.doDone();
    }
});
