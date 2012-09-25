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
 * Kinds for downloading parts (body contents, attachments) from the server.
 *
 * Includes the following kinds:
 *
 * PartDownloader - public kind used to request downloads on behalf of a UI control
 * PartDownloadRequest - private kind for an individual download request
 * PartDownloadManager - private singleton kind which shares download requests across windows
 */

// Represents a part download request.
// This kind should only be created by PartDownloadManager. Only one should exist for a given emailId+partId.
enyo.kind({
    name: "PartDownloadRequest",
    kind: "Component",

    mixins: [
        EmailApp.Broadcaster
    ],

    create: function () {
        this.inherited(arguments);
    },

    destroy: function () {
        if (this.transportRequest) {
            this.transportRequest.cancel();
        }

        this.inherited(arguments);
    },

    // [public]
    downloadPart: function (account, folderId, emailId, part) {
        var transport = enyo.application.accounts.getTransport(account.getId());
        this.transportRequest = transport.downloadPart(
            account.getId(), folderId, emailId,
            part ? part._id : null, part ? part.type : "body" /* TODO use constant */,
            true, this.handleResponse.bind(this)
        );
    },

    handleResponse: function (response) {
        if (response.path) {
            // done
            this.broadcast("done", response.path);

            // unsubscribe
            if (this.transportRequest) {
                this.transportRequest.cancel();
                this.transportRequest = null;
            }
        } else if (response.errorCode) {
            this.broadcast("error", response);
        } else {
            this.broadcast("progress", response);
        }
    }
});

// Manages downloads. Typically a singleton accessible via enyo.application.partDownloadManager.
enyo.kind({
    name: "PartDownloadManager",
    kind: "Object",

    constructor: function () {
        this.inherited(arguments);

        this.requests = {};
    },

    getHash: function (emailId, part) {
        return "" + emailId + "-" + (part ? part._id : "(BODY)");
    },

    findRequest: function (emailId, part) {
        return this.requests[this.getHash(emailId, part)];
    },

    getOrCreateRequest: function (account, folderId, emailId, part) {
        var request = this.findRequest(emailId, part);

        if (!request) {
            // Create request
            request = new PartDownloadRequest();
            this.requests[this.getHash(emailId, part)] = request;

            request.downloadPart(account, folderId, emailId, part);
        }

        return request;
    }
});

// Manages requests for downloading parts
enyo.kind({
    name: "PartDownloader",
    kind: "Component",

    components: [
        {name: "subscriber", kind: "EmailApp.BroadcastSubscriber", onProgress: "partDownloadProgress"}
    ],

    create: function () {
        this.inherited(arguments);
    },

    // Downloads a part and subscribes to the responses.
    // NOTE: part parameter may be null if the part list if not available yet
    downloadPart: function (account, emailId, part) {
        this.log("downloading part " + part._id + " on email " + emailId);

        if (!part) {
            // need to create a fake part
            part = { _id: null, type: "body" }; // TODO use constant
        }

        var request = enyo.application.partDownloadManager.getOrCreateRequest(account, emailId, part);

        this.$.subscriber.subscribe(request);
    },

    partDownloadProgress: function () {
        console.log("progress!");
    }
});

if (!enyo.application.partDownloadManager) {
    enyo.application.partDownloadManager = new PartDownloadManager();
}