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

enyo.kind({
    name: "NextPrevLoader",
    kind: "enyo.Component",
    
    published: {
        conversation: null,
        queryInfo: null,
        nextConversation: undefined,
        prevConversation: undefined
    },
    
    events: {
        onNextChanged: "",
        onPrevChanged: ""
    },
    
    components: [
        {kind: "DbService", onSuccess: "queryResponse", onFailure: "queryError", onWatch: "watchFired", components: [
            {name: "nextWatch", subscribe: true, resubscribe: true},
            {name: "prevWatch", subscribe: true, resubscribe: true}
        ]}
    ],
    
    conversationChanged: function () {
        this.$.nextWatch.cancel();
        this.$.prevWatch.cancel();
        
        this.nextConversation = undefined;
        this.prevConversation = undefined;
    },
    
    queryInfoChanged: function () {
        this.$.nextWatch.cancel();
        this.$.prevWatch.cancel();
        
        if (this.queryInfo && this.conversation) {
            var queryInfo = this.queryInfo;
            var query = queryInfo.query;
        
            // find the next email by timestamp
            // FIXME this doesn't work properly if multiple emails have the same timestamp!
            query.limit = 1;
        
            var nextQuery = enyo.clone(query); // shallow copy
            var prevQuery = enyo.clone(query); // shallow copy
            
            // FIXME should move this elsewhere
            var clause = queryInfo.method === "search" ? "filter" : "where";
            var prop = queryInfo.method === "search" ? "timestamp" : query.orderBy;
            var collation = prop === "timestamp" ? undefined : "primary";
            
            nextQuery[clause] = (query[clause] || []).concat({
                prop: prop,
                op: "<", // older
                val: this.conversation.getTimestamp(),
                collate: collation
            });
            nextQuery.desc = true;
            
            prevQuery[clause] = (query[clause] || []).concat({
                prop: prop,
                op: ">", // newer
                val: this.conversation.getTimestamp(),
                collate: collation
            });
            prevQuery.desc = false;
        
            var nextRequest = this.$.nextWatch.call({query: nextQuery}, {method: queryInfo.method});
            var prevRequest = this.$.prevWatch.call({query: prevQuery}, {method: queryInfo.method});
            
            nextRequest.forNext = true;
            prevRequest.forPrev = true;
        }
    },
    
    queryResponse: function (sender, response, request) {
        //this.log("got next/prev response");
        
        if (response.results) {
            var conversation = null;
            var id = null;
        
            if (response.results.length > 0) {
                var result = response.results[0];
                id = result._id;
                conversation = new VirtualConversation(result);
            }
            
            var oldId;
                
            if (request.forNext) {
                oldId = this.nextConversation && this.nextConversation.getId();
                
                if (id !== oldId) {
                    this.nextConversation = conversation;
                
                    this.doNextChanged();
                }
            } else if (request.forPrev) {
                oldId = this.prevConversation && this.prevConversation.getId();
                
                if (id !== oldId) {
                    this.prevConversation = conversation;
                
                    this.doPrevChanged();
                }
            }
        } else {
            this.queryError(sender, response);
        }
    },
    
    queryError: function (sender, response) {
        // error
        this.error("error getting next/prev: " + JSON.stringify(response));
        this.$.nextWatch.cancel();
        this.$.prevWatch.cancel();
        
        this.nextConversation = null;
        this.prevConversation = null;
        
        this.doNextChanged();
        this.doPrevChanged();
    },
    
    watchFired: function () {
        this.queryChanged();
    }
});