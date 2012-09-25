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

/**
 * Application preferences scene
 */
enyo.kind({
    name: "Preferences",
    width: "100%",
    kind: "VFlexBox",
    className: "enyo-bg",
    events: {
        onPreferenceChanged: ""
    },
    components: [
        {
            name: "header",
            kind: "Toolbar",
            pack: "center",
            className: "enyo-toolbar-light accounts-header",
            components: [
                {
                    kind: "Image",
                    src: "../images/icon-48.png",
                    className: "headerImage"
                },
                {
                    kind: "Control",
                    name: "headerLabel",
                    className: "header-welcome-text vertical-center",
                    content: $L("Preferences & Accounts")
                }
            ]
        },
        {className: "accounts-header-shadow"},
        {kind: "Scroller", flex: 1, components: [
            {kind: "VFlexBox", className: "box-center", components: [
                {
                    kind: "RowGroup",
                    caption: $L("SMART FOLDERS"),
                    components: [
                        {
                            kind: "LabeledContainer",
                            caption: $L("All Inboxes"),
                            components: [
                                {
                                    kind: "ToggleButton",
                                    name: "showAllInboxes",
                                    state: true,
                                    onChange: "toggleAllInboxes"
                                }
                            ]
                        },
                        {
                            kind: "LabeledContainer",
                            caption: $L("All Flagged"),
                            components: [
                                {
                                    kind: "ToggleButton",
                                    name: "showAllFlagged",
                                    state: true,
                                    onChange: "toggleAllFlagged"
                                }
                            ]
                        }
                    ]
                },
                { className: "enyo-paragraph enyo-subtext preferences-info-text", content: $L("The above folders can be added to  your list of Favorites.") },
                {
                    kind: "RowGroup", caption: $L("MESSAGE LIST"), components: [
                    {
                        kind: "LabeledContainer",
                        caption: $L("Delete Confirmation"),
                        components: [
                            {
                                kind: "ToggleButton",
                                name: "confirmDeletes",
                                state: true,
                                onChange: "toggleConfirmDelete"
                            }
                        ]
                    }
                ]
                },
                {
                    kind: "RowGroup",
                    caption: $L("ACCOUNTS"),
                    name: "accountsGroup",
                    components: [
                        {
                            kind: "Accounts.accountsList",
                            name: "accountsList",
                            onAccountsList_AddAccountTemplates: "onAccountsAvailable",
                            onAccountsList_AccountSelected: "showAccountSettings"
                        }
                    ]
                },
                { kind: "ActivityButton", caption: $L("Add Account"), onclick: "addAccountClick", className: "enyo-button-light"},
                {
                    kind: "RowGroup", caption: $L("DEFAULT ACCOUNT"), name: "defAccountGroup", components: [
                    {name: "selList", kind: "ListSelector", value: 0, onChange: "defaultAccountChange"}
                ]
                },
                {className: "enyo-paragraph enyo-subtext preferences-info-text", content: $L("New emails created in the \"All Inboxes\" view will default to this account.")},
            ]}
        ]},
        {className: "accounts-footer-shadow"},
        {kind: "Toolbar", className: "enyo-toolbar-light", components: [
            {kind: "Button", caption: $L("Done"), className: "enyo-button-dark", width: "300px", onclick: "doBack"}
        ]}
    ],
    create: function () {
        this.inherited(arguments);
        // Make sure we're notified when accounts change.
        this.loadAccounts = this.loadAccounts.bind(this);
        enyo.application.accounts.addListener(this.loadAccounts);
        this.loadAccounts(); // force a change notification to set up initial list
    },
    destroy: function () {
        enyo.application.accounts.removeListener(this.loadAccounts);
        this.inherited(arguments);
    },
    toggleConfirmDelete: function () {
        this.setPref('confirmDeleteOnSwipe', this.$.confirmDeletes.getState());
    },

    toggleAllInboxes: function () {
        this.setPref('showAllInboxes', this.$.showAllInboxes.getState());
    },

    toggleAllFlagged: function () {
        this.setPref('showAllFlagged', this.$.showAllFlagged.getState());
    },

    setPref: function (key, val) {
        enyo.application.prefs.set(key, val);
    },

    doBack: function () {
        enyo.dispatchBack();
    },

    addAccountClick: function () {
        this.owner.showAddAccount(this.templates);
        //this.owner.showAccountWizard();
    },

    showAccountSettings: function (targetItem, res) {
        // we're dealing with raw acct information from the accounts widget
        this.owner.showAccountSetting(res.account._id); // just pass id
    },

    loadAccounts: function () {
        var accts = enyo.application.accounts;
        if (!accts) {
            return;
        }

        var hasAccounts = !!accts.hasAccounts();
        this.$.accountsGroup.setShowing(hasAccounts);
        this.$.defAccountGroup.setShowing(hasAccounts);

        if (!hasAccounts) {
            return;
        }

        this.defaultAccount = accts.getDefaultAccount();
        //this.setSelectedAccount(this.defaultAccount);
        this.sortedAccounts = accts.getSortedList();
        this.$.accountsList.getAccountsList('MAIL');
        this.$.selList.setItems(this.makeDefAccountItems(this.sortedAccounts));

        // update account settings
        var prefs = enyo.application.prefs;
        this.$.showAllInboxes.setState(!!prefs.get('showAllInboxes'));
        this.$.showAllFlagged.setState(!!prefs.get('showAllFlagged'));
        this.$.confirmDeletes.setState(!!prefs.get('confirmDeleteOnSwipe'));
        var accountId = prefs.get("defaultAccountId");
        var items = this.$.selList.items;
        var i;
        if (accountId) {
            for (i = 0; i < items.length; i++) {
                if (items[i].accountId === accountId) {
                    this.$.selList.setValue(items[i].value);
                    break;
                }
            }
        }
    },

    onAccountsAvailable: function (sender, resp) {
        console.log("### accounts are available");
        this.filteredAccounts = resp.accounts;    // Accounts are returned as an array. Not doing anything with this yet
        this.templates = resp.templates; // The list of account templates that can be added
    },
    getAccountItem: function (inSender, inIndex) {
        var a = this.sortedAccounts[inIndex];
        if (!a) {
            return false;
        }

        this.$.itemName.setContent(a.getAlias());
        this.$.itemImage.setSrc(this.getIconPath(a.getId()));
        this.$.address.setContent(a.getEmailAddress());

        return true;
    },
    getDefAccountItem: function (inSender, inData, inIndex) {
        var a = inData;// this.sortedAccounts[inIndex];
        this.$.defItemName.setContent(a.getAlias());
        this.$.defAddress.setContent(a.getEmailAddress());
    },
    getIconPath: function (acctId) {
        return enyo.application.accounts.getIconById(acctId, false);
    },
    makeDefAccountItems: function (accounts) {
        var defItems = [], a = undefined, i = 0, len = accounts.length;

        for (; i < len; ++i) {
            a = accounts[i];
            defItems.push({caption: a.getAlias(), value: i + 1, icon: this.getIconPath(a.getId()), accountId: a.getId()});
        }
        return defItems;
    },
    defaultAccountChange: function (selList) {
        var target = selList.items[selList.value - 1];
        // not dealing with an account here. Dealing with dropdown json from makeDefAccountItems
        enyo.application.prefs.set('defaultAccountId', target.accountId);
    }
});
