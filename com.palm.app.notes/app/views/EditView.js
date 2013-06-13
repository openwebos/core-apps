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

/*global $L, ColorPickerView, ConfirmDeletePopupView, console, EditAgent, enyo, TitleBarView, util, window */

var EditView = "EditView";

enyo.kind({
  name: EditView,
  kind: enyo.VFlexBox,
  className: "edit",
  events: {
    onAllMemos: ""
  },
  published: {
    memo: null
  },
  components: [
    {
      kind: "ApplicationEvents",
      onWindowDeactivated: "saveMemo"
    },
    {
      kind: TitleBarView,
      name: "titleBar",
      components: [
        {
          kind: enyo.HFlexBox,
          flex: 1,
          components: [
            {
              name: 'backButton',
              kind: "Button",
              className: "back-button title-bar-button enyo-button-dark",
              content: $L('All Memos'),
              onclick: 'returnToGrid'
            }
          ]
        },
        {
          name: 'colorPicker',
          kind: ColorPickerView,
          onColorChosen: ""
        },
        {
          kind: enyo.HFlexBox,
          className: "button-group",
          flex: 1,
          components: [
            {
              kind: "Control",
              flex: 1
            },
            {
              name: "send",
              kind: "ToolButton",
              icon: "images/title-bar/icon-email.png",
              onclick: "sendMemo"
            },
            {
              name: "delete",
              kind: "ToolButton",
              icon: "images/title-bar/icon-trash.png",
              onclick: "deleteMemoClick"
            }
          ]
        }
      ]
    },
    {
      kind: enyo.VFlexBox,
      className: 'scrim',
      onclick: 'returnToGrid',
      flex: 1,
      components: [
        {
          kind: enyo.HFlexBox,
          components: [
            {
              kind: enyo.Control,
              flex: 1
            },
            {
              name: 'editBackground',
              kind: enyo.VFlexBox,
              className: 'edit-background',
              components: [
                {
                  name: 'scroller',
                  kind: 'Scroller',
                  className: 'edit-scroller',
                  flex: 1,
                  components: [
                    {
                      name: 'memoInput',
                      kind: 'RichText',
                      hint: '',
                      className: 'memo-input',
                      onclick: "memoInputClick",
                      autoLinking: true,
                      flex: 1
                    }
                  ]
                }
              ]
            },
            {
              kind: enyo.Control,
              flex: 1
            }
          ]
        },
        {
          kind: enyo.Control,
          flex: 1
        }
      ]
    },
    {
      name: 'confirmDeletePopup',
      kind: ConfirmDeletePopupView,
      className: 'confirm-delete-popup',
      onDelete: 'memoDeleted',
      onCancel: 'closeDeleteConfirmPopup'
    }
  ],

  create: function() {
    this.inherited(arguments);
  },

  resizeHandler: function() {
    var visibleHeight = window.innerHeight - this.$.titleBar.getBounds().height;
    var newHeight = Math.min(visibleHeight, 685); // height of post-it background graphic
    this.$.editBackground.setStyle("height:" + newHeight + "px;");
  },

  memoInputClick: function(inSender, inEvent) {
    // let events pass through if the user taps on an anchor tag
    if (inEvent.target.constructor.name == 'HTMLAnchorElement') {
      return false;
    }
    enyo.stopEvent(inEvent);
    return true;
  },

  viewSelected: function() {
    this.enableHandler('returnToGrid');
    this.resizeHandler();
    this.$.scroller.setScrollTop(0);
    this.closeDeleteConfirmPopup();
    if (this.agent.getMemo().isNew()) {
      this.$.memoInput.forceFocus();
    }
  },

  memoChanged: function() {
    this.saveMemo();
  },

  saveMemo: function() {
    if (this.agent) {
      this.agent.setMemoText(this.$.memoInput.getHtml());
      this.agent.saveMemo();
    } else {
      this.buildAgent();
    }
  },

  buildAgent: function() {
    this.$.colorPicker.onColorChosen = "memoColorChosen"; // don't start listening until we have a memo
    this.agent = new EditAgent(this, this.memo);
    this.agent.go();
  },

  memoColorChosen: function(inSender, newColor) {
    var memo = this.agent.getMemo();
    memo.color = newColor;
    util.swapMemoColorClassName(this.$.editBackground, newColor);
  },

  returnToGrid: function() {
    this.disableHandler('returnToGrid');
    this.agent.done();
  },

  sendMemo: function() {
    this.agent.sendMemo();
  },

  setBackButtonLabel: function(backButtonLabelText) {
    this.$.backButton.setCaption(backButtonLabelText);
  },

  deleteMemoClick: function() {
    this.$.confirmDeletePopup.go(this.agent.getMemo());
    this.$.confirmDeletePopup.openAtCenter();
  },

  closeDeleteConfirmPopup: function() {
    this.$.confirmDeletePopup.close();
  },

  memoDeleted: function() {
    this.closeDeleteConfirmPopup();
    this.goGrid();
  },

  disableHandler: function(handlerName) {
    this[handlerName] = enyo.nop;
  },

  enableHandler: function(handlerName) {
    delete this[handlerName];
  },

// View Interface
  drawMemo: function() {
    var memo = this.agent.getMemo();
    this.$.memoInput.removeClass("enyo-richtext-hint");
    this.$.memoInput.setValue(memo.displayText);
    util.swapMemoColorClassName(this.$.editBackground, memo.color);
    this.$.colorPicker.setColor(memo.color);
  },

  goGrid: function() {
    delete this.agent;
    this.doAllMemos();
  },

  memoSaved: function() {
    this.buildAgent();
  },

  showError: function(message) {
    console.error("error (TODO: dialog): " + message);
  },

  updateMemoText: function() {
    this.agent.setMemoText(this.$.memoInput.getValue());
  }
});
