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

describe("EditableField", function () {
    it("Render Editable Field Items", function () {
        var edit = new Edit();

        var f = ContactsLib.Person.getDisplayablePersonAndContactsById("++HLXsjI6hw0gHm7");
        f.then(function () {
            var p = f.result;
            edit.$.nameField.person = p;
            edit.$.nicknameField.person = p;
            edit.$.titleField.person = p;
            edit.$.companyField.person = p;
            edit.primaryContact = p.getContacts()[0];
            expect(edit.person).toBeDefined();
            expect(edit.primaryContact).toBeDefined();

            spyOn(edit.$.nameField, "setValue").andCallFake(function (param) {
                expect(param).toEqual("Eric Lovett");
            });
            edit.$.nameField.personChanged();

            spyOn(edit.$.nicknameField, "setValue").andCallFake(function (param) {
                expect(param).toEqual("Erik");
            });
            edit.$.nicknameField.personChanged();

            spyOn(edit.$.companyField, "setValue").andCallFake(function (param) {
                expect(param).toEqual("Palm");
            });
            edit.$.companyField.personChanged();

            spyOn(edit.$.titleField, "setValue").andCallFake(function (param) {
                expect(param).toEqual("Engineer");
            });
            edit.$.titleField.personChanged();
        });

    });

    it("Update Editable Field Items", function () {
        var edit = new Edit();

        var f = ContactsLib.Person.getDisplayablePersonAndContactsById("++HLXsjI6hw0gHm7");
        f.then(function () {
            var p = f.result;
            edit.$.nameField.person = p;
            edit.$.nicknameField.person = p;
            edit.$.titleField.person = p;
            edit.$.companyField.person = p;
            edit.primaryContact = p.getContacts()[0];
            expect(edit.person).toBeDefined();
            expect(edit.primaryContact).toBeDefined();

            edit.$.nameField.setValue("Buddy");
            spyOn(edit, "updateNameField").andCallFake(function (param1, param2) {
                expect(param2).toEqual("Buddy");
            });
            edit.$.nameField.doBlur();

            edit.$.nicknameField.setValue("Buddy");
            spyOn(edit, "updateNicknameField").andCallFake(function (param1, param2) {
                expect(param2).toEqual("Buddy");
            });
            edit.$.nicknameField.doBlur();

            edit.$.titleField.setValue("Buddy");
            spyOn(edit, "updateTitleField").andCallFake(function (param1, param2) {
                expect(param2).toEqual("Buddy");
            });
            edit.$.titleField.doBlur();

            edit.$.companyField.setValue("Buddy");
            spyOn(edit, "updateCompanyField").andCallFake(function (param1, param2) {
                expect(param2).toEqual("Buddy");
            });
            edit.$.companyField.doBlur();
        });

    });

});

