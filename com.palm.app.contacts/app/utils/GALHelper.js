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
/*global _, document, enyo, console, $L, ContactsLib */

enyo.kind({
    name       : "GALHelper",
    kind       : enyo.Object,
    constructor: function () {
        this.inherited(arguments);
    },
    statics    : {
        makeContact: function (rawContact) {
            var contact = new ContactsLib.Contact();

            contact.getName().set(new ContactsLib.Name({
                honorificPrefix: rawContact.honorificPrefix,
                givenName      : rawContact.givenName,
                middleName     : rawContact.middleName,
                familyName     : rawContact.familyName,
                honorificSuffix: rawContact.honorificSuffix
            }));

            contact.getOrganizations().add({
                name : rawContact.companyName,
                title: rawContact.jobTitle
            });

            if (Array.isArray(rawContact.emails)) {
                rawContact.emails.forEach(function (email) {
                    contact.getEmails().add({
                        value: email.value,
                        type : email.type
                    });
                });
            }

            if (Array.isArray(rawContact.phoneNumbers)) {
                rawContact.phoneNumbers.forEach(function (phoneNumber) {
                    contact.getPhoneNumbers().add({
                        value: phoneNumber.value,
                        type : phoneNumber.type
                    });
                });
            }

            if (Array.isArray(rawContact.ims)) {
                rawContact.ims.forEach(function (im) {
                    contact.getIms().add({
                        value: im.value,
                        type : im.type,
                        label: im.label
                    });
                });
            }

            if (Array.isArray(rawContact.addresses)) {
                rawContact.addresses.forEach(function (address) {
                    var type, addressObj;

                    if (typeof address === "object") {
                        type = address.type;

                        if (address.value) {
                            addressObj = new enyo.g11n.Address(address.value);
                        }
                    } else if (typeof address === "string") {
                        addressObj = new enyo.g11n.Address(address);
                    }

                    if (addressObj) {
                        contact.getAddresses().add({
                            streetAddress: addressObj.streetAddress,
                            locality     : addressObj.locality,
                            region       : addressObj.region,
                            postalCode   : addressObj.postalCode,
                            country      : addressObj.country,
                            type         : type
                        });
                    }
                });
            }

            return contact;
        }
    }
});
