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

enyo.kind({
    name: "MailAccounts",
    kind: "VFlexBox",
    published: {
        selectedAccount: null
    },
    events: {
        onSelectFolder: "",
        onComposeMessage: "",
        onFoldersLoaded: ""
    },
    className: "basic-back",
    components: [
        {showing: true, name: "header", className: "", domStyles: {position: "absolute", top: "0px", left: "0px", right: "0px", background: "url(../images/top-fade.png) 0 0 repeat-x", "z-index": 1}},
        {name: "headerLabel", kind: "Toolbar", className: "enyo-toolbar enyo-toolbar-light", components: [
            {kind: "Control", name: "df", content: $L("Accounts")}
        ]},
        {className: "header-shadow"},
        {name: "scroller", kind: "Scroller", flex: 1, onscroll: "scrollerScroll", components: [
            {name: "accountsList", kind: "Repeater", onSetupRow: "getAccountItem"}
        ]},
        {className: "footer-shadow"},
        {kind: "Toolbar", className: "mail-command enyo-toolbar enyo-toolbar-light", components: []},
    ],

    create: function () {
        this.inherited(arguments);
        this.showHideHeader(false);

        // Make sure we're notified when accounts change.
        this.accountsChangedBound = this.accountsChanged.bind(this);
        enyo.application.accounts.addListener(this.accountsChangedBound);
        this.accountsChanged(); // synthesize a change notification to set up initial list of accounts.

        this.prefsChangedBound = this.prefsChanged.bind(this);
        enyo.application.prefs.addListener(this.prefsChangedBound);
    },

    destroy: function () {
        enyo.application.prefs.removeListener(this.prefsChangedBound);
        enyo.application.accounts.removeListener(this.accountsChangedBound);

        this.inherited(arguments);
    },

    getAppMenuConfigs: function () {
        return {};
    },
    accountsChanged: function () {
        var oldAccounts = this.accounts;
        var accts = enyo.application.accounts;
        this.accounts = accts.getSortedList();
        this.defaultAccount = accts.getDefaultAccount();

        // TODO: update this
        this.accounts.unshift({
            getAlias: function () {
                return $L("Favorites")
            },
            getId: function () {
                return undefined;
            },
            isFavoritesAccount: true
        });

        // render accounts list
        if (this.$.accountsList.hasNode()) {
            this.$.accountsList.render();
        }
        if (this.selectedFolder) {
            var that = this;
            setTimeout(function () { //delay so render can finish
                that.selectFolder(that.selectedFolder);
            }, 0);
        }

        if (!this.selectedAccount) {
            this.setSelectedAccount(this.defaultAccount);
        }
    },

    getAccountItem: function (inSender, inIndex) {
        var account = this.accounts[inIndex];
        if (account) {
            var foldersConfigObj = {
                kind: "Folders",
                name: account.getId(),
                account: account,
                onSelect: "folderChosen",
                onLoaded: "foldersLoaded",
                className: "",
                style: ""
            };

            if (inIndex === 0) {
                foldersConfigObj.className += " first";
            }

            return foldersConfigObj;
        }
    },

    getFoldersObjByIndex: function (index) {
        return this.$.accountsList.getControls()[index];
    },

    /*
     * A function with the API of Array.prototype.forEach, except that it's hardcoded to loop across the list of folders objects.
     */
    forEachFoldersObject: function (callbackFn, thisArg) {
        var foldersObjs = this.$.accountsList.getControls();
        foldersObjs.forEach(function (foldersObj, index, objBeingTraversed) {
            callbackFn.call(thisArg, foldersObj, index, objBeingTraversed);
        }, thisArg);
    },

    folderChosen: function (inSender, inFolder) {
        this.setSelectedAccount(inSender.getAccount());
        this.selectFolder(inFolder._id, inSender);
        this.doSelectFolder(inFolder);
    },

    foldersLoaded: function (inSender, inFolder) {
        this.doFoldersLoaded();
    },

    selectFolder: function (folderId, preferredFolders) {
        // If we don't have a preferred folders list, see if one already has this folder selected and prefer it.
        if (!preferredFolders) {
            this.forEachFoldersObject(function (foldersObj) {
                if (foldersObj.getSelectedId() === folderId) {
                    preferredFolders = foldersObj;
                }
            });
        }
        this.selectedFolder = folderId;

        // If we have a preferred folders object, then select that one and clear the rest.
        // For non-preferred folders components, select the first instance of the folder.
        // This prevents duplicate folders from both being highlighted (inbox in favorites and account)
        // while also letting the us select the 1st instance across all folders when launched via dashboard or something.
        if (preferredFolders && preferredFolders.select(folderId)) {
            folderId = undefined;
        }

        this.forEachFoldersObject(function (foldersObj) {
            if (foldersObj !== preferredFolders && foldersObj.select(folderId)) {
                folderId = undefined;
            }
        });
    },

    searchHandler: function (inSender, inSearchString) {
        //iterate across each of the folders objects and call setSearch() on it
        this.forEachFoldersObject(function (foldersObj) {
            foldersObj.setSearchString(inSearchString);
        });

        return true;
    },

    selectedAccountChanged: function () {
        // NOTE: selected account should always be a real account, favorites is a fake one
        this.selectedAccount = this.selectedAccount && ((!this.selectedAccount.isFavoritesAccount) ? this.selectedAccount : this.defaultAccount);
    },

    showHideHeader: function (inShow) {
        this.$.header.visible = inShow;
        this.$.header.applyStyle("display", inShow ? "block" : "none");
    },

    scrollerScroll: function (inSender, inScrollTop) {
        if (this.$.scroller.hasNode().scrollTop < 1) {
            this.showHideHeader(false);
        } else if (!this.$.header.visible) {
            this.showHideHeader(true);
        }
    },
    prefsChanged: function (key, value) {
        if (key === "defaultAccountId") {
            this.defaultAccount = enyo.application.accounts.getDefaultAccount();
        }
    }
});
