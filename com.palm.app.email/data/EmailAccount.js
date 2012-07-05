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

// TODO: look at deprecating this

/*global Mojo, $L, Class, window, document, PalmSystem, AppAssistant, palmGetResource, Foundations, _,
 App, console, Throttler, $H, $A, Event, $break, Element,
 Poly9, MailtoURIParser,
 EmailFlags, EmailRecipient, EmailAppDepot, AccountpreferencesAssistant, Email, EmailAccount, EmailDecorator,
 ObjCache, NotificationAssistant, LaunchHandler, FirstUseLaunchHandler, FirstUseAssistant, AudioTag,
 Contact, ContactReminder, Attachments, MenuController, ErrorAnalyzer, Folder, FolderFlags, IMName, Message,
 ServiceStrings, ColorPickerDialogAssistant, SecuritypolicyAssistant, EmaillistDataSource, Pseudocard,
 CreateAssistant, ComposeAssistant, ConnectionWidget, EmailApp, NetworkAlerts, EmailAccountValidation,
 ProtocolSettings, AccountWizard */

/*global EmailAccount:true */

var EmailAccount = function () {

    this.type = AccountWizard.POP;
    this.address = '';

    this.server = '';
    this.username = '';
    this.domain = '';
    this.password = '';
    this.useSsl = false;
    this.port = 0;
    this.encryption = "none";

    this.smtpHost = '';
    this.smtpLogin = '';
    this.smtpPassword = '';
    this.useSmtpAuthentication = false;
    this.smtpSsl = false;
    this.smtpPort = 0;
    this.smtpEncryption = "none";

    this.syncLookback = 7;
    this.syncFrequencyMins = 0;
    this.useHTML = true;
    this.playSound = true;
    this.proxyPassword = '';
};


EmailAccount.prototype.storeValueFromField = function (element) {
    this[element.name] = element.value;
};

EmailAccount.prototype.setServerPort = function (override) {
    switch (this.type) {
    case AccountWizard.IMAP:
        if (override || !this.port || (this.port == 993 || this.port == 143)) {
            switch (this.encryption) {
            case ProtocolSettings.SSL:
                this.port = 993;
                break;

            case ProtocolSettings.TLS:
                //TLS uses the same port as the one for none-SSL
                this.port = 143;
                break;

            default:
                this.port = 143;
                break;
            }
        }
        break;
    case AccountWizard.POP:
        if (override || !this.port || (this.port == 995 || this.port == 110)) {
            switch (this.encryption) {
            case ProtocolSettings.SSL:
                this.port = 995;
                break;

            case ProtocolSettings.TLS:
                //TLS uses the same port as the one for none-SSL
                this.port = 110;
                break;

            default:
                this.port = 110;
                break;
            }
        }
        break;
    }
};

EmailAccount.prototype.setSmtpPort = function (override) {
    if (override || !this.smtpPort || (this.smtpPort == 465 || this.smtpPort == 25)) {
        switch (this.smtpEncryption) {
        case ProtocolSettings.SSL:
            this.smtpPort = 465;
            break;

        case ProtocolSettings.TLS:
            //TLS uses the same port as the one for none-SSL
            this.smtpPort = 25;
            break;

        default:
            this.smtpPort = 25;
            break;
        }
    }
};

EmailAccount.prototype.setDefaultPortsForServerType = function (override) {
    switch (this.type) {
    case AccountWizard.EAS:
        if (override || !this.port) {
            this.port = 443;
        }
        break;
    case AccountWizard.IMAP:
    case AccountWizard.POP:
        this.setServerPort(override);
        this.setSmtpPort(override);
        break;
    }
};

EmailAccount.identifier = 'palm://com.palm.mail';


// The best possible result to return to the user!
EmailAccount.VALIDATED = 0;        // validated that there is no error in an account.

