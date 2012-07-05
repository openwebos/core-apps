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

enyo.kind({
    name: "SimpleConfig",
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
                    name: "headerImage"
                },
                {     kind: "Control",
                    name: "headerLabel",
                    content: $L("Sign In"),
                    className: ""
                }
            ]
        },
        {className: "accounts-header-shadow"},
        {kind: "Scroller", flex: 1, components: [
            {kind: "Control", className: "box-center", components: [
                {
                    kind: "RowGroup",
                    caption: $L("EMAIL ADDRESS"),
                    className: "accounts-group",
                    components: [
                        {name: "email", kind: "Input", inputType: "email", value: "", spellcheck: false, oninput: "checkUsername", onkeydown: "checkEnter", onblur: "checkUsername", autoCapitalize: "lowercase", autocorrect: false, className: "slartibartfast"}
                    ]
                },
                {
                    name: "easUsernameBlock",
                    kind: "RowGroup",
                    caption: $L("USERNAME"),
                    className: "accounts-group",
                    showing: false,
                    components: [
                        {name: "username", kind: "Input", inputType: "email", value: "", spellcheck: false, oninput: "checkForm", onkeydown: "checkEnter", autoCapitalize: "lowercase", autocorrect: false, className: "slartibartfast"}
                    ]
                },
                {
                    kind: "RowGroup",
                    caption: $L("PASSWORD"),
                    className: "accounts-group",
                    components: [
                        {name: "password", kind: "Input", inputType: "password", value: "", spellcheck: false, oninput: "checkForm", onkeydown: "checkEnter", autocorrect: false, onfocus: "checkPass", className: "slartibartfast"}
                    ]
                },
                { name: "createButton", kind: "ActivityButton", caption: $L("Sign In"), onclick: "validateAccount", className: "enyo-button-dark"},
                { name: "manualButton", showing: false, kind: "Button", caption: $L("Manual Setup"), onclick: "manualSetup"},
                { name: "removeButton", showing: false, kind: "Accounts.RemoveAccount", onAccountsRemove_Done: "doRemovalDone"}
            ]},
        ]},
        {className: "accounts-footer-shadow"},
        {kind: "Toolbar", className: "enyo-toolbar-light", components: [
            { name: "doneButton", kind: "Button", className: "accounts-toolbar-btn", caption: $L("Cancel"), onclick: "doBack"}
        ], tabIndex: -1}
    ],
    create: function () {
        this.inherited(arguments);
        this.createSuccess = enyo.bind(this, this.createSuccess);
    },

    /** check if the enter key was pressed, and treat as tab. If form is complete,
     * enter will submit the form.
     */
    checkEnter: function (target, event) {
        // overwrite with maximum coolness
        this.checkEnter = EmailApp.Util.enterAsTab.bind(this, {
            fieldMatcher: /cRUDAccounts_simpleConfig_/i,
            className: '.slartibartfast',
            completionCheck: this.isFormComplete.bind(this),
            onFormComplete: this.validateAccount.bind(this)
        });
        this.checkEnter(target, event);
    },

    checkUsername: function (target, event) {
        if (this.$.email.getValue() !== "" && !this.account.getInUsername()) {
            this.$.username.setValue(this.wizard.makeEasUsernameFromEmail(this.$.email.getValue()));
            this.$.username.onfocus = null;
            this.$.username.selectAllOnFocus = false;
        }
        this.checkForm();
    },

    checkPass: function () {
        if (this.$.password.getValue() === EmailAccount.PLACEHOLDER_PASS) {
            this.$.password.setValue("");
        }
    },

    setWizardMode: function (wizard) {
        this.wizard = wizard;
        this.editMode = false;
        this.clearFields();
    },

    /**
     * Load a CombinedAccount entry on screen
     * @param {CombinedAccount} toLoad -- account record to display on screen
     */
    loadAccount: function (toLoad) {
        this.account = toLoad;
        this.settingsToUse = undefined;
        this.editMode = !!toLoad && !!toLoad.getId();
        this.$.headerLabel.setContent(this.editMode ? $L("Edit Account") : $L("Sign In"));
        var accts = enyo.application.accounts;
        // exploit lazy eval so we don't get undefined
        var icon = toLoad.getTemplateIcon() || accts && accts.getMailIconFromTemplateId(toLoad.getTemplateId(), true);

        this.$.headerImage.setSrc(icon);


        this._stopButton();
        this.$.email.setValue(toLoad.getEmailAddress());
        this.$.email.setDisabled(this.editMode);

        this.$.username.setValue(toLoad.getInUsername() || "");
        this.$.username.setDisabled(this.editMode);
        this.$.easUsernameBlock.setShowing(toLoad.getType() === AccountWizard.EAS);


        this.$.password.setValue(toLoad.hasInPass() ? EmailAccount.PLACEHOLDER_PASS : "");
        var rawAcctData = toLoad.getAccountData();
        this.$.manualButton.setShowing(!rawAcctData.credentialError);
        if (this.editMode) {
            // disable the launch capability only. If we're in mail, default to mail. Otherwise, we're launched from
            // accounts, so disable everything (undefined)
            // TODO: I have a feeling this line can be simplified
            var isExtLaunch = this.owner.isExternalLoad;
            var capabilityForRemoval = isExtLaunch ? this.owner.launchCapability : "MAIL";
            this.$.removeButton.init(rawAcctData, capabilityForRemoval);
            this.$.removeButton.setShowing(true);
        } else {
            this.$.removeButton.setShowing(false);
        }
        this.checkForm();
    },

    focusPrimary: function () {
        var toFocus = (this.editMode && !this.account.hasInPass()) ? this.$.password : this.$.email;
        toFocus.forceFocus();
    },


    isFormComplete: function () {
        // this will fire a lot, so reuse our regexs
        var emailReg = this.emailReg = this.emailReg || /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,6}) *$/;
        return !!(this.$.email.getValue() && this.$.password.getValue());
    },

    // enable and disabled the signin button based on form completion
    checkForm: function (sender, event) {
        this.$.createButton.setDisabled(!this.isFormComplete());
    },


    clearFields: function () {
        this.$.email.setValue("");
        this.$.password.setValue("");
    },

    validateAccount: function () {
        this.$.createButton.setActive(true);
        if (this.editMode) {
            var toSend = {
                username: this.$.email.getValue(),
                password: this.$.password.getValue(),
                config: this.account.getPrefsData()
            };
            var templateId = this.account.getTemplateId();
            if (templateId) {
                toSend.protocol = this.account.getProtocol();
            }
            // these two are possibly redundant
            //toSend.config.username = toSend.username;
            toSend.config.password = toSend.password;
            this.wizard.accountValidateManual(toSend, this.handleSaveAccount.bind(this), this.createError.bind(this));
        } else {
            // account creation mode
            var wizardPkg = {
                emailAddress: this.$.email.getValue(),
                password: this.$.password.getValue(),
                easUser: ((this.account.getType() === AccountWizard.EAS) ? this.$.username.getValue() : undefined)
            }

            this.wizard.determineAccountSettings(wizardPkg, this.createSuccess.bind(this), this.createError.bind(this));
            /*
             if(!this.account.getType() === AccountWizard.EAS) {
             this.wizard.determineAccountSettings(this.$.email.getValue(), this.$.password.getValue(), this.createSuccess.bind(this), this.createError.bind(this));
             } else {
             this.wizard.determineAccountSettings(this.$.email.getValue(), this.$.password.getValue(), this.createSuccess.bind(this), this.createError.bind(this),
             AccountWizard.EAS, this.$.username.getValue());
             }
             */
        }
    },

    createSuccess: function () {
        console.log("$$$$$$$$$$$$$$$$$$ Great success!!");
        this._stopButton();
        this.owner.validateWizardResult();
    },

    createError: function (err) {
        console.log("Error creating account.");
        this._stopButton();

        var settings = err && err.setupDetails;

        if (err.errorCode === EmailAccountValidation.SECURITY_POLICY_CHECK_NEEDED && settings && settings.protocol === AccountWizard.EAS) {
            this.owner.handlePasswordPolicy(this.$.email.getValue(), this.forceEasSetup.bind(this, settings), function () {
            });
            return;
        }

        // Check if the error is something the user can fix
        var info = EmailAccount.getSetupFailureInfo(err, false, false, err.worstIsOutbound);

        // If the inbound settings worked then save them so that they can be used for Manual Setup
        if (settings && settings.protocol) {
            this.settingsToUse = settings;
        } else {
            this.settingsToUse = undefined;
        }

        // Is there a message to be displayed to the user?
        // Special casing eas because we want to carry over predefined settings for predef eas account
        if (!info.genericError && (!settings || settings.protocol !== AccountWizard.EAS)) {
            // FIXME: using old popup for now since it looks somewhat nicer
            if (false) {
                var choices;

                // Don't show error details for wizard
                info.messageParams.error = null;

                // FIXME retry isn't hooked up yet
                if (info.retry && false) {
                    choices = [
                        {caption: $L("Retry")},
                        {caption: $L("Cancel")}
                    ];
                } else {
                    choices = [
                        {caption: $L("OK")}
                    ];
                }

                MailSetupFailureDialog.displaySetupFailure(this, {
                    messageParams: info.messageParams,
                    choices: choices
                });
            } else {
                // Old popup dialog
                var messageHtml = "";

                if (info.messageParams.introMessage) {
                    messageHtml += enyo.string.escapeHtml(info.messageParams.introMessage);
                }

                if (info.messageParams.errorMessage) {
                    if (messageHtml.length > 0) {
                        messageHtml += "<br><br>";
                    }
                    messageHtml += enyo.string.escapeHtml(info.messageParams.errorMessage);
                }

                var dialogParams = {
                    title: info.messageParams.title,
                    message: messageHtml
                };

                this.owner.showError(dialogParams);
            }
        } else {
            console.log("an error was encountered. Push Manual Setup");
            // The error isn't something the user can fix.  Send them to the advanced screen
            // If an inbound or outbound server was validated, pass on the validated settings to the account wizard
            this.manualSetup();
        }
    },

    // After setting up EAS security policies, call this to create the account without validating
    // Unfortunately the names don't really match up, so we need to fix them up
    forceEasSetup: function (setupDetails) {
        if (setupDetails.protocol !== AccountWizard.EAS) {
            return;
        }
        // TODO: refactor this. This is getting nasty
        var onError = this.easForceValidateError.bind();
        var onSuccess = this.createSuccess.bind();
        this.wizard.accountValidateManual(setupDetails, onSuccess, onError);
    },

    easForceValidateError: function (err) {
        // Check for policy error so we don't go into a loop
        if (err.errorCode === EmailAccountValidation.SECURITY_POLICY_CHECK_NEEDED) {
            // FIXME
            console.log("Another policy error");
            return;
        }
        this.createError(err);
    },

    manualSetup: function () {
        // The use wants to setup their account manually
        console.log("---- manualSetup, yo");
        this.wizard.resetWizardState();
        var $$ = this.$;
        var fieldVals = {
            'email': $$.email.getValue(),
            'username': this.account.getType() === AccountWizard.EAS ? $$.username.getValue() : undefined,
            'password': $$.password.getValue()
        };
        this.owner.showManualConfig(fieldVals, this.settingsToUse);
    },

    _stopButton: function () {
        this.$.createButton.setActive(false);
    },

    doBack: function (sender, event, isRemovalExit) {
        this.owner.exitWizard(isRemovalExit);
    },

    doRemovalDone: function (sender, event) {
        this.doBack(undefined, undefined, true);
    },

    handleSaveAccount: function () {
        // TODO: Refactor the save logic
        var acct = this.wizard.responseObject;
        this.wizard.resetWizardState(); // superfluous reset, but let's see what happens

        acct.config._id = this.account.getPrefsId();
        acct.config.accountId = this.account.getId();
        this._stopButton();

        EmailAccount.saveAccountDetails(acct, this.saveSuccess.bind(this), this.createError.bind(this));
    },

    saveSuccess: function () {
        this.owner.exitWizard();
    }

});
