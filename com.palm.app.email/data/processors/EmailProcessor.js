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
 Class that processes all emails, adding search terms and the withinInbox flag.
 Relies on MojoDBChangeProcessor to do the heavy lifting.
 */
EmailApp.EmailProcessor = function () {

    // Enforce singleton nature of this class.
    if (EmailApp.EmailProcessor.allocated) {
        console.log("EmailProcessor is a singleton, and has already been allocated. Returning single instance");
        return EmailApp.EmailProcessor.allocated;

    }
    EmailApp.EmailProcessor.allocated = this;

    this.processor = new EmailApp.MojoDBChangeProcessor({
        kind: "com.palm.email:1",
        incDel: true,
        processChanges: this._processChanges.bind(this),
        processDeletes: this._processDeletes.bind(this),
        revSet: 'EmailProcessorRev',
        select: ["_id", "_rev", "_del", "EmailProcessorRev", "folderId", "withinInbox", "initialRev", "sortKeys", "timestamp", "from", "subject", "parts", "flags"], // withinInbox is included so we can avoid writing it out when it's already current.
        limit: 40
    });

    this._calculateInboxes();

    // Power activity to cover the timeout queue
    this.timeoutPowerUser = new PowerUser("initialRevTimeout");

    // Create a timeout queue we can use to make sure the initialRev gets set on new emails, even when the body hasn't been downloaded after 30-60 sec.
    // The onComplete function is bound directly to the change processor's commitBatchedWrites(), so the onTimeout can use batchWrite() to modify the objects.
    this._initialRevTimeoutQueue = new EmailApp.Util.TimeoutQueue({
        timeout: 30,
        onTimeout: this._setInitialRev.bind(this),
        onComplete: this.processor.commitBatchedWrites.bind(this.processor)
    });

    // Reprocess all emails when accounts change, so we can recalculate withinInbox.
    // If we tracked the appropriate info, we could just reprocess the ones for the changed account,
    // or even just the old & new inbox folders, but this is expected to be a pretty rare occurrence.
    enyo.application.accounts.addListener(this._accountsChanged.bind(this));

};

EmailApp.EmailProcessor.prototype._accountsChanged = function () {
    console.log("Accounts changed, reprocessing emails.");

    // Rebuild the hash of inbox folder IDs, and then reprocess the emails.
    this._calculateInboxes();
    this.processor.processAll();
};

// We keep a hash of folderId->isInbox up to date at all times to speed processing of emails.
EmailApp.EmailProcessor.prototype._calculateInboxes = function (changedFolders) {
    var i, accounts, inboxId, inboxes;

    // build a hash of folders which are inboxes... folderId -> true
    inboxes = {};
    accounts = enyo.application.accounts.getAccounts();

    accounts.forEach(function (acct) {
        inboxId = acct.getInboxFolderId();
        if (inboxId) {
            inboxes[inboxId] = true;
        }
    });

    // save it here so processing folder changes is just a quick hash lookup.
    this._inboxes = inboxes;
};


