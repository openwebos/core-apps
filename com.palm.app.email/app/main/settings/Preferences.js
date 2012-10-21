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
 * Application preferences scene.
 * TODO: Make this work with events instead of this.owner calls
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
                        caption: $L("Email Threading"),
                        components: [
                            {style: "display: inline-block; position: relative; top: 12px; height: 32px", components: [
                                { kind: "Spinner", name: "rebuildSpinner", style: "display: inline-block" }
                            ]},
                            {
                                kind: "ToggleButton",
                                name: "emailThreading",
                                state: true,
                                onChange: "toggleEmailThreading",
                                style: "display: inline-block"
                            }
                        ]
                    },
                    {
                        kind: "LabeledContainer",
                        name: "crossFolderThreadingBlock",
                        caption: $L("Thread Emails Across Folders (EXPERIMENTAL)"),
                        components: [
                            {
                                kind: "ToggleButton",
                                name: "crossFolderThreading",
                                state: false,
                                onChange: "toggleCrossFolderThreading",
                                style: "display: inline-block"
                            }
                        ]
                    },
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
                    },
                    {
                        kind: "LabeledContainer",
                        caption: $L("Hide Folder List When Viewing Email"),
                        components: [
                            {
                                kind: "ToggleButton",
                                name: "hideAccountsOnViewEmail",
                                state: false,
                                onChange: "toggleHideAccountsOnViewEmail"
                            }
                        ]
                    }
                ]
                },
                {
                    kind: "RowGroup", caption: $L("MESSAGE VIEW"), components: [
                    {
                        kind: "LabeledContainer",
                        caption: $L("Load Images From Remote Servers"),
                        components: [
                            {
                                kind: "ListSelector",
                                name: "loadRemoteContent",
                                value: AccountPreferences.LOAD_REMOTE_ALWAYS,
                                onChange: "toggleLoadRemoteContent",
                                
                                items: [
                                    {caption: $L("Always"), value: AccountPreferences.LOAD_REMOTE_ALWAYS},
                                    {caption: $L("Never"), value: AccountPreferences.LOAD_REMOTE_NEVER},
                                    {caption: $L("Ask"), value: AccountPreferences.LOAD_REMOTE_ASK}
                                ]
                            }
                        ]
                    },
                    {
                        kind: "LabeledContainer",
                        name: "threadViewOldestFirstBlock",
                        caption: $L("Show Older Emails In Thread First"),
                        components: [
                            {
                                kind: "ToggleButton",
                                name: "threadViewOldestFirst",
                                state: true,
                                onChange: "toggleThreadViewOldestFirst",
                                style: "display: inline-block"
                            }
                        ]
                    }
                ]
                },
                {kind: "RowGroup", caption: $L("COMPOSE EMAIL"), components: [
                    {
                        kind: "LabeledContainer",
                        caption: $L("Font"),
                        components: [
                            {
                                kind: "FontListSelector",
                                name: "defaultFont",
                                value: "",
                                styleProp: "font-family",
                                onChange: "changeDefaultFont",
                                
                                items: [
                                    {caption: $L("Default Font"), value: ""},
                                    {caption: $L("Default serif font"), value: "serif"},
                                    {caption: $L("Default sans-serif font"), value: "sans-serif"},
                                    {caption: $L("Default monospace font"), value: "monospace"},
                                    {caption: $L("Courier"), value: "Courier,monospace"},
                                    {caption: $L("Prelude"), value: "Prelude,Verdana,sans-serif"},
                                    {caption: $L("Times"), value: "Times,serif"},
                                    {caption: $L("Verdana"), value: "Verdana,sans-serif"}
                                ]
                            }
                        ]
                    },
                    {
                        kind: "LabeledContainer",
                        caption: $L("Font Size"),
                        components: [
                            {
                                kind: "FontListSelector",
                                name: "defaultFontSize",
                                value: "",
                                styleProp: "font-size",
                                onChange: "changeDefaultFontSize",
                                
                                items: [
                                    {caption: $L("Normal"), value: ""},
                                    {caption: $L("10 pt"), value: "10pt"},
                                    {caption: $L("12 pt"), value: "12pt"},
                                    {caption: $L("14 pt"), value: "14pt"},
                                    {caption: $L("16 pt"), value: "16pt"}
                                ]
                            }
                        ]
                    },
                    {
                        kind: "LabeledContainer",
                        caption: $L("Reply Header Style"),
                        components: [
                            {
                                kind: "ListSelector",
                                name: "replyStyle",
                                value: "",
                                onChange: "changeReplyStyle",
                                
                                items: [
                                    {caption: $L("Brief"), value: AccountPreferences.REPLY_STYLE_BRIEF},
                                    {caption: $L("Include Headers"), value: AccountPreferences.REPLY_STYLE_HEADERS}
                                ]
                            }
                        ]
                    }
                ]},
                { kind: "RowGroup", caption: $L("DEFAULT ACCOUNT"), name: "defAccountGroup", components: [
                    {name: "defaultAccountList", kind: "ListSelector", value: 0, onChange: "defaultAccountChange"}
                ]},
                {className: "enyo-paragraph enyo-subtext preferences-info-text", content: $L("New emails created in the \"All Inboxes\" view will default to this account.")}
            ]}
        ]},
        {className: "accounts-footer-shadow"},
        {kind: "Toolbar", className: "enyo-toolbar-light", components: [
            {kind: "Button", caption: $L("Done"), className: "enyo-button-dark", width: "300px", onclick: "doBack"}
        ]},
        {name: "threaderWatch", kind: "EmailApp.BroadcastSubscriber", onRebuildIndexUpdate: "rebuildIndexUpdate"},
        {kind: "EmailApp.BroadcastSubscriber", target: "enyo.application.accounts", onChange: "loadAccounts"}
    ],
    
    create: function () {
        this.inherited(arguments);

        // force a change notification to set up initial list
        this.loadAccounts();
        
        this.$.threaderWatch.subscribe(enyo.application.threader);
    },

    /** preference toggles */
    toggleConfirmDelete: function () {
        this.setPref('confirmDeleteOnSwipe', this.$.confirmDeletes.getState());
    },
    
    setRowVisible: function (control, showing) {
        var group = control.getContainer();
        var index = group.indexOfControl(control);
        
        if (!control) {
            return;
        }
        
        if (showing) {
            group.showRow(index);
        } else {
            group.hideRow(index);
        }
    },

    /**
     * Turn on/off email threading functionality
     */
    toggleEmailThreading: function () {
        var wasEnabled = EmailApp.Util.isThreadingEnabled();
        var enabled = this.$.emailThreading.getState();
    
        this.setPref('emailThreading', this.$.emailThreading.getState());
        
        this.setRowVisible(this.$.crossFolderThreadingBlock, enabled);
        this.setRowVisible(this.$.threadViewOldestFirstBlock, enabled);
        
        if (enabled && !wasEnabled) {
            // need to build thread index
            enyo.application.threader.rebuildIndex();
        } else if (!enabled && wasEnabled) {
            // need to wipe thread index
            enyo.application.threader.disableThreading();
        }
    },
    
    toggleCrossFolderThreading: function () {
        this.setPref('crossFolderThreading', this.$.crossFolderThreading.getState());
        
        enyo.application.threader.rebuildIndex();
    },
    
    /**
     * Change order that messages in a thread are diplayed
     */
    
    toggleThreadViewOldestFirst: function () {
        this.setPref('threadViewOldestFirst', this.$.threadViewOldestFirst.getState());
    },
    
    /* Change setting for hiding the account list when viewing an email */
    toggleHideAccountsOnViewEmail: function () {
        this.setPref('hideAccountsOnViewEmail', this.$.hideAccountsOnViewEmail.getState());
    },
    
    /**
     * Change setting to block remote content
     */
    toggleLoadRemoteContent: function() {
        this.setPref('loadRemoteContent', this.$.loadRemoteContent.getValue());
    },

    /**
     * Turn on/off display of 'All Inboxes' folder
     */
    toggleAllInboxes: function () {
        this.setPref('showAllInboxes', this.$.showAllInboxes.getState());
    },

    /**
     * Turn on/off display of 'All Flagged' folder
     */
    toggleAllFlagged: function () {
        this.setPref('showAllFlagged', this.$.showAllFlagged.getState());
    },
    
    changeDefaultFont: function () {
        this.setPref('defaultFont', this.$.defaultFont.getValue());
    },
    
    changeDefaultFontSize: function () {
        this.setPref('defaultFontSize', this.$.defaultFontSize.getValue());
    },
    
    changeReplyStyle: function () {
        this.setPref('replyStyle', this.$.replyStyle.getValue());
    },

    /**
     * Utility function for setting application preference values.
     */
    setPref: function (key, val) {
        enyo.application.prefs.set(key, val);
    },

    /**
     * fire a back action.
     * TODO: consolidate/remove these
     */
    doBack: function () {
        enyo.dispatchBack();
    },

    /**
     * Handler for Add Account button
     */
    addAccountClick: function () {
        this.owner.showAddAccount(this.templates);
    },

    /**
     * Handler for accountsList entry selection. Displays the config scene for
     * the selected account.
     */
    showAccountSettings: function (targetItem, res) {
        // we're dealing with raw acct information from the accounts widget
        this.owner.showAccountSetting(res.account._id); // just pass id
    },

    /**
     * Load accounts on screen, and display current application preference values
     * TODO: streamline all of this. Some redundant operations.
     */
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
        this.sortedAccounts = accts.getSortedList();
        this.$.accountsList.getAccountsList('MAIL');
        this.$.defaultAccountList.setItems(this.makeDefAccountItems(this.sortedAccounts));

        // display app preference settings
        var prefs = enyo.application.prefs;
        this.$.showAllInboxes.setState(!!prefs.get('showAllInboxes'));
        this.$.showAllFlagged.setState(!!prefs.get('showAllFlagged'));
        this.$.confirmDeletes.setState(!!prefs.get('confirmDeleteOnSwipe'));
        
        var threadingEnabled = prefs.get('emailThreading') !== false;
        
        this.$.emailThreading.setState(threadingEnabled);
        
        this.setRowVisible(this.$.crossFolderThreadingBlock, threadingEnabled);
        this.$.threadViewOldestFirst.setState(prefs.get('crossFolderThreading') || false);
        
        // Message view options
        this.setRowVisible(this.$.threadViewOldestFirstBlock, threadingEnabled);
        this.$.threadViewOldestFirst.setState(prefs.get('threadViewOldestFirst') || false);
        
        this.$.hideAccountsOnViewEmail.setState(prefs.get('hideAccountsOnViewEmail') || false);
        this.$.loadRemoteContent.setValue(prefs.get('loadRemoteContent') || AccountPreferences.LOAD_REMOTE_ALWAYS);
        
        // Compose options
        this.$.defaultFont.setValue(prefs.get('defaultFont') || "");
        this.$.defaultFontSize.setValue(prefs.get('defaultFontSize') || "");
        this.$.replyStyle.setValue(prefs.get('replyStyle') || AccountPreferences.REPLY_STYLE_BRIEF);
        
        var defAccountId = enyo.application.accounts.getDefaultAccountId();
        this.$.defaultAccountList.setValue(defAccountId);
    },

    /**
     * Handler for AccountsList load completion.
     */
    onAccountsAvailable: function (sender, resp) {
        this.filteredAccounts = resp.accounts;    // Accounts are returned as an array. Not doing anything with this yet
        this.templates = resp.templates; // The list of account templates that can be added
    },
    
    rebuildIndexUpdate: function () {
        console.log("rebuild state changed");
        this.$.rebuildSpinner.setShowing(enyo.application.threader.isRebuilding());
    },

    /**
     * Wrapper for accounts getIconById method
     */
    getIconPath: function (acctId) {
        return enyo.application.accounts.getIconById(acctId, false);
    },

    /**
     * Create a list of account choices for the default account dropdown.
     * Returns array of JSON objects for display in list.
     */
    makeDefAccountItems: function (accounts) {
        var defItems = [], a, i = 0, len = accounts.length;

        for (; i < len; ++i) {
            a = accounts[i];
            defItems.push({caption: a.getAlias(), value: i + 1, icon: this.getIconPath(a.getId()), accountId: a.getId()});
        }
        return defItems;
    },

    /**
     * Handler for default account selection changes.
     */
    defaultAccountChange: function (defaultAccountList) {
        var target = defaultAccountList.items[defaultAccountList.value - 1];
        // not dealing with an account here. Dealing with dropdown json from makeDefAccountItems
        enyo.application.prefs.set('defaultAccountId', target.accountId);
    }
});

enyo.kind({
    name: "FontListSelector",
    kind: "enyo.ListSelector",
    
    styleProp: "font-family",
    
    popupSetupItem: function(inSender, inItem, inRowIndex, inRowItem) {
        this.inherited(arguments);
        
        // FIXME private
        inItem.$.item.applyStyle(this.styleProp, inRowItem.value || "");
    }
});
