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

// A simple class to encapsulate the global accounts list for the email app.
// Extends the accounts.ui library support by adding an account ID lookup table, a facility for "change listeners", and coordinated functionality for com.palm.mail.account objects.
// onReady function will be called after the accounts list has been loaded.
EmailApp.AccountList = function (onReady) {
    // Private Variables
    var _list = [];
    var _ids = {};	// hash of accounts by accountId
    var _mailAccounts = {}; // hash of com.palm.mail.account by accountId (that's mailAcct.accountId NOT mailAcct._id).
    var _mailAccountsAutoFinder = null;
    var _accountsAutoFinder = null;
    var _combinedAccounts = {};
    var _gotAccounts = false;
    var _gotMailAccounts = false;
    var __acctsServiceCall = null;
    var that = this;


    var forceLogic = arguments.length > 1 && arguments[1] === 'klaatu barada nikto';
    console.log("#$@%@#% force logic? " + forceLogic);

    // Public variables
    var accountTemplates = this.accountTemplates = {}; // hash of template ids to templates
    var getTemplateMailProvider = this.getTemplateMailProvider;

    this.templateList = []; // raw list of templates
    this.sendErrors = {};

    // We used to create an autofinder for mail accounts here too, but now we defer this until the list of regular accounts comes in.
    setupTemplateList();

    EmailApp.Util.mixInBroadcaster(this, "EmailApp.AccountList");

    // On desktop, fake some data & call through.
    if (!EmailApp.Util.hasServiceCallbacks() && !forceLogic) {
        console.log("#@#$@ USING DUMMY ACCOUNTS");
        _accountsChanged([
            {_id: "fake-account-1", alias: "Palm", username: "fakeuser@fakedomain.com", accountId: "fake-account-1"},
            {_id: "fake-account-2", alias: "Palm 2", username: "otherfakeuser@fakedomain.com", accountId: "fake-account-2"}
        ]);

        // since we're not faking the call to mailAccountsChanged, we need to call onReady.
        window.setTimeout(onReady, 0);
    }


    ///////////////////////////
    // Public getters
    ///////////////////////////

    /*
     * Return an array of CombinedAccount entries
     * TODO: Revise with rest of refactor.
     */
    this.getAccounts = function () {
        var toRet = [], ca = _combinedAccounts;
        Object.keys(ca).forEach(function (key) {
            var acct = ca[key];
            if (acct && _ids[acct.getId()] && acct.isLoaded()) {
                toRet.push(acct);
            }
        });
        return toRet;
    },

        this.getAccount = function (accountId) {
            return _combinedAccounts[accountId]; // can be undefined
        };

    this.getDefaultAccount = function () {
        return this.getAccount(this.getDefaultAccountId());
    };

    this.hasAccounts = function () {
        return !!_list.length;
    };

    this._accountsChanged = _accountsChanged;
    this._mailAccountsChanged = _mailAccountsChanged;


    /*
     * Retrieve the current default account. If a previously configured default account
     * has been deleted, will set the first account to the default. If no accounts exist,
     * will return undefined.
     */
    this.getDefaultAccountId = function () {
        if (!this.hasAccounts()) {
            return undefined; // no accounts
        }

        var prefs = enyo.application.prefs;
        var defAcctId = prefs && prefs.get('defaultAccountId');

        // todo  : remove hack
        if (!prefs) {
            return undefined;
        }

        var acct = _ids[defAcctId];
        var altFound = false;

        // if stored default account no longer exists, or is in the middle of being deleted, set to first account
        if (!acct || acct.beingDeleted) {
            for (var i = 0, len = _list.length; i < len; ++i) {
                acct = _list[i];
                if (acct._id !== defAcctId && !acct.beingDeleted) {
                    defAcctId = acct._id;
                    altFound = true;
                    break;
                }
            }
            if (altFound) {
                prefs.set('defaultAccountId', defAcctId);
            } else {
                defAcctId = undefined;
            }
        }
        return defAcctId;
    };

    ////////////////////////////////////////////////
    // Object instantiation is effectively Done here
    ////////////////////////////////////////////////

    ///////////////////////////
    // Private Functions follow
    ///////////////////////////
    /**
     * Set up a watch on com.palm.account entries. Any existing watch will be cancelled and overridden with the new watch.
     */
    function refresh() {
        if (!EmailApp.Util.hasServiceCallbacks() && !forceLogic) {
            return;
        }
        if (_accountsAutoFinder) {
            _accountsAutoFinder.cancel();
        }

        _accountsAutoFinder = new EmailApp.Util.MojoDBAutoFinder({
            from: "com.palm.account:1",
            where: [
                {
                    prop: "capabilityProviders.capability",
                    op: "=",
                    val: "MAIL"
                },
                {
                    prop: "beingDeleted",
                    op: "=",
                    val: false
                }
            ]
        }, _accountsChanged);

    }


    /**
     * Handler for account watches. Fires for any changes to com.palm.account entries.
     * Accepts the full account list.
     * @param {Object} accounts
     */
    function _accountsChanged(accounts) {
        console.log("received updated list of accounts");
        // Wait until first set of accounts is loaded before we load the mail accounts.
        // This yields consistent ordering at app startup time, and ensures that if there's
        // an account error to display in the mail account object, then we have the
        // appropriate account info to show it properly.
        if (!_mailAccountsAutoFinder) {
            _mailAccountsAutoFinder = new EmailApp.Util.MojoDBAutoFinder({
                from: 'com.palm.mail.account:1'
            }, _mailAccountsChanged);
        }
        var oldIds = Object.keys(_ids);

        try {
            var i, account, id;

            _list = accounts;
            console.log("EmailApp._accountsChanged: " + accounts.length + " accounts.");

            // Build the new ids hash.
            _ids = {};
            for (i = 0; i < accounts.length; i++) {
                account = accounts[i];
                id = account._id;

                _ids[id] = account;
                // pull the existing account, or mock up a default for this
                _mailAccounts[id] = _mailAccounts[id] ||
                    _processMailAccount({
                        accountId: id
                    }); // Make sure the mailAccounts hash at least has an empty object for this account.
                var ca = _combinedAccounts[id] = (_combinedAccounts[id] || new CombinedAccount());
                ca.setAccountData(account).setPrefsData(_mailAccounts[id]);
            }

            // Notify listeners that accounts have changed.
            that.broadcast();

            _maybeCallOnReady(true, false);
        } catch (e) {
            console.log("Error updating accounts list");
            console.log("Stack Trace" + e.stack);
        }
        _cleanupOldAccounts(oldIds);
    }


    /**
     * Method to clean up old mail account entries when accounts have been deleted
     * @param {Array} oldIds list of old id strings
     */
    function _cleanupOldAccounts(oldIds) {
        if (!oldIds || !oldIds.forEach) {
            return;
        }

        var currIds = _ids, accts = _combinedAccounts;
        oldIds.forEach(function (id) {
            // if the account is no longer in the current hash, release it
            if (!currIds[id]) {
                accts[id] = undefined;
                delete accts[id];
            }
        });
    }


    // Called when one or more of the mail account objects changes.
    // We rebuild the this._mailAccounts hash, and broadcast an account change to update the UI.
    function _mailAccountsChanged(mailAccountsList) {
        var mailAccounts;
        var i, accountId;

        // Rebuild the hash of regularAccountId -> mailAccount
        mailAccounts = {};
        mailAccountsList.forEach(function (mailAcct) {
            var id = mailAcct.accountId;
            mailAccounts[id] = _processMailAccount(mailAcct);
            var ca = _combinedAccounts[id] = (_combinedAccounts[id] || new CombinedAccount());
            ca.setPrefsData(_processMailAccount(mailAcct));
        });

        // Copy any old mailAccount objects for which we still have an account object.
        // This is key to maintaining the invariant that the mailAccounts hash should always include at least a "fake" object for each account object in our array.
        for (i = 0; i < _list.length; i++) {
            accountId = _list[i]._id;
            if (!mailAccounts[accountId]) {
                mailAccounts[accountId] = _mailAccounts[accountId];
            }
        }

        _mailAccounts = mailAccounts;

        // Notify listeners that accounts have changed, since a change to a mailAccount may also result in needing to refresh the UI
        // (for example, when the mailAccount object is added and gets the xxxFolderId properties set, etc.)
        that.broadcast();

        _maybeCallOnReady(false, true);
    }

    // Tracks whether we have received both sets of account data (com.palm.account, com.palm.mail.account), and calls onReady() if so.
    // onReady is set to undefined after it's called, so we'll only call it once.
    function _maybeCallOnReady(gotAccounts, gotMailAccounts) {

        if (!onReady) {
            return;
        }

        _gotAccounts = _gotAccounts || gotAccounts;
        _gotMailAccounts = _gotMailAccounts || gotMailAccounts;

        if (_gotAccounts && _gotMailAccounts) {
            onReady();
            onReady = undefined;
        }
    }

    ;

    // Adds default properties for mail accounts, in the case that they are undefined.
    // Watches for new errors, and notifies the user when appropriate.
    function _processMailAccount(mailAccount) {
        var prop,
            defaults = that.DEFAULT_MAIL_ACCOUNT;

        _hookupTemplateDefaults(mailAccount);
        Object.keys(defaults).forEach(function (prop) {
            if (mailAccount[prop] === undefined) {
                mailAccount[prop] = defaults[prop];
            }
        });

        return mailAccount;
    }

    /**
     * Stubs in default suncFrequency value for a provided mail account. Fn will only
     * update an object if the syncFrequency is not currently defined.
     * @param {Object} mailAccount -- com.palm.mail.account entry to fix up
     */
    function _hookupTemplateDefaults(mailAccount) {
        var acct = _ids[mailAccount.accountId];
        if (!acct) {
            // Mail capability has been disabled. We don't have a record of the com.palm.account at this moment
            // This is a weak fix, but the best we can do for the current timeframe.
            // Note that this may also occur if the mail account for this real account simply hasn't been loaded yet.
            // TODO: Make moar awesome
            return mailAccount;
        }
        var templateId = acct.templateId;
        var template = accountTemplates[templateId];
        var provider = getTemplateMailProvider(template);
        // Override default for pop and gmail accounts.
        if (mailAccount.syncFrequencyMins === undefined) {
            if (provider && provider.config && provider.config.syncFrequencyMins !== undefined) {
                mailAccount.syncFrequencyMins = provider.config.syncFrequencyMins;
            } else if (templateId === "com.palm.pop") {
                mailAccount.syncFrequencyMins = 15;
            }
        }
        return mailAccount;
    }


    /**
     * Pulls account templates, then establishes a watch on accounts via the 'refresh' method.
     */
    function setupTemplateList() {
        // load the templates, then load the accounts
        // working around missing accounts ui functionality at the moment
        __acctsServiceCall = EmailApp.Util.callService("palm://com.palm.service.accounts/listAccountTemplates", {
            capability: "MAIL"
        }, function (resp) {

            if (!resp.results.length) {
                console.log("### oh my. We don't have any templates");
                return;
            }
            that.templateList = resp.results;
            resp.results.forEach(function (elem) {
                if (!that.accountTemplates[elem.templateId]) {
                    that.accountTemplates[elem.templateId] = elem;
                }
            });
            __acctsServiceCall = undefined;
            // now load the accounts
            refresh();
        });
    }
};


