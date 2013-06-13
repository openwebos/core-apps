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


/**
 NOTE: DataHub provides [a]synchronous data sharing between objects without
 requiring either to have direct access to or knowledge of the other.
 Objects using DataHub to watch data need only know the property used
 to share that data then implement a setter for that property i.e.:

 All of DataHub's functionality can be added to any object by using its
 enhance method as follows:

 DataHub.enhance (myObject); ).
 myObject.share ({ something: { data:This is fun!" }});


 WATCHING        :    DataHub.watch    ({ something: myObject, something: myFunctionCallback }, { option: value });
 +    OPTIONS:
 +    newOnly: boolean    Ignores any "kept" data.
 +    wait: boolean       Data will be shared to the watcher synchronously
 +    queue: boolean      Multiple asynchronous shares will be queued instead of sharing only the latest value
 +    name: string        Name of watcher
 +    debug: boolean      Show debug output for activity relating to watcher

 SHARING         :    DataHub.share    ({ something: dataToShare}, { option: value }, [optionalWatcherArray]);
 +    OPTIONS:
 +    keep: boolean       Data will be "kept" for late watchers
 +    multiple: boolean   Data represents multiple arguments
 +    sharer: string      Name of sharer
 +    debug: boolean      Show debug output for activity relating to share

 FREEING         :    DataHub.free    ({ something: 1 });
 DataHub.free    ({ something: true });

 IGNORING        :    DataHub.ignore    ({ something: myObject });

 CLEARING        :    DataHub.clearHub();

 All DataHub actions can be chained i.e.:
 DataHub.share ({things:some}).watch ({things:this},{wait:true}).ignore ({things:this}).clearHub()
 **/
