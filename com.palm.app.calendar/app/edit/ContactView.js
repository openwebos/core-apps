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


/*jslint white: true, onevar: true, undef: true, eqeqeq: true, plusplus: true, bitwise: true,
 regexp: true, newcap: true, immed: true, nomen: false, maxerr: 500 */
/*global ContactsLib, document, enyo, console, $L, crb */

enyo.kind({
    name      : "calendar.edit.ContactView",
    kind      : enyo.VFlexBox,
    events    : {
        onCloseClicked: "",
        onExit        : ""
    },
    published : {
    },
    components: [
        {kind                 : "com.palm.library.contactsui.detailsInDialog",
            name              : "detailsInDialog",
            flex              : 1,
            showButtonsHideBar: true,
            onEdit            : "doExit",
            onAddToExisting   : "doExit",
            onAddToNew        : "doExit"
        },
        {kind: enyo.HFlexBox, components: [
            {kind: enyo.Button, name: "contactsDialogBack", flex: 1, caption: $L("Back"), onclick: "doExit", className: "enyo-button-light"},
            {kind: enyo.Button, name: "contactsDialogCancel", flex: 1, caption: $L("Close"), onclick: "closeClicked", className: "spaceButton enyo-button-dark"}
        ]}
    ],

    closeClicked: function closeClicked() {
        this.doCloseClicked();
    },
    setPersonId : function (personId) {
        this.$.detailsInDialog.setPersonId(personId);
    },
    setContact  : function (rawContact) {
        this.$.detailsInDialog.setContact(rawContact);
    }

});
