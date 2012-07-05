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

describe("LinkDetails", function () {
    it("TapLinkedContactWithOnlyOneContact", function () {
        var linkDetails = new LinkDetails();
        expect(linkDetails).toBeDefined();

        var f = ContactsLib.Person.getDisplayablePersonAndContactsById("++HLXsjI6hw0gHm7");
        f.then(function () {
            linkDetails.person = f.result;
            expect(linkDetails.person).toBeDefined();

            spyOn(linkDetails.$.alertDialog, "validateComponents");
            spyOn(linkDetails.$.alertDialog, "openAtCenter");

            linkDetails.handleLinkedContactTap();

            expect(linkDetails.$.alertDialog).toBeDefined();
            expect(linkDetails.$.title).toBeUndefined();
            expect(linkDetails.$.alertDialog.validateComponents).not.toHaveBeenCalled();
            expect(linkDetails.$.alertDialog.openAtCenter).not.toHaveBeenCalled();

            expect(linkDetails.$.alertDialog.contact).toBeUndefined();
        });
    });

    it("TapLinkedContactWithMoreThanOneContact", function () {
        var linkDetails = new LinkDetails();
        expect(linkDetails).toBeDefined();

        var f = ContactsLib.Person.getDisplayablePersonAndContactsById("++HLXrxSWCRov5zi");
        f.then(function () {
            linkDetails.person = f.result;
            expect(linkDetails.person).toBeDefined();

            spyOn(linkDetails.$.alertDialog, "validateComponents").andCallThrough();
            spyOn(linkDetails.$.alertDialog, "openAtCenter");

            linkDetails.handleLinkedContactTap({contact: linkDetails.person.getContacts()[0]});

            expect(linkDetails.$.alertDialog).toBeDefined();
            expect(linkDetails.$.title).toBeDefined();
            expect(linkDetails.$.alertDialog.validateComponents).toHaveBeenCalled();
            expect(linkDetails.$.alertDialog.openAtCenter).toHaveBeenCalled();

            expect(linkDetails.$.alertDialog.contact).toBeDefined();
        });
    });

});

