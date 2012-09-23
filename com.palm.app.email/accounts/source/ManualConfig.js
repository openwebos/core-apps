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
    name: "ManualConfig",
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
                {
                    kind: "Control",
                    name: "headerLabel",
                    content: $L("Create Account"),
                    className: ""
                }
            ]
        },
        {className: "accounts-header-shadow"},
        {kind: "Scroller", flex: 1, components: [
            {kind: "Control", className: "box-center", components: [
                {name: "accountTypeGroup", kind: "RowGroup", className: "accounts-group", caption: $L("ACCOUNT TYPE"), components: [
                    {
                        name: "acctType",
                        kind: "CustomListSelector",
                        label: $L("Protocol"),
                        value: AccountWizard.IMAP,
                        onChange: "accountTypeChanged",
                        items: [
                            {caption: $L("IMAP"), value: AccountWizard.IMAP},
                            {caption: $L("POP"), value: AccountWizard.POP}
                           /* {caption: $L("EAS"), value: AccountWizard.EAS} /* , showing: false */
                        ]
                    }
                ]},
                {
                    name: "addressBlock",
                    kind: "RowGroup",
                    className: "accounts-group",
                    caption: $L("EMAIL ADDRESS"),
                    components: [
                        {name: "email", kind: "Input", inputType: "email", value: "", onkeypress: "isFormComplete", onkeydown: "checkEnter", onkeydown: "checkEnter", spellcheck: false, autocorrect: false, className: "babelfish", onblur: "isFormComplete", autoCapitalize: "lowercase"}
                    ]
                },
                {
                    kind: "RowGroup",
                    className: "accounts-group",
                    caption: $L("INCOMING MAIL SERVER"),
                    components: [
                        {kind: "InputBox", components: [
                            {name: "inHost", kind: "Input", className: "enyo-first", flex: 1, value: "", hint: $L("Server"), spellcheck: false, autocorrect: false, className: "babelfish", autoCapitalize: "lowercase", onkeypress: "isFormComplete", onkeydown: "checkEnter", onblur: "isFormComplete", components: [
                                {content: $L("Server")}
                            ]},
                        ]},

                        {name: "inEas", components: [
                            {kind: "InputBox", components: [
                                {name: "domain", kind: "Input", className: "enyo-middle", flex: 1, value: "", hint: $L("Domain"), spellcheck: false, autocorrect: false, className: "babelfish", autoCapitalize: "lowercase", onkeypress: "isFormComplete", onkeydown: "checkEnter", onblur: "isFormComplete", components: [
                                    {content: $L("Domain")}
                                ]},
                            ]}
                        ]},
                        {kind: "InputBox", components: [
                            {name: "inUser", kind: "Input", className: "enyo-middle", flex: 1, value: "", hint: $L("Username"), spellcheck: false, autocorrect: false, className: "babelfish", autoCapitalize: "lowercase", onblur: "copyUserToOut", onkeypress: "isFormComplete", onkeydown: "checkEnter", components: [
                                {content: $L("Username")}
                            ]}
                        ]},
                        {kind: "InputBox", name: "lastEasRow", components: [
                            {name: "inPassword", kind: "Input", className: "enyo-middle", flex: 1, inputType: "password", value: "", hint: $L("Password"), spellcheck: false, autocorrect: false, className: "babelfish", autoCapitalize: "lowercase", onblur: "copyPassToOut", onkeypress: "isFormComplete", onkeydown: "checkEnter", onfocus: "checkInPass", components: [
                                {content: $L("Password")}
                            ]}
                        ]},
                        {name: "popImapIncoming", components: [
                            {
                                name: "inEncryption",
                                kind: "ListSelector",
                                onChange: "checkInPorts",
                                label: $L("Encryption"),
                                value: ProtocolSettings.NO_ENCRYPTION,
                                items: [
                                    {caption: $L("None"), value: ProtocolSettings.NO_ENCRYPTION},
                                    {caption: $L("SSL"), value: ProtocolSettings.SSL},
                                    {caption: $L("TLS"), value: ProtocolSettings.TLS}
                                ]
                            }

                        ]},
                        {kind: "InputBox", name: "inPortWrapper", components: [
                            {name: "inPort", kind: "Input", className: "enyo-last", inputType: "number", value: "", hint: $L("Port"), spellcheck: false, autocorrect: false, className: "babelfish", flex: 1, autoCapitalize: "lowercase", onkeypress: "isFormComplete", onkeydown: "checkEnter", onblur: "isFormComplete", components: [
                                {content: $L("Port")}
                            ]}
                        ]}

                    ]
                },
                {
                    name: "outSettings",
                    kind: "RowGroup",
                    className: "accounts-group",
                    caption: $L("OUTGOING MAIL SERVER"),
                    components: [
                        {kind: "InputBox", components: [
                            {name: "outHost", kind: "Input", className: "enyo-first", flex: 1, value: "", hint: $L("Server"), spellcheck: false, autocorrect: false, className: "babelfish", autoCapitalize: "lowercase", onkeypress: "isFormComplete", onkeydown: "checkEnter", onblur: "isFormComplete", components: [
                                {content: $L("Server")}
                            ]},
                        ]},
                        {kind: "HFlexBox", align: "center", components: [
                            {flex: 1, content: $L("Use Authentication")},
                            {kind: "ToggleButton", name: "useAuthentication", state: false, onChange: "toggleUseAuth" }
                        ]},
                        {name: "outAuthBlock", kind: "Drawer", style: "margin:-10px;", open: false, components: [
                            {kind: "enyo.RowItem", components: [
                                {kind: "InputBox", components: [
                                    {name: "outUser", kind: "Input", className: "enyo-middle", flex: 1, value: "", className: "babelfish", hint: $L("Username"), spellcheck: false, autocorrect: false, autoCapitalize: "lowercase", onkeypress: "isFormComplete", onkeydown: "checkEnter", onblur: "isFormComplete", components: [
                                        {content: $L("Username")}
                                    ]},
                                ]},
                            ]},
                            {kind: "enyo.RowItem", components: [
                                {kind: "InputBox", components: [
                                    {name: "outPassword", kind: "Input", className: "enyo-middle", flex: 1, inputType: "password", value: "", className: "babelfish", hint: $L("Password"), spellcheck: false, autocorrect: false, autoCapitalize: "lowercase", onkeypress: "isFormComplete", onkeydown: "checkEnter", onblur: "isFormComplete", onfocus: "checkOutPass", components: [
                                        {content: $L("Password")}
                                    ]},
                                ]},
                            ]},
                            {kind: "enyo.RowItem", components: [
                                {
                                    name: "outEncryption",
                                    kind: "ListSelector",
                                    onChange: "checkOutPorts",
                                    label: $L("Encryption"),
                                    value: ProtocolSettings.NO_ENCRYPTION,
                                    items: [
                                        {caption: $L("None"), value: ProtocolSettings.NO_ENCRYPTION},
                                        {caption: $L("SSL"), value: ProtocolSettings.SSL},
                                        {caption: $L("TLS"), value: ProtocolSettings.TLS}
                                    ]
                                },
                            ]},
                            {kind: "enyo.RowItem", className: "enyo-last", components: [
                                {kind: "InputBox", components: [
                                    {name: "outPort", kind: "Input", className: "enyo-last", inputType: "number", value: "", hint: $L("Port"), spellcheck: false, autocorrect: false, flex: 1, autoCapitalize: "lowercase", onkeypress: "isFormComplete", onkeydown: "checkEnter", className: "babelfish", onblur: "isFormComplete", components: [
                                        {content: $L("Port")}
                                    ]},
                                ]}
                            ]}
                        ]}

                    ]
                },
                {
                    name: "imapRoot",
                    kind: "RowGroup",
                    className: "accounts-group",
                    caption: $L("ROOT FOLDER"),
                    components: [
                        {kind: "InputBox", components: [
                            {name: "rootFolder", kind: "Input", value: "", hint: $L("Folder"), flex: 1, className: "babelfish", autoCapitalize: "lowercase"},
                            {content: $L("Folder")}
                        ]}
                    ]
                },
                { name: "createButton", kind: "ActivityButton", caption: $L("Sign In"), onclick: "validateAccount", disabled: true, className: "enyo-button-dark accounts-btn"}
            ]}
        ]},
        {className: "accounts-footer-shadow", tabIndex: -1},
        {kind: "Toolbar", className: "enyo-toolbar-light", components: [
            { name: "doneButton", kind: "Button", caption: $L("Back"), onclick: "doBack", className: "accounts-toolbar-btn"}
        ]}
    ],

    /**
     * Load an account on the scene
     * @param {CombinedAccount} account -- Account entry to load on screen
     * @param {Object} wizard -- account wizard object to use
     */
    loadAccount: function (account, password, wizard) {
        this.isEditMode = !!account.getId();
        this.account = account;

        this.$.headerLabel.setContent(this.isEditMode ? $L("Edit Account") : $L("Create Account"));
        var accts = enyo.application.accounts;
        var icon = account.getTemplateIcon() || accts && accts.getMailIconFromTemplateId(account.getTemplateId(), true);
        this.$.headerImage.setSrc(icon);

        this.wizard = wizard;
        this._loadFields(account, password, this.isEditMode);
        this._showHideFields();
        this.checkAccountTypeDefaults();
        this.isFormComplete();
    },

    accountTypeChanged: function (target, event) {
        this._showHideFields();
        this.checkAccountTypeDefaults();
        this.isFormComplete();
    },

    /**
     * checks to ensure that all required fields have been entered, and enables/disables
     * the create button as needed
     */
    isFormComplete: function (sender, event) {
        var isComplete = this.validateInputs();
        this.$.createButton.setDisabled(!isComplete);
        return isComplete;
    },

    /** check if the enter key was pressed, and treat as tab. If form is complete,
     * enter will submit the form.
     */
    checkEnter: function (target, event) {
        // overwrite with maximum coolness
        this.checkEnter = EmailApp.Util.enterAsTab.bind(this, {
            fieldMatcher: /cRUDAccounts_manualConfig_/i,
            className: '.babelfish',
            completionCheck: this.isFormComplete.bind(this),
            onFormComplete: this.validateAccount.bind(this)
        });
        this.checkEnter(target, event);
    },

    /**
     * Toggles default settings (ie: port numbers) for the current account type.
     */
    checkAccountTypeDefaults: function (sender, event) {
        this.checkInPorts(sender); // pass sender (defined if the protocol is being changed)
        this.checkOutPorts();
        this.validateInputs();
    },


    /**
     * Handler to update inbound port settings with defaults for current account type
     * and encryption settings.
     * If the account already has an alternate port set, the settings are
     * left alone.
     * @param {Object} inSender -- element spouting an event
     */
    checkInPorts: function (inSender) {
        var acctType = this.$.acctType.getValue();
        var currentPort = this.$.inPort.getValue(),
            inEncryption = this.$.inEncryption.getValue();

        if (acctType === AccountWizard.EAS) {
            this.$.inPort.setValue("");
            return;
        }

        if (inSender || !currentPort) { // if encryption changed or port undefined
            if (acctType === AccountWizard.IMAP) {
                this.$.inPort.setValue((inEncryption === ProtocolSettings.SSL) ? 993 : 143);
                return;
            }

            if (acctType === AccountWizard.POP) {
                this.$.inPort.setValue((inEncryption === ProtocolSettings.SSL) ? 995 : 110)
                return;
            }
        }
    },

    /**
     * Handler to update outbound port settings with defaults for current account type
     * and encryption settings.
     * If the account already has an alternate port set, the settings are
     * left alone.
     * @param {Object} inSender -- element spouting an event
     */
    checkOutPorts: function (inSender) {
        var acctType = this.$.acctType.getValue();
        if (acctType === AccountWizard.EAS) {
            return;
        }

        var currentPort = this.$.outPort.getValue();

        if (inSender || !currentPort) { // if encryption changed or port undefined
            var outEncryption = this.$.outEncryption.getValue();

            if (outEncryption === ProtocolSettings.SSL) {
                port = 465;
            } else if (currentPort != 587) {
                port = 25;
            } else {
                port = currentPort;
            }

            this.$.outPort.setValue(port);
            return;
        }
    },

    /**
     * Used to determine whether form is complete. Checks for valid email addresses, server settings, etc.
     * for the currently selected account type. Returns true if the form is complete, false otherwise.
     */
    validateInputs: function () {
        // this will fire a lot, so reuse our regexs
        var emailReg = this.emailReg = this.emailReg || /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,6}) *$/;
        var hostReg = this.hostReg = this.hostReg || /^([A-Za-z0-9_\-\.\/:])+(\.[A-Za-z]{2,6}|(\.[0-9]{1,3}){3}) *$/;
        var easHostReg = this.easHostReg = this.easHostReg || /^([A-Za-z0-9_\-\.\/:])+(\.[A-Za-z]{2,6}|(\.[0-9]{1,3}){3})/;

        // Make sure all the server settings are valid
        // Validate the email address
        if (!this.isEditMode && !emailReg.test(this.$.email.getValue())) {
            //	console.log("### no email");
            return false;
        }
        var pass = this.$.inPassword.getValue();
        if (!pass) {
            //		console.log("### no password");
            return false;
        }

        if (!this.$.inUser.getValue().trim()) {
            //	console.log("### no username");
            return false;
        }

        var inHost = this.$.inHost.getValue();
        if (this.$.acctType.getValue() === AccountWizard.EAS) {
            // Validate the server settings
            if (!easHostReg.test(inHost)) {
                //		console.log("### no EAS inHost");
                return false;
            }
            // Don't validate the domain.  It can be left blank
            return true;
        }

        // Continue validating IMAP and POP
        if (!hostReg.test(inHost)) {
//			console.log("### no inHost");
            return false;
        }
        var inPort = this.$.inPort.getValue();
        if (inPort < 1 || inPort > 65535) {
            //		console.log("### invalid in ports");
            return false;
        }

        if (!hostReg.test(this.$.outHost.getValue())) {
            //		console.log("### no out server");
            return false;
        }
        if (this.$.useAuthentication.getState() && (!this.$.outUser.getValue().trim() || !this.$.outPassword.getValue().trim())) {
            //		console.log("### no out user or pass");
            return false;
        }

        var outPort = this.$.outPort.getValue()
        if (outPort < 1 || outPort > 65535) {
            //		console.log("### invalid out ports");
            return false;
        }
        // IMAP root folder can be blank
        //	console.log("### looking good!");
        return true;
    },


    /**
     * wrapper function. Copies inbound username to outbound server setting block.
     */
    copyUserToOut: function (sender, event) {
        this._copyToOut("User");
    },

    /**
     * Used to copy inbound user or password settings to outbound settings.
     * @param {String} identifier -- element to copy over. "User" for username, "Password" for password
     */
    _copyToOut: function (identifier) {
        if (identifier !== "User" && identifier !== "Password") {
            return;
        }
        var inVal = this.$["in" + identifier].getValue(), outField = this.$["out" + identifier];
        if (inVal && inVal.length && !outField.getValue().length) {
            outField.setValue(inVal);
        }
        this.isFormComplete();
    },

    /**
     * wrapper function. Copies inbound password to outbound server setting block.
     */
    copyPassToOut: function (sender, event) {
        this._copyToOut("Password");
    },

    /**
     * clears out the outbound username and password fields.
     */
    clearOutboundCredentials: function () {
        this.$.outUser.setValue("");
        this.$.outPassword.setValue("");
    },

    /**
     * Used to validate email account settings against the server.
     * Supplies form inputs to account wizard.
     * Used both as a click handler, and a direct-call method.
     * Accepts an optional boolean argument (true) to force validation
     * of an account that would otherwise encounter an error.
     */
    validateAccount: function () {
        var dontValidate = false;
        if (arguments.length === 1) {
            if (typeof arguments[0] === 'boolean') {
                // direct call here. Take the flag.
                dontValidate = arguments[0];
            }
        }
        this.$.createButton.setActive(true);
        var toUse = this.makeAccountJson();
        toUse.dontValidate = dontValidate // used for forcing account creation
        var successCall = !!this.isEditMode ? this.handleSaveAccount : this.createSuccess;
        var failCall = this.createError;
        this.wizard.accountValidateManual(toUse, successCall, failCall);
    },

    /**
     * Wraps up form inputs into a JSON block expected by the AccountWizard.
     * Returns fully formed ProtocolSettings JSON, complete with incoming
     * and outgoing server settings, template ids, usernames, and passwords.
     */
    makeAccountJson: function () {
        var toUse = {
            username: this.$.email.getValue(),
            password: this.$.inPassword.getValue(),
            config: {
                protocol: this.$.acctType.getValue(),
                domain: this.$.domain.getValue(),
                encryption: this.$.inEncryption.getValue(),
                port: this.$.inPort.getValue(),
                server: this.$.inHost.getValue(),
                password: this.$.inPassword.getValue(),
                username: this.$.inUser.getValue(),
                smtpConfig: {
                    useSmtpAuth: this.$.useAuthentication.getState(),
                    encryption: this.$.outEncryption.getValue(),
                    port: this.$.outPort.getValue(),
                    server: this.$.outHost.getValue(),
                    password: this.$.outPassword.getValue(),
                    username: this.$.outUser.getValue(),
                }
            }
        }

        // Add protocol-specific stuff
        if (this.account.getType() === AccountWizard.IMAP && this.isEditMode) {
            toUse.config.rootFolder = this.$.rootFolder.getValue();
        }

        var templateId = this.account.getTemplateId();
        if (templateId) {
            // TODO combine this and SimpleConfig's matching code into a util method
            toUse.protocol = templateId.substring(templateId.lastIndexOf("."), templateId.length).toUpperCase();
        }

        if (this.account.isPrefsDataLinked()) {
            var conf = toUse.config;
            conf._id = this.account.getPrefsId();
            conf.accountId = this.account.getId();
        }
        return toUse;
    },

    /**
     * Tap handler for inbound password field. If the placeholder password
     * is present, clears out the field so the user can type.
     */
    checkInPass: function () {
        if (this.$.inPassword.getValue() === EmailAccount.PLACEHOLDER_PASS) {
            this.$.inPassword.setValue("");
            this.checkOutPass();
        }
    },

    /**
     * Tap handler for outbound password field. If the placeholder password
     * is present, clears out the field so the user can type.
     */
    checkOutPass: function () {
        if (this.$.outPassword.getValue() === EmailAccount.PLACEHOLDER_PASS) {
            this.$.outPassword.setValue("");
        }
    },


    /**
     * Handler for the account wizard. Fires in cases where the account
     * has validated successfully.
     * REFAC -- pull this section up into the owner
     */
    createSuccess: function () {
        this._stopButton();
        this.owner.validateWizardResult();
    },

    /**
     * Handler for the account wizard. Fires in cases where the account
     * settings cannot be validated. Reports an errors to the user through
     * the ui, with the following guidelines:
     * -- Non-recoverable errors show MailSetupFailureDialog
     * -- Workable errors (ie: inbound validated, but not outbound) prompt the user with  a 'create anyway' dialog.
     *
     * REFAC -- pull this section up into the owner
     *
     * @param {Object} err -- JSON error block to display to the user, with the format
     * {
     *        "errorCode": ERROR_CONSTANT, // Email App account errors. Defined in EmailAccountValidation
     *        "errorText": "Error string to present to user"
     *    }
     *
     */
    createError: function (err) {
        console.log("----------- CreateAssistant createError error=" + err.errorText);
        this._stopButton();
        var acctType = this.$.acctType.getValue();
        if (acctType === AccountWizard.EAS && err.errorCode === EmailAccountValidation.SECURITY_POLICY_CHECK_NEEDED) {
            console.log("security policy error");
            // EAS security policy
            var createAccount = this.handleCreateAccountAnyway.bind(this);
            var cancelCreate = this.owner.exitWizard;
            this.owner.handlePasswordPolicy(this.$.email.getValue(), createAccount);
        } else if (acctType !== AccountWizard.EAS && err.setupDetails && err.setupDetails.inSetWrapper && err.setupDetails.inSetWrapper.result === 0) {
            console.log("inbound settings worked....prompt user to create account anyway.");
            // The inbound settings validated.  Ask the user if the account should be created without outbound credentials
            this.promptCreateAccountAnyway(err);
        } else {
            // Show the error dialog
            console.log("manualConfig.createError Display an account setup failure");

            // Get messages for error dialog
            var info = EmailAccount.getSetupFailureInfo(err, true, (acctType === AccountWizard.EAS), err.worstIsOutbound);

            var choices = [
                {caption: $L("OK")}
            ];

            if (info.sslError) {
                choices.unshift({caption: $L("Open Certificate Manager"), onclick: "openCertificateManager"});
            }

            var isConnection = enyo.application.isConnectionAvailable;
            if (info.connectionError && (isConnection && !isConnection())) {
                // if connection error was returned, and matching network status.
                // Do this here rather than up front, as user might be attempting
                // to connect to an internal server.
                info.title = $L("No Connectivity");
            }

            MailSetupFailureDialog.displaySetupFailure(this, {
                messageParams: info.messageParams,
                choices: choices
            });
        }
    },

    /**
     * Handler for SSL errors. Opens the certificate manager for importing of server 'credentials'.
     */
    openCertificateManager: function () {
        EmailApp.Util.callService("palm://com.palm.applicationManager/launch", {id: "com.palm.app.certificate"});
    },

    /**
     * Dialog to allow user to force account creation, in spite of validation errors
     * @param {Object} err -- JSON error block to display to the user, with the format
     * {
     *        "errorCode": ERROR_CONSTANT, // Email App account errors. Defined in EmailAccountValidation
     *        "errorText": "Error string to present to user"
     *    }
     */
    promptCreateAccountAnyway: function (err) {
        var info = EmailAccount.getSetupFailureInfo(err, true, false);

        var choices = [
            {caption: $L("Edit settings"), className: "enyo-button-dark", onclick: "focusOutHost"},
            {caption: $L("Set up anyway"), className: "enyo-button-negative", onclick: "handleCreateAccountAnyway"}
        ];

        // Set up title and intro text
        info.messageParams.title = $L("Outgoing server setup");
        info.messageParams.introMessage = $L("Unable to validate outgoing mail server settings. You will be able to receive emails, but may not be able to send emails from this account.");

        MailSetupFailureDialog.displaySetupFailure(this, {
            messageParams: info.messageParams,
            choices: choices
        });
    },

    /**
     * Like the name says. Force focus on the outbound host/server field.
     */
    focusOutHost: function () {
        this.$.outHost.forceFocus();
    },

    /**
     * Used to force validate an account in cases of validation errors.
     * Method is accessed via user confirmation/action (ie: confirmation
     * of 'CreateAccountAnyway' prompt, or setting a device pin/password
     * after policy is downloaded)
     */
    handleCreateAccountAnyway: function () {
        // Don't validate the account; just run through to collect the credentials
        // in the proper format
        this.validateAccount(true);
    },


    /**
     * Handler for account modifications. Fires after successful account validation,
     * or user-override of validation errors. Saves all data to the database.
     */
    handleSaveAccount: function () {
        var acct = this.wizard.responseObject; // error case will not have a usable config block from the server
        acct.config._id = this.account.getPrefsId();
        acct.config.accountId = this.account.getId();
        EmailAccount.saveAccountDetails(acct, this.saveSuccess, this.createError);
    },

    /**
     * Handler for successful account db record update. Stops button animations and exits the wizard.
     */
    saveSuccess: function () {
        this._stopButton();
        this.owner.exitWizard();
    },

    /**
     * Stops spinning animation on the 'Sign In' button and re-enables the button.
     */
    _stopButton: function () {
        this.$.createButton.setActive(false);
    },

    /**
     * Show and hide input fields and dropdowns based on an account type,
     * and current edit/create state for the account.
     * @param {String} accountType -- should be one of the following
     * AccountWizard constants:
     * -- AccountWizad.EAS
     * -- AccountWizad.IMAP
     * -- AccountWizad.POP
     */
    _showHideFields: function () {
        var $$ = this.$;
        var accountType = $$.acctType.getValue();
        var isEas = accountType === AccountWizard.EAS;
        $$.popImapIncoming.setShowing(!isEas);
        $$.outSettings.setShowing(!isEas);
        $$.inPortWrapper.setShowing(!isEas);
        $$.inEas.setShowing(isEas);
        $$.imapRoot.setShowing(accountType === AccountWizard.IMAP && this.isEditMode);
        $$.addressBlock.setShowing(!this.isEditMode);
        $$.outAuthBlock.setOpen($$.useAuthentication.getState());
        if (isEas && !$$.lastEasRow.hasClass(this.LAST_ROW_CLASS)) {
            console.log("### set the last class");
            $$.lastEasRow.setClassName(this.LAST_ROW_CLASS);
            $$.inPassword.setClassName(this.LAST_ROW_CLASS);
        } else if (!isEas && $$.lastEasRow.hasClass(this.LAST_ROW_CLASS)) {
            console.log("### clear the last class");
            $$.lastEasRow.setClassName("");
            $$.inPassword.setClassName("enyo-middle");
        }
    },


    /**
     * Populate fields with currently supplied data.
     * @param {CombinedAccount} account -- account entry to load
     * @param {String} password -- password to load on screen (carried over from simple config)
     * @param {Boolean} isEditMode -- used to disable certain fields in account editing
     *
     */
    _loadFields: function (account, password, isEditMode) {
        var $$ = this.$;

        $$.email.setValue(account.getEmailAddress());
        $$.email.setDisabled(isEditMode);

        $$.acctType.setValue(account.getType());
        // only show account type selection if we're not in edit mode and we're not setting
        // up an exchange account explicitly (user can still toggle to exchange if they're creating
        // a generic email account
        $$.accountTypeGroup.setShowing(!this.isEditMode && account.getType() !== AccountWizard.EAS);
        $$.inEncryption.setValue(account.getInEncryption());
        $$.inPort.setValue(account.getInPort() || "");
        $$.inPassword.setValue(password || (account.hasInPass() ? EmailAccount.PLACEHOLDER_PASS : ""));
        $$.inHost.setValue(account.getInServer() || ((!isEditMode && account.getType() === AccountWizard.EAS) ? "https://" : ""));
        $$.domain.setValue(account.getDomain() || "");
        $$.inUser.setValue(account.getInUsername() || account.getEmailAddress() || "");
        $$.inUser.setDisabled(isEditMode && account.getType() === AccountWizard.EAS);

        $$.useAuthentication.setState(account.isSmtpAuthEnabled() !== false);
        $$.outEncryption.setValue(account.getOutEncryption());
        $$.outPort.setValue(account.getOutPort() || "");
        $$.outHost.setValue(account.getOutServer());
        $$.outUser.setValue(account.getOutUsername() || account.getInUsername() || account.getEmailAddress());
        $$.rootFolder.setValue(account.getRootFolder() || "");

        // google and yahoo accounts won't have outbound passwords, because only the inbound password is used
        // best check is just for inbound password
        $$.outPassword.setValue(account.hasInPass() ? EmailAccount.PLACEHOLDER_PASS : "");

    },

    /**
     * scene creation method. Hooks up bound versions of event handlers.
     */
    create: function () {
        this.inherited(arguments);
        this.handleSaveAccount = this.handleSaveAccount.bind(this);
        this.createSuccess = this.createSuccess.bind(this);
        this.createError = this.createError.bind(this);
        this.saveSuccess = this.saveSuccess.bind(this);
    },

    /**
     * Updates username and password in
     */
    toggleUseAuth: function (sender, event) {
        var block = this.$.outAuthBlock,
            toggle = this.$.useAuthentication;

        block.setOpen(toggle.getState());
        if (block.getOpen()) { // might not be necessary
            this.copyUserToOut();
            this.copyPassToOut();
        } else {
            this.clearOutboundCredentials();
        }
    },

    /**
     * exit the scene. Return to the simple configuration/wizard view.
     */
    doBack: function () {
        this.owner.showSimpleConfig();
    },
    LAST_ROW_CLASS: "enyo-last"
});
