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

dump = function (inObj, inIndent) {
    var indent = inIndent || "";
    if (enyo.isArray(inObj)) {
        for (var i = 0, a; a = inObj[i]; i++) {
            dump(a, indent);
        }
    } else {
        var p;
        for (var n in inObj) {
            p = inObj[n];
            if (p instanceof Object) {
                dump(p, indent + "     ");
            } else {
                console.log(indent + n + ": " + p);
            }
        }
    }
}

mail = {
    syncFolder: function (inAccountId, inFolder, force, inCallback) {
        if (window.fauxMail || !window.PalmSystem) {
            console.log("Sync folder");
        } else {
            palmMail.syncFolder(inAccountId, inFolder, force, inCallback);
        }
    },
    updateFolder: function (inFolder, inCallback) {
        if (window.fauxMail || !window.PalmSystem) {
            inCallback && inCallback(inFolder);
        } else {
            palmMail.updateFolder(inFolder, inCallback);
        }
    },
    saveDraft: function (inEmail, inAccount, inCallback) {
        if (window.fauxMail || !window.PalmSystem) {
            setTimeout(inCallback({returnValue: true, _id: "++HPET_2mGOBeN9R"}), 50);
        } else {
            palmMail.saveDraft(inEmail, inAccount, inCallback);
        }
    },
    /**
     * Method to send an email
     * @param {Email} email -- email object matching db entry
     * @param {CombinedAccount} account --
     * @param {Function} onSuccess -- success callback
     */
    sendMail: function (email, account, onSuccess) {
        if (window.fauxMail || !window.PalmSystem) {
            setTimeout(onSuccess({returnValue: true, _id: "++HPET_2mGOBeN9R"}), 50);
        } else {
            palmMail.sendMail(email, account, onSuccess);
        }
    },
    fetchNewestMail: function (inCallback) {
        if (window.fauxMail || !window.PalmSystem) {
            console.log("Fetching Mail");
            inCallback({results: [
                {_rev: 25}
            ]});

        } else {
            palmMail.fetchNewestMail(inCallback);
        }
    },
    fetchDefaultAccount: function () {
        if (window.PalmSystem) {
            palmMail.fetchDefaultAccount();
        }
    }
}

cacheMail = {
    getFavoriteFolders: function (inCallback) {
        var folders = [
            {_id: "fake-account-1-fake-folder-id", displayName: "Inbox", accountId: "fake-account-1", favorite: true},
            {_id: "fake-account-2-fake-folder-id2", displayName: "Inbox", accountId: "fake-account-2", favorite: true}
        ]
        window.setTimeout(function () {
            inCallback(folders);
        }, 0);
    },
    getFolders: function (inAccountId, inCallback) {
        var folders = [
            {_id: inAccountId + "-fake-folder-id", displayName: "Inbox", accountId: inAccountId, favorite: true},
            {_id: inAccountId + "-fake-folder-id2", displayName: "Outbox", accountId: inAccountId}
        ]
        window.setTimeout(function () {
            inCallback(folders);
        }, 0);
    }
};

// FIXME: temporary ... need to decide if it makes sense to wrap PalmServiceBridge.
// did so here mainly to make it simple to invoke a callback, but it's leaky.
palmService = {
    execute: function (inUrl, inArgs, inCallback) {
        var service = new PalmServiceBridge();
        var cb = function (inResponse) {
            console.log(inResponse);
            if (inCallback) {
                inCallback(enyo.json.parse(inResponse));
            }
        }

        service.onservicecallback = cb;
        var args = enyo.isString(inArgs) ? inArgs : enyo.json.stringify(inArgs);
        console.log("execute: " + inUrl + ", " + args);
        service.call(inUrl, args);
        return {service: service, cb: cb, cancel: service.cancel.bind(service)};
    }
}

palmMail = {
    /**
     *
     * @param {Object} email -- email to send
     * @param {CombinedAccount} acct -- account to send email from
     * @param {Function} inCallback -- success callback
     */
    sendMail: function (email, acct, onSuccess) {
        var args = JSON.stringify({accountId: acct.getId(), email: email});
        EmailApp.Util.callService('palm://com.palm.smtp/sendMail',
            args,
            onSuccess
        );
    },
    saveDraft: function (email, account, onSuccess) {
        enyo.application.dashboardManager.saveDraft(email, account, onSuccess);
    },
    fetchNewestMail: function (inCallback) {
        var f = {
            query: {
                from: "com.palm.email:1",
                orderBy: "_rev",
                desc: true,
                limit: 1
            },
            watch: true
        };
        EmailApp.Util.callService("palm://com.palm.db/find", f, inCallback);
    },
    syncFolder: function (inAccountId, inFolderId, force, inCallback) {
        console.log("palmMail.syncFolder accountId: " + inAccountId + " ; folderId: " + inFolderId);

        var provider = enyo.application.accounts.getProvider(inAccountId);
        if (!provider) {
            console.error("no provider for accountId " + inAccountId + " folderId " + inFolderId);
            return;
        }

        EmailApp.Util.callService(provider.implementation + "syncFolder", {
            accountId: inAccountId,
            folderId: inFolderId,
            force: !!force
        }, inCallback);
    },
    updateFolder: function (inFolder, inCallback) {
        EmailApp.Util.callService('palm://com.palm.db/merge',
            {objects: [inFolder]},
            inCallback
        );
    }
};
