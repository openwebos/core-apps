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

/*global Mojo, $L, Class, window, document, PalmSystem, AppAssistant, palmGetResource, Foundations, _,
 App, console, Throttler, $H, $A, Event, $break, Element,
 Poly9, MailtoURIParser,
 EmailFlags, EmailRecipient, EmailAppDepot, AccountpreferencesAssistant, Email, EmailAccount, EmailDecorator,
 ObjCache, NotificationAssistant, LaunchHandler, FirstUseLaunchHandler, FirstUseAssistant, AudioTag,
 Contact, ContactReminder, Attachments, MenuController, ErrorAnalyzer, Folder, FolderFlags, IMName, Message,
 ServiceStrings, ColorPickerDialogAssistant, SecuritypolicyAssistant, EmaillistDataSource, Pseudocard,
 CreateAssistant, ComposeAssistant, ConnectionWidget, EmailApp */

/*
 Class that processes all folders, and watches for changes.
 It generates the sortKey property required by the UI, and keeps it up to date.
 */
EmailApp.FolderProcessor = function (onReady) {

    // Enforce singleton nature of this class.
    if (EmailApp.FolderProcessor.allocated) {
        throw "FolderProcessor is a singleton, and has already been allocated.";
    }
    EmailApp.FolderProcessor.allocated = true;

    this.processor = new EmailApp.MojoDBChangeProcessor({
        kind: "com.palm.folder:1",
        incDel: true,
        processChanges: this._processChanges.bind(this),
        processDeletes: this._processDeletes.bind(this),
        processingComplete: this._processingComplete.bind(this)
    });

    this.folders = {}; // Hash of _id -> folder object, for all folders we know about.
    this._recalcSpecialFolders(); // Build hash of _id -> icon class for special folders.

    // Reprocess all folders when accounts change.
    enyo.application.accounts.addListener(this._accountsChanged.bind(this));

    // Save initial set of mail accounts:

    this._oldMailAccounts = {};
    var key;
    var accts = enyo.application.accounts.getAccounts();
    var that = this;
    accts.forEach(function (acct) {
        that._oldMailAccounts[acct.getId()] = acct;
    });

    // For initial processing, force sort key calculation.
    this._forceSortKeyUpdate = true;


    this._onReady = onReady;
    if (!EmailApp.Util.hasServiceCallbacks()) {

        this.folders = {
            "fake-account-1-fake-folder-id": {_id: "fake-account-1-fake-folder-id", accountId: 'fake-account-1'},
            "fake-account-2-fake-folder-id": {_id: "fake-account-2-fake-folder-id", accountId: 'fake-account-2'}
        };

        // On desktop, call through immediately.
        window.setTimeout(onReady, 0); //Ugh. onReady is normally called by processingComplete, which clears on_ready.
        this._onReady = undefined; // If we don't do so here, we'll later do onReady again and barf on the singleton check.
    }

};

// Public method.  Used to support lookup of accounts for individual emails.
EmailApp.FolderProcessor.prototype.getFolderAccount = function (folderId) {
    var f = this.folders[folderId];
    return f && f.accountId;
};

// Public method.  Used to prevent rest of the app from having to do async lookup of data we already have.
EmailApp.FolderProcessor.prototype.getFolder = function (folderId) {
    return this.folders[folderId];
};

// Public method.  Used to prevent rest of the app from having to look up special icon designations in all of the mail accounts.
EmailApp.FolderProcessor.prototype.getFolderIcon = function (folderId) {
    var folderTypeInfo = this._specialFolders[folderId];
    return folderTypeInfo && folderTypeInfo.icon;
};

// Public method.  Override folder name with localized name ONLY IF it matches the default system (English) name.
EmailApp.FolderProcessor.prototype.getLocalizedFolderName = function (folder) {
    if (!folder) {
        return undefined;
    }

    var folderTypeInfo = this._specialFolders[folder._id];

    // Only localize if the name matches the system name exactly.
    if (folderTypeInfo && folderTypeInfo.systemName[folder.displayName]) {
        return folderTypeInfo.systemName[folder.displayName];
    }

    return folder.displayName;
};


// Called when accounts change.
// Checks to see if any special folder designations have been modified, and forces recalculation of folder sort keys if so.
EmailApp.FolderProcessor.prototype._accountsChanged = function () {
    var oldMailAccounts = this._oldMailAccounts;
    var newMailAccounts = {};

    var key;
    var accts = enyo.application.accounts.getAccounts();
    accts.forEach(function (acct) {
        newMailAccounts[acct.getId()] = acct;
    });

    var newAcct, oldAcct, acctId;

    // Save updated accounts for next time.
    this._oldMailAccounts = newMailAccounts;

    // Check special folder assignments... if they're different, force sort key recalculation.
    for (acctId in newMailAccounts) {
        if (newMailAccounts.hasOwnProperty(acctId)) {
            newAcct = newMailAccounts[acctId];
            oldAcct = oldMailAccounts[acctId];

            if (!oldAcct || !newAcct ||
                oldAcct.getInboxFolderId() !== newAcct.getInboxFolderId() ||
                oldAcct.getDraftsFolderId() !== newAcct.getDraftsFolderId() ||
                oldAcct.getSentFolderId() !== newAcct.getSentFolderId() ||
                oldAcct.getOutboxFolderId() !== newAcct.getOutboxFolderId() ||
                oldAcct.getTrashFolderId() !== newAcct.getTrashFolderId()) {

                console.info("Detected change in special folder assignments, recalculating folder sort keys.");
                this._forceSortKeyUpdate = true;
                this.processor.processAll();
                break;
            }
        }
    }

    this._recalcSpecialFolders();
};


