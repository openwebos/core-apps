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
    name: "ProcessEmailChangesCommand",
    kind: "EmailProcessorCommand",
    
    /* Number of emails to request at a time */
    BATCH_SIZE: 100,

    create: function () {
        this.inherited(arguments);

        this.highestRev = -1;
    },

    published: {
        startRev: -1
    },

    components: [
        {name: "db", onFailure: "handleFailure", kind: "DbService", components: [
            {name: "getChangedEmails", method: "find", onSuccess: "processChangedEmails"},
            {name: "mergeStandalone", method: "merge", onSuccess: "mergeStandaloneDone"},
            {name: "purgeDeleted", method: "del"}
        ]}
    ],

    run: function () {
        this.updateCounter = 0;

        // get changes since last processed rev
        this.getChangedEmails();
    },

    getChangedEmails: function () {
        // FIXME: Would be nice to add select statement to limit amount of data processed,
        // but there's a bug in mojodb where _del doesn't get selected.
        var query = {
            from: "com.palm.email:1",
            where: [
                {prop: "EmailProcessorRev", op: ">", val: this.startRev}
            ],
            limit: this.BATCH_SIZE,
            incDel: true
        };

        this.log("getChangedEmails request rev=" + this.startRev + " pageKey " + this.pageKey);
        if (this.pageKey) {
            query.page = this.pageKey;
        }

        this.$.getChangedEmails.call({query: query});
    },

    processChangedEmails: function (sender, response) {
        var i;
        var results = response.results;

        this.pageKey = response.next;

        if (results && results.length > 0) {
            this.updatedEmails = [];
            this.newEmails = [];
            this.standaloneChanges = [];

            this.log("processChangedEmails got " + results.length + " responses; next pageKey " + this.pageKey);

            for (i = 0; i < results.length; i += 1) {
                var email = results[i];

                // Update startRev
                if (email._rev > this.highestRev) {
                    this.highestRev = email._rev;
                }

                // Process changes needed for non-threaded email implementation
                // TODO: Move after threading processing so notifications can
                // query conversations
                try {
                    this.processEmail(email);
                } catch (e) {
                    console.error("error processing email " + email._id + ": " + e);
                }

                if (email.conversationId) {
                    this.updatedEmails.push(email);
                } else if (!email._del && !(email.flags && email.flags.visible === false)) {
                    this.newEmails.push(email);
                }
            }

            if (this.standaloneChanges.length > 0) {
                this.mergeStandaloneChanges();
            } else {
                this.processThreadedEmails();
            }
        } else {
            this.log("no more results");
            this.doneProcessing();
        }
    },

    // mostly legacy processing for individual emails
    processEmail: function (email) {
        var changes = {};

        // Clear read/deleted emails from notifications -- TODO move to dashboardManager?
        if (email._del || (email.flags && email.flags.read)) {
            enyo.application.dashboardManager.clear(undefined, undefined, email._id);
        }

        if (email._del) {
            // don't process deleted emails here
            return;
        }

        // Queue initialRev for notification processing of new emails
        if (!email.initialRev) {
            this.processor.getInitialRevQueue().processEmail(email);
        }

        // Set withinInbox for inbox emails -- used for non-threaded all inboxes support
        var accountId = enyo.application.folderProcessor.getFolderAccount(email.folderId);
        var account = enyo.application.accounts.getAccount(accountId);

        var withinInbox = account && account.getInboxFolderId() === email.folderId;
        if (email.withinInbox !== withinInbox) {
            changes.withinInbox = withinInbox;
        }

        // Add sort keys -- currently we only support timestamp

        // Helper function to add a sort key
        var updateSortKey = function (email, type, key) {
            if (!email.sortKeys || email.sortKeys !== key) {
                changes.sortKeys = changes.sortKeys || email.sortKeys || {};
                changes.sortKeys[type] = key;
            }
        };

        var sortKey = email.timestamp;

        updateSortKey(email, "list", sortKey);
        updateSortKey(email, "allInboxes", sortKey);
        updateSortKey(email, "allFlagged", sortKey);

        // Save changes, if any
        if (Object.keys(changes).length > 0) {
            changes._id = email._id;
            this.standaloneChanges.push(changes);
        }
    },

    // merge changes on individual emails
    mergeStandaloneChanges: function () {
        this.$.mergeStandalone.call({objects: this.standaloneChanges});
    },

    mergeStandaloneDone: function (response) {
        if (this.processor.useThreading()) {
            this.processThreadedEmails();
        } else {
            this.doneProcessing();
        }
    },

    processThreadedEmails: function () {
        // Figure out what to do next
        if (this.newEmails.length > 0) {
            // Handle new emails first
            //this.log("threading " + this.newEmails.length + " new emails");

            var ThreadNewEmailsCommand = this.createComponent({
                kind: "ThreadNewEmailsCommand",
                processor: this.processor,
                pendingEmails: this.newEmails,
                onDone: "newEmailsHandled"
            });
            ThreadNewEmailsCommand.run();
        } else {
            this.newEmailsHandled();
        }
    },

    newEmailsHandled: function (senderCommand) {
        if (senderCommand) {
            senderCommand.destroy();
        }

        if (this.updatedEmails.length > 0) {
            var i;
            var conversationIds = [];

            // FIXME merge duplicates
            for (i = 0; i < this.updatedEmails.length; i += 1) {
                var email = this.updatedEmails[i];

                conversationIds.push(email.conversationId);
            }

            //this.log("updating " + conversationIds.length + " conversations");

            var processUpdatedEmailsCommand = this.createComponent({
                kind: "UpdateConversationsCommand",
                processor: this.processor,
                conversationIds: conversationIds,
                onDone: "updatedEmailsHandled"
            });
            processUpdatedEmailsCommand.run();
        } else {
            this.updatedEmailsHandled();
        }
    },

    updatedEmailsHandled: function (senderCommand) {
        if (senderCommand) {
            senderCommand.destroy();
        }

        if (this.pageKey) {
            // get next batch
            this.getChangedEmails();
        } else {
            this.doneProcessing();
        }
    },

    doneProcessing: function () {
        this.log("done processing changes; highest rev = " + this.highestRev);

        this.processor.setLastProcessedRev(this.highestRev);
        this.done();
    }
});