var DataHub = (function defineDataHub(global) {

    var DEBUG = !!this.DEBUG || !true;		// Inherit any globally defined DEBUG state.

    var defaultName = "unknown";			// Default name for unknown watchers / sharers

    var idKeyMap = {};						// Map of ids that need to be independently incremented
    function getNextIdByKey(key) {
        /*	Used to generate a the next id in a sequence.
         \	key: string name of id to increment and return.
         */
        !idKeyMap[key] && (idKeyMap[key] = 0);										// Confirm that the key exists, if not initialize to the base value.
        idKeyMap[key] == Number.MAX_VALUE ? (idKeyMap[key] = 1) : ++idKeyMap[key];	// Validate and increment if possible
        return idKeyMap[key];
    }

    function getMethod(property) {
        /* Used to generate the setter function name off of a property name
         \	property: string name of property.
         */
        return "set" + property.charAt(0).toUpperCase() + property.substring(1);	// Auto-camel-case for setters i.e. is24Hr -> setIs24Hr.
    }

    function clearWatches() {
        normalizeDataHubEnvironment();

        var watch,
            watcher,
            watchers,
            watches = thisHub.watches;
        for (var property in watches) {
            if (watches.hasOwnProperty(property)) {
                if (!(watch = watches [property])) {
                    continue;
                }
                watchers = watch.watchers;
                for (var watcherId in watchers) {
                    watcher = watchers[watcherId];
                    watcher.transaction && watcher.transaction.cleanup();	// Kill any transactions in progress
                    (DEBUG || watcher.debug) && log.log("CLEAR: " + (watcher.watcher._DataHub.name || "watcherId: " + watcher.watcher._DataHub.watcherId) + " ---X " + property);
                }
            }
        }
        delete thisHub.watches;
        return this;
    }

    function free(keepMap) {
        normalizeDataHubEnvironment();

        var watch,
            watches = thisHub.watches;
        for (var property in keepMap) {
            if (keepMap.hasOwnProperty(property)) {
                watch = watches [property];
                if (watch) {
                    watch.share = undefined;
                    DEBUG && log.log("FREE: " + property);
                }
            }
        }
        return this;
    }

    function ignore(watchMap) {
        /*	Used to ignore data sharing (i.e. is24Hr).
         \	watchMap: {property:watcher} where watcher was previously added via DataHub.watch ({ property: watcher }).
         */
        normalizeDataHubEnvironment();

        if (!watchMap) {
            log.error("DataHub: At least one property:watcher pair is required (i.e. { is24Hr: dayView }");
            return this;
        }
        if (!thisHub.watches) { // If they are no watches there's nothing to ignore so quickly return.
            return this;
        }

        var count,
            debug,
            ids,
            watch,
            watcher,
            watchers,
            watches = thisHub.watches;
        for (var property in watchMap) {
            if (watchMap.hasOwnProperty(property)) {
                watcher = watchMap [property];
                watch = watches  [property];
                watchers = watch && watch.watchers;

                if (!watcher || !watchers) { // If no property watchers exist go to the next property.
                    continue;
                }

                // INFO: Very useful debug statement:  DEBUG && watcher._DataHub && log.log ("IGNORE: "+ property +" attempting to ignore watcherId "+ watcher._DataHub.watcherId +" with name "+watcher._DataHub.name);

                if (watcher._DataHub && watchers [watcher._DataHub.watcherId] && watcher === watchers [watcher._DataHub.watcherId].watcher) {
                    debug = DEBUG || watchers [watcher._DataHub.watcherId].debug;

                    if (debug) {
                        ids = Object.keys(watchers);
                        count = ids.length;
                        log.log("IGNORE: " + property + " FOUND " + count + (count > 1 ? " watchers" : " watcher"));
                    }

                    watchers [watcher._DataHub.watcherId].transaction && watchers [watcher._DataHub.watcherId].transaction.cleanup();	// Kill any transactions in progress
                    delete (watchers [watcher._DataHub.watcherId]);

                    if (debug) {
                        --count;
                        log.log("IGNORE: " + property + " DELETE " + (watcher._DataHub.name || "watcherId: " + watcher._DataHub.watcherId));

                        for (var i = 0, j = ids.length; i < j; ++i) {
                            watcher = watchers [ids [i]];
                            watcher
                                ? (ids [i] = watcher.watcher._DataHub.name || (watcher.watcher._DataHub.watcherId ? ("watcherId: " + watcher.watcher._DataHub.watcherId) : ""))
                                : delete ids [i];
                        }
                        log.log("IGNORE: " + property + " KEPT " + count + " watchers" + (count ? (": " + ids.join(", ")) : ""));
                    }
                }
            }
        }
        return this;
    }

    function share(shareMap, options, targetWatchers) {
        /*	Used to share data via known property names (i.e. is24Hr).
         \	shareMap		: {property:data, ...} where data is received via watcher.setProperty (data) or a callback function if specified.
         /	options			: {keep:true|false, multiple:true|false, debug:true|false, sharer:"Sharer name"}  name is a string, other options are false by default
         \	targetWatchers	: [watcher,...] An array of watchers with whom this data should be shared.
         */
        normalizeDataHubEnvironment();

        if (!shareMap) {
            log.error("DataHub: At least one property:data pair is required (i.e. { is24Hr: [true] })");
            return this;
        }

        /* Handle passing an array of shares which can be used to set up shares with differing options..  Example:
         \	share ([[{property:data, ...},{keep:true}],[{property:data, ...}]]);
         */
        if (isArray(shareMap)) {
            var i = 0,
                len = shareMap.length;
            for (; i < len; ++i) {
                isArray(shareMap[i]) && share.apply(this, shareMap[i]);
            }
            return this;
        }

        var debug,
            keep,
            method,
            multiple,
            shareObj,
            sharer,
            watch,
            watchers,
            watches = thisHub.watches || (thisHub.watches = {});

        if (options) {                                                // If we have options, sanitize them and set empty options to false:
            debug = !!options.debug;
            keep = !!options.keep;
            multiple = !!options.multiple;
            sharer = options.name || ( share.caller && share.caller.name ) || defaultName;
        } else {                                                    // Otherwise, set all options to false:
            debug = keep = multiple = false;
            sharer = ( share.caller && share.caller.name ) || defaultName;
        }

        isArray(targetWatchers) ? (watchers = targetWatchers) : (targetWatchers = null);

        for (var property in shareMap) {
            if (!shareMap.hasOwnProperty(property)) {
                continue;
            }

            shareObj = {                            // Share object for this property
                shareId : getNextIdByKey("shareId"),    // Set the share's unique shareId
                data    : shareMap [property],
                debug   : debug,
                multiple: multiple,
                sharer  : sharer
            };

            !(watch = watches [property]) && (watch = watches [property] = {});	// Get the watch for the property
            !targetWatchers && (watchers = watch.watchers);						// Get the watchers for the property if we haven't specified targetWatchers

            method = getMethod(property);

            (DEBUG || debug) && log.log("PROCESSED NEW SHARE " + shareObj.shareId + ": " + shareObj.sharer + " ---> " + property + "  " + (keep ? " KEEP" : ""));

            for (var id in watchers) {
                shareData(property, method, watchers [id], shareObj);		    //	Share the data with it.
            }

            keep ? (watch.share = shareObj) : (watch.share && (watch.share = null));		// If "keep" is true, hold on to the share for future watchers.  Otherwise, make sure we're not holding on to anything.

        }
        return this;
    }

    function shareData(property, method, watcher, shareObj) {
        if (!watcher || (typeof watcher.watcher [method] != "function" && typeof watcher.watcher != "function")) {    // If the watcher doesn't exist or can't receive the data, return
            return;
        }

        var debug = DEBUG || shareObj.debug || watcher.debug;
        debug && log.log("SHARE " + shareObj.shareId + ": " + shareObj.sharer + (watcher.wait ? "" : " (1 of 2)") + " ---> " + property + " ---> " + (watcher.watcher._DataHub.name || "watcherId: " + watcher.watcher._DataHub.watcherId) + "  " + (watcher.wait ? " WAIT" : "") + (watcher.queue ? " QUEUE" : "") + (watcher.debug ? " DEBUG" : ""));

        if (watcher.wait) {
            // Share change notifications synchronously.
            var shareData = (shareObj.multiple && isArray(shareObj.data)) ? shareObj.data : [shareObj.data];
            watcher.watcher [method]
                ? watcher.watcher [method].apply(watcher.watcher, shareData)
                : watcher.watcher.apply(window, shareData);
        } else {
            var transaction;
            if (!watcher.transaction || watcher.queue) {    // If we don't currently have a transaction, or we are queuing, we need to set up a new transaction.
                transaction = {
                    top  : watcher,
                    share: shareObj
                };
                function cleanup() {                        // Each transaction needs a cleanup closure.
                    debug && log.log("SHARE " + transaction.share.shareId + ": " + transaction.share.sharer + " (CLEANUP) ---> " + property + " ---X " + (watcher.watcher._DataHub.name || "watcherId: " + watcher.watcher._DataHub.watcherId) + "  " + (watcher.queue ? " QUEUE" : "") + (watcher.debug ? " DEBUG" : ""));
                    transaction.timeoutId && clearTimeout(transaction.timeoutId);
                    transaction.top && (transaction.top.transaction = null);
                    transaction.timeoutId = undefined;
                }

                if (watcher.transaction) {                    // If we are queuing, a transaction may already exist.  We need a queue cleanup closure then since it needs to do extra work.
                    var oldTransaction = watcher.transaction;
                    watcher.transaction.top = null;				// The previous transaction is no longer on top
                    transaction.cleanup = function queueCleanup() {
                        oldTransaction.cleanup();
                        cleanup();
                    }
                } else {                                    // Otherwise just use the cleanup closure.
                    transaction.cleanup = cleanup;
                }

                watcher.transaction = transaction;			// Place the new transaction on the watcher.
            } else {
                transaction = watcher.transaction;			// We're just going to repurpose the old transaction since we have its reference.
                transaction.share = shareObj;				// Set the new share object on the existing transaction in flight.
                return;
            }

            function sharing() {
                debug && log.log("SHARE " + transaction.share.shareId + ": " + transaction.share.sharer + " (2 of 2) ---> " + property + " ---> " + (watcher.watcher._DataHub.name || "watcherId: " + watcher.watcher._DataHub.watcherId) + "  " + (watcher.queue ? " QUEUE" : "") + (watcher.debug ? " DEBUG" : ""));
                var shareData = (transaction.share.multiple && isArray(transaction.share.data)) ? transaction.share.data : [transaction.share.data];
                watcher.watcher [method]
                    ? watcher.watcher [method].apply(watcher.watcher, shareData)
                    : watcher.watcher.apply(window, shareData);
                transaction.cleanup();
            }

            transaction.timeoutId = setTimeout(sharing, 15.625);					// Share change notifications asynchronously.
        }
    }

    function watch(watchMap, options) {
        /*	Used to watch for change notifications via shared properties (i.e. is24Hr).
         watchMap: {property:watcher}
         options	: {debug:true|false, newOnly:true|false, queue:true|false, wait:true|false, name:"Watcher name"}  name is a string, other options are false by default
         */
        normalizeDataHubEnvironment();

        if (!watchMap) {
            log.error("DataHub: At least one property:watcher pair is required (i.e. { is24Hr: dayView })");
            return this;
        }

        /* Handle passing an array of watches which can be used to set up watches with differing options.  Example:
         \	watch ([[{property:watcher, ...},{wait:true}],[{property:data, ...},{queue:true}]]);
         */
        if (isArray(watchMap)) {
            var i = 0,
                len = watchMap.length;
            for (; i < len; ++i) {
                isArray(watchMap[i]) && watch.apply(this, watchMap[i]);
            }
            return this;
        }

        var debug,
            newOnly,
            queue,
            wait,
            name,
            property,
            watcher,
            watcherObj,
            watchers,
            watches = thisHub.watches || (thisHub.watches = {});

        if (options) {                                      // If we have options, sanitize them and set empty options to false:
            newOnly = !!options.newOnly;
            debug = !!options.debug;
            queue = !!options.queue;
            wait = !!options.wait;
            name = options.name ? options.name : false;
        } else {                                            // Otherwise, set all options to false:
            newOnly = debug = queue = wait = name = false;
        }

        function watchOne(watcherObj, propName) {
            if (!watcherObj._DataHub) {                     // Add DataHub namespace to the watcher if it doesn't already exist.
                watcherObj._DataHub = {
                    watcherId: getNextIdByKey("watcherId")      // Set the watcher's unique watcherId
                };
            }

            property = watches [propName] || (watches [propName] = {});	// Cache the property's watch object if it exists within DataHub.  If not, create the watch.
            watchers = property.watchers || (property.watchers = {});	// Cache the watch object's watchers map if it exists.  If not, create the watchers map.

            watcher = watchers [watcherObj._DataHub.watcherId];			// Is there an existing watcher object?
            if (watcher && watcherObj != watcher.watcher) {                 // Another watcher exists using this watcher's id so:
                watcherObj._DataHub.watcherId += String(Date.now());		// Append a timestamp to this watcher's id to make it unique.
                watcher = null;												// The watcher doesn't exist now.
            }
            !watcher && (watcher = watchers [watcherObj._DataHub.watcherId] = {watcher: watcherObj});	// Finally, add the new watcher object if it isn't already existing.

            // Set options on watcher
            watcher.debug = debug;
            watcher.queue = queue;
            watcher.wait = wait;
            (name || !(watcherObj._DataHub.name)) && (watcherObj._DataHub.name = name || watcherObj.name || defaultName);

            (DEBUG || debug) && log.log("WATCH: " + (watcherObj._DataHub.name || "watcherId: " + watcherObj._DataHub.watcherId) + " <--- " + propName + "  " + (newOnly ? " NEWONLY" : "") + (debug ? " DEBUG" : ""));

            if (!newOnly && property.share) {                            // There is existing kept data for this watched property so:
                shareData(propName, getMethod(propName), watcher, property.share);	// Immediately re-share the existing data with this specific watcher.
            }
        }

        for (var propName in watchMap) {
            if (watchMap.hasOwnProperty(propName)) {
                watcherObj = watchMap [propName];

                if (!watcherObj) {
                    log.error("DataHub: Invalid watcher specified: .watch ({" + propName + ":" + watcherObj + "});");
                    continue;
                }

                if (isArray(watcherObj)) {
                    for (var i = 0; i < watcherObj.length; ++i) {
                        watchOne(watcherObj[i], propName);
                    }
                } else {
                    watchOne(watcherObj, propName);
                }
            }
        }
        return this;
    }


    function enhance(object) {
        !object && (object = this);
        normalizeDataHubEnvironment(object);

        for (var api in DataHub) {
            if (!DataHub.hasOwnProperty(api)) {
                continue;
            }
            !(api in object)
                ? (object [api] = DataHub [api])
                : (object [api] != DataHub [api])
                && log.warn("!!! Your object couldn't be enhanced with DataHub." + api + " because it contains a similarly named property.");
        }

        !("_DataHub" in object) && (thisHub = object._DataHub = {});	// Add DataHub namespace to the enhanced object and set thisHub to the namespace object.
    }

    var isArray, log, thisHub;

    function normalizeDataHubEnvironment(scope) {
        !scope && (scope = thisHub || this);
        if (scope.enhance == enhance) {
            return;
        }

        (scope.error && scope.log && scope.warn && (log = scope))                                   // If a logger exists within scope map it locally
        || (global.console && console.error && console.log && console.warn && (log = console));         // otherwise locally map to console.

        var a;
        isArray = Array.isArray
            || (global.enyo
            ? enyo.isArray
            : function isArray(item) {
            return (item instanceof Array) || !!(item && (a = item.constructor) && (a = a.prototype) && (a = a.unshift));
        });
    }

    return ({
        clearHub: clearWatches,
        enhance : enhance,
        free    : free,
        ignore  : ignore,
        share   : share,
        watch   : watch
    });

})(this);
