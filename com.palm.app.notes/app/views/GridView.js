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

/*global $L, ConfirmDeletePopupView, enyo, GridAgent, Memo, MemoRowView, TitleBarView, TitleBarSearchView, util */

var GridView = "GridView";

enyo.kind({
  name: GridView,
  kind: enyo.VFlexBox,
  className: "memo-grid-view",
  nextId: 0,
  events: {
    onEditMemo: "",
    onEditMemos: "",
    onfocus: ""
  },
  components: [
    {
      name: "gridTitleBar",
      kind: TitleBarView,
      showing: true,
      components: [
        {
          name: "search",
          kind: TitleBarSearchView,
          onSearch: "onSearchInputKeypress"
        },
        {kind: enyo.Control, flex: 1},
        {
          name: "memoCount",
          className: "memo-count title-bar-button",
          content: "",
          flex: 1
        },
        {kind: enyo.Control, flex: 1},
        {
          kind: enyo.HFlexBox,
          flex: 1,
          components:[
            {kind: enyo.Control, flex: 1},
            {
              name: 'edit',
              kind: "Button",
              content: $L('Edit'),
              className: 'grid-edit-button enyo-button-dark',
              onclick: 'onGridEditClick'
            }
          ]
        }
      ]
    },
    {
      name: "gridEditTitleBar",
      kind: TitleBarView,
      showing: false,
      components: [
        {kind: enyo.Control, flex: 1},
        {
          content: $L("Delete memos"),
          className: "grid-edit-title"
        },
        {
          name: 'editDone',
          kind: "Button",
          content: $L('Done'),
          className: 'grid-edit-done-button title-bar-button enyo-button-blue',
          onclick: 'onGridEditDoneClick'
        }
      ]
    },
    {
      kind: enyo.Control,
      className: "title-bar-shadow"
    },
    {
      name: "memoList",
      kind: "VirtualList",
      className: "memo-list",
      onSetupRow: "setupRow",
      components: [
        {
          name: "memoRow",
          kind: MemoRowView,
          onNewMemoClick: 'newMemo',
          onMemoClick: 'editMemo',
          onDeleteMemoClick: 'deleteMemo',
          onSetNewMemoColor: 'setNewMemoColor'
        }
      ]
    },
    {
      name: 'confirmDeletePopup',
      kind: ConfirmDeletePopupView,
      className: 'confirm-delete-popup',
      onDelete: 'memoDeleted',
      onCancel: 'closePopup'
    }
  ],

  create: function() {
    this.inherited(arguments);
    this.gridShowing = false;
    this.agent = new GridAgent(this);
  },

  viewSelected: function(params) {
    if (params && params.text) {
      this.closePopup();
      this.onGridEditDoneClick();
      this.$.search.setValue('');
      this.agent.populateGridThenEdit(params.text);
    } else {
      this.agent.populateGrid(this.$.search.getValue());
    }
  },

  backButtonLabel: function() {
    return (this.$.search.getValue().length ? $L("Search Results") : $L("All Memos"));
  },

  setupRow: function(sender, index) {
    if (index < 0 || !this.gridShowing) {
      return false;
    }

    var listWidth = this.$.memoList.getBounds().width;
    var itemsInRow = Math.floor(listWidth / 246);
    var memos = this.agent.getMemos();

    if (index === 0) {
      this.$.memoRow.setMemos(memos.slice(0, itemsInRow - 1));
      this.$.memoRow.showNewMemo(true);
      return true;
    }

    var sliceIndex = index * itemsInRow - 1;
    if (sliceIndex < memos.length) {
      this.$.memoRow.setMemos(memos.slice(sliceIndex, sliceIndex + itemsInRow), false);
      this.$.memoRow.showNewMemo(false);
      return true;
    }

    return false;
  },

  // Owner interface

  resizeHandler: function() {
    this.$.memoList.resizeHandler();
  },

  // Event interface for search

  onSearchInputKeypress: function(sender, event) {
    this.agent.populateGrid(this.$.search.getValue());
  },

  // Event interface for gridTitleBar

  onGridEditClick: function(sender) {
    this.$.gridTitleBar.hide();
    this.$.gridEditTitleBar.show();
    this.$.memoList.addClass("edit-mode");
    this.disableHandler('newMemo');
    this.disableHandler('editMemo');
  },

  // Event interface for gridEditTitleBar

  onGridEditDoneClick: function(sender) {
    this.$.gridEditTitleBar.hide();
    this.$.gridTitleBar.show();
    this.$.memoList.removeClass("edit-mode");
    this.enableHandler('newMemo');
    this.enableHandler('editMemo');
  },

  // Event interface for memoList

  newMemo: function(sender) {
    var newMemoValues = {
      text: this.$.search.getValue()
    };
    this.doEditMemo(this.agent.createNewMemo(newMemoValues), this.backButtonLabel());
  },

  editMemo: function(sender, memoJson) {
    this.doEditMemo(new Memo(memoJson), this.backButtonLabel());
  },

// TODO: animations
// editMemo: function(sender, memoView, memoJson) {
//    this.doEditMemo(memoView, new Memo(memoJson), this.backButtonLabel());
//  },

  deleteMemo: function(sender, memoJson) {
    this.$.confirmDeletePopup.go(new Memo(memoJson));
    this.$.confirmDeletePopup.openAtCenter();
  },

  setNewMemoColor: function(sender, color) {
    this.drawMemoPadWithColor(color);
  },

  // Event interface for confirmDeletePopup

  memoDeleted: function(sender, memoId) {
    this.closePopup();
    this.agent.deleteMemoFromList(memoId);
  },

  closePopup: function(sender) {
    this.$.confirmDeletePopup.close();
  },

  // View interface for GridAgent

  showGrid: function() {
    this.gridShowing = true;
  },

  drawMemos: function() {
    this.$.memoList.refresh();
    this.$.memoCount.setContent(this.agent.getTitleBarLabel());
    this.$.edit.setDisabled(this.agent.getMemos().length === 0);
  },

  scrollMemosToTop: function() {
    this.$.memoList.punt();
  },

  drawMemoPadWithColor: function(color) {
    util.swapMemoColorClassName(this.$.memoList, color);
  },

  disableHandler: function(handlerName) {
    this[handlerName] = enyo.nop;
  },

  enableHandler: function(handlerName) {
    delete this[handlerName];
  },

  editNewMemo: function(text) {
    var newMemoValues = {
      text: enyo.string.escapeHtml(text)
    };
    this.doEditMemo(this.agent.createNewMemo(newMemoValues), this.backButtonLabel());
  }
});