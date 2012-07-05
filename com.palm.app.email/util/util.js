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

/*global  $L,  window, document,
 console, Throttler, $H, $A, Event, $break, Element,
 EmailApp, enyo, Exception, setTimeout */

//TODO: seems like a framework should provide these functions. Putting here for now to unblock progress.
String.prototype.escapeHTML = function () {
    return this.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

String.prototype.unescapeHTML = function () {
    return this.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
};


if (!window.EmailApp) {
    EmailApp = {};
}
EmailApp.Util = {};

/**
 * When running in the browser with launch="nobridge", we can avoid some __PalmServiceBridge__
 * uses because we'll use mock data. However, in such cases we don't get the asynchronous
 * service callbacks that are used to initialize and change things once the data becomes
 * available, and so we have to conditionalize such code.
 *
 * __hasServiceCallbacks__ is typically truthy on the device, and falsy when running in browser.
 *
 * However, during automated testing, we need to fake the services and their callbacks,
 * and so we want to set __hasServiceCallbacks__ truthy. In such cases, we cannot
 * just globally set __window.PalmSystem__ truthy because there is enyo code conditionalized
 * on that, which will break if we lie. Hence the __hasServiceCallbacks__ flag here, separate
 * from __window.PalmSystem__, but sharing the same initial value.
 *
 * Compare __onDevice__.
 */
EmailApp.Util.hasServiceCallbacks = function () {
    return window.PalmSystem;
};

/**
 * A test hook that can be bound to a function(dbService), which function will alter the dbService's call() method.
 */
enyo.application.dbServiceHook = enyo.application.dbServiceHook; // i.e., typically undefined, but don't alter on load if not.

if (!window.PalmSystem) {

    // Hack to get us bind when it's missing.
    if (Function.prototype.bind === undefined) {
        Function.prototype.bind = function () {
            if (arguments.length < 2 && arguments[0] === undefined) {
                return this;
            }
            // dont require underscore for bind
            var __method = this, args = Array.prototype.slice.call(arguments), object = args.shift();
            return function () {
                return __method.apply(object, args.concat(Array.prototype.slice.call(arguments)));
            };
        };
    }

    // Hack to fake PalmServiceBridge. Poorly.
    if (!window.PalmServiceBridge) {
        window.PalmServiceBridge = function () {
        };
        window.PalmServiceBridge.prototype.call = function () {
        };
        window.PalmServiceBridge.prototype.cancel = function () {
        };
    }
}

EmailApp.Util.onDevice = function () {
    return !window.fauxMail && window.PalmSystem;
};

// FIXME move this someplace better
EmailApp.Util.generateUnreadCountQuery = function (folderId) {
    var query = {
        from: "com.palm.email:1",
        limit: 0
    };

    // now we add the where clause so that we can use special-case queries for the synthetic folders
    if (folderId === Folder.kAllInboxesFolderID) {
        query.where = [
            { prop: "flags.visible", op: "=", val: true },
            { prop: "withinInbox", op: "=", val: true },
            { prop: "flags.read", op: "=", val: false }
        ];
    } else if (folderId === Folder.kAllFlaggedFolderID) {
        query.where = [
            { prop: "flags.visible", op: "=", val: true },
            { prop: "flags.flagged", op: "=", val: true },
            { prop: "flags.read", op: "=", val: false }
        ];
        /*
         //we need a new index for this one, so I'm leaving it commented out
         //this is fine - since it has a fake id, the search should return a count of 0 when we use the default where clause below
         } else if (folderId === Folder.kAllUnreadFolderID) {
         query.where = [
         { prop: "flags.visible", op: "=", val: true },
         { prop: "flags.read", op: "=", val: false }
         ];
         */
    } else {
        query.where = [
            { prop: "flags.visible", op: "=", val: true },
            { prop: "folderId", op: "=", val: folderId },
            { prop: "flags.read", op: "=", val: false }
        ];
    }

    return query;
};

// Optimize by moving wrapper to separate class & eliminating the closure.
EmailApp.Util.callService = function (inUrl, inArgs, inCallback) {
    return new EmailApp.Util._ServiceRequest(inUrl, inArgs, inCallback);
};

/**
 * Routine to determine if a file is in the file cache and calls one of two callbacks.
 * Both callbacks receive the path as their first parameter, and the direct
 * result as the second parameter.
 * @param: path {string} Absolute path to the file, without file://
 *                 (optional; missingCallback will be called if it is not passed)
 * @param: existsCallback {function} Callback for when the file is found
 * @param: missingCallback {function} Callback for when the file is not found
 */
EmailApp.Util.checkFilePath = function (path, existsCallback, missingCallback) {
    if (path) {
        EmailApp.Util.callService('palm://com.palm.filenotifyd.js/fileExists', {
            path: path
        }, function (res) {
            if (res.exists) {
                existsCallback(path, res);
            } else {
                missingCallback(path, res);
            }
        });
    } else {
        missingCallback(path);
    }
};

EmailApp.Util.setUpConnectionWatch = function () {
    if (enyo.application.connectionWatch) {
        return;
    }

    var app = enyo.application;
    var reqHandler = enyo.bind(null, EmailApp.Util.callbackRouter,
        function (resp) {
            console.log("connection status updated: " + JSON.stringify(resp));
            app.connectionStatus = resp;
        }, /// onSuccess
        function (resp) {
            console.log("connectionmanager 'getStatus' request failed." + JSON.stringify(resp));
        }); // onFailure

    enyo.application.connectionWatch = EmailApp.Util.callService("palm://com.palm.connectionmanager/getStatus", { subscribe: true }, reqHandler);
    // how do we do resubscribe: true?

    enyo.application.isConnectionAvailable = function () {
        // allow !app.connectionStatus in case connection status is never returned
        return (!app.connectionStatus || app.connectionStatus.isInternetConnectionAvailable);
    };

};

/**
 * Check if a provided dom node is actually visible on the screen
 */
EmailApp.Util.isDomNodeReallyVisible = function isDomNodeReallyVisible(aNode) {
    if (!aNode || (aNode.style && aNode.style.display === 'none')) {
        return false;
    }
    if (aNode === document || aNode === window || !aNode.style) {
        return true;
    }
    return isDomNodeReallyVisible(aNode.parentNode);
};

/**
 * TEMPLATE method. for use on enyo screens, NEEDS TO BE BOUND *
 * @param: setup {Object} in the form of: {
 *             fieldMatcher:  {regex} -- used to match input fields on a scene. Note that you need to check the
 *                format of the ids enyo creates before employing this method.
 *            className: {string} -- css selector, in the form of '.classname'. This is the class name to match
 *                 against input fields. Note that all input fields you want to tab through must have this class
 *                name assigned
 *            completionChecker: {function} -- method to determine whether form is complete
 *            onFormComplete: {function} -- function to execute once enter is pressed in the form's final field,
 *                 and form is found to be complete.
 *    }
 * @param: target -- enyo standard junk. don't override
 * @param: event -- enyo standard junk. don't override
 *
 * the proper way to set this up is as follows:
 *    in your scene method, specify a handler, say 'checkEnter':
 *
 *  "checkEnter" : function(target, event) {
 *        // override method with a bound version of this template
 *
 *        this.checkEnter = EmailApp.Util.enterAsTab.bind(this, {
 *            fieldMatcher: /cRUDAccounts_manualConfig_/,
 *            className: '.babelfish',
 *            completionCheck: this.isFormComplete.bind(this),
 *            onFormComplete: this.validateAccount.bind(this)
 *        });
 *        this.checkEnter(target, event);     // call it for the first time
 *    }
 */
EmailApp.Util.enterAsTab = function (setup, target, event) {

    // handle tabs and enter presses
    if (event.keyCode !== 13 && event.keyCode !== 9) {
        return false;
    }

    var fieldMatcher = setup.fieldMatcher,
        className = setup.className,
        completionChecker = setup.completionCheck,
        onFormComplete = setup.onFormComplete;
    var nodes = document.querySelectorAll(className);
    var isDomNodeReallyVisible = EmailApp.Util.isDomNodeReallyVisible;
    var i = 0, num = nodes.length, aNode = undefined, match = false, next = undefined, idElems = undefined, enyoName = undefined;
    var looped = 0;
    while (!next && looped < 2) {
        aNode = nodes[i];
        // enyo dom ids are not consistent. Splitting on a known common root, and then checking for elems
        // stupid enyo. I hate you.
        idElems = aNode.id.split(fieldMatcher);
        enyoName = idElems.length && idElems[idElems.length - 1];
        if (match && isDomNodeReallyVisible(aNode) && !this.$[enyoName].getDisabled()) {
            next = this.$[enyoName];
            break;
        }

        if (enyoName === target.name) {
            match = true;
        }

        i = (i + 1) % num; // loop around

        if (i === 0) {
            // if this is the last field, and enter was pressed
            if (match && event.keyCode === 13 && completionChecker()) {
                onFormComplete();
                this.$[enyoName].forceBlur && this.$[enyoName].forceBlur();
                return;
            }
            ++looped;
        }
    }

    next && next.forceFocus();
};

/**
 * used to force a stack trace without killing anything
 */
EmailApp.Util.traceBarf = function () {
    var x = 0;
    console.log("Barf-o-rama");
    try {
        x.foo();
    } catch (e) {
        // ...and you ask yourself, well, how did I get here?
        console.log(e.stack);
    }
};

EmailApp.Util._ServiceRequest = function (inUrl, inArgs, inCallback) {
    var service;

    inArgs = enyo.isString(inArgs) ? inArgs : JSON.stringify(inArgs);


    this.clientCallback = inCallback;
    this.url = inUrl;
    this.args = inArgs;

    this.cancelled = false;
    this.completed = false;

    this._onComplete = this._onComplete.bind(this);

    service = new PalmServiceBridge();
    service.onservicecallback = this._onComplete;
    service.url = inUrl;
    service.args = inArgs;
    service.call(inUrl, inArgs);

    this.service = service;

    this._requestId = this._requestGlobals.value++;
    this._requestCache[this._requestId] = this;
};

EmailApp.Util._ServiceRequest.prototype = {
    cancel: function () {
        this.cancelled = true;
        this.service.cancel();
        delete this._requestCache[this._requestId];
    },

    _onComplete: function (result) {
        this.completed = true;
        delete this._requestCache[this._requestId];

        if (!this.cancelled && this.clientCallback) {
            this.clientCallback(JSON.parse(result));
        }
    },

    _requestCache: {},
    _requestGlobals: {value: 0}
};


/*
 Utility function to extend an object with listener/broadcaster functionality.
 It adds three methods to the given object:
 addListener(func) -- adds the given function to the list of listeners.
 removeListener(func) -- removes the given function from the list of listeners.
 _dbgGetListeners(func) -- Returns the listeners array.  For debugging purposes only, don't be naughty.
 broadcast(...) -- Calls all listener functions with the given arguments.
 */
EmailApp.Util.mixInBroadcaster = function (obj, description) {
    var listeners = [];
    var name = description;

    if (obj.addListener || obj.removeListener || obj.broadcast || obj._dbgGetListeners) {
        throw new Exception("mixInBroadcaster: obj already has these methods defined!");
    }

    obj.addListener = function (callback) {
        if (callback) {
            listeners.push(callback);
        }
    };

    obj.removeListener = function (callback) {
        var i = listeners.indexOf(callback);
        if (i !== -1) {
            listeners.splice(i, 1);
        } else {
            // NOTE: this seems to be happening due to destroy() getting called twice on some controls, see DFISH-6711
            console.log("removeListener: Cannot find callback to remove for " + description + " " + EmailApp.Util.getStackTrace());
        }
    };

    obj._dbgGetListeners = function () {
        return listeners;
    };

    obj.broadcast = function () {
        // Call all listeners with whatever arguments we were passed.
        var argsArray = Array.prototype.slice.call(arguments, 0);
        listeners.forEach(function (lis) {
            lis.apply(undefined, argsArray);
        });
    };

    return obj;
};


// Reimplementation of Prototype's interpolate(), since it's easier to read than instantiating templates directly.
EmailApp.Util.interpolate = function (str, model) {
    return new enyo.g11n.Template(str).evaluate(model);
};

/******************************************************************************
 Given a mojodb query and a callback, the callback will be called with the results, and then called again whenever the results change.
 Only handles 1 page of results, so don't use if >500 results are expected.

 Operates in a couple of modes...
 if watchFirst is true:
 then a watch is performed and we wait for it to fire before doing the 'find' and calling onChange() with the results.
 There is no watch on the 'find'... instead, the watch is then renewed when updateWatch() is called.
 This is handy for doing things like watching for _rev > N, and then updating the watch to a larger N when we get some results.
 otherwise:
 A find is performed immediately, with a watch.
 The specified callback is called with results.
 Whenever the watch fires, we redo the 'find' and again pass the results to onChange.
 ******************************************************************************/

//TODO: it would be cleaner if watchFirst, useTempDb, and count were part of a options/params object
EmailApp.Util.MojoDBAutoFinder = function (query, onChange, watchFirst, useTempDb, count) {
    this.dbUri = !!useTempDb ? "palm://com.palm.tempdb/" : "palm://com.palm.db/";
    this.findUri = this.dbUri + 'find';
    this.watchUri = this.dbUri + 'watch';
    this._handleResult = this._handleResult.bind(this);
    this._fail = this._fail.bind(this);

    //TODO: Make this work with the central callback
    this._params = {
        parameters: {query: query, watch: !watchFirst},
        onSuccess: this._handleResult,
        onFailure: this._fail
    };

    if (count) {
        this._params.parameters.count = true;
    }

    this._onChange = onChange;

    // Wait for a watch to fire before making our first query?
    if (watchFirst) {
        this._watch();
    } else {
        this._find();
    }
};

EmailApp.Util.callbackRouter = function (onSuccess, onFailure, resp) {
    if (resp.errorCode || resp.returnValue === false) {
        if (onFailure) {
            onFailure(resp);
        }
    } else {
        if (onSuccess) {
            onSuccess(resp);
        }
    }
};

EmailApp.Util.clone = function (obj) {
    var clone = EmailApp.Util.clone;
    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) {
        return obj;
    }

    // Handle Date
    if (obj instanceof Date) {
        var copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    // Handle Array
    if (obj instanceof Array) {
        var copy = [];
        for (var i = 0, len = obj.length; i < len; ++i) {
            copy[i] = clone(obj[i]);
        }
        return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
        var copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) {
                copy[attr] = clone(obj[attr]);
            }
        }
        return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
};


