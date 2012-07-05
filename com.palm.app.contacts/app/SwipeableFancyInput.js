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
    name               : "SwipeableFancyInput",
    kind               : "InputBox",
    events             : {
        onAddNewField   : "",
        onMakeNewItem   : "",
        onGetFieldObject: "",
        onFormat        : "",
        onUpdateField   : ""
    },
    components         : [
        {name: "swipe", kind: "SwipeableItem", onConfirm: "deleteItem", flex: 1, layoutKind: "HFlexLayout", pack: "justify", align: "center", components: [
            {name: "accountPicker", kind: "AccountPickerListSelector", className: "account", popupOffset: {top: 24}, onChange: "accountSelected", items: [], hideItem: true, hideArrow: true, components: [
                {flex: 1, kind: enyo.Image, name: "accountPickerIcon"}
            ]},
            {kind: "Input", name: "input", styled: false, flex: 1, onchange: "onchange", changeOnInput: true},
            {name: "typePicker", kind: enyo.ListSelector, className: "editable-label", onChange: "typeSelected", items: [], hideArrow: true}
        ]}
    ],
    accountSelected    : function (inSender, inValue, inOldValue) {
        this.$.accountPickerIcon.setSrc("" + this.accountList[inValue].icon);

        var newContactId = this.accountList[inValue].contactId,
            oldContactId = this.accountList[inOldValue].contactId,
            fieldObject;

        // If this was a newly added item, we need to move the item to a new linked contact
        if (this.field) {
            // Remove item from old contact
            fieldObject = this.doGetFieldObject(oldContactId);
            fieldObject.remove(this.field);

            // Add item to new contact
            fieldObject = this.doGetFieldObject(newContactId);
            fieldObject.add(this.field);
        }
    },
    typeSelected       : function (inSender, inValue, inOldValue) {
        if (this.field) {
            this.field.setType(inValue);
        }
    },
    destroy            : function (inSender) {
        var rowItemParent = this.getParent();
        rowItemParent.setShowing(false); // Our parent is a RowItem
        rowItemParent.getParent().flow(); // It's parent is a OrderedContainer

        this.inherited(arguments);
    },
    deleteItem         : function (inSender) {
        if (this.group) {
            this.group.remove(this.field);
        }
        this.destroy();
    },
    create             : function () {
        this.inherited(arguments);

        // show or hide the "type" picker [eg. "home", "work", etc
        this.addAdHocTypeOption(this.type);
        if (this.typeOptions) {
            this.$.typePicker.setItems(this.typeOptions);
            this.$.typePicker.setShowing(true);
        }
        else {
            this.$.typePicker.setShowing(false);
        }

        // set the default selection for the "type" picker
        if (this.type) {
            this.$.typePicker.setValue(this.type);
        }
        this.$.typePicker.setDisabled(this.disabled);

        this.$.input.setInputType(this.keyboardType);
        this.$.input.setValue(this.value);
        if (this.iconPath) {
            this.$.accountPickerIcon.setSrc(this.iconPath);
        }

        // Disable the input field and turn off swiping if disabled was set on the SwipeableFancyItem
        this.$.input.setDisabled(this.disabled);
        this.$.swipe.setSwipeable(this.swipeable);
        this.$.input.setHint(this.hint);

        if (this.accountList && (this.accountList.length === 0)) {
            this.$.accountPicker.setShowing(false);
        }
        else {
            this.$.accountPicker.setDisabled(!this.accountList);
            this.$.accountPicker.setItems(this.accountList);
        }
    },
    // Adds an ad-hoc type (such as "type_assistant") which is not already defined in this.typeOptions
    addAdHocTypeOption : function (inType) {
        var i,
            typeFound = false;

        if (inType !== undefined && inType.length !== 0 && this.field !== undefined) {
            for (i = 0; this.typeOptions && i < this.typeOptions.length; i += 1) {
                if (this.typeOptions[i].value === inType) {
                    typeFound = true;
                    break;
                }
            }

            if (typeFound === false && this.field.x_displayType && this.field.x_displayType.length > 0) {
                if (this.typeOptions === undefined) {
                    this.typeOptions = [];
                }
                this.typeOptions = this.typeOptions.slice(0);
                this.typeOptions.push({"caption": this.field.x_displayType, "value": inType});
                return true;
            }
        }

        return false;
    },
    getInputValue      : function () {
        return this.$.input.getValue();
    },
    doBlur             : function () {
        var value = this.$.input.getValue(),
            formattedValue = this.doFormat(value),
            newItem,
            accountPickerValue = this.$.accountPicker.getValue(),
            accountObject,
            contactId,
            fieldObject;

        if (this.accountList) {
            accountObject = _.detect(this.accountList, function (acc) {
                return acc.value === accountPickerValue;
            });
        }
        // Note that 0 will indicate this is a new or readonly contact.
        // This indicates to "doGetFieldObject()" the special case that exists
        // (which results in getting the first and only non-readonly linked contact)
        contactId = (accountObject && accountObject.contactId) || 0;

        // Apply any desired formatting (eg. formatting of phonenumbers..)
        if (formattedValue) {
            value = formattedValue;
            this.$.input.setValue(value);
        }

        if (!this.field) {
            if (value.length > 0) {
                newItem = this.doMakeNewItem(value);
                newItem.setType(this.$.typePicker.getValue());
                this.field = newItem;

                fieldObject = this.doGetFieldObject(contactId);
                fieldObject.add(newItem);
                this.group = fieldObject;
                this.$.swipe.setSwipeable(true);

                this._triggerAddNewField();
            }
        }
        else {
            if (value.length > 0) {
                if (!this.doUpdateField(this.field, value)) {
                    this.field.setValue(value);
                }
            }
            else {
                if (this.group) {
                    this.group.remove(this.field);
                }
                this.destroy();
            }
        }
        this.inherited(arguments);
    },
    _triggerAddNewField: function () {
        if (this.newField === undefined) {
            if (typeof(this.onAddNewField) === "string") {
                this.newField = this.doAddNewField(false);
            } else {
                this.newField = this.onAddNewField(false);
            }
        }
    },
    onchange           : function (inSrc, inEvent) {
        var curVal = this.$.input.getValue();
        if (curVal && curVal.length === 1) {
            this._triggerAddNewField();
            if (!this.newField.getShowing()) {
                this.newField.setShowing(true);
                this.newField.parent.render();
            }
        }
        // TODO: Create a new event onRemoveNewField and when curVal.length === 0 trigger it (make sure to manage this.newField properly)
    }
});


// Custom enyo.ListSelector to override the position of where the popup opens, otherwise in portrait mode the items are truncated
enyo.kind({
    name        : "AccountPickerListSelector",
    kind        : enyo.ListSelector,
    popupOffset : {},
    clickHandler: function (inSender, inEvent) {
        if (!this.disabled) {
            this.doClick(inEvent);
            this.popup.openAtControl(this, this.popupOffset);
            this.popup.scrollToSelected();
        }
    }
});