enyo.kind({
    name: "ThreadNewEmailsCommand",
    kind: "EmailProcessorCommand",

    published: {
        pendingEmails: null
    },

    components: [
        {kind: "DbService", onFailure: "handleFailure", components: [
            {name: "findConversations", method: "batch"},
            {name: "reserveIds", method: "reserveIds", onSuccess: "gotReservedIds"},
            {name: "merge", method: "merge", onSuccess: "mergeDone"}
        ]}
    ],

    run: function () {
        this.dirty = {};
        this.newConversations = [];
        this.convSearch = { messageIds: [], threadTopics: [], serverConversationIds: [] };

        this.processEmails();
    },

    processEmails: function () {
        var i;

        for (i = 0; i < this.pendingEmails.length; i += 1) {
            this.addEmailQueryData(this.pendingEmails[i]);
        }

        this.findConversations();
    },

    // Add messageId and threadTopic to the list of conversations we're looking for
    addEmailQueryData: function (email) {
        // find a conversation to add the email to
        if (email.serverConversationId) {
            this.convSearch.serverConversationIds.push(email.serverConversationId);
        } else {
            if (email.inReplyTo) {
                this.convSearch.messageIds.push(email.inReplyTo);
            }

            if (email.threadTopic) {
                this.convSearch.threadTopics.push(email.threadTopic);
            } else if (email.subject) {
                var stripped = EmailProcessorUtils.stripSubject(email.subject);

                if (stripped && stripped.length > 0) {
                    this.convSearch.threadTopics.push(stripped);
                }
            }
        }
    },

    // Search the database for conversations similar to the new emails
    findConversations: function () {
        var batch = { operations: [] };

        if (this.convSearch.messageIds) {
            var messageIdQuery = {
                from: "com.palm.email.conversation:1",
                where: [
                    {prop: "messageIds", op: "=", val: this.convSearch.messageIds}
                ]
            };

            batch.operations.push({method: "find", params: {query: messageIdQuery}});
        }

        if (this.convSearch.threadTopics) {
            var topicQuery = {
                from: "com.palm.email.conversation:1",
                where: [
                    {prop: "threadTopics", op: "=", val: this.convSearch.threadTopics}
                ]
            };

            batch.operations.push({method: "find", params: {query: topicQuery}});
        }

        if (this.convSearch.serverConversationIds) {
            var serverConversationIdQuery = {
                from: "com.palm.email.conversation:1",
                where: [
                    {prop: "serverConversationIds", op: "=", val: this.convSearch.serverConversationIds}
                ]
            };

            batch.operations.push({method: "find", params: {query: serverConversationIdQuery}});
        }

        this.$.findConversations.call(batch, {onSuccess: "gotConversations"});
    },

    gotConversations: function (sender, response) {
        var i, j;
        var responses = response.responses;

        // Clear old results
        this.convResultsByFolderId = {};
        this.convResultsByAccountId = {};

        for (i = 0; i < responses.length; i += 1) {
            var batchResponse = responses[i];
            var results = batchResponse.results;

            for (j = 0; j < results.length; j += 1) {
                var conversationData = batchResponse.results[j];
                var conversation = new ConversationState(conversationData);

                if (this.processor.useCrossFolderThreading()) {
                    conversation.addToResults(this.convResultsByAccountId, conversation.getAccountId());
                } else {
                    conversation.addToResults(this.convResultsByFolderId, conversation.getFolderId());
                }
            }
        }

        // TODO get next set of batch results

        this.matchConversations();
    },
    
    // Determine if an email can be added to a given conversation given the folder
    canJoinThread: function (account, emailFolderId, convFolderId) {
        var draftsFolderId = account.getDraftsFolderId();
        var outboxFolderId = account.getOutboxFolderId();
        
        // Never thread anything in the drafts or outbox folders
        if (emailFolderId === draftsFolderId || emailFolderId === outboxFolderId ||
            convFolderId === draftsFolderId || convFolderId === outboxFolderId) {
            return false;
        }
        
        var trashFolderId = account.getTrashFolderId();
        var archiveFolderId = account.getArchiveFolderId(); 
        
        // Trash and archive folders can only join threads in the same folder
        if (emailFolderId !== convFolderId &&
            (emailFolderId === trashFolderId || emailFolderId === archiveFolderId)) {
            return false;
        }
        
        return true;
    },

    // Match up the new emails with conversations
    matchConversations: function () {
        var i;

        for (i = 0; i < this.pendingEmails.length; i += 1) {
            var email = this.pendingEmails[i];

            var conversation = null;
            
            var accountId = enyo.application.folderProcessor.getFolderAccount(email.folderId);
            var account = enyo.application.accounts.getAccount(accountId);

            var convResults;
            
            if (this.processor.useCrossFolderThreading()) {
                convResults = this.convResultsByAccountId[accountId];
            } else {
                convResults = this.convResultsByFolderId[email.folderId];
            }

            var matches = [];
            
            if (convResults) {
                if (email.serverConversationId) {
                    if (!conversation && convResults.serverConversationIdHash[email.serverConversationId]) {
                        matches = convResults.serverConversationIdHash[email.serverConversationId];
                    }
                } else {
                    // Find by messageId
                    if (!conversation && email.inReplyTo && convResults.messageIdHash[email.inReplyTo]) {
                        matches = convResults.messageIdHash[email.inReplyTo];
                    }

                    // Find by threadTopic (stripped subject)
                    if (matches.length === 0) {
                        var threadTopic = email.threadTopic || EmailProcessorUtils.stripSubject(email.subject);

                        if (threadTopic && convResults.threadTopicHash[threadTopic]) {
                            matches = convResults.threadTopicHash[threadTopic];
                        }
                    }
                }
            }

            if (matches.length > 0) {
                if (account && this.processor.useCrossFolderThreading()) {
                    // Filter out conversations in trash/drafts/outbox/archive
                    /*jshint loopfunc:true */
                    matches = matches.filter(function (c) {
                        return this.canJoinThread(account, email.folderId, c.getFolderId());
                    }, this);
                }
            
                // If there's multiple matches, find the one with the closest timestamp
                //
                // NOTE: at the moment, this won't prevent threads from getting combined
                // since it always picks at least one (which will get combined on the
                // next pass). This is useful only if we add some additional heuristics
                // like a date cutoff.
                var bestDelta = Number.MAX_VALUE;
                
                for (var m = 0; m < matches.length; m += 1) {
                    var match = matches[m];
                    var delta = Math.abs(email.timestamp - match.timestamp);
                    
                    if (!conversation || delta <= bestDelta) {
                        conversation = matches[m];
                        bestDelta = delta;
                    }
                }
            }

            if (conversation) {
                this.dirty[conversation.getId()] = conversation;
                
                if (this.processor.useCrossFolderThreading()) {
                    // HACK: switch primary folderId to inbox if adding an inbox email
                    if (account && email.folderId === account.getInboxFolderId()) {
                        conversation.setFolderId(folderId);
                    }
                }
            } else {
                // Create a new conversation
                conversation = new ConversationState();
                this.newConversations.push(conversation);

                // Set accountId and folderId
                var folderId = email.folderId;

                conversation.setAccountId(accountId);
                conversation.setFolderId(folderId);
            }

            // Add email to conversation
            conversation.addEmail(email, true);

            // Update hashes so other emails can find this one
            if (this.processor.useCrossFolderThreading()) {
                conversation.addToResults(this.convResultsByAccountId, conversation.getAccountId());
            } else {
                conversation.addToResults(this.convResultsByFolderId, conversation.getFolderId());
            }
        }

        var numNew = this.newConversations.length;
        var numDirty = Object.keys(this.dirty).length;

        //this.log(numNew + " new conversations, " + numDirty + " updated conversations");

        if (numNew > 0) {
            this.reserveIds(numNew);
            this.processor.countAddDelete(numNew);
        } else if (numDirty > 0) {
            this.mergeUpdates();
        } else {
            this.doneProcessingBatch();
        }
    },

    // Get ids for new conversations
    reserveIds: function (count) {
        this.$.reserveIds.call({count: count});
    },

    // Assign ids to new conversations
    gotReservedIds: function (sender, response) {
        var i;
        var ids = response.ids;

        for (i = 0; i < ids.length; i += 1) {
            var conversation = this.newConversations[i];
            var id = ids[i];

            conversation.setId(id);
            this.dirty[id] = conversation;
        }

        this.mergeUpdates();
    },

    // Merge new/updated conversations and emails
    mergeUpdates: function () {
        var i;
        var toMerge = [];

        var keys = Object.keys(this.dirty);
        for (i = 0; i < keys.length; i += 1) {
            var conversation = this.dirty[ keys[i] ];
            conversation.appendChanges(toMerge);
        }

        //this.log("writing changes: " + JSON.stringify(toMerge));
        this.$.merge.call({objects: toMerge});
    },

    mergeDone: function (sender, response) {
        this.doneProcessingBatch();
    },

    doneProcessingBatch: function () {
        this.done();
    }
});

