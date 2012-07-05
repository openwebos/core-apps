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

/*global AccountPreferences:true */
/**
 * models email account preferences.
 */

var AccountPreferences = {};

AccountPreferences.getPrefsByAccountId = function (accountId) {
    var pref = enyo.application.accounts.getAccount(accountId);
    return pref.getPrefsData();
};

AccountPreferences.saveAccountPreferences = function (params) {

    if (!params || !params._id) {
        return;
    }

    // correct id. Id passed is com.palm.account id, not com.palm.mail.account id
    params._id = enyo.application.accounts.getAccount(params._id).getPrefsData()._id;

    // account name handled by accounts
    if (params.accountName !== undefined) {
        AccountPreferences.saveAccountName(params._id, params.accountName);
    }

    var toSave = {}, sanitizeStr = AccountPreferences.sanitizeStr;

    // copy out only the variables that should be saved to the database
    ["realName", "_id", "syncFrequencyMins", "syncWindowDays", "replyTo", "deleteFromServer", "deleteOnDevice", "inboxFolderId", "outboxFolderId", "notifications", "draftsFolderId", "trashFolderId"].forEach(function (key) {
        var val = params[key];
        toSave[key] = (typeof val === "string") ? sanitizeStr(val) : val;
    });

    toSave.signature = AccountPreferences._correctSignature(params.signature);
    console.log("@@@ saving the account");
    EmailApp.Util.callService('palm://com.palm.db/merge', {objects: [toSave]});
};

AccountPreferences.saveAccountName = function (accountId, accountName) {
    if (!accountId || accountName === undefined) {
        return;
    }

    console.log("Saving account name");
    // save account alias
    EmailApp.Util.callService('palm://com.palm.service.accounts/modifyAccount', {
        "accountId": accountId,
        "object": {
            "alias": accountName
        }
    }, function () {
        console.log("### Name save operation complete, yo.")
    });
};


AccountPreferences.sanitizeStr = function (str) {
    if (!str || typeof str !== "string") {
        // return whatever we were sent
        return str;
    }
    // strip scripts, then all other tags
    str = str.replace(/<script[^>]*>[\S\s]*?<\/script>/img, '');
    return str.replace(/<\/?[^>]+>/gi, '');
};

AccountPreferences._correctSignature = function (signature) {

    signature = signature || AccountPreferences.NO_SIGNATURE_BY_USER;
    // passed gatekeeper, so we're cool to blank out
    var carrierDefs = enyo.application.carrierDefaults;
    if (carrierDefs && signature === carrierDefs.defaultSignature) {
        // default signature should never be saved to the database. Different
        // for each device.
        signature = "";
    }

    if (signature.length > 0 && signature !== AccountPreferences.NO_SIGNATURE_BY_USER) {
        var strippedSig = AccountPreferences.sanitizeStr(signature);
        if (strippedSig.trim().length === 0) {
            signature = AccountPreferences.NO_SIGNATURE_BY_USER;
        } else if (strippedSig !== AccountPreferences.NO_SIGNATURE_BY_USER) {
            // preserving old logic. Tgis looks stupid, but I'm guessing
            // we could end up with the no-sig value after cleanup
            signature = AccountPreferences.addStylingToSig(signature);
        }
    }
    return signature;
};

AccountPreferences.addStylingToSig = function (signature) {
    // If the signature is empty or already has styling, just return it. Otherwise add the styling
    if (!signature || signature.indexOf('<div style="font-family: arial') === 0) {
        return signature;
    }
    return '<div style="font-family: arial, sans-serif; font-size: 12px;color: #999999">' + signature + '</div>';
};


/** function is used to resolve a signature from a raw com.palm.account or an account
 * displayed in the compose view's from dropdown
 */
AccountPreferences.getSignature = function (accountId) {
    var carrierDefs = enyo.application.carrierDefaults;
    var defSig = AccountPreferences.addStylingToSig((carrierDefs && carrierDefs.defaultSignature) ||
        AccountPreferences.DEFAULT_SIG);

    // DFISH-28123: fix default signature being used when sending from a
    // synthetic folder (and a custom signature is set on the default account)
    if (accountId === 'favorite-folders') {
        accountId = enyo.application.accounts.getDefaultAccountId();
    }

    if (!accountId) {
        return defSig;
    }

    var account = enyo.application.accounts.getAccount(accountId);
    if (!account) {
        return defSig;
    }
    return account.getSignature() || defSig;
};


AccountPreferences.SYNC_MANUAL = 0;
AccountPreferences.SYNC_5_MINS = 5;
AccountPreferences.SYNC_10_MINS = 10;
AccountPreferences.SYNC_15_MINS = 15;
AccountPreferences.SYNC_30_MINS = 30;
AccountPreferences.SYNC_1_HR = 60;
AccountPreferences.SYNC_6_HRS = 360;
AccountPreferences.SYNC_12_HRS = 720;
AccountPreferences.SYNC_24_HRS = 1440;
AccountPreferences.SYNC_PUSH = -1;


AccountPreferences.LOOKBACK_1_DAY = 1;
AccountPreferences.LOOKBACK_3_DAYS = 3;
AccountPreferences.LOOKBACK_7_DAYS = 7;
AccountPreferences.LOOKBACK_2_WEEKS = 14;
AccountPreferences.LOOKBACK_1_MONTH = 30;
AccountPreferences.LOOKBACK_FOREVER = 0;

AccountPreferences.NO_SIGNATURE_BY_USER = '<div id="no_signature" style="overflow:hidden;"></div>';
AccountPreferences.DEFAULT_SIG = $L("-- Sent from my HP TouchPad");

AccountPreferences.NOTIFICATION_MUTE = "mute";
AccountPreferences.NOTIFICATION_SYSTEM = "system";
AccountPreferences.NOTIFICATION_VIBRATE = "vibrate";
AccountPreferences.NOTIFICATION_RINGTONE = "ringtone";