// Server Account Errors
EmailAccount.BAD_USERNAME_OR_PASSWORD = 1000;	// invalid user name or password
EmailAccount.MISSING_CREDENTIALS = 1010;		// no password stored on device (e.g. after a restore)
EmailAccount.ACCOUNT_LOCKED = 1100;      // user account is locked
EmailAccount.ACCOUNT_UNAVAILABLE = 1110;       // user account is temporarily unavailable
EmailAccount.ACCOUNT_WEB_LOGIN_REQUIRED = 1120;    // web login is required to unlocked user account
EmailAccount.ACCOUNT_UNKNOWN_AUTH_ERROR = 1299;    // generic unknown authentication error
EmailAccount.ACCOUNT_NEEDS_PROVISIONING = 1310;
EmailAccount.LOGIN_TIMEOUT = 1320;				// timeout during login; possibly due to bad password

// Reserved EAS account specific errors: 1500-1649

// Reserved IMAP account specific errors: 1650-1799

// Reserved POP account specific erros: 1800-1899

// Reserved SMTP account specific errors: 1900-1999
EmailAccount.AUTHENTICATION_REQUIRED = 1900;   // SMTP specific error that indicates device needs to authenticate before sending email


// Security Policy Errors
EmailAccount.SECURITY_POLICY_NOT_SUPPORTED = 2000; // Security policy is not supported by device

// Reserved EAS security policy specific errors: 2500-2649

// Connection Errors
EmailAccount.HOST_NOT_FOUND = 3000;        // host name is not found
EmailAccount.CONNECTION_TIMED_OUT = 3010;  // time-out to get a connection
EmailAccount.CONNECTION_FAILED = 3099;     // generic connection failure
EmailAccount.NO_NETWORK = 3200;            // no connectivity

// Reserved EAS connection specific errors: 3500-3649

// Reserved IMAP connection specific errors: 3650-3799

// Reserved POP connection specific erros: 3800-3899

// Reserved SMTP connection specific errors: 3900-3999

// SSL Errors
EmailAccount.SSL_CERTIFICATE_EXPIRED = 4000;   // SSL certificate has been expired
EmailAccount.SSL_CERTIFICATE_NOT_TRUSTED = 4010;   // SSL certificate is not trusted by mail server
EmailAccount.SSL_CERTIFICATE_INVALID = 4020;   // SSL certificate is no longer valid
EmailAccount.SSL_HOST_NAME_MISMATCHED = 4100;  // Host name in certificate doesn't match the one mail server trusts

// Reserved EAS specific errors: 4500-4649

// Reserved IMAP specific errors: 4650-4799

// Reserved POP specific erros: 4800-4899

// Reserved SMTP specific errors: 4900-4999

// Server Request Errors
EmailAccount.MAILBOX_FULL = 5000;          // mail box is full
EmailAccount.FOLDER_NOT_FOUND = 5100;      // folder does not exist in server any more
EmailAccount.FOLDER_CORRUPTED_ON_SERVER = 5110;    // folder is corrupted in server
EmailAccount.EMAIL_NOT_FOUND = 5200;       // email is not found in server any more
EmailAccount.ATTACHMENT_TOO_LARGE = 5210;	// attachment is too large to download (server error)

// (The following EAS specific errors are retrieved from p348-p349 in EAS.pdf)
// Reserved EAS specific errors for server request: 5500-5649
EmailAccount.EAS_PROTOCOL_VERSION_MISMATCHED = 5502;   // EAS protocol version mismatched
EmailAccount.EAS_INVALID_SYNC_KEY = 5503;          // invalid synchronization key
EmailAccount.EAS_PROTOCOL_ERROR = 5504;            // protocol error
EmailAccount.EAS_SERVER_ERROR = 5505;          // server error
EmailAccount.EAS_CLIENT_SERVER_CONVERSION_ERROR = 5506;    // error in client/server conversion
EmailAccount.EAS_OBJECT_MISMATCHED = 5507;         // conflict matching the client and server object
EmailAccount.EAS_OBJECT_NOT_FOUND = 5508;          // object not found

