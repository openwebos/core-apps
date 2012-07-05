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
 * Object combining 'com.palm.account' and 'com.palm.mail.account' objects.
 * MojoDB doesn't allow us to combine these two entries into one entity,
 * so we have to do it ourselves.
 *
 * For all intents and purposes, this should be the account that is used
 * by the application.
 *
 * There are three ways an instance of this class can be created:
 *
 * -- new CombinedAccount() // an empty account will be created
 * -- new CombinedAccount(accountId) // where accountId is a string. Account info will be loaded from the database
 * -- new CombinedAccount(comAccount, mailAccount) // where comAccount is a 'com.palm.account' entry, and mailAccount is a 'com.palm.mail.account' entry
 */
var CombinedAccount = function () {
    if (arguments.length === 1) {
        // this signature should only be used in special cases (ie: accounts scenes when loaded
        // by an external app.
        // Ideally, account load/population should be handled by the accounts list, as this
        // variant requires two queries per account.
        this._loadAccount(arguments[0]);
    } else if (arguments.length === 2) {
        this._directCreate(arguments[0], arguments[1]);
    } else {
        this._directCreate(undefined, undefined); // ensure placeholder objs are there
    }
}

CombinedAccount.prototype = {
    _loadAccount: function _loadAccount(accountId) {
        console.log("### loading from database. _id: " + accountId);
        this._checkSetting(accountId, "string", "account id must be a string");
        var callService = EmailApp.Util.callService;


        callService("palm://com.palm.db/find", {
            query: {
                from: "com.palm.account:1",
                where: [
                    {
                        prop: "_id",
                        op: "=",
                        val: accountId
                    },
                ]
            }
        }, loadHandler.bind(this, "comAccount"));

        callService("palm://com.palm.db/find", {
            query: {
                from: "com.palm.mail.account:1",
                where: [
                    {
                        prop: "accountId",
                        op: "=",
                        val: accountId
                    }
                ]
            }
        }, loadHandler.bind(this, "mailAccount"));

        // helper for above
        function loadHandler(dest, resp) {
            if (resp.results && resp.results.length) {
                this[dest] = resp.results[0];
                console.log("### " + dest + " loaded");
            } else if (resp.errorCode || resp.errorText) {
                throw (resp.errorCode || "XXXX") + ": " + (resp.errorText || "Unknown Error");
            } else {
                throw "Invalid account id passed";
            }
        }
    },

    getError: function () {
        return this.mailAccount.error; // will be undefined if no error
    },

    getOutError: function () {
        return this.mailAccount.smtpConfig && this.mailAccount.smtpConfig.error;
    },

    _directCreate: function _directCreate(comAccount, mailAccount) {
        this.setAccountData(comAccount).setPrefsData(mailAccount);
    },

    /**
     * Single check for account data load.
     */
    isAccountDataLoaded: function () {
        // since we have placeholder objects for the getters, also ensure that the objects are populated.
        return !!(this.comAccount && Object.keys(this.comAccount).length);
    },

    /**
     * Single check for prefs data load.
     */
    isPrefsDataLoaded: function () {
        // since we have placeholder objects for the getters, also ensure that the objects are populated.
        return !!(this.mailAccount && Object.keys(this.mailAccount).length);
    },

    /**
     * Master check. Combined account is loaded only if account and prefs data has loaded.
     */
    isLoaded: function () {
        return this.isAccountDataLoaded() && this.isPrefsDataLoaded();
    },

    /**
     * check to make sure that the prefs data is linked to an existing account.
     * This might not be totally necessary, but we have a few checks for it strewn
     * about the app
     */
    isPrefsDataLinked: function () {
        return this.isPrefsDataLoaded() && !!this.mailAccount.accountId;
    },

    // GETTERS
    getAccountData: function () {
        return this.comAccount;
    },
    getPrefsData: function () {
        return this.mailAccount;
    },

    getId: function () {
        return this.comAccount._id;
    },

    /**
     * get the sort key used for account ordering
     */
    getSortKey: function () {
        return this.mailAccount.sortKey || Number.MAX_VALUE;
    },

    getType: function () {
        // TODO: this getter solves various weird setups elsewhere in the app
        // we need to unify these.
        this.type = this.type || this.mailAccount.type || (this.mailAccount._kind && this.mailAccount._kind.split(".")[2].toUpperCase()); // "EAS", "IMAP", "POP"
        return this.type;
    },

    getProtocol: function () {
        return (this.mailAccount.protocol || this.getType());
    },

    /**
     * alias for afflicted screens
     */
    getPrefsId: function () {
        return this.getMailAccountId();
    },

    getMailAccountId: function () {
        return this.mailAccount._id;
    },

    getTemplateIcon: function () {
        var ca = this.comAccount;
        // templateIcon is only found in comAccount when account is provided by the accounts application
        this.templateIcon = this.templateIcon || this.comAccount.templateIcon || (ca.icon && ca.icon.loc_48x48) || "";
        return this.templateIcon;
    },

    getSignature: function () {
        return this.mailAccount.signature;
    },

    /**
     * Returns boolean denoting whether account has an inbound password configured.
     * Used by the account configuration scenes to determine whether or not to show placeholder password text
     * @param {Boolean} toSet
     */
    hasInPass: function () {
        return !!this._hasInPass;
    },

    /**
     * Returns boolean denoting whether account has an inbound password configured.
     * Used by the account configuration scenes to determine whether or not to show placeholder password text
     * @param {Boolean} toSet
     */
    hasOutPass: function () {
        return this.getType() === "EAS" || !!this._hasOutPass;
    },


    // display names and email addresses
    getAlias: function () {
        return this.comAccount.alias;
    },

    // display names and email addresses
    getReplyTo: function () {
        return this.mailAccount.replyTo;
    },

    getEmailAddress: function () {
        return this.comAccount.username;
    },

    getRealName: function () {
        return this.mailAccount.realName;
    },

    getDisplayName: function () {
        var ca = this.comAccount;
        if (ca.alias) {
            //TODO: consider localizing this
            return ca.alias;
        }
        if (ca.loc_name) {
            return ca.loc_name;
        }
        return ca.username;
    },

    /**
     * Get string to display to recipient for a sent email.
     */
    getFromName: function () {
        return this.getRealName() || this.getEmailAddress();
    },

    // account info
    getTemplateId: function () {
        return this.comAccount.templateId;
    },
    getInboxFolderId: function () {
        return this.mailAccount.inboxFolderId;
    },
    getSentFolderId: function () {
        return this.mailAccount.sentFolderId;
    },
    getTrashFolderId: function () {
        return this.mailAccount.trashFolderId;
    },
    getDraftsFolderId: function () {
        return this.mailAccount.draftsFolderId;
    },

    getJunkFolderId: function () {
        return this.mailAccount.junkFolderId;
    },
    getOutboxFolderId: function () {
        return this.mailAccount.outboxFolderId;
    },

    getSyncLookback: function () {
        return this.mailAccount.syncWindowDays;
    },
    getSyncFrequency: function () {
        return this.mailAccount.syncFrequencyMins;
    },

    getRootFolder: function () {
        return this.mailAccount.rootFolder;
    },

    getCapabilityProviders: function () {
        return this.comAccount.capabilityProviders;
    },

    getNotificationsEnabled: function () {
        return !!(this.mailAccount.notifications && this.mailAccount.notifications.enabled);
    },

    getNotificationPrefsData: function () {
        // TODO: consider exposing lastNotificationDate for DashboardManager
        return this.mailAccount.notifications;
    },


    /* boolean check for POP accounts ,to determine whether mail deletes on the device
     * should be synced back up to the server.
     */
    isDeviceDeleteSynced: function () {
        return !!this.mailAccount.deleteFromServer;
    },

    /* boolean check for POP accounts ,to determine whether server deletes should be synced to
     * the device. Basically, messages deleted on the server will be deleted from the device
     * on the next sync.
     */
    isServerDeleteSynced: function () {
        return !!this.mailAccount.deleteOnDevice;
    },

    getNotificationType: function () {
        return this.mailAccount.notifications && this.mailAccount.notifications.type;
    },

    getRingtoneName: function () {
        return this.mailAccount.notifications && this.mailAccount.notifications.ringtoneName;
    },

    getRingtonePath: function () {
        return this.mailAccount.notifications && this.mailAccount.notifications.ringtonePath;
    },

    // incomingServer information
    getDomain: function () {
        return this.mailAccount.domain;
    },

    getInServer: function () {
        return this.mailAccount.server;
    },

    getInPort: function () {
        return this.mailAccount.port;
    },

    getInUsername: function () {
        return this.mailAccount.username;
    },

    getInEncryption: function () {
        return this.mailAccount.encryption;
    },

    getOutServer: function () {
        return this.mailAccount.smtpConfig && this.mailAccount.smtpConfig.server;
    },

    getOutPort: function () {
        return this.mailAccount.smtpConfig && this.mailAccount.smtpConfig.port;
    },
    getOutEncryption: function () {
        return this.mailAccount.smtpConfig && this.mailAccount.smtpConfig.encryption;
    },

    getOutUsername: function () {
        // if we aren't using explicit smtp auth, there won't be an out username
        return (this.mailAccount.smtpConfig && this.mailAccount.smtpConfig.username) || this.mailAccount.username;
    },

    isSmartReplyEnabled: function () {
        return !!this.mailAccount.useSmartReply;
    },

    isSmartForwardEnabled: function () {
        return !!this.mailAccount.useSmartForward;
    },

    isSmtpAuthEnabled: function () {
        // NOTE: if undefined and smtpConfig is present, assume enabled! Needed for backwards compatibility
        return !!(this.mailAccount.smtpConfig && this.mailAccount.smtpConfig.useSmtpAuth !== false);
    },

    // SETTERS

    setEmailAddress: function (toSet) {
        if (this.getId()) {
            throw "Cannot override email address for an existing account";
        }
        this._checkSetting(toSet, "string", "email address must be a string");
        this.comAccount.username = toSet;
    },

    setInUsername: function (toSet) {
        this._checkSetting(toSet, "string", "inbound username must be a string");
        this.mailAccount.username = toSet;
    },

    setAccountData: function setAccountData(comAccount) {
        this._checkSetting(comAccount, "object", "Account data must be an object");

        this.comAccount = comAccount || {};  // prevent any of the getters from breaking
        return this;
    },
    setPrefsData: function setPrefsData(mailAccount) {
        this._checkSetting(mailAccount, "object", "Prefs data must be an object");

        if (mailAccount && typeof mailAccount !== "object") {
            throw "prefs data must be an object";
        }
        this.mailAccount = mailAccount || {}; // prevent any of the getters from breaking
        if (this.isPrefsDataLoaded()) {
            // workaround for AccountWizard. Will refactor this and acctwiz in parallel
            this.mailAccount.protocol = this._determineProtocol();
            this.mailAccount.type = this.mailAccount.type || this.getType();
        }
        return this;
    },

    _determineProtocol: function () {
        var templateId = this.getTemplateId();
        var stripped = templateId && templateId.replace("com.palm.", "");
        if (stripped === "yahoo" || stripped === "google") {
            return stripped.toUpperCase();
        }
        var type = this.getType();
        return type && type.toUpperCase();
    },
    setSyncFrequency: function setSyncFrequency(freqMins) {
        this._checkSetting(freqMins, "number", "Sync frequency must be a number");

        this.mailAccount.syncFrequencyMins = freqMins;
        return this;
    },
    setSyncLookback: function setSyncLookback(freqDays) {
        this._checkSetting(freqDays, "number", "Sync lookback must be a number");

        this.mailAccount.syncWindowDays = freqDays;
        return this;
    },

    setAccountAlias: function setAccountAlias(toSet) {
        this._checkSetting(toSet, "string", "account alias must be a string");

        this.comAccount.alias = toSet;
    },

    /**
     * Set flag to show whether account has an inbound password configured already.
     * Used by the account configuration scenes to determine whether or not to show placeholder password text
     * @param {Object} toSet
     */
    setHasInPass: function (toSet) {
        this._hasInPass = !!toSet;
    },

    /**
     * Set flag to show whether account has an outbound password configured already.
     * Used by the account configuration scenes to determine whether or not to show placeholder password text
     * @param {Object} toSet
     */
    setHasOutPass: function (toSet) {
        this._hasOutPass = !!toSet;
    },

    /**
     * Function for checking type compatibility of a supplied argument.
     * @param {Object} toSet -- var to check
     * @param {Object} typeString -- type string (lowercased) to match against toSet
     * @param {Object} error -- error to display if types don't match
     * Note: This function is enhanced for named functions.
     *  ie, in the prototype JSON:
     *             foo: function foo() { ... }
     *     the second 'foo' is actually the function's name, and will be printed before
     *     the error text to aide traceability. If you are adding functions that use this
     *  method, be sure to name them properly.
     */
    _checkSetting: function (toSet, typeString, error) {
        if (toSet !== undefined && typeof toSet !== typeString) {
            throw new TypeError(arguments.callee.name ?
                (arguments.callee.name + ": " + error) : error);
        }
        return true;
    }
};