EmailApp.Util.MojoDBAutoFinder.prototype.callbackRouter = EmailApp.Util.callbackRouter;

EmailApp.Util.MojoDBAutoFinder.prototype._watch = function () {
    this.cancel();
    // a watch call cannot have the watch property. remove it, and hook it back up after
    // making the request
    var params = this._params.parameters;
    var watchFlag = params.watch;
    params.watch = undefined;

    this._request = EmailApp.Util.callService(this.watchUri, params, this.callbackRouter.bind(this, this._params.onSuccess, this._params.onFailure));
    params.watch = watchFlag;
    //this.log("_watch token: " + this._request.service.token + " params: " + JSON.stringify(this._params.parameters));

};

EmailApp.Util.MojoDBAutoFinder.prototype._find = function () {
    this.cancel();
    var params = this._params;
    this._request = EmailApp.Util.callService(this.findUri, params.parameters, this.callbackRouter.bind(this, params.onSuccess, params.onFailure));
    //this.log("_find token: " + this._request.service.token + " params: ", JSON.stringify(this._params.parameters));
};

// Success method used for watches & finds.
// Automatically does a find when a watch fires, and calls onChange() if we got query results from a find.
EmailApp.Util.MojoDBAutoFinder.prototype._handleResult = function (reply) {

    //this.log("_handleResult: " + JSON.stringify(reply));

    // When mojodb watch fires, make a new request so we can pass updated results.
    if (reply.fired) {
        this._find();
    } else if (reply.results) {
        this._onChange(reply.results, reply.count);
    } else {
        // probably {returnValue:true}, indicating a successful (but not yet fired) watch method call. Ignore it.
    }
};

