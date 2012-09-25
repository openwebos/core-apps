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
 *
 * Used for default folder selection
 *
 */
enyo.kind({
    name: "FolderListPopup",
    kind: "enyo.PopupList",
    create: function () {
        this.inherited(arguments);
    },
    loadFolders: function (accountId) {
        if (this.lastLoaded === accountId) {
            return;
        }
        this.lastLoaded = accountId;
        Folder.loadIndentedFolderItems(accountId, this, undefined, true);
    }
});

/*
 * Fancier folder picker
 */
enyo.kind({
    name: "SelectFolderPopup",
    kind: "enyo.ModalDialog",

    published: {
        folders: null,
        iconStyle: "none", // "none", "generic", "full"
        allowNone: false, // add a "None" option to the start of the list
        showSearch: false, // display filter search box
        keepScroll: false // if true, preserve scroll position
    },

    statics: {
        kNoneId: "-no-folder"
    },

    events: {
        onSelect: ""
    },

    components: [
        {layoutKind: "VFlexLayout", components: [
            {name: "searchBox", className: "enyo-box-input", kind: "SearchInput", hint: $L("Search"), onSearch: "filterFolders", changeOnInput: true, changeOnEnterKey: true, onchange: "filterFolders", showing: false},
            {kind: "enyo.Group", components: [
                {name: "list", kind: "VirtualList", onSetupRow: "setupRow", height: "280px", components: [
                    {name: "folderItem", kind: "Item", layoutKind: "HFlexLayout", tapHighlight: true, align: "center", onclick: "itemClick", components: [
                        {name: "folderIcon", kind: "Image", src: "../images/folder-single-open.png", showing: false},
                        {name: "folderName", content: ""}
                    ]}
                ]},
            ]},
            {name: "cancelButton", kind: "Button", caption: $L("Cancel"), onclick: "cancelClick"}
        ]}
    ],

    create: function () {
        this.inherited(arguments);

        if (!this.folders) {
            this.folders = [];
        }

    },

    componentsReady: function () {
        this.inherited(arguments);

        this.foldersChanged();
    },

    loadFolders: function (accountId) {
        this.log("loading folder list for account " + accountId);

        if (this.lastAccountId !== accountId && this.$.list) {
            // reset scroll
            this.$.list.punt();
        }

        this.lastAccountId = accountId;

        this.folders = []; // make sure we don't use an old list by mistake

        Folder.getAccountFolderList(accountId, undefined, enyo.hitch(this, "handleFolderListResponse"));
    },

    handleFolderListResponse: function (response) {
        if (response.results) {
            var folders = response.results;
            this.setFolders(folders);
        }
    },

    setFolders: function (folders) {
        var filterString = this.showSearch ? this.$.searchBox.getValue() : "";

        var account = enyo.application.accounts.getAccount(this.lastAccountId);

        this.folders = folders.filter(function (folder) {
            if (filterString && !Folder.filterFolderName(filterString, folder)) {
                return false;
            }

            // Skip outbox
            if (account && account.getOutboxFolderId() === folder._id) {
                return false;
            }

            return true;
        });

        if (this.allowNone) {
            // Add a "None" option
            this.folders.unshift({displayName: $L("None"), _id: SelectFolderPopup.kNoneId});
        }

        this.foldersChanged();
    },

    foldersChanged: function () {
        if (this.$.list) {
            this.$.list.refresh();

            if (!this.keepScroll) {
                this.$.list.punt(); // reset scroll
            }
        }
    },

    filterFolders: function () {
        this.loadFolders(this.lastAccountId);
    },

    open: function () {
        this.inherited(arguments);

        this.$.searchBox.setValue("");
        if (this.showSearch) {
            this.$.searchBox.show();
        } else {
            this.$.searchBox.hide();
        }
    },

    setupRow: function (inSender, index) {
        if (index >= 0 && index < this.folders.length) {
            var folder = this.folders[index];

            if (index == 0) {
                this.$.folderItem.addClass("enyo-first");
            } else if (index == this.folders.length - 1) {
                this.$.folderItem.addClass("enyo-last");
            }

            this.$.folderName.setContent(enyo.application.folderProcessor.getLocalizedFolderName(folder));

            var depth = enyo.application.folderProcessor.calculateFolderDepth(folder._id) || 0;

            if (this.iconStyle === "none") {
                this.$.folderName.addClass("indent-" + depth);
            } else {
                this.$.folderIcon.setShowing(true);

                if (this.iconStyle === "full") {
                    this.$.folderIcon.setSrc("../images/" + (enyo.application.folderProcessor.getFolderIcon(folder._id) || "folder-single-open.png"));
                }

                this.$.folderIcon.addClass("indent-" + depth);
                this.$.folderName.addStyles("margin-left: 5px");
            }

            this.$.folderItem.setDisabled(folder.selectable === false);

            return true;
        }
    },

    itemClick: function (inSender, event) {
        var index = event.rowIndex;

        if (index >= 0 && this.folders[index]) {
            var folder = this.folders[index];

            if (folder._id === FolderListPopup.kNoneId) {
                this.doSelect(null);
            } else {
                this.doSelect(folder);
            }
            this.close();
        }
    },

    cancelClick: function () {
        this.close();
    },
});
