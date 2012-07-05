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
/* Copyright 2011 Palm, Inc.  All rights reserved. */



/*jslint laxbreak: true, white: false */
/*global Contacts, ContactsManager */

(function defineContactsManager(log) {

    var libError, // Stores any error that occurs while loading the Contacts loadable library.
        libs, // Stores all loaded libraries.
        lookupOptions;	// Used to cache the photo type rather evaluating it on each lookup.

    try {
        if (!this.ContactsLib) {                                // If the Contacts Library hasn't already been loaded:

            libs = this.MojoLoader.require({    name: "contacts", version: "1.0" }            //	MojoLoad it.
            );

            ContactsLib = libs.contacts;
        }

    } catch (e) {

        libError = e;
        log.error("\t!!! Failed to load Contacts loadable library !!!\n\n" + (e.stack || ''));
    }

    ContactsManager = function ContactsManager() {
    };

    ContactsManager.prototype.findByEmail = function findByEmail(email, callback) {
        if (libError) {
            throw libError;
        }				// Throw an error if the Contacts library failed to load.

        !this.personCache && (this.personCache = {})	// Create the cache hash if it doesn't already exist.
        var personCache = this.personCache;

        if (personCache [email]) {                        // Return the cached person if possible.
            callback(personCache [email]);				// TODO: Asynchronously call back.
            return;
        }

        if (!lookupOptions) {
            lookupOptions = {personType: ContactsLib.PersonType.DISPLAYLITE};	// Define an extremely basic person lookup.
        }

        var future = ContactsLib.Person.findByEmail(email, lookupOptions)		// Lookup the person by their email address.

        future.then(function foundPerson() {
            var result = future.result;
            if (!result) {
                return false;
            }

            var person = {
                personId     : result._id,
                displayName  : result.displayName,
                listPhotoPath: result.listPhotoPath
            }

            personCache[email] = person;				// Cache the person object. TODO: Manage cache size, app now lives "forever".
            callback(person);							// TODO: Asynchronously call back.
            return true;
        });
    }

})(((this.Mojo && Mojo.Log) || this.console));

// TODO: We may want to remove the singleton as it ContactsManager is placed on enyo.application.
(function makeContactsManagerSingleton() {
    /** Closure to hold private singular ContactsManager instance.
     *
     *    Note:    If in the future we decide that ContactsManager shouldn't be a singleton
     *            we can revert that by commenting out or removing this closure's body.
     */

        // Create the singular private ContactsManager instance:
    var singleton = new ContactsManager();

    // Override the ContactsManager constructor to always returns its singular instance:
    ContactsManager = function ContactsManager() {
        return singleton;
    };
    ContactsManager.prototype = singleton.constructor.prototype;
})();

// Make ContactsManager available to everyone when this is done loading.  PLATFORM: Enyo specific.
enyo && enyo.application && !enyo.application.contactsManager && (enyo.application.contactsManager = new ContactsManager());