EmailApp.FolderProcessor.prototype._recalcSpecialFolders = function () {
    var i, iconHash, acct;
    var accounts = enyo.application.accounts.getAccounts();

    var folderTypeInfos = {
        inbox: {systemName: {"Inbox": $L("Inbox"), "INBOX": $L("Inbox")}, icon: "folder-inbox.png"},
        sent: {systemName: {"Sent": $L("Sent"), "Sent Items": $L("Sent Items"), "Sent Mail": $L("Sent Mail")}, icon: "folder-sent.png"},
        drafts: {systemName: {"Drafts": $L("Drafts"), "Draft": $L("Draft")}, icon: "folder-drafts.png"},
        trash: {systemName: {"Trash": $L("Trash"), "Deleted Items": $L("Deleted Items")}, icon: "folder-trash.png"},
        outbox: {systemName: {"Outbox": $L("Outbox")}, icon: "folder-outbox.png"},
        junk: {systemName: {"Junk": $L("Junk"), "Junk E-Mail": $L("Junk E-mail"), "Spam": $L("Spam"), "Bulk Mail": $L("Bulk Mail")}, icon: "folder-junk.png"}
    };

    var specialHash = {};

    // Build a hash of folderId -> iconClass for all the special folders.
    accounts.forEach(function (acct) {
        specialHash[acct.getInboxFolderId()] = folderTypeInfos.inbox;
        specialHash[acct.getSentFolderId()] = folderTypeInfos.sent;
        specialHash[acct.getDraftsFolderId()] = folderTypeInfos.drafts;
        specialHash[acct.getTrashFolderId()] = folderTypeInfos.trash;
        specialHash[acct.getOutboxFolderId()] = folderTypeInfos.outbox;
        specialHash[acct.getJunkFolderId()] = folderTypeInfos.junk;
    });

    specialHash['undefined'] = undefined; // in case one or more of the folder ids were undefined.
    this._specialFolders = specialHash;
};


// Reset the flag that forces sort key recalculation once we're finished with a set of folders.
// This is set to allow account changes to cause all sort keys to be recalculated, even when the folders themselves have not changed.
EmailApp.FolderProcessor.prototype._processingComplete = function () {
    this._forceSortKeyUpdate = false;

    if (this._onReady) {
        this._onReady();
        this._onReady = undefined;
    }
};

// Called when a set of revised folders has been loaded.
// Processes them to make sure sort keys and depths are up to date.
EmailApp.FolderProcessor.prototype._processChanges = function (changedFolders) {
    var i, id, f, folders;
    var recalculateSortKeys = this._forceSortKeyUpdate;

    // First, make sure the folder hash contains all folders, and that the info is up-to-date:
    for (i = 0; i < changedFolders.length; i++) {
        f = changedFolders[i];

        recalculateSortKeys = this._checkDeltas(this.folders[f._id], f) || recalculateSortKeys;

        this.folders[f._id] = f;
    }

    // We need to verify the calculated info for all folders, since the depth/sortkey of children can be affected when a parent changes.
    if (recalculateSortKeys) {
        folders = this.folders;
        var that = this;
        Object.keys(folders).forEach(
            function (id) {
                that.updateFolder(folders[id]);
            }
        );
    }

    return;
};

// Just removes deleted folders from our hash, so they don't accumulate.
EmailApp.FolderProcessor.prototype._processDeletes = function (deletedFolders) {
    var i;
    for (i = 0; i < deletedFolders.length; i++) {
        delete this.folders[deletedFolders[i]._id];
    }
};


