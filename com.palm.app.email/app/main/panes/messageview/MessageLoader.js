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

/* Combines a CachedFile "bodyPin" with a MessageDisplay */

/* Needs: message (incl. firstLoad), email,
 bodyRetriesRemaining,
 uri, uriChanged,
 */

enyo.kind({
    name: "MessageLoader",
    kind: "MessageDisplay", //superclass
    create: function () {
        this.inherited(arguments);
        // We cannot define :components [{name: "bodyPin", etc.}], because that
        // overrides the mixed-in MessageDisplay kind rather than extending it.
        // So we must add the bodyPin ourselves.
        // Current checkpoint in svn doesn't make use of this yet, so let's comment out to not confuse ourselves.
        this.createComponent({name: "bodyPin", kind: "CachedFile", onSuccess: "bodyPinSucceeded", onReload: "bodyPinFailed"});
        this.loader = this;
        this.bodyRetriesRemaining = 0;
    },
    published: {
        uri: ""
    },

    /** LOADING STUFF *************************/
    emailLoaded: function () {
        // For emails loaded from files, make sure it's vaguely valid
        if (this.uri && (!this.email.data.from && !this.email.data.to && !this.email.data.subject)) {
            console.error("email is missing from/to/subject");
            this.emailLoadFailed();
            return;
        }

        this.headersFromEmail(this.email);

        if (window.fauxMail || !window.PalmSystem) {
            this.loadFauxMessage(this.message);
        } else {
            this.loadMessage();
        }

        // Update captions for emails that depend on the current state
        this.owner.updateMenu(this);

        // Store the number of parts so we can reload the attachments list if it changes
        this.numParts = this.email.getParts().length;

        this.owner.$.pane.selectViewByName("message", true);
    },
    emailLoadFailed: function (sender, error) {
        MailErrorDialog.displayError(this, {message: $L("Error opening email."), error: error, onClose: "confirmLoadFailed"});
    },
    emailUpdated: function () { /* for a db email after emailLoaded */
        // email was deleted
        if (!this.email.data || this.email.data._del || this.email.getFlags().visible === false) {
            this.log("email in message view was deleted or marked invisible");
            this.owner.doMessageDeleted(this.message._id);
            return;
        }

        var latestNumParts = this.email.getParts().length;

        // Number of parts changed -- should refresh body and attachments list
        if (latestNumParts != this.numParts) {
            this.updateAttachments(this.email);
            this.loadMessage();
        }
        this.numParts = latestNumParts;

        this.updateMeeting();

        //check for a new path to the body part
        var bodyPart = this.email.getBodyPart();
        if (bodyPart && bodyPart.path && bodyPart.path !== this.lastBodyPath) {
            this.lastBodyPath = bodyPart.path;
            this.loadMessage(); // reload the message
            // TODO: make this work for inline parts as well
        }
        this.owner.updateMenu(this);
    },

    loadFauxMessage: function (inMessage) {
        this.setBody(this.email);
        this.$.bodyPin.setPath("message-body");
    },

    /** function to handle all the loading for the message display */
    loadMessage: function () {
        // this does all the loading for the messageDisplay
        this.$.body.setUrl("about:blank"); // make sure to clear out remnants of any previous email first

        var body = this.email.getBodyPart();
        if (body && body.path) {
            this.lastBodyPath = body.path;
            this.$.bodyPin.setPath(body.path);
        } else {
            this.log("no body or body path available; requesting download");
            this.retryDownload();
        }
        this.resetHeaderPosition(); // provided by superclass
    },
    retryDownload: function () { /* By loadMessage and when clicking on download error icon in MessageDisplay */
        this.downloadMessage(this.message);
    },
    setRetries: function (n) {
        this.bodyRetriesRemaining = n;
    },
    retryBodyLoad: function (reason) { /* Requested by MessageDisplay to hook up WebView */
        if (this.message && this.bodyRetriesRemaining > 0) {
            this.bodyRetriesRemaining--;
            console.error(reason + ", refreshing body.");
            // Tmp file hasn't generated yet. Don't do this too fast or we'll flicker like crazy
            window.setTimeout(this.loadMessage.bind(this), 300);
        } else {
            console.error(reason + ", but not refreshing body.");
        }
    },
    bodyPinSucceeded: function () {
        this.clearErrorTimer();

        if (!this.email) {
            this.log("no email!");
            return;
        }

        this.message = this.email.data; // Not our setMessage().

        var id = this.email.data._id;
        var email = this.email;
        this.log("message body pinned");

        if (this.isDraftEmail()) {
            // when a draft is "selected", we don't actually display it, we edit it in a separate window...
            this._editDraftEmail();
        } else {
            this.firstLoad = false;
            this.showMessageError(undefined);
            // FIXME: without a slight pause here, the transition to showing this "view" can fail.
            // The webview's internal object may not have adapter methods available yet, and calling setHTML() throws an exception.
            // Due to the async, it's actually possible for >1 of these to be queued up before the 1st one runs,
            // so we save & clear the timer ID to prevent that.
            var that = this;
            window.clearTimeout(this.setHTMLTimerId);
            this.setHTMLTimerId = window.setTimeout(function () {
                console.info("Setting HTML for message id " + id); //We cache id so we can track overwrites
                that.setBody(email, that.isReplyOrForward());
            }, 0);
        }
    },
    bodyPinFailed: function () {
        console.log("message body failed to pin, re-downloading");

        if (this.uri && this.bodyRetriesRemaining > 0) {
            // If we were loaded from a uri, can't download the body
            var retries = this.bodyRetriesRemaining;

            // Try reload the whole message
            this.uriChanged();

            // Update bodyRetriesRemaining ourselves, since uriChanged resets it
            this.bodyRetriesRemaining = retries - 1;
        } else {
            this.downloadMessage(this.message);
        }
    },
    downloadMessage: function (message) {
        var folderId = message.folderId;
        var accountId = enyo.application.folderProcessor.getFolderAccount(folderId);
        var transportURL = enyo.application.accounts.getProvider(accountId).implementation;
        var that = this;
        this.setErrorTimer();

        // Show downloading message
        this.showMessageError("downloadWait");

        this._request = EmailApp.Util.callService(transportURL + 'downloadMessage',
            {accountId: accountId, folderId: folderId, emailId: message._id, subscribe: true},
            this.downloadProgress.bind(this)
        );
    },

    // Callback for downloadMessage
    downloadProgress: function (result) {
        if (result.returnValue === false) {
            this.error("error downloading message: " + JSON.stringify(result));
            this.showMessaegError("downloadError");
        } else if (result.path) {
            //this.log("download success, got path");
            // Success -- clean up subscription so we don't get stray cancels later
            if (this._request) {
                this._request.cancel();
                this._request = null;
            }
        }
    },

    clearErrorTimer: function () {
        if (this.errorTimer) {
            clearTimeout(this.errorTimer);
            this.errorTimer = undefined;
        }
    },

    setErrorTimer: function () {
        var that = this;
        this.clearErrorTimer();
        this.errorTimer = setTimeout(function () {
            that.showMessageError("downloadError");
        }, 45000);
    },
    uriChanged: function () {
        if (this.email) {
            // Remove old email component
            this.email.destroy();
        }

        // Create a DatabaseEmail component representing this database object
        this.email = this.createComponent({
            kind: "LocalFileEmail",
            name: "email",
            uri: this.uri,
            onEmailLoaded: "emailLoaded",
            onLoadFailed: "emailLoadFailed"
        });

        this.owner.$.pane.selectViewByName("loadWait", true);

        this.setRetries(2);

        // FIXME only used when working with hardcoded data
        if (this.email.data) {
            this.emailLoaded();
        }
    },

    /** ACCESSING STUFF ************************/
    isDraftEmail: function () {
        var folderId = this.message.folderId;
        var account = enyo.application.accounts.getAccount(this.email.getAccountId());
        return account && (account.getOutboxFolderId() === folderId || account.getDraftsFolderId() === folderId);
    },

    setMessage: function (message) {
        this.message = message;
        this.firstLoad = true; // first load of a newly-set message starts now
    },
    updateAttachments: function (email) {
        this.$.attachments.setEmail(email);
    },
    getBodyHTML: function () {
        var body;
        if (window.fauxMail || !window.PalmSystem) {
            return this.$.messageDisplay.$.body.getInnerHtml();
        } else {
            body = window.palmGetResource(this.$.bodyPin.path);

            // Do some basic text-to-html conversion
            if (this.email.getBodyPart().mimeType === "text/plain") {
                // FIXME need a replacement for escapeHTML
                body = body.escapeHTML().replace(/\n/g, "<br>");
            }

            // FIXME sanitize here, or wrap in an iframe?

            return body;
        }
    },
    // Returns true if this message was a reply or forward.
    // This is used to adjust the formatting for indented text.
    isReplyOrForward: function () {
        // Currently we just use a simple scheme of checking the prefix for re: or fw:
        // This is what the old java service did, but seems unreliable in non-english languages.
        var subject = this.email && this.email.getSubject();
        if (!subject) {
            return false;
        }
        subject = subject.toLowerCase();
        return (subject.indexOf("re:") === 0) ||
            (subject.indexOf("fw:") === 0) ||
            (subject.indexOf("fwd:") === 0);
    },
    /** DOING STUFF ****************************/
    cancel: function () {
        this.$.bodyPin.cancel();
    },
    _editDraftEmail: function () {
        if (!this.firstLoad) {
            // don't open multiple edit views
            return;
        }

        this.firstLoad = false;
        this.showMessageError(undefined);

        //this.$.pane.selectViewByName("placeholder");

        this.owner.doComposeMessage({edit: this.email.data, accountId: this.email.getAccountId()});

        this.owner.setMessage(undefined);

    }
});