EmailApp.Util.MojoDBAutoFinder.prototype._fail = function (reply) {
    console.log("MojoDBAutoFinder: request failed: " + reply.errorText);
    console.log("MojoDBAutoFinder:      params were: " + JSON.stringify(this._params));

    // If mojodb crashed, wait a bit and retry as if a watch fired.
    if (reply.errorText === "com.palm.db is not running.") {
        setTimeout(this._find.bind(this), 30000);
    }
};


EmailApp.Util.MojoDBAutoFinder.prototype.cancel = function (reply) {
    this.log("Cancelling.");
    if (this._request) {
        this._request.cancel();
    }
};

// Updates query arguments, and renews the mojodb watch.  Intended to be used with watchFirst:true, from within the onChange() function.
EmailApp.Util.MojoDBAutoFinder.prototype.updateWatch = function (query) {
    if (query) {
        this._params.parameters.query = query;
    }
    this._watch();
};

EmailApp.Util.MojoDBAutoFinder.prototype.log = function () {
    var a;
    if (this.loggingEnabled) {
        a = Array.prototype.slice.call(arguments);
        a[0] = "AutoFinder: " + a[0];
        console.log(a.join(", "));
    }
};

/*
 Applies a mapping function to all objects matching the given mojodb query.
 mapFunc will be called with each object in turn.
 Add a limit to the query if it's necessary to process <500 at a time.
 Invokes onComplete after mapFunc has been called with the last object.
 */