// The EAS error code for user account may be out of disk space should be mapped to 'MAILBOX_FULL' value
EmailAccount.EAS_SET_NOTIFICATION_GUID_ERROR = 5510;   // error occurred while setting notificaion GUID
EmailAccount.EAS_NEED_PROVISION_FOR_NOTIFICATION = 5511;   // device has not been provisioned for notifications
EmailAccount.EAS_FOLDER_HIERARCHY_CHANGED = 5512;      // foder Hierarchy has changed
EmailAccount.EAS_EMPTY_SYNC_REQUEST_ERROR = 5513;      // server is unable to process empty Sync request
EmailAccount.EAS_INVALID_WAIT_INTERVAL = 5514;     // wait-interval specified by device is outside the range set by the server administrator
EmailAccount.EAS_SYNC_FOLDERS_LIMIT_EXCEEDED = 5515;   // exceeds the maximum number of folder that can be synchronized
EmailAccount.EAS_INDETERMINATE_STATE = 5516;       // indetermainte state

// Reserved IMAP specific errors for server request: 5650-5799

// Reserved POP specific errors for server request: 5800-5899

// Reserved SMTP specific errors for server request: 5900-5999

// Send Mail Errors
EmailAccount.EMAIL_SIZE_EXCEEDED = 6000;       // cannot send an email whose size exceeds the server limit
EmailAccount.BAD_RECIPIENTS = 6010;        // one or more email recipients are invalid

EmailAccount.BAD_PROTOCOL_CONFIG = 9800;			// generic error; specified server doesn't seem to speak IMAP/POP/EAS/SMTP
EmailAccount.EAS_CONFIG_BAD_URL = 9810;			// URL doesn't appear to be a valid EAS server URL
EmailAccount.CONFIG_NO_SSL = 9820;			// Requested encryption is not supported
EmailAccount.CONFIG_NEEDS_SSL = 9821;			// Must enable encryption to continue
EmailAccount.SMTP_CONFIG_UNAVAILABLE = 9830;	// No outgoing (SMTP) server configured

// Generic Errors
EmailAccount.INTERNAL_ERROR = 10000;       // generic internal error


EmailAccount.getAccounts = function (sceneController, callback, failCallback) {
    sceneController.serviceRequest(Email.identifier, {
        method: 'accountList', // another example, if not done in the URL
        onSuccess: callback,
        onFailure: failCallback
    });
};

EmailAccount.subscribeAccounts = function (callback, failCallback) {
    var request = new Mojo.Service.Request(Email.identifier, {
        method: 'accountList',
        parameters: {'subscribe': true},
        onSuccess: callback,
        onFailure: failCallback
    });
    return request;
};

/**
 * Get the mail account settings from a mail account json object
 * @param {Object} mailAccount
 */
/* Not useful at the moment. Could become useful later
 EmailAccount.getAccountDetails = function(mailAccount, callback) {
 ////Mojo.Log.error("### Making call to MojoDB for kind %s", mailAccount._kind);
 Foundations.Comms.PalmCall.call('palm://com.palm.db/', 'find', {
 "query": {
 "from": mailAccount._kind,
 "where": [{
 "prop": "accountId",
 "op": "=",
 "val": mailAccount.accountId
 }]
 }
 }).then(function(future) {
 callback(future.result);
 });
 };
 */

/* Keep around?
 EmailAccount.getAccountPassword = function(accountId, callback) {
 Foundations.Comms.PalmCall.call('palm://com.palm.db/', 'find', {
 "query": {
 "from": "com.palm.account.credentials:1",
 "where": [{
 "prop": "key",
 "op": "=",
 "val": accountId + ":common"
 }]
 }
 }).then(function(future) {
 callback(future.result);
 });
 };
 */


EmailAccount.getAccountPreferences = function (sceneController, account, callback, failCallback) {
    callback(account);
    // TODO: Reworkd this once we know were all the account stuff is stored
    /*
     sceneController.serviceRequest(Email.identifier, {
     method: 'accountPreferences',
     parameters: {'account': accountId},
     onSuccess: callback,
     onFailure: failCallback
     });
     */
};

