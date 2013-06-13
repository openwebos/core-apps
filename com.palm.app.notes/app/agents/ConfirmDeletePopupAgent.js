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

/*global app */

function ConfirmDeletePopupAgent(view, memo) {
  var self = this;
  var id;

  function onDeleteSuccess(request, response, xhr) {
    view.memoDeleted(id);
  }

  function onDeleteFailure(request, response, xhr) {
    view.showError('failed to delete memo: ' + JSON.stringify(response));
  }

  self.deleteMemo = function() {
    if (!(memo.id)) {
      view.memoDeleted();
      return;
    }

    id = memo.id;

    app.dbApi.deleteMemo(memo, {
      onSuccess: onDeleteSuccess,
      onFailure: onDeleteFailure
    });
  };

  return self;
}
