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

/*global $L, console, enyo, logApiFailures, util */

var ServiceWrapper = 'ServiceWrapper';

enyo.kind({
  name: ServiceWrapper,
  kind: enyo.Component,
  components: [
    {
      kind: enyo.DbService,
      dbKind: "com.palm.note:1",
      components: [
        {name: 'find', method: 'find', onSuccess: 'onSuccess', onFailure: 'onFailure'},
        {name: 'search', method: 'search', onSuccess: 'onSuccess', onFailure: 'onFailure'},
        {name: 'merge', method: 'merge', onSuccess: 'onSuccess', onFailure: 'onFailure'},
        {name: 'put', method: 'put', onSuccess: 'onSuccess', onFailure: 'onFailure'},
        {name: 'del', method: 'del', onSuccess: 'onSuccess', onFailure: 'onFailure'},
        {name: 'delAll', method: 'delByQuery', onSuccess: 'onSuccess', onFailure: 'onFailure'}
      ]
    },
    {
      kind: enyo.PalmService,
      service: 'luna://com.palm.applicationManager/',
      components: [
        {name: 'launch', method: 'open', onSuccess: 'onSuccess', onFailure: 'onFailure'}
      ]
    }
  ],

  find: function(callbacks) {
    this.saveCallbacks(callbacks);
    this.$.find.call({
      query: {
        orderBy: "position"
      }
    });
  },

  search: function(filter, callbacks) {
    this.saveCallbacks(callbacks);
    this.$.search.call({
      query: {
        from: "com.palm.note:1",
        where: [{
            prop: "text",
            op: "?",
            val: filter,
            collate: "primary",
            tokenize: "all"
          }],
          orderBy: "position"
      }
    });
  },

  save: function(memo, callbacks) {
    this.saveCallbacks(callbacks);
    var memoJson = memo.serialize();
    var method = memoJson._id ? 'merge' : 'put';
    this.$[method].call({
      objects: [memoJson]
    });
  },

  del: function(memo, callbacks) {
    this.saveCallbacks(callbacks);
    var memoJson = memo.serialize();
    this.$.del.call({
      ids: [memoJson._id]
    });
  },

  delAll: function(callbacks) {
    this.saveCallbacks(callbacks);
    this.$.delAll.call();
  },

  launch: function(memoHtml, callbacks) {
    this.saveCallbacks(callbacks);
    this.$.launch.call({
      id: 'com.palm.app.email',
      params: {
        summary: $L("Just a quick memo"),
        text: memoHtml
      }
    });
  },

  saveCallbacks:function (callbacks) {
    this.onSuccess = callbacks.onSuccess;
    this.onFailure = util.wrap(callbacks.onFailure || function() {}, this.failure);
  },

  failure: function(originalOnFailure, request, response, xhr) {
    if (logApiFailures) {
	/*jslint forin: true */
      for (var key in response) {
        enyo.error("- " + key + ': ' + response[key]);
      }
      for (key in xhr) {
        enyo.error("- " + key + ': ' + response[key]);
      }
	/*jslint forin: false */
    }
    originalOnFailure(request, response, xhr);
  }
});