EmailAccount.saveAccountDetails = function (params, onSuccess, onFail) {
// TODO: Simplify this function sig
    var config = params.config || params;

    if (params.credentials) {
        params.credentials.smtp = params.credentials.smtp || null;
        EmailAccount.saveCredentials(config.accountId, params.credentials);
    }

    var toSave = EmailAccount.__cleanParams(config);
    if (!toSave._id) {
        onSuccess(); // nothing to save. We're good
        return;
    }

    var reqHandler = enyo.bind(this, EmailApp.Util.callbackRouter, onSuccess, (onFail || function () {
        console.log("--- failed to save object")
    }));
    EmailApp.Util.callService('palm://com.palm.db/merge', {objects: [toSave]}, reqHandler);
};

EmailAccount.__cleanParams = function (params) {
// TODO: Update property names on scene
    // TODO: REview this for completeness
    var mailAcct = (params.config) ? params.config : params;
    if (mailAcct.type && !mailAcct.protocol) {
        mailAcct.protocol = mailAcct.type;
    }

    // get current com.palm.mail.account record data for update determination
    var accts = enyo.application.accounts;
    var combined = accts && accts.getAccount(mailAcct.accountId);
    var base = (combined) ? combined.getPrefsData() : {};

    var toSave = {}
    var updated = false, updatedSmtp = false;
    var key;

    var keys = ["port", "server", "username", "encryption", "domain", "rootFolder", "useSmtpAuth"];
    keys.forEach(function (key) {
        if (mailAcct[key] !== undefined && mailAcct[key] !== base[key]) {
            toSave[key] = mailAcct[key];
            updated = true;
        }
    });

    if (mailAcct.smtpConfig && mailAcct.protocol !== AccountWizard.EAS) {
        var smtpToSave = {}, srcSmtp = mailAcct.smtpConfig, baseSmtp = base.smtpConfig || {};
        keys.forEach(function (key) {
            if (srcSmtp[key] !== undefined && srcSmtp[key] !== baseSmtp[key]) {
                smtpToSave[key] = srcSmtp[key];
                updatedSmtp = true;
            }
        });
        if (updatedSmtp) {
            toSave.smtpConfig = smtpToSave;
        }
    }
    if (updated || updatedSmtp) {
        toSave._id = mailAcct._id;
    }
    return toSave;
};

EmailAccount.savePassword = function (accountId, password, key) {
    if (!accountId) {
        return;
    }

    var creds = {};
    creds[key] = {"password": password};

    EmailAccount.saveCredentials(accountId, creds);
};


EmailAccount.saveCredentials = function (accountId, credentials) {
    if (!accountId) {
        return;
    }

    Object.keys(credentials).forEach(
        function (key) {
            EmailApp.Util.callService("palm://com.palm.service.accounts/writeCredentials", {
                "accountId": accountId,
                "credentials": credentials[key],
                "name": key
            });
        }
    );
};


EmailAccount.getCredentials = function (accountId, key, callback) {
    if (!accountId) {
        return;
    }
    var success = function (res) {
        callback(res && res.credentials);
    };
    return EmailApp.Util.callService("palm://com.palm.service.accounts/readCredentials", {
        "accountId": accountId,
        "name": key
    }, success);
};

EmailAccount.saveAccountPreferences = function (sceneController, params, callback, failCallback) {
    // This is needed to convert the 'useHTML' property to a boolean because the ListSelector only
    // uses numeric values in its choices, but the service interface is booleans.
    if (params.useHTML !== undefined) {
        params.useHTML = (params.useHTML > 0);
    }
    sceneController.serviceRequest(Email.identifier, {
        method: 'setAccountPreferences',
        parameters: params,
        onSuccess: callback,
        onFailure: failCallback
    });
};


/**
 * Disable email for the provided account. Note that this will only delete the account if
 * MAIL is the last capability enabled on the account. In all other cases it will just prevent
 * the account from displaying in the email app.
 * @param {Object} accountId
 * @param {Object} callback
 */
