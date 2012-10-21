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
    name: "ConversationState",
    kind: "enyo.Object",

    constructor: function (data) {
        // FIXME use constants
        this.data = data || { _kind: "com.palm.email.conversation:1", count: 0, flags: {read: true}, attributes: {} };
        this.changedProps = data ? {} : { _kind: true, count: true, flags: true };
        this.newEmailIds = [];
        this.deletedEmailIds = [];
    },

    // Set the property to a default value *iff* it was present.
    // This way, when the subobject is written to the database the value will be overwritten.
    // If the property wasn't set before, leave it alone so we don't waste database space.
    resetProps: function (obj, props, defaultValue) {
        var i;

        for (i = 0; i < props.length; i += 1) {
            var prop = props[i];

            if (typeof obj[prop] !== 'undefined') {
                obj[prop] = defaultValue;
            }
        }
    },

    // reset conversation data and repopulate it from the emails
    // almost all properties should be reset here, except messageIds
    resetCachedData: function () {
        this.data.count = 0;
        this.data.flags = this.data.flags || {};

        // Always update read status
        this.data.flags.read = true;

        // Set default value of other flags to false
        this.resetProps(this.data.flags, ["flagged", "replied", "forwarded"], false);

        // Cleanup attributes
        this.data.attributes = this.data.attributes || {};
        this.resetProps(this.data.attributes, ["hasMeetingInfo"], false);

        this.data.folderKeys = [];
        this.data.timestamp = undefined;
        this.data.emailIds = [];
        this.data.senders = [];

        if (this.data.priority) {
            this.data.priority = "";
            this.changedProps.priority = true;
        }
    },
    
    addToResultsSet: function (items, hash) {
        if (!items) {
            return;
        }
    
        for (var i = 0; i < items.length; i += 1) {
            var item = items[i];
            
            if (hash[item]) {
                hash[item].push(this);
            } else {
                hash[item] = [this];
            }
        }
    },

    addToResults: function (convResultsHash, key) {
        var i;

        var convResults = convResultsHash[key] ||
        { messageIdHash: {}, threadTopicHash: {}, serverConversationIds: {} };
        
        this.addToResultsSet(this.data.messageIds, convResults.messageIdHash);
        this.addToResultsSet(this.data.threadTopics, convResults.threadTopicHash);
        this.addToResultsSet(this.data.serverConversationIds, convResults.serverConversationIdHash);

        convResultsHash[key] = convResults;
    },

    addToList: function (propName, data) {
        if (!data || data === "") {
            return;
        }

        var list = this.data[propName];

        if (!list) {
            list = this.data[propName] = [];
        }

        // Only add if not already in the list
        if (list.indexOf(data) === -1) {
            list.push(data);
            this.changedProps[propName] = true;
        }
    },

    setAccountId: function (accountId) {
        this.data.accountId = accountId;
        this.changedProps.accountId = true;
    },

    setFolderId: function (folderId) {
        this.data.folderId = folderId;
        this.changedProps.folderId = true;
    },
    
    getAccountId: function () {
        return this.data.accountId;
    },
    
    getFolderId: function () {
        return this.data.folderId;
    },

    insertSender: function (senders, newSender, newTimestamp, isOutbound) {
        var pos;

        // Remove sender from existing list
        senders = senders.filter(function (sender) {
            return sender.addr !== newSender.addr;
        });

        // Add sender to correct position according to timestamp
        // Ordered from newest to oldest
        for (pos = 0; pos < senders.length; pos += 1) {
            if (senders[pos].timestamp < newTimestamp) {
                break;
            }
        }

        var sender = {
            name: newSender.name,
            addr: newSender.addr,
            timestamp: newTimestamp
        };
        
        if (isOutbound) {
            sender.isOutbound = true;
        }

        senders.splice(pos, 0, sender);
        return senders;
    },

    addSender: function (newSender, newTimestamp, isOutbound) {
        this.data.senders = this.insertSender(this.data.senders || [], newSender, newTimestamp, isOutbound);
        this.changedProps.senders = true;
    },

    addFolderKey: function (folderKey) {
        this.addToList("folderKeys", folderKey);
    },

    addEmail: function (email, isNewEmail) {
        var i;
        var accountId = enyo.application.folderProcessor.getFolderAccount(email.folderId);
        var account = accountId && enyo.application.accounts.getAccount(accountId);

        //this.log("adding email " + email.subject);

        // Timestamp/summary taken from newest email
        if (!this.data.timestamp || email.timestamp >= this.data.timestamp) {
            this.data.timestamp = email.timestamp;
            this.data.summary = email.summary;

            this.changedProps.timestamp = true;
            this.changedProps.summary = true;
        }

        // Subject taken from oldest email
        if (!this.data.earliestTimestamp || email.timestamp <= this.data.earliestTimestamp) {
            this.data.earliestTimestamp = email.timestamp;
            this.data.subject = email.subject;

            this.changedProps.earliestTimestamp = true;
            this.changedProps.subject = true;
        }

        // Add sender
        if (email.from) {
            this.addSender(email.from, email.timestamp);
        }
        
        // For outgoing emails, add recipients
        if (email.to && account && account.isOutgoingFolderId(email.folderId)) {
            enyo.forEach(email.to, function (recipient) {
                this.addSender(recipient, email.timestamp+1, true);
            }, this);
        }

        // Increment count
        this.data.count = this.data.count + 1;
        this.changedProps.count = true;

        // Update flags
        var emailFlags = email.flags || {};
        this.changedProps.flags = true;
        this.changedProps.attributes = true;

        if (!emailFlags.read) {
            this.data.flags.read = false;
        }

        if (emailFlags.replied) {
            this.data.flags.replied = true;
        }

        if (emailFlags.forwarded) {
            this.data.flags.forwarded = true;
        }

        if (emailFlags.flagged) {
            this.data.flags.flagged = true;
        }

        if (email.meetingInfo) {
            this.data.attributes.hasMeetingInfo = true;
        }

        if (email.sendStatus && email.sendStatus.error && email.sendStatus.error.errorCode) {
            this.data.attributes.hasError = true;
            this.changedProps.hasError = true;
        }

        // Update priority
        if (this.data.priority === "high") {
            // high is never replaced
            this.changedProps.priority = false;
        } else if (this.data.priority === "low") {
            // low is overwritten by anything
            this.data.priority = email.priority || "";
            this.changedProps.priority = true;
        } else if (email.priority === "high") {
            // normal is overwritten by high
            this.data.priority = email.priority;
            this.changedProps.priority = true;
        }

        // Add hasAttachment attribute
        if (email.parts) {
            for (i = 0; i < email.parts.length; i += 1) {
                if (email.parts[i].type === "attachment") {
                    this.data.attributes.hasAttachment = true;
                    this.changedProps.attributes = true;
                    break;
                }
            }
        }

        // Add folders
        this.updateFolderKeys(accountId, email);

        // FIXME -- should just query for emails by conversationId instead of storing it here
        this.addToList("emailIds", email._id);

        // Only if the email isn't part of this conversation
        if (isNewEmail) {
            // Set accountId
            //this.data.accountId = accountId;
            //this.changedProps.accountId = true;

            // Add messageId and references
            if (email.messageId || email.inReplyTo || email.references) {
                this.addToList("messageIds", email.messageId);
                this.addToList("messageIds", email.inReplyTo);

                var self = this;
                var mids = this.data.messageIds || [];

                if (email.references) {
                    email.references.forEach(function (messageId) {
                        self.addToList("messageIds", messageId);
                    });
                }

                this.data.messageIds = mids;
            }

            // Add serverConversationId
            this.addToList("serverConversationIds", email.serverConversationId);

            // Add conversation topic based on subject
            if (email.threadTopic) {
                this.addToList("threadTopics", email.threadTopic);
            } else if (email.subject && email.subject.length > 0) {
                // Strip re: and similar from subject
                var stripped = EmailProcessorUtils.stripSubject(email.subject);
                this.addToList("threadTopics", stripped);
            }

            this.newEmailIds.push(email._id);
        }
    },

    deleteEmail: function (email) {
        this.deletedEmailIds.push(email._id);
    },

    updateFolderKeys: function (accountId, email) {
        var account = enyo.application.accounts.getAccount(accountId);

        this.data.folderKeys = this.data.folderKeys || [];

        // Add folder
        this.addFolderKey(email.folderId);

        // Folder keys that shouldn't apply to emails in the trash
        if (!account || account.getTrashFolderId() !== email.folderId) {
            this.addFolderKey("#NONTRASH#");

            // Add aggregate folders
            if (account && account.getInboxFolderId() === email.folderId) {
                this.addFolderKey("#INBOXES#");
            }

            if (email.flags && email.flags.flagged) {
                this.addFolderKey("#FLAGGED#");
            }

            // TODO: virtual folders?
        }

        this.changedProps.folderKeys = true;
    },

    setId: function (id) {
        this.data._id = id;
    },

    getId: function () {
        return this.data._id;
    },

    getEmailCount: function () {
        return this.data.count;
    },

    // Get changes relevant to this conversation and append them to the changes array
    appendChanges: function (changes) {
        var i;
        var changedKeys = Object.keys(this.changedProps);

        if (changedKeys.length > 0 || this.data.count === 0) {
            var myChanges = { _id: this.data._id };

            for (i = 0; i < changedKeys.length; i += 1) {
                var key = changedKeys[i];
                myChanges[key] = this.data[key];
            }

            // Handle deleted conversations
            if (this.data.count === 0) {
                myChanges._del = true;
            }

            // Merge the updated conversation
            changes.push(myChanges);
        }

        if (this.newEmailIds.length) {
            // Add conversationId to each of the new emails
            for (i = 0; i < this.newEmailIds.length; i += 1) {
                changes.push({_id: this.newEmailIds[i], conversationId: this.data._id});
            }
        }

        if (this.deletedEmailIds.length) {
            // Remove conversationId from emails
            for (i = 0; i < this.deletedEmailIds.length; i += 1) {
                changes.push({_id: this.deletedEmailIds[i], conversationId: null});
            }
        }
    }
});