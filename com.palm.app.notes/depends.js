// @@@LICENSE
//
//      Copyright (c) 2012-2013 LG Electronics, Inc.
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
// REVIEWED: Erik Jaesler 2012-01-13

/*global enyo */

enyo.depends(
    "app/agents/EditAgent.js",
    "app/agents/ConfirmDeletePopupAgent.js",
    "app/agents/GridAgent.js",
    "app/lib/ServiceWrapper.js",
    "app/lib/AppManagerApi.js",
    "app/lib/DbApi.js",
    "app/lib/Util.js",
    "app/models/Memo.js",
    "app/views/TitleBarSearchView.js",
    "app/views/ColorPickerView.js",
    "app/views/ConfirmDeletePopupView.js",
    "app/views/TitleBarView.js",
    "app/views/EditView.js",
    "app/views/MemoView.js",
    "app/views/NewMemoView.js",
    "app/views/MemoRowView.js",
    "app/views/GridView.js",
    "app/views/AppView.js",
    "css/memos.css",
    "css/grid.css",
    "css/grid-edit.css",
    "css/edit.css",
    "css/confirm-delete-popup.css",
    "app/App.js"
);