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

/*global describe, it, expect, waits, waitsFor, runs, spyOn, enyo, EmailAppLaunch, window, console */

var TEST_TABLES = {
    "com.palm.account:1": [
        { // IMAP
            "_id": "++Hby3tyQuChDLli",
            "_kind": "com.palm.account:1",
            "_rev": 142144,
            "_sync": true,
            "alias": "Gmailio",
            "beingDeleted": false,
            "capabilityProviders": [
                {
                    "_id": "22b41",
                    "capability": "CONTACTS",
                    "id": "com.palm.google.contacts"
                },
                {
                    "_id": "22b42",
                    "capability": "MESSAGING",
                    "id": "com.palm.google.talk"
                },
                {
                    "_id": "22b43",
                    "capability": "CALENDAR",
                    "id": "com.palm.google.calendar"
                },
                {
                    "_id": "22b44",
                    "capability": "MAIL",
                    "id": "com.palm.google.mail"
                },
                {
                    "_id": "22b45",
                    "capability": "DOCUMENTS",
                    "id": "com.palm.google.documents"
                }
            ],
            "templateId": "com.palm.google",
            "username": "palm.pretentious@gmail.com"
        },
        { // EAS
            "_id": "++HaTFEw5bkj1Qso",
            "_kind": "com.palm.account:1",
            "_rev": 77583,
            "_sync": true,
            "alias": "Palm",
            "beingDeleted": false,
            "capabilityProviders": [
                {
                    "_id": "12f10",
                    "capability": "CALENDAR",
                    "id": "com.palm.eas.calendar"
                },
                {
                    "_id": "12f11",
                    "capability": "MAIL",
                    "id": "com.palm.eas.mail"
                },
                {
                    "_id": "12f12",
                    "capability": "CONTACTS",
                    "id": "com.palm.eas.contacts"
                },
                {
                    "_id": "12f13",
                    "capability": "REMOTECONTACTS",
                    "id": "com.palm.eas.remotecontacts"
                },
                {
                    "_id": "12f14",
                    "capability": "TASKS",
                    "id": "com.palm.eas.tasks"
                }
            ],
            "templateId": "com.palm.eas",
            "username": "taco.bravo@palm.com"
        }
    ],
    "com.palm.mail.account:1": [
        { // IMAP
            "_id": "++HaTFEw5bkj1Qso",
            "_kind": "com.palm.account:1",
            "_rev": 77583,
            "_sync": true,
            "alias": "Palm",
            "beingDeleted": false,
            "capabilityProviders": [
                {
                    "_id": "12f10",
                    "capability": "CALENDAR",
                    "id": "com.palm.eas.calendar"
                },
                {
                    "_id": "12f11",
                    "capability": "MAIL",
                    "id": "com.palm.eas.mail"
                },
                {
                    "_id": "12f12",
                    "capability": "CONTACTS",
                    "id": "com.palm.eas.contacts"
                },
                {
                    "_id": "12f13",
                    "capability": "REMOTECONTACTS",
                    "id": "com.palm.eas.remotecontacts"
                },
                {
                    "_id": "12f14",
                    "capability": "TASKS",
                    "id": "com.palm.eas.tasks"
                }
            ],
            "templateId": "com.palm.eas",
            "username": "taco.bravo@palm.com"
        },
        { // EAS
            "_id": "++HaTFF6vVGEJVGS",
            "_kind": "com.palm.eas.account:1",
            "_rev": 221204,
            "AccountUpdatedRev": 85358,
            "_revSmtp": 30171,
            "_sync": true,
            "accountId": "++HaTFEw5bkj1Qso",
            "deleteFromServer": false,
            "deleteOnDevice": false,
            "domain": "",
            "draftsFolderId": "++HaTFFYVhBNwdzB",
            "error": null,
            "inboxFolderId": "++HaTFFYVi4jla7K",
            "initialSync": false,
            "notifications": {
                "enabled": true,
                "ringtoneName": "",
                "ringtonePath": "",
                "type": "system"
            },
            "outboxFolderId": "++HaTFFYVnSySPMr",
            "policyKey": "2730223311",
            "realName": "",
            "replyTo": "",
            "sentFolderId": "++HaTFFYVoO3gllZ",
            "server": "https:\/\/us-owa.palm.com",
            "signature": "<div style=\"font-family: arial, sans-serif; font-size: 12px;color: #999999\">-- Sent from my HP TouchPad<\/div>",
            "syncFrequencyMins": -1,
            "syncKey": "1",
            "syncWindowDays": 3,
            "trashFolderId": "++HaTFFYVgFjIEMz",
            "useSmartForward": true,
            "useSmartReply": true,
            "username": "Taco Bravo"
        }
    ],
    "templates": [
        {
            "templateId": "com.palm.imap",
            "loc_name": "IMAP",
            "icon": {
                "loc_32x32": "images/imapmail32.png",
                "loc_48x48": "images/imapmail48.png"
            },
            "hidden": true,
            "validator": {"customUI": {"appId": "com.palm.app.email", "name": "accounts/wizard.html"}, "address": "palm://com.palm.imap/validateAccount"},
            "readPermissions": ["com.palm.app.email", "com.palm.imap", "com.palm.smtp"],
            "writePermissions": ["com.palm.app.email"],
            "capabilityProviders": [
                {
                    "capability": "MAIL",
                    "id": "com.palm.imap.mail",
                    "icon": {
                        "loc_32x32": "images/imapmail32.png",
                        "loc_48x48": "images/imapmail48.png"
                    },
                    "implementation": "palm://com.palm.imap/",
                    "onCreate": "palm://com.palm.imap/accountCreated",
                    "onDelete": "palm://com.palm.imap/accountDeleted",
                    "onEnabled": "palm://com.palm.imap/accountEnabled",
                    "onCredentialsChanged": "palm://com.palm.imap/credentialsChanged",
                    "subKind": "com.palm.imap.email:1"
                }
            ]
        },
        {
            "templateId": "com.palm.pop",
            "loc_name": "POP",
            "icon": {
                "loc_32x32": "images/popmail32.png",
                "loc_48x48": "images/popmail48.png"
            },
            "hidden": true,
            "validator": {"customUI": {"appId": "com.palm.app.email", "name": "accounts/wizard.html"}, "address": "palm://com.palm.pop/validateAccount"},
            "readPermissions": ["com.palm.app.email", "com.palm.pop", "com.palm.smtp"],
            "writePermissions": ["com.palm.app.email"],
            "capabilityProviders": [
                {
                    "capability": "MAIL",
                    "id": "com.palm.pop.mail",
                    "implementation": "palm://com.palm.pop/",
                    "onCreate": "palm://com.palm.pop/accountCreated",
                    "onDelete": "palm://com.palm.pop/accountDeleted",
                    "onEnabled": "palm://com.palm.pop/accountEnabled",
                    "onCredentialsChanged": "palm://com.palm.pop/credentialsChanged",
                    "subKind": "com.palm.email.pop:1"
                }
            ]
        },
        {
            "templateId": "com.palm.eas",
            "loc_name": "Microsoft Exchange",
            "icon": {
                "loc_32x32": "images/easmail32.png",
                "loc_48x48": "images/easmail48.png"
            },
            "hidden": false,
            "validator": {"customUI": {"appId": "com.palm.app.email", "name": "accounts/wizard.html"}, "address": "palm://com.palm.eas/validateAccount"},
            "onCapabilitiesChanged": "palm://com.palm.eas/accountCapabilities",
            "onCredentialsChanged": "palm://com.palm.eas/accountUpdated",
            "readPermissions": ["com.palm.app.email", "com.palm.eas", "com.palm.app.calendar", "com.palm.app.contacts", "com.palm.app.tasks", "com.palm.service.contacts", "com.palm.service.contacts.linker"],
            "writePermissions": ["com.palm.app.email", "com.palm.app.calendar", "com.palm.app.contacts", "com.palm.app.tasks"],
            "capabilityProviders": [
                {
                    "capability": "MAIL",
                    "id": "com.palm.eas.mail",
                    "icon": {
                        "loc_32x32": "images/easmail32.png",
                        "loc_48x48": "images/easmail48.png"
                    },
                    "implementation": "palm://com.palm.eas/",
                    "onCreate": "palm://com.palm.eas/accountCreated",
                    "onDelete": "palm://com.palm.eas/accountDeleted",
                    "subKind": "com.palm.email.eas:1",
                    "dbkinds": {
                        "task": "com.palm.email.eas:1"
                    }
                },
                {
                    "capability": "CONTACTS",
                    "id": "com.palm.eas.contacts",
                    "icon": {
                        "loc_32x32": "images/easmail32.png",
                        "loc_48x48": "images/easmail48.png"
                    },
                    "implementation": "palm://com.palm.eas/",
                    "sync": "palm://com.palm.eas/syncAllContacts",
                    "subKind": "com.palm.contact.eas:1",
                    "dbkinds": {
                        "contact": "com.palm.contact.eas:1"
                    }
                },
                {
                    "capability": "REMOTECONTACTS",
                    "id": "com.palm.eas.remotecontacts",
                    "loc_name": "Global Address Lookup",
                    "icon": {
                        "loc_32x32": "images/eascontacts32.png",
                        "loc_48x48": "images/eascontacts48.png"
                    },
                    "implementation": "palm://com.palm.eas/",
                    "query": "palm://com.palm.eas/queryGal"
                },
                {
                    "capability": "CALENDAR",
                    "id": "com.palm.eas.calendar",
                    "icon": {
                        "loc_32x32": "images/easmail32.png",
                        "loc_48x48": "images/easmail48.png"
                    },
                    "implementation": "palm://com.palm.eas/",
                    "sync": "palm://com.palm.eas/syncAllCalendars",
                    "subKind": "com.palm.calendarevent.eas:1",
                    "dbkinds": {
                        "calendarevent": "com.palm.calendarevent.eas:1"
                    }
                },
                {
                    "capability": "TASKS",
                    "id": "com.palm.eas.tasks",
                    "icon": {
                        "loc_32x32": "images/eastasks32.png",
                        "loc_48x48": "images/eastasks48.png"
                    },
                    "implementation": "palm://com.palm.eas/",
                    "subKind": "com.palm.task.eas:1",
                    "dbkinds": {
                        "task": "com.palm.task.eas:1"
                    }
                }
            ]
        }
    ]
};


