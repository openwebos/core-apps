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

/*global EditView, enyo, GridView, ListView */

var logApiFailures = true;

var AppView = "AppView";

enyo.kind({
  name: AppView,
  kind: enyo.Control,
  className: "enyo-fit",
  components: [
    {
      kind: "ApplicationEvents",
      onApplicationRelaunch: "applicationRelaunchHandler"
    },
    {
      name: "grid",
      kind: GridView,
      className: 'enyo-fit',
      onEditMemo: "editMemo",
      onEditMemos: "onEditMemos",
      showing: true
    },
    {
      name: "edit",
      kind: EditView,
      className: 'edit-view enyo-fit',
      onAllMemos: "onAllMemos",
      showing: false
    },
    {
      name: "appMenu",
      kind: "AppMenu",
      components: [
        {
          kind: "HelpMenu",
          target: "http://help.palm.com/notes/index.html"
        }
      ]
    }
  ],

  create: function() {
    this.inherited(arguments);
    enyo.setAllowedOrientation('free');
  },

  go: function() {
    this.goToGrid(enyo.windowParams);
  },

  applicationRelaunchHandler: function() {
    this.go();
  },

  resizeHandler: function() {
    this.$.grid.resizeHandler();
    if (this.$.edit.showing) {
      this.$.edit.resizeHandler();
    }
  },


  // TODO: animations  editMemo: function(sender, memoView, memo, backButtonLabelText) {
  editMemo: function(sender, memo, backButtonLabelText) {
    this.$.edit.setBackButtonLabel(backButtonLabelText);
    this.$.edit.setMemo(memo);
    this.$.edit.show();
    this.$.edit.viewSelected();
  },

  onAllMemos: function() {
    this.$.edit.hide();
    this.$.grid.viewSelected();
  },

  goToGrid: function(params) {
    this.$.grid.viewSelected(params);
  }
});
