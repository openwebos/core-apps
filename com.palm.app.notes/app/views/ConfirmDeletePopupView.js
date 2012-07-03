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

/*global $L, ConfirmDeletePopupAgent, enyo */

var ConfirmDeletePopupView = "ConfirmDeletePopupView";

enyo.kind({
  name: ConfirmDeletePopupView,
  kind: "Popup",
  scrim: true,
  modal: true,
  events: {
    onDelete: '',
    onCancel: ''
  },
  components: [
    {
      kind: enyo.Control,
      components: [
        {
          className: "large-text",
          content: $L("Are you sure you want to delete this memo?")
        },
        {
          className: "small-text",
          content: $L("You cannot undo this action.")
        }
      ]
    },
    {
      kind: enyo.HFlexBox,
      components: [
        {
          name: 'cancel',
          kind: "Button",
          flex: 1,
          caption: $L("Cancel"),
          onclick: "onCancelClick"
        },
        {
          kind: enyo.Control,
          className: 'button-spacer'
        },
        {
          name: 'confirm',
          kind: "Button",
          flex: 1,
          className: 'enyo-button-negative',
          content: $L("Delete"),
          onclick: "onDeleteClick"
        }
      ]
    }
  ],

  go: function(memo) {
    this.agent = new ConfirmDeletePopupAgent(this, memo);
  },

  onDeleteClick: function() {
    this.agent.deleteMemo();
  },

  onCancelClick: function() {
    this.doCancel();
  },

  // View Interface
  memoDeleted: function(memoId) {
    this.doDelete(memoId);
  }

});
