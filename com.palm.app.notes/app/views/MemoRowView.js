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

/*global enyo, MemoView, NewMemoView */

var MemoRowView = "MemoRowView";

enyo.kind({
  name: MemoRowView,
  kind: "enyo.HFlexBox",
  events: {
    onNewMemoClick: '',
    onDeleteMemoClick: '',
    onMemoClick: '',
    onSetNewMemoColor: ''
  },
  components: [
    {
      name: 'newMemo',
      className: 'new-memo',
      kind: NewMemoView,
      onNewMemoClick: "newMemoClick"
    },
    {
      name: "memo-0",
      kind: MemoView,
      onMemoClick: 'memoClick',
      onDeleteMemoClick: 'deleteMemoClick'
    },
    {
      name: "memo-1",
      kind: MemoView,
      onMemoClick: 'memoClick',
      onDeleteMemoClick: 'deleteMemoClick'
    },
    {
      name: "memo-2",
      kind: MemoView,
      onMemoClick: 'memoClick',
      onDeleteMemoClick: 'deleteMemoClick'
    },
    {
      name: "memo-3",
      kind: MemoView,
      onMemoClick: 'memoClick',
      onDeleteMemoClick: 'deleteMemoClick'
    }
  ],

  showNewMemo: function(visible) {
    this.$.newMemo.setShowing(visible);
  },

  setNewMemoColor: function(color) {
    this.doSetNewMemoColor(color);
  },

  setMemos: function(memos) {
    var memo, memoView;
    for (var i = 0; i < 4; i++) {
      memo = memos[i];
      memoView = this.$["memo-" + i];
      if (memo) {
        memoView.setMemo(memo);
        memoView.show();
      } else {
        memoView.hide();
      }
    }
  },

  newMemoClick: function(color) {
    this.doNewMemoClick(color);
  },

  memoClick: function(sender, memoJson) {
    // TODO: animations   this.doMemoClick(sender, memoJson);
     this.doMemoClick(memoJson);
  },

  deleteMemoClick: function(sender, memoJson) {
    this.doDeleteMemoClick(memoJson);
  }
});