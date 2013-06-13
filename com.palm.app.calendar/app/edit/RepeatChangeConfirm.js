// @@@LICENSE
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
// LICENSE@@@


/**
 NOTE: calendar.edit.RepeatChangeConfirm is a confirmation view displayed to the user when applying a change to an event's repeat rule.

 **/
enyo.kind({
    name      : "calendar.edit.RepeatChangeConfirm",
    className : "calendar-repeat-change-confirm",
    kind      : enyo.VFlexBox,
    events    : {
        onSave: "",
        onExit: ""
    },
    published : {
        info: null /*expecting {event: event, parentId: id} */
    },
    components: [
        {content: $L("This is a repeating event"), className: "dialog-text"},
        {kind: enyo.VFlexBox, components: [
            {kind: enyo.Button, caption: $L("Change The Whole Series"), onclick: "changeSeries"},
            {kind: enyo.Button, caption: $L("Change This Event Only"), onclick: "changeSingle"},
            {kind: enyo.Button, caption: $L("Cancel"), onclick: "cancelClicked"}
        ]},
        {kind             : "ApplicationEvents",
            onWindowHidden: "cancelClicked"
        }
    ], //end components

    // Construct/Destruct methods
    create    : function create() {
        this.inherited(arguments);
        this.setupOnClose();
        this.updateCallback = enyo.bind(this, this.updateCallback);
        DEBUG && this.log("########## Created.");
    },

    destroy      : function destroy() {
        this.inherited(arguments);
        DEBUG && this.log("########## Destroyed.");
    },

    // Published property handling
    infoChanged  : function infoChanged() {
        if (!this.info) {
            return;
        }
        this.event = this.info.event;
        this.parentId = this.info.parentId;
        if ((this.event.rrule && this.event.rrule.freq) || this.event.parentId) {
            this.setShowing(true);
        }
    },

    // Everything else
    cancelClicked: function cancelClicked() {
        DEBUG && this.log("########## Clicked the cancel button in RepeatChangeConfirm view.");
        this.exitView();
    },

    changeSeries: function () {
        this.doSave();
        this.exitView();
    },

    changeSingle: function () {
        this.doSave(this.event._id);	// TODO: We're not using the parentId we passed in here.  Why?
        this.exitView();
    },

    exitView: function exitView() {
        DEBUG && this.log("########## Exit RepeatChangeConfirm view.");
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
        var view = this
            , doClose = this.container.doClose;

        this.container.doClose = function closeManager() {    // If the view is contained within a popup or some other container that can be closed, we need to know about those close events
            DEBUG && this.log("########## Hiding RepeatChangeConfirm popup.");
            view.doExit();
            doClose.apply(this, arguments);				//		then run any defined "onClose" handler.
        };
    }
});
