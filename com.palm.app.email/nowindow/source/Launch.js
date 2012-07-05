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
 * Class for handling email application launches. Throws up the initial app, and handles relaunches
 * when only the headless part of the app sticks around (hence "nowindow")
 */
enyo.kind({
    name: "EmailAppLaunch",
    kind: "enyo.Object",

    constructor: function () {
        this.inherited(arguments);
        this.uniqueCardNums = {};
    },


    /**
     * Handles application "startup", from tapping on the app icon, or launching
     * through the external api. Sets up initial accounts, folders, and email lists,
     * and routes passed params to the relaunch handler.
     */
    startup: function () {
        var launcher = this;
        this._hookupCarrierSettings();

        // Startup logic is thus:
        // Accounts are loaded, followed by application prefs, then folders.
        // Once all of these have been loaded, the app is displayed.

        // Actual startup is here.
        enyo.application.accounts = new EmailApp.AccountList(loadPrefs);
        EmailApp.Util.setUpConnectionWatch();

        // Helper Launch handlers below. (hoisting pulls them to the top);

        // folders loaded callback
        function handleRelaunch() {
            console.log("Loaded folder processor, launching.");

            enyo.application.unsavedPrefs = new EmailApp.Util.CookiePrefs("unsavedPrefs", {
                collapsedAccounts: {}
            });

            enyo.application.emailProcessor = new EmailApp.EmailProcessor();
            enyo.application.dashboardManager = new DashboardManager();

            var paramString = window.PalmSystem && PalmSystem.launchParams || "{}";
            var params = JSON.parse(paramString);

            launcher.relaunch(params);
        }

        // prefs loaded callback
        function loadFolders() {
            console.log("Loaded mojodb prefs, loading folder processor.");
            enyo.application.folderProcessor = new EmailApp.FolderProcessor(handleRelaunch);
        }

        // accounts loaded callback
        function loadPrefs() {
            console.log("loaded accounts, getting mojodb prefs.");
            enyo.application.prefs = new EmailApp.Util.MojoDBPrefs('com.palm.app.email.prefs:1',
                {
                    showAllInboxes: true,
                    showAllFlagged: false,
                    defaultAccountId: '',
                    confirmDeleteOnSwipe: true,
                    syntheticFolderData: {}
                },
                loadFolders);
        }
    },


    /** method for pulling carrier default values from mojodb
     */
    _hookupCarrierSettings: function () {
        var app = enyo.application;

        // Configure initial carrier defaults,
        // and load/reload them from the db as needed:
        app._kDefaultCarrierDefaults = {
            defaultSignature: AccountPreferences.addStylingToSig(AccountPreferences.DEFAULT_SIG)
        };
        app.carrierDefaults = app._kDefaultCarrierDefaults;
        app.carrierDefaultsFinder = new EmailApp.Util.MojoDBAutoFinder({
                from: 'com.palm.app.email.carrier_defaults:1',
                limit: 2
            },
            carrierDefaultsChanged);

        function carrierDefaultsChanged(results) {
            console.log("## we have new carrier defaults");
            console.log("### here they are: " + JSON.stringify(results));
            if (results && results.length > 0) {
                app.carrierDefaults = results[0];
                if (results.length > 1) {
                    console.error("carrierDefaultsChanged: found multiple carrier defaults objects.");
                }
            } else {
                app.carrierDefaults = app.kDefaultCarrierDefaults;
            }
        }
    },

    /* Activates an existing card or opens a new card */
    openCard: function (type, windowParams, forceNewCard) {
        var name, path, basePath, existingWin;

        name = type;
        console.log(arguments);
        basePath = enyo.fetchAppRootPath() + "/";
        var search = typeof location !== undefined ? location.search : "";
        if (type === "mail") {
            path = basePath + "mail/index.html" + search;
        } else if (type === "compose") {
            path = basePath + "compose/index.html" + search;

            // Use message ID in compose window name so we don't open multiple windows for the same draft.
            if (windowParams.edit && windowParams.edit._id) {
                name = name + "-" + windowParams.edit._id;
                forceNewCard = false;
            }
        } else if (type === "emailviewer") {
            path = basePath + "emailviewer/index.html" + search;
        } else if (type === "spawn") {
            path = basePath + "spawn/index.html"
        } else {
            console.error("unknown launch type " + type);
            return; // bail out
        }

        if (forceNewCard) {
            // generate a unique name
            if (!this.uniqueCardNums[type]) {
                this.uniqueCardNums[type] = 0;
            }

            name = name + "-" + (this.uniqueCardNums[type]++);
        }

        console.info("WINLOG: openCard " + name + " at url " + path);
        var window = enyo.windows.activate(path, name, windowParams);
        window.windowLaunchTime = Date.now(); // for profiling
        return window;
    },


    /**
     * Launches the compose view, supplying passed params
     * @param {Object} windowParams
     */
    launchCompose: function (windowParams) {
        var newWindow = true;
        if (windowParams.edit && windowParams.edit._id) {
            newWindow = false;
        }
        this.openCard("compose", windowParams, newWindow);
    },

    /**
     * Launches the email app in message view, supplying passed params
     * @param {Object} windowParams
     */
    launchEmailViewer: function (windowParams) {
        this.openCard("emailviewer", windowParams, true);
    },


    /**
     * (RE)Launches the email app after initial setup has been completed.
     * Primary entry point for most application launces. Routes suplied
     * params to proper handlers.
     *
     * The following params can result in the following launches:
     * -- no params ==> main app view display
     * -- 'target' or 'uri' points to a file ==> message view
     * -- 'newEmail' param ==> compose view
     * -- 'target' or 'uri' features 'mailto:' ==> compose view
     *
     * If no accounts are configured, regardless of params ==> first use display (further down the line)
     *
     * @param {Object} windowParams
     */
    relaunch: function (params) {
        console.log("relaunch called with param keys " + JSON.stringify(Object.keys(params)));


        if (params.launchedAtBoot) {
            return;
        }

        var hasAccounts = enyo.application.accounts && enyo.application.accounts.hasAccounts();
        if (!hasAccounts) {
            this.openCard("mail", params, false);
            return;
        }

        // Check if this is a launch using the legacy API. This should be deprecated
        // in favor of the "newEmail": {...} property (webOS 3.0+ only)
        var isLegacyComposeLaunch = function (params) {
            return (params.account || params.attachments || params.recipients !== undefined
                || params.summary !== undefined || params.text !== undefined);
        }

        // Figure out which window to launch
        if (params.target || params.uri) {
            var target = params.target || params.uri;
            var targetLower = target.toLowerCase();

            if (targetLower.indexOf("mailto:") == 0) {
                this.launchCompose({
                    mailToURL: target,
                    accountId: params.accountId
                });
            } else if (targetLower.indexOf("file:") == 0) {
                this.launchEmailViewer({
                    target: target,
                    accountId: params.accountId
                });
            }
        } else if (params.newEmail) {
            // This should be the preferred launch API
            this.launchCompose({
                externalLaunchParams: params.newEmail,
                accountId: params.accountId
            });
        } else if (isLegacyComposeLaunch(params)) {
            this.launchCompose({
                externalLaunchParams: params,
                accountId: params.accountId
            });
        } else {
            this.openCard("mail", params, false);
        }
    }
});