// Called when a set of revised emails has been loaded.
// Processes them to make sure the properties we add are up to date.
EmailApp.EmailProcessor.prototype._processChanges = function (changedEmails) {
    var i, e, inboxes, sorts;

    //var notificationAssistant = Mojo.Controller.appController.assistant.notificationAssistant;

    console.log("EmailProcessor: Processing " + changedEmails.length + " emails");

    inboxes = this._inboxes;

    var hasPendingBodies = false;
    var hasNewEmails = false;

    // Loop through emails, and set withinInbox correctly.
    for (i = 0; i < changedEmails.length; i++) {
        e = changedEmails[i];
        //Mojo.Log.info("    Processing email %s", JSON.stringify(e));

        var withinInbox = !!inboxes[e.folderId];
        var canAppearInDashboard = withinInbox && !(e._del || e.flags && (e.flags.read || e.flags.visible));

        this.processor.batchWrite(e, 'withinInbox', withinInbox, Email.KIND);

        // Save the initial revision assigned to the email when it's finished being added to the database.
        // This is used by the notificationAssistant to determine when new emails have arrived.
        // We wait to set it until the body part has been downloaded, so that the email is
        // ready to view when the dashboard notification is displayed.
        if (e.initialRev === undefined) {
            if (!canAppearInDashboard || (e.parts && e.parts.some(this._isLoadedBodyPart, this))) {
                // Body has been downloaded (or doesn't need notification) so set initialRev, and remove this email from the timeout queue if it was added.
                this._setInitialRev(e);
                this._initialRevTimeoutQueue.remove(e);

                if (canAppearInDashboard) {
                    hasNewEmails = true;
                }
            } else {
                // New email is missing the body.
                // Don't set initialRev yet, but add it to the timeout queue in case the body is NEVER downloaded.
//				console.log("New email " + e._id + " is missing the body, Adding to timeout queue.");
                this._initialRevTimeoutQueue.add(e);
                hasPendingBodies = true;
            }
        }

        // If the sort keys haven't been set yet, fill them out.
        // Undefined happens when they've never been set.  Null happens when they've been explicitly cleared (for example when we flag an email).
        if (e.sortKeys === undefined) {
            sorts = sorts || this._getSyntheticSorts();
            this.updateSortKeysForEmail(e, sorts);
        }

        // If the email is deleted or marked read, clear it from our dashboard notifications:
        if (!canAppearInDashboard) {
            //console.log("Email " + e._id + " is read/deleted, clearing dashboard.");
            enyo.application.dashboardManager.clear(undefined, undefined, e._id);
        }
    }

    // We added an initialRev just now. Start a power activity so the device doesn't fall asleep
    // before the DashboardManager watch fires.
    if (hasNewEmails && enyo.application.dashboardManager) {
        enyo.application.dashboardManager.watchPowerUser.start(1000);
    }

    if (hasPendingBodies) {
        // Keep the power on for up to 15 seconds to download bodies
        this.timeoutPowerUser.start(15000);
    } else if (this._initialRevTimeoutQueue._isEmpty()) {
        // Timeout queue is done. End power activity.
        this.timeoutPowerUser.stop();
    }

    return;
};

EmailApp.EmailProcessor.prototype._processDeletes = function (deletedEmails) {
    //var notificationAssistant = Mojo.Controller.appController.assistant.notificationAssistant;
    var i, e;
    for (i = 0; i < deletedEmails.length; i++) {
        e = deletedEmails[i];
        //console.log("Email " + e._id + " is deleted, clearing bashboard.");
        enyo.application.dashboardManager.clear(undefined, undefined, e._id);
    }
};

// Copies the email's _rev to the initialRev property, where it can be used for tracking new incoming emails.
EmailApp.EmailProcessor.prototype._setInitialRev = function (email) {
//	console.log("Setting initialRev to " + email._rev + " for new email" + email._id);
    this.processor.batchWrite(email, 'initialRev', email._rev, Email.KIND);
};

EmailApp.EmailProcessor.prototype._isLoadedBodyPart = function (part) {
    return part.type === "body" && part.path;
};

// Hack... used to invalidate the message list when sort keys have actually been written.
EmailApp.EmailProcessor.prototype.setSortKeyUpdateCallback = function (cb) {
    this._sortKeyUpdateCallback = cb;
};

