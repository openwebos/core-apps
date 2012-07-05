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

/** Provides various mocking services to replace service calls to the database. Here's an outline:
 * responder - A replacement for EmailApp.Util.callService().
 * serviceResponder - A enyo.application.dbServiceHook, which uses the responder to mock enyo.application.mailApp.$.mail.$.emailFind.
 * mockServices - A thunk that can be used in a beforeEach to set up the above mocking.
 */

/** FIXME: I don't think I'm dealing with _id properly. PutResponse is supposed to have id, not _id, as well as rev (not _rev).
 */

/** A fake in-memory db. Work in progress...
 */
var db = {
    "com.palm.app.email.prefs:1": {current: [
        {
            _id: 'someFakePrefId',
            showAllInboxes: true,
            showAllFlagged: false,
            defaultAccountId: '',
            confirmDeleteOnSwipe: true,
            syntheticFolderData: {}
        }
    ]},
    "com.palm.app.email.carrier_defaults:1": {current: []},
    "com.palm.account:1": {current: [
        // There's some other data we could include here, and which we should eventually test for, including: .capabilityProviders, .loc_name, .icon, .icon.loc_48x48
        {_id: "fake-account-1", alias: "Palm", username: "fakeuser@fakedomain.com", templateId: "com.palm.imap", capabilityProviders: {capability: "MAIL"}},
        {_id: "fake-account-2", alias: "Palm 2", username: "otherfakeuser@fakedomain.com", templateId: "com.palm.imap", capabilityProviders: {capability: "MAIL"}}
    ]},
    "com.palm.mail.account:1": {current: [
        {accountId: "fake-account-1", inboxFolderId: "fake-account-1-fake-folder-id1", outboxFolderId: "fake-account-1-fake-folder-id2"},
        // "++HFcNuUiAGz9mIS"
        {accountId: "fake-account-2", inboxFolderId: "fake-account-2-fake-folder-id1", outboxFolderId: "fake-account-2-fake-folder-id2"}
    ]},
    "com.palm.folder:1": {current: [
        {_id: "fake-account-1-fake-folder-id1", displayName: "Inbox", accountId: "fake-account-1", favorite: true},
        {_id: "fake-account-1-fake-folder-id2", displayName: "Outbox", accountId: "fake-account-1", favorite: false},
        {_id: "fake-account-2-fake-folder-id1", displayName: "Inbox", accountId: "fake-account-2", favorite: true},
        {_id: "fake-account-2-fake-folder-id2", displayName: "Outbox", accountId: "fake-account-2", favorite: false}
    ]},
    "com.palm.email:1": {current: enyo.g11n.Utils.getJsonFile({path: "tests/mock", locale: "mailApp_mail_emailFind" }).results}
};

/** Objects can't be used as property keys. They are just converted to a string, but "[object Object]" isn't very helpful as a key.
 Simply json.stringify'ing them isn't good either, as the stringify does not put the object properties into any canonical order.
 So, this function does sort them, and so the result can then be stringified to use as a key.
 We don't stringify along the way because that becomes too hard to read for nested objects.
 */
function sortedObj(obj) {
    if (typeof obj !== "object") {
        return obj;
    }
    var canonical = [];
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            canonical.push([key, sortedObj(obj[key])]);
        } // Note recursive.
    }
    canonical.sort(function (x, y) { //x and y are each [key, val] pairs, so x[0] and y[0] are both keys.
        var a = x[0], b = y[0];
        if (a === b) {
            return 0;
        }
        return (a < b) ? -1 : 1;
    });
    // It would be a bit cheaper to just stringify canonical here, but that would be harder to debug. Let's make it look like the input.
    obj = {};
    for (var i in canonical) {
        var pair = canonical[i];
        obj[pair[0]] = pair[1];
    }
    return obj;
}

/** Answer just the subset of results that match query.
 results argument must already contain just the kinds specified by query.from.
 For each returned object, we just return all properties. (This mock db does not trim using query.select.)
 FIXME: where.collate is currently ignored.
 FIXME: page is currently ignored.
 */
