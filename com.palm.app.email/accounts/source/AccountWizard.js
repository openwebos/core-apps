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

/** Notes:
 *
 * The Accounts Service triggers various procedures for account actions, including:
 * - kicks off initial syncs upon account creation
 * - kicks off PIM data deletion upon capability removal
 * - calls all overriding validators upon password change to generate custom auth tokens
 */
/** further notes:
 *  we won't be needing the following protocolSetting properties
 protocol:&nbsp; protocol constant, as defined in AccountWizard. Can be SSL, EAS, POP, etc.
 ssl: boolean;
 tls:&nbsp; boolean, default false
 policyKey: optional. usually null
 protocolVersion: optional. String denoting version of protocol used;
 priority: priority for account. higher number is a higher priority //reversed, but that's what they have
 result: integer showing validation result. Defaults to EmailAccountValidation.UNKNOWN;

 Keep track of outstanding requests and protocol priorities in a hash map.
 *
 * @param {Object} assistant
 */

// TODO: Change AccountWizard to AppAssistant.AccountWizard
var AccountWizard = function (assistant) {
    // service thread is not needed, but keeping around just to ensure I have everything translated first
    // All instance variables defined here
    this.timeoutShortened = false;
    this.timer = undefined;
    this.smtpSyncProcess = undefined;
    this.smtpSyncThread = undefined;
    this.isManualSetup = false;
    this.isPredefinedDomain = false;

    this.bestServerMessage = "";
    this.rootFolder = undefined;
    this.requests = [];
    this.assistant = assistant;
    this.templateList = this.assistant.templateList;

    if (!this.templateList) {
        // will be used for password validate logic
        this.isValidationOnly = true;
        this._getTemplateList();
    } else {
        this._parseTemplates();
    }

    this.resetWizardState(); // initialize request count to 0
};


/**
 * Last line of defence for email account setting retrieval. Attemp
 * to retrieve settings through the server prefix
 */
AccountWizard.prototype._attemptServerPrefix = function (emailAddress, password, domain, bestMxServer) {

    // Store static constants locally
    var S_PREFIX = AccountWizard.S_PREFIX, S_TYPE = AccountWizard.S_TYPE, S_PORT = AccountWizard.S_PORT, S_SSL = AccountWizard.S_SSL, S_PRIORITY = AccountWizard.S_PRIORITY, SMTP = AccountWizard.SMTP;
    var ServerConfig = AccountWizard.ServerConfig;

    // TODO: Ideally, we'd use the server domain, the MX server domain,
    // and appropriate prefixes of the MX server domain to guide this process.
    //
    // It would need to be smart enough to know that a MX record like mailhost.domain.com
    // can be used to check for subdomains like imap.domain.com and smtp.domain.com,
    // but also needs to be careful for more complex cases like mx1.mail.example.k12.ca.us
    var server = "";
    for (var i = 0; ServerConfig[i][S_TYPE] !== ""; i++) {
        // Create the server information
        // incoming server ProtocolSettings
        server = domain;
        if (ServerConfig[i][S_PREFIX]) {
            server = ServerConfig[i][S_PREFIX] + "." + server;
        }

        //this.log("Attempting server prefix. This is the server: ___", server);

        var data = new ProtocolSettings({
            "email": emailAddress,
            "username": emailAddress,
            "password": password,
            "domain": domain,
            "server": server,
            "protocol": ServerConfig[i][S_TYPE],
            "port": ServerConfig[i][S_PORT],
            "ssl": ServerConfig[i][S_SSL],
            "tls": false,
            "priority": ServerConfig[i][S_PRIORITY]
        });

        // If there is no transport the skip this
        if (data.protocol !== SMTP) {
            // attempt validation. If no transport, skip to next ServerConfig
            if (!this._validateProtocolSettings(data)) {
                continue;
            }
        }
        else {
            // Validate the SMTP account
            this._validateSMTPSettings(data);
        }
    }
};

/**
 * Attempt login to a yahoo account
 * @param {Object} emailAddress
 * @param {Object} password
 * @param {Object} domain
 * @param {Object} mxServer
 */
AccountWizard.prototype.attemptYahooAccount = function (emailAddress, password, domain, mxServer) {

    this.log("Wizard: Found Yahoo domain - " + domain);
    this.isPredefinedDomain = true;

    // If Yahoo IMAP is supported then use it, otherwise default to existing logic
    // TODO: Verify against old yahoo prefs logic

    //ProtocolSettings -- inbound
    var protData = new ProtocolSettings({
        "protocol": AccountWizard.YAHOO,
        "priority": AccountWizard.MAX_PRIORITY,
        "username": emailAddress,
        "email": emailAddress,
        "password": password
    });

    // TODO: Remove this cheap workaround for transport
    this.validateOutbound = false;
    protData.protSet.config = {
        "email": emailAddress,
        "username": emailAddress.substring(0, emailAddress.indexOf("@")),
        "server": "palm.imap.mail.yahoo.com",
        "port": 993,
        "encryption": ProtocolSettings.SSL,
        "smtpConfig": {
            "server": "palm.smtp.mail.yahoo.com",
            "useSmtpAuth": true,
            "port": 465,
            "encryption": ProtocolSettings.SSL
        }
    };

    // Attempt to login to this server
    this._validateProtocolSettings(protData, "yahoo");

    // All the possible requests have been generated now
    this.doneGeneratingRequests = true;
};

/**
 * Retrieve an account template for the provided protocol type string.
 * Returns undefined if no matching template is found.
 * @param {Object} protType
 */
AccountWizard.prototype.getTemplateForProtocol = function (protType) {
    if (!protType) {
        return undefined;
    }
    return this.protTemplates[protType]; // can be undefined
};

/**
 * REFAC
 * This used to be more extensive. Need to just combine this with resetWizardState.
 */
AccountWizard.prototype.cleanup = function () {
    this.resetWizardState();
};


/**
 *  Attempts retrieval of account settings for well known domain names.
 *  Does a static database lookup to see if this is a known domain
 *    Or if the MX server belongs to a known domain. If the domain is found,
 *  account settings are retrieved.
 * @param {Object} emailAddress
 * @param {Object} password
 * @param {Object} domain
 * @param {Object} bestMxServer
 */
AccountWizard.prototype._attemptWellKnownDomain = function (emailAddress, password, domain, bestMxServer) {

    // Store static constants locally
    var PredefinedAccounts = AccountWizard.PredefinedAccounts;
    var DB_NAME = AccountWizard.DB_NAME, DB_DOMAIN = AccountWizard.DB_DOMAIN, DB_TYPE = AccountWizard.DB_TYPE, DB_OUT_AUTH = AccountWizard.DB_OUT_AUTH;

    // Special-case google.com, since it appears in our table as gmail.com
    // handles hosted domains at google
    if (AccountWizard._isGoogleMXServer(bestMxServer)) {
        this.log("This is a google MX server");
        bestMxServer = "gmail.com";
    }


    // fire off validation requests for matching predefined domain names
    for (var i = 0; PredefinedAccounts[i][DB_NAME] !== ""; i++) {
        var predefinedDomain = PredefinedAccounts[i][DB_DOMAIN];
        if (predefinedDomain === domain || AccountWizard.isDomainMxServer(predefinedDomain, bestMxServer)) {
            // Found a domain that matches (there could be more than 1)
            this.isPredefinedDomain = true;

            // Validate the inbound server
            var data = new ProtocolSettings({
                "accountType": "inbound",
                "predefArray": PredefinedAccounts[i],
                "email": emailAddress,
                "username": emailAddress,
                "password": password
            });
            // If there is no transport then skip this account
            if (!this._validateProtocolSettings(data)) {
                continue;
            }

            // Validate SMTP settings
            if (PredefinedAccounts[i][DB_OUT_AUTH] === "NO AUTH") {
                emailAddress = "";
                password = "";
            }
            // outbound ProtocolSettings
            var dataSMTP = new ProtocolSettings({
                "accountType": "outbound",
                "predefArray": PredefinedAccounts[i],
                "email": emailAddress,
                "username": emailAddress,
                "password": password
            });
            this._validateSMTPSettings(dataSMTP);
        }
    } // end for loop
};

/**
 * Event handler for account valication, whether success or failure
 * @param {Object} protWrapper: protocol settings wrapper
 * @param {Object} serverMessage: String
 */
AccountWizard.prototype._handleValidationResponse = function (protWrapper, resp) {
    if (this.wizardHasExited) {
        console.log("Received response for cancelled request. What's going on?");
    }

    this._determineBestServers(protWrapper, resp);

    if (this._maybeAdjustAndRetry(protWrapper)) {
        return;
    }
    // determine whether or not to return result to user
    this._evaluateReturnStatus();
};


/** REFAC
 * Evaluates a new validation response against the current best to determine
 * strongest response.
 * *** NOTE: this is a bit messy, with side effects on the following 4 variables:
 * ***  -- bestInboundServer
 * ***  -- bestInboundResponse
 * ***  -- bestOutboundServer
 * ***  -- bestOutboundResponse
 * @param {Object} protWrapper -- protocolWrapper for current validation response
 * @param {Object} resp -- actual validation response
 */
AccountWizard.prototype._determineBestServers = function (protWrapper, resp) {
    // Save this result if it is better than the current best result
    if (protWrapper.protocol !== AccountWizard.SMTP) {
        // This is an in-bound mail server.  Pick the best result
        this.bestInboundServer = this._pickBestResult(this.bestInboundServer, protWrapper);
        // Save the message the server returned in case the user needs to see it
        if (this.bestInboundServer === protWrapper) {
            this.bestServerResponse = resp;
        }
    } else {
        // This is an out-bound server.  Pick the best result
        this.bestOutboundServer = this._pickBestResult(this.bestOutboundServer, protWrapper);
        if (this.bestOutboundServer === protWrapper) {
            this.bestOutboundServerResponse = resp;
        }
    }
};


/**
 * Determine whether the validation inputs need to be reparsed and validatation attempted again.
 * Returns true if retry is needed, false otherwise
 * @param {Object} protWrapper
 */
