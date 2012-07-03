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

/*global $L, enyo */

var TitleBarSearchView = "TitleBarSearchView";

enyo.kind({
  name: TitleBarSearchView,
  kind: enyo.HFlexBox,
  flex: 1,
  events: {
    onSearch: ""
  },
  components:[
    {
      name: "search",
      kind: "enyo.RoundedSearchInput",
      className: "search-input",
      hint: $L("Search memos"),
      onchange: "propagateSearch",
      onSearch: "propagateSearch",
      changeOnInput: true,
      tabIndex: -1,
      autoCapitalize: false,
      onCancel: "resetSearch"
    },
    {kind: enyo.Control, flex: 1}
  ],

  resetSearch: function() {
    this.propagateSearch("");
  },

  getValue: function() {
    return this.$.search.getValue();
  },

  setValue: function(value) {
    return this.$.search.setValue(value);
  },

  propagateSearch: function() {
    this.doSearch(arguments);
  }
});