EmailApp.Util.dbMap = function (query, mapFunc, onComplete) {
    EmailApp.Util.callService('palm://com.palm.db/find', {query: query}, function (resp) {
        var prop;
        for (prop in resp) {
            if (resp.hasOwnProperty(prop)) {
                console.log("Keys: " + prop + ":==> " + resp[prop]);
            }
        }
        var next = resp.results.next;

        resp.results.map(mapFunc);

        if (next) {
            query.page = next;
            EmailApp.Util.dbMap(query, mapFunc, onComplete);
        } else if (onComplete) {
            onComplete();
        }
    });
};

/**
 * Function to strip scripts and html tags from a display string
 * Good for usernames, subjects, senders, etc.
 * @param {Object} str
 */
EmailApp.Util.cleanString = function (str) {
    return str.replace(/<\/?[^>]+>/gi, '');
};


/******************************************************************************
 Loads and manages changes to a prefs object, stored in MojoDB.
 External changes are currently NOT watched for -- we assume only the app will be mucking with its preferences.

 Pass the mojodb kind and an object containing default values to the constructor.
 The prefs object will be added to the database if missing, and loaded & used otherwise.
 It is assumed to be a singleton if it exists.

 The object's "ready" property will be true once initialization is complete, and prefs have been loaded.

 ******************************************************************************/
EmailApp.Util.MojoDBPrefs = function (kind, defaults, onReady) {

    this.ready = false; // set to true after we've loaded our prefs object.
    this._kind = kind;
    this._defaults = defaults;
    this._onReady = onReady;
    this._handleResult = this._handleResult.bind(this);

    EmailApp.Util.mixInBroadcaster(this, "EmailApp.Util.MojoDBPrefs");

    this._doQuery();

    // On desktop, call through immediately.
    if (!EmailApp.Util.hasServiceCallbacks()) {
        window.setTimeout(onReady, 0);
    }

};


EmailApp.Util.MojoDBPrefs.prototype._doQuery = function () {
    this._query = EmailApp.Util.callService('palm://com.palm.db/find', {query: {from: this._kind, limit: 10}}, this._handleResult.bind(this));
};

EmailApp.Util.MojoDBPrefs.prototype._handleResult = function (resp) {
    var len = resp.results.length;
    var def;
    var shallowCopy;

    if (len > 1) {
        console.log("MojoDBPrefs: Expected singleton object for %s, but received >1 result.", this._kind);
        this._reducePrefsRecords(resp.results);
        this._doQuery();

        return;
    } else if (len === 0) {
        console.log("MojoDBPrefs: No prefs found, creating " + this._kind);

        // No prefs object exists, put one in the db, and read it back so we get a deep clone.
        shallowCopy = {};
        for (def in this._defaults) {
            if (this._defaults.hasOwnProperty(def)) {
                shallowCopy[def] = this._defaults[def];
            }
        }
        shallowCopy._kind = this._kind;
        EmailApp.Util.callService('palm://com.palm.db/put', {objects: [shallowCopy]}, undefined); // making explicit
        this._doQuery();

        return;
    }

    // else save the prefs object, and set our ready flag.

    this._prefs = resp.results[0];
    this.ready = true;
    this._query = undefined;
    console.log("MojoDBPrefs: Prefs loaded for " + this._kind);

    if (this._onReady) {
        this._onReady();
        this._onReady = undefined;
    }

    return;
};

