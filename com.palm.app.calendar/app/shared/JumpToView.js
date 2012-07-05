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


/**
 NOTE: calendar.JumpToView provides a date picker used to change the Calendar's currently displayed date.

 **/
enyo.kind({
    name      : "calendar.JumpToView",
    className : "calendar-jump-to",
    kind      : enyo.VFlexBox,
    events    : {
        onExit       : "",
        onDateChanged: ""
    },
    components: [
        {name: "date", kind: enyo.DatePicker},
        {kind: enyo.VFlexBox, components: [
            {name: "btnJump", kind: enyo.Button, caption: $L("Go To Date"), onclick: "dateClicked", className: "enyo-button-dark"},
            {kind: enyo.Button, caption: $L("Show Today"), onclick: "dateClicked", className: "enyo-button-dark"},
            {kind: enyo.Button, caption: $L("Cancel"), onclick: "cancelClicked", className: "enyo-button-light"}
        ]},
        {kind             : "ApplicationEvents",
            onWindowHidden: "cancelClicked"
        }
    ],

    create: function create() {
        this.inherited(arguments);
        this.setupOnClose();
    },

    destroy: function destroy() {
        this.inherited(arguments);
    },

    cancelClicked: function cancelClicked() {
        DEBUG && this.log("########## Clicked the cancel button in Jump To.");
        this.exitView();
        return true;
    },

    dateClicked: function dateClicked(from, event) {
        DEBUG && this.log("########## Clicked the Go To Date button in Jump To.");
        ui = this.$;
        this.doDateChanged((from === ui.btnJump) ? ui.date.getValue() : new Date());
        this.exitView();
        return true;
    },

    exitView: function exitView() {
        DEBUG && this.log("########## Exit JumpTo view.");
        if (enyo.isFunction(this.container.close)) {
            this.container.close();
        } else {
            this.doExit();
        }
    },

    setupOnClose: function setupOnClose() {
        if (!enyo.isFunction(this.container.doClose)) {
            return;
        }
        var doClose = this.container.doClose,
            view = this;
        this.container.doClose = function closeManager() {  // If the view is contained within a popup or some other container that can be closed, we need to know about those close events
            DEBUG && this.log("########## Hiding JumpTo popup.");
            view.doExit();
            doClose.apply(this, arguments);				        // then run any defined "onClose" handler.
        };
    }
});
