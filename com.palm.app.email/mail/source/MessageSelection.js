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

/*
 Mail was ahead of the framework on selection, so this
 selection component was constructed as a work-around.
 It overrides the Selection component in the framework.
 Framework evolved and the Selection component was
 modified, and the APIs diverged.

 Specifically, the override component below expects
 the onChange event to trigger a list refresh, but
 the new framework API updates individual rows instead
 of refreshing the entire list.

 As a fix, we patch VirtualList to expose customSelectionChange
 method and delegate to that method by default from Selection's
 onChange.

 This should restore the functionality without
 disturbing the new API.
 */

enyo.VirtualList.prototype.customSelectionChange = function () {
    this.refresh();
};

enyo.kind({
    name: "enyo.Selection",
    kind: "Component",
    published: {
        multi: false
    },
    events: {
        // by default, delegate to the customSelectionChange we
        // inserted into VirtualList prototype (see above)
        onChange: "customSelectionChange"
    },
    create: function () {
        this.selected = {};
        this.inherited(arguments);
    },
    clear: function () {
        if (this.getSelectedKeys().length) {
            this.selected = {};
            this.doChange();
        }
    },
    multiChanged: function (old) {
        if (!this.multi !== old) {
            this.clear();
        }
    },
    /** Returns true if item with given key is in the selection. */
    isSelected: function (inKey) {
        return !!this.selected[inKey];
    },
    /** Sets selection state of given key. */
    setByKey: function (inKey, inSelected) {
        if (inSelected) {
            this.selected[inKey] = true;
        } else {
            delete this.selected[inKey];
        }
    },
    /** Deselect item with given key, if it is selected.
     Sends onChange event to broadcast the new selection. */
    deselect: function (inKey) {
        this.setByKey(inKey, false);
        this.doChange();
    },
    /** Select the item with the given key (or possibly deselect it if multiselect is on).
     Sends onChange event to broadcast the new selection. */
    select: function (inKey) {
        var state = this.isSelected(inKey);
        if (!this.multi) {
            // Nothing to do if it's already selected.
            if (state) {
                return;
            }
            this.selected = {}; // clear selection, but don't broadcast change yet.
        }
        this.setByKey(inKey, !state);
        this.doChange();
    },
    /** Returns an array of key values for items which are currently selected. */
    getSelectedKeys: function () {
        return Object.keys(this.selected);
    }
});