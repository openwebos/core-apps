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
/*global Foundations, PalmCall, Future, _, ContactsLib, document, enyo, console, AccountsList, $L */

enyo.kind({
    name           : "BirthdayPicker",
    kind           : "Control",
    birthdayObject : null,
    events         : {
        onSave: "",
        onDone: ""
    },
    components     : [
        {kind: "HFlexBox", caption: $L("Select Birthday"), components: [
            {name: "birthdayDatePicker", kind: "DatePicker", label: ""},
            {kind: "Spacer", flex: 4},
            {kind: "Button", className: "enyo-button-negative", caption: $L("Clear Birthday"), onclick: "birthdayRemove"},
            {kind: "Button", caption: $L("Done"), onclick: "birthdayDone", className: "enyo-button-affirmative"}
        ]}
    ],
    open           : function () {
        if (this.birthdayObject) {
            this.$.birthdayDatePicker.setValue(this.birthdayObject.getDateObject());
        } else {
            this.$.birthdayDatePicker.setValue(new Date());
        }
    },
    birthdayDone   : function () {
        // get the Date() object that was chosen and save it to the DB
        var dateString = this.dateToLocalDate(this.$.birthdayDatePicker.getValue());

        if (this.birthdayObject) {
            this.birthdayObject.setValue(dateString);
        }
        else {
            this.birthdayObject = new ContactsLib.Birthday(dateString);
        }
        this.doSave(dateString);

        this.doDone();
    },
    dateToLocalDate: function (date) {
        var year, month, day, dateString;

        year = date.getFullYear();
        month = date.getMonth() + 1;
        if (month < 10) {
            month = "0" + month;
        }
        day = date.getDate();
        if (day < 10) {
            day = "0" + day;
        }
        dateString = year + "-" + month + "-" + day;
        return dateString;
    },
    birthdayRemove : function () {
        this.doSave(null);
        this.birthdayObject = undefined;
        this.doDone();
    }
});
