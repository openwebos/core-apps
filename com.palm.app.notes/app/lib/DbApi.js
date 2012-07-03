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

/*global enyo, ServiceWrapper */

function DbApi() {
  var self = this;

  self.getMemos = function(filter, callbacks) {
    var dbService = new ServiceWrapper();
    var newCallbacks;

    function escapeHtml(request, response, xhr) {
      var results = response.results;

      for (var i=0; i < results.length; i++) {
        var memo = results[i];

        if (memo.text.match(/<|>/)) {
          memo.text = enyo.string.escapeHtml(memo.text);
          memo.title = enyo.string.escapeHtml(memo.title);
        }
      }

      callbacks.onSuccess(request, response, xhr);
    }

	newCallbacks = {onSuccess: escapeHtml, onFailure: callbacks.onFailure};

    if (filter.length > 0) {
      dbService.search(filter, newCallbacks);
    } else {
      dbService.find(newCallbacks);
    }
  };

  self.saveMemo = function(memo, callbacks) {
    var dbService = new ServiceWrapper();
    var newCallbacks;

    function updateMemo(request, response, xhr) {
      var result = response.results[0];
      memo.updateRev(result.rev);
      if (!memo.id) {
        memo.id = result.id;
      }
      callbacks.onSuccess(request, response, xhr);
    }

	newCallbacks = {onSuccess: updateMemo, onFailure: callbacks.onFailure};

    dbService.save(memo, newCallbacks);
  };

  self.deleteMemo = function(memo, callbacks) {
    var dbService = new ServiceWrapper();
    var newCallbacks;

    function updateMemo(request, response, xhr) {
      memo.clear();
      callbacks.onSuccess(request, response, xhr);
    }

	newCallbacks = {onSuccess: updateMemo, onFailure: callbacks.onFailure};

    dbService.del(memo, newCallbacks);
  };

  return self;
}