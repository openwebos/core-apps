// LICENSE@@@
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
// @@@LICENSE

/*jslint white: true, onevar: true, undef: true, eqeqeq: true, plusplus: true, bitwise: true,
 regexp: true, newcap: true, immed: true, nomen: false, maxerr: 500 */
/*global Foundations, PalmCall, Future, _, ContactsLib, document, enyo, console, AppPrefs, $L, AccountsList, DefaultAccountId:true */

enyo.kind({
    name                       : "Prefs",
    kind                       : "VFlexBox",
    className                  : "enyo-bg enyo-fit",
    events                     : {
        onDone       : "",
        onEditAccount: "",
        onAddAccount : ""
    },
    published                  : {
        appPrefs: null
    },
    components                 : [
        {kind: "PageHeader", pack: "center", components: [
            {kind: "Image", src: "images/header-icon-contacts.png"},
            {content: $L("Contacts"), style: "text-overflow: ellipsis; overflow: hidden; white-space: nowrap; padding-left: 10px"}
        ]},
        {kind: "Scroller", flex: 1, name: "prefsAndAccounts", components: [
            {className: "box-center contacts-preferences", name: "synergyAccounts", components: [
                {kind: "RowGroup", caption: $L("List Order"), components: [
                    {kind: "ListSelector", name: "sortOrder", onChange: "itemChanged", items: []}
                ]},
                {kind: "RowGroup", caption: $L("Default account"), components: [
                    {kind: "ListSelector", name: "defaultAccountSelector", onChange: "setDefaultAccount", items: []}
                ]},
                {content: $L("New contacts will default to this account"), className: "footnote"},
                {kind: "RowGroup", caption: $L("Accounts"), components: [
                    {className: "box accounts-list-button", components: [
                        {kind: "Accounts.accountsList", name: "accountsList", onAccountsList_AccountSelected: "editAccount"}
                    ]}
                ]},
                {kind: "Control", layoutKind: "HFlexLayout", components: [
                    {kind: "Button", flex: 1, name: "addAccountButton", content: $L("Add an account"), style: "margin-right: 1.2em", onclick: "addAccount"},
                    {kind: "Button", flex: 1, name: "syncNowButton", content: $L("Sync Now"), onclick: "onSyncNow"}
                ]}
            ]}
        ]},
        {name: "toolbar", kind: "Toolbar", className: "enyo-toolbar-light", showing: true, pack: "center", components: [
            {name: "doneButton", kind: "Button", caption: $L("Done"), className: "enyo-button-dark", onclick: "onDoneClicked", width: "18.75em"}
        ]}
    ],
    create                     : function () {
        this.inherited(arguments);
    },
    ready                      : function () {
        this.$.accountsList.getAccountsList("CONTACTS", []);
    },
    setupGlobals               : function (accountsList, appPrefs) {
        this.accountsList = accountsList;
        if (this.defaultAccountsListCallbackBound === undefined) {
            this.defaultAccountsListCallbackBound = this.defaultAccountsListCallback.bind(this);
            this.accountsList.addDefaultAccountsListener(this.defaultAccountsListCallbackBound);
        }
        this.appPrefs = appPrefs;

        this.updateDefaultAccountList();
        this.appPrefsChanged();
    },
    defaultAccountsListCallback: function (newDefaultAccountsList, oldDefaultAccountsList) {
        this.updateDefaultAccountList();
    },
    updateDefaultAccountList   : function () {
        if (!this.accountsList) {
            return;
        }

        var defaultAccountsList = this.accountsList.getDefaultAccountsDisplayList(),
            items = [],
            i,
            palmProfileAccts,
            defaultAccountId = this.appPrefs._prefs.defaultAccountId || null;
        for (i = 0; i < defaultAccountsList.length; i += 1) {
            items.push({caption: defaultAccountsList[i].label, value: defaultAccountsList[i].command, icon: defaultAccountsList[i].secondaryIconPath});
        }
        this.$.defaultAccountSelector.setItems(items);

        if (!defaultAccountId) {
            defaultAccountId = AccountsList.getAccountsByTemplateId("com.palm.palmprofile");
        }

        this.$.defaultAccountSelector.setValue(defaultAccountId);
        if (this.$.defaultAccountSelector.getValue() !== defaultAccountId) { // This is true when the account/capability is no longer available, therefore fallback to the palm profile
            palmProfileAccts = AccountsList.getAccountsByTemplateId("com.palm.palmprofile");
            if (palmProfileAccts && palmProfileAccts.length === 1) {
                this.setDefaultAccount(undefined, palmProfileAccts[0]._id, undefined);
                this.$.defaultAccountSelector.setValue(DefaultAccountId); // It is safe to use DefaultAccountId since it is set from the call to setDefaultAccount in the line above
            }
        }
        this.$.defaultAccountSelector.itemsChanged(); // For some reason this call in necessary otherwise there are cases where multiple items are checked
        this.$.defaultAccountSelector.render();
    },
    setDefaultAccount          : function (inSender, inValue, inOldValue) {
        AppPrefs.set(ContactsLib.AppPrefs.Pref.defaultAccountId, inValue);
        DefaultAccountId = inValue;
    },
    appPrefsChanged            : function () {
        var items =
            [
                { caption: $L("First name"), value: ContactsLib.ListWidget.SortOrder.firstLast },
                { caption: $L("Last name"), value: ContactsLib.ListWidget.SortOrder.lastFirst },
                { caption: $L("Company & first name"), value: ContactsLib.ListWidget.SortOrder.companyFirstLast },
                { caption: $L("Company & last name"), value: ContactsLib.ListWidget.SortOrder.companyLastFirst }
            ];

        this.$.sortOrder.setItems(items);
        this.$.sortOrder.setValue(this.appPrefs.get(ContactsLib.AppPrefs.Pref.listSortOrder));
    },
    itemChanged                : function (inSender, inValue, inOldValue) {
        this.appPrefs.set(ContactsLib.AppPrefs.Pref.listSortOrder, inValue);
    },
    onDoneClicked              : function () {
        this.accountsList.removeDefaultAccountsListener(this.defaultAccountsListCallbackBound);
        this.defaultAccountsListCallbackBound = undefined;
        this.doDone();
    },
    onSyncNow                  : function () {
        var that = this,
            future;
        enyo.windows.addBannerMessage($L("Syncing Accounts..."), "{}");

        future = Foundations.Control.mapReduce({
            map: function (account) {
                //get the contacts capability
                var capabilityProvider = ContactsLib.Utils.getContactsCapabilityProvider(account),
                    future;

                //ping the sync method on this capability
                if (capabilityProvider && capabilityProvider.sync) {
                    future = new Future();

                    future.now(this, function () {
                        return PalmCall.call("palm://com.palm.activitymanager/", "create", {
                            activity: {
                                type       : {
                                    explicit     : true,
                                    userInitiated: true,
                                    background   : true
                                    //foreground: true
                                },
                                name       : "'Sync Now' sync for " + account.templateId + ", account " + account._id,
                                description: "Background sync for account " + account._id + " from 'sync now' button",
                                callback   : {
                                    method: capabilityProvider.sync,
                                    params: {
                                        "accountId": account._id
                                    }
                                }
                            },
                            start   : true
                        });
                    });

                    future.then(this, function () {
                        try {
                            var result = future.result;
                        } catch (ex) {
                            enyo.log("Ignoring exception during background sync setup for sync now button: " + ContactsLib.Utils.stringify(ex));
                        }

                        return true;
                    });

                    return future;
                } else {
                    return new Future(true);
                }
            }
        }, AccountsList.getAccountsList());
    },
    editAccount                : function (inSender, inResults) {
        if (inResults && inResults.account) {
            this.doEditAccount(inResults, inResults.account.templateId === "com.palm.palmprofile");
        }
    },
    addAccount                 : function () {
        this.doAddAccount();
    }
});
