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

/*global enyo, console
 */

/*
 Component which manages the pin operation for a file in the file cache.
 The idea is that you can just set the path to pin, and put all logic to reload the resource in an onReload handler.

 A CachedFile component will attempt to pin the file at 'path', and emit onSuccess if all goes well.
 If the item has been purged (or if the path is not a valid file cache key), it will emit onReload to trigger a reload of the cached resource.
 Once the purged item has been reloaded, the path property should be updated by the owner to trigger a retry of the pin operation.
 */

enyo.kind({
    name: "CachedFile",
    kind: "enyo.Component",

    published: {
        path: ""
    },

    events: {
        onSuccess: "",
        onReload: ""
    },

    components: [
        {name: "SubscribeCacheObject", kind: "enyo.PalmService", service: 'palm://com.palm.filecache/', method: "SubscribeCacheObject", subscribe: true, onSuccess: "pinSuccess", onFailure: "pinFail"}
    ],


    create: function () {
        this.inherited(arguments);
    },


    setPath: function (newPath) {
        this.cancel();

        this.path = newPath;
        if (!newPath) {
            // falsy path? Assume the pin will fail.
            this.pinFail();
        } else {
            if (window.PalmSystem && newPath.indexOf("/var/file-cache") == 0) {
                this.$.SubscribeCacheObject.call({pathName: newPath, subscribe: true});
            } else {
                // either not on device, or path not in filecache
                window.setTimeout(this.pinSuccess.bind(this), 0);
            }
        }
    },

    cancel: function () {
        this.$.SubscribeCacheObject.cancel();
        this.path = "";
    },


    pinSuccess: function (inSender, result) {
        console.info("Successfully pinned file at " + this.path);
        this.doSuccess();
    },

    pinFail: function (inSender, result) {
        console.info("Pin failed, reloading file at " + this.path);
        this.doReload();
    }
});