AccountWizard.prototype._maybeAdjustAndRetry = function (protWrapper) {
    // If the transport returned "Invalid user name/password" then try email address as login
    var data = protWrapper.protSet;
    if (this.isManualSetup ||
        protWrapper.result !== EmailAccount.BAD_USERNAME_OR_PASSWORD ||
        protWrapper.protocol === AccountWizard.EAS) {
        return false;
    }
    this.log("Wizard: Username/password failed.");
    var email = data.username; // data.username is the email address used by accounts
    this.log("Wizard: email address is ___", email);
    // Try again, this time using the email address as the user name
    if (email && data.config && (!data.config.username || data.config.username === email)) {
        data.config.username = email.substring(0, email.indexOf("@"));
        protWrapper.result = EmailAccountValidation.UNKNOWN;
        this.log("Wizard: Trying again, using username instead of email address to login");

        if (protWrapper.protocol !== AccountWizard.SMTP) {
            // can short-circuit here if transport is pulled successfully
            var validProtocol = this._validateProtocolSettings(protWrapper);

            if (validProtocol) {
                --this.numberOfRequests;
            }

            return validProtocol;
        } else {
            // Validate the SMTP account
            this._validateSMTPSettings(protWrapper);
            --this.numberOfRequests;
            return true;
        }
    }
    return false;
};

// Should the response be returned to the user now?  Yes, if there are no more
// outstanding results or the "perfect" result has been received
AccountWizard.prototype._evaluateReturnStatus = function () {

    var perfectInbound = this._isPerfectResult(this.bestInboundServer);
    var perfectOutbound = (!this.validateOutbound) ? true : this._isPerfectResult(this.bestOutboundServer);

    if (--this.numberOfRequests < 1 || (perfectInbound && perfectOutbound)) {
        this.log("Wizard: Got all responses or the best result");

        // all responses have been received
        // final catch-all for doneGenerating requests flag
        this.doneGeneratingRequests = true;
        this._clearWizardTimeout();
        this.returnWizardResultToUser();
    } else if (!this.timeoutShortened) {
        // If there is a "good enough" response then wait at most 2 more seconds
        // For example, if a server only allows POP access then this isn't a perfect response, but it is good
        // enough for the user to be able to get email.  While we're waiting, the "perfect" response (IMAP) may come in
        // and that will be selected - but we don't want to wait too long in case IMAP isn't supported.
        var goodEnoughInbound = this._isGoodEnoughResult(this.bestInboundServer);
        var goodEnoughOutbound = (!this.validateOutbound) ? true : this._isGoodEnoughResult(this.bestOutboundServer);
        if (goodEnoughInbound && goodEnoughOutbound) {
            this.log("Wizard: Results are good enough.  Reducing timeout to 2 seconds");
            // Timeout in 2 seconds from now
            this.setWizardTimeout(2);
            this.timeoutShortened = true;
        }
    } else {
        this.log("Waiting on  ___ additional responses. Hold off returning result. Done generating requests? ___", this.numberOfRequests, this.doneGeneratingRequests);
    }
};

/**
 * returns true if the passed protocolSet has a result of EmailAccount.VALIDATED,
 * false otherwise
 * @param {Object} protSet -- protocolSet wrapper
 */
AccountWizard.prototype._isGoodEnoughResult = function (protSet) {
    return (protSet && protSet.result === EmailAccount.VALIDATED);
};


/**
 * Returns true if is validation response is a goodEnoughResult for a maximum
 * priority request (AccountWizard.MAX_PRIORITY)
 * TODO: Check if we need these MAX_PRIORITY checks anymore
 * @param {Object} protSet
 */
AccountWizard.prototype._isPerfectResult = function (protSet) {
    return (this._isGoodEnoughResult(protSet) && protSet.priority === AccountWizard.MAX_PRIORITY);
};


/**
 * Cancel any outstanding timeouts and/or requests, and reset all wizard state flags
 */
AccountWizard.prototype.resetWizardState = function () {
    // Has the result been returned to the user yet?
    // clear any outstanding timeouts
    this._clearRequests();

    this.doneGeneratingRequests = false;
    this.bestInboundServer = undefined;
    this.bestOutboundServer = undefined;

    this.bestServerResponse = undefined;
    this.bestOutboundServerResponse = undefined;
    this.validateOutbound = true;

    this.rootFolder = undefined;
};

/**
 * Cancel all outstanding validation requests, and discard their handles.
 */
AccountWizard.prototype._clearRequests = function () {
    this._clearWizardTimeout();
    while (this.requests.length > 0) {
        this.requests.pop().cancel();
    }
    this.numberOfRequests = 0;
};

/*
 * Return the result of the wizard to the user.  Either the maximum time for the wizard to run was exceeded,
 * or there was a successful result that should be returned to the user now
 */
AccountWizard.prototype.returnWizardResultToUser = function () {
    if (this.wizardHasExited) {
        console.log("Wizard has already exited");
        return;
    }
    this._clearRequests();
    var accountValidated = this._transportsValidated();
    this.log("Wizard: returnWizardResultToUser. requests outstanding=___", this.numberOfRequests);
    // Was there a successful result?
    if (accountValidated) {
        this.log("We have a successful result");
        // Create the account now
        this._createAndSendResponse();
    } else {
        this.log("OOPS. No successful results.");
        // Generate error message
        var error = this._determineWorstResult();
        console.log("we have our worst result:", error.errorCode);
        this.onWizardError(error);
        console.log("called onWizardError");
    }
    this.stopWizard(); // set exit flag
};


/**
 * returns true if both inbound and outbound transports have validated
 * to a successful/usable degree. False otherwise.
 */
AccountWizard.prototype._transportsValidated = function () {
    // In-bound is validated if a validated result was received
    var inboundValidated = this._isInboundValidated();
    this.log("inbound validated? " + inboundValidated);
    if (!inboundValidated) {
        return false;
    }

    // Out-bound is validated if:
    // 1. In-bound validation succeeded, and the account is EAS
    // 2. Out-bound validation succeeded
    // only place where this flag is determined. not breaking into a method
    var outboundValidated = (inboundValidated && (!this.validateOutbound || this.bestInboundServer.protocol === AccountWizard.EAS)) ||
        (!!this.bestOutboundServer && this.bestOutboundServer.result === EmailAccount.VALIDATED);

    this.log("outbound validated? " + outboundValidated);
    return inboundValidated && outboundValidated;
};

AccountWizard.prototype._isInboundValidated = function () {
    return !!this.bestInboundServer && this.bestInboundServer.result === EmailAccount.VALIDATED;
};

/**
 * Method to determine the error to display to the user. This will see if any results
 * outright failed, or if any results did not come back successfully
 */
AccountWizard.prototype._determineWorstResult = function () {
    //console.log("determining worst result");
    var inboundValidated = this._isInboundValidated();
    var errorText = "Wizard: Unable to determine settings"; // DO NOT LOCALIZE
    var setupDetails = {};
    // If an inbound or outbound account was validated then return that to the UI so that
    // the Manual Setup screen can be prepopulated
    // Also send for EAS accounts if there's a security policy error
    if (this.bestInboundServer &&
        (inboundValidated ||
            (this.bestInboundServer.result <= EmailAccountValidation.SECURITY_POLICY_CHECK_NEEDED &&
                this.bestInboundServer.protocol === AccountWizard.EAS))) {
        // copy over relevant info. Don't send the source object since
        // it could contain private user info
        var bestInServer = this.bestInboundServer;
        var bestOutServer = this.bestOutboundServer;
        setupDetails.protocol = bestInServer.protocol;
        setupDetails.inSetWrapper = bestInServer;
        setupDetails.outSetWrapper = bestOutServer;
        // convenience attribs for failover to manual setup
        setupDetails.inConfig = bestInServer.protSet.config;
        setupDetails.outConfig = bestOutServer && bestOutServer.protSet && bestOutServer.protSet.config;
    }

    // Determine the worst result
    var inboundResult = (this.bestInboundServer) ? this.bestInboundServer.result : EmailAccountValidation.FAILED;
    var outboundResult = (this.bestOutboundServer) ? this.bestOutboundServer.result : EmailAccountValidation.FAILED;

    this.log("Wizard: inbound=___ outbound= ___", inboundResult, outboundResult);

    var worstResult;
    var worstIsOutbound;

    // Lower numbers are more serious (more likely to be the main problem), except for zero (no error)
    // If the account is EAS then ignore the outbound result
    if ((inboundResult > 0 && inboundResult <= outboundResult) || (outboundResult === 0) || (this.bestInboundServer.protocol === AccountWizard.EAS)) {
        worstResult = inboundResult;
        worstIsOutbound = false;
        errorText = this.bestInboundServer ? this.bestInboundServer.errorText : "";
    } else {
        worstResult = outboundResult;
        worstIsOutbound = true;
        errorText = this.bestOutboundServer ? this.bestOutboundServer.errorText : "";
    }

    // If using the wizard, then return "bad email address" rather than "bad username"
    if (!this.isManualSetup && worstResult === EmailAccount.BAD_USERNAME_OR_PASSWORD) {
        worstResult = EmailAccountValidation.BAD_EMAIL_OR_PASSWORD;
    }

    return {
        errorCode: worstResult,
        errorText: errorText,
        inboundValidated: !inboundResult,
        outboundValidated: !outboundResult,
        worstIsOutbound: worstIsOutbound,
        setupDetails: setupDetails
    };
};


/**
 * Like the name states, fn to deterime whether a passed error number is
 * an SSL error.
 * @param {Object} error
 */
AccountWizard.prototype._isSslError = function (error) {

    switch (error) {
    case (EmailAccount.SSL_CERTIFICATE_EXPIRED) :
    case (EmailAccount.SSL_CERTIFICATE_NOT_TRUSTED):
    case (EmailAccount.SSL_CERTIFICATE_INVALID):
    case (EmailAccount.SSL_HOST_NAME_MISMATCHED):
        return true;
    default:
        return false;
    }
};


/**
 * Final success point for the wizard. Should not be called directly.
 * Takes best responses and wraps them into the JSON format expected by
 * the accounts service. Uses the onWizardSuccess function to signal
 * wizard completion.
 * @param {Object} forceValidate -- boolean option to skip additional capability
 *                             validation operations
 */