EmailAccount.removeAccount = function (accountId, callback) {

    var account = EmailApp.accounts.getAccount(accountId);
    if (!account) {
        return;
    }
    var capsToSave = [];
    var currentCaps = account.getAccountData().capabilityProviders;
    var cap;

    for (var i = 0, len = currentCaps.length; i < len; ++i) {
        cap = currentCaps[i];
        // remove the mail capability. Accounts is the only place to delete the account.
        if (cap.capability !== "MAIL") {
            capsToSave.push(cap);
        }
    }

    var method = 'modifyAccount';
    var args = {
        'accountId': accountId,
        'object': {
            'capabilityProviders': capsToSave
        }
    };
    if (capsToSave.length === 0) {
        method = 'deleteAccount';
        args.object = undefined;
    }

    Foundations.Comms.PalmCall.call('palm://com.palm.service.accounts/', method, args).then(
        function (future) {
            callback();
        });
};

EmailAccount.setAccountsOrder = function (sceneController, accountList, callback, failCallback) {
    sceneController.serviceRequest(Email.identifier, {
        method: 'accountOrderSet', // another example, if not done in the URL
        parameters: {'accounts': accountList},
        onSuccess: callback,
        onFailure: failCallback
    });
};

EmailAccount.getFullName = function (sceneController, callback) {
    sceneController.serviceRequest('palm://com.palm.systemservice', {
        method: 'getPreferences',
        parameters: {'keys': ['deviceName']},
        onSuccess: callback
    });
};

EmailAccount.getFirstUseEmailAddress = function (callback) {
    var request = new Mojo.Service.Request('palm://com.palm.accountservices', {
        method: 'getAccountToken',
        onSuccess: callback,
        onFailure: callback
    });
    return request;
};

EmailAccount.isNotSmartFolders = function (account) {
    return (account.originalLogin && account.originalLogin.length > 0);
};


// We store error strings in a hash for easy lookup:
EmailAccount._errorStrings = {};
(function () {
    var strings = EmailAccount._errorStrings;

    // Login errors
    strings[EmailAccount.ACCOUNT_LOCKED] = $L("This account is locked.");
    strings[EmailAccount.ACCOUNT_UNAVAILABLE] = $L("The account is temporarily unavailable. Please try again in a few minutes.");
    strings[EmailAccount.BAD_USERNAME_OR_PASSWORD] = $L("Check your login and password.");
    strings[EmailAccount.MISSING_CREDENTIALS] = $L("Please sign into this account.");
    strings[EmailAccount.LOGIN_TIMEOUT] = $L("Login timed out. Check your login and password.");

    // Network errors
    strings[EmailAccount.HOST_NOT_FOUND] = $L("Host name cannot be resolved.");
    strings[EmailAccount.CONNECTION_TIMED_OUT] = $L("Could not connect or connection timed out.");
    strings[EmailAccount.CONNECTION_FAILED] = strings[EmailAccount.CONNECTION_TIMED_OUT];
    strings[EmailAccount.NO_NETWORK] = $L("Network is currently unavailable.");

    // Configuration errors
    strings[EmailAccount.BAD_PROTOCOL_CONFIG] = $L("Server does not support specified protocol");
    strings[EmailAccount.EAS_CONFIG_BAD_URL] = $L("Invalid EAS server URL.");
    strings[EmailAccount.CONFIG_NO_SSL] = $L("Requested encryption not supported by server.");
    strings[EmailAccount.CONFIG_NEEDS_SSL] = $L("Server requires encryption. Please enable SSL and try again.");
    strings[EmailAccount.AUTHENTICATION_REQUIRED] = $L("SMTP server requires authentication to be enabled.");
    strings[EmailAccount.SMTP_CONFIG_UNAVAILABLE] = $L("No outgoing mail server configured. Check your account settings.");

    // SSL errors
    strings[EmailAccount.SSL_HOST_NAME_MISMATCHED] = $L("The server's security certificate is not valid for the domain.");
    strings[EmailAccount.SSL_CERTIFICATE_EXPIRED] = $L("The server's security certificate has expired.");
    strings[EmailAccount.SSL_CERTIFICATE_NOT_TRUSTED] = $L("The server's security certificate is not a trusted certificate.");
    strings[EmailAccount.SSL_CERTIFICATE_INVALID] = $L("The server's security certificate is invalid.");

    strings[EmailAccount.SECURITY_POLICY_NOT_SUPPORTED] = $L("Security policy error.");
    strings[EmailAccount.ACCOUNT_WEB_LOGIN_REQUIRED] = $L("Web login required.");

    // Other account errors
    strings[EmailAccount.MAILBOX_FULL] = $L("Your mailbox is full.");

    // Other mail errors
    strings[EmailAccount.EAS_SERVER_ERROR] = $L("An error has occurred on the server.");
    strings[EmailAccount.ATTACHMENT_TOO_LARGE] = $L("The server does not allow downloading attachments this large.");
})();

