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

/* This is a copy of enyo.Selection from enyo, with the following changes:
 *  - selected is now an object/hash, instead of a list
 *  - on clear(), deselect each item so that the owner knows that it needs to re-render
 *  - add getSelectedKeys() and getSelectedValues()
 */

/** This is used to manage row selection state for lists. */
enyo.kind({
    name: "CustomSelection",
    kind: enyo.Component,
    published: {
        //* if true, allow multiple selections
        multi: false
    },
    events: {
        /**
         Fires when an item is selected.

         {kind: "Selection", onSelect: "selectRow"...
         ...
         selectRow: function(inSender, inKey, inPrivateData) {
         ...

         _inKey_ is whatever key was used to register
         the selection, usually a row index.

         _inPrivateData_ references data registered
         with this key by the code that made the selection.
         */
        onSelect: "",
        /**
         Fires when an items is  deselected.

         {kind: "Selection", onSelect: "deselectRow"...
         ...
         deselectRow: function(inSender, inKey, inPrivateData)
         ...

         _inKey_ is whatever key was used to request
         the deselection, usually a row index.

         _inPrivateData_ references data registered
         with this key by the code that made the original
         selection.
         */
        onDeselect: "",
        //* Sent when selection changes (but not when the selection is cleared).
        onChange: ""
    },
    //* @protected
    create: function () {
        this.selected = {};
        this.clear();
        this.inherited(arguments);
    },
    multiChanged: function () {
        if (!this.multi) {
            this.clear();
        }
        this.doChange();
    },
    highlander: function (inKey) {
        if (!this.multi) {
            this.deselect(this.lastSelected);
        }
    },
    //* @public
    //* remove all selections
    clear: function () {
        // deselect anything currently selected
        var keys = Object.keys(this.selected);
        for (var i = 0; i < keys.length; i++) {
            this.deselect(keys[i]);
        }

        this.selected = {};
    },
    //* returns true if the inKey row is selected
    isSelected: function (inKey) {
        return this.selected[inKey];
    },
    //* manually set a row to selected or unselected
    setByKey: function (inKey, inSelected, inData) {
        if (inSelected) {
            this.selected[inKey] = (inData || true);
            this.lastSelected = inKey;
            this.doSelect(inKey, this.selected[inKey]);
        } else {
            var was = this.isSelected(inKey);
            delete this.selected[inKey];
            this.doDeselect(inKey, was);
        }
        this.doChange();
    },
    //* deselect a row
    deselect: function (inKey) {
        if (this.isSelected(inKey)) {
            this.setByKey(inKey, false);
        }
    },
    //* select a row. If the selection has the multi property set to false, it will also deselect the previous selection.
    select: function (inKey, inData) {
        if (this.multi) {
            this.setByKey(inKey, !this.isSelected(inKey), inData);
        } else if (!this.isSelected(inKey)) {
            this.highlander();
            this.setByKey(inKey, true, inData);
        }
    },
    //* toggle selection for a row. If the multi is false, toggling a selection on will deselect the previous selection
    toggle: function (inKey, inData) {
        if (!this.multi && this.lastSelected != inKey) {
            this.deselect(this.lastSelected);
        }
        this.setByKey(inKey, !this.isSelected(inKey), inData);
    },
    getSelectedKeys: function () {
        return Object.keys(this.selected);
    },
    getSelectedValues: function () {
        var values = [];

        var keys = Object.keys(this.selected);
        for (var i = 0; i < keys.length; i++) {
            values.push(this.selected[keys[i]]);
        }

        return values;
    }
});