// Recalculate sortKey and depth for the given folder.
EmailApp.FolderProcessor.prototype.updateFolder = function (f) {
    var sortKey = [], typeSortKey;
    var parent;

    //console.log("FolderProcessor.updateFolder: Processing " + f._id);

    // Build an array of string elements for the sort key path, then join them with slashes.
    // Stop looping once we find a specially sorted folder.
    // This prevents inbox/outbox from being indented when they are pulled from someplace else in the hierarchy,
    // and it ensures that their children are indented properly.
    sortKey.unshift(f.displayName);
    parent = f;
    typeSortKey = this.getTypeSortKey(f);
    while (parent.parentId && typeSortKey === this.TYPE_SORT_KEY_OTHER) {
        parent = this.folders[parent.parentId];

        // Parent may not be loaded yet, or this folder may not be deleted yet.
        // If necessary, the sort key will be recalculated when it's loaded.
        if (!parent) {
            break;
        }

        sortKey.unshift(parent.displayName);

        // We save any special typeSortKey while traversing up to the root.
        // This causes special folders like inbox to "jump out" of the hierarchy
        // and go to the top, and bring their children with them.
        typeSortKey = this.getTypeSortKey(parent);
    }

    // If we were able to calculate the sortkey for all folders up to the root, then
    // finish constructing the sortkey and write it out.
    // Otherwise, the account is probably just not loaded yet, and we'll recalculate it then.
    if (typeSortKey !== undefined) {

        sortKey.unshift("" + typeSortKey);
        sortKey = sortKey.join('/');

        this.processor.batchWrite(f, 'sortKey', sortKey, Folder.KIND);
    }

};

// Calculates the depth of a folder by traversing the hierarchy towards the root.
// Assumes all necessary folders already exist in the hash.
// Returns the depth, which is within the range [0,4].
EmailApp.FolderProcessor.prototype.calculateFolderDepth = function (folderId) {
    var f;
    var depth;

    if (this.getFolderIcon(folderId)) {
        return 0;
    }

    depth = 0;
    f = this.folders[folderId];

    while (f && f.parentId && depth < 4) {
        depth++;
        f = this.folders[f.parentId];
    }

    return depth;
};

// Checks for specific changes in folders, which can trigger other work.
// Returns true if it's necessary to recalculate sort keys for all folders.
EmailApp.FolderProcessor.prototype._checkDeltas = function (oldFolder, newFolder) {
    var oldSortDesc, newSortDesc;


    if (!oldFolder) {
        return true;
    }

    // Default boolean desc value to true if undefined.
    oldSortDesc = oldFolder.sortDesc !== undefined ? oldFolder.sortDesc : true;
    newSortDesc = newFolder.sortDesc !== undefined ? newFolder.sortDesc : true;


    // If the folder's sort order changed, we need to recalculate the sort keys for messages in that folder.
    if ((oldFolder.sortField || Folder.SORT_BY_DATE) !== (newFolder.sortField || Folder.SORT_BY_DATE) || oldSortDesc !== newSortDesc) {

        // DOLATER/OPTIMIZATION: If it was just the descending value that changed, and we're sorting by timestamp,
        // then we actually don't rewrite anything, since the timestamp field will not be changing.
        // We could save ourselves the fetch & processing time here... except the list scene also needs to be smart
        // enough to not wait for the update callback in this case.

        Mojo.Controller.appController.assistant.emailProcessor.updateSortKeysForQuery({from: "com.palm.email:1", where: [
            {prop: "folderId", op: "=", val: newFolder._id}
        ]}, true, false, false);
    }

    // If the folder's parentId or displayName changed, then we need to recalc sort keys for all folders.
    // This ensures any children will be properly updated.
    if (oldFolder.displayName !== newFolder.displayName || oldFolder.parentId !== newFolder.parentId) {
        return true;
    }

    return false;
};


// Inbox & outbox get pulled out of the hierarchy and put at the top.
// No special sorting rules for other folder types... just special icons.
EmailApp.FolderProcessor.prototype.TYPE_SORT_KEY_INBOX = 1;
EmailApp.FolderProcessor.prototype.TYPE_SORT_KEY_DRAFTS = 2;
EmailApp.FolderProcessor.prototype.TYPE_SORT_KEY_SENT = 3;
EmailApp.FolderProcessor.prototype.TYPE_SORT_KEY_OUTBOX = 4;
EmailApp.FolderProcessor.prototype.TYPE_SORT_KEY_TRASH = 5;
EmailApp.FolderProcessor.prototype.TYPE_SORT_KEY_OTHER = 9;

// Returns the sort key for a folder for the given id, by looking it up in the currently loaded accounts.
EmailApp.FolderProcessor.prototype.getTypeSortKey = function (f) {
    var a, id;

    a = enyo.application.accounts.getAccount(f.accountId);
    id = f._id;

    // If we can't find the account for this folder, then it's probably not loaded yet.
    // We'll regenerate sortkeys when it's loaded anyways, so we can just skip it for now.
    if (!a) {
        return undefined;
    }

    if (id === a.getInboxFolderId()) {
        return this.TYPE_SORT_KEY_INBOX;
    } else if (id === a.getOutboxFolderId()) {
        return this.TYPE_SORT_KEY_OUTBOX;
    } else if (id === a.getSentFolderId()) {
        return this.TYPE_SORT_KEY_SENT;
    } else if (id === a.getDraftsFolderId()) {
        return this.TYPE_SORT_KEY_DRAFTS;
    } else if (id === a.getTrashFolderId()) {
        return this.TYPE_SORT_KEY_TRASH;
    }

    return this.TYPE_SORT_KEY_OTHER;
};

