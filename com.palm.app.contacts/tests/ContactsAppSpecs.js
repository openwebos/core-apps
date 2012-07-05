// LICENSE@@@
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
// @@@LICENSE

/*jslint white: true, onevar: true, undef: true, eqeqeq: true, plusplus: true, bitwise: true,
 regexp: true, newcap: true, immed: true, nomen: false, maxerr: 500 */
/*global ContactsLib, document, Foundations, enyo, console, contactsApp, describe, it, expect, runs, waits, waitsFor */


/*
 ContactsAppSpecs.js
 Tests for ContactsApp.js

 */

describe("ContactsApp launchParams", function () {

    /* Example of a custom matcher fn
     beforeEach(function () {
     this.addMatchers({
     toBeVisible: function () { return this.actual.isVisible(); }
     });
     });
     */

    var newContactId,
        phoneNumbers = [
            {"value": "4151234567"},
            {"value": "4087654321"}
        ]; // TODO Add types and add expect to check..

    ////////// launchParam 'newContact', 'skipPrompt':false //////////
    it("launchParam 'newContact', 'skipPrompt':false", function () {
        if (window.contactsApp) {
            console.log("Running Test - 'newContact', 'skipPrompt':false, Started...");
            runs(function () {
                window.contactsApp.handleLaunchParams({"launchType": "newContact",
                    "contact"                                      : {"phoneNumbers": [
                        {"value": "4151234567"}
                    ]},
                    "skipPrompt"                                   : false
                });

                expect(window.contactsApp.$.AddToContactsDialog.getShowing()).toBeTruthy();

                waits(1000);
            });

            console.log("Running Test - 'newContact', 'skipPrompt':false Started...Done");
        }
    });

    ////////// launchParam 'newContact', 'skipPrompt':true //////////
    it("launchParam 'newContact', 'skipPrompt':true", function () {
        if (window.contactsApp) {
            console.log("Running Test - 'newContact', 'skipPrompt':true, Started...");
            // TODO: Add more fields to be tested...

            runs(function () {
                // The prev test opens the dialog, close it & wait before continuing...
                window.contactsApp.$.AddToContactsDialog.close();
                waits(1000);
            });

            runs(function () {
                window.contactsApp.handleLaunchParams({"launchType": "pseudo-card",
                    "contact"                                      : {
                        "phoneNumbers": phoneNumbers
                        // TODO: Add more fields to be tested...
                    },
                    "skipPrompt"                                   : true
                });

                expect(window.contactsApp.$.AddToContactsDialog.getShowing()).toEqual(false);
                expect(window.contactsApp.$.pane.getViewName()).toEqual("edit");
                waits(1000);
            });

            runs(function () {
                // TODO: Add more fields to be tested...
                var index,
                    phoneFields = window.contactsApp.$.edit.$.phoneGroup.getControls(),
                    phNums = phoneNumbers.slice(0);

                // Pusing empty strings to each array since there is an extra field for each editable group
                phNums.push({"value": ""});

                expect(phoneFields.length).toEqual(phNums.length);

                for (index = 0; index < phoneFields.length; index += 1) {
                    expect(phoneFields[index].getInputValue()).toEqual(phNums[index].value);
                }

                // Close the dialog
                window.contactsApp.$.edit.doneEditContact();
                waits(1000);
            });

            waitsFor(function () {
                return window.testUtils.isEditViewClosed();
            }, "Error ('newContact', 'skipPrompt':true) - Edit View Never Closed!", 3000);

            runs(function () {
                newContactId = window.testUtils.editViewState.params.personId;
                expect(newContactId).toBeDefined();

                window.testUtils.resetEditViewState();

                // TODO: expect list item to be highlighted...

                waits(500);
            });

            console.log("Running Test - 'newContact', 'skipPrompt':true, Started...Done");
        }
    });

    ////////// launchParam 'showPerson' //////////
    it("launchParam 'showPerson'", function () {
        if (window.contactsApp) {
            console.log("Running Test - 'showPerson', Started...");
            runs(function () {
                window.contactsApp.handleLaunchParams({"id": newContactId});
                waits(4000); // Give "Details" time to load the person
            });

            runs(function () {
                expect(window.contactsApp.$.splitPane.$.details.getPersonId()).toEqual(newContactId);

                // TODO: More checking of other fields are needed...
                var index,
                    phoneFields = window.contactsApp.$.splitPane.$.details.$.phoneGroup.getFields();

                expect(phoneFields.length).toEqual(phoneNumbers.length);

                for (index = 0; index < phoneFields.length; index += 1) {
                    console.log("Running, showPerson test, val = " + phoneFields[index].getValue() + " === " + phoneNumbers[index].value + " ???");
                    expect(phoneFields[index].getValue()).toEqual(phoneNumbers[index].value);
                    // TODO: Compare type in the future...
                    //expect(phoneFields[index].getDisplayType()).toEqual(phoneNumbers[index].type);
                }
            });
            console.log("Running Test - 'showPerson', Started...Done");
        }
    });

    ////////// launchParam 'editContact' //////////
    it("launchParam 'editContact'", function () {
        if (window.contactsApp) {
            console.log("Running Test - 'editContact', Started...");
            runs(function () {
                window.contactsApp.handleLaunchParams({"launchType": "editContact", "contact": {"_id": newContactId}});
                waits(4000); // Give "Edit" time to load the person
            });

            runs(function () {
                // TODO: Add more fields to be tested...
                var index,
                    phoneFields = window.contactsApp.$.edit.$.phoneGroup.getControls(),
                    phNums = phoneNumbers.slice(0);

                // Pusing empty strings to each array since there is an extra field for each editable group
                phNums.push({"value": ""});

                expect(phoneFields.length).toEqual(phNums.length);

                for (index = 0; index < phoneFields.length; index += 1) {
                    expect(phoneFields[index].getInputValue()).toEqual(phNums[index].value);
                }

                // Close the dialog
                window.contactsApp.$.edit.doneEditContact();
                waits(1000);
            });
            console.log("Running Test - 'editContact', Started...Done");
        }
    });

    ////////// launchParam 'addToExisting' //////////
    it("launchParam 'addToExisting'", function () {
        if (window.contactsApp) {
            console.log("Running Test - 'addToExisting', Started...");
            runs(function () {
                var contact = {"phoneNumbers": [
                    {"value": "6507894561"}
                ]};
                window.contactsApp.handleLaunchParams({"launchType": "addToExisting",
                    "contact"                                      : contact,
                    "skipPrompt"                                   : false
                });

                expect(window.contactsApp.$.AddToExistingPersonSelector.getShowing()).toBeTruthy();
                expect(window.contactsApp.personToLink).toEqual(contact);

                // TODO: Actually select a contact to add to...if so then remove the line below: window.contactsApp.closeAddToExistingList();
                window.contactsApp.closeAddToExistingList();
            });
            console.log("Running Test - 'addToExisting', Started...Done");
        }
    });

});
