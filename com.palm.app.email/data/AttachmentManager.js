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

/*global enyo, console, EmailApp
 */



// Stores _UniqueAttachment objects which either have listeners or are being downloaded.
// These are stored globally to maintain downloads when the UI is not displaying the attachment,
// and because a particular attachment may be simultaneously displayed by the message view and any number of compose views.
// This ensures all clients interested in a particular attachment will receive the same info
// about download status, progress, etc., and can therefore be kept in sync.

// FIXME: partIds are usually unique in MojoDB, but we should use both emailId and partId to be safe!
// In particular, forwarded parts currently have duplicate part ids
enyo.application._uniqueAttachmentCache = enyo.application._uniqueAttachmentCache || {
    getUniqueAttachment: function (message, part) {
        // this[] syntax allows ids with .'s in them

        // If this is a forwarded part, use the original part id instead
        var partId = part.originalPartId || part._id;

        var uniqueAttachment = this[partId] || new window._UniqueAttachment(message, part);

        // New local attachments in a composition have no partId.
        // This check causes them to be unique every time, instead of storing them all under 'undefined' in the cache.
        if (partId) {
            this[partId] = uniqueAttachment;
        }

        return uniqueAttachment;
    }
};


// Wrapper component instantiated by UI.
// This uses the private _UniqueAttachment class, manages the global cache, and ensures callback functions are properly removed.
// For a given attachment, there should be at most 1 _UniqueAttachment instance, but may be any number of SharedAttachment instances.
enyo.kind({
    name: "SharedAttachment",
    kind: enyo.Component,
    published: {
        message: null,
        part: ""
    },

    events: {
        onChange: "",
        onError: ""
    },

    create: function () {
        this.inherited(arguments);
        var cache = enyo.application._uniqueAttachmentCache;
        var uniqueAttachment = cache.getUniqueAttachment(this.message, this.part);

        this._uniqueAttachment = uniqueAttachment;
        this._progressFunc = this._progressFunc.bind(this);
        uniqueAttachment.addListener(this._progressFunc);
    },

    destroy: function () {
        this._uniqueAttachment.removeListener(this._progressFunc);
        this.inherited(arguments);
    },

    _progressFunc: function (progress, path, error) {
        if (!error) {
            // console.log("Got attachment progress "+progress);
            this.doChange(progress, path);
        } else {
            this.doError(error);
        }
    },

    download: function (force) {
        this._uniqueAttachment.download(force);
    },
    cancel: function () {
        this._uniqueAttachment.cancel();
    },
    getProgress: function () {
        return this._uniqueAttachment.progress;
    },
    getPath: function () {
        return this._uniqueAttachment.path;
    }

});


/*
 Private class whose instances are shared between all clients (message & compose views) interested in a given attachment.
 It manages attachment download and progress notification.
 Only one instance of this class should ever exist for a given attachment.
 The one arguable exception is for locally attached files, which have no partId, and so are considered separate wherever they are seen.
 */
window._UniqueAttachment = function (message, part) {

    if (part.originalPartId && message.originalMsgId) {
        // Forwarded attachment
        this.emailId = message.originalMsgId;
        this.folderId = null; // need to look up the folderId!
        this.partId = part.originalPartId;
    } else {
        // Regular attachment
        this.emailId = message._id;
        this.folderId = message.folderId;
        this.partId = part._id;
    }

    this.listeners = [];
    this.progress = part.path ? 100 : 0;

    this.path = part.path || this.path;
    this.downloading = false;
};


window._UniqueAttachment.prototype = {
    download: function (force) {
        var accountId, transportURL;

        if (this.downloading && !force) {
            // Already downloading
            return;
        }

        // Cancel existing request
        this.cancel();

        // only do real attachment dl when running on device.
        if (window.PalmSystem) {
            this.downloading = true;

            if (this.folderId) {
                this._requestDownload();
            } else {
                // Need to get the folderId for the email first
                EmailApp.Util.callService('palm://com.palm.db/get', {ids: [this.emailId]},
                    enyo.hitch(this, "_getEmailResponse"));
            }
        }

        this._setProgress(1); // mark as download-in-progress
    },

    _getEmailResponse: function (response) {
        if (response.results) {
            var emailData = response.results[0];
            this.folderId = emailData.folderId;

            this._requestDownload();
        } else {
            console.log("error getting email " + this.emailId);
        }
    },

    _requestDownload: function () {
        var accountId = enyo.application.folderProcessor.getFolderAccount(this.folderId);
        var transportURL = enyo.application.accounts.getProvider(accountId).implementation;

        this._request = EmailApp.Util.callService(transportURL + 'downloadAttachment',
            {accountId: accountId, folderId: this.folderId, emailId: this.emailId, partId: this.partId, subscribe: true},
            this._downloadProgress.bind(this));
    },

    cancel: function () {
        this.downloading = false;

        if (this._request) {
            this._request.cancel();
            this._request = null;
        }

        this._setProgress(0); // mark as not downloaded.
    },

    _downloadProgress: function (result) {
        var progress;

        //console.log("_downloadProgress: "+ JSON.stringify(result));

        if (this.downloading && result.errorCode) {
            console.log("got error downloading attachment: " + result.errorText);

            this.cancel();

            this._setProgress(0, undefined, {errorCode: result.errorCode, errorText: result.errorText});

            return;
        }

        if (result.bytesDownloaded !== undefined) {  // Did we get progress info?

            if (result.path) {
                progress = 100;
                this.downloading = false;
            } else {
                // progress is only 100% when download is complete & we have a path.
                // Otherwise estimate it, but pin between 1-99%.
                progress = Math.floor((result.bytesDownloaded / result.totalBytes) * 100);
                progress = Math.min(progress, 99);
                progress = Math.max(progress, 1);
            }

            this._setProgress(progress, result.path);
        }
    },

    // Sets indicated progress value in range [0,100], and notifies all listeners of the change.
    // Path should be specified if progress === 100.
    _setProgress: function (progress, path, error) {
        this.progress = progress;
        if (path) {
            this.path = path;
        }

        this.listeners.forEach(function (cb) {
            cb(progress, path, error);
        });

        this._maybeClearFromCache();
    },

    addListener: function (callback) {
        if (callback) {
            this.listeners.push(callback);
        }
    },


    removeListener: function (callback) {
        if (callback) {
            var i = this.listeners.indexOf(callback);
            if (i !== -1) {
                this.listeners.splice(i, 1);
            } else {
                console.error("SharedAttachment.removeListener: Cannot find callback to remove.");
            }

            this._maybeClearFromCache();
        }
    },

    // Checks download & listener status, and maybe removes this object form the global cache.
    _maybeClearFromCache: function () {

        // If there are no listeners, and we're not currently downloading, remove us from the cache.
        if (this.listeners.length === 0 && (this.progress < 1 || this.progress > 99)) {
            delete enyo.application._uniqueAttachmentCache[this.partId];
        }
    }

};