function dbQuery(query, results) {
    if (query.page) {
        enyo.error("Mock db does not yet support query.page in " + enyo.json.stringify(query));
    }
    if (query.where) {
        results = results.filter(function (elt) {
            return query.where.some(function (where) {
                var l = elt;
                var props = where.prop.split(".");
                for (var propKey in props) {
                    var prop = props[propKey];
                    if (!l) {
                        enyo.error("No " + where.prop + " in " + enyo.json.stringify(elt) + " for " + enyo.json.stringify(query));
                    }
                    l = l[prop];
                }
                var r = where.val;
                switch (where.op) { // BUG? If val:99, op:"<=", prop:"foo" order is allowed, we're not following sense of op properly here.
                case "<":
                    return l < r;
                case "<=":
                    return l <= r;
                case ">=":
                    return l >= r;
                case ">":
                    return l > r;
                case "=":
                    return l === r;
                case "!=":
                    return l !== r;
                case "?":
                    return (new RegExp(r)).test(l);
                case "%":
                    return (new RegExp("^" + r)).test(l);
                }
                return true;
            });
        });
    }
    if (!query.incDel) {
        results = results.filter(function (elt) {
            return !elt._del;
        });
    }
    if (query.limit) {
        results = results.slice(0, query.limit);
    }
    if (query.orderBy) {
        results = results.sort(function (a, b) {
            return (a === b) ? 0 : ((a < b) ? -1 : 1);
        });
        if (query.desc) {
            results = results.reverse();
        }
    }
    return results;
}

var cmStatCallback = {};

/* Temp notes on callbacks:
 notification response is just {returnValue: true, fired: true}
 */


/** A fake service bus. Work in progress...
 A service here is a function(optionalArgsObj) returning {
 returnValue: boolean, // if true, hand the WHOLE object to a callback (e.g., {returnValue: true, results: [], otherStuffIgnoredByCallback})
 <serviceResultKey>: <serviceValue>, // the service result that the callback will consume. Most are results: array (but e.g., batch is responses: array!)
 optionalMockDb: obj // a dbObject that can be side-effected to store current value, watchers, etc.
 }
 */
function dbFind(argsObj) {
    var query = argsObj.query;
    var from = query && query.from;
    var data = db[from];
    var details = " " + from;
    if (data === undefined) {
        return data;
    }
    if (argsObj.count) {
        enyo.error("mockDb does not yet support find count");
    }
    return {returnValue: true, results: dbQuery(query, data.current), details: details, mockDb: data};
}
function dbGet(argsObj) {
    var results, data;
    if (argsObj.query && argsObj.query.kind) {
        results = dbFind(argsObj);
        if (results) {
            results.results = results.results.filter(function (elt) {
                return argsObj.ids.some(function (id) {
                    return id === elt._id;
                });
            });
        }
    } else {  // If we don't know the kind, then we have to search the whole db for the kind that has those ids.
        var filter = function (elt) {
            return argsObj.ids.some(function (id) {
                return id === elt._id;
            });
        };
        for (var kind in db) {
            if (db.hasOwnProperty(kind)) {
                data = db[kind];
                results = data.current.filter(filter);
                if (results.length > 0) {
                    break;
                }  // We're assuming that all ids are of the same kind.
            }
        }
        results = {returnValue: true, results: results, db: data};
    }
    if (results === undefined || !results.returnValue) {
        return results;
    }
    if (argsObj.ids.some(function (id) {
        return !results.results.some(function (elt) {
            return id === elt._id;
        });
    })) {
        var errText = "Unable to find all of " + argsObj.ids;
        enyo.error(errText);
        return {returnValue: false, errorText: errText};
    }
    return results;
}
function dbWatch(argsObj) {
    var query = argsObj.query;
    var from = query && query.from;
    var data = db[from];
    var details = " " + enyo.json.stringify(query);
    if (data === undefined) {
        return data;
    }
    // Responder uses truthy watch to store callbacks. We side effect the argsObj as though we were a find with this true.
    argsObj.watch = true;
    // returnValue: false so responder does not do any callback now, but does register for notification on change.
    return {returnValue: false, details: details, mockDb: data};
}
/** Expects watchers[key].query, watchers[key].label and watchers[key].thunk to be defined.
 Calls thunk asynchronously of any for which query matches any results.results.
 */
