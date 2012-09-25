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
 * Parent class for the Account (Cr)eation/(U)p(d)ating screens.
 * Manages display of placeholder page, SimpleConfig, and ManualConfig scenes.
 * Also handles sending of accound validation results back to the accounts service.
 */
enyo.kind({
    name: "CRUDAccounts",
    width: "100%",
    kind: "enyo.VFlexBox",
    className: "basic-back",
    events: {
        onPreferenceChanged: ""
    },
    components: [
        {kind: "ApplicationEvents", onWindowParamsChange: "windowParamsChangeHandler"},
        {name: "settingPane", kind: "Pane", flex: 1, width: "100%", components: [
            {name: "blank"},
            {kind: "SimpleConfig", name: "simpleConfig"},
            {kind: "ManualConfig", name: "manualConfig"}
        ]
        },
        {name: "errorDialog", kind: "Popup", dismissWithClick: true, scrim: true, components: [
            {name: "errorTitle", className: "enyo-item enyo-first", style: "padding: 12px", content: "Two Buttons"},
            {name: "errorContent", className: "enyo-item enyo-last", allowHtml: true, style: "padding: 12px; font-size: 14px", content: $L("Choose one of the following options")},
            {name: "option1", showing: false, kind: "Button", caption: "", onclick: "checkChoice"},
            {name: "option2", showing: false, kind: "Button", caption: "", onclick: "checkChoice"},
            {name: "option3", showing: false, kind: "Button", caption: "", onclick: "checkChoice"}
        ]},
        {kind: "CrossAppResult"},
        {kind: "SecurityPolicyGuard", name: "pinPoppin", onSuccess: "guardSuccess", onFailure: "guardFailure", onCancel: "guardCancel"},
        {kind: "Accounts.DuplicateCheck", name: "duplicateCheck", onAccountsDuplicate_Success: "newAccountHandler", onAccountsDuplicate_Duplicate: "duplicateAccountHandler"} // this is beyond retarded, but time demands it
    ],
    create: function () {
        this.inherited(arguments);
        this.validateWizardResult = this.validateWizardResult.bind(this);
        EmailApp.Util.setUpConnectionWatch();
        this.removeSecurityPolicies = this.removeSecurityPolicies.bind(this);
        this.$.errorDialog.validateComponents();
    },

    /**
     * Manually dispatch an enyo back event.
     * TODO: determine if needed.
     */
    doBack: function () {
        enyo.dispatchBack();
    },

    /**
     * Display the basic account wizard screen
     */
    showSimpleConfig: function (hasError) {
        var simCon = this.$.simpleConfig;
        simCon.loadAccount(this.account);
        this.$.settingPane.selectView(simCon);
        simCon.focusPrimary();
    },

    /**
     * Show the manual config scene from the simple config scene.
     * @param simpleFields: {Object} in the format:
     *              { 'email': string
     *                  'username' : string...provided if eas
     *                  'password' : string
     *                 }
     *
     * @param errorSettings: {ProtocolSettings}, included if account setup was
     *            unsuccessful, but fixable (mostly correct info)
     */
    showManualConfig: function (simpleFields, errorSettings) {
        var ca = this.account;

        if (errorSettings) {
            this.mixinErrorSettings(errorSettings);
        }
        // for readability
        var email = simpleFields.email,
            username = simpleFields.username;

        // if user has tweaked email or username
        if (email && !ca.getEmailAddress() || ca.getEmailAddress() !== email || username && ca.getInUsername() !== username) {
            ca.setEmailAddress(email);
            if (ca.getType() === AccountWizard.EAS) {
                ca.setInUsername(username);
            }
        }
        // correct password if needed before passing on to manualConfig.
        var password = simpleFields.password;
        password = (password && password !== EmailAccount.PLACEHOLDER_PASS) ? password : undefined;

        this.$.manualConfig.loadAccount(this.account, password, this.wizard);
        this.$.settingPane.selectView(this.$.manualConfig);
    },

    /**
     * Create a fresh account wizard for use on the config scenes.
     */
    makeFreshWizard: function () {
        this.exitedWizard = false;
        this.wizard = new AccountWizard(this, this.validateWizardResult);
        this.$.simpleConfig.setWizardMode(this.wizard);
    },

    /**
     * Load an account for editing on the account configuration scenes.
     * @param {CombinedAccount} combinedAccount -- optional. If undefined, a new account stub will be used
     * @param {Boolean} hasError -- used to display error icons on the edit scenes
     */
    loadAccount: function (account, hasError) {
        this.isExternalLoad = !(enyo.application.accounts);
        this.$.settingPane.selectView(this.$.blank); // ensure blank page is shown
        this.makeFreshWizard();
        this.settingsToUse = undefined;
        this.isEditMode = !!account;
        this.account = account || new CombinedAccount(this.makeDummyAccount(), this.makeDummyMailAccount());

        if (this.account && this.account.getId()) {
            this.checkPasswords(this.showSimpleConfig.bind(this));
            return;
        }

        this.showSimpleConfig(this.account, hasError);
    },

    /**
     * Lookup passwords if they haven't been provided by the user. Used for account modifications.
     * @param {function} onComplete -- completion handler for password lookup, accepting the completed combined account object
     */
    checkPasswords: function (onComplete) {
        var ca = this.account;
        var accountId = ca.getId();

        var gotIn = false, gotOut = ca.getType() === AccountWizard.EAS;
        var parseIn = function (credentials) {
            parseCred("common", credentials);
        };
        var parseOut = function (credentials) {
            parseCred("smtp", credentials);
        };


        EmailAccount.getCredentials(accountId, "common", parseIn);
        if (!gotOut) {
            EmailAccount.getCredentials(accountId, "smtp", parseOut);
        }

        // helper closures. These will carry out the callback on complete
        function checkCredentials(credentials) {
            return credentials && (credentials.password || credentials.securityToken || credentials.authToken) ? EmailAccount.PLACEHOLDER_PASS : "";
        }

        function parseCred(key, credentials) {
            if (key === "smtp") {
                gotOut = true;
                ca.setHasOutPass(checkCredentials(credentials));
            }
            if (key === "common") {
                gotIn = true;
                ca.setHasInPass(checkCredentials(credentials));
            }

            if (gotIn && gotOut) {
                onComplete(ca);
            }
        }
    },

    /**
     * Populate a combind account with data from the database
     * @param {Object} -- raw com.palm.account record to look up com.palm.mail.account information for.
     */
    loadAccountFromDb: function (account) {
        var that = this,
            ca = new CombinedAccount().setAccountData(account);

        function handleMail(resp) {
            var mailAcct = (resp.results && resp.results.length) ? resp.results[0] : undefined;
            if (mailAcct) {
                ca.setPrefsData(mailAcct);
                that.loadAccount(ca);
            }
        }

        this._mailQuery = EmailApp.Util.callService('palm://com.palm.db/find', {query: {from: "com.palm.mail.account:1", "where": [
            {prop: "accountId", "op": "=", "val": ca.getId()}
        ]}}, handleMail);
    },

    /**
     * Mix in properties from source object into a destination object
     * Existing properties (aside from 0, null, empty strings) within the destination object will not be overwritten
     */
    _copyInProps: function (src, dest) {
        if (!src || !dest) {
            return undefined;
        }
        Object.keys(src).forEach(
            function (key) {
                if (!dest[key]) { //overwrite empty strings as well
                    dest[key] = src[key];
                }
            });
        return dest;
    },

    /**
     * Mixes error settings from a failed wizard-validation into
     * the current CombinedAccount object for use in manual configuration.
     */
    mixinErrorSettings: function (toMix) {
        if (this.account && this.account.getId()) {
            return; // don't mix anything in
        }
        var mailAcct = this.account.getPrefsData();
        this._copyInProps(toMix.inConfig, this.account.getPrefsData());
        if (toMix.outConfig) {
            this._copyInProps(toMix.outConfig, mailAcct.smtpConfig);
        }
    },

    /**
     * Used to double check a successful wizard result before sending it onward.
     * Prevents creation of duplicate accounts.
     */
    validateWizardResult: function (result) {
        // we're doing other people's work here, but oh well...
        if (this.exitedWizard) {
            // sending a result after exit confoooozes the cross app ui
            return;
        }
        var respObj = this.wizard.responseObject;
        // dupeCheck requires a templateId
        respObj.templateId = respObj.templateId || respObj.template.templateId;
        if (!this.isEditMode) {
            // TODO: Refactor this. Just a band-aid for now.
            this.$.duplicateCheck.start(respObj, (this.isExternalLoad && this.launchCapability) || "MAIL");
        } else {
            this.sendValidResult(respObj);
        }
    },

    /**
     * Send successful validation result back to the accounts service.
     */
    sendValidResult: function (result) {
        this.$.crossAppResult.sendResult(result);
        this.wizard.resetWizardState(); // don't send anything else
        this.exitedWizard = true;
    },


    /**
     * Handler for the Accounts.DuplicateCheck service.
     * Sends a completed, validated result back to the accounts service.
     */
    newAccountHandler: function (inSender, wizardResult) {
        this.sendValidResult(wizardResult);
    },


    /**
     * Handler for the Accounts.DuplicateCheck service. Notifies the user that an
     * account has already been created with the provided credentials.
     */
    duplicateAccountHandler: function (inSender, wizardResult) {
        // The account already exists
        if (wizardResult.isDuplicateAccount) {
            // user is being silly. Account exists and capability is already turned on. Just get out of here.
            var that = this;
            this.showError({
                title: $L("Oops! Duplicate account"),
                message: $L("That account has already been created."),
                choices: [
                    {label: $L('Done'), value: 'done'}
                ],
                onChoose: function (value) {
                    that.exitWizard();
                }
            });
        } else {
            // The account exists and the capability has been turned on.
            // Modify the result to let the caller know the capability was enabled
            // We shouldn't have to do this either...
            wizardResult.capabilityWasEnabled = true;
            this.sendValidResult(wizardResult);
        }
    },

    /**
     * Cleans up any existing validation attempts/work and exits the wizard.
     */
    exitWizard: function (isRemoval) {
        try {
            this.wizard.stopWizard();
            this.exitedWizard = true;
            // checking method existence rather than external load, because we can
            // get an interleaving between email app, accounts, and email app again
            // when accounts are created through the mail app
            if (this.owner && this.owner.showPreferences) {
                var pwnr = this.owner;
                if (!this.isEditMode || isRemoval) {
                    this.owner.showPreferences();
                } else {
                    this.owner.showAccountSetting(this.account.getId());
                }
            } else {
                this.$.crossAppResult.sendResult({returnValue: false});
            }

        } catch (e) {
            console.log("we can't exit the wizard. " + e.stack);
        }
        this.wizard.resetWizardState();
        this.$.settingPane.selectView(this.$.blank);
    },

    /**
     * Used to display validation errors to the user.
     * @param {Object} toDisplay - JSON object in the format:
     *         {
     *            title {String} : (optional) error box title to display
     *            message {String} : (optional) error text to display
     *            text {String} : (optional) backup text to display
     *            choices {Array of JSON objects} : (optional). Choices to display to the user. See default example below,
     *            onChoose {function} : callback function for choice selection
     *        }
     */
    showError: function (toDisplay) {
        this.$.errorTitle.setContent(toDisplay.title || "");
        // where the heck is this getting changed to 'text'?
        this.$.errorContent.setContent(toDisplay.message || toDisplay.text || "");
        var i = 0, choices = toDisplay.choices || [
            {label: $L('OK'), value: 'dismiss', type: 'dismiss'}
        ], btn;
        // show needed fields
        for (; i < choices.length && i < 3; ++i) {
            btn = this.$["option" + (i + 1)];
            btn.setCaption(choices[i].label);
            btn.option = choices[i].value;
            btn.choiceIdx = i;
            btn.setShowing(true);
        }
        // hide additional fields
        for (; i < 3; ++i) {
            this.$["option" + (i + 1)].setShowing(false);
        }
        this.$.errorDialog.choiceMatters = toDisplay.onChoose;
        this.$.errorDialog.openAtCenter();
    },

    /**
     * Handler for error dialog choice selection. Fires handler for
     * displayed choices, and closes the error dialog.
     */
    checkChoice: function (sender, inevent) {
        if (this.$.errorDialog.choiceMatters) {
            var handler = this.$.errorDialog.choiceMatters;
            var target = this.$[sender.name];
            handler(target && target.option);
        }
        this.$.errorDialog.toggleOpen();
    },

    /**
     * Loader function for cross-app entry. When accessed through the accounts application
     * all initial account/template information will be provided through the window
     * parameters.
     */
    windowParamsChangeHandler: function (inSender, event) {
        var params = event && event.params;
        if (!params) {
            return;
        }
        this.$.settingPane.selectView(this.$.blank);
        this.wizardTemplate = params.template || {};

        // inSender.mode // modify or create
        if (params.account) {
            // need to get our mailAccount part from the db directly
            this.loadAccountFromDb(params.account);
        } else {
            this.loadAccount();
        }

        // TODO: refactor to reflect this
        this.launchCapability = params.capability;
    },

    /**
     * Make a default MailAccount stub for use in initial validation attempts
     * Matches the format of com.palm.mail.account entries.
     */
    makeDummyMailAccount: function (templateId) {
        return {
            encryption: "",
            port: "",
            server: "",
            domain: "",
            smtpConfig: {
                useSmtpAuth: true,
                encryption: "",
                port: "",
                server: ""
            },
            type: (this.wizardTemplate.templateId === "com.palm.eas" ? AccountWizard.EAS : ""),
            templateId: this.wizardTemplate.templateId
        };
    },

    /**
     * Make a default JSON stub for use in initial validation attempts.
     * Matches the format of com.palm.account entries.
     */
    makeDummyAccount: function () {
        var wizTemp = this.wizardTemplate;
        return {
            username: "",
            templateId: wizTemp.templateId,
            templateIcon: ((wizTemp && wizTemp.icon) ? wizTemp.icon.loc_32x32 : "")
        };
    },

    /**
     * This function initiates the UI flow for password policy validation.
     * @param {Object} emailAddress - address for this account (used to verify that the current policy is for this account)
     * @param {Object} onSuccess - optional callback that will be invoked when the user completes the process
     */
    handlePasswordPolicy: function (emailAddress, onSuccess) {
        console.log("SecuritypolicyAssistant.handlePasswordPolicy addr");
        var getPolicies;
        var retryCount = 0;
        var makeRequest = EmailApp.Util.callService;
        var that = this;
        var onFailure = this.removeSecurityPolicies; // doesn't need to be bound
        var successHandler = function (response) {
            if (!response || !response.policy) {
                console.log("SecuritypolicyAssistant.handlePasswordPolicy(): no security policy found in response");
                return;
            }

            console.log("SecuritypolicyAssistant.successHandler");
            var status = response.policy.status;
            var passwordReq = response.policy.password;
            // if password is required and the security policy is not enforced yet,
            // prompt the user to enter password
            if (status && status.enforced === false && passwordReq && passwordReq.enabled === true) {
                // policy id is no longer supplied by SystemManager, so we add it back
                // to policy object.
                response.policy.id = emailAddress;
                that.guardSuccess = onSuccess;
                that.guardFailure = onFailure;
                that.guardCancel = onFailure;
                that.$.pinPoppin.setPolicy(response.policy);
            } else {
                console.log("Success-y time. Aww yeah.");
                onSuccess();
            }
        };

        var failHandler = function (response) {
            ++retryCount;
            console.log("SecuritypolicyAssistant.failHandler %d", retryCount);
            if (retryCount > 3) {
                console.log("SecuritypolicyAssistant.handlePasswordPolicy failed to password policies from systemmanager");
                that.showError({
                    title: $L("Can't add account"),
                    message: $L("Unable to retrieve security policies from the mail server."),
                    choices: [
                        {label: $L('Done'), value: 'done'}
                    ],
                    onChoose: function (value) {
                        if (onCancel) {
                            onCancel();
                        }
                    }
                });
            } else {
                window.setTimeout(getPolicies, 500); // try, try again
            }
        };

        var reqHandler = EmailApp.Util.callbackRouter.bind(this, successHandler, failHandler);

        getPolicies = function () {
            makeRequest("palm://com.palm.systemmanager/getSecurityPolicy", undefined, reqHandler);
        };

        // Workaround
        window.setTimeout(function () {
            getPolicies();
        }, 500);
    },

    guardSuccess: function () {
        // stub. Will be overridden dynamically by SecurityPolicy enforcement code
    },
    guardFailure: function () {
        // stub. Will be overridden dynamically by SecurityPolicy enforcement code
    },
    guardCancel: function () {
        // stub. Will be overridden dynamically by SecurityPolicy enforcement code
    },

    /*
     * Removes a matching, downloaded security policy in cases of account deletion or
     * canceling out of an account setup.
     */
    removeSecurityPolicies: function (accounts) {
        var that = this;
        EmailApp.Util.callService("palm://com.palm.db/del", {
            query: {
                from: "com.palm.securitypolicy.eas:1",
                where: [
                    {"prop": "isTemp", "op": "=", "val": true}
                ]
            }
        }, function () {
            console.log("deleted sec policy");
            that.exitWizard();
        });
    }
});

