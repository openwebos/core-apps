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
 * Main Account Settings scene. Controls display of application settings,
 * accounts preferences, creation, and credentials-editing scenes.
 * TODO: Make this work with events.
 */
enyo.kind({
    name: "MasterSettings",
    width: "100%",
    kind: enyo.VFlexBox,
    className: "basic-back",
    events: {
        onPreferenceChanged: ""
    },
    components: [
        {name: "settingPane", kind: "Pane", flex: 1, components: [
            {kind: "Preferences", name: "preferences"},
            {kind: "AccountSettings", name: "accountSettings"},
            {kind: "CRUDAccounts", name: "crudAccounts"},
            {kind: "AccountsUI", name: "addAccountView", capability: "MAIL", onAccountsUI_Done: "showPreferences"}
        ]
        }
    ],
    create: function () {
        this.inherited(arguments);
    },
    /**
     * Fire a back-action
     * TODO: Consolidate these
     */
    doBack: function () {
        enyo.dispatchBack();
    },

    /**
     * Display the application preferences scene
     */
    showPreferences: function () {
        this.$.preferences.loadAccounts(); // leave this in for now
        this.$.settingPane.selectView(this.$.preferences);
    },

    /**
     * Display the account settings scene
     * @param {String} accountId -- _id for com.palm.account to display
     */
    showAccountSetting: function (accountId) {
        this.$.accountSettings.loadAccount(accountId);
        this.$.settingPane.selectView(this.$.accountSettings);
    },

    /**
     * Display the add-account scene, using the Accounts UI library.
     */
    showAddAccount: function (filteredTemplates) {
        // in case the user calls this before we can get a filtered list of templates from accounts ui,
        // use the list we've cached
        filteredTemplates = filteredTemplates || enyo.application.accounts.
            templateList.filter(function (elem) {
            return !elem.hidden;
        });
        this.$.addAccountView.AddAccount(filteredTemplates);
        this.$.settingPane.selectView(this.$.addAccountView);
    },

    /**
     * Display the account modification scenes for an existing account.
     */
    showEditMode: function (accountId) {
        var accts = enyo.application.accounts;
        this.$.crudAccounts.loadAccount(accts.getAccount(accountId));
        this.$.settingPane.selectView(this.$.crudAccounts);
    },

    /**
     * quick check to see if a branded template is being edited.
     * Branded templates show up as unique mail account types on account creation,
     * even though they may rely on a standard transport
     * Examples include Google and Yahoo, which use IMAP, but have their own templates
     * @param {Object} toEdit
     */
    _isBrandedEdit: function (toEdit) {
        // written funky for JSLINT
        var verdict = true;
        switch (toEdit.templateId) {
        case "com.palm.eas":
        case "com.palm.imap":
        case "com.palm.pop":
            verdict = false;
            break;
        default:
            // already true
            break;
        }
        return verdict;
    },

    /**
     * Display the manual config scene, for editing of hostname params, etc.
     */
    showManualConfig: function () {
        this.$.crudAccounts.loadAccount(this.toEdit);
        this.$.settingPane.selectView(this.$.manualConfig);
    }
});