function runSideEffects(argsObj, results) {
    var watchers = (results.mockDb && results.mockDb.watchers) || [];
    for (var watchKey in watchers) {
        if (watchers.hasOwnProperty(watchKey)) {
            var watchData = watchers[watchKey];
            if (dbQuery(watchData.query, results.results).length > 0) {
                enyo.warn("fire from" + results.details + " back to " + watchData.label);
                setTimeout(watchData.thunk, 0);
            }
        }
    }
    if (argsObj.query) {
        results.count = results.results.length;
    }
}
function dbPut(argsObj) {
    var query = argsObj.query;
    var added = argsObj.objects;
    var from = (query && query.from) || (!added.length && added[0]._kind);
    var results = db[from];
    var details = " " + enyo.json.stringify(argsObj);
    if (!added.length) {
        return {returnValue: true, results: []};
    }
    if (results === undefined) {
        return results;
    }
    // Safety check:
    added.forEach(function (obj) {
        if (obj._kind && (obj._kind !== from)) {
            var msg = "put kinds do not all match " + from + " in" + details;
            enyo.error(msg);
            return {returnValue: false, errorText: msg};
        }
    });
    results.current = added + results.current;
    results = {returnValue: true, results: added, details: details, mockDb: results};
    runSideEffects(argsObj, results);
    return results;
}
function dbMerge(argsObj) {
    if (argsObj.objects) {
        argsObj.ids = argsObj.objects.map(function (item) {
            return item._id;
        });
    } // create ids prop for get to use.
    var results = argsObj.query ? dbFind(argsObj) : dbGet(argsObj);
    results.results.forEach(function (elt) {
        var toAdd = argsObj.props;
        if (!toAdd) {  // Find the properties to add from item in argsObj.objects that matches our _id.
            for (var x in argsObj.objects) {
                if (argsObj.objects.hasOwnProperty(x)) {
                    var o = argsObj.objects[x];
                    if (o._id === elt._id) {
                        toAdd = o;
                        break;
                    }
                }
            }
        }
        for (var key in toAdd) {   // Add the properties.
            if (toAdd.hasOwnProperty(key)) {
                elt[key] = toAdd[key];
            }
        }
    });
    runSideEffects(argsObj, results);
    return results;
}
function dbDel(argsObj) {
    var results = argsObj.query ? dbFind(argsObj) : dbGet(argsObj);
    if (results === undefined) {
        return results;
    }
    if (argsObj.purge) {
        results.mockDb.current = results.mockDb.current.filter(function (dbItem) {
            return results.results.every(function (deletedItem) {
                return dbItem !== deletedItem;
            });
        });
    } else {
        results.mockDb.current.forEach(function (dbItem) {
            if (results.results.some(function (deletedItem) {
                return dbItem._id === deletedItem._id;
            })) {
                dbItem._del = true;
            }
        });
    }
    runSideEffects(argsObj, results);
    return results;
}
var services;
function dbBatch(argsObj) {
    // Assuming here that argsObj never has additional values that need to be merged with each op.parameters.
    var mock = {responses: argsObj.operations.map(function (op) {
        return services['palm://com.palm.db/' + op.method](op.params);
    })};
    mock.returnValue = mock.responses.every(function (response) {
        return response.returnValue;
    });
    return mock;
}
services = {
    'palm://com.palm.service.accounts/listAccountTemplates': function () {
        return {returnValue: true,
            results: enyo.g11n.Utils.getJsonFile({path: "tests/mock/accounts/com.palm.imap",
                locale: "com.palm.imap"
            })
        };
    },
    'palm://com.palm.connectionmanager/getStatus': function () {
        return {returnValue: true, results: [], mockDb: cmStatCallback};
    },
    'palm://com.palm.db/find': dbFind,
    'palm://com.palm.db/get': dbGet,
    'palm://com.palm.db/watch': dbWatch,
    'palm://com.palm.db/merge': dbMerge,
    'palm://com.palm.db/del': dbDel,
    'palm://com.palm.db/batch': dbBatch
};

/**
 EmailApp.Util.callService(url, argsObj, optionalCallback) is how MOST of the Palm services are called.
 It returns a requestObject (eg., defines cancel() and destroy()), and asynchronously fires optionalCallback with the jason data.
 This function is a drop-in replacement for that in which the callback (done with setTimeout()) is given different mock data depending on the request.
 It also logs some identifying data on both the callService call and on the callback (with an obvious correlation between both logging message).
 */
