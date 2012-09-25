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

/*global enyo, console, $L, Folder, EmailApp
 */

// FIXME: temporary navigation aid to synthesize a back gesture
enyo.dispatchBack = function () {
    enyo.dispatch({type: "back", preventDefault: enyo.nop});
};

enyo.kind({
    name: "MailApp",
    kind: "Pane",
    className: "enyo-bg",
    components: [
        {kind: "ApplicationEvents", onOpenAppMenu: "openAppMenu", onBack: "backHandler", onWindowParamsChange: "windowParamsChanged",
            onResize: "resizeHandler", /*onUnload:"unloadHandler", */onWindowHidden: "windowHiddenHandler", onWindowShown: "windowShownHandler",
            onWindowActivated: "windowActivatedHandler"},
        {name: "checkFirstLaunch", kind: "Accounts.checkFirstLaunch", onCheckFirstLaunchResult: "_firstLaunchResponder", appId: "com.palm.app.email"},
        // TODO: replace SlidingPane style below with this, once animations are added back in:  style: "background: url(../images/Mail-2-1a-256.png) center center no-repeat, url(../images/loading-bg.png) top left repeat-x;"
        {name: "slidingPane", kind: "SlidingPane", style: "background: url(../images/loading-bg.png) top left repeat-x;", flex: 1, components: [
            {width: "320px", name: "folderSliding", dragAnywhere: false, fixedWidth: true, components: [
                {name: "accounts", kind: "MailAccounts", flex: 1,
                    onSelectFolder: "folderChosen",
                    onComposeMessage: "composeMessage",
                    onFoldersLoaded: "foldersLoaded",
                }
            ]},
            {width: "320px", name: "mailSliding", dragAnywhere: false, fixedWidth: true, showing: true, components: [
                {
                    name: "mail",
                    kind: "Mail",
                    flex: 1,
                    onSelect: "selectMessage",
                    onMessageDeleted: "messageDeletedFromList",
                    onComposeMessage: "composeMessage",
                    onHeaderTap: "headerTap"
                }
            ]},
            {flex: 1, name: "bodySliding", dragAnywhere: false, onResize: "resizeBody", showing: true, components: [
                {
                    name: "body",
                    kind: "MessagePane",
                    flex: 1,
                    onSelectionUpdated: "updateSelection", // used for updating list selection after next/prev
                    onMessageDeleted: "messageDeleted",
                    onComposeMessage: "composeMessage",
                    onOpenNewCard: "openNewCard"
                }
            ]}
        ]},

        // First launch pane
        {name: "firstLaunch", kind: "firstLaunchView",
            iconSmall: "../images/icon-48.png", // Path to small icon used for title bar
            iconLarge: "../images/Mail-2-1a-256.png",
            onAccountsFirstLaunchDone: "firstLaunchDone",
            capability: 'MAIL',
            lazy: true
        },

        // Preferences pane
        {name: "masterSettings", kind: "MasterSettings", lazy: true},

        {name: "messageDisplayFetcher", kind: "DbService", method: "get", dbKind: "com.palm.email:1", onSuccess: "displayMessage"},

        {name: "appMenu", kind: "AppMenu", components: [
            {name: "markAllReadItem", caption: $L("Mark All As Read")},
            {name: "emptyTrashItem", caption: $L("Empty Trash")},
            {name: "aboutThisFolder", caption: $L("About This Folder")},
            {name: "openNewCard", caption: $L("Open Email in New Card")},
            /* for testing */
            {name: "prefs", caption: $L("Preferences & Accounts")},
            {name: "printMenuItem", caption: $L("Print")},
            {name: "help", caption: $L("Help")}
        ]}
    ],

    create: function (launchParams) {
        this.inherited(arguments);
        console.info("WINLOG: MailApp create: " + window.name);

        // Temporarily work around sporadic non-delivery of unload events from the ApplicationEvents component.
        // Uncomment the ApplicationEvents component's unload handler when removing this workaround.
        var that = this;
        var unloadFunc = function (e) {
            console.info("WINLOG: UNLOAD main mail card");
            that.unloadHandler(e);
            window.removeEventListener('unload', unloadFunc);
        }
        window.addEventListener('unload', unloadFunc);

        // Mark main card as cachable off-screen.
        // This means it will usually not be closed when the user throws it away.
        if (window.PalmSystem && PalmSystem.keepAlive) {
            PalmSystem.keepAlive(true);
        }

        enyo.application.contactCache = new ContactCache(300); // THIS IS SPARTA!

        enyo.application.composeCount = enyo.application.composeCount || 1;

        this.accountsChangedBound = this.accountsChanged.bind(this);
        enyo.application.accounts.addListener(this.accountsChangedBound, "MailApp");

        if (EmailApp.Util.onDevice()) {
            this.$.checkFirstLaunch.shouldFirstLaunchBeShown();
        } else {
            // Never run first-use when off of the device.
            // TODO(AK): revisit this, we'll want to test the first use somehow
            this._unhideMainApp();
        }
    },

    // All launches get passed through here if we are uncertain about showing
    // first launch or if we know we need to show it
    _firstLaunchResponder: function (inSender, event) {
        if (!enyo.application.accounts.hasAccounts() || (event !== undefined && event.showFirstLaunch)) {
            this.showFirstLaunch();
        } else {
            this._unhideMainApp();
        }
    },

    // code to unhide the main app. (Launches have it hidden by default)
    _unhideMainApp: function () {
        var $$ = this.$;
        $$.body.reinitializeWebView();

        $$.mail.resetList();
        $$.body.showPlaceholder(true); // force placeholder (immediately) so it doesn't wait for animation
        $$.body.setMessage(undefined);
        this.selectViewByName("slidingPane", true);
        $$.slidingPane.selectViewImmediate($$.folderSliding); // FIXME(AK): causes wrong pane to be selected sometimes

        // XXX(AK): this line causes flicker after firstLaunchDone
        //this.selectView($$.slidingPane);

        if (this.disregardKeepAlive) {
            this.disregardKeepAlive = false;
        }
    },
    firstLaunchDone: function () {
        this.$.checkFirstLaunch.firstLaunchHasBeenShown();
        this._unhideMainApp();
    },

    destroy: function () {
        enyo.application.accounts.removeListener(this.accountsChangedBound);
        this.inherited(arguments);
    },

    unloadHandler: function () {
        // Main card thrown away, so allow all new message notifications.
        enyo.application.dashboardManager.setFilter();

        // Destroy component tree on window unload, so we can rely on destructors for cleanup.
        this.destroy();
    },
    windowHiddenHandler: function () {
        this._appActivated = false;
        var $$ = this.$;
        $$.body.disconnectWebView();
        $$.mail.blurSearchBox();
        $$.mail.setFolder(undefined); // clear list pane, so we don't do useless updates while hidden.
        $$.body.setMessage(undefined);
        $$.mail.initLastEmailHash(); // Forget selected messages hash, as if we were actually closed.
        if (enyo.application.contactCache) {
            enyo.application.contactCache.clearCache();
        }
    },
    windowShownHandler: function () {
        this.$.checkFirstLaunch.shouldFirstLaunchBeShown();
    },

    windowActivatedHandler: function (inSender, event) {
        if (!enyo.application.accounts.hasAccounts()) {
            this.showFirstLaunch();
            return;
        }

        if (this._launchParams) {
            this.handleLaunches(this._launchParams, true);
            this._launchParams = undefined;
        }

        var $$ = this.$;

        // recreate the timeFormatter so that we notice 12/24 hour changes
        // also update the body timeFormatter and the messages time
        $$.mail.setUpTimeFormatter();
        $$.body.tryUpdateHeaderTime();

        var currentFolder = $$.mail.getFolder();
        if (currentFolder) {
            var accountId = currentFolder.accountId;
            enyo.application.dashboardManager.setFilter(accountId, currentFolder._id);
        }

        if ($$.body) {
            $$.body.activate();
        }

        this._appActivated = true;
    },

    resizeBody: function () {
        this.optimizeSpace();
        if (this.$.slidingPane.view === this.$.bodySliding) {
            enyo.application.dashboardManager.setFilter();
            this.$.body.exposeNextPrev();
        } else {
            var currentFolder = this.$.mail.getFolder();
            if (currentFolder) {
                var accountId = currentFolder.accountId;
                enyo.application.dashboardManager.setFilter(accountId, currentFolder._id);
            }
            this.$.body.hideNextPrev();
        }
    },
    rendered: function () {
        this.resizeHandler();
        this.inherited(arguments);
        if (window.windowLaunchTime) {
            this.log("launch -> render time: " + (Date.now() - window.windowLaunchTime) + " ms");
        }
    },

    isMainView: function () {
        return this.getViewName() === "slidingPane";
    },

    getAppMenuConfigs: function () {
        return {
            prefs: {onclick: "showPreferences", showing: this.isMainView()},
            help: {onclick: "showHelp"},
            edit: {}
        };
    },

    // Configures app menu item state according to the given owner, or disables everything if owner is falsy.
    configureAppMenu: function (owner, viewHidden) {
        var items = this.$.appMenu.getControls();
        var handlers = (owner && owner.getAppMenuConfigs(viewHidden ? true : false)) || {};

        items.forEach(function (item) {
            if (!owner) { // default
                item.onclick = "";
                item.setDisabled(true);
                item.setShowing(false);
            } else if (handlers[item.name]) {
                var handler = handlers[item.name];
                item.setOwner(owner);

                item.onclick = handler.onclick || "";
                item.setDisabled(handler.disabled === true); // disable only if disabled is true
                item.setShowing(handler.showing !== false); // hide only if showing is false
            }
        });
    },

    openAppMenu: function () {
        this.$.appMenu.validateComponents();

        // Set up menu item enablement & owners properly:
        this.configureAppMenu(); // disable all to start
        this.configureAppMenu(this);

        // Only display these menu items when prefs view isn't open
        if (this.isMainView()) {
            var slidingViewName = this.$.slidingPane.getViewName();

            // Second parameter is whether the view is hidden/off-screen
            // FIXME: needs to be revised to work properly in single-view sliding mode (i.e. on phones)
            this.configureAppMenu(this.$.accounts, slidingViewName !== "folderSliding");
            this.configureAppMenu(this.$.mail, slidingViewName === "bodySliding");
            this.configureAppMenu(this.$.body, false);
        }

        // Workaround to remove Pane view styling
        this.$.appMenu.removeClass("enyo-view");

        // FIXME not sure why this is necessary; sometimes setShowing doesn't update properly (e.g. for empty trash)
        this.$.appMenu.render();

        this.$.appMenu.open();

        return true; // stop bubbling
    },

    handleLaunches: function (launchParams, isRelaunch) {
        var launchHandled = false;
        if (!launchHandled) {
            if (launchParams.folderId === undefined) {
                this.displayAllInboxesFolder = true;
            }
            this.disregardKeepAlive = true;
            this.waitingForFolders = false;

            launchHandled = this.handleDisplayMessageLaunch(launchParams, isRelaunch);
        }
        if (!launchHandled) {
            launchHandled = this.handleDisplayFolderLaunch(launchParams, isRelaunch);
        }
        if (!launchHandled) {
            launchHandled = this.handleEmptyParamsLaunch(launchParams, isRelaunch);
        }

        return launchHandled;
    },
    /*
     * Handles launches that have no params, automatically selecting the first favorited folder.
     */
    handleEmptyParamsLaunch: function (launchParams) {
        var paramsCount = Object.keys(launchParams).length;
        if (paramsCount !== 0) {
            return false;
        }

        this.displayFirstFolder();
        return true;
    },

    displayFirstFolder: function () {
        //get the first folders object
        var foldersObj = this.$.accounts.getFoldersObjByIndex(0);
        if (!foldersObj) {
            this.waitingForFolders = true;
            return false;
        }

        //get the first folder from that list of folders
        var folder = foldersObj.getFolderByIndex(0);
        if (!folder) {
            this.waitingForFolders = true;
            return false;
        }

        //select that folder
        this.displayFolder(folder);
        this.$.body.setMessage(undefined);
    },

    /*
     * Handles launches that specify a folderId, launching the app to the specified folder.
     * Should be called after handleDisplayMessageLaunch, in case the params also include an emailId.
     */

    handleDisplayFolderLaunch: function (launchParams, isRelaunch) {
        //we need a folderId to continue onwards
        if (!launchParams || !launchParams.folderId) {
            return false;
        }

        var folderId = launchParams.folderId;
        var folder;
        if (folderId === Folder.kAllInboxesFolderID) {
            folder = Folder.kAllInboxesFolder;
        } else if (folderId === Folder.kAllFlaggedFolderID) {
            folder = Folder.kAllFlaggedFolder;
        } else if (folderId === Folder.kAllUnreadFolderID) {
            folder = Folder.kAllUnreadFolder;
        } else {
            folder = enyo.application.folderProcessor.getFolder(folderId);
        }

        this.displayFolder(folder);

        return true;
    },

    /*
     * Handles launches that specify an emailId, launching the app to the specified email and its containing folder.
     * Should be called before handleDisplayFolderLaunch, in case the emailId is accompanied by a folderId.
     */
    handleDisplayMessageLaunch: function (launchParams, isRelaunch) {
        if (!launchParams || !launchParams.emailId) {
            return false;
        }

        this.changingFolders = true;
        this.$.slidingPane.selectViewImmediate(this.$.mailSliding);
        this.handleDisplayMessage(launchParams.emailId);

        return true;
    },

    handleDisplayMessage: function (msgId, folder) {
        this.lastFolder = folder;
        if (!msgId) {
            // TODO uncomment if we bring back animations
            //this.$.bodySliding.hide();
            return;
        }
        if (enyo.application.dbServiceHook) {
            enyo.application.dbServiceHook(this.$.messageDisplayFetcher);
        }
        this.$.messageDisplayFetcher.call({
            ids: [msgId]
        });
    },

    showFirstLaunch: function (inSender, event) {
        var msgs = {
            pageTitle: $L("Your email accounts"), // Page title if user has accounts they can use
            welcome: $L("To get started, set up an email account:")    // Optional - needed if HP Profile account doesn't support the app's capability
        };
        try {
            if (!this.$.firstLaunch) {
                // create component if needed
                this.createView("firstLaunch");
            }

            this.$.firstLaunch.startFirstLaunch(undefined, msgs);
            this.selectView(this.$.firstLaunch, true);
        } catch (e) {
            console.log("### unable to push firstLaunch for some reason");
            this.firstLaunchDone();
        }
    },

    // Need to use "doSelectView" because events are normally only sent to owners
    doSelectView: function () {
        this.log("selected mail app view " + this.getViewName());

        if (this.getView() == this.$.slidingPane) {
            this.$.mail.reset(); // hack to reset scroll position
            this.$.mail.resized();

            // Check if the last account has been deleted
            this.checkAccounts();
        }

        this.inherited(arguments);
    },

    windowParamsChanged: function (inSender, event) {
        if (this._appActivated) {
            this.handleLaunches(event && event.params, true);
            this._launchParams = undefined;
        } else {
            // windowActivateHandler will take care of us later
            this._launchParams = event && event.params;
        }
    },

    displayMessage: function (inSender, result) {
        var msg = result.results && result.results[0];

        if (msg === undefined) {
            // TODO uncomment if we bring back animations
            //this.$.bodySliding.hide();
            return;
        }

        // FIXME: If launched from an "all inboxes" notification, display the "all inboxes" folder.
        // FIXME: Need to highlight the selected message, and scroll list so that it's visible.

        var folder;

        var accts = enyo.application.accounts;
        if (this.displayAllInboxesFolder && enyo.application.prefs.get("showAllInboxes") && accts.hasAccounts() && accts.getAccounts().length > 1) {
            folder = Folder.kAllInboxesFolder;
            this.displayAllInboxesFolder = false;
        } else {
            if (this.lastFolder) {
                folder = this.lastFolder;
            } else {
                folder = msg && msg.folderId && enyo.application.folderProcessor.getFolder(msg.folderId);
            }
        }

        if (folder) {
            this.displayFolder(folder);
        }

        if (msg) {
            this.$.mail.selectMessage(msg._id);
            this.$.body.setMessage(msg, this.$.mail.getLastQuery());
        }

        //this.$.bodySliding.setShowing(!!msg);
    },

    displayFolder: function (folder) {
        this.$.mail.setFolder(folder);
        this.$.accounts.selectFolder(folder._id);
        // don't do any toggling of show/hidden state here
    },

    folderChosen: function (inSender, inFolder) {
//		console.log("### FOLDER CHOSEN");
        enyo.application.dashboardManager.setFilter(inFolder.accountId, inFolder._id);
        this.$.mail.setFolder(inFolder);
        if (!this.$.mail.getLastEmail(inFolder._id)) {
            this.$.body.setMessage(undefined);
        }
        this.slideInMessageListPane();
    },

    foldersLoaded: function () {
        if (this.waitingForFolders) {
            this.displayFirstFolder();
            this.waitingForFolders = false;
        }
    },

    /** note that this selectMessage takes a full message. mail.selectMessage takes a messageId */
    selectMessage: function (inSender, message, userActivated) {
        if (userActivated && (window.innerWidth < 900) && (this.$.slidingPane.view === this.$.folderSliding)) {
            this.$.slidingPane.selectView(this.$.mailSliding);
        }

        if (message) {
            enyo.application.dashboardManager.setFilter(message.accountId, message.folderId, message._id);
        } else {
            enyo.application.dashboardManager.setFilter();
        }

        this.$.body.setMessage(message, this.$.mail.getLastQuery());

        if (message) {
            // Select in list of messages
            this.$.mail.selectMessage(message._id);
        }

        //this.$.bodySliding.setShowing(!!message);
    },

    messageDeleted: function (inSender, inMessage) {
        // ToDo: Select another message after the selected message gets deleted (https://jira.palm.com/browse/DFISH-1376)
        this.selectMessage(inSender, inMessage && inMessage.next || this.$.body.getNextFocusableMessage(true));
    },

    messageDeletedFromList: function (inSender, inMessage) {
        if (inMessage.deleted && inMessage.deleted._id !== this.$.body.getMessage()._id) {
            return;
        }
        this.messageDeleted(inSender, inMessage);
    },

    optimizeSpace: function () {
        var node = this.$.bodySliding.hasNode();
        if (!node) {
            return;
        }
        if (window.innerWidth < window.innerHeight && this.$.slidingPane.view === this.$.folderSliding) {
            if (!this.ismin) {
                this.ismin = true;
                this.$.bodySliding.setMinWidth("448px");
            }
        } else {
            if (this.ismin) {
                this.ismin = false;
                this.$.bodySliding.setMinWidth("");
            }
        }
        this.$.body.$.messageLoader.resize();
    },

    showPreferences: function () {
        if (!this.$.masterSettings) {
            // FIXME not sure if this is public, but it probably ought to be
            this.createView("masterSettings");
        }
        this.$.masterSettings.showPreferences();
        this.selectViewByName("masterSettings");
    },
    showHelp: function () {
        var url = "http://help.palm.com/email/index.html";
        EmailApp.Util.callService("palm://com.palm.applicationManager/open",
            {id: "com.palm.app.help", params: {target: url}});
    },
    headerTap: function () {
        if (this.$.slidingPane.view === this.$.mailSliding) {
            this.$.slidingPane.selectView(this.$.folderSliding);
        } else {
            this.$.slidingPane.selectView(this.$.mailSliding);
        }
    },
    composeMessage: function (inSender, inParams) {
        var account = this.$.accounts.getSelectedAccount();
        var params = {};
        var folderId;
        enyo.mixin(params, inParams);

        if (!params.accountId) {
            // Default to the selected account (if any)
            // Get the accountId from the message's folder for replies or forwards
            if (params.originalMessage) {
                folderId = params.originalMessage.folderId;
            } else {
                folderId = inSender.folder._id;
            }
            var folder = enyo.application.folderProcessor.getFolder(folderId);
            if (folder) {
                params.accountId = folder.accountId;
            } else {
                params.accountId = enyo.application.accounts.getDefaultAccountId();
            }
        }

        enyo.application.launcher.launchCompose(params);
    },

    slideInMessageListPane: function () {
        this._arisePanelArise(this.$.mailSliding);
    },
    slideInBodyPane: function () {
        this._arisePanelArise(this.$.bodySliding);
    },
    _arisePanelArise: function (toSlide) {
        if (toSlide.showing) {
            return;
        }
        //toSlide.setShowing(true);
    },
    openNewCard: function (inSender, type, params) {
        if (type === "email") {
            enyo.application.emailViewerCount = enyo.application.emailViewerCount || 0;
            enyo.application.emailViewerCount++;

            console.info("WINLOG: Opening new  " + "emailviewer-" + enyo.application.emailViewerCount);
            enyo.windows.activate("../emailviewer/index.html", "emailviewer-" + enyo.application.emailViewerCount, params);
        }
    },

    updateSelection: function (inSender, messageId) {
        this.$.mail.selectMessage(messageId);
    },

    backHandler: function (inSender, e) {
        if (this.view == this.$.slidingPane) {
            this.$.slidingPane.back(e);
        } else {
            this.inherited(arguments);
        }
    },
    resizeHandler: function () {
        this.optimizeSpace();
        this.inherited(arguments);
    },

    checkAccounts: function () {
        // If there's no accounts, we should display the first launch screen
        if (!enyo.application.accounts.hasAccounts()) {
            this.showFirstLaunch();
        }
    },

    accountsChanged: function () {
        // If we're in the main view, check if the last account was deleted/disabled.
        // Don't do this for any other view, since we don't want to interfere with account creation.
        if (this.isMainView()) {
            this.checkAccounts();
        }
    },
});