AccountWizard.prototype._createAndSendResponse = function (forceValidate) {

    // need to perform minor shuffling of contents for proper response to accounts service
    // protocolSettings contains the config object
    var resultReturned = false;
    var returnValue = this.bestServerResponse.protocolSettings;
    var pass = returnValue.password;
    // empty strings will default to the template name (ie: IMAP)
    returnValue.alias = AccountWizard.getProposedAlias(returnValue.username) || undefined;

    returnValue.credentials = this.bestServerResponse.credentials;

    if (this.bestOutboundServerResponse !== undefined) {
        var outProtSet = this.bestOutboundServerResponse.protocolSettings;
        // POP and IMAP accounts only. EAS will not have bestOutboundServerResponse
        if (!returnValue.config.smtpConfig && this.bestInboundServer.protocol !== AccountWizard.EAS && outProtSet && outProtSet.config) {
            returnValue.config.smtpConfig = outProtSet.config;
        }
        if (this.bestOutboundServerResponse.credentials && outProtSet.password !== pass) {
            // this will store all the smtp credentials...not just the password, but cookies and more
            returnValue.credentials.smtp = this.bestOutboundServerResponse.credentials.smtp;
        }
    }

    // Add back rootFolder
    if (this.rootFolder !== undefined) {
        returnValue.config.rootFolder = this.rootFolder;
    }

    var templateToUse = this.getTemplateForProtocol(this.bestInboundServer.protocol);

    // unhook from response
    this.bestServerResponse.protocolSettings = null;
    delete this.bestServerResponse.protocolSettings;
    delete returnValue.password;
    returnValue.returnValue = true; // for right now. tweak this to work for real

    // Template list will be blank in edit/manual validation case
    returnValue.template = templateToUse;

    this.responseObject = returnValue;

    var success = this.onWizardSuccess;

    if (forceValidate) {
        console.log("time to force validate");
        success();
        return;
    }

    var extraParams = returnValue.accountId ? {
        'accountId': returnValue.accountId
    } : undefined;


    // We need to do a final check for other validators here. (ie: google calendar has its own validator)
    var otherCaps = templateToUse.capabilityProviders.filter(function (elem) {
        return !!elem.validator && elem.validator !== templateToUse.validator;
    });

    if (otherCaps.length) {
        this._handleAdditionalValidation(otherCaps, pass);
    } else {
        success();
    }
};

/**
 * Handles additional validation operations for a successfully validated account.
 * Stuffs additional credential responses into already-pressped responseObject.
 * NOTE: this should only be called from the _createAndSendResponse method.
 * FURTHER NOTE: We don't provide error checking here. We assume the primary account
 * credentials have validated, so we just make a best effort to call any
 * additional validators, and set up additional functionality.
 * @param {Object} additionalCapabilities -- array of template capabilityProviders requiring separate validation
 * @param {Object} password -- password to use in validation.
 */
AccountWizard.prototype._handleAdditionalValidation = function (additionalCapabilities, password) {
    var received = 0,
        outstanding = additionalCapabilities.length,
        creds = this.responseObject.credentials,
        success = this.onWizardSuccess, respObj = this.responseObject;

    var successHandler = function (resp) {
        ++received;
        if (resp.returnValue && resp.credentials) {
            var addlCreds = resp.credentials;
            Object.keys(addlCreds).forEach(function (key) {
                if (!creds[key]) {
                    creds[key] = addlCreds[key];
                }
            });
        }

        if (received >= outstanding) {
            success();
        }
    };

    var toSend = {
        config: respObj.config,
        username: respObj.username,
        password: password
    };

    additionalCapabilities.forEach(function (toValidate) {
        EmailApp.Util.callService(toValidate.validator, toSend, successHandler);
    });
};


/**
 * Used in cases where outbound server has not validated, but user opts to create account anyway
 * Accepts a pair of inbound and outbound settings, and passes them off as properly validated
 * configurations via the onWizardSuccess callback.
 */
AccountWizard.prototype._forceValidate = function (inboundSettings, outboundSettings) {
    var inProt = inboundSettings.protSet;
    this.bestInboundServer = inboundSettings;
    this.bestServerResponse = {
        returnValue: true,
        result: EmailAccount.VALIDATED,
        errorCode: false,
        protocolSettings: inProt,
        credentials: {
            "common": {
                "password": inProt.password
            }
        }
    };

    this.bestOutboundSettings = outboundSettings;
    if (outboundSettings) {
        var outProt = outboundSettings.protSet;
        this.bestOutboundServerResponse = {
            returnValue: true,
            result: EmailAccount.VALIDATED,
            errorCode: false,
            protocolSettings: outProt,

            credentials: {
                "smtp": {
                    "password": outProt.password
                }
            }
        };
    } else {
        this.bestOutboundServerResponse = undefined;
    }
    this._createAndSendResponse(true);
};

/**
 * Takes an email address and returns a best-guess eas username string
 * @param {Object} email
 */
AccountWizard.prototype.makeEasUsernameFromEmail = function (email) {
    // Derive the information necessary for connecting to Palm
    // make user name into 'firstname lastname' string
    var username,
        domain = email.substring(email.lastIndexOf("@") + 1, email.length);
    if (domain === "palm.com") {
        username = this.createPalmUsername(email);
    } else if (domain === "hp.com") {
        username = email; // seems to be working with just email. In the future check createHpUsername
    } else {
        username = email.replace("@" + domain, ""); // get left side of email address
    }
    return username;
}


/**
 * Special fn for creating palm and related account accounts
 * @param {Object} email: String
 * @param {Object} password: String
 */
AccountWizard.prototype.createPredefEasAccount = function (email, password, domain) {

    var predefSet = EmailApp.Util.clone(AccountWizard.PredefinedEasAccounts[domain]);
    if (!predefSet) {
        return;
    }

    // Derive the information necessary for connecting to Palm
    // make user name into 'firstname lastname' string
    var username;
    if (domain === "palm.com") {
        username = this.createPalmUsername(email);
    } else if (domain === "hp.com") {
        username = email; // seems to be working with just email. In the future check createHpUsername
    } else {
        username = email.replace("@" + domain, ""); // get left side of email address
    }

    predefSet.email = email;
    predefSet.username = username;
    predefSet.password = password;

    this.validateOutbound = false;

    this.log("Wizard: creating Predef EAS account");
    var data = new ProtocolSettings(predefSet);

    // Attempt to login to this server
    if (!this._validateProtocolSettings(data)) {
        this.log("Unable to communicate with validator");
    } else {
        this.log("Wizard: validated Predef EAS account");
    }
};


/**
 *
 * @param {Object} email: String
 * @param {Object} password: String
 */
AccountWizard.prototype.discoverEasAccount = function (email, password, domain, username) {

    var predefSet = {
        "protocol": AccountWizard.EAS,
        "priority": AccountWizard.MAX_PRIORITY,
        "email": email,
        "username": username,
        "password": password
    };

    this.validateOutbound = false;

    this.log("Wizard: discovering EAS account");
    var data = new ProtocolSettings(predefSet);

    //start the EAS auto-discover
    if (!this._addValidationRequest("palm://com.palm.eas", data, "discoverServer")) {
        this.log("Unable to communicate with EAS discoverer");
    } else {
        this.log("Wizard: discovered EAS account");
    }
};


/**
 * construct a palm EAS username from a palm email address.
 * Returns a best guess string.
 * @param {Object} email -- palm email address (ie: foo@palm.com)
 */
AccountWizard.prototype.createPalmUsername = function (email) {
    return email.replace(/(.*)\.(.*)@palm.com/g, "$1 $2");
};


/**
 * Function for handling successful validation of protocol settings
 * @param {Object} protWrapper protocol settings wrapper,
 * @param {Object} resp -- response from the server
 */
AccountWizard.prototype.onValidateSuccess = function (protWrapper, resp) {
    this.log("Wizard: " + this.describeRequest(protWrapper) + " validate success");
    protWrapper.result = EmailAccount.VALIDATED;
    if (!resp.protocolSettings) {
        // yahoo and other transports will not return the protocolSet
        resp.protocolSettings = protWrapper.protSet;
    }
    this._handleValidationResponse(protWrapper, resp);
};

/**
 * Used to enahnce logging of validation responses. Augments a protocolSetWrapper's
 * protocol string with port and encryption setting information where needed.
 * Returns the modified wrapper.
 * @param {Object} protWrapper
 */
AccountWizard.prototype.describeRequest = function (protWrapper) {
    if (protWrapper.protocol === "EAS") {
        return protWrapper.protocol;
    } else if (protWrapper.protSet && protWrapper.protSet.config) {
        var config = protWrapper.protSet.config;
        return protWrapper.protocol + " port=" + config.port + " (" + config.encryption + ")";
    } else {
        return protWrapper.protocol;
    }
};

/**
 * Handler for unsuccessful validation responses. Hooks up the result and error text to the
 * original wrapper and sends it on to the validationResponse handler
 * @param {Object} protWrapper
 * @param {Object} resp
 */
AccountWizard.prototype.onValidateError = function (protWrapper, resp) {
    this.log("Wizard: " + this.describeRequest(protWrapper) + " validate error " + resp.mailErrorCode);

    protWrapper.result = resp.mailErrorCode !== undefined ? resp.mailErrorCode : resp.errorCode;
    protWrapper.errorText = resp.errorText;
    //eas auto-discover would return the server here if it was found
    if (protWrapper.protocol === AccountWizard.EAS && resp.server !== null) {
        protWrapper.protSet.config.server = resp.server;
    }

    if (typeof protWrapper.result === "string") {
        protWrapper.result = this.translateStringError(protWrapper.result);
        if (protWrapper.result === EmailAccount.BAD_USERNAME_OR_PASSWORD && resp.errorText && resp.errorText.toLowerCase().indexOf("captcha required") > -1) {
            // correct error even further. Captcha login is required.
            protWrapper.result = EmailAccount.ACCOUNT_WEB_LOGIN_REQUIRED;
        }
    }
    this._handleValidationResponse(protWrapper, resp);
};

AccountWizard.prototype.translateStringError = function (errCode) {
    switch (errCode) {
    case "401_UNAUTHORIZED":
        return EmailAccount.BAD_USERNAME_OR_PASSWORD;
    case "NO_CONNECTIVITY":
        return EmailAccount.NO_NETWORK;
    default:
        return EmailAccountValidation.FAILED;
    }
};

/**
 * IDEALLY this should return true if the app is being used on the desktop
 */
AccountWizard.prototype.isAppHosted = function () {
    // TODO: Make this work
    return false;
};


/**
 * REFAC
 * Sets the exit/result-returned flag for the account wizard. Used to prevent
 * additional responses from returning after a validation verdict has been returned
 */
AccountWizard.prototype.stopWizard = function () {
    this.wizardHasExited = true;
};

/**
 * method to determine account settings from just an email address and password
 * Method uses assistant's createSuccess and createError methods for error responses
 * @param {Object} params: object in the form of: {
 *                                                     emailAddress: // email Address string
 *                                                     password: // string
 *                                                     easUser: // optional string. presence indicates eas account setup
 *                                                 }
 * @param {Object} password: string
 *
 */