// Handles updating conversations when there's a change to one of its emails
// e.g. if an email is marked as read
enyo.kind({
    name: "UpdateConversationsCommand",
    kind: "EmailProcessorCommand",

    published: {
        conversationIds: null
    },

    components: [
        {kind: "DbService", onFailure: "handleFailure", components: [
            {name: "getConversations", method: "get", onSuccess: "gotConversations"},
            {name: "getConversationEmails", method: "find", onSuccess: "gotEmails"},
            {name: "merge", method: "merge", onSuccess: "mergeDone"}
        ]}
    ],

    run: function () {
        this.conversations = {};

        this.getConversations();
    },

    // Find all conversations corresponding to the updated emails
    getConversations: function () {
        // FIXME should handle paging if over 500 emails in a conversation
        this.$.getConversations.call({ids: this.conversationIds});
    },

    gotConversations: function (sender, response) {
        var i;
        var e;
        var results = response.results;
        var ids = [];

        for (i = 0; i < results.length; i += 1) {
            var conversationData = results[i];

            // skip deleted
            if (conversationData._del) {
                continue;
            }

            var emailIds = conversationData.emailIds || [];

            var conversation = new ConversationState(conversationData);
            this.conversations[conversationData._id] = conversation;

            conversation.resetCachedData();

            for (e = 0; e < emailIds.length; e += 1) {
                ids.push(emailIds[e]);
            }
        }

        this.emailIds = ids;
        this.getConversationEmails();
    },

    getConversationEmails: function () {
        var query = {
            from: "com.palm.email:1",
            where: [
                {prop: "_id", op: "=", val: this.emailIds}
            ],
            incDel: true
        };

        if (this.pageKey) {
            query.page = this.pageKey;
        }

        this.$.getConversationEmails.call({query: query});
    },

    gotEmails: function (sender, response) {
        var i;
        var results = response.results;

        //console.log("got emails");

        for (i = 0; i < results.length; i += 1) {
            var email = results[i];

            var conversation = this.conversations[email.conversationId];

            if (!conversation) {
                this.log("error in gotEmails: no conversation found");
                continue;
            }

            // Skip over deleted and invisible emails
            if (email._del || (email.flags && email.flags.visible === false)) {
                conversation.deleteEmail(email);
                continue;
            }

            conversation.addEmail(email, false);
        }

        this.pageKey = response.next;

        if (results.length > 0 && this.pageKey) {
            // Get more emails
            this.log("getting more emails");
            this.getConversationEmails();
        } else {
            // done
            this.mergeChanges();
        }
    },

    mergeChanges: function () {
        var i;
        var toMerge = [];
        var keys = Object.keys(this.conversations);

        var numDeletes = 0;

        for (i = 0; i < keys.length; i += 1) {
            var conversation = this.conversations[keys[i]];
            conversation.appendChanges(toMerge);

            if (conversation.getEmailCount() === 0) {
                numDeletes += 1;
            }
        }

        if (numDeletes > 0) {
            this.processor.countAddDelete(numDeletes);
        }

        //this.log("writing changes: " + JSON.stringify(toMerge));
        this.$.merge.call({objects: toMerge});
    },

    mergeDone: function (sender, response) {
        this.done();
    }
});

