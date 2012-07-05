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

/*global Mojo, $L, Class, window, document, PalmSystem, AppAssistant, palmGetResource, Foundations, _,
 App, console, Throttler, $H, $A, Event, $break, Element,
 Poly9, MailtoURIParser,
 EmailFlags, EmailRecipient, EmailAppDepot, AccountpreferencesAssistant, Email, EmailAccount, EmailDecorator,
 ObjCache, NotificationAssistant, LaunchHandler, FirstUseLaunchHandler, FirstUseAssistant, AudioTag,
 Contact, ContactReminder, Attachments, MenuController, ErrorAnalyzer, Folder, FolderFlags, IMName, Message,
 ServiceStrings, ColorPickerDialogAssistant, SecuritypolicyAssistant, EmaillistDataSource, Pseudocard,
 CreateAssistant, ComposeAssistant, ConnectionWidget, EmailApp */


/*************************************************
 Monitors changes for all objects in a given kind, passing sets of changes to a processing function.
 We begin by processing all items currently in the database.

 options: {
 kind: String, required.  MojoDB kind to process.  An index on _rev (or the indicated revSet) must be available.
 revSet: String, optional.  The name of the revSet to use instead of the default _rev property.  Allows processing of changes to specific fields only.
 processChanges: Function, required.  Function to call with changed objects.  Receives a single argument: an array of changed objects.
 limit: Number, optional, <=500. Pass this many items at most to the processing function at one time. If unspecified, all changes are collected before processing.
 processDeletes: Function, optional.  Function to call with deleted objects.  If specified, an index which includes deleted objects must be available.
 select: Array, optional.  A select clause for the query, used to reduce overhead by not fetching all properties in the objects.  Must include _rev IN ADDITION TO any optional revSet and other properties desired.
 processingComplete: Function, optional.  Called each time a series of pending changes has finished being processed.
 }
 *************************************************/

EmailApp.MojoDBChangeProcessor = function (options) {

    this._kind = options.kind;
    this._revProp = options.revSet || "_rev";
    this._processChanges = options.processChanges;
    this._limit = options.limit;
    this._select = options.select;
    this._processDeletes = options.processDeletes;
    this._processingComplete = options.processingComplete;
    this._objectCount = 0;
    this._maxRev = -1;
    this._maxDelRev = -1;

    this._loadFailed = this._somethingFailed.bind(this, 'load');
    this._watchFailed = this._somethingFailed.bind(this, 'watch');

    this._watchFired = this._watchFired.bind(this);
    this._someLoaded = this._someLoaded.bind(this);
    this._loadComplete = this._loadComplete.bind(this);

    this.processAll = this.processAll.bind(this);

    this._revClause = {prop: this._revProp, op: ">", val: this._maxRev};

    this._queryParams = {
        select: this._select,
        from: this._kind,
        where: [this._revClause],
        orderBy: this._revProp,
//			incDel: this._incDel,
        limit: this._limit
    };

    // Build params for the 'batch' method call to find our items:
    this._batchParams = {operations: [
        {method: "find", params: { query: this._queryParams}}
    ]};


    // If we're processing deleted items too, then we need to add a batch query for deleted stuff too,
    // and modify the where clause of the regular query to exclude deleted items.
    if (this._processDeletes) {

        // Make sure we don't get deleted items in the query for regular items.
        this._queryParams.where.unshift({prop: "_del", op: "=", val: false});

        this._delRevClause = {prop: this._revProp, op: ">", val: this._maxDelRev};

        this._deleteQueryParams = {
            select: this._select,
            from: this._kind,
            where: [
                {prop: "_del", op: "=", val: true},
                this._delRevClause
            ],
            orderBy: this._revProp,
//			incDel: this._incDel,
            limit: this._limit
        };

        this._batchParams.operations.push({method: "find", params: { query: this._deleteQueryParams}});
    }


    // The kind processor maintains exactly one active request to mojodb at all times.
    // When there are changes to load, it's one of a possible chain of "find" requests to process the changes.
    // Otherwise, it's a "watch", waiting for more changes to process.
    this._request = undefined;

    this._loadedArrays = [];
    this._loadedDeletedArrays = [];

    this.processAll();

};

EmailApp.MojoDBChangeProcessor.prototype._somethingFailed = function (msg, reply) {
    console.log("ChangeProcessor " + this._kind + ": " + msg + " failed:" + reply.errorText);

    // If mojodb crashed, wait a bit and retry as if a watch fired.
    if (reply.errorText === "com.palm.db is not running.") {

        if (this._request) {
            this._request.cancel();
            this._request = undefined;
        }
        setTimeout(this._queryForNextChanges.bind(this), 30000);
    }
};

// Call to reprocess all objects, rather than just the latest changes.
EmailApp.MojoDBChangeProcessor.prototype.processAll = function () {

    console.log("ChangeProcessor: Processing all " + this._kind);

    // Cancel any pending request, in case we were already in the process of loading
    // a set of changes, or our watch did not already fire.
    if (this._request) {
        this._request.cancel();
        this._request = undefined;
    }

    // Reset maxRev so we see ALL objects, and requery.
    this._maxRev = -1;
    this._maxDelRev = -1;
    this._queryForNextChanges();

};