EmailAccount._dashboardErrorStrings = {};
(function () {
    var strings = EmailAccount._dashboardErrorStrings;
    var errorStrings = EmailAccount._errorStrings;

    strings[EmailAccount.BAD_USERNAME_OR_PASSWORD] = errorStrings[EmailAccount.BAD_USERNAME_OR_PASSWORD];
    strings[EmailAccount.ACCOUNT_WEB_LOGIN_REQUIRED] = errorStrings[EmailAccount.ACCOUNT_WEB_LOGIN_REQUIRED];
    strings[EmailAccount.MAILBOX_FULL] = errorStrings[EmailAccount.MAILBOX_FULL];

    strings[EmailAccount.SSL_HOST_NAME_MISMATCHED] = $L("Security certificate not valid for domain.");
    strings[EmailAccount.SSL_CERTIFICATE_EXPIRED] = $L("Security certificate expired.");
    strings[EmailAccount.SSL_CERTIFICATE_NOT_TRUSTED] = $L("Security certificate not trusted.");
    strings[EmailAccount.SSL_CERTIFICATE_INVALID] = $L("Security certificate invalid.");
})();

EmailAccount.getErrorString = function (errorCode, errorMessage) {
    var msg = this._errorStrings[errorCode];

    if (msg) {
        return msg;
    }

    if (errorCode === EmailAccount.INTERNAL_ERROR) {
        return EmailApp.Util.interpolate($L("Internal error: #{errorText}"), {errorText: errorMessage});
    } else {
        return EmailApp.Util.interpolate($L("Unspecified error: #{errorCode} - #{errorText}"), {errorCode: errorCode, errorText: errorMessage});
    }
};

EmailAccount.getDashboardErrorString = function (errorCode, errorMessage) {
    var msg = this._dashboardErrorStrings[errorCode];

    if (msg) {
        return msg;
    }

    return EmailAccount.getErrorString(errorCode, errorMessage);
}

// Determine the error associated with this mailAccount, considering both the overall account error, and potential smtpConfig error.
EmailAccount.getErrorCode = function (mailAccount) {
    var smtpError = mailAccount.smtpConfig;
    smtpError = smtpError && smtpError.error;
    return (mailAccount.error && mailAccount.error.errorCode) || (smtpError && smtpError.errorCode);
};

// Determine the error associated with this mailAccount, considering both the overall account error, and potential smtpConfig error.
EmailAccount.getErrorText = function (mailAccount) {
    var smtpError = mailAccount.smtpConfig;
    smtpError = smtpError && smtpError.error;
    return (mailAccount.error && mailAccount.error.errorText) || (smtpError && smtpError.errorText);
};

