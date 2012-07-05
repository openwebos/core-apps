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

/***
 * TEST LOADING OF COMBINED ACCOUNTS (com.palm.account and com.palm.mail.account)
 */
describe("CombinedAccountLoad", function () {

    var TEST_EAS_ID = "++HaTFEw5bkj1Qso";
    var TEST_IMAP_ID = "++Hby3tyQuChDLli";

    var CombinedAcctOverrides = {
        _loadAccount: function (id) {
            console.log("### loading the account with id " + id);
            this.setAccountData(this.DUMMY_ACCT[id]).setPrefsData(this.DUMMY_PREFS[id]);
        },

        DUMMY_ACCT: {
            // IMAP
            imap: {
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
            // EAS
            eas: {
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
        },
        DUMMY_PREFS: {
            // IMAP account
            imap: {
                "_id": "++Hby3uNHJGAZCwE",
                "_kind": "com.palm.imap.account:1",
                "_rev": 227003,
                "ImapConfigRev": 142191,
                "_revSmtp": 142159,
                "_sync": true,
                "accountId": "++Hby3tyQuChDLli",
                "draftsFolderId": "++Hby3vTSux8vPbz",
                "encryption": "ssl",
                "inboxFolderId": "++Hby3uWh1V_EviR",
                "outboxFolderId": "++Hby3uXCaGxx8a_",
                "port": 993,
                "reason": "retry push",
                "retry": null,
                "sentFolderId": "++Hby3vTSvoTCoEB",
                "server": "imap.gmail.com",
                "smtpConfig": {
                    "email": "palm.pretentious@gmail.com",
                    "encryption": "ssl",
                    "port": 465,
                    "server": "smtp.gmail.com",
                    "username": "palm.pretentious@gmail.com"
                },
                "syncFrequencyMins": -1,
                "syncWindowDays": 7,
                "trashFolderId": "++Hby3vTSyFoUDRQ",
                "username": "palm.pretentious@gmail.com"
            },
            // EAS ACCOUNT
            eas: {
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
        }
    };
    var comProto = CombinedAccount.prototype;
    var CAO = CombinedAcctOverrides;
    Object.keys(CAO).forEach(function (oKey) {
        comProto[oKey] = CAO[oKey];
    });


    /** TESTS START HERE */

    var acct1 = new CombinedAccount();
    it('loads in stages properly', function () {

        expect(acct1.isLoaded()).toBe(false);
        acct1.setAccountData(CAO.DUMMY_ACCT.imap);
        expect(acct1.isLoaded()).toBe(false);
        acct1.setPrefsData(CAO.DUMMY_PREFS.imap);
        expect(acct1.isLoaded()).toBe(true);

    });


    var acct2 = new CombinedAccount("eas");
    it('loads eas account successfully', function () {

        expect(acct2.isLoaded()).toBe(true);
    });

    var acct3 = new CombinedAccount("imap");
    it('loads imap account successfully', function () {
        expect(acct3.isLoaded()).toBe(true);
    });

    var acct4 = new CombinedAccount(CAO.DUMMY_ACCT.imap, CAO.DUMMY_PREFS.imap);
    it('loads supplied records successfully', function () {
        expect(acct4.isLoaded()).toBe(true);
    });

    it('pulls account ids properly', function () {
        expect(acct1.getId()).toBe(TEST_IMAP_ID);
        expect(acct2.getId()).toBe(TEST_EAS_ID);
        // superfluous, but okay
        expect(acct3.getId()).toBe(TEST_IMAP_ID);
        expect(acct4.getId()).toBe(TEST_IMAP_ID);
    });

    it('determines account types correctly', function () {
        expect(acct1.getType()).toBe("IMAP");
        expect(acct2.getType()).toBe("EAS");
    });


});