AccountWizard.prototype.determineAccountSettings = function (params, onSuccess, onFailure) {
    // pull these guys out for convenience.
    var emailAddress = params.emailAddress;
    var password = params.password;
    var easUser = params.easUser;

    this.resetWizardState();
    this.wizardHasExited = false;

    if (onSuccess) {
        this.onWizardSuccess = onSuccess;
    }

    if (onFailure) {
        this.onWizardError = onFailure;
    }

    this.responseObject = undefined;

    // Store static array locally
    var PredefinedAccounts = AccountWizard.PredefinedAccounts;

    // use assistant to respond to errors

    // Make sure that the parameters were passed
    if (!emailAddress || emailAddress.length < 2 || !password || password.length < 1) {
        this.onWizardError({
            "errorCode": EmailAccountValidation.ILLEGAL_PARAMETER,
            "errorText": "Error: username or password not provided"
        }); // DO NOT LOCALIZE
        return;
    }

    // Convert the email address to lower-case
    emailAddress = emailAddress.toLowerCase();

    // Get the domain
    var domain = emailAddress.substring(emailAddress.lastIndexOf("@") + 1);
    this.log("Wizard starting: domain= ___", domain);

    // Allow users to specify domains to validate against by appending it to the end of their email address
    // For example, me@mydomain.com@gmail.com will validate against gmail's servers
    var subLastIndex = emailAddress.lastIndexOf("@");
    if (emailAddress.indexOf("@") !== subLastIndex) {
        emailAddress = emailAddress.substring(0, subLastIndex);
    }
    // Part 1: Perform quick validation on the data
    // Verify the user name (this should have been done by the UI)
    if (emailAddress.length === 0 || domain.length === 0) {
        this.onWizardError({
            "errorCode": EmailAccountValidation.ILLEGAL_PARAMETER,
            "errorText": "Wizard: Can't determine username or domain"
        }); // DO NOT LOCALIZE
        return;
    }

    // Check to see if there is Internet connectivity
    if (!this._isConnectionAvailable()) {
        this._showConnectionError();
        return;
    }

    this.setWizardTimeout(60);

    // Special-case for EAS accounts - use auto-discover
    if (easUser) {
        this.doneGeneratingRequests = true;
        this.isPredefinedDomain = true;
        this.discoverEasAccount(emailAddress, password, domain, easUser);
        return;
    }

    // original code used a local after using the instance variable. Maintaining this logic
    var isPredefinedDomain = false;
    //TODO see where predefined accounts go
    // Quick check if the email address domain name in the list of predefined domains
    for (var i = 0; PredefinedAccounts[i][AccountWizard.DB_NAME] !== ""; i++) {
        if (PredefinedAccounts[i][AccountWizard.DB_DOMAIN] === domain) {
            isPredefinedDomain = true;
        }
    }

    // If it's a predefined domain, skip the MX record lookup
    if (isPredefinedDomain) {
        this._guessAccountSettings(emailAddress, password, domain, null);
    } else {
        // Make an asynchronous call to findMxRecords to lookup the MX records
        // which will then call _guessAccountSettings with the results.

        var reqHandler = enyo.bind(this, this._handleMxLookupResults, emailAddress, password, domain);

        var request = EmailApp.Util.callService("palm://com.palm.nettools/findMxRecords", {
            domainName: domain
        }, reqHandler);

        this.requests.push(request);
    }
};

/**
 * Calls the onWizardError handler with an error indicating lack of network connectivity
 */
AccountWizard.prototype._showConnectionError = function () {
    this.log("Wizard: No Internet Connection");
    this.onWizardError({
        "errorCode": EmailAccount.NO_NETWORK,
        "errorText": "Wizard: No Internet connection"
    }); // DO NOT LOCALIZE
};


/**
 * Function to retrieve validator for protocol settings. Returns true if validator was pulled
 * successfully. False otherwise. Successful retrieval of a validator will result in its validation
 * method being called immediately.
 * @param {Object} protWrapper protocol settings wrapper
 */
AccountWizard.prototype._validateProtocolSettings = function (protWrapper) {
    var serviceURI = "";
    var isSpecial = false;
    var protValidator = this.protValidators[protWrapper.protocol];
    if (protValidator) {
        var slashIdx = protValidator.lastIndexOf("/");
        serviceURI = protValidator.substring(0, slashIdx);
        isSpecial = protValidator.substring(slashIdx + 1);
    } else {
        console.log("no validator found for specified protocol.");
        return false;
    }
    return this._addValidationRequest(serviceURI, protWrapper, isSpecial);
};

// Validate account settings entered by the user in the manual setup scene
//ServiceMessage
/**
 * @param {Object} inSettings: ProtocolSettings JSON
 * @param {Object} outSettings: ProtocolSettings JSON
 * @param {Object} rootFolder: string
 */
AccountWizard.prototype._validateAccountSettings = function (inSettings, outSettings) {
    this.isManualSetup = true;
    this.log("Manual starting: server = ___", inSettings.server);

    // Check to see if there is Internet connectivity
    if (!this._isConnectionAvailable()) {
        console.log("no connection available");
        this._showConnectionError();
        return;
    }

    // All the quick validation has been done now. Set a timer so that this operation is guaranteed
    // to return in 60 seconds, or 2 minutes for EAS.  The spinner on the UI can only spin for so long ...

    // TODO: This setWizardTimeout is not js's set timeout. need to adapt
    if (inSettings.protocol === AccountWizard.EAS) {
        this.validateOutbound = false;
        this.setWizardTimeout(120);
    } else {
        this.setWizardTimeout(60);
    }

    // If there is no transport the skip this
    //MailAuthenticator
    this._validateProtocolSettings(inSettings);

    // Validate the account
    if (inSettings.protocol === AccountWizard.EAS) { // Seems a redundant check....
        // EAS should never have an outgoing server
        this.bestOutboundServer = null;
    } else {
        if (outSettings && outSettings.protSet && outSettings.protSet.useSmtpAuth !== false && !outSettings.protSet.password) {
            // If there's no password, copy from incoming
            outSettings.protSet.password = inSettings.protSet.password;
        }

        this._validateSMTPSettings(outSettings);
    }

    // There should be 2 validation requests underway, but make sure
    if (this.numberOfRequests === 0) {
        console.warn("Manual: ERROR - Unable to validate manual setup!!!");
        this.onWizardError({
            "errorCode": EmailAccountValidation.FAILED,
            "errorText": "Manual: No servers to connect to"
        }); // DO NOT LOCALIZE
        return;
    }

    this.log("Manual: Done sending requests. Num = ___ outstanding requests", this.numberOfRequests);
    // All the possible requests have been generated now
    this.doneGeneratingRequests = true;
};


// TODO: NOT USED YET. Evaluate whether this is needed
/*
 AccountWizard.prototype.makeSettingsFromParams = function(params) {

 var inSettings = new ProtocolSettings({
 "server": params.server,
 "protocol": params.type,
 "domain": "",
 "port": params.port,
 "ssl": !!params.useSsl,
 "tls": !!params.useTls,
 "priority": 10,
 "email": params.address,
 "username": params.username,
 "password": params.password
 });

 var outSettings = new ProtocolSettings({
 "server": params.smtpHost,
 "protocol": "SMTP",
 "domain": "",
 "port": params.smtpPort,
 "ssl": !!params.smtpSsl,
 "tls": !!params.smtpTls,
 "priority": 10,
 "email": params.address,
 "username": params.smtpLogin,
 "password": params.smtpPassword
 });

 return {"inSettings" : inSettings, "outSettings": outSettings};

 };
 */

/**
 * Method for manually validating an account. Will be called from the create-assistant.
 * params:
 * @param {Object} params : {
 *        accountType: EmailAccount.identifier,
 *        parameters: manualSettings,
 *        onSuccess: success function
 *        onFailure: error Handling function
 *    }
 */
AccountWizard.prototype.accountValidateManual = function (params, onSuccess, onFailure) {
    this.resetWizardState();
    this.wizardHasExited = false;
    this.setWizardTimeout(30);
    this.responseObject = undefined;
    //var accountId = params && params.config && params.config.accountId;
    if (onSuccess !== undefined) {
        console.log("accountValidateManual -- overwriting onSuccess");
        // Overwriting params.success?
        this.onWizardSuccess = onSuccess;
    }
    if (onFailure) {
        console.log("accountValidateManual -- overwriting onFailure");
        this.onWizardError = onFailure;
    }

    // Save rootFolder if any
    this.rootFolder = params.config && params.config.rootFolder;

    var dontValidate = params.dontValidate;

    if (params.inSetWrapper) {
        // EAS security policy was accepted by the user
        // sec pol error case has rerouted here.
        // no need to convert stuff we've already converted
        this._forceValidate(params.inSetWrapper, params.outSetWrapper);
        return;
    }

    // TODO: refactor all of this. Nasty nasty.
    var inSet = params.config;
    var outSet = inSet.smtpConfig;

    // tweak params if needed
    params.username = params.username && params.username.toLowerCase();
    var parsePort = function (port) {
        return (port) ? parseInt(port, 10) : 0;
    };
    var fixSsl = function (config) {
        if (config.server.indexOf("https://") > -1 && config.encryption !== ProtocolSettings.SSL) {
            // fix ssl flag if not indicated
            config.encryption = ProtocolSettings.SSL;
        }
    };

    var accountId = inSet.accountId;
    inSet.port = parsePort(inSet.port);
    if (outSet) {
        outSet.port = parsePort(outSet.port);
        fixSsl(outSet);
        outSet.protocol = "SMTP";
        outSet.accountId = accountId;
    }

    if (!(inSet.type && inSet.type.length || inSet.protocol) || !params.username.length || !params.password.length) {
        this.onWizardError({
            "errorCode": EmailAccountValidation.MISSING_PARAMETER,
            "errorText": "Error: username or password not provided"
        }); // DO NOT LOCALIZE
        return;
    }

    inSet.email = params.username;	// outermost/base username should be the email address

    var inSettings = new ProtocolSettings(inSet);
    var outboundValidationNeeded = this.validateOutbound = this._isOutboundValidationRequired(inSet, outSet);
    var outSettings = (inSet.type === AccountWizard.EAS || !outSet) ? null : new ProtocolSettings(outSet);

    if (outSettings) {
        // Enable/disable SMTP auth if it was explicitly provided.
        // If not, don't include it in the config so it'll be auto-detected.
        if (outSet.useSmtpAuth !== undefined) {
            outSettings.protSet.config.useSmtpAuth = outSet.useSmtpAuth;
        }
    }

    // Don't validate, just setup the account?  This can happen in 2 cases:
    // 1. The inbound server validated, but not the outbound server, and the user elected to create the account anyway
    if (dontValidate) {
        console.log("we won't bother validating. returning");
        this._forceValidate(inSettings, outSettings);
        return;
    }

    // Pass the information to the validators
    if (this.isValidationOnly && (this._needsCredentials(inSettings) || (outSettings && this._needsCredentials(outSettings)))) {
        this._retrieveCredentials(accountId, inSettings, outSettings);
    } else {
        this._validateAccountSettings(inSettings, outSettings);
    }
};


