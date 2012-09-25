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

/* Loads emails in a conversation and watches for new, deleted, or changed emails */
enyo.kind({
    name: "ConversationLoader",
    kind: "enyo.Component",

    published: {
        subscribe: false,
        oldestFirst: false,
        conversation: null /* VirtualConversation */
    },

    events: {
        onEmailsLoaded: "", /* called when emails are available the first time (list of emails) */
        onEmailsUpdated: "" /* called when emails are updated (object with newEmails, deletedEmails, updatedEmails, allEmails) */
    },

    components: [
        {kind: "DbService", components: [
            {name: "emailsFinder", method: "find", onSuccess: "gotEmails", onWatch: "watchFired", subscribe: true, resubscribe: true}
        ]}
    ],

    create: function () {
        this.inherited(arguments);

        this.conversationChanged();
    },

    conversationChanged: function (old) {
        this.loaded = false;

        if (old !== this.conversation) {
            this.$.emailsFinder.cancel();

            this.emails = [];
            this.emailsById = {};

            if (this.conversation) {
                this.fetchEmails();
            }
        }
    },

    fetchEmails: function () {
        if (this.conversation.isConversation()) {
            this.$.emailsFinder.call({
                query: {
                    from: Email.KIND,
                    where: [
                        {prop: "conversationId", op: "=", val: this.conversation.getId()}
                    ],
                    orderBy: "timestamp",
                    desc: !this.oldestFirst
                },
                watch: true
            }, {subscribe: this.subscribe, resubscribe: this.subscribe});
        } else {
            this.$.emailsFinder.call({
                query: {
                    from: Email.KIND,
                    where: [
                        {prop: "_id", op: "=", val: this.conversation.getId()}
                    ]
                },
                watch: true
            }, {subscribe: this.subscribe, resubscribe: this.subscribe});
        }
    },

    gotEmails: function (sender, response) {
        var i;
        var results = response.results;

        var existingEmails = {};
        var updatedEmails = [];
        var newEmails = [];
        var deletedEmails = [];

        enyo.mixin(existingEmails, this.emailsById);

        //this.log("existing emails: " + Object.keys(existingEmails).length);

        if (results) {
            for (i = 0; i < results.length; i++) {
                var data = results[i];

                if (existingEmails[data._id]) {
                    if (existingEmails[data._id]._rev < data._rev) {
                        updatedEmails.push(data);
                    }
                } else {
                    newEmails.push(data);
                }

                this.emailsById[data._id] = data;

                // Remove from hash so we know what's left over
                delete existingEmails[data._id];
            }

            // FIXME handle >500 emails

            // Any leftover emails have been deleted
            var leftoverIds = Object.keys(existingEmails);

            if (leftoverIds.length > 0) {
                for (i = 0; i < leftoverIds.length; i++) {
                    var id = leftoverIds[i];
                    deletedEmails.push(this.emailsById[id]);
                    delete this.emailsById[id];
                }
            }

            if (this.loaded) {
                //this.log("conversation " + this.conversation.getId() + " updated");

                this.doEmailsUpdated({
                    newEmails: newEmails,
                    deletedEmails: deletedEmails,
                    updatedEmails: updatedEmails,
                    allEmails: results
                });
            } else {
                //this.log("conversation " + this.conversation.getId() + " loaded");

                this.loaded = true;
                this.doEmailsLoaded(newEmails);
            }
        }
    },

    watchFired: function () {
        this.fetchEmails();
    },

    // [public]
    // Returns a list of com.palm.email objects
    getEmails: function () {
        return this.emails;
    }
});