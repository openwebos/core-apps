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

/*global enyo, EmailApp, console, $L, EmailAccount, Folder*/
enyo.kind({
    name: "DashboardManager",
    kind: enyo.Component,
    components: [
        {
            name: "screenState",
            kind: "enyo.PalmService",
            service: "palm://com.palm.display/control",
            method: "status",
            onSuccess: "displayUpdate",
            subscribe: true
        }
    ],

    // Constants:
    kBannerCategory: "email",
    kNewEmailDashboardStageName: "email-dashboard",
    kErrorDashboardStageName: "error-dashboard",
    kSendErrDashboardStageName: "senderr-dashboard",

    kSendErrMailboxFull: $L("Send error: insufficient space"), //error message from mail service

    kUnifiedAccountId: "-unified",

    create: function () {
        this.inherited(arguments);

        // This keeps track of what account, folder, and message is being viewed to prevent
        // sending broadcast and dashboard updates when the user would see it because of the
        // scene he's in.
        this.filter = {};

        // Hashes of accountId -> [new_email, new_email, new_email]... and accountId -> Dashboard object.
        // There are special entries for kUnifiedAccountId, for the unified account dashboard.
        this.pending = {};
        this.dashboards = {};
        this.errorDashboards = {};

        //this.windowActivate = this.windowActivate.bind(this);
        this._handleNewEmailsFromAutoFinder = this._handleNewEmailsFromAutoFinder.bind(this);

        this._initialRevClause = {
            prop: "initialRev",
            op: ">",
            val: 0
        };
        this._query = {
            from: "com.palm.email:1",
            where: [
                {
                    prop: "flags.visible",
                    op: "=",
                    val: true
                },
                this._initialRevClause
            ],
            orderBy: "initialRev"
        };


        // Start watching for new emails
        // Begin by querying for the email with the latest initialRev property, and saving it.
        // Then we can watch for anything with a greater initialRev, and those are our incoming emails.
        EmailApp.Util.callService("palm://com.palm.db/find", {
            query: {
                from: "com.palm.email:1",
                where: [
                    {
                        prop: "flags.visible",
                        op: "=",
                        val: true
                    }
                ],
                orderBy: "initialRev",
                limit: 1,
                desc: true
            }
        }, this.beginMessageWatch.bind(this));

        // Don't try to call from browser or testing framework.
        // After creation, testing framework can set up mock call.
        if (EmailApp.Util.onDevice()) {
            this.$.screenState.call();
        }

        this.prefsChangedCallbackBound = this.prefsChangedCallback.bind(this);
        enyo.application.prefs.addListener(this.prefsChangedCallbackBound);
        this.accountsChangedCallback = this.accountsChangedCallback.bind(this);
        this._checkAccountError = this._checkAccountError.bind(this);
        this.accountsChangedCallback();
        enyo.application.accounts.addListener(this.accountsChangedCallback);

        this.watchPowerUser = new PowerUser("dashboardManager.watch");
        this.newDashboardPowerUser = new PowerUser("dashboardManager.newDashboard");
    },


    destroy: function () {
        enyo.application.prefs.removeListener(this.prefsChangedCallbackBound);
        enyo.application.accounts.removeListener(this.accountsChangedCallback);

        this._autoFinder.cancel();

        this.inherited(arguments);
    },

    prefsChangedCallback: function (propName, newValue) {
        if (propName === "showAllInboxes") {
            //FIXME: adjust any existing dashboards based on the new value of showAllInboxes!
        }
    },

    _checkAccountError: function (acct) {
        if (!acct) {
            console.log("### _checkAccountError received undefined account.");
            return;
        }
        var error = acct.getError();
        var errorCode = error && error.errorCode;
        var id = acct.getId();
        if (errorCode) {
            this.accountError(id, errorCode, error.errorText);
        } else {   // Get rid of messages once the error clears. It may have been through user action or externall.
            this._closeDashboard(id, this.errorDashboards);
        }
    },

    accountsChangedCallback: function () {
        var accts = enyo.application.accounts;
        accts.getSortedList().forEach(this._checkAccountError);
    },

    beginMessageWatch: function (result) {
        if (result.results.length === 0) {
            enyo.error("No results for beginMessageWatch");
        }
        var latestEmail = result.results[0];

        console.info("DashboardManager: latestEmail._rev=" + (latestEmail && latestEmail.initialRev));

        // Update our watch to the new rev, or use 0 if there are no emails yet.
        this._updateWatch((latestEmail && latestEmail.initialRev) || 0);
    },

    // maintains this.displayOff, used to determine if new message dashboards should be displayed.
    displayUpdate: function (inSender, inResult) {
        if (inResult.event) {
            // Note, specifically checking Off and On so we ignore displayInactive,
            // displayActive and displayDimmed
            if (inResult.event === "displayOff") {
                this.displayOff = true;
            } else if (inResult.event === "displayOn") {
                this.displayOff = false;
            }

            //console.info("displayUpdate event " + inResult.event);
        }
    },

    // Switches the watch for new emails to be for ones with an initialRev after the given rev.
    // Allocates the AutoFinder if needed.
    _updateWatch: function (rev) {
        var query = this._query;

        console.info("DashboardManager._updateWatch: rev " + rev);

        // Update our query parameter if rev is specified (which it usually should be).
        // When it's not, it's just to handle a possible race condition where we got am empty result set from our query,
        // and so we need to re-do the watch using the current max initialRev.
        if (rev !== undefined) {
            this._initialRevClause.val = rev;
        }

        // Allocate AutoFinder if needed, and update the watch otherwise:
        if (!this._autoFinder) {
            this._autoFinder = new EmailApp.Util.MojoDBAutoFinder(query, this._handleNewEmailsFromAutoFinder, true);
        } else {
            this._autoFinder.updateWatch(query);
        }
    },

    // Invoked when our watch for new emails fired.
    // Updates the watch, looks up account IDs, applies current filters, and updates dashboards.
    _handleNewEmailsFromAutoFinder: function (emails) {
        // console.log("in _handleNewEmailsFromAutoFinder");
        // console.log("emails: " + stringify(emails));

        var maxRev = 0;
        var i;
        var notifications;

        // Find max initialRev, and update the watch in our AutoFinder.
        maxRev = emails.reduce(function (cur, email) {
            return Math.max(cur, email.initialRev);
        }, 0);

        if (maxRev > 0) {
            this._updateWatch(maxRev);
        } else {
            // This shouldn't happen in ordinary circumstances, but it's possible that the data could
            // have disappeared or been changed to not match our query between the time our watch fires
            // and when our consequent query is executed.  In that case, we still need to call _updateWatch(),
            // or else the MojoDBAutoFinder() will not have ANY watch running, and we'll never be notified again.
            console.error("DashboardManager: _handleNewEmailsFromAutoFinder got " + emails.length + " items with maxRev=" + maxRev);
            this._updateWatch();
        }

        this.handleNewEmails(emails);

        // This power activity is started in the EmailProcessor when it sets the initialRev on an email.
        // Now that we're done processing updates; we can stop the power activity.
        this.watchPowerUser.stop();
    },

    handleNewEmails: function (emails) {
        // console.log("in handleNewEmails");
        // console.log("emails: " + stringify(emails));
        // Emails don't actually have an accountId property, but it's really handy for notification management so we add it here.
        for (var i = 0; i < emails.length; i++) {
            emails[i].accountId = enyo.application.folderProcessor.getFolderAccount(emails[i].folderId);
        }

        // Filter out anything we don't currently care about:
        emails = emails.filter(this._shouldNotify, this);

        //Mojo.Log.info("Filtered %d new emails down to %d.  filter=%j", count, emails.length, this.filter);

        // Add each remaining email to the pending list for the appropriate account:
        emails.forEach(this._addNewEmail, this);

        // Build a list of accounts with new emails, and then map the "play sound for account" function over them.
        var notifications = {};
        emails.forEach(function (email) {
            notifications[email.accountId] = true;
        }, this);
        Object.keys(notifications).forEach(this._doNotificationForAccount, this);

        // Make our dashboards reflect the data.
        this._updateDirtyDashboards();
    },

    // Adds a new email to the pending list for its account:
    _addNewEmail: function (email) {
        var accountId, array, sortIdx;

        // If showing all inboxes, then all new emails go into the "unified" bin.
        if (enyo.application.prefs.get("showAllInboxes")) {
            accountId = this.kUnifiedAccountId;
        } else {
            accountId = email.accountId;
        }

        // console.log("incoming email: " + stringify(email));

        // Decorate the email object with properties needed by the dashboard.
        var emailLayer = this._makeDashboardLayer(email);

        // Fetch the pending message array for the appropriate account, creating it if needed.
        array = this.pending[accountId];
        if (!array) {
            array = [];
            this.pending[accountId] = array;
        }

        // Add new email layer to the pending list, maintaining proper sort order.
        //sortIdx = _.sortedIndex(array, emailLayer, this._getTimestamp);
        for (sortIdx = 0; sortIdx < array.length && emailLayer.timestamp > array[sortIdx].timestamp; sortIdx++) {
            //this space intentionally left blank
        }

        array.splice(sortIdx, 0, emailLayer);
        array._needsUpdate = true;

        // console.log("in _addNewEmail");
        // console.log("new email layer: " + stringify(emailLayer));
        // console.log("new array: " + stringify(array));

        //Mojo.Log.info("Added new email layer to account %s, total=%d", accountId, array.length);
    },

    // Returns a dashboard layer object for the given email message.
    _makeDashboardLayer: function (email) {
        var layer = {
            emailId: email._id,
            accountId: email.accountId,
            folderId: email.folderId,
            text: email.subject,
            timestamp: email.timestamp
        };

        if (email.from) {
            layer.title = email.from.name || email.from.addr;
        } else {
            layer.title = "";
            console.error("Email " + email._id + " is missing Sender information, subject len= " + (email.subject && email.subject.length));
        }

        return layer;
    },

    // Returns true if the given email should cause a dashboard notification to be shown.
    // Used to filter out some new emails before dashboards are displayed for them.
    _shouldNotify: function (email) {
        var inboxFolder, account;

        if (!email || email.accountId === undefined || email.folderId === undefined) {
            console.error("Received invalid new email notification");
            return false;
        }

        // Never notify for read emails, or emails outside the inbox.
        // If inboxFolderId isn't available, treat accounts without it as if every new email is in the inbox.
        account = enyo.application.accounts.getAccount(email.accountId);
        inboxFolder = account.getInboxFolderId() || email.folderId;
        if (!email.flags) {
            console.error("Missing flags for email " + email._id);
            return false;
        }
        if (email.flags.read || inboxFolder !== email.folderId) {
            return false;
        }

        // Never notify if notifications are disabled for this account:
        if (!account.getNotificationsEnabled()) {
            return false;
        }

        // If the display is off then always do the notification
        // This ensures dashboards are displayed in the lock screen, I think.
        if (this.displayOff === true) {
            return true;
        }

        // Check to see whether to update the new email status
        var doUpdate = true;

        var mailWindow = enyo.windows.fetchWindow("mail");
        //if on device, use the mail window's activated state.  else, use true
        var mailWindowFocused = (mailWindow && mailWindow.PalmSystem) ? mailWindow.PalmSystem.isActivated : true;

        if (mailWindowFocused) {
            if (this.neverDisplay) {
                doUpdate = false;
            } else if (this.filter.messageId) {
                // user is viewing a message so they aren't yet in the list view
                // therefore show the new email notification.
                doUpdate = true;
            } else if (this.filter.folderId) {
                doUpdate = (this.filter.folderId !== email.folderId);
            } else if (this.filter.accountId) {
                doUpdate = (this.filter.accountId != email.account);
            }
        }

        return doUpdate;
    },


    _doNotificationForAccount: function (accountId) {
        EmailApp.Util.callService('palm://com.palm.tempdb/find',
            {"query": {
                "from": "com.palm.account.syncstate:1",
                "where": [
                    {"prop": "collectionId", "op": "=", "val": null},
                    {"prop": "accountId", "op": "=", "val": accountId}
                ]
            }
            },
            dooNotification);

        function dooNotification(resp) {
            if (resp && resp.results.length) {
                var syncState = resp.results[0].syncState;
                if (syncState === "INITIAL_SYNC") {
                    return;
                }
            }
            // pull notification prefs from mail account
            // TODO: Look at initial sync
            // also look at creating a debounce for large batches
            var acct = enyo.application.accounts.getAccount(accountId);

            if (!acct || !acct.getNotificationsEnabled()) {
                console.error("No notifications enabled for account " + accountId);
                return;
            }
            var notifPrefs = acct.getNotificationPrefsData();
            var notifType = acct.getNotificationType();

            var now = Date.now();
            // 10 second debounce
            if (notifPrefs.lastNotification && (now - notifPrefs.lastNotification) < 10000) {
                // toooo soooooooon!
                return;
            }
            notifPrefs.lastNotification = now;

            //Mojo.Log.info("_doNotificationForAccount %s: ", accountId, notifType);
            if (notifType === window.AccountPreferences.NOTIFICATION_SYSTEM) {
                window.PalmSystem.playSoundNotification("alerts", "/usr/palm/applications/com.palm.app.email/sounds/emailreceived.mp3", 3000);
            } else if (notifType === window.AccountPreferences.NOTIFICATION_RINGTONE) {
                window.PalmSystem.playSoundNotification("alerts", notifPrefs.ringtonePath);
            } else if (notifType === window.AccountPreferences.NOTIFICATION_VIBRATE) {
                window.PalmSystem.playSoundNotification("vibrate");
            }
        }

        // No need to check for AccountPreferences.NOTIFICATION_MUTE, since mute is what happens if we don't do anything.
    },

    // Configure dashboard stages so that they properly reflect the state of the "new email" data we've stored,
    // creating, updating, or destroying them as necessary.
    _updateDirtyDashboards: function () {
        var accountId, messages, that = this;

        // Go through all accounts in our 'pending' hash, close the empty dashboards, and show/update the ones that got new messages.

        Object.keys(this.pending).forEach(
            function (accountId) {
                messages = that.pending[accountId];
                if (messages.length === 0) {
                    // Close the account-specific dashboard if this account has no pending messages.
                    that._closeDashboard(accountId);
                } else if (messages._needsUpdate) {
                    // If we added new messages, then show a dashboard for the last one.
                    that._updateDashboard(accountId, messages);
                    messages._needsUpdate = false;
                }
            });
    },

    // Close the dashboard for the given accountId, or the unified one if unspecified.
    _closeDashboard: function (accountId, dashboardSet) {
        dashboard = (dashboardSet || this.dashboards)[accountId];
        if (dashboard) {
            // console.info("Closing dashboard for account " + accountId);
            dashboard.setLayers([]);
        }
    },

    // Update the dashboard for the given accountId (or the unified one if unspecified) to display the given message,
    // creating it if necessary.
    _updateDashboard: function (accountId, messages) {
        var dashboard = this.dashboards[accountId];

        if (messages.length > 0) {
            // Make sure icon paths are correct.
            this._updateIconsAndFolderIds(messages);

            //var lastMessage = messages[messages.length-1];
            //Mojo.Log.info("Updating  dashboard... textLen:%s, titleLen:%d, icon:%s", lastMessage.text && lastMessage.text.length, lastMessage.title && lastMessage.title.length, lastMessage.icon);

            // Update the dashboard content:
            if (!dashboard) {
                dashboard = this.createComponent({
                    name: "dashboard-" + accountId,
                    kind: "enyo.Dashboard",
                    accountId: accountId,
                    onDashboardActivated: "dashboardActivated",
                    onDashboardDeactivated: "dashboardDeactivated",
                    onIconTap: "dashboardIconTap",
                    onMessageTap: "dashboardMessageTap",
                    onUserClose: "userCloseHandler",
                    onLayerSwipe: "layerSwipeHandler",
                    smallIcon: "images/notification-small.png"
                });
                this.dashboards[accountId] = dashboard;
            }

            // console.log("in _updateDashboard, messages: " + stringify(messages));

            var oldWindow = dashboard.window;
            if (dashboard.layers.length === 0 && messages.length > 0) {
                console.info("WINLOG: Dashboard count increasing from 0, should make a new window.");
            } else if (dashboard.layers.length > 0 && messages.length === 0) {
                console.info("WINLOG: Dashboard count decreasing to 0, should close window.");
            }

            if (dashboard.layers.length === 0 && messages.length > 0) {
                // New window created -- need to start power activity so the device doesn't fall asleep
                // while the new window is being opened (which takes up to a second or so).
                // Will be stopped when we get an activate/deactivate event, or the time expires.
                this.newDashboardPowerUser.start(1500);
            }

            dashboard.setLayers(messages);

        }
    },

    // Run through the given array of dashboard layer objects, and set the icon and folder id properties properly for each layer in the dashboard.
    _updateIconsAndFolderIds: function (messages) {
        if (messages.length === 0) {
            return;
        }

        // Start with account ID of first email.
        var accountId = messages[0].accountId;
        var iconPath = enyo.application.accounts.getIconById(accountId, true);

        // All messages in the notification stack get that account's icon until we find one with a different accountId.
        // All messages after that point, get the "unified account" icon and the "all inboxes" folder id.
        // This way, as the user dismissed the dashboard layers, the icon will change to the one
        // for the correct account when the only remaining emails are from a single account.
        messages.forEach(function (message) {
            if (accountId !== message.accountId) {
                accountId = this.kUnifiedAccountId;
                message.folderId = Folder.kAllInboxesFolderID;
                message.icon = "images/notification-large-generic.png";
            } else {
                message.icon = iconPath;
            }
            //Mojo.Log.info("Message %s is using icon %s and folder id %s", message._id, message.icon, message.folderId);
        });
    },

    /**
     * Tell the notification assistant to ignore *all* new email notifications.
     * @param {Object} ignore - true means ignore, false means process new emails normally
     */
    setIgnoreNewEmails: function (ignore) {
        console.info("DashboardManager.setIgnoreNewEmails = " + ignore);
        this.neverDisplay = ignore;
    },

    /**
     * Clear certain emails from the notification data structure and continue to filter new emails. The filter is
     * determined by which of the optional parameters is specified. If account and folder id is specified, then
     * emails to that folder will not be shown in the banner and dashboard notifcation. If account, folder, and
     * message id are all specified, then just that message will be removed from the notification data structure.
     * If only account is specified, then all emails to that account will be filtered.
     * @param {String} accountId - the account to filter out
     * @param {String} folderId - the folder to filter out
     * @param {String} messageId - the specific message to filter out
     */
    setFilter: function (accountId, folderId, messageId) {
        console.info("DashboardManager.setFilter(a=" + stringify(accountId) + ", f=" + stringify(folderId) + ", m=" + stringify(messageId) + ")");
        if (folderId && folderId === Folder.kAllInboxesFolderID) {
            this.setIgnoreNewEmails(true);
        } else {
            this.setIgnoreNewEmails(false);
        }
        this.filter = {
            accountId: accountId,
            folderId: folderId,
            messageId: messageId
        };

        if (this.filter.accountId || this.filter.folderId || this.filter.messageId) {
            this.clear(this.filter.accountId, this.filter.folderId, this.filter.messageId);
        }
    },

    // Like setFilter, but only clears the emails from current pending lists... does not continue to filter future ones.
    clear: function (accountId, folderId, messageId) {
        // var newList = [];
        // var clearList = [];
        // var listIndex;

        var filterFunc, oldLen, pending, curAccountId, messages;
        var that = this;

        if (messageId) {
            filterFunc = function (layer) {
                return messageId !== layer.emailId;
            };
        } else if (folderId) {
            if (folderId === Folder.kAllInboxesFolderID) {
                // filter everything
                filterFunc = function (layer) {
                    return false;
                };
            } else {
                filterFunc = function (layer) {
                    return folderId !== layer.folderId;
                };
            }
        } else if (accountId) {
            filterFunc = function (layer) {
                return accountId !== that.kUnifiedAccountId && accountId !== layer.accountId;
            };
        } else {
            filterFunc = function (layer) {
                return false;
            }; // remove everything
        }

        // If acctId is specified, we only need to filter the unified account and the specified one:
        if (accountId) {
            pending = {};
            pending[accountId] = this.pending[accountId];
            pending[this.kUnifiedAccountId] = this.pending[this.kUnifiedAccountId];
        } else {
            pending = this.pending;
        }

        // Look through  the accounts we're interested in, and apply the filter function.
        for (curAccountId in pending) {
            if (pending.hasOwnProperty(curAccountId)) {
                messages = pending[curAccountId];
                if (messages && messages.length) {
                    // Save the old length, and filter the array.
                    oldLen = messages.length;
                    messages = messages.filter(filterFunc);

                    //Mojo.Log.info("DashboardManager.clear: Filtered %d emails from %s.", (oldLen - messages.length), curAccountId);

                    // If anything was removed, then mark the array to be updated, and save it back to this.pending.
                    if (messages.length !== oldLen) {
                        messages._needsUpdate = true;
                        this.pending[curAccountId] = messages;
                    }
                }
            }
        }

        this._updateDirtyDashboards();
    },

    dashboardActivated: function (inSender) {
        this.newDashboardPowerUser.stop();
    },

    dashboardDeactivated: function (inSender) {
        this.newDashboardPowerUser.stop();
    },

    dashboardMessageTap: function (inSender, layer, event) {
        // Temporary hack to call show() on our possibly-hidden window when showing it.
        // Soon, sysmgr should automatically show the window when we call activate(),
        // so we can keep the usual code flow of enyo.windows.activate().
//		var existingWin = enyo.windows.fetchWindow("mail");
//		if(existingWin) {
//			existingWin.PalmSystem.show();
//		}

        this.clear(layer.accountId);
        console.info("WINLOG: Activating main mail card, db tap");
        enyo.windows.activate("mail/index.html", "mail", {
            emailId: layer.emailId
        });
    },

    dashboardIconTap: function (inSender, layer, event) {
        // Temporary hack to call show() on our possibly-hidden window when showing it.
        // Soon, sysmgr should automatically show the window when we call activate(),
        // so we can keep the usual code flow of enyo.windows.activate().
//		var existingWin = enyo.windows.fetchWindow("mail");
//		if(existingWin) {
//			existingWin.PalmSystem.show();
//		}

        this.clear(layer.accountId);
        console.info("WINLOG: Activating main mail card, db icon tap");
        enyo.windows.activate("mail/index.html", "mail", {
            accountId: layer.accountId,
            folderId: layer.folderId
        });
    },

    dashboardErrorTap: function (inSender, layer, event) {
        // placeholder - go to prefs scene, accounts scene, etc.
        this.clear(inSender.accountId);
    },

    dashboardAccountErrorTap: function (inSender, layer, event) {
        // placeholder - go to prefs scene, accounts scene, etc.

        this.clear(inSender.accountId);
        // We don't clear the notification now, but if the error clears (externally or through user action), it will dissappear.

        if (inSender.accountId) {
            EmailApp.Util.callService("palm://com.palm.applicationManager/launch",
                {
                    id: "com.palm.app.accounts",
                    params: {launchType: "changelogin", accountId: inSender.accountId}
                });
        }
    },

    layerSwipeHandler: function (inSender, layer) {
        this.clear(layer.accountId, layer.folderId, layer.emailId);
    },

    userCloseHandler: function (inSender) {
        console.info("WINLOG: dashboard window user close: " + inSender.accountId);
        this.clear(inSender.accountId);
    },

    accountError: function (accountId, errorCode, errorText) {
        var dashboard = this.errorDashboards[accountId];

        var iconPath = enyo.application.accounts.getIconById(accountId, true);

        var onMessageTap = "dashboardErrorTap";
        if (errorCode === EmailAccount.BAD_USERNAME_OR_PASSWORD) {
            onMessageTap = "dashboardAccountErrorTap";
        }

        if (!dashboard) {
            dashboard = this.createComponent({
                name: this.kErrorDashboardStageName + accountId,
                kind: "enyo.Dashboard",
                accountId: accountId,
                onMessageTap: onMessageTap,
                onUserClose: "userCloseHandler",
                onLayerSwipe: "layerSwipeHandler",
                smallIcon: "images/notification-small.png"
            });
            this.errorDashboards[accountId] = dashboard;
        }

        if (errorCode === EmailAccount.BAD_USERNAME_OR_PASSWORD ||
            errorCode === EmailAccount.ACCOUNT_WEB_LOGIN_REQUIRED ||
            errorCode === EmailAccount.MAILBOX_FULL ||
            errorCode === EmailAccount.SSL_CERTIFICATE_EXPIRED ||
            errorCode === EmailAccount.SSL_CERTIFICATE_NOT_TRUSTED ||
            errorCode === EmailAccount.SSL_CERTIFICATE_INVALID ||
            errorCode === EmailAccount.SSL_HOST_NAME_MISMATCHED) {

            var errorLayer = {
                title: enyo.application.accounts.getAccount(accountId).getAlias(),
                text: EmailAccount.getDashboardErrorString(errorCode, errorText),
                icon: iconPath
            };

            dashboard.setLayers([errorLayer]);
        } else if (errorCode === EmailAccount.SECURITY_POLICY_NOT_SUPPORTED) {
            // handle security policy error
        }
    },

    clearAccountErrors: function () {

    },

    // Utility for display of general notifications in a transient banner.
    generalNotification: function (msg) {
        enyo.windows.addBannerMessage(msg, "{}", "images/notification-small.png");
    },

    showSaveBanner: function (sendDetails, response) {
        var message;
        if (!response) {
            message = "WHAT! NO RESPONSE?";
        } else if (response._id) {
            this.log("draft saved");

            if (sendDetails.subject && sendDetails.numDiscarded < 1) {
                message = EmailApp.Util.interpolate($L("Saved \"#{subject}\""), sendDetails);
            } else if (sendDetails.numDiscarded) {
                message = EmailApp.Util.interpolate($L("Saved email. #{numDiscarded} attachment(s) discarded"), sendDetails);
            } else {
                message = $L("Saved email.");
            }
            this.log(message);
        } else {
            message = $L("Couldn't save draft. email lost");
        }
        enyo.application.dashboardManager.generalNotification(message);
    },
    // Ugh. This doesn't really belong here, but needs to be in a component accessible from enyo.application, and that's available when no cards are open
    // https://jira.palm.com/browse/DFISH-6123
    saveDraft: function (inEmail, inAccount, inCallback) {
        var args = {accountId: inAccount.getId(), email: inEmail};
        EmailApp.Util.callService('palm://com.palm.smtp/saveDraft',
            args,
            inCallback
        );
    }
});