/* Returns descriptive messages to display, and decide if the setup can be retried  */
EmailAccount.getSetupFailureInfo = function (error, isManualSetup, isEAS, isOutboundError) {
    var title = $L("Unable to sign in");
    var introMessage = "";
    var connectionError = false;
    var text = EmailAccount._errorStrings[error.errorCode] || "";
    var followupHtml = "";
    var serverMessage = "";
    var serverValid = false; // valid if the server address/port seems correct
    var genericError = false;
    var retry = false;
    var sslError = false;
    var settingsError = false; // possible misconfiguration by user

    switch (error.errorCode) {
        // Prompt the user to turn on WiFi
    case EmailAccount.NO_NETWORK :
        title = $L("No Connectivity");
        text = $L("You need to be connected to the internet to create an account.");
        retry = true;
        break;

    case EmailAccountValidation.ACCOUNT_ALREADY_EXISTS  :    // Duplicate account
        title = $L("Duplicate account");
        text = $L("An account using this email address already exists.");
        retry = false;
        break;
    case EmailAccount.EAS_CONFIG_BAD_URL:
        settingsError = true;

        if (isManualSetup) {
            followupHtml = $L("Example:<br>https://owa.example.com");
        }

        break;
    case EmailAccount.BAD_PROTOCOL_CONFIG:
    case EmailAccount.EAS_CONFIG_BAD_URL:
    case EmailAccount.CONFIG_NO_SSL:
    case EmailAccount.CONFIG_NEEDS_SSL:
        // TODO some more helpful error/followup messages
        genericError = true;
        settingsError = true;
        break;
    case EmailAccount.SSL_CERTIFICATE_EXPIRED :
    case EmailAccount.SSL_CERTIFICATE_NOT_TRUSTED:
    case EmailAccount.SSL_CERTIFICATE_INVALID:
    case EmailAccount.SSL_HOST_NAME_MISMATCHED:
        title = $L("Certificate error");
        if (isManualSetup) {
            followupHtml = $L("Check your server settings. If the settings are correct, contact your IT department or email provider for assistance.");
        }
        sslError = true;
        break;

    case EmailAccountValidation.FAILED_RETRY_RECOMMENDED_KNOWN_ISP :    // Wizard unable to validate known ISP (Shown in "Retry" dialog)
        text = $L("Unable to connect to the mail server.  Try again later.");
        retry = true;
        break;

    case EmailAccountValidation.FAILED_RETRY_RECOMMENDED :    // Wizard unable to auto-detect ISP settings (Shown in "Retry" dialog)
        text = $L("Unable to automatically set up your email account.");
        retry = true;
        break;

    case EmailAccount.HOST_NOT_FOUND:
    case EmailAccount.CONNECTION_FAILED:
    case EmailAccount.CONNECTION_TIMED_OUT:
        text = $L("Unable to connect to server.");
        genericError = true;
        connectionError = true;
        retry = true;
        break;

    case EmailAccount.BAD_USERNAME_OR_PASSWORD:    // Manual setup login error
    case EmailAccountValidation.BAD_EMAIL_OR_PASSWORD:    // Wizard setup login error
    case EmailAccount.ACCOUNT_WEB_LOGIN_REQUIRED: // captcha problem
    case EmailAccount.ACCOUNT_LOCKED = 1100: // account locked
    case EmailAccount.LOGIN_TIMEOUT: // login timed out, possibly due to bad password
        // Only show the server error message for manual setup
        if (isManualSetup && !isEAS) {
            serverMessage = error.errorText;
        }

        if (isOutboundError) {
            introMessage = $L("Could not sign in to outgoing mail server.");
        } else {
            introMessage = $L("Could not sign in to account.");
        }

        if (error.errorCode === EmailAccountValidation.BAD_EMAIL_OR_PASSWORD) {
            // FIXME: for now, always display "bad username or password" for the wizard
            //text = $L("Bad email address or password.");
            text = $L("Bad username or password.");
        } else if (error.errorCode === EmailAccount.BAD_USERNAME_OR_PASSWORD || !text) {
            text = $L("Bad username or password.");
        }

        // Hack for old-style error dialog
        if (!isManualSetup) {
            text = $L("The mail server responded:") + " " + text;
        }

        serverValid = true;
        retry = false;
        break;

    case EmailAccount.SECURITY_POLICY_NOT_SUPPORTED:    // EAS Security policy error
        title = $L("Unable to create account");
        text = $L("The mail server requires security policies that are not supported.");
        break;

    case EmailAccount.ACCOUNT_UNAVAILABLE: // usually due to trying to log in too many times
        retry = true;
        break;

    default:
        genericError = true;
    }

    if (settingsError && !introMessage) {
        if (isOutboundError) {
            introMessage = $L("Unable to validate outgoing mail server settings. Check the settings and try again.");
        } else {
            introMessage = $L("Unable to validate incoming mail server settings. Check the settings and try again.");
        }
    }

    return {
        messageParams: {
            title: title,
            introMessage: introMessage,
            errorMessage: text,
            serverMessage: serverMessage,
            followupHtml: followupHtml,
            error: error
        },
        retry: retry,
        serverValid: serverValid,
        sslError: sslError,
        genericError: genericError,
        connectionError: connectionError
    };
}