/*
 This function handles the case of multiple prefs records that exist in MojoDB.
 If all the prefs records represents default prefs record, we will keep the
 first default prefs record.  If there a mix of default prefs records and
 non-default prefs records, only the latest non-default prefs record will be
 kept.
 */
EmailApp.Util.MojoDBPrefs.prototype._reducePrefsRecords = function (results) {
    var idsToDel = this._getPrefsIDsToDelete(results);
    EmailApp.Util.callService('palm://com.palm.db/del', {ids: idsToDel});
};

/*
 Finds the list of IDs from email prefs records that should be deleted from
 MojoDB.
 */
EmailApp.Util.MojoDBPrefs.prototype._getPrefsIDsToDelete = function (results) {
    var recToKeep = this._getRecToKeep(results);
    var idToKeep = recToKeep ? recToKeep.id : results[0]._id;
    console.log("Prefs ID to keep: " + idToKeep);

    // find all the ids of prefs records whose revision is not the same as the
    // max revision.
    var ids = [];
    results.forEach(function (result) {
        if (result._id !== idToKeep) {
            console.log("Prefs record that should be deleted: " + JSON.stringify(result));
            ids.push(result._id);
        }
    });

    return ids;
};

/*
 Finds the id and revision pair for the prefs record that should be kept.
 */
EmailApp.Util.MojoDBPrefs.prototype._getRecToKeep = function (results) {
    console.log("crit " + Object.keys(results));
    return results.reduce.call(this, this._maxRevIdFinder, undefined);
};

/*
 Finds the id and revision of the record that is not a default prefs record
 that has the larger revision.
 */
EmailApp.Util.MojoDBPrefs.prototype._maxRevIdFinder = function (maxRevRec, curr) {
    console.log("maxRevRec: " + JSON.stringify(maxRevRec));
    if (!this._isDefaults(curr)) {
        if (!maxRevRec) {
            maxRevRec = {
                rev: curr._rev,
                id: curr._id
            };
            console.log("First prefs to keep: " + JSON.stringify(curr));
        } else if (curr._rev > maxRevRec.rev) {
            maxRevRec.rev = curr._rev;
            maxRevRec.id = curr._id;
            console.log("Latest prefs to keep: " + JSON.stringify(curr));
        }
    }

    return maxRevRec;
};

/*
 Returns true if the given result has the same set of values as the email app
 defauls.
 */
EmailApp.Util.MojoDBPrefs.prototype._isDefaults = function (result) {
    var defaults = this._defaults;
    return defaults.showAllInboxes === result.showAllInboxes &&
        defaults.showAllFlagged === result.showAllFlagged &&
        defaults.confirmDeleteOnSwipe === result.confirmDeleteOnSwipe &&
        defaults.defaultAccountId === result.defaultAccountId &&
        !result.syntheticFolderData[Folder.kAllFlaggedFolderID] &&
        !result.syntheticFolderData[Folder.kAllInboxesFolderID];
};

/*
 Get a named prefs value.
 Dot notation is supported for getting deep properties within a prefs object.
 Property names with dots in them are NOT supported.
 */
EmailApp.Util.MojoDBPrefs.prototype.get = function (propName) {
    var result = this._prefs;
    var props;

    if (!this.ready) {
        console.log("MojoDBPrefs: Access to pref " + propName + " before prefs object is ready. Using default.");
        result = this._defaults;
    }

    props = propName.split('.');
    while (result && props.length > 0) {
        result = result[props.shift()];
    }

    if (props.length > 0) {
        // We couldn't follow the whole trail of property names.
        // console.log("MojoDBPrefs: Invalid attempt to access pref at " + propName);
    }

    return result;
};

/*
 Set a named prefs value.  Modifies the local object, and writes to mojodb.
 Don't try to set a nested property in an array using dot notation, it might not go well.
 Property names with dots in them are NOT supported.
 */

EmailApp.Util.MojoDBPrefs.prototype.set = function (propName, value) {
    var prefs = this._prefs;
    var mergeObj, objToSet;
    var props, curProp;

    if (!this.ready) {
        console.log("MojoDBPrefs: Attempt to set pref " + propName + " before prefs object is ready. Ignoring.");
        return;
    }

    mergeObj = objToSet = {_id: this._prefs._id};

    props = propName.split('.');

    // Traverse the property path in the prefs object, while also building up an object chain for the mojodb merge.
    // Since we just build this with objects, it's probably not a good idea to try to set a value in an array using the dot notation.
    while (objToSet && props.length > 1) {

        curProp = props.shift();

        // Add intermediary objects if needed.
        if (!prefs[curProp]) {
            prefs[curProp] = {};
        }
        prefs = prefs[curProp];

        objToSet[curProp] = {};
        objToSet = objToSet[curProp];
    }

    curProp = props.shift();
    prefs[curProp] = value;
    objToSet[curProp] = value;

    EmailApp.Util.callService('palm://com.palm.db/merge', {objects: [mergeObj]}, undefined);

    this.broadcast(propName, value);

    return;
};

