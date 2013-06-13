// LICENSE@@@
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
// @@@LICENSE

/*jslint white: true, onevar: true, undef: true, eqeqeq: true, plusplus: true, bitwise: true,
 regexp: true, newcap: true, immed: true, nomen: false, maxerr: 500 */
/*global ContactsLib, document, EditableGroup, FieldsStub, FieldStub, enyo, console, describe, it, expect, runs, waits, waitsFor */

function FieldStub() {
    this.value = arguments[0];

    this.getValue = function () {
        return this.value;
    };

    this.setValue = function (inVal) {
        this.value = inVal;
    };
}

describe("EditableGroup", function () {
    var editableGroup,
        fieldsStub = {
            array: [new FieldStub("testfield_1"), new FieldStub("testfield_2"), new FieldStub("testfield_3")],

            getArray: function () {
                return this.array;
            }
        };

    it("Should be present", function () {
        editableGroup = new EditableGroup();
        expect(editableGroup).toBeDefined();
    });

    it("renderFields", function () {
        var origCompLen = editableGroup.getComponents().length;
        editableGroup.renderFields(fieldsStub, "", false);
        expect(editableGroup.getComponents().length).toEqual(origCompLen + (fieldsStub.array.length * 2));
    });

    it("getFieldValue", function () {
        var value;

        value = editableGroup.getFieldValue(fieldsStub.array[0]);
        expect(value).toEqual("testfield_1");
        value = editableGroup.getFieldValue(fieldsStub.array[1]);
        expect(value).toEqual("testfield_2");
        value = editableGroup.getFieldValue(fieldsStub.array[2]);
        expect(value).toEqual("testfield_3");
    });

    it("addNewField", function () {
        var newField = editableGroup.addNewField();
        expect(newField).toBeDefined();
        expect(newField.kind).toEqual("SwipeableFancyInput");
        expect(newField.swipeable).toBeFalsy();
    });
});
