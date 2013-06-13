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
/*global _, ContactsLib, document, enyo, console, $L, AccountsList */

enyo.kind({
    name          : "EditableGroup",
    kind          : "com.palm.library.contactsui.FieldGroup",
    style         : "padding-bottom:2px;", // TODO: Figure out a way to get rid of this (Needed when a new SwipeableFancyInput is shown, doesn't look good but better than without it.)
    published     : {
        hint          : $L("New..."),
        linkedContacts: []
    },
    events        : {
        onGetFieldObject: "",
        onMakeNewItem   : "",
        onUpdateField   : "",
        onFormat        : ""
    },
    getFieldObject: function (inSender, contactId) {
        var contact;
        if (!contactId) {
            // Note that if contactId==0 it means this is a new or readonly contact (which has a newly generated palmprofile contact added to it that does not yet have a contactId)
            // In this case we want to select the first (and only) non-readonly contact
            contact = _.detect(this.linkedContacts, function (lc) {
                return !AccountsList.isContactReadOnly(lc);
            });
        }
        else {
            contact = _.detect(this.linkedContacts, function (lc) {
                return lc.getId() === contactId;
            });
        }
        return this.doGetFieldObject(contact);
    },
    destroy       : function () {
        this.destroyControls();
        this.inherited(arguments);
    },
    renderGroup   : function () {
        var groupObj,
            i,
            isReadOnly,
            iconPath;
        this.destroyControls();
        for (i = 0; i < this.linkedContacts.length; i += 1) {
            isReadOnly = AccountsList.isContactReadOnly(this.linkedContacts[i]);
            iconPath = AccountsList.getAccountIcon(this.linkedContacts[i].getAccountId().getValue(), this.linkedContacts[i].getKindName(true));

            groupObj = this.doGetFieldObject(this.linkedContacts[i]);
            this.renderFields(groupObj, iconPath, isReadOnly);
        }
        this.addNewField();
    },
    renderFields  : function (inFields, iconPath, isReadOnly) {
        var i, f,
            array = inFields.getArray();
        for (i = 0; array && (f = array[i]); i += 1) {

            this.createComponent(
                {kind           : "SwipeableFancyInput", swipeable: !isReadOnly, disabled: isReadOnly, group: inFields, field: f,
                    value       : this.getFieldValue(f), iconPath: iconPath, typeOptions: this.getFieldTypeOptions(),
                    type        : this.getFieldType(f), onFormat: "doFormat", onUpdateField: "doUpdateField",
                    keyboardType: this.keyboardType}
            );
        }
    },
    getFieldValue : function (inField) {
        return this.doGetFieldValue(inField) || inField.getValue();
    },
    addNewField   : function (inSrc, inShowing) {
        var iconPath = this.accountList && this.accountList[0] && this.accountList[0].icon || "", // 0th item is primary account
            newComp = this.createComponent(
                {kind            : "SwipeableFancyInput", className: "new", accountList: this.accountList, onGetFieldObject: "getFieldObject",
                    onMakeNewItem: "doMakeNewItem", onAddNewField: "addNewField", swipeable: false,
                    hint         : this.hint, value: "", iconPath: iconPath, typeOptions: this.getFieldTypeOptions(),
                    onFormat     : "doFormat", onUpdateField: "doUpdateField", showing: (inShowing === false ? false : true),
                    keyboardType : this.keyboardType}
            );

        if (inShowing !== false) {
            this.render();
        }
        return newComp;
    }
});