function responder(url, argsObj, callback) {
    var contextString = "", details = "";  // Both are for logging.
    try {
        throw new Error('');
    } catch (err) { // Just to get a stack trace.
        contextString = " in " + err.stack.split(' at ')[3].trim();
    }
    var mock;
    var requestObject = {cancel: function () {
    }, destroy: function () {
    }};
    var func = services[url];
    var results = func && func(argsObj);
    if (results !== undefined) {
        mock = results;
        if (results.details) {
            details += results.details;
        }
        if ((argsObj.subscribe || argsObj.watch) && results.mockDb) {
            if (!results.mockDb) {
                enyo.error(url + details + " should define a mockDb property.");
            }
            var watchers = results.mockDb.watchers || (results.mockDb.watchers = {}); // every mockDb should have a watcher. Make one if needed.
            var key = enyo.json.stringify(sortedObj(argsObj));  // each call's argsObj gets a different callback.
            var watcher = watchers[key];   // find the watcher pair [key, callbackDataObj] stored at
            var old = watcher && watcher.callback;
            if (old && (old !== callback)) {
                self.enyo.warn("changing callback of " + url + details + " from " + old + " to " + callback);
            }
            // Alas:
            // Watchers[key] is a string. Can't pull the original query out of that, so we must store it explicitly.
            // We're not supposed to create thunks on the fly when iterating later over watchers (in runSideEffects) -- jslint complains -- so create thunk now.
            results.mockDb.watchers[key] = {query: argsObj.query, callback: callback, label: url + details, thunk: function () {
                callback({returnValue: true, fired: true});
            }};
        }
        enyo.log("call " + url + details + contextString);
    } else {
        enyo.error("Unhandled " + url + " " + JSON.stringify(argsObj));
    }

    if (callback) {  // If there's a callback, call it asynchronously with the mock data.
        if (mock.returnValue || mock.errorText) { // e.g., not a db/watch
            var thunk = function () {
                enyo.log("  callback from " + url + details);
                callback(mock);
            };
            setTimeout(thunk, 0);
        }
    } else {
        enyo.warn("No callback for " + url + details);
    }
    return requestObject;
}

/**
 A testing value to be used as enyo.application.dbServiceHook (defined in utils.js, and used, e.g., by Mail.js).
 It is called with different parameters than above, so this function wraps things up as needed.
 */
function serviceResponder(service, serviceOwner) {
    serviceOwner = serviceOwner || service.owner;  // Default the optional serviceOwner arg, which is the enyo kind instance that has the callback.
    service.call = function (argsObj, params) {
        // The url of the service is produced from the service and the params argument.
        var serviceName = (params && params.service) || service.service;
        var serviceMethod = (params && params.method) || service.method || (params && params.name) || service.name;
        var url = serviceName + serviceMethod;
        params = params || service.params || {};
        argsObj.query = params.query || argsObj.query || {};
        argsObj.query.from = argsObj.query.from || service.dbKind || service.masterService.dbKind; // from dbKind or parent's, as is required in Mail listQuery.

        var successName = (params && params.onSuccess) || service.onSuccess; // The name of the onSuccess callback.
        var requestObj = // Note that requestObj is in-scope for the callback function we pass to responder.
            responder(url, argsObj,
                function (results) {
                    // This callback named by successName takes the service, result, and requestObj as args.
                    // The requestObj is used in various nefarious ways. Ugh. Nasty coupling.
                    requestObj = EmailApp.Util.clone(requestObj); // copy of object answered by responder.
                    requestObj.index = 0; // This and next are needed if service response invokes dbPages.queryResponse. Ugh.
                    requestObj.params = argsObj;
                    // Note that successName is actually defined in serviceOwner, not in service, and that we call it with this=serviceOwner.
                    serviceOwner[successName].call(serviceOwner, service, results, requestObj);
                });
        //enyo.log(url + " of " + JSON.stringify(argsObj) + " produced " + JSON.stringify(requestObj));
    };
}

/**
 Can be used in a beforeEach() to set up the above. Additionally:
 - Turns off the crummy when-in-browser guards in the app code itself which attempt to avoid the db calls we've just stubbed.
 - Provides a backstop to report any stubbed calls we've missed through the above mechanisms.
 - Turns off jasmine's waitFor() logging.
 */
function mockServices() {
    spyOn(EmailApp.Util, "callService").andCallFake(responder);
    enyo.application.dbServiceHook = serviceResponder;  // Not a spy. Ugh.
    // At this point, we've already loaded the app code, but as it runs (including setup code), we want it to through
    // the actual asynchronous service callbacks. See doc for hasServiceCallbacks in util.js
    spyOn(EmailApp.Util, "hasServiceCallbacks").andCallFake(function () {
        return true;
    });

    // During load, the service bridge call was set to a silent no-op (because we do not have a PalmSystem).
    // Here we redefine it something that noisily let's us know if there's something we failed to stub out.
    spyOn(window.PalmServiceBridge.prototype, "call").andCallFake(function (url, argsObj) {
        enyo.error("Unstubbed service call to " + url + " " + JSON.stringify(argsObj));
    });
    // We'd also like something like this, but it doesn't work.
    // spyOn(enyo.WebOsPalmServiceBridge.prototype, "call").andCallFake(function (url, argsObj) {
    // 	enyo.error("Unstubbed service call to " + url + " " + JSON.stringify(argsObj));
    // });

    // jasmine's usual waitFor is pretty noisy. This quiets it. Comment in or out as desired.
    spyOn(jasmine.getEnv().reporter, "log").andCallFake(function () {
    });
}