/******************************************************************************
 Loads and manages changes to a prefs object, stored in an enyo cookie.

 Pass the cookie name and an object containing default values to the constructor.
 The prefs cookie will be created if needed, and loaded & used otherwise.

 The object's "ready" property will be true once initialization is complete, and prefs have been loaded.

 ******************************************************************************/
EmailApp.Util.CookiePrefs = function (cookieName, defaults) {

    this._cookieName = cookieName;
    this._defaults = defaults;

    EmailApp.Util.mixInBroadcaster(this, "EmailApp.Util.CookiePrefs");

    var cookieStr = enyo.getCookie(this._cookieName);
    if (cookieStr) {
        this._prefs = JSON.parse(cookieStr);
    } else {
        //else we don't have a pre-existing cookie, so use the defaults and store them away for the future
        this._prefs = this._defaults;
        enyo.setCookie(this._cookieName, JSON.stringify(this._defaults));
    }
};

/*
 Get a named prefs value.
 Dot notation is supported for getting deep properties within a prefs object.
 Property names with dots in them are NOT supported.
 */
EmailApp.Util.CookiePrefs.prototype.get = function (propName) {
    var result = this._prefs;
    var props;

    props = propName.split('.');
    while (result && props.length > 0) {
        result = result[props.shift()];
    }

    if (props.length > 0) {
        // We couldn't follow the whole trail of property names.
        console.error("CookiePrefs: Invalid attempt to access pref at " + propName);
    }

    return result;
};

/*
 Set a named prefs value.  Modifies the local object, and writes to the underlying cookie.
 Don't try to set a nested property in an array using dot notation, it might not go well.
 Property names with dots in them are NOT supported.
 */

EmailApp.Util.CookiePrefs.prototype.set = function (propName, value) {
    var prefsPtr = this._prefs;
    var props = propName.split('.');
    var curProp;

    // Traverse the property path in the prefs object, adding any required intermediate objects.
    // Since we just build this with objects, it's probably not a good idea to try to set a value in an array using the dot notation.
    while (prefsPtr && props.length > 1) {
        curProp = props.shift();

        // Add intermediary objects if needed.
        if (!prefsPtr[curProp]) {
            prefsPtr[curProp] = {};
        }
        prefsPtr = prefsPtr[curProp];
    }

    curProp = props.shift();
    prefsPtr[curProp] = value;

    enyo.setCookie(this._cookieName, JSON.stringify(this._prefs));

    this.broadcast(propName, value);
};

/**
 * Function to pretty print an object with a label.
 * Allows deeper insight into an object than Mojo.Log.__("%j", foo);
 * @param {Object} title
 * @param {Object} obj
 */
EmailApp.Util.printObj = function (title, obj) {
    var key;
    if (title) {
        console.log(title);
    }

    if (!obj) {
        return;
    }

    for (key in obj) {
        try {
            if (obj.hasOwnProperty(key)) {
                console.log(" ### " + key + " ==> " + JSON.stringify(obj[key]));
            }
        } catch (e) {
            // circular structure. Just print this out as a string
            console.log(" ### " + key + " ==> " + obj[key]);
        }
    }
};


/**
 Class to manage a queue of objects which may need to be dealt with after some timeout.
 Email uses this to make sure the initialRev property is set on new emails, if the body hasn't been downloaded after a minute or so.

 options: {
 timeout: Required. Duration in seconds of the timeout.  Objects will actually be timed out somewhere between N and 2*N seconds.
 onTimeout: Required. Function to be called on each object as it times out.
 uniquenessProperty: Optional property name to use to identify objects.  Defaults to "_id".
 onComplete: Optional. Function called after a batch of objects have been timed out.
 }

 Methods:
 add(obj) - Adds an object to the timeout queue.  The onTimeout function will be called with this object in [N,2*N] seconds, if it is not removed.
 Adding an object already in the queue has no affect.
 remove(obj) - Removes the given object from the timeout queue, matching by uniqueness property rather than using object identity.

 */
EmailApp.Util.TimeoutQueue = function (options) {
    this.uniquenessProperty = options.uniquenessProperty || "_id";
    this.timeout = options.timeout;
    this._onTimeout = options.onTimeout;
    this._onComplete = options.onComplete;

    this._inputGroup = {}; // Collection to hold incoming objects, becomes the new waiting group after timeout seconds.
    this._waitingGroup = {}; // Collection waiting to be timed out after timeout seconds.

    this._handleTimeout = this._handleTimeout.bind(this);
};

EmailApp.Util.TimeoutQueue.prototype.add = function (obj) {
    var prop = obj[this.uniquenessProperty];

    // If object is not in either group already,
    if (this._inputGroup[prop] === undefined && this._waitingGroup[prop] === undefined) {
        this._inputGroup[prop] = obj;
    }

    this._checkTimeouts();
};