enyo.kind({
    name: "CleanupDeletedAccountsCommand",
    kind: "EmailProcessorCommand",
    
    components: [
        {kind: "DbService", components: [
            {name: "deleteConversations", method: "del", onResponse: "deleteConversationsDone"}
        ]}
    ],

    run: function () {
        this.$.deleteConversations.call({query: {
            from: "com.palm.email.conversation:1",
            where: [
                {prop: "accountId", op: "=", val: this.deletedAccountIds || []}
            ]
        }});
    },
    
    deleteConversationsDone: function (response) {
        if (response && response.count) {
            this.log("cleaned up " + response.count + " orphaned conversations");
            this.processor.countAddDelete(response.count);
        }
        
        this.done();
    }
});

enyo.kind({
    name: "DisableThreadingCommand",
    kind: "EmailProcessorCommand",

    components: [
        {kind: "DbService", components: [
            {name: "deleteConversations", method: "del", onResponse: "wipeConversationsDone"},
            {name: "cleanupEmails", method: "merge", onResponse: "doDone"}
        ]}
    ],

    run: function () {
        this.wipeConversations();
    },

    wipeConversations: function () {
        this.$.deleteConversations.call({query: {from: "com.palm.email.conversation:1"}});
    },

    wipeConversationsDone: function (response) {
        this.$.cleanupEmails.call({query: {from: "com.palm.email:1"}, props: {"conversationId": null}});
    }
});