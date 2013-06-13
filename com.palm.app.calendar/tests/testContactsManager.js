// @@@LICENSE
//
//      Copyright (c) 2010-2013 LG Electronics, Inc.
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


function testContactsManager() {
}

testContactsManager.prototype.findByEmail = function testFindByEmail() {
    try {
        console.log("---:---: ContactsManager.findByEmail(): Sending request...");

        new ContactsManager().findByEmail("cont@cts.test", function (person) {
            console.log("---:---: Contacts Manager Response: " + JSON.stringify(person));
            // Response should be: {"databaseID":"++HMuIWZq5ccUsrW","firstName":"Contacts","lastName":"Test!","name":"Contacts Test!","imagePath":"/usr/palm/frameworks/contacts/version/1.0/images/generic-avatar-50x50.png"}
        });

        console.log("---:---: ContactsManager.findByEmail(): Sending request...DONE.");

    } catch (e) {
        console.error(e);
    }

    //Create the contact using:
    //luna-send -n 1 -a com.palm.configurator -f palm://com.palm.db/put '{"objects":[{"_kind":"com.palm.contact:1","accountId":"++HMt5wZVWdbLqGl", "name":{"givenName":"Contacts", "familyName":"Test!"}, "emails":[{"value":"cont@cts.test"}]}]}'
    //Response: { "returnValue": true, "results": [{"id": "++HMuIW7m+GJoC6f", "rev": 883}]}
};
