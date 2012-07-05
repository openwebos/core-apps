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
 regexp: true, newcap: false, immed: true, nomen: false, maxerr: 500 */
/*global ContactsLib, document, pseudoDetailsInApp, SwipeableFancyInputStubs, enyo, console, describe, it, expect, runs, waits, waitsFor */

describe("pseudoDetailsInApp", function () {
    var PseudoDetailsInApp;

    it("Should be present", function () {
        PseudoDetailsInApp = new pseudoDetailsInApp(); // TODO: upper-case the name, afterwards set newcap to true
        expect(PseudoDetailsInApp).toBeDefined();
    });

    it("personIdChanged", function () {
        PseudoDetailsInApp.setPersonId("++HLXsjI6hw0gHm7");
        PseudoDetailsInApp.personIdChanged();

        expect(PseudoDetailsInApp.getPersonId()).toEqual("++HLXsjI6hw0gHm7");
        expect(PseudoDetailsInApp.$.addToContactButton.getShowing()).toBeFalsy();
        expect(PseudoDetailsInApp.$.editButton.getShowing()).toBeTruthy();
        expect(PseudoDetailsInApp.$.addToNewButtonInline.getShowing()).toBeFalsy();
        expect(PseudoDetailsInApp.$.addToExistingButtonInline.getShowing()).toBeFalsy();
        expect(PseudoDetailsInApp.$.editButtonInline.getShowing()).toBeFalsy();

        expect(PseudoDetailsInApp.person).toBeDefined();
        expect(PseudoDetailsInApp.currentPersonLoadedId).toEqual("++HLXsjI6hw0gHm7");
        expect(PseudoDetailsInApp.personWatch).toBeTruthy();
    });

    it("showDetails", function () {
        PseudoDetailsInApp.showDetails(false);
        expect(PseudoDetailsInApp.$.AllDetails.getShowing()).toBeFalsy();
        expect(PseudoDetailsInApp.$.toolbar.getShowing()).toBeFalsy();
        expect(PseudoDetailsInApp.$.SelectAContact.getShowing()).toBeTruthy();
        expect(PseudoDetailsInApp.$.AllDetails.getScrollTop()).toEqual(0);

        PseudoDetailsInApp.showDetails(true);
        expect(PseudoDetailsInApp.$.AllDetails.getShowing()).toBeTruthy();
        expect(PseudoDetailsInApp.$.toolbar.getShowing()).toBeTruthy();
        expect(PseudoDetailsInApp.$.SelectAContact.getShowing()).toBeFalsy();
        expect(PseudoDetailsInApp.$.AllDetails.getScrollTop()).toEqual(0);
    });

    it("renderPerson", function () {
        var curPerson = PseudoDetailsInApp.person; // PseudoDetailsInApp.person should have been set from the 'personIdChanged' test above

        spyOn(PseudoDetailsInApp, "renderLinkDetails").andCallThrough();
        spyOn(PseudoDetailsInApp.$.moreDetailsGroup, "setFields").andCallThrough();
        spyOn(PseudoDetailsInApp.$.emailGroup, "setFields").andCallThrough();
        spyOn(PseudoDetailsInApp.$.phoneGroup, "setFields").andCallThrough();
        spyOn(PseudoDetailsInApp.$.imGroup, "setFields").andCallThrough();
        spyOn(PseudoDetailsInApp.$.addressGroup, "setFields").andCallThrough();
        spyOn(PseudoDetailsInApp.$.urlGroup, "setFields").andCallThrough();
        spyOn(PseudoDetailsInApp.$.notesGroup, "setFields").andCallThrough();
        spyOn(PseudoDetailsInApp.$.favIndicator, "addRemoveClass").andCallThrough();
        spyOn(PseudoDetailsInApp, "showDetails").andCallThrough();

        PseudoDetailsInApp.renderPerson();
        expect(PseudoDetailsInApp.$.title.getContent()).toEqual(curPerson.displayName);
        expect(PseudoDetailsInApp.$.desc.getContent()).toEqual(curPerson.workInfoLine);
        expect(PseudoDetailsInApp.$.nickname.getContent()).toEqual(curPerson.getNickname().getDisplayValue());

        expect(PseudoDetailsInApp.renderLinkDetails).toHaveBeenCalled();
        expect(PseudoDetailsInApp.$.moreDetailsGroup.setFields).toHaveBeenCalled();
        expect(PseudoDetailsInApp.$.emailGroup.setFields).toHaveBeenCalled();
        expect(PseudoDetailsInApp.$.phoneGroup.setFields).toHaveBeenCalled();
        expect(PseudoDetailsInApp.$.imGroup.setFields).toHaveBeenCalled();
        expect(PseudoDetailsInApp.$.addressGroup.setFields).toHaveBeenCalled();
        expect(PseudoDetailsInApp.$.urlGroup.setFields).toHaveBeenCalled();
        expect(PseudoDetailsInApp.$.notesGroup.setFields).toHaveBeenCalled();
        expect(PseudoDetailsInApp.$.favIndicator.addRemoveClass).toHaveBeenCalled();
        expect(PseudoDetailsInApp.showDetails).toHaveBeenCalled();
    });
});