/**
 * Used to determine whether outbound validation is required for an account,
 * given its inbound protocol set.
 * -- EAS accounts do not require outbound validation
 * -- POP and IMAP accounts do
 * -- YAHOO accounts require authentication if the outbound server used is not the palm yahoo server.
 * @param {Object} inSet
 */
AccountWizard.prototype._isOutboundValidationRequired = function (inSet) {
    if (inSet.type === AccountWizard.EAS) {
        return false;
    }
    if (inSet.type === AccountWizard.IMAP || inSet.type === AccountWizard.POP) {
        return true;
    }
    if (inSet.protocol === AccountWizard.YAHOO) {
        return (outSet.server !== "palm.smtp.mail.yahoo.com");
    }
    return true;
};

/**
 * Method to determine whether a provided protocol set wrapper is in need
 * of passwords from the database.
 * @param {Object} protSetWrapper
 */
AccountWizard.prototype._needsCredentials = function (protSetWrapper) {
    return protSetWrapper.protSet.password === EmailAccount.PLACEHOLDER_PASS;
};


/**
 * Used in the event that credentials were not provided by the user
 * (_needsCredentials has returned true)
 *
 * @param {Object} accountId -- id of account whose credentials will be pulled
 * @param {Object} inSettings -- inbound settings to stuff credentials in
 * @param {Object} outSettings -- outbound settings to stuff credentials in
 * @param {Object} rootFolder -- IMAP root folder (optional). REFAC. I don't think this is ever used down the line
 */
AccountWizard.prototype._retrieveCredentials = function (accountId, inSettings, outSettings, rootFolder) {
    var that = this;
    var inboundGrabbed = inSettings.protSet.password !== EmailAccount.PLACEHOLDER_PASS;
    var outboundGrabbed = inSettings.protocol === AccountWizard.EAS || outSettings.protSet.password !== EmailAccount.PLACEHOLDER_PASS;

    if (inboundGrabbed && outboundGrabbed) {
        // what are we doing here? Forward it on
        this._validateAccountSettings(inSettings, outSettings, rootFolder);
    }

    // mega-closure time
    var hookupCredentials = function (direction, credentials) {
        var toUse;
        if (direction === "in") {
            inboundGrabbed = true;
            toUse = inSettings.protSet;
        } else if (direction === "out") {
            outboundGrabbed = true;
            toUse = outSettings.protSet;
        }

        if (!toUse) {
            return;
        }

        if (credentials) {
            Object.keys(credentials).forEach(function (key) {
                toUse[key] = credentials[key];
            });
        }

        if (inboundGrabbed && outboundGrabbed) {
            if (outSettings && outSettings.protSet.password === EmailAccount.PLACEHOLDER_PASS) {
                // if outSettings are still the placeholder pass, we have only stored the incoming password
                outSettings.protSet.password = inSettings.protSet.password;
            }
            that._validateAccountSettings(inSettings, outSettings, rootFolder);
        }
    }; // end closure


    if (!outboundGrabbed) {
        this.outReq = EmailAccount.getCredentials(accountId, "smtp", function (credentials) {
            hookupCredentials('out', credentials);
        });
    }

    if (!inboundGrabbed) {
        this.inReq = EmailAccount.getCredentials(accountId, "common", function (credentials) {
            hookupCredentials('in', credentials);
        });
    }
};

/*
 * Clear the timeout for resulting the result to the user
 */
AccountWizard.prototype._clearWizardTimeout = function () {
    this.log("Wizard: clearing wizard timeout");
    // Cancel the timer if it exists
    if (this.timer) {
        clearTimeout(this.timer);
        this.timer = undefined;
    }
};

/**
 * Controls timeout for entire Account Wizard process.
 * @param {Object} timeout: int in seconds
 */
AccountWizard.prototype.setWizardTimeout = function (timeout) {
    // Cancel the old timer first, if there was one
    this._clearWizardTimeout();

    // In the event of a timeout, current result will be returned to the user immediately
    this.timer = setTimeout(this.returnWizardResultToUser.bind(this), timeout * 1000);
};

AccountWizard.prototype.getAccount = function () {
    return null;
};


/**
 * Check to see whether there is connectivity available.
 */
AccountWizard.prototype._isConnectionAvailable = function () {
    // TODO: Make this work
    if (!enyo.application || !enyo.application.isConnectionAvailable) {
        return true;
    }
    return enyo.application.isConnectionAvailable();
};

/**
 * Like the name says
 * @param {Object} data: ProtocolSettings
 */
AccountWizard.prototype._validateSMTPSettings = function (data) {
    if (!this.validateOutbound || this.isAppHosted()) {
        // Don't bother validating if we're on PC
        // Palm's internal network blocks SMTP
        if (data) {
            this.bestOutboundServer = data;
            this.bestOutboundServer.result = EmailAccount.VALIDATED;
        }
        return;
    }
    return this._addValidationRequest("palm://com.palm.smtp", data);
};


/**
 * Create a validation request and add it to the queue of outstanding requests.
 * @param {Object} transportUri -- URI for service whose validateAccount method will be called
 * @param {Object} protWrapper -- protocol settings to use for the validation attempt
 * @param {Object} method -- method to call on the transport
 * REFAC We may not need to have the transportUri and method separate.
 */
AccountWizard.prototype._addValidationRequest = function (transportUri, protWrapper, method) {

    if (!transportUri) {
        return false;
    }

    method = method || "validateAccount";

    var reqHandler = enyo.bind(this, EmailApp.Util.callbackRouter,
        enyo.bind(this, this.onValidateSuccess, protWrapper),
        enyo.bind(this, this.onValidateError, protWrapper)
    );
    var request = EmailApp.Util.callService(transportUri + "/" + method, protWrapper.protSet, reqHandler);
    this.requests.push(request);
    this.numberOfRequests++;
    return true;
};


/**
 * Check to see if wizard is finished issuing new validation requests.
 * Returns true if flag manually set, or if any validation requests
 * have been sent off.
 * REFAC -- logic here is a bit stupid
 */
AccountWizard.prototype._isDoneGeneratingRequests = function () {
    // TODO: rename this stuff. Current terminology is a bit messed up
    return this.doneGeneratingRequests || this.numberOfRequests > 0;
};


/**
 * Like the name says, used to pick the best protocol setting from the protocol settings
 * @param {Object} bestSoFar: ProtocolSettings -- Should be the best inbound or outbound server so far
 * @param {Object} newResult: ProtocolSettings -- result to compare against the current best
 */
AccountWizard.prototype._pickBestResult = function (bestSoFar, newResult) {
    // If there is no result yet, then return the new result
    if (!bestSoFar) {
        return newResult;
    }
    // NOTE: Results are evaludated wrt EmailAccountValidation error codes. Lower is better.

    // general exceptions can come back as negative numbers. Make max_Val for evaluation metric
    if (newResult.result < 0) {
        newResult.result = Number.MAX_VALUE;
    }

    if (bestSoFar.result < 0) {
        bestSoFar.result = Number.MAX_VALUE;
    }

    // If the best result is better than the new result, then return the best result
    if (bestSoFar.result < newResult.result) {
        return bestSoFar;
    }
    // If the best result is worse than the new result, then return the new result
    if (bestSoFar.result > newResult.result) {
        return newResult;
    }

    // The results are the same.  Check the protocols.
    if (bestSoFar.protocol !== newResult.protocol) {
        if (bestSoFar.protocol === AccountWizard.POP && newResult.protocol === AccountWizard.IMAP) {
            return newResult;
        } else if (bestSoFar.protocol === AccountWizard.IMAP) {
            return bestSoFar;
        }
    }

    // prioritize encryption over none
    if (bestSoFar.protSet.encryption !== newResult.protSet.encryption) {
        if (bestSoFar.protSet.encryption === ProtocolSettings.SSL) {
            return bestSoFar;
        } else if (newResult.protSet.encryption === ProtocolSettings.SSL) {
            return newResult;
        } else if (bestSoFar.protSet.encryption === ProtocolSettings.TLS) {
            return bestSoFar;
        } else if (newResult.protSet.encryption === ProtocolSettings.TLS) {
            return newResult;
        }
        // shouldn't get this far. Remaining cases have no encryption
    }


    // The results are the same.  Return the result with the higher priority
    return bestSoFar.priorty > newResult.priority ? bestSoFar : newResult;
};


/**
 * Method to determine account settings based on an email address and password
 * @param {Object} emailAddress -- email address for account
 * @param {Object} password -- password for account
 * @param {Object} domain -- optional. Domain for an eas account
 * @param {Object} bestMxServer -- optional, Mx domain for the account
 * REFAC -- at least rename some of this. The current isDoneGenerating
 * requests logic is kind of dumb too...
 */
AccountWizard.prototype._guessAccountSettings = function (emailAddress, password, domain, bestMxServer) {
    // All the quick validation has been done now. Set a timer so that this operation is guaranteed
    // to return in 40 seconds.  The spinner on the UI can only spin for so long ...
    this.setWizardTimeout(40);

    if (bestMxServer) {
        this.log("Wizard: MX domain: " + bestMxServer);
    }

    // Part 2: See if this is a Yahoo domain
    if (AccountWizard._isYahooMXServer(bestMxServer)) {
        this.attemptYahooAccount(emailAddress, password, domain, bestMxServer);
    }

    if (this.doneGeneratingRequests) {
        // If there was a match, then wait until the responses from the transports are received
        return;
    }

    // Part 3: See if the user is using a well-known domain
    // Do a static database lookup to see if this is a known domain
    // Or if the MX server belongs to a known domain
    this._attemptWellKnownDomain(emailAddress, password, domain, bestMxServer);

    if (this._isDoneGeneratingRequests()) {
        return;
    }

    // Part 4: Guess at server prefixes, and whether they use SSL or not
    this._attemptServerPrefix(emailAddress, password, domain, bestMxServer);

    // At this point there should be validation attempts underway.  If there aren't
    // (not sure why not) then return an error to the user and allow them to configure
    // the account themselves
    if (!this._isDoneGeneratingRequests()) {
        this.onWizardError({
            "errorCode": EmailAccountValidation.FAILED,
            "errorText": "Wizard: No servers to connect to"
        }); // DO NOT LOCALIZE
    }
    this.log("Wizard: Done sending requests. Num = ___ outstanding requests", this.numberOfRequests);
    // All the possible requests have been generated now
    this.doneGeneratingRequests = true;
};


