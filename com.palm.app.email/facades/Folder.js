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

/*global Folder:true, EmailApp */

if (!window.Folder) {
    Folder = {};
}

// On the service side, these are referred to as Use

/*Folder SyncStatus constants and method */
Folder.IDLE = "IDLE";							// a transport is not actively syncing
Folder.PUSH = "PUSH";							// a transport is not actively syncing, but it has a push socket connection open and is ready to sync
Folder.INITIAL_SYNC = "INITIAL_SYNC";			// a transport is running the very first sync for an account/capability/collection.
Folder.INCREMENTAL_SYNC = "INCREMENTAL_SYNC";	// a transport is doing an incremental sync. Incremental syncs are typically short and little data is exchanged.
Folder.DELETE = "DELETE";	// a transport is removing locally cached sync data and disabling any future sync. This can take a while.
Folder.ERROR = "ERROR";		// a transport is stuck in an error state. It may be waiting for a condition to correct itself. It should not schedule or execute any periodic syncs while in this state, but the user may force a manual sync.


Folder.isSyncing = function (syncState) {
    return (syncState === Folder.INITIAL_SYNC || syncState === Folder.INCREMENTAL_SYNC);
};

// Constants for how the list should be sorted.
Folder.SORT_BY_DATE = 'timestamp';
Folder.SORT_BY_SENDER = 'sender';
Folder.SORT_BY_SUBJECT = 'subject';

Folder.STATUS_MANUAL = "manual";  // offer to sync now
Folder.STATUS_SCHEDULED = "scheduled"; // offer to sync now
Folder.STATUS_SYNCING = "syncing";
Folder.STATUS_PUSHING = "push";
Folder.KIND = "com.palm.folder:1";

Folder.identifier = 'palm://com.palm.mail';


Folder.kFavoriteFoldersAccountID = 'favorite-folders';
Folder.kAllFlaggedFolderID = '-smart_folder_all_flagged';
Folder.kAllInboxesFolderID = '-smart_folder_all_inboxes';
Folder.kAllUnreadFolderID = '-smart_folder_all_unread';

Folder.kAllFlaggedFolder = {
    _id: Folder.kAllFlaggedFolderID,
    accountId: Folder.kFavoriteFoldersAccountID,
    displayName: $L("All Flagged"),
    favoriteFoldersType: "allinboxes-type",
    accountName: "",
    depth: 0
};

Folder.kAllInboxesFolder = {
    _id: Folder.kAllInboxesFolderID,
    accountId: Folder.kFavoriteFoldersAccountID,
    displayName: $L("All Inboxes"),
    favoriteFoldersType: "allinboxes-type",
    accountName: "",
    depth: 0
};

Folder.kAllUnreadFolder = {
    _id: Folder.kAllUnreadFolderID,
    accountId: Folder.kFavoriteFoldersAccountID,
    displayName: $L("All Unread"),
    favoriteFoldersType: "allinboxes-type",
    accountName: "",
    depth: 0
};


/*
 * Returns true if the folder passed in is one of the three synthetic folders.
 */
Folder.isSynthetic = function (folder) {
    return (folder._id === Folder.kAllInboxesFolderID || folder._id === Folder.kAllUnreadFolderID || folder._id === Folder.kAllFlaggedFolderID);
};

/* FIXME this is totally not g11n-safe */
Folder.filterFolderName = function (searchString, folder) {
    var words, i;

    if (!folder.displayName) {
        return true;
    }

    //split display name into lowercased words.
    words = folder.displayName.toLowerCase().split(/[\s.,;:'"\(\)]+/);

    //lowercase the search string to match the display name
    searchString = searchString.toLowerCase();

    //check if any of the words begin with the filter string.  if so, we have a match.
    for (i = 0; i < words.length; i++) {
        if (words[i].indexOf(searchString) === 0) {
            return true;
        }
    }

    return false;
};

/**
 * Subscribes to a list of folders in MojoDB with a watch.
 * returned request object has a cancel method, which can be used
 * to terminate the subscription.
 */
Folder.getAccountFolderList = function (accountId, filter, callback) {
    if (EmailApp.Util.onDevice()) {
        return EmailApp.Util.callService('palm://com.palm.db/find',
            {
                query: {
                    from: "com.palm.folder:1",
                    where: [
                        {prop: "accountId", op: "=", val: accountId}
                    ],
                    orderBy: 'sortKey'
                }
            },
            callback
        );
    } else {
        cacheMail.getFolders(accountId, function (folders) {
            callback({returnValue: true, results: folders});
        });
    }
};

/**
 * Method for loading a ListSelector or PopupList with preformatted folder data
 * @param {Object} accountId account id for folders
 * @param {Object} callingWidget widget to display data. must provide a setItems method
 * @param {Object} initialVal (optional) initial value for the ListSelector
 */
Folder.loadIndentedFolderItems = function (accountId, callingWidget, initialVal, hideNoneOp, onComplete) {
    var folderProcessor = enyo.application.folderProcessor;
    Folder.getAccountFolderList(accountId, undefined, gotFolders);

    function gotFolders(folders) {
        var folds = folders.results,
            items = [];

        folds.forEach(function (fol) {
            items.push(formatFolder(fol));
        });

        if (!hideNoneOp) {
            items.unshift({
                caption: $L("None"),
                value: null
            });
        }
        callingWidget.setItems(items);
        if (initialVal !== undefined && initialVal !== null) {
            callingWidget.setValue(initialVal);
        } else {
            callingWidget.setValue(hideNoneOp ? "" : "null");
        }

        callingWidget.render();
        if (onComplete) {
            onComplete(folders.results);
        }
    }

    function formatFolder(fol) {
        var depth = folderProcessor.calculateFolderDepth(fol._id);
        var prefix = "";
        for (var i = 0; i < depth; ++i) {
            prefix += "\u00A0\u00A0\u00A0";
        }
        return {
            caption: prefix + folderProcessor.getLocalizedFolderName(fol),
            value: fol._id
        };
    }
};


Folder.setImapServerFolder = function (emailAccountId, folderId, type, callback) {
    var toSave = {
        _id: emailAccountId
    };
    if (type === "sent") {
        toSave.sentFolderId = folderId;
    } else if (type === "trash") {
        toSave.trashFolderId = folderId;
    } else if (type === "drafts") {
        toSave.draftsFolderId = folderId;
    }
    //this could get dropped on the floor if you don't hold onto it
    return EmailApp.Util.callService('palm://com.palm.db/merge', {objects: [toSave]}, callback);
};

Folder.setFavorite = function (folderId, favorite) {
    var toSave = {
        _id: folderId,
        favorite: !!favorite
    };
    return EmailApp.Util.callService('palm://com.palm.db/merge', {objects: [toSave]});
};

Folder.syncFolder = function (transportUrl, accountId, folderId, force) {
    if (!transportUrl) {
        return undefined;
    }
    if (transportUrl.lastIndexOf("/") !== transportUrl.length - 1) {
        transportUrl += "/";
    }
    transportUrl += 'syncFolder';
    return EmailApp.Util.callService(transportUrl, {'accountId': accountId, 'folderId': folderId, 'force': force});
};