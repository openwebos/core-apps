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

/*global enyo */

var MemoView = "MemoView";

enyo.kind({
	name: MemoView,
  kind: enyo.HFlexBox,
	className: "memo-preview",
  events: {
    onMemoClick: '',
    onDeleteMemoClick: ''
  },
	published: {
		memo: null
	},
	components: [
    {
      // TODO: Make this delete button a separate kind so we can use clickHandler 
      kind: "CustomButton",
      className: "delete-button",
      caption: ' ',
      onclick: 'deleteMemoClick'
    },
		{
      name: "text",
      className: "memo-preview-content"
    }
	],

	memoChanged: function() {
		this.$.text.content = this.memo.displayText;
		this.setClassName(this.className + " " + this.memo.color);
	},

  clickHandler: function(sender) {
    // sender.node.parentElement.getBoundingClientRect() - find the parentElement that is '.memo-preview'
    this.doMemoClick(this.memo);
  },

  deleteMemoClick: function() {
    this.doDeleteMemoClick(this.memo);
  }
});
