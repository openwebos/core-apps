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

/*global Mojo, $L, Class, window, document, PalmSystem, AppAssistant, palmGetResource, Foundations, _,
 App, console, Throttler, $H, $A, Event, $break, Element,
 Poly9, MailtoURIParser,
 EmailFlags, EmailRecipient, EmailAppDepot, AccountpreferencesAssistant, Email, EmailAccount, EmailDecorator,
 AccountWizard, EmailAccountValidation */

/**ProtocolSettings: {

 name : accountName
 server: server URI;
 protocol:  protocol constant, as defined in AccountWizard. Can be SSL, EAS, POP, etc.
 domain: Optional. Can be constant matching protocol for yahoo/gmail accounts, or domain name for mailserver
 port : port number for protocol
 ssl: boolean;
 tls:  boolean, default false
 priority: priority for account. Lower number is a higher priority;
 username: username for login
 password: password for login
 authToken: optional. Like the name says
 policyKey: optional. usually null
 email: email address string
 protocolVersion: optional. String denoting version of protocol used;
 result: integer showing validation result. Defaults to EmailAccountValidation.UNKNOWN;

 }*/

function ProtocolSettings(payload) {
    if (payload.accountType && payload.predefArray) {
        ProtocolSettings.resolvePayloadType(payload);
    }

    this.protSet = {
        username: payload.email || payload.username, // 'username' for master account should be email address
        password: payload.password,
        config: {
            'username': payload.username,
            'email': payload.email,
            'server': payload.server,
            'domain': payload.domain,
            'port': payload.port,
            'encryption': this.determineEncryption(payload)
        },
        accountId: payload.accountId // optional. Used in edit cases
    };

    this.result = EmailAccountValidation.UNKNOWN;
    this.priority = payload.priority || AccountWizard.MAX_PRIORITY;
    this.protocol = payload.protocol;
}

ProtocolSettings.prototype.determineEncryption = function (params) {
    if (params.encryption !== undefined && params.ssl === undefined) {
        params.ssl = params.encryption;
    }
    if (params.ssl && params.tls) {
        return ProtocolSettings.TLS_IF_AVAIL;
    }
    if (params.tls) {
        if (typeof params.tls === "boolean") {
            return ProtocolSettings.TLS;
        }
    }
    if (params.ssl) {
        if (typeof params.ssl === "boolean") {
            return ProtocolSettings.SSL;
        } else if (params.ssl === ProtocolSettings.SSL) {
            return ProtocolSettings.SSL;
        } else if (params.ssl === ProtocolSettings.TLS) {
            return ProtocolSettings.TLS;
        }
    }

    return ProtocolSettings.NO_ENCRYPTION;
};


ProtocolSettings.resolvePayloadType = function (payload) {
    var predefArr = payload.predefArray;

    if (payload.accountType === "inbound") {
        payload.server = predefArr[AccountWizard.DB_IN_SERVER];
        payload.protocol = predefArr[AccountWizard.DB_TYPE];
        payload.domain = (predefArr[AccountWizard.DB_NAME] === AccountWizard.EAS) ? "" : predefArr[AccountWizard.DB_NAME];
        payload.port = predefArr[AccountWizard.DB_IN_PORT];
        payload.ssl = (predefArr[AccountWizard.DB_IN_ENCRYPTION] === ProtocolSettings.SSL);
        payload.tls = (predefArr[AccountWizard.DB_IN_ENCRYPTION] === ProtocolSettings.TLS);
        payload.priority = predefArr[AccountWizard.DB_PRIORITY];
        payload.name = "Validate_" + payload.protocol + payload.server + predefArr[AccountWizard.DB_IN_PORT] + predefArr[AccountWizard.DB_IN_ENCRYPTION];
    }
    else if (payload.accountType === "outbound") {
        payload.server = predefArr[AccountWizard.DB_OUT_SERVER];
        payload.protocol = AccountWizard.SMTP;
        payload.port = predefArr[AccountWizard.DB_OUT_PORT];
        payload.ssl = predefArr[AccountWizard.DB_OUT_ENCRYPTION] === ProtocolSettings.SSL;
        payload.tls = predefArr[AccountWizard.DB_OUT_ENCRYPTION] === ProtocolSettings.TLS;
        payload.priority = predefArr[AccountWizard.DB_PRIORITY];
        payload.name = "Validate_" + payload.protocol + payload.server + predefArr[AccountWizard.DB_OUT_PORT] + predefArr[AccountWizard.DB_OUT_ENCRYPTION];
    }
};

ProtocolSettings.NO_ENCRYPTION = "none";
ProtocolSettings.SSL = "ssl";
ProtocolSettings.TLS = "tls";
ProtocolSettings.TLS_IF_AVAIL = "tlsIfAvailable";