/**
 * Callback for handling MxLookup results. Evaluates responses to determine the
 * best record to use, and then attempts to validate against using the user-entered
 * credentials.
 * @param {Object} resp
 */
AccountWizard.prototype._handleMxLookupResults = function (emailAddress, password, domain, resp) {
    this.log("MxLookup response");

    if (resp.errorCode) {
        this.log("Error finding MX records for domain");
    }

    if (!resp.mxRecords) {
        this.log("No records for MX lookup");
    }

    var bestMxServer = null;
    var bestMxPriority = Number.MAX_VALUE;

    var mxRecords = resp.mxRecords || [];
    var record = null;
    var priority = Number.MAX_VALUE;

    for (var i = 0; i < mxRecords.length; i++) {
        record = mxRecords[i];
        priority = record.mxPreference;
        if (priority < bestMxPriority) {
            bestMxServer = record.mxServer.toLowerCase();
            bestMxPriority = priority;
        }
    }

    this._guessAccountSettings(emailAddress, password, domain, bestMxServer);
};


/**
 * Retrieves the list of available account templates allowing MAIL capabilities.
 * Stores the results inside the wizard for relevant operations.
 */
AccountWizard.prototype._getTemplateList = function () {
    var that = this;

    return EmailApp.Util.callService('palm://com.palm.service.accounts/listAccountTemplates', {
            capability: "MAIL"
        },
        function (resp) {
            that.templateList = resp.results || resp;
            that._parseTemplates();
        }
    );
};

/**
 * Logging utility. Logs a provided message along with the calling function's name.
 */
AccountWizard.prototype.log = function () {
    var args = [].splice.call(arguments, 0);
    console.log("" + arguments.callee.name + ": " + args.join(' '));
},

    AccountWizard.prototype._parseTemplates = function () {
        var protHash = this.protValidators = {};
        var tempHash = this.protTemplates = {};
        this.templateList.forEach(function (elem) {
            // if retrieved template doesn't have mail capabilities, don't track it.
            if (!elem.capabilityProviders || elem.capabilityProviders.filter(
                function (elem) {
                    return elem.capability === "MAIL";
                }).length < 1) {
                return;
            }
            var uri = (typeof elem.validator === "string") ? elem.validator : elem.validator.address;
            var key = elem.templateId.substring(elem.templateId.lastIndexOf(".") + 1).toUpperCase();
            if (uri && uri.length) {
                protHash[key] = uri;
            }
            tempHash[key] = elem;
        });
    };


/*** CONSTANTS FROM HERE ON OUT **/



// Response codes for the validation attempt
// General defines used in tables below
AccountWizard.IMAP = "IMAP";
AccountWizard.POP = "POP";
AccountWizard.YAHOO = "YAHOO";
AccountWizard.GOOGLE = "GOOGLE";
AccountWizard.SMTP = "SMTP";
AccountWizard.EAS = "EAS";
AccountWizard.NO_AUTH = "NO AUTH";
AccountWizard.USE_INBOUND = "INBOUND";

AccountWizard.MAX_PRIORITY = 10;

// Servers to try
AccountWizard.S_PREFIX = 0;
AccountWizard.S_TYPE = 1;
AccountWizard.S_PORT = 2;
AccountWizard.S_SSL = 3;
AccountWizard.S_PRIORITY = 4; // Preference given to a successful result (range 1 to 10)
AccountWizard.ServerConfig = [
    // Prefix, type, port, SSL
    ["imap", AccountWizard.IMAP, 993, ProtocolSettings.SSL, 10],
    ["imap", AccountWizard.IMAP, 143, ProtocolSettings.NO_ENCRYPTION, 9],
    ["mail", AccountWizard.IMAP, 993, ProtocolSettings.SSL, 8],
    ["mail", AccountWizard.IMAP, 143, ProtocolSettings.NO_ENCRYPTION, 7],
    ["", AccountWizard.IMAP, 993, ProtocolSettings.SSL, 6],
    ["", AccountWizard.IMAP, 143, ProtocolSettings.NO_ENCRYPTION, 5],
    ["pop", AccountWizard.POP, 995, ProtocolSettings.SSL, 4],
    ["pop", AccountWizard.POP, 110, ProtocolSettings.NO_ENCRYPTION, 3],
    ["pop3", AccountWizard.POP, 995, ProtocolSettings.SSL, 4],
    ["pop3", AccountWizard.POP, 110, ProtocolSettings.NO_ENCRYPTION, 3],
    ["pop.mail", AccountWizard.POP, 995, ProtocolSettings.SSL, 10],
    // Yahoo domains
    ["mail", AccountWizard.POP, 995, ProtocolSettings.SSL, 2],
    ["mail", AccountWizard.POP, 110, ProtocolSettings.NO_ENCRYPTION, 1],
    ["", AccountWizard.POP, 995, ProtocolSettings.SSL, 1],
    ["", AccountWizard.POP, 110, ProtocolSettings.NO_ENCRYPTION, 1],
    ["smtp", AccountWizard.SMTP, 587, ProtocolSettings.SSL, 10],
    ["smtp", AccountWizard.SMTP, 587, ProtocolSettings.NO_ENCRYPTION, 9],
    ["mail", AccountWizard.SMTP, 587, ProtocolSettings.SSL, 8],
    ["mail", AccountWizard.SMTP, 587, ProtocolSettings.NO_ENCRYPTION, 7],
    ["smtp", AccountWizard.SMTP, 465, ProtocolSettings.SSL, 10],
    ["smtp", AccountWizard.SMTP, 465, ProtocolSettings.NO_ENCRYPTION, 9],
    ["mail", AccountWizard.SMTP, 465, ProtocolSettings.SSL, 8],
    ["mail", AccountWizard.SMTP, 465, ProtocolSettings.NO_ENCRYPTION, 7],
    ["smtp.mail", AccountWizard.SMTP, 465, ProtocolSettings.SSL, 10],
    // Yahoo domains
    ["smtp", AccountWizard.SMTP, 25, ProtocolSettings.SSL, 6],
    ["smtp", AccountWizard.SMTP, 25, ProtocolSettings.NO_ENCRYPTION, 5],
    ["mail", AccountWizard.SMTP, 25, ProtocolSettings.SSL, 4],
    ["mail", AccountWizard.SMTP, 25, ProtocolSettings.NO_ENCRYPTION, 3],
    ["", ""] // Must be the last line
];