EmailApp.Util.TimeoutQueue.prototype.remove = function (obj) {
    var prop = obj[this.uniquenessProperty];
    delete this._inputGroup[prop];
    delete this._waitingGroup[prop];

    this._checkTimeouts();
};

// Examines whether or not we currently have a timeout set, and sets/clears it appropriately.
EmailApp.Util.TimeoutQueue.prototype._checkTimeouts = function () {

    if (this._timeoutId) {
        if (this._isEmpty(this._inputGroup) && this._isEmpty(this._waitingGroup)) {
            window.clearTimeout(this._timeoutId);
        }
    } else if (!this._isEmpty(this._inputGroup) || !this._isEmpty(this._waitingGroup)) {
        this._timeoutId = window.setTimeout(this._handleTimeout, this.timeout * 1000);
    }

};


EmailApp.Util.TimeoutQueue.prototype._isEmpty = function (obj) {
    var prop;
    if (obj) {
        for (prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                return false;
            }
        }
    }
    return true;
};

// Timeout happened -- process any remaining objs in the waiting group, and swap with the input group.
EmailApp.Util.TimeoutQueue.prototype._handleTimeout = function () {
    var prop, waitGroup, obj, count;

    this._timeoutId = undefined;

    // Process any objs remaining in the waiting group by calling onTimeout on each of them in turn.
    count = 0;
    waitGroup = this._waitingGroup;
    for (prop in waitGroup) {
        if (waitGroup.hasOwnProperty(prop)) {
            obj = waitGroup[prop];
            if (obj) {
                this._onTimeout(obj);
                count++;
            }
        }
    }

    // Call the timeoutComplete function if there is one.
    if (count > 0 && this._onComplete) {
        this._onComplete();
    }

    // Move the current inputGroup to the waiting stage, and make a new inputGroup.
    this._waitingGroup = this._inputGroup;
    this._inputGroup = {};

    // Set up next timeout, if needed.
    this._checkTimeouts();
};


EmailApp.Util.PerfLogger = function (label) {
    this._reset();
    if (label) {
        this.log(label);
    }
};

EmailApp.Util.PerfLogger.prototype._reset = function () {
    this._timestamps = [];
    this._labels = [];
};

EmailApp.Util.PerfLogger.prototype.log = function (label) {
    this._timestamps.push(Date.now());
    this._labels.push(label || "");
};

EmailApp.Util.PerfLogger.prototype.dump = function (prefix) {
    var i;
    var ts = this._timestamps;
    var tsLen = ts.length;
    var labels = this._labels;
    var prevTS, deltaStr;

    prefix = prefix || "";
    deltaStr = "";

    for (i = 0; i < tsLen; i++) {
        if (prevTS) {
            deltaStr = "  (" + (ts[i] - prevTS) + ")  ";
        } else {
            deltaStr = "  ";
        }

        console.error(prefix + " " + ts[i] + deltaStr + labels[i]);
        prevTS = ts[i];
    }

    console.error(prefix + " total: " + (ts[ts.length - 1] - ts[0]) + " ms");

    this._reset();
};


// returns true if the given timestamp is today sometime.
EmailApp.Util.isToday = function (timestamp) {
    var lastMidnight = new Date();
    lastMidnight.setHours(0);
    lastMidnight.setMinutes(0);
    lastMidnight.setSeconds(0);
    var todayStart = lastMidnight.getTime();
    var tomorrowStart = todayStart + 86400000; // (1000 * 60 * 60 *24)
    return timestamp >= todayStart && timestamp < tomorrowStart;
};

EmailApp.Util.getExtension = function (str) {
    if (!str) {
        return undefined;
    }
    var extIdx = str.lastIndexOf('.');
    if (extIdx < 0) {
        return undefined;
    }
    return str.substring(extIdx + 1).toLowerCase();
};


// Does some smart substitution of mime types.
// Currently just tries to use the filename extension to switch to a more specific mime type when we get text/plain,
// or application/octet-stream.
EmailApp.Util.finagleMimeType = function (filepath, originalMimetype) {
    var extension, newType;
    var mimetype = originalMimetype;

    // octet-stream is mostly useless, treat it as undefined.
    if (mimetype === 'application/octet-stream') {
        mimetype = undefined;
    }

    // For text/plain types, we use the filename extension to try to find a more specific text type.
    // If mimetype is undefined, we'll use whatever we can find from the extension.
    if (mimetype === undefined || mimetype === "text/plain") {
        extension = EmailApp.Util.getExtension(filepath);
        if (extension) {
            newType = EmailApp.Util.mimeTypeTable['.' + extension];
            if (newType && (mimetype === undefined || newType.indexOf("text/") === 0)) {
                mimetype = newType;
            }
        }
    }

    return mimetype || originalMimetype;
};


