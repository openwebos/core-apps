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

/*global app, enyo */

function EditAgent(view, memo) {
  var self = this;

  function onSaveFailure(request, response, xhr) {
    view.showError('failed to save memo: ' + JSON.stringify(response));
  }

  function onDeleteFailure(request, response, xhr) {
   view.showError('failed to delete memo: ' + JSON.stringify(response));
  }

  function saveMemoThenTellView(onSuccess) {
    if (!memo.text) {
      if (memo.id) {
        app.dbApi.deleteMemo(memo, {
          onSuccess: onSuccess,
          onFailure: onDeleteFailure
        });
      } else {
        onSuccess();
      }
      return;
    }

    app.dbApi.saveMemo(memo, {
      onSuccess: onSuccess,
      onFailure: onSaveFailure
    });
  }

  function goGrid() {
    view.goGrid();
  }

  function memoSaved() {    
    view.memoSaved();
  }

  self.go = function() {
    view.drawMemo();
  };

  self.getMemo = function() {
    return memo;  
  };

  self.setMemoText = function(text) {
    memo.text = text.replace(/((&nbsp;)|(\s)|(<br>)|(<BR>))+$/, '');
  };

  self.done = function() {
    view.updateMemoText();
    saveMemoThenTellView(goGrid);
  };

  self.saveMemo = function() {
    saveMemoThenTellView(memoSaved);
  };

  self.sendMemo = function() {
    view.updateMemoText();
    app.appManagerApi.sendMemo(memo.displayText,  {
      onSuccess: enyo.nop,
      onFailure: enyo.nop
    });
  };

  return self;
}