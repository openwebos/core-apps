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

// TODO: currently only has basic structure, no implementation. APIs subject to change.

enyo.kind({
    name: "AbstractEmailTransport",
    kind: "enyo.Object",

    constructor: function () {
        this.inherited(arguments);
    }
});

// Implements email transport provided by transport services available on the palm bus
enyo.kind({
    name: "PalmEmailTransport",
    kind: "AbstractEmailTransport",

    published: {
        serviceUri: ""
    },

    constructor: function (serviceUri) {
        this.inherited(arguments);

        // FIXME should get template definition so template can customize method uris
        this.serviceUri = serviceUri;
    },

    callTransport: function (method, params, callback) {
        console.log("sending request " + this.serviceUri + method);

        return EmailApp.Util.callService(this.serviceUri + method, params, callback);
    },

    // [public]
    syncFolder: function (accountId, folderId, options, callback) {
        return this.callTransport("syncFolder", {
            accountId: accountId,
            folderId: folderId,
            force: !!(options && options.force)
        }, callback);
    },

    // [public]
    downloadPart: function (accountId, folderId, emailId, partId, partType, subscribe, callback) {
        // FIXME use constants for part type
        var method = (partType === "body" || partType === "altText") ? "downloadMessage" : "downloadAttachment";

        this.callTransport(method, {
            accountId: accountId,
            folderId: folderId,
            emailId: emailId,
            partId: partId,
            subscribe: !!subscribe
        }, callback);
    },
    
    sendMail: function(accountId, email, callback) {
        // FIXME should allow template to customize
        return EmailApp.Util.callService("palm://com.palm.smtp/sendMail", {
            accountId: accountId,
            email: email
        }, callback); 
    },
    
    saveDraft: function(accountId, email, callback) {
        // FIXME can we remove this yet?
        enyo.application.dashboardManager.saveDraft(email, accountId, callback);
    }
});