var TEST_CALL_SERVICE = function (uri, args, callback) {
    console.log("@@@@@@@@@@@@@@@@@@@@@ OH YEAAAAAAAAAAAAAAH");
    if (!uri || !callback) {
        return; // nothing we can test
    }
    var resultsContainer = {value: true};
    if (uri.indexOf("com.palm.db/find") > -1) {
        resultsContainer.results = TEST_TABLES[args.query.from];
    } else if (uri.indexOf("com.palm.service.accounts/listAccountTemplates") > -1) {
        resultsContainer.results = TEST_TABLES["templates"];
    }

    if (resultsContainer.results) {
        console.log("@@@@@@@@@@@@@@@@@@@@@ SENDING OUR RESSSSSULTS!");
        setTimeout(function () {
            callback(resultsContainer);
        }, 300);
    }
};

/***
 * TEST LOADING OF COMBINED ACCOUNTS (com.palm.account and com.palm.mail.account)
 */
describe("AcountList Load", function () {

    var TEST_EAS_ID = "++HaTFEw5bkj1Qso";
    var TEST_IMAP_ID = "++Hby3tyQuChDLli";
    var forcefulFlag = "klaatu barada nikto";

    var ready = false;
    var accountList;
    beforeEach(function () {
        spyOn(EmailApp.Util, "callService").andCallFake(TEST_CALL_SERVICE);
    });

    /** TESTS START HERE */
    it('loads accounts correctly', function () {
        runs(function () {
            accountList = new EmailApp.AccountList(function () {
                ready = true;
            }, forcefulFlag);
        });
        waitsFor(function () {
            return ready;
        }, 'account load to complete', 9001); // just over 9000

        runs(function () {
            expect(ready).toBe(true);
            expect(!!accountList.hasAccounts()).toBe(true);
            expect(accountList.getAccounts().length).toBe(2);
            expect(accountList.getSortedList().length).toBe(2);
            // further test all of these explicitly
        });
    });

    it('retrieves accounts correctly', function () {
        waitsFor(function () {
            return ready;
        }, 'account load to complete', 9001); // just over 9000

        runs(function () {
            expect(ready).toBe(true);
            var accts = accountList.getAccounts();
            accts.forEach(function (acct) {
                console.log("#@#$!@$!$2 Here's an account");
                console.dir(acct);
            });
            expect(!!accountList.getAccount(TEST_EAS_ID)).toBe(true);
            expect(!!accountList.getAccount(TEST_IMAP_ID)).toBe(true);
            // further test all of these explicitly
        });
    });

});