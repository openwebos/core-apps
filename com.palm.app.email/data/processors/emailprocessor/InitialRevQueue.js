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

/*
 * This handles preparing new emails for displaying in dashboard notifications.
 *
 * In order to tell which emails are new, we set the "initialRev" property on
 * each email. The dashboard manager will display emails with an initialRev
 * higher than the last initialRev seen/dismissed by the user.
 *
 * The purpose of this queue is to delay adding an email to the dashboard until
 * the email body has been downloaded. This way, the user doesn't have to wait
 * for the email body to download.
 */
enyo.kind({
    name: "InitialRevQueue",
    kind: "enyo.Component",

    constants: {
        TIMEOUT: 30 /* seconds */
    },

    components: [
        {name: "merge", kind: "DbService", method: "merge", onResponse: "mergeDone"}
    ],

    create: function () {
        this.inherited(arguments);

        this.emailStates = {};
    },

    isBodyDownloaded: function (email) {
        return email.parts && email.parts.some(function (part) {
            return part.type === "body" && part.path; // FIXME use constant
        });
    },

    // [public]
    processEmail: function (email) {
        var emailId = email._id;

        if (!email._del) {
            // Check for body part path
            var ready = this.isBodyDownloaded(email);
            var emailState = this.emailStates[emailId];

            if (!emailState) {
                // Add email
                this.emailStates[email._id] = {
                    timestamp: (new Date().getTime()) / 1000,
                    rev: email._rev,
                    ready: ready
                };
            } else {
                // Update email
                emailState.ready = ready;
            }

            if (ready) {
                this.scheduleMerge();
            }
        } else {
            delete this.emailStates[emailId];
        }
    },

    // [public]
    addEmail: function (email) {
        // Check for body part path
        var ready = this.isBodyDownloaded(email);

        this.emailStates[email._id] = {
            timestamp: (new Date().getTime()) / 1000,
            rev: email._rev,
            ready: ready
        };

        this.scheduleMerge(ready ? 0 : InitialRevQueue.TIMEOUT);
    },

    // [public]
    updateEmail: function (email) {
        var emailState = this.emailStates[emailId];

        if (emailState) {
            emailState.ready = this.isBodyDownloaded(email);

            if (emailState.ready) {
                this.scheduleMerge();
            }
        }
    },

    // [public]
    removeEmail: function (emailId) {
        delete this.emailStates[emailId];
    },

    scheduleMerge: function (delaySeconds) {
        enyo.job("InitialRevQueue.mergeUpdates", enyo.bind(this, "mergeUpdates"), delaySeconds * 1000);
    },

    mergeUpdates: function () {
        var emailId;
        var emailStates = this.emailStates;

        var now = (new Date().getTime()) / 1000;

        var toMerge = [];

        // Find any ready emails, or emails past the timeout period
        for (emailId in emailStates) {
            if (emailStates.hasOwnProperty(emailId)) {
                var state = emailStates[emailId];

                if (state.ready || Math.abs(now - state.timestamp) > InitialRevQueue.TIMEOUT) {
                    // Set initialRev
                    toMerge.push({
                        _id: emailId,
                        initialRev: state.rev
                    });

                    // Remove from hash
                    delete emailStates[emailId];
                }
            }
        }

        if (toMerge.length > 0) {
            this.$.merge.call({objects: toMerge, ignoreMissing: (EmailApp.Util.getWebOSMajorVersion() >= 3 ? true : undefined)});
        }
    },

    mergeDone: function () {
        if (this.emailStates.length > 0) {
            this.scheduleMerge(InitialRevQueue.TIMEOUT);
        }
    }
});