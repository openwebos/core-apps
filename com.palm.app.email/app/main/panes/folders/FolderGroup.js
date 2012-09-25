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

/*global console, enyo, Folder, EmailApp, mail, cacheMail
 */

enyo.kind({
    name: "Folders",
    kind: "Control",
    published: {
        account: ""
    },
    events: {
        onSelect: "",
        onLoaded: ""
    },
    components: [
        {name: "header", kind: "enyo.DividerDrawer", style: "min-height: 56px", onclick: "drawerClickHandler", className: "", components: [
            {name: "list", className: "folder-list", kind: "VirtualRepeater", onSetupRow: "getFolderItem", components: [
                {name: "item", kind: "Item", height: "60px", tapHighlight: true, layoutKind: enyo.HFlexLayout, align: "center", onclick: "itemClick", components: [
                    {name: "itemImage", showing: "false", kind: "Image", src: "../images/folder-favorite-normal.png"},
                    {name: "text", kind: "Control", flex: 1, components: [
                        // align title and account name vertically
                        {name: "itemName", content: $L("Inbox"), style: "margin-left: 5px;font-size:18px;text-overflow: ellipsis;overflow: hidden;white-space:nowrap"},
                        {name: "itemAccountName", content: "", className: "accountName"}
                    ]},
                    {name: "itemUnread", className: "folder-unread"},
                    {name: "itemFavorite", kind: "enyo.CustomButton", toggling: true, onclick: "favoriteStarClickHandler", className: "folder-favorite", components: [
                        {kind: "Control", className: "folder-favorite-icon"}
                    ]}
                ]}
            ]}
        ]},
        {kind: "Selection", onChange: "selectionChanged"}
    ],

    folderImages: {
        inbox: "folder-inbox.png",
        drafts: "folder-drafts.png",
        sent: "folder-sent.png",
        outbox: "folder-outbox.png",
        trash: "folder-trash.png",
        junk: "folder-junk.png",
        fallback: "folder-single-open.png"
    },

    //this is the list of folders that's being displayed
    _displayedFolders: [],
    //this stores the complete list of folders
    _allFolders: [],
    //this is used to store the current search string
    _curSearchString: "",

    create: function () {
        this.inherited(arguments);

        this.$.header.setCaption(this.account.getAlias());
        //this.$.header.setIcon(this.isFavorites() ? "../images/folder-favorite-normal.png" : enyo.application.accounts.getIconById(this.account._id));

        this.fetchFolders();

        // Is the account collapsed?  Everything but favorites defaults to collapsed.
        var opened = (enyo.application.unsavedPrefs.get("collapsedAccounts." + this.account.getId()) === false); // if not set, returns undefined, which is == false
        if (!this.isFavorites() && !opened) {
            this.$.header.close();
        }

        this.prefsChangedCallbackBound = this.prefsChangedCallback.bind(this);
        enyo.application.prefs.addListener(this.prefsChangedCallbackBound);

        this.accountsListChangedCallbackBound = this.accountsListChangedCallback.bind(this);
        enyo.application.accounts.addListener(this.accountsListChangedCallbackBound);
    },

    destroy: function () {
        enyo.application.prefs.removeListener(this.prefsChangedCallbackBound);
        enyo.application.accounts.removeListener(this.accountsListChangedCallbackBound);

        this.cancelFolderFetchAutoFinders();
        this.cancelUnreadCountAutoFinders();

        this.inherited(arguments);
    },

    cancelFolderFetchAutoFinders: function () {
        if (this._folderFetchAutoFinder) {
            this._folderFetchAutoFinder.cancel();
        }
    },

    cancelUnreadCountAutoFinders: function () {
        if (this._unreadCountAutoFinders) {
            this._unreadCountAutoFinders.forEach(function (unreadCountAutoFinder) {
                unreadCountAutoFinder.cancel();
            });
            this._unreadCountAutoFinders.length = 0;
        }
    },

    getSelectedId: function () {
        return this.$.selection.getSelectedKeys()[0];
    },

    select: function (id) {
        if (this.$.selection.isSelected(id)) {
            return true;
        }

        if (this._allFolders.some(function (f) {
            return f._id === id;
        })) {
            this.$.selection.select(id);
            return true;
        } else {
            this.$.selection.clear();
        }
    },
    selectionChanged: function (inSender) {
        this.$.list.render();
    },

    accountsListChangedCallback: function () {
        //if we're in the favorites list, we now have fewer than two accounts, and we're supposed to show all inboxes, we need to actually remove
        //all inboxes from the folder list, because we only show it when we have more than one account
        var accts = enyo.application.accounts;

        if (this.isFavorites() && accts.hasAccounts() && accts.getAccounts().length < 2 && enyo.application.prefs.get("showAllInboxes")) {
            this.removeFolderFromListById(this._allFolders, Folder.kAllInboxesFolderID);

            //now call this.gotFolders() to update the list

            this.gotFolders(this._allFolders, true);
        }
    },

    prefsChangedCallback: function (propName, newValue) {
        //we only care about the synthetic folder prefs, so if we're not the favorites folders list, ignore any prefs changes
        if (!this.isFavorites()) {
            return;
        }

        // remove all the existing special folders
        this._allFolders = this._allFolders.filter(function (item) {
            return !Folder.isSynthetic(item);
        });

        var prefs = enyo.application.prefs;
        var index = 0;

        //only show all inboxes if there's more than one account
        var accts = enyo.application.accounts;
        var hasMultipleAccounts = accts.hasAccounts() && accts.getAccounts().length > 1;
        if (hasMultipleAccounts && prefs.get("showAllInboxes")) {
            this.insertFolderIntoList(this._allFolders, Folder.kAllInboxesFolder, index);
            index++;
        }

        if (prefs.get("showAllFlagged")) {
            this.insertFolderIntoList(this._allFolders, Folder.kAllFlaggedFolder, index);
            index++;
        }

        // DEBUG(AK) for DFISH-19417
        var flaggedFolderMatcher = function (element) {
            return element._id === Folder.kAllFlaggedFolderID;
        };
        if (this._allFolders.filter(flaggedFolderMatcher).length >= 2) {
            console.error("DFISH-19417 happened!!");
            console.error("DFISH-19417: inserted with index " +
                allFlaggedIndex);
            console.error("DFISH-19417: allFolders: ");
            JSON.stringify(this._allFolders).split("\n").forEach(function (line) {
                console.error("DFISH-19417: " + line);
            });
        }
        // END DEBUG(AK) for DFISH-19417

        // update the folders
        this.gotFolders(this._allFolders, true);

        // newValue is false if a pref was changed to false, and that means a
        // synthetic folder was removed. Since it doesn't matter which one, we
        // should move the focus to the first actual available folder.
        if (!newValue) {
            this.$.selection.select(0);
            this.doSelect(this.getFolderByIndex(0));
        }
    },

    /*
     * Insert the given folder into the list of folders being displayed at the given index
     */
    insertFolderIntoList: function (folderList, folder, index) {
        //if index is 0 or otherwise falsy, put it on the front of the list
        if (!index) {
            //short-circuit this case since unshift should be a bit faster than splice
            folderList.unshift(folder);
        } else {
            folderList.splice(index, 0, folder);
        }
    },

    /*
     * Remove all folders with the given id from the list of folders being displayed.
     * Does nothing if the given folder id is not found.
     */
    removeFolderFromListById: function (foldersList, folderId) {
        foldersList = foldersList.filter(function (folder) {
            return folder._id !== folderId;
        });
    },

    isFavorites: function () {
        return !this.account.getId() && this.account.isFavoritesAccount;
    },

    fetchFolders: function () {
        //there's 4 cases: the cross-product of { favorites, non-favorites } and { on device, in browser }
        var callback;

        if (this.isFavorites()) {
            //in this case, we get the favorite folders and use a callback of gotFavoriteFolders
            callback = enyo.hitch(this, "gotFavoriteFolders");
            if (EmailApp.Util.onDevice()) {
                this.cancelFolderFetchAutoFinders();
                this._folderFetchAutoFinder = new EmailApp.Util.MojoDBAutoFinder({
                    from: "com.palm.folder:1",
                    where: [
                        {
                            prop: "favorite",
                            op: "=",
                            val: true
                        }
                    ],
                    orderBy: "displayName"
                }, callback);

            } else {
                cacheMail.getFavoriteFolders(callback);
            }
        } else {
            //in this case, we get all the folders for the current account and use a callback of gotFolders
            callback = enyo.hitch(this, "gotFolders");
            if (EmailApp.Util.onDevice()) {
                this.cancelFolderFetchAutoFinders();
                this._folderFetchAutoFinder = new EmailApp.Util.MojoDBAutoFinder({
                    from: "com.palm.folder:1",
                    where: [
                        {
                            prop: "accountId",
                            op: "=",
                            val: this.account.getId()
                        }
                    ],
                    orderBy: "sortKey"
                }, callback);
            } else {
                cacheMail.getFolders(this.account.getId(), callback);
            }
        }
    },

    /*
     * This takes an array containing the complete set of folders belonging to this object.
     * It will:
     *		1.  Store the folders array to this._allFolders
     *		2.  Create the MojoDBAutoFinders for the unread counts
     *		3.  Call this.filterFoldersAndRenderList()
     */
    gotFolders: function (folders, force) {
        //store the array
        var old = this._allFolders;
        this._allFolders = folders;

        var updates = EmailApp.Util.checkListItemUpdates(old, this._allFolders, "_id", ["displayName", "favorite", "sortKey"]);

        if (!updates && !force) {
            // Don't bother updating if there's no visible changes
            return;
        }

        //now cancel the old unread count auto finders and create new ones
        this.cancelUnreadCountAutoFinders();

        this._unreadCountAutoFinders = [];
        var onDevice = EmailApp.Util.onDevice();
        for (var i = 0, f; !!(f = folders[i]); i++) {
            var callback = enyo.hitch(this, "gotUnread", f);
            if (onDevice) {
                //we pass true as the fifth param so that we get a count
                this._unreadCountAutoFinders[i] = new EmailApp.Util.MojoDBAutoFinder(EmailApp.Util.generateUnreadCountQuery(f._id), callback, undefined, undefined, true);
            } else {
                setTimeout(callback("unusedParam", 99), 50);
            }
        }

        //filter the folders list and (re-)render the list
        this.filterFoldersAndRenderList();
    },

    // FIXME: factor this better.
    gotUnread: function (inFolder, ignored, inCount) {
        //console.log("in Folders.gotUnread.  isFavorites(): " + stringify(this.isFavorites()) + " inCount: " + stringify(inCount) + " inFolder: " + stringify(inFolder));

        inFolder.unreadCount = inCount;

        // FIXME: It's unclear if it's better to just render the folder list or update the specific row.
        var that = this;
        this._displayedFolders.forEach(function (folder, index) {
            if (folder && inFolder._id === folder._id) {
                that.$.list.renderRow(index);
            }
        });

        this.doLoaded();
    },

    /*
     * The callback for the getFavoriteFolders call.  Sorts the folders, optionally prepends synthetic folders, then calls this.gotFolders with the sorted list.
     */
    gotFavoriteFolders: function (folders) {
        //first we sort the folders
        var sortedFolders = this.sortFavoriteFolders(folders);

        //now we add the synthetic folders
        //put them on the front of the list, in reverse order, so they end up in the correct order
        var prefs = enyo.application.prefs;
        if (prefs.get("showAllFlagged")) {
            this.insertFolderIntoList(sortedFolders, Folder.kAllFlaggedFolder, 0);
        }
        if (prefs.get("showAllUnread")) {
            this.insertFolderIntoList(sortedFolders, Folder.kAllUnreadFolder, 0);
        }
        var accts = enyo.application.accounts;
        //only show all inboxes if we have more than one account
        if (prefs.get("showAllInboxes") && accts.hasAccounts() && accts.getAccounts().length > 1) {
            this.insertFolderIntoList(sortedFolders, Folder.kAllInboxesFolder, 0);
        }

        //now call this.gotFolders to do continue onwards


        this.gotFolders(sortedFolders);
    },

    /*
     * Sort the folders according to account order.
     */
    sortFavoriteFolders: function (folders) {
        var sortedAccounts = enyo.application.accounts.getSortedList();

        var folderBuckets = {};
        sortedAccounts.forEach(function (acct) {
            folderBuckets[acct.getId()] = [];
        });

        // Put each favorite folder into an account bucket
        folders.forEach(function (folder) {
            var folderAccountId = folder.accountId;
            // if a mail account exists for this folder, we use it
            if (folderBuckets[folderAccountId]) {
                // inboxes should be at the front of the list, as with regular folders
                if (folder.displayName === $L("Inbox")) {
                    folderBuckets[folderAccountId].unshift(folder);
                } else {
                    folderBuckets[folderAccountId].push(folder);
                }
            }
        });

        // Create sorted folder list from the account buckets according to account sort order
        var sortedFolders = [];
        var push = Array.prototype.push;
        sortedAccounts.forEach(function (sortedAccount) {
            //push each of the folders in this account's bucket onto the sortedFolders array
            var foldersInAccount = folderBuckets[sortedAccount.getId()];
            push.apply(sortedFolders, foldersInAccount);
        });

        return sortedFolders;
    },

    filterFoldersAndRenderList: function () {
        //first, we filter
        if (this._curSearchString) {
            this._displayedFolders = this.filterFolders(this._allFolders, this._curSearchString);
        } else {
            //and when there's no search, restore the folders list
            this._displayedFolders = this._allFolders.slice(0);
        }

        //second, re-render the list to get it to update
        this.$.list.render();
    },

    /*
     * Filters the given list of folders by the given search string.
     * Returns a new array containing all the folders that matched.
     */
    filterFolders: function (foldersList, searchString) {
        if (!searchString) {
            //call slice to generate a new array
            return foldersList.slice(0);
        }

        return foldersList.filter(function (folder) {
            return Folder.filterFolderName(filterString, folder);
        });
    },

    folderIsInbox: function (folder) {
        if (folder.accountId === Folder.kFavoriteFoldersAccountID) {
            return folder._id === Folder.kAllInboxesFolderID;
        } else {
            var account = enyo.application.accounts.getAccount(folder.accountId);

            if (!window.PalmSystem) {
                // FIXME hack for in-browser development only; should fix up dummy account data
                if (folder.displayName === $L("Inbox")) {
                    return true;
                }
            }

            return account && folder._id === account.getInboxFolderId();
        }

        return false;
    },

    getFolderItem: function (inSender, inIndex) {
        var folder = this._displayedFolders[inIndex];

        if (!folder) {
            return false;
        }

        this.$.item.domStyles["border-top"] = inIndex === 0 ? "none" : null;
        this.$.item.domStyles["border-bottom"] = inIndex == this._displayedFolders.length - 1 ? "none" : null;

        this.$.itemName.setContent(enyo.application.folderProcessor.getLocalizedFolderName(folder));

        var isInbox = this.folderIsInbox(folder);
        var isSelectable = folder.selectable !== false;

        var unread = folder.unreadCount;
        this.$.itemName.domStyles["font-weight"] = isInbox ? "bold" : "none";
        this.$.itemUnread.setShowing(!!unread);
        this.$.itemUnread.setContent(unread);

        // Some folders (e.g. [Gmail]) are not selectable (can't be viewed)
        this.$.item.setDisabled(!isSelectable);

        if (this.isFavorites()) {
            this.$.itemFavorite.setShowing(false);
            this.$.itemImage.setSrc(Folder.isSynthetic(folder) ? "../images/folder-favorite-allinboxes.png" : "../images/folder-favorite-normal.png");

            var account = enyo.application.accounts.getAccount(folder.accountId);
            this.$.itemAccountName.setContent(account && account.getAlias() || "");

        } else {
            this.$.itemImage.setSrc("../images/" + (enyo.application.folderProcessor.getFolderIcon(folder._id) || "folder-single-open.png"));
            this.$.itemAccountName.setContent("");
            this.$.itemFavorite.setShowing(isSelectable);
        }

        this.$.itemFavorite.setDepressed(folder.favorite);

        // Display proper indentation:
        var depth = enyo.application.folderProcessor && enyo.application.folderProcessor.calculateFolderDepth(folder._id);
        if (!depth || this.isFavorites()) {
            depth = 0;
        }

        this.$.itemImage.setClassName(depth ? (" indent-" + depth) : ""); // FIXME need a max depth
        this.$.item.addRemoveClass("active-msg", this.$.selection.isSelected(folder._id));

        return true;
    },

    getFolderByIndex: function (index) {
        return this._displayedFolders[index];
    },

    setSearchString: function (curSearchString) {
        this._curSearchString = curSearchString;

        //first, open or close the drawer as appropriate:
        //		* when searching, it gets opened
        //		* when done searching, it's returned to its previous state
        if (curSearchString) {
            this.$.header.setOpen(true);
        } else {
            //the unsaved pref for favorites will always be undefined (since favorites are always open), so this conveniently requires no special case for favorites
            var shouldBeClosed = enyo.application.unsavedPrefs.get("collapsedAccounts." + this.account._id);
            this.$.header.setOpen(!shouldBeClosed);
        }

        //now, filter the folders based on the current search string and re-render the list
        this.filterFoldersAndRenderList();

        //finally, if we're doing a search and there's no results, hide ourselves
        if (this._curSearchString && this._displayedFolders.length === 0) {
            this.hide();
        } else {
            this.show();
        }
    },

    favoriteStarClickHandler: function (inSender, inEvent) {
        var folder = this.getCurFolder();
        Folder.setFavorite(folder._id, inSender.getDepressed());
        return true;
    },

    getCurFolder: function () {
        return this._displayedFolders[this.$.list.fetchRowIndex()];
    },

    drawerClickHandler: function () {
        if (!this.isFavorites()) {
            enyo.application.unsavedPrefs.set("collapsedAccounts." + this.account._id, !this.$.header.open);
        }
    },

    itemClick: function (inSender, inEvent) {
        var f = this.getCurFolder();
        this.$.selection.select(f._id);
        this.doSelect(f);
        return true;
    }
});