// Given a query object for mojodb, updates sortKey fields for all emails in the query.
// This allows us to use this for sortkeys in a regular folder as well as the synthetic ones.
EmailApp.EmailProcessor.prototype.updateSortKeysForQuery = function (query, doFolderSortKey, doInboxesSortKey, doFlaggedSortKey) {
    var that = this;
    var folder, folderProcessor = enyo.application.folderProcessor;
    var sorts = this._getSyntheticSorts();

    // Only fetch the few properties we actually need.
    query.select = this._sortKeyUpdateSelect;


    // Map our update function over the query results.
    //var startedMapping = false;
    EmailApp.Util.dbMap(query, function (email) {
        var newSortKeys;
        folder = folderProcessor.getFolder(email.folderId);
        newSortKeys = {};
        email.sortKeys = email.sortKeys || {};

        // batchWrite is not clever enough to notice that subproperty values are not changing,
        // and will write everything out all the time, so we try to make sure that we only include
        // sortKeys which are actually changing.
        var fixSortKey = function (force, which, sortField, sortDesc) {
            if (force || !email.sortKeys[which]) {
                newSortKeys[which] = that._genSortKey(email, sortField, sortDesc);
                if (newSortKeys[which] === email.sortKeys[which]) {
                    newSortKeys[which] = undefined;
                }
            }
        };

        fixSortKey(doFolderSortKey, 'list', folder.sortField, folder.sortDesc);
        fixSortKey(doInboxesSortKey, 'allInboxes', sorts.inboxesField, sorts.inboxesDesc);
        fixSortKey(doFlaggedSortKey, 'allFlagged', sorts.flaggedField, sorts.flaggedDesc);

        // Write out updated sort keys, if there were any.
        if (newSortKeys.list || newSortKeys.allInboxes || newSortKeys.allFlagged) {
            that.processor.batchWrite(email, 'sortKeys', newSortKeys, Email.KIND);
        }

        //			if (!startedMapping) { cardStage.topScene().assistant.timeLog("updateSortKeysForQuery mapping done"); startedMapping=true;}
    }, function () {
        var superComplete = function (res) {
            that._sortKeyUpdateCallback(res);
        };
        that.processor.commitBatchedWrites(superComplete);
    });
};


EmailApp.EmailProcessor.prototype._getSyntheticSorts = function () {
    return {
        inboxesField: enyo.application.prefs.get('syntheticFolderData.' + Folder.kAllInboxesFolderID + '.sortField'),
        inboxesDesc: enyo.application.prefs.get('syntheticFolderData.' + Folder.kAllInboxesFolderID + '.sortDesc'),
        flaggedField: enyo.application.prefs.get('syntheticFolderData.' + Folder.kAllFlaggedFolderID + '.sortField'),
        flaggedDesc: enyo.application.prefs.get('syntheticFolderData.' + Folder.kAllFlaggedFolderID + '.sortDesc')
    };
};

EmailApp.EmailProcessor.prototype.updateSortKeysForEmail = function (email, sorts) {
    var folder = enyo.application.folderProcessor.getFolder(email.folderId);

    sorts = sorts || this._getSyntheticSorts();

    this.processor.batchWrite(email, 'sortKeys', {
        list: this._genSortKey(email, folder && folder.sortField, folder && folder.sortDesc),
        allInboxes: this._genSortKey(email, sorts.inboxesField, sorts.inboxesDesc),
        allFlagged: this._genSortKey(email, sorts.flaggedField, sorts.flaggedDesc)
    }, Email.KIND);

    return;
};

EmailApp.EmailProcessor.prototype._genSortKey = function (email, sortField, sortDesc) {
    sortField = sortField || Folder.SORT_BY_DATE;
    sortDesc = sortDesc !== undefined ? sortDesc : true;

    switch (sortField) {
    case Folder.SORT_BY_DATE:
        return email.timestamp;

    case Folder.SORT_BY_SENDER:
        return (email.from.name || email.from.addr).toLowerCase() + this._timestampToString(email.timestamp, !sortDesc);

    case Folder.SORT_BY_SUBJECT:
        return Message.trimSubject(email.subject).toLowerCase() + this._timestampToString(email.timestamp, !sortDesc);
    }
};

EmailApp.EmailProcessor.prototype._timestampToString = function (timestamp, invert) {
    var result;

    // Optionally invert the timestamp by subtracting from an arbitrarily chosen max value.
    if (invert) {
        timestamp = 99999999999999 - timestamp;
    }

    // Convert to a string, and 0-pad to 14 digits (to preserve sort order)
    result = '' + timestamp;
    return this._zeroes[14 - result.length] + result;
};

EmailApp.EmailProcessor.prototype._zeroes = {
    0: '',
    1: '0',
    2: '00',
    3: '000',
    4: '0000',
    5: '00000',
    6: '000000',
    7: '0000000',
    8: '00000000',
    9: '000000000',
    10: '0000000000',
    11: '00000000000',
    12: '000000000000',
    13: '0000000000000',
    14: '00000000000000'
};

// limited set of props to load when updating sort keys
EmailApp.EmailProcessor.prototype._sortKeyUpdateSelect = ["_id", "folderId", "from", "timestamp", 'sortKeys', 'subject'];