// Predefined account definition
AccountWizard.DB_NAME = 0;
AccountWizard.DB_DOMAIN = 1; // Used to match the domain the user entered as their email address
AccountWizard.DB_TYPE = 2; // POP, IMAP or YAHOO
AccountWizard.DB_IN_SERVER = 3; // Inbound mail server
AccountWizard.DB_IN_PORT = 4; // Inbound mail port
AccountWizard.DB_IN_ENCRYPTION = 5; // "SSL", "TLS" or "NONE"
AccountWizard.DB_OUT_SERVER = 6; // Outbound mail server
AccountWizard.DB_OUT_PORT = 7; // Outbound mail port
AccountWizard.DB_OUT_ENCRYPTION = 8; // "SSL", "TLS" or "NONE"
AccountWizard.DB_OUT_AUTH = 9; // "NO AUTH" or "USE_INBOUND"
AccountWizard.DB_PRIORITY = 10; // Preference given to a successful result (range 1 to 10)
AccountWizard.PredefinedAccounts = [
    // Name, domain, type  IN:server, port, ProtocolSettings.SSL  OUT:server, port, ProtocolSettings.SSL, auth
    // Gmail POP support is bad so don't let the wizard use it
    ["Gmail", "gmail.com", AccountWizard.GOOGLE, "imap.gmail.com", 993, ProtocolSettings.SSL, "smtp.gmail.com", 465, ProtocolSettings.SSL, AccountWizard.USE_INBOUND, 10],
    ["Gmail", "googlemail.com", AccountWizard.GOOGLE, "imap.gmail.com", 993, ProtocolSettings.SSL, "smtp.gmail.com", 465, ProtocolSettings.SSL, AccountWizard.USE_INBOUND, 10],
    ["Hotmail", "hotmail.com", AccountWizard.POP, "pop3.live.com", 995, ProtocolSettings.SSL, "smtp.live.com", 587, ProtocolSettings.TLS, AccountWizard.USE_INBOUND, 10],
    ["Hotmail", "live.com", AccountWizard.POP, "pop3.live.com", 995, ProtocolSettings.SSL, "smtp.live.com", 587, ProtocolSettings.TLS, AccountWizard.USE_INBOUND, 10],
    ["MSN", "msn.com", AccountWizard.POP, "pop3.live.com", 995, ProtocolSettings.SSL, "smtp.live.com", 587, ProtocolSettings.TLS, AccountWizard.USE_INBOUND, 10],
    ["AOL", "aol.com", AccountWizard.IMAP, "imap.aol.com", 993, ProtocolSettings.SSL, "smtp.aol.com", 465, ProtocolSettings.SSL, AccountWizard.USE_INBOUND, 10],
    ["AIM", "aim.com", AccountWizard.IMAP, "imap.aim.com", 993, ProtocolSettings.SSL, "smtp.aol.com", 465, ProtocolSettings.SSL, AccountWizard.USE_INBOUND, 10],
    ["Mac", "me.com", AccountWizard.IMAP, "mail.me.com", 993, ProtocolSettings.SSL, "smtp.me.com", 587, ProtocolSettings.TLS, AccountWizard.USE_INBOUND, 10],
    ["Mac", "mac.com", AccountWizard.IMAP, "mail.mac.com", 993, ProtocolSettings.SSL, "smtp.mac.com", 587, ProtocolSettings.TLS, AccountWizard.USE_INBOUND, 10],
    // AT&T uses Yahoo for email (http://helpme.att.net/article.php?item=287)
    // Using AccountWizard.POP protocol if Yahoo IMAP is not available for a given device
    ["ATT", "ameritech.net", AccountWizard.POP, "pop.att.yahoo.com", 995, ProtocolSettings.SSL, "smtp.att.yahoo.com", 465, ProtocolSettings.SSL, AccountWizard.USE_INBOUND, 10],
    ["ATT", "att.net", AccountWizard.POP, "pop.att.yahoo.com", 995, ProtocolSettings.SSL, "smtp.att.yahoo.com", 465, ProtocolSettings.SSL, AccountWizard.USE_INBOUND, 10],
    ["ATT", "bellsouth.net", AccountWizard.POP, "pop.att.yahoo.com", 995, ProtocolSettings.SSL, "smtp.att.yahoo.com", 465, ProtocolSettings.SSL, AccountWizard.USE_INBOUND, 10],
    ["ATT", "flash.net", AccountWizard.POP, "pop.att.yahoo.com", 995, ProtocolSettings.SSL, "smtp.att.yahoo.com", 465, ProtocolSettings.SSL, AccountWizard.USE_INBOUND, 10],
    ["ATT", "nvbell.net", AccountWizard.POP, "pop.att.yahoo.com", 995, ProtocolSettings.SSL, "smtp.att.yahoo.com", 465, ProtocolSettings.SSL, AccountWizard.USE_INBOUND, 10],
    ["ATT", "pacbell.net", AccountWizard.POP, "pop.att.yahoo.com", 995, ProtocolSettings.SSL, "smtp.att.yahoo.com", 465, ProtocolSettings.SSL, AccountWizard.USE_INBOUND, 10],
    ["ATT", "prodigy.net", AccountWizard.POP, "pop.att.yahoo.com", 995, ProtocolSettings.SSL, "smtp.att.yahoo.com", 465, ProtocolSettings.SSL, AccountWizard.USE_INBOUND, 10],
    ["ATT", "sbcglobal.net", AccountWizard.POP, "pop.att.yahoo.com", 995, ProtocolSettings.SSL, "smtp.att.yahoo.com", 465, ProtocolSettings.SSL, AccountWizard.USE_INBOUND, 10],
    ["ATT", "snet.net", AccountWizard.POP, "pop.att.yahoo.com", 995, ProtocolSettings.SSL, "smtp.att.yahoo.com", 465, ProtocolSettings.SSL, AccountWizard.USE_INBOUND, 10],
    ["ATT", "swbell.net", AccountWizard.POP, "pop.att.yahoo.com", 995, ProtocolSettings.SSL, "smtp.att.yahoo.com", 465, ProtocolSettings.SSL, AccountWizard.USE_INBOUND, 10],
    ["ATT", "wans.net", AccountWizard.POP, "pop.att.yahoo.com", 995, ProtocolSettings.SSL, "smtp.att.yahoo.com", 465, ProtocolSettings.SSL, AccountWizard.USE_INBOUND, 10],
    // Domains from the master email settings spreadsheet
    ["UOL", "uol.com", AccountWizard.POP, "pop3.uol.com.br", 110, ProtocolSettings.NO_ENCRYPTION, "smtp.uol.com.br", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["Rogers", "rogers.com", AccountWizard.POP, "pop.broadband.rogers.com", 110, ProtocolSettings.NO_ENCRYPTION, "smtp.broadband.rogers.com", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["Videotron", "videotron.ca", AccountWizard.POP, "pop.videotron.ca", 110, ProtocolSettings.NO_ENCRYPTION, "relais.videotron.ca", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["123Mail", "123mail.cl", AccountWizard.POP, "pop.entelchile.net", 110, ProtocolSettings.NO_ENCRYPTION, "smtp.entelchile.net", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["Manquehue", "manquehue.cl", AccountWizard.POP, "mail.manquehue.net", 110, ProtocolSettings.NO_ENCRYPTION, "mail.manquehue.net", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["VTR", "vtr.cl", AccountWizard.POP, "mail.vtr.net", 110, ProtocolSettings.NO_ENCRYPTION, "mail.vtr.net", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["Freenet", "freenet.de", AccountWizard.POP, "mx.freenet.de", 110, ProtocolSettings.NO_ENCRYPTION, "mx.freenet.de", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["T-Online", "t-online.de", AccountWizard.POP, "popmail.t-online.de", 110, ProtocolSettings.NO_ENCRYPTION, "smtpmail.t-online.de", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["Vodafone", "vodafone.de", AccountWizard.POP, "pop.email.vodafone.de", 110, ProtocolSettings.NO_ENCRYPTION, "smtp.email.vodafone.de", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["TDC", "maik.dk", AccountWizard.POP, "pop3.mail.dk", 110, ProtocolSettings.NO_ENCRYPTION, "asmtp.mail.dk", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["HGC Broadband", "hgcbroadband.com", AccountWizard.POP, "pop.hgcbroadband.com", 110, ProtocolSettings.NO_ENCRYPTION, "mail02.hgcbroadband.com", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["HKBN", "hkbn.net", AccountWizard.POP, "popo.hkbn.net", 110, ProtocolSettings.NO_ENCRYPTION, "smtpo.hkbn.net", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["HKBN Citimail", "ctimail.com", AccountWizard.POP, "popo.ctimail.com", 110, ProtocolSettings.NO_ENCRYPTION, "smtpo.ctimail.com", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["Tim", "tim.it", AccountWizard.POP, "box.posta.tim.it", 110, ProtocolSettings.NO_ENCRYPTION, "mail.posta.tim.it", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["Interia", "interia.pl", AccountWizard.POP, "poczta.interia.pl", 110, ProtocolSettings.NO_ENCRYPTION, "poczta.interia.pl", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["Tele2", "tele2.se", AccountWizard.POP, "pop.swip.net", 110, ProtocolSettings.NO_ENCRYPTION, "smtp.tele2.se", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["KSC", "pchome.com.th", AccountWizard.POP, "pop.th.com", 110, ProtocolSettings.NO_ENCRYPTION, "smtp.th.com", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["Clara.net", "clara.co.uk", AccountWizard.POP, "pop.clara.net", 110, ProtocolSettings.NO_ENCRYPTION, "relay.clara.net", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["ATT Global", "attglobal.net", AccountWizard.POP, "pop1.attglobal.net", 110, ProtocolSettings.NO_ENCRYPTION, "smtp1.attglobal.net", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["Go Daddy", "godaddy.com", AccountWizard.POP, "mail.godaddy.com", 110, ProtocolSettings.NO_ENCRYPTION, "smtpout.secureserver.net", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["Mail.com", "mail.com", AccountWizard.POP, "pop1.mail.com", 110, ProtocolSettings.NO_ENCRYPTION, "smtp1.mail.com", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["Usa.net", "usa.net", AccountWizard.POP, "pop.netaddress.com", 110, ProtocolSettings.NO_ENCRYPTION, "smtp.postoffice.net", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["Verizon", "verizon.net", AccountWizard.POP, "incoming.verizon.net", 110, ProtocolSettings.NO_ENCRYPTION, "outgoing.verizon.net", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["VNN", "vnn.com", AccountWizard.POP, "mail.vnn.vn", 110, ProtocolSettings.NO_ENCRYPTION, "smtp.mail.vnn.vn", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["Digitel", "digitelgsm.com.ve", AccountWizard.POP, "pop.digitel.com.ve", 110, ProtocolSettings.NO_ENCRYPTION, "gprsmail.412.com.ve", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["BellMo", "bell.net", AccountWizard.POP, "pophm.sympatico.ca", 995, ProtocolSettings.SSL, "smtphm.sympatico.ca", 25, ProtocolSettings.TLS, AccountWizard.USE_INBOUND, 10],
    ["BellMo", "sympatico.ca", AccountWizard.POP, "pophm.sympatico.ca", 995, ProtocolSettings.SSL, "smtphm.sympatico.ca", 25, ProtocolSettings.TLS, AccountWizard.USE_INBOUND, 10],
    ["Charter", "charter.net", AccountWizard.POP, "mail.charterinternet.com", 110, ProtocolSettings.NO_ENCRYPTION, "smtp.charterinternet.com", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["RoadRunner", "sc.rr.com", AccountWizard.POP, "pop-server.sc.rr.com", 110, ProtocolSettings.NO_ENCRYPTION, "smtp-server.sc.rr.com", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["RoadRunner", "roadrunner.com", AccountWizard.POP, "pop-server.sc.rr.com", 110, ProtocolSettings.NO_ENCRYPTION, "smtp-server.sc.rr.com", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["Cox", "cox.net", AccountWizard.POP, "pop.east.cox.net", 995, ProtocolSettings.SSL, "smtp.east.cox.net", 465, ProtocolSettings.SSL, AccountWizard.USE_INBOUND, 10],
    ["Cox", "cox.net", AccountWizard.POP, "pop.central.cox.net", 995, ProtocolSettings.SSL, "smtp.central.cox.net", 465, ProtocolSettings.SSL, AccountWizard.USE_INBOUND, 10],
    ["Cox", "cox.net", AccountWizard.POP, "pop.west.cox.net", 995, ProtocolSettings.SSL, "smtp.west.cox.net", 465, ProtocolSettings.SSL, AccountWizard.USE_INBOUND, 10],
    ["SFR", "sfr.fr", AccountWizard.POP, "pop.sfr.fr", 110, ProtocolSettings.NO_ENCRYPTION, "smtp-auth.sfr.fr", 587, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["Neuf", "neuf.fr", AccountWizard.POP, "pop.neuf.fr", 110, ProtocolSettings.NO_ENCRYPTION, "smtp-auth.sfr.fr", 587, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["Club-Internet", "club-internet.fr", AccountWizard.POP, "pop3.club-internet.fr", 110, ProtocolSettings.NO_ENCRYPTION, "smtp-auth.sfr.fr", 587, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["Cegetel", "cegetel.net", AccountWizard.POP, "pop.cegetel.net", 110, ProtocolSettings.NO_ENCRYPTION, "smtp-auth.sfr.fr", 587, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["Noos", "noos.fr", AccountWizard.POP, "pop.noos.fr", 110, ProtocolSettings.NO_ENCRYPTION, "smtp-auth.sfr.fr", 587, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["Tele2", "tele2.fr", AccountWizard.POP, "pop.tele2.fr", 110, ProtocolSettings.NO_ENCRYPTION, "smtp-auth.sfr.fr", 587, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["Terra", "terra.es", AccountWizard.POP, "pop3.terra.es", 110, ProtocolSettings.NO_ENCRYPTION, "mailhost.terra.es", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["Vodafone", "vodafone.es", AccountWizard.POP, "pop3.vodafone.es", 110, ProtocolSettings.NO_ENCRYPTION, "smtp.vodafone.es", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.NO_AUTH, 10],
    // Prodigy/Infinitum for Mexico.
    ["Prodigy", "prodigy.net.mx", AccountWizard.POP, "pop.prodigy.net.mx", 110, ProtocolSettings.NO_ENCRYPTION, "smtp.prodigy.net.mx", 587, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["Infinitum", "telmexmail.com", AccountWizard.POP, "pop3.live.com", 995, ProtocolSettings.SSL, "smtp.live.com", 587, ProtocolSettings.SSL, AccountWizard.USE_INBOUND, 10],
    // Domains from the China email settings spreadsheet
    ["Tencent", "qq.com", AccountWizard.IMAP, "imap.qq.com", 993, ProtocolSettings.SSL, "smtp.qq.com", 465, ProtocolSettings.SSL, AccountWizard.USE_INBOUND, 10],
    ["Tencent", "vip.qq.com", AccountWizard.IMAP, "imap.qq.com", 993, ProtocolSettings.SSL, "smtp.qq.com", 465, ProtocolSettings.SSL, AccountWizard.USE_INBOUND, 10],
    ["Tencent", "foxmail.com", AccountWizard.IMAP, "imap.qq.com", 993, ProtocolSettings.SSL, "smtp.qq.com", 465, ProtocolSettings.SSL, AccountWizard.USE_INBOUND, 10],
    ["Sina", "vip.sina.com", AccountWizard.POP, "pop3.vip.sina.com", 110, ProtocolSettings.NO_ENCRYPTION, "smtp.vip.sina.com", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["Sina", "sina.cn", AccountWizard.POP, "pop.sina.cn", 110, ProtocolSettings.NO_ENCRYPTION, "smtp.sina.cn", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["Sina", "sina.com", AccountWizard.POP, "pop.sina.com", 110, ProtocolSettings.NO_ENCRYPTION, "smtp.sina.com", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["Sohu", "mail.sohu.com", AccountWizard.IMAP, "mail.sohu.com", 143, ProtocolSettings.NO_ENCRYPTION, "mail.sohu.com", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["126", "126.com", AccountWizard.IMAP, "imap.126.com", 993, ProtocolSettings.SSL, "smtp.126.com", 465, ProtocolSettings.SSL, AccountWizard.USE_INBOUND, 10],
    ["163", "163.com", AccountWizard.IMAP, "imap.163.com", 993, ProtocolSettings.SSL, "smtp.163.com", 465, ProtocolSettings.SSL, AccountWizard.USE_INBOUND, 10],
    ["163", "vip.163.com", AccountWizard.IMAP, "imap.vip.163.com", 993, ProtocolSettings.SSL, "smtp.vip.163.com", 465, ProtocolSettings.SSL, AccountWizard.USE_INBOUND, 10],
    ["139", "139.com", AccountWizard.POP, "pop.139.com", 110, ProtocolSettings.NO_ENCRYPTION, "smtp.139.com", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["CT189", "189.cn", AccountWizard.IMAP, "imap.189.cn", 143, ProtocolSettings.NO_ENCRYPTION, "smtp.189.cn", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["CUWo", "wo.com.cn", AccountWizard.POP, "pop.wo.com.cn", 110, ProtocolSettings.NO_ENCRYPTION, "smtp.wo.com.cn", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["21cn", "21cn.com", AccountWizard.IMAP, "imap.21cn.com", 143, ProtocolSettings.NO_ENCRYPTION, "smtp.21cn.com", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["21cn", "21cn.net", AccountWizard.IMAP, "imap.21cn.net", 143, ProtocolSettings.NO_ENCRYPTION, "smtp.21cn.net", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["Tom", "tom.com", AccountWizard.POP, "pop.tom.com", 110, ProtocolSettings.NO_ENCRYPTION, "smtp.tom.com", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["Tom", "163.net", AccountWizard.POP, "pop.163.net", 110, ProtocolSettings.NO_ENCRYPTION, "smtp.163.net", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["Yahoo", "yahoo.com.cn", AccountWizard.POP, "pop.mail.yahoo.com.cn", 110, ProtocolSettings.NO_ENCRYPTION, "smtp.mail.yahoo.com.cn", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["Yahoo", "yahoo.cn", AccountWizard.POP, "pop.mail.yahoo.cn", 110, ProtocolSettings.NO_ENCRYPTION, "smtp.mail.yahoo.cn", 25, ProtocolSettings.NO_ENCRYPTION, AccountWizard.USE_INBOUND, 10],
    ["", ""] // Must be the last line
];


AccountWizard.PredefinedEasAccounts = {
    "palm.com": {
        "server": "https://us-owa.palm.com",
        "protocol": AccountWizard.EAS,
        "domain": "",
        "port": 443,
        "ssl": ProtocolSettings.SSL,
        "priority": AccountWizard.MAX_PRIORITY
    },
    "hp.com": {
        "server": "https://sync.hp.com",
        "protocol": AccountWizard.EAS,
        "domain": "americas",
        "port": 443,
        "ssl": ProtocolSettings.SSL,
        "priority": AccountWizard.MAX_PRIORITY
    }
};


/** 'Static' methods **/

// PROBABLY DON'T NEED THIS
// luna service call that wraps dig -t mx y7mail.com

//// Make an asynchronous call to findMxRecords to lookup the MX records
// which will then call _guessAccountSettings with the results.
//			serviceThread.sendMessageWithCallback("palm://com.palm.nettools/findMxRecords",
//					"{\"domainName\":" + JSONObject.quote(domain) + "}",
//					new MxLookupCallback(emailAddress, password, domain));
// List of all domains that should use the YAHOO IMAP protocol (list comes from NOV-49831)

// Check if the MX server ends in yahoo.com
AccountWizard._isYahooMXServer = function (mxServer) {
    return AccountWizard.isDomainMxServer("yahoo.com", mxServer) || AccountWizard.isDomainMxServer("yahoodns.net", mxServer);
};

// Check if the MX server ends in google.com
AccountWizard._isGoogleMXServer = function (mxServer) {
    return AccountWizard.isDomainMxServer("google.com", mxServer);
};

// Returns whether the given MX server belongs to a domain
AccountWizard.isDomainMxServer = function (domain, mxServer) {
    if (!mxServer) {
        return false;
    }
    if (mxServer === domain) {
        return true;
    }
    var dSuffix = "." + domain;
    var lastIndex = mxServer.lastIndexOf(dSuffix);
    return (lastIndex > -1 && lastIndex === (mxServer.length - dSuffix.length));
};


/**
 * Take an email address string and remove the user@ prefix and the .xx suffix.
 * ie: passing jojo@fooBar.com will return fooBar;
 * @param {Object} email
 * REFAC do this with a regex anyway. This breaks for .co.uk type domains
 */
AccountWizard.getDomainSansTldExt = function (email) {
    if (!email || !email.length) {
        return "";
    }
    try {
        // ugly, but easier to read than regex
        var atIdx = email.lastIndexOf("@");
        if (atIdx < 0) {
            // not an email address
            return "";
        }
        email = email.substring(atIdx + 1);
        return email.substring(0, email.lastIndexOf("."));
    } catch (e) {
        return "";
    }
};


/**
 * Used to create an account alias suggestion for a passed email address.
 * ie: passing jojo@palm.com will return 'Palm' as the recommended account name.
 * @param {Object} email -- email address to base suggestion off of
 */
AccountWizard.getProposedAlias = function (email) {
    if (!email || !email.length) {
        return "";
    }
    email = AccountWizard.getDomainSansTldExt(email);
    if (!email) {
        return "";
    }
    if (email.length === 1) {
        return email.toUpperCase();
    }
    // capitalize first letter of string
    email = email.slice(0, 1).toUpperCase() + email.slice(1, email.length);
    return email;
};

// REFAC
var EmailAccountValidation = function () {
};
// The numbers used here are VERY important.  Remember that the Account
// Wizard will attempt to connect to multiple server on many ports, and
// it is important that the best result is returned to the user.  A higher
// number indicates the likely hood of the user seeing that particular message
// It is obviously better to tell the user "invalid username/password" if
// we correctly guessed the server settings, rather then "host not found"
// for a server that we guessed at, but doesn't exist

// These errors return by the wizard (and handled by the Wizard UI)
// These MUST correspond to those in wizard-assistant.js


// If the email settings are known, recommend the user retries
// rather than take them to Manual Setup
EmailAccountValidation.FAILED_RETRY_RECOMMENDED_KNOWN_ISP = 50;
EmailAccountValidation.FAILED_RETRY_RECOMMENDED = 55;

// Login failures
EmailAccountValidation.BAD_EMAIL_OR_PASSWORD = 1005;

// Server-specific errors that the user can fix
EmailAccountValidation.HOTMAIL_NOT_ENABLED = 500;
EmailAccountValidation.SECURITY_POLICY_CHECK_NEEDED = 2500;

// Server failures
EmailAccountValidation.ILLEGAL_PARAMETER = 980;
EmailAccountValidation.FAILED = 990; // validation failed. not related to connection
EmailAccountValidation.ACCOUNT_ALREADY_EXISTS = 995;
EmailAccountValidation.UNKNOWN = 100000000;


EmailAccountValidation.getMessageForError = function (errorNum) {
//TODO: Combine this list with EmailAccount
    var ret = "";
    switch (errorNum) {
    case EmailAccountValidation.FAILED_RETRY_RECOMMENDED_KNOWN_ISP :
        ret = $L("Failed to connect to server. Please verify your account settings and retry");
        break;
    case EmailAccountValidation.FAILED_RETRY_RECOMMENDED :
        ret = $L("Failed to validate account. Please verify your account settings and retry");
        break;
    case EmailAccount.BAD_USERNAME_OR_PASSWORD :
    case EmailAccountValidation.BAD_EMAIL_OR_PASSWORD :
        ret = $L("Error: Bad username or password");
        break;
    case EmailAccount.SECURITY_POLICY_NOT_SUPPORTED :
        ret = $L("Current EAS security policy is not supported");
        break;
    case EmailAccount.CONNECTION_FAILED :
        ret = $L("Connection failed");
        break;
    case EmailAccount.HOST_NOT_FOUND :
        ret = $L("Server or hostname not found");
        break;
    case EmailAccount.CONNECTION_TIMED_OUT :
        ret = $L("Validate timed out for account");
        break;
    case EmailAccountValidation.BAD_REQUEST :
        ret = $L("Error requesting information from server");
        break;
    case EmailAccountValidation.ILLEGAL_PARAMETER :
        ret = $L("Error: username or password not provided");
        break;
    case EmailAccount.NO_NETWORK :
        ret = $L("Wizard: No Internet connection");
        break;
    case EmailAccountValidation.ACCOUNT_ALREADY_EXISTS :
        ret = $L("Error: account already exists");
        break;
        // just use error text from server right now. this case, matching default, needed for jslint
        // case EmailAccountValidation.HOTMAIL_NOT_ENABLED :
        // case EmailAccount.INTERNAL_ERROR :
        // case EmailAccountValidation.SSL_CONNECTION_ERROR :
    default :
        ret = "";
    }
    return ret;
};