EmailAccount.HandleWifiEnableResponse = function (controller, response) {
    // If the user didn't turn on WiFi then show the Network Unavailable Dialog.
    //Mojo.Log.info("---- HandleWifiEnableResponse msg=" + response);
    if (response != "WiFi-UserCancelled" && response != "WiFi-Enabled") {
        return;
    }

    if (!controller || !controller.showError) {
        return;
    }

    controller.showError({
        onChoose: function (value) {
            if (value == 'help') {
                // Launch Help.
                controller.serviceRequest("palm://com.palm.applicationManager", {
                    method: "open",
                    parameters: {
                        id: 'com.palm.app.help',
                        params: {target: "no-network"}
                    }});
            }
        },
        title: $L("No Internet Connection"),
        message: alternateMessage || $L("You need an Internet connection to sign in to an account."),
        choices: [
            {label: $L('Help'), value: 'help', type: 'primary'},
            {label: $L('OK'), value: 'dismiss', type: 'dismiss'}
        ]
    });
};


EmailAccount.localizeAccountName = function (accountName) {
    accountName = accountName || "";
    if (!EmailAccount.DO_ACCOUNT_NAME_LOC) {
        return accountName;
    }
    return accountName.replace(/Gmail/g, EmailAccount.GMAIL);
};


/**
 * Method to create an EmailAccount js object from a com.palm.email.account
 * record
 * @param {Object} data
 * @param {function} passwordCallback -- optional callback for handling an updated password
 */
EmailAccount.createFromDbRecord = function (data, passwordCallback) {
    if (!data) {
        return undefined;
    }

    var toRet = new EmailAccount();
    toRet.type = undefined;
    var keys = Object.keys(data);
    // copy over all values
    keys.forEach(function (key) {
        toRet[key] = data[key];
    });

    if (toRet.accountId) {
        // TODO: Update gui to get rid of this.account
        toRet.account = this.accountId;
        toRet.address = data.username;
    }

    var checkCredentials = function (credentials) {
        return credentials && (credentials.password || credentials.securityToken || credentials.authToken) ? EmailAccount.PLACEHOLDER_PASS : "";
    };
    var inCheck = function (credentials) {
        toRet.password = checkCredentials(credentials);
        if (passwordCallback) {
            passwordCallback();
        }
    };
    EmailAccount.getCredentials(data.accountId, "common", inCheck);

    if (data.smtpConfig) {
        var smtpConfig = data.smtpConfig;
        toRet.smtpPort = smtpConfig.port;
        toRet.useSmtpAuthentication = !!smtpConfig.useSmtpAuth;
        toRet.smtpHost = smtpConfig.server;
        toRet.smtpEncryption = smtpConfig.encryption;
        toRet.smtpLogin = smtpConfig.username || toRet.username;
        toRet.smtpPassword = "";

        var outCheck = function (credentials) {
            toRet.smtpPassword = checkCredentials(credentials);
            if (toRet.smtpPassword === "") {
                toRet.useSmtpAuthentication = false;
            }
            if (passwordCallback) {
                passwordCallback();
            }
        };
        EmailAccount.getCredentials(data.accountId, "smtp", outCheck);
    }

    toRet.type = EmailApp.accounts.getAccountType(data.accountId);


    return toRet;
};


EmailAccount.createFromAccountId = function (id, passwordCallback) {
    return EmailAccount.createFromDbRecord(enyo.application.accounts.getAccount(id).getPrefsData(), passwordCallback);
};

// German Google Localization
EmailAccount.GMAIL = $L("Gmail");
EmailAccount.DO_ACCOUNT_NAME_LOC = EmailAccount.GMAIL !== 'Gmail';
EmailAccount.PLACEHOLDER_PASS = "******";