// Called when our watch fires, indicating new changes.
// We respond by querying for the newly changed objects, and reprocessing them.
EmailApp.MojoDBChangeProcessor.prototype._watchFired = function (reply) {
    //console.log("ChangeProcessor._watchFired: (" + reply.fired + ") fired=" + this._kind);

    // Desktop builds seem to return immediately with {returnValue:true}, but no 'fired' property.
    if (reply.fired) {
        this._request.cancel();
        this._request = undefined; // it fired, so clear it out & requery.
        this._queryForNextChanges();
    }
};

// Called to begin a query sequence for a set of revised objects.
EmailApp.MojoDBChangeProcessor.prototype._queryForNextChanges = function (page, deletedPage) {
    /*	var params = {query: {
     select: this._select,
     from:this._kind,
     where:[{prop:this._revProp, op:">", val:this._maxRev}],
     orderBy: this._revProp,
     //							incDel: this._incDel,
     limit: this._limit
     }};*/


    // console.log("_queryForNextChanges: " + this._kind + " page=" + page);

    // If both pages are undefined, we're starting a new query, so clear the array of result lists.
    if (page === undefined && deletedPage === undefined) {
        this._loadedArrays.length = 0;
        this._loadedDeletedArrays.length = 0;
    }


    // Update query params to include the correct page, if appropriate:
    if (page !== undefined) {
        this._queryParams.page = page;
    } else {
        // If we're done following pages, update the maxRev in the query clause.
        // This CANNOT be done while also querying for the next page, or we miss results.
        delete this._queryParams.page;
        this._revClause.val = this._maxRev;
    }

    if (deletedPage !== undefined) {
        this._deleteQueryParams.page = deletedPage;
    } else if (this._processDeletes) {
        // If we're done following pages, update the maxRev in the query clause.
        // This CANNOT be done while also querying for the next page, or we miss results.
        delete this._deleteQueryParams.page;
        this._delRevClause.val = this._maxDelRev;
    }


    if (this._request !== undefined) {
        throw new Error("MojoDBChangeProcessor: request already pending!");
    }

    this._request = EmailApp.Util.callService('palm://com.palm.db/batch', this._batchParams, this.callbackRouter.bind(this, this._someLoaded, this._loadFailed));
};

// Grabs last item from the given results and updates this._maxRev if appropriate.
// Note that we always track _rev here, even when using a revSet.  This is because
// the revSet property may not be initialized, which can cause us to loop forever.
// Also, since both the revSet property and _rev come from the same series of
// revision numbers, it should work just as well to watch for revSet > _rev.
EmailApp.MojoDBChangeProcessor.prototype._trackMaxRev = function (response, which) {
    var obj = response && response.results && response.results.length && response.results[response.results.length - 1];
    if (obj && obj._rev > this[which]) {
        this[which] = obj._rev;
    }
};

// Completion method for loading changes... makes another query if there are more results, otherwise begins processing them.
EmailApp.MojoDBChangeProcessor.prototype._someLoaded = function (reply) {
    var len = reply.responses[0];
    len = len && len.results;
    len = len && len.length;
    console.log("   _someLoaded: got " + len + " changed " + this._kind);
    var deletedReply, nextPage, nextDeletedPage;

    this._request.cancel();
    this._request = undefined;

    // Separate replies for non-deleted and deleted item queries:
    deletedReply = reply.responses[1];
    reply = reply.responses[0];

    // Remember max revision we've seen.
    this._trackMaxRev(reply, '_maxRev');
    this._trackMaxRev(deletedReply, '_maxDelRev');

    // Get next page markers, if we have any.
    nextPage = reply.next;
    nextDeletedPage = deletedReply && deletedReply.next;

    // If a limit was specified, we process objects as they are loaded,
    // rather than collecting a complete array and doing it all at once.
    // The simple way to do this is to just call the processFunc() on
    // each array as we get it, and then for the last page, fall through
    // to the regular logic, where the remaining objects are processed
    // as if there was just a single page of results.
    if (this._limit && (nextPage || nextDeletedPage)) {

        try {
            // Process changes, commit any writes that were made, and fetch the next page.
            this._processChanges(reply.results);

            if (this._processDeletes && deletedReply.results.length > 0) {
                this._processDeletes(deletedReply.results);
            }

        } catch (error) {
            console.log("Exception caught while processing changes for " + this._kind + ".  Error stack: " + JSON.stringify(error));
        }

        this.commitBatchedWrites();
        this._queryForNextChanges(nextPage, nextDeletedPage);

    } else {

        // No limit, so we build up an array of all the result arrays, and process things all at once, later.
        this._loadedArrays.push(reply.results);
        if (deletedReply) {
            this._loadedDeletedArrays.push(deletedReply.results);
        }

        if (nextPage || nextDeletedPage) {
            this._queryForNextChanges(nextPage, nextDeletedPage);
        } else {
            this._loadComplete();
        }
    }


};

