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

// FIXME: temporary navigation aid to synthesize a back gesture
enyo.dispatchBack = function () {
    enyo.dispatch({type: "back", preventDefault: enyo.nop});
};

/* This is the main email app window.
 *
 * Holds the following panes; only one is visible at a time:
 * - slidingPane: main pane containing three sliding panels.
 * - firstLaunchPane: displayed on first launch
 * - masterSettings: preferences pane
 */
enyo.kind({
    name: "MailApp",
    kind: "Pane",
    className: "enyo-bg",
    components: [
        {kind: "ApplicationEvents", onOpenAppMenu: "openAppMenu", onBack: "backHandler", onWindowParamsChange: "windowParamsChanged",
            onResize: "resizeHandler", /*onUnload:"unloadHandler", */onWindowHidden: "windowHiddenHandler", onWindowShown: "windowShownHandler",
            onWindowActivated: "windowActivatedHandler"},
            
        {kind: "EmailApp.BroadcastSubscriber", target: "enyo.application.accounts", onChange: "accountsChanged"},  

        {name: "checkFirstLaunch", kind: "Accounts.checkFirstLaunch", onCheckFirstLaunchResult: "_firstLaunchResponder", appId: "com.palm.app.email"},

        {name: "slidingPane", kind: "SlidingPane", style: "background: url(../images/loading-bg.png) top left repeat-x;", flex: 1, components: [
            {width: "320px", name: "folderSliding", dragAnywhere: false, fixedWidth: true, components: [
                {
                    name: "folderPane",
                    kind: "FolderListPane",
                    flex: 1,
                    onSelectFolder: "folderChosen",
                    onComposeMessage: "composeMessage",
                    onFoldersLoaded: "foldersLoaded"
                }
            ]},
            {width: "320px", name: "listSliding", dragAnywhere: false, fixedWidth: true, showing: true, components: [
                {
                    name: "listPane",
                    kind: "EmailListPane",
                    flex: 1,
                    onListLoaded: "conversationListLoaded",
                    onConversationSelected: "conversationSelected",
                    onComposeMessage: "composeMessage",
                    onHeaderTap: "headerTap"
                }
            ]},
            {flex: 1, name: "messageSliding", dragAnywhere: false, onResize: "resizeMessagePane", showing: true, components: [
                {
                    name: "messagePane",
                    kind: "MessageViewPane",
                    flex: 1,
                    onConversationDeleted: "conversationDeleted",
                    onComposeMessage: "composeMessage",
                    onNext: "displayNextOrPreviousConversation",
                    onPrevious: "displayNextOrPreviousConversation"
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

        {name: "messageDisplayFetcher", kind: "DbService", method: "get", dbKind: "com.palm.email:1", onSuccess: "gotMessageForDisplay"},
        {name: "conversationDisplayFetcher", kind: "DbService", method: "get", dbKind: "com.palm.email.conversation:1", onSuccess: "gotConversationForDisplay"},

        // This is the master menu for the main email app
        // Event handlers and hiding/disabling are configured in configureAppMenu()
        {name: "appMenu", kind: "AppMenu", components: [
            {name: "markAllReadItem", caption: $L("Mark All As Read")},
            {name: "emptyTrashItem", caption: $L("Empty Trash")},
            {name: "aboutThisFolder", caption: $L("About This Folder")},
            {name: "rebuildThreadIndex", caption: $L("Debug: Rebuild thread index")},
            {name: "fastToggleThreading", caption: $L("Debug: Fast toggle threading")},
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
        };
        window.addEventListener('unload', unloadFunc);

        // Mark main card as cachable off-screen.
        // This means it will usually not be closed when the user throws it away.
        // Instead, we'll get the windowHidden event
        if (window.PalmSystem && PalmSystem.keepAlive) {
            PalmSystem.keepAlive(true);
        }

        this.initLastEmailHash();

        enyo.application.contactCache = new ContactCache(300); // THIS IS SPARTA!

        if (EmailApp.Util.onDevice() && !EmailApp.Util.useSinglePanelMode()) {
            this.$.checkFirstLaunch.shouldFirstLaunchBeShown();
        } else {
            // Never run first-use when off of the device.
            // TODO(AK): revisit this, we'll want to test the first use somehow
            this._unhideMainApp();
        }
        
        if (EmailApp.Util.useSinglePanelMode()) {
            enyo.setAllowedOrientation('up');
            //this.$.slidingPane.setMultiView(false);
        }
    },

    // reset hash of recently viewed email/conversation ids
    initLastEmailHash: function () {
        this.lastEmailHash = {};
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
        // Make sure the main view is showing (i.e. hide preferences view)
        this.selectViewByName("slidingPane", true);
    },

    firstLaunchDone: function () {
        this.$.checkFirstLaunch.firstLaunchHasBeenShown();
        this._unhideMainApp();
    },

    unloadHandler: function () {
        // Main card thrown away, so allow all new message notifications.
        enyo.application.dashboardManager.setFilter();

        // Destroy component tree on window unload, so we can rely on destructors for cleanup.
        this.destroy();
    },

    windowHiddenHandler: function () {
        this._appActivated = false;

        // Switch back to three-panel mode
        this.$.slidingPane.selectViewImmediate(this.$.folderSliding);

        // Deactivate webview and clear message view
        this.$.messagePane.setConversation(null);

        // Clear folder view and state
        this.$.listPane.blurSearchBox();
        this.$.listPane.setFolder(undefined); // clear list pane, so we don't do useless updates while hidden.

        // Deselect folder
        this.$.folderPane.renderFolderSelection(null);

        // Reset hash of recently viewed email/conversation ids
        this.initLastEmailHash();

        if (enyo.application.contactCache) {
            enyo.application.contactCache.clearCache();
        }
    },

    windowShownHandler: function () {
        //console.log("@@@ window shown");

        this.$.checkFirstLaunch.shouldFirstLaunchBeShown();
    },

    windowActivatedHandler: function (inSender, event) {
        //console.log("@@@ window activated!");

        if (!enyo.application.accounts.hasAccounts()) {
            this.showFirstLaunch();
            return;
        }

        if (this._launchParams) {
            this.handleLaunches(this._launchParams, true);
            this._launchParams = undefined;
        }

        var currentFolder = this.$.listPane.getFolder();
        if (currentFolder) {
            var accountId = currentFolder.accountId;
            enyo.application.dashboardManager.setFilter(accountId, currentFolder._id);
        }

        this._appActivated = true;
    },

    resizeMessagePane: function () {
        this.optimizeSpace();
        if (this.$.slidingPane.view === this.$.messageSliding) {
            enyo.application.dashboardManager.setFilter();
        } else {
            var currentFolder = this.$.listPane.getFolder();
            if (currentFolder) {
                var accountId = currentFolder.accountId;
                enyo.application.dashboardManager.setFilter(accountId, currentFolder._id);
            }
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

    isPrefsView: function () {
        return this.getViewName() === "masterSettings";
    },

    getAppMenuConfigs: function () {
        return {
            prefs: {onclick: "showPreferences", showing: this.isMainView()},
            help: {onclick: "showHelp"},
            rebuildThreadIndex: {
                onclick: "rebuildThreadIndex",
                showing: this.isPrefsView() && EmailApp.Util.isThreadingEnabled()
            },
            fastToggleThreading: {
                onclick: "fastToggleThreading",
                showing: this.isPrefsView() && enyo.application.threader.useThreading()
            },
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

    // Called when the user opens the app menu
    openAppMenu: function () {
        // Make sure the menu has been instantiated if it's still marked as lazy
        this.$.appMenu.validateComponents();

        // Set up menu item enablement & owners properly:
        this.configureAppMenu(); // disable all to start
        this.configureAppMenu(this);

        // Only display these menu items when prefs view isn't open
        if (this.isMainView()) {
            var slidingViewName = this.$.slidingPane.getViewName();

            // Give each view a chance to configure the menu and take ownership of menu items
            // Second parameter is whether the view is hidden/off-screen
            // FIXME: needs to be revised to work properly in single-view sliding mode (i.e. on phones)
            this.configureAppMenu(this.$.folderPane, slidingViewName !== "folderSliding");
            this.configureAppMenu(this.$.listPane, slidingViewName === "messageSliding");
            this.configureAppMenu(this.$.messagePane, false);
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
        var foldersObj = this.$.folderPane.getFoldersObjByIndex(0);
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
        this.$.messagePane.setConversation(null);
    },

    getFolderById: function (folderId) {
        if (folderId === Folder.kAllInboxesFolderID) {
            return Folder.kAllInboxesFolder;
        } else if (folderId === Folder.kAllFlaggedFolderID) {
            return Folder.kAllFlaggedFolder;
        } else if (folderId === Folder.kAllUnreadFolderID) {
            return Folder.kAllUnreadFolder;
        } else {
            return enyo.application.folderProcessor.getFolder(folderId);
        }
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
        var folder = this.getFolderById(folderId);

        this.displayFolder(folder);
        
        if (EmailApp.Util.useSinglePanelMode()) {
            this.$.slidingPane.selectViewImmediate(this.$.listSliding);
        }

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

        var customFolderId;

        if (launchParams.folderId) {
            customFolderId = launchParams.customFolderId;
        } else if (enyo.application.prefs.get("showAllInboxes")) {
            var accts = enyo.application.accounts;
            if (accts.hasAccounts() && accts.getAccounts().length > 1) {
                customFolderId = Folder.kAllInboxesFolderId;
            }
        }

        // Switch to one or two-panel view
        // FIXME: don't change if the email app is already open
        if (EmailApp.Util.useSinglePanelMode()) {
            this.$.slidingPane.selectViewImmediate(this.$.messageSliding);
        } else {
            this.$.slidingPane.selectViewImmediate(this.$.listSliding);
        }

        // Load the email from the database
        this.fetchAndDisplayMessage(launchParams.emailId, customFolderId, true);

        return true;
    },

    /* get an email or conversation from the database and display it */
    fetchAndDisplayMessage: function (msgId, customFolderId, userActivated) {
        if (!msgId) {
            return;
        }

        // Find email
        var request = this.$.messageDisplayFetcher.call({
            ids: [msgId]
        });

        // Used to request displaying "all inboxes", etc, instead of the normal folder
        request.customFolderId = customFolderId;
        request.userActivated = userActivated;
    },

    gotMessageForDisplay: function (sender, response, request) {
        if (response && response.results && response.results.length == 1) {
            var emailData = response.results[0];

            if (emailData.conversationId && EmailApp.Util.isThreadingEnabled()) {
                // Lookup conversation (if any)
                var convRequest = this.$.conversationDisplayFetcher.call({
                    ids: [emailData.conversationId]
                });

                // Copy over custom folder id from request
                convRequest.customFolderId = request.customFolderId;
                convRequest.userActivated = request.userActivated;
            } else {
                var folderId = request.customFolderId;
                this.displayFolderAndConversation(new VirtualConversation(emailData), folderId, request.userActivated);
            }
        } else {
            this.error("couldn't find email to display");
            this.displayConversation(null);
        }
    },

    gotConversationForDisplay: function (sender, response, request) {
        if (response && response.results && response.results.length == 1) {
            var convData = response.results[0];

            var folderId = request.customFolderId;
            this.displayFolderAndConversation(new VirtualConversation(convData), folderId, request.userActivated);
        } else {
            this.error("couldn't find conversation to display");
            this.displayConversation(null);
        }
    },

    cancelPendingLoad: function () {
        this.$.messageDisplayFetcher.cancel();
        this.$.conversationDisplayFetcher.cancel();
    },

    /* display a conversation
     * virtualConv: a VirtualConversation
     * folderId: (optional) folder to select and display in list view
     */
    displayFolderAndConversation: function (virtualConv, folderId, userActivated) {
        var folder;

        folderId = folderId || virtualConv.getFolderId();
        folder = this.getFolderById(folderId);
        
        if (folder) {
            this.displayFolder(folder);

            // Select conversation in email list
            this.$.listPane.selectConversationById(virtualConv.getId());
        }

        // Display conversation
        this.displayConversation(virtualConv, userActivated);
    },
    
    displayNextOrPreviousConversation: function (sender, virtualConv) {
        if (virtualConv) {
            // Select conversation in email list
            this.$.listPane.selectConversationById(virtualConv.getId());
        
            this.displayConversation(virtualConv, false);
        }
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
        //this.log("selected mail app view " + this.getViewName());

        if (this.getView() == this.$.slidingPane) {
            this.$.listPane.reset(); // hack to reset scroll position
            this.$.listPane.resized();

            // Check if the last account has been deleted
            this.checkAccounts();
        }

        this.inherited(arguments);
    },

    windowParamsChanged: function (inSender, event) {
        if (this._appActivated) {
            // Main window already open/visible
            this.handleLaunches(event && event.params, true);
            this._launchParams = undefined;
        } else {
            // windowActivateHandler will take care of us later
            this._launchParams = event && event.params;
        }
    },

    displayFolder: function (folder) {
        this.$.listPane.setFolder(folder);
        this.$.folderPane.renderFolderSelection(folder._id);
        // don't do any toggling of show/hidden state here
    },

    folderChosen: function (sender, folder) {
//		console.log("### FOLDER CHOSEN");

        if (folder) {
            // indicate that we're waiting for the email list to render
            this.waitingForConversationList = true;
        }

        enyo.application.dashboardManager.setFilter(folder.accountId, folder._id);
        this.$.listPane.setFolder(folder);

        // Cancel any pending asynchronous message load requests
        this.cancelPendingLoad();

        // If we've viewed the folder before recently, re-select the last email viewed
        var lastEmailId = this.lastEmailHash[folder._id];

        if (lastEmailId) {
            // load email
            this.fetchAndDisplayMessage(lastEmailId, folder._id, false);
        } else {
            this.$.messagePane.setConversation(null);
        }

        // Autosync folder
        this.$.listPane.autoSyncFolder();
    },
    
    conversationListLoaded: function() {
        if (this.waitingForConversationList && EmailApp.Util.useSinglePanelMode()) {
            this.$.slidingPane.selectView(this.$.listSliding);
        }
        
        this.waitingForConversationList = false;
    },

    foldersLoaded: function () {
        if (this.waitingForFolders) {
            this.displayFirstFolder();
            this.waitingForFolders = false;
        }
    },

    conversationSelected: function (sender, virtualConv) {
        // Cancel any pending asynchronous message load requests
        this.cancelPendingLoad();

        this.displayConversation(virtualConv, true);
    },

    displayConversation: function (virtualConv, userActivated) {
        // TODO: update dashboard

        // Check if we should hide the accounts and/or email list
        if (virtualConv && userActivated) {
            if (EmailApp.Util.useSinglePanelMode()) {
                this.$.slidingPane.selectView(this.$.messageSliding);
            } else if (window.innerWidth < 900 && this.$.slidingPane.view === this.$.folderSliding) {
                this.$.slidingPane.selectView(this.$.listSliding);
            } else if (enyo.application.prefs.get("hideAccountsOnViewEmail")) {
                this.$.slidingPane.selectView(this.$.listSliding);
            }
        }

        // Cache email/conversation so that if we return to this folder it loads it again
        if (virtualConv && this.$.listPane.getFolder()) {
            this.lastEmailHash[this.$.listPane.getFolder()._id] = virtualConv.getId();
        }

        // Set message pane to display conversation
        this.$.messagePane.setConversation(virtualConv);
        
        // Set next/previous info on message pane
        this.$.messagePane.setNextPrevQueryInfo(this.$.listPane.getQueryInfo());
    },

    conversationDeleted: function (inSender) {
        // FIXME
    },

    optimizeSpace: function () {
        var node = this.$.messageSliding.hasNode();
        if (!node) {
            return;
        }
        if (window.innerWidth < window.innerHeight && this.$.slidingPane.view === this.$.folderSliding) {
            if (!this.ismin) {
                this.ismin = true;
                this.$.messageSliding.setMinWidth(EmailApp.Util.useSinglePanelMode() ? "320px" : "448px");
            }
        } else {
            if (this.ismin) {
                this.ismin = false;
                this.$.messageSliding.setMinWidth("");
            }
        }
        this.$.messagePane.resized();
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
        if (this.$.slidingPane.view === this.$.listSliding) {
            this.$.slidingPane.selectView(this.$.folderSliding);
        } else {
            this.$.slidingPane.selectView(this.$.listSliding);
        }
    },

    composeMessage: function (inSender, inParams) {
        var account = this.$.folderPane.getSelectedAccount();
        var params = {};
        var folderId;
        enyo.mixin(params, inParams);

        if (!params.accountId) {
            // Default to the selected account (if any)
            // Get the accountId from the message's folder for replies or forwards
            if (params.originalMessage) {
                folderId = params.originalMessage.folderId;
            } else {
                // FIXME this looks like a hack
                folderId = inSender.folder && inSender.folder._id;
            }
            
            var folder = folderId && enyo.application.folderProcessor.getFolder(folderId);
            if (folder) {
                params.accountId = folder.accountId;
            } else {
                params.accountId = enyo.application.accounts.getDefaultAccountId();
            }
        }

        if (params.originalMessage) {
            // Load body text from original email
            var body = params.originalMessage.parts.filter(function (part) {
                return part.type === 'body';
            })[0];
            
            if (body) {
                var data = window.palmGetResource(body.path);
                
                if (!body.mimeType || body.mimeType !== "text/html") {
                    data = EmailApp.Util.convertTextToHtml(data);
                }
                
                params.bodyHTML = data;
            }
        }

        enyo.application.launcher.launchCompose(params);
    },

    backHandler: function (inSender, e) {
        console.log("current pane: " + this.getView().name);
    
        if (this.getView() === this.$.slidingPane) {
            console.log("backpedalling");
            var slidingView = this.$.slidingPane.getView();
            
            if (slidingView === this.$.messageSliding) {
                this.$.slidingPane.selectView(this.$.listSliding);
            } else if (slidingView === this.$.listSliding) {
                this.$.slidingPane.selectView(this.$.folderSliding);
            } else {
                // call default handler and return
                return this.inherited(arguments);
            }
            
            e.preventDefault();
            return true;
        } else {
            return this.inherited(arguments);
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

    rebuildThreadIndex: function () {
        enyo.application.threader.rebuildIndex();
        enyo.application.dashboardManager.generalNotification("Rebuilding thread index");
    },
    
    // Toggle thread view in UI without affecting thread indexing
    fastToggleThreading: function () {
        var enable = !EmailApp.Util.isThreadingEnabled();
        enyo.application.prefs.set('emailThreading', enable);
        enyo.application.dashboardManager.generalNotification(
            enable ? "Enabling threading without reindex" : "Disabling threading without cleanup");
        this.selectViewByName("slidingPane");
    }
});