// Anything that doesn't direcly interact with the private variables
// should go here.
EmailApp.AccountList.prototype = {

    /**
     * Retrieve an account icon uri for a given template id
     * @param {String} templateId -- account template id
     * @param {Boolean} big -- true for a large icon, false for small.
     */
    getMailIconFromTemplateId: function (templateId, big) {
        // TODO: Combine this simplified code with getIconById
        var template = this.accountTemplates[templateId];
        var provider = this.getTemplateMailProvider(template);

        var icon = (provider && provider.icon) || (template && template.icon);
        if (!icon) {
            return (big) ? '../images/header-icon-email-48x48.png' : '../images/account-generic-small.png';
        }
        return big ? icon.loc_48x48 : icon.loc_32x32;
    },

    /**
     * Retrieve an account icon uri for a given account id
     * @param {String} accountId -- account id
     * @param {Boolean} big -- true for a large icon, false for small.
     */
    getIconById: function (accountId, big) {
        var acct = this.getAccount(accountId), template = acct && this.accountTemplates[acct.getTemplateId()], icon, path;

        // See if it has an icon, or else if there's one in the account at the top level.
        icon = (template && template.icon) || acct && acct.icon;

        // Return one icon or the other, depending on whether or not the "big" one was requested.
        if (icon) {
            path = big ? icon.loc_48x48 : icon.loc_32x32;
            if (!EmailApp.Util.onDevice() && template) { // Yuck. How do we find these onDevice?
                path = "../tests/mock/accounts/" + template.templateId + "/" + path;
            }
            return path;
        } else {
            return big ? "../images/notification-large-generic.png" : "../images/othermail32.png";
        }
    },


    /**
     * This method supplies an envelope icon for an account
     */
    getAccountIconById: function (accountId) {
        return this.getIconById(accountId, false) || 'images/account-generic-small.png';
    },

    /**
     * Returns a mail-capability block from the account template associated with a provided accountId.
     * Used to determine what transport to talk to for an account, for various mail operations.
     * @param {Object} accountId -- id of account whose capability block to pull.
     */
    getProvider: function (accountId) {
        var account = this.getAccount(accountId);
        return account && this.getTemplateMailProvider(this.accountTemplates[account.getTemplateId()]);
    },

    /**
     * Returns a mail-capability block from a provided account template
     * @param {Object} template -- account template. ie: com.palm.imap account template
     */
    getTemplateMailProvider: function (template) {
        // This happens when we are called with a fake account ID (like the one used for the unified account dashboard).
        if (!template || !template.capabilityProviders) {
            return undefined;
        }

        // verify this template has mail capabilities
        var providers = template.capabilityProviders, tempLen = providers.length;
        for (var i = 0; i < tempLen; ++i) {
            if (providers[i].capability === "MAIL") {
                return providers[i]; // this one has mail capabilities, yo
            }
        }
        return undefined;
    },


    /**
     * Retrieve a transport type string for an provided account id.
     * reutrns "POP","IMAP", "POP"
     * @param {String} accountId
     * REFAC
     * TODO: Might not always be safe. See if there's a more reliable way to get this info
     * maybe use the whole transport uri instead of pulling out the name
     */
    getAccountType: function (accountId) {
        var provider = this.getProvider(accountId);
        if (!provider) {
            return undefined;
        }
        var providerParts = provider.id && provider.id.split(".") || [];
        if (providerParts.length < 3) {
            // needs to have com.palm.something
            return undefined;
        }
        return providerParts[2].toUpperCase(); // will give "POP","IMAP", etc.
    },


    /**
     * used for account redordering.
     * Not currently in use, but possibly needed once enyo provides reorderable lists.
     * @param {Object} accts
     */
    saveAccountOrder: function (accts) {
        if (!accts || accts.length <= 0) {
            return;
        }

        var toSave = [];
        for (var i = 0; i < accts.length; ++i) {
            toSave.push({
                _id: accts[i]._id,
                sortKey: i
            });
        }
        throw "saveAccountOrder not yet implemented"
    },

    /**
     * Used to retrieve a list of accounts sorted wrt to saved account ordering.
     * Not currently in use, but possibly needed once enyo provides reorderable lists.
     */
    getSortedList: function () {
        //first, make a copy of the list so that we don't return the global copy
        // note, second step isn't necessary right now, but will be after getCombined refactoring
        var listCopy = this.getAccounts().map(function (account) {
            return account;
        });

        //now sort the list by the sortKey property that exists in the mail-specific account metadata
        var that = this;
        return listCopy.sort(function (account1, account2) {
            var sortKey1 = account1.getSortKey();
            var sortKey2 = account2.getSortKey();

            if (sortKey1 < sortKey2) {
                return -1;
            } else if (sortKey1 === sortKey2) {
                return 0;
            } else {
                return 1;
            }
        });
    },

    /**
     * Default pref values for a fresh mail account.
     */
    DEFAULT_MAIL_ACCOUNT: {
        notifications: {
            enabled: true,
            type: "mute", //AccountpreferencesAssistant.kNotifyTypeMute,
            ringtoneName: '',
            ringtonePath: ''
        },
        syncFrequencyMins: -1, // AccountpreferencesAssistant.kSYNC_FREQ_PUSH, // make it push for default accounts
        syncWindowDays: 3,
        signature: ''
    }
};