// Flattens an array of arrays into a single new array, and clears the old array.
EmailApp.MojoDBChangeProcessor.prototype.flattenAndClear = function (stuff) {
    var flattened = [];
    flattened = flattened.concat.apply(flattened, stuff);
    stuff.length = 0;
    return flattened;
};

// Called when a set of revised objects has been loaded.
// Processes them to make sure sourt keys and the parent's childCount is up to date.
EmailApp.MojoDBChangeProcessor.prototype._loadComplete = function () {
    var changed, deleted, maxRev;

    // Flatten into one array.

    changed = this.flattenAndClear(this._loadedArrays);

    if (this._processDeletes) {
        deleted = this.flattenAndClear(this._loadedDeletedArrays);
    }

    console.log('_loadComplete: Collected ' + changed.length + ' changed and  ' + deleted && deleted.length + ' deleted objects for ' + this._kind);

    // Set up a watch for new revisions.
    // We do this before calling the processFuncs so that if one of them calls processAll(), then our watch will be properly cancelled.
    maxRev = Math.max(this._maxRev, this._maxDelRev);
    console.log('_loadComplete: watching ' + this._kind + ' for changes after ' + maxRev);
    var params = {query: {
        from: this._kind,
        where: [
            {prop: this._revProp, op: ">", val: maxRev}
        ],
        incDel: this._incDel
    }
    };

    if (this._request !== undefined) {
        throw new Error("MojoDBChangeProcessor: request already pending, can't add watch!");
    }

    this._request = EmailApp.Util.callService('palm://com.palm.db/watch', params, this.callbackRouter.bind(this, this._watchFired, this._watchFailed));
    // Process the changed & deleted items:
    try {
        if (changed.length) {
            this._processChanges(changed);
        }

        if (this._processDeletes && deleted.length) {
            this._processDeletes(deleted);
        }

        if (this._processingComplete) {
            this._processingComplete();
        }
    } catch (error) {
        console.log("Exception caught while processing changes for " + this._kind + ".  Error stack: " + (error.stack || error));
    }

    // Commit batched writes, if any:
    this.commitBatchedWrites();

    return;
};


EmailApp.MojoDBChangeProcessor.prototype.callbackRouter = function (onSuccess, onFailure, resp) {
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

// Save the prop=val write in a hash of pending writes organized by record _id, so we can send them to mojodb all at once, later.
// Checks to see if the value is already current, and ignores the request if so.
// Otherwise, the value is set in the passed object, so it matches the future state of the database.
EmailApp.MojoDBChangeProcessor.prototype.batchWrite = function (obj, prop, val, kind) {
    var writes, oldVal, id;
    if (!this._batchKind) {
        this._batchKind = kind;
    } else if (this._batchKind !== kind) {
        this.commitBatchedWrites();
        this._batchKind = kind;
    }

    // Can't write undefined values, so use null instead.
    if (val === undefined) {
        val = null;
    }

    oldVal = obj[prop];
    if (oldVal === undefined) {
        oldVal = null;
    }

    // If value already matches, return without doing anything.
    if (oldVal === val) {
        return;
    }

    // Else, set the value locally, and queue a write to go to mojodb later.
    obj[prop] = val;

    id = obj._id;
//	Mojo.Log.info("   batchWrite to "+id+": "+prop+"= "+val);

    // If this write is to a new object, and it would push us over 500 objects,
    // then commit the batch, and continue with a new one.
    writes = this._batchedWrites;
    if (writes && !writes[id]) {
        if (this._objectCount > 499) {
            this.commitBatchedWrites();
        } else {
            this._objectCount++;
        }
    }


    // Create a new object to hold writes for 'id', if needed.
    // Then save the new prop/value pair in it.
    this._batchedWrites = this._batchedWrites || {};
    writes = this._batchedWrites;
    writes[id] = writes[id] || {_id: id};
    writes[id][prop] = val;

    return;
};


// Clears out the hash of pending writes, and sends them to mojodb.
EmailApp.MojoDBChangeProcessor.prototype.commitBatchedWrites = function (callback) {
    var writes = this._batchedWrites;
    var id, objList;

    callback = callback || function () {
    };

    if (!writes) {
        //console.log("commitBatchedWrites: no writes, skipping.");
        callback();
        return;
    }

    // Build an array of all the objects in our hash.
    objList = [];
    for (id in writes) {
        if (writes.hasOwnProperty(id)) {
            objList.push(writes[id]);
        }
    }

    if (!objList.length) {
        //console.log("commitBatchedWrites: no writes, skipping.");
        callback();
        return;
    }

    // Save the necessary objects to mojodb
    console.log("commitBatchedWrites: sending " + objList.length + " writes.");
    var startTime = Date.now();
    EmailApp.Util.callService('palm://com.palm.db/merge', {
        objects: objList,
        ignoreMissing: true
    }, function (resp) {
        // TODO: Remove this after performance enhancements
        var time = Date.now() - startTime;
        console.log("##commitBatchedWrites Merge call took " + time + " milliseconds");
        callback();
    });

    this._batchKind = undefined;
    this._batchedWrites = undefined;
    this._objectCount = 0;
};

