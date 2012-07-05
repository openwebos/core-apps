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
/*global _, ContactsLib, document, enyo, console, $L */

enyo.kind({
    name         : "EditableField",
    kind         : "Input",
    layoutKind   : "HFlexLayout",
    published    : {
        person      : null,
        propertyName: ""
    },
    events       : {
        onGetFieldValue: "",
        onUpdateField  : ""
    },
    components   : [
        {name: "client", className: "editable-field-button"}
    ],
    create       : function () {
        this.inherited(arguments);
    },
    personChanged: function () {
        this.renderField();
    },
    renderField  : function () {
        this.setValue(this.getFieldValue(this.person[this.propertyName]));
    },
    getFieldValue: function (inField) {
        var v = this.doGetFieldValue(inField);
        return (v !== undefined ? v : (inField && inField.value || ""));
    },
    doBlur       : function () {
        this.doUpdateField(this.getValue());
        this.inherited(arguments);
    }
});