EmailApp.Util.mimeTypeTable = {
    '.aif': 'audio/aiff',
    '.aifc': 'audio/aiff',
    '.aiff': 'audio/aiff',
    '.art': 'image/x-jg',
    '.asf': 'video/x-ms-asf',
    '.au': 'audio/basic',
    '.avi': 'video/avi',
    '.avs': 'video/avs-video',
    '.bin': 'application/octet-stream',
    '.bm': 'image/bmp',
    '.bmp': 'image/bmp',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.dot': 'application/msword',
    '.dv': 'video/x-dv',
    '.dvi': 'application/x-dvi',
    '.exe': 'application/octet-stream',
    '.gif': 'image/gif',
    '.gl': 'video/gl',
    '.gz': 'application/x-compressed',
    '.htm': 'text/html',
    '.html': 'text/html',
    '.ico': 'image/x-icon',
    '.jam': 'audio/x-jam',
    '.jfif': 'image/jpeg',
    '.jfif-tbnl': 'image/jpeg',
    '.jpe': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.kar': 'audio/midi',
    '.la': 'audio/nspaudio',
    '.log': 'text/plain',
    '.m1v': 'video/mpeg',
    '.m2a': 'audio/mpeg',
    '.m2v': 'video/mpeg',
    '.mid': 'audio/midi',
    '.midi': 'audio/midi',
    '.mjpg': 'video/x-motion-jpeg',
    '.mov': 'video/quicktime',
    '.movie': 'video/x-sgi-movie',
    '.mp2': 'audio/mpeg',
    '.mp3': 'audio/mpeg3',
    '.mpa': 'video/mpeg',
    '.mpe': 'video/mpeg',
    '.mpeg': 'video/mpeg',
    '.mpg': 'video/mpeg',
    '.mpga': 'audio/mpeg',
    '.mpp': 'application/vnd.ms-project',
    '.mv': 'video/x-sgi-movie',
    '.pct': 'image/x-pict',
    '.pcx': 'image/x-pcx',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.pot': 'application/vnd.ms-powerpoint',
    '.ppa': 'application/vnd.ms-powerpoint',
    '.pps': 'application/vnd.ms-powerpoint',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.ppz': 'application/mspowerpoint',
    '.pwz': 'application/vnd.ms-powerpoint',
    '.rmi': 'audio/mid',
    '.rpm': 'audio/x-pn-realaudio-plugin',
    '.snd': 'audio/basic',
    '.text': 'text/plain',
    //'.tif':	'image/tiff',
    //'.tiff':	'image/tiff',
    '.txt': 'text/plain',
    '.uu': 'text/x-uuencode',
    '.uue': 'text/x-uuencode',
    '.vcf': 'text/x-vcard',
    '.vcs': 'text/x-vcalendar',
    '.vdo': 'video/vdo',
    '.viv': 'video/vivo',
    '.vivo': 'video/vivo',
    '.w6w': 'application/msword',
    '.wav': 'audio/wav',
    '.wiz': 'application/msword',
    '.word': 'application/msword',
    '.xlb': 'application/vnd.ms-excel',
    '.xlc': 'application/vnd.ms-excel',
    '.xll': 'application/vnd.ms-excel',
    '.xlm': 'application/vnd.ms-excel',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xlw': 'application/vnd.ms-excel',
    '.xm': 'audio/xm',
    '.xml': 'text/xml',
    '.xmz': 'xgl/movie',
//		'.xpm':	'image/x-xpixmap',
    '.xpm': 'image/xpm',
    '.x-png': 'image/png',
    '.zip': 'application/zip'
};
//application/x-binary

// Returns the stacktrace of the current execution stack, for debugging
EmailApp.Util.getStackTrace = function (limit) {
    var stack = "";

    try {

        if (Error.captureStackTrace) {
            var e = {};

            var oldLimit = Error.stackTraceLimit;
            if (limit) {
                Error.stackTraceLimit = limit;
            }

            Error.captureStackTrace(e);

            Error.stackTraceLimit = oldLimit;

            stack = e.stack || e.toString();
        } else {
            try {
                throw Error();
            } catch (e) {
                stack = e.stack || e.toString();
            }
        }

        // Strip out the first line
        var index = stack.indexOf("getStackTrace");
        if (index >= 0) {
            stack = stack.substr(stack.indexOf('\n', index));
        }
    } catch (err) {
        console.log("error collecting stack trace: " + err);
    }

    return stack;
};

/**
 * Checks two lists side by side. If the list only has changes, and no additions/deletions
 * or changes in ordering, then return the indexes (offsets from the beginning of the list)
 * of the changed items.
 *
 * If the list has new or deleted items, or items have been re-ordered, return true instead.
 *
 * If there's no changes at all, return false;
 *
 * @param listA
 * @param listB
 * @param key        property name of unique id (usually _id)
 * @param props        property names to examine for differences between records
 */
EmailApp.Util.checkListItemUpdates = function (listA, listB, key, props) {
    var updates = [];

    if (!listA || !listB || listA.length != listB.length) {
        return true;
    }

    for (var i = 0; i < listA.length; i++) {
        var itemA = listA[i], itemB = listB[i];

        // Check if the key (usually _id) is the same
        if (itemA[key] !== itemB[key]) {
            return true;
        }

        // Check if the specified properties are the same on both items
        if (props && props.length > 0) {
            for (var j = 0; j < props.length; j++) {
                var prop = props[j];

                if (itemA[prop] !== itemB[prop]) {
                    updates.push(i);
                    break; // break out of item comparison
                }
            }
        }
    }

    if (updates.length === 0) {
        return false;
    } else {
        return updates;
    }
};
