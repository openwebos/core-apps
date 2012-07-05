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
/*global ContactsLib, document, SwipeableFancyInput, SwipeableFancyInputStubs, enyo, console, describe, it, expect, runs, waits, waitsFor */

window.SwipeableFancyInputStubs = {
    onAddNewFieldStub: function () {
        return this;
    },

    getShowing: function () {
    },
    setShowing: function () {
    },

    parent: {
        render: function () {
        }
    }
};

describe("SwipeableFancyInput", function () {
    var swipeableFancyInput,
        typeOptions;

    it("Should be present", function () {
        swipeableFancyInput = new SwipeableFancyInput();
        expect(swipeableFancyInput).toBeDefined();

        typeOptions = [
            {"value": "type_home", "label": "Home", "command": "type_home", "caption": "Home"},
            {"value": "type_work", "label": "Work", "command": "type_work", "caption": "Work"},
            {"value": "type_other", "label": "Other", "command": "type_other", "caption": "Other"}
        ];

        swipeableFancyInput.typeOptions = typeOptions;

    });

    it("addAdHocTypeOption", function () {
        swipeableFancyInput.field = {x_displayType: "type_test"};

        expect(swipeableFancyInput.addAdHocTypeOption("type_test")).toBeTruthy();
        expect(swipeableFancyInput.addAdHocTypeOption()).toBeFalsy();
        expect(swipeableFancyInput.addAdHocTypeOption("type_home")).toBeFalsy();
        expect(swipeableFancyInput.addAdHocTypeOption("type_work")).toBeFalsy();
        expect(swipeableFancyInput.addAdHocTypeOption("type_other")).toBeFalsy();
    });

    it("onchange", function () {
        swipeableFancyInput.onAddNewField = enyo.bind(window.SwipeableFancyInputStubs, "onAddNewFieldStub");

        spyOn(swipeableFancyInput, "_triggerAddNewField").andCallThrough();

        swipeableFancyInput.onchange();
        expect(swipeableFancyInput._triggerAddNewField).not.toHaveBeenCalled();
        expect(swipeableFancyInput.newField).toBeUndefined();

        swipeableFancyInput.$.input.setValue("a");
        swipeableFancyInput.onchange();
        expect(swipeableFancyInput._triggerAddNewField).toHaveBeenCalled();
        expect(swipeableFancyInput.newField).toBeDefined();
    });
});
