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


/* Copyright 2011 Palm, Inc.  All rights reserved. */

/*jslint laxbreak: true, white: false */
/*global CalendarEvent*/

enyo.kind({
    name      : "DatabaseManager",
    kind      : enyo.Component,
    published : {
        app: null
    },
    components: [
        {kind: enyo.DbService, onSuccess: "iSucceeded", onFailure: "iFailed", name: "put", method: "put"},
        {kind: enyo.DbService, onSuccess: "iSucceeded", onFailure: "iFailed", name: "get", method: "get"},
        {kind: enyo.DbService, onSuccess: "iSucceeded", onFailure: "iFailed", name: "batch", method: "batch"},
        {kind: enyo.DbService, onSuccess: "iSucceeded", onFailure: "iFailed", name: "merge", method: "merge"},
        {kind: enyo.DbService, onSuccess: "iSucceeded", onFailure: "iFailed", name: "deleteByIds", method: "del"},
        {kind: enyo.DbService, onSuccess: "iSucceeded", onFailure: "iFailed", name: "watchCalendars", method: "watch", onWatch: "myWatchFired", subscribe: true },
        {kind: enyo.DbService, onSuccess: "iSucceeded", onFailure: "iFailed", name: "findCalendarPrefs", method: "find", dbKind: "com.palm.calendarprefs:1"},
        {kind: enyo.DbService, onSuccess: "iSucceeded", onFailure: "iFailed", name: "findCalendarEvents", method: "find", dbKind: "com.palm.calendarevent:1"}
    ],

    create: function create() {
        this.inherited(arguments);
        enyo.application.databaseManager = this;
    },

    destroy: function destroy() {
        var a = this.$;					// Cancel Services:
        a && a.put && a.put.cancel();
        a && a.get && a.get.cancel();
        a && a.batch && a.batch.cancel();
        a && a.merge && a.merge.cancel();
        a && a.watchCalendars && a.watchCalendars.cancel();
        a && a.findCalendarPrefs && a.findCalendarPrefs.cancel();
        a && a.findCalendarEvents && a.findCalendarEvents.cancel();
        delete enyo.application.databaseManager;
        this.inherited(arguments);
    },

    iSucceeded: function iSucceeded(inSender, response, request) {
        if (request && request.actualSuccessCB) {
            request.actualSuccessCB(response);
        }
    },

    iFailed: function iFailed(inSender, response, request) {
        if (request && request.actualFailureCB) {
            request.actualFailureCB(response);
        }
    },

    myWatchFired : function myWatchFired(inSender, response, request) {
        console.info("==================================watch fired");
        if (request && request.actualWatchCB) {
            request.actualWatchCB(response);
        }
    },

    // TODO: See if enyo supports runtime callbacks
    shimCallbacks: function shimCallbacks(request, successCB, failureCB, watchCB) {
        request.actualSuccessCB = successCB;
        request.actualFailureCB = failureCB;
        request.actualWatchCB = watchCB;
    },

    eventTable        : "com.palm.calendarevent:1",
    calendarTable     : "com.palm.calendar:1",
    calendarPrefsTable: "com.palm.calendarprefs:1",

    createEvent: function createEvent(event, successCB, failureCB) {
        this.setEventKind(event);
        this.setEventAccountId(event);
        var cleanEvent = new CalendarEvent(event);

        var request = this.$.put.call({objects: [cleanEvent]});
        this.shimCallbacks(request, successCB, failureCB);
    },

    getEvent: function getEvent(id, successCB, failureCB) {
        var request = this.$.get.call({    ids: [id] });
        this.shimCallbacks(request, successCB, failureCB);
    },

    getCalendarPrefs: function getCalendarPrefs(successCB, failureCB) {
        var request = this.$.findCalendarPrefs.call();
        this.shimCallbacks(request, successCB, failureCB);
    },

    watchCalendars: function watchCalendars(lastRev, successCB, failureCB) {
        lastRev = (lastRev ? lastRev : 0);
        this.$.watchCalendars.cancel();
        var request = this.$.watchCalendars.call({
            query: {
                "from"  : "com.palm.calendar:1",
                "where" : [
                    {"prop": "calendarRevset", "op": ">", "val": lastRev}
                ],
                "incDel": true
            }
        });
        this.shimCallbacks(request, successCB, failureCB, successCB);
    },

    getAllCalendars: function getAllCalendars(successCB, failureCB) {
        //query for all calendars in the table
        var queryOp = {
            "method": "find",
            "params": {
                "query": {
                    "from"   : "com.palm.calendar:1",
                    "orderBy": "calendarRevset"
                }
            }
        };

        //find the last revset of all calendars in the table
        var revsetOp1 = {
            "method": "find",
            "params": {
                "query": {
                    "from"   : "com.palm.calendar:1",
                    "orderBy": "calendarRevset",
                    "desc"   : true,
                    "limit"  : 1
                }
            }
        };

        //find the last revset of all deleted calendars in the table
        var revsetOp2 = {
            "method": "find",
            "params": {
                "query": {
                    "from"   : "com.palm.calendar:1",
                    "where"  : [
                        {"prop": "_del", "op": "=", "val": true}
                    ],
                    "orderBy": "calendarRevset",
                    "desc"   : true,
                    "limit"  : 1
                }
            }
        };

        var operations = [queryOp, revsetOp1, revsetOp2];

        var request = this.$.batch.call({ operations: operations });
        this.shimCallbacks(request, successCB, failureCB);
    },

    setEventKind: function setEventKind(event) {

        if (!event) {
            return;
        }

        if (event.calendarId) {
            event._kind = enyo.application.calendarsManager.getCalAccountKind(event.calendarId);
        }

        if (!event._kind) {
            event._kind = this.eventTable;
        }
    },

    setEventAccountId: function setEventAccountId(event) {
        if (!event) {
            return;
        }

        if (!this.prefsManager) {
            this.prefsManager = enyo.application.prefsManager;
        }

        var calendarId = event.calendarId || this.prefsManager.getDefaultCalendar(),
            calendar;

        if (calendarId) {
            calendar = enyo.application.calendarsManager.getCal(calendarId);
        }
        if (calendar) {
            event.accountId = calendar.accountId;
        }

        if (!event.accountId) {
            //Mojo.Log.error("\n\nsetEventAccountId: could not assign account ID to event!\n\n");
        }
    },

    updateEvent: function updateEvent(eventSlice, successCB, failureCB) {

        var cleanEvent = new CalendarEvent(eventSlice);
        var request = this.$.merge.call({ objects: [cleanEvent]    });
        this.shimCallbacks(request, successCB, failureCB);
    },

    deleteEvent                 : function deleteEvent(eventId, successCB, failureCB, setCancelled, parentId, deleteChildren) {
        //Mojo.Log.info("$$$$$$$$$$$$ In deleteEvent %s", eventId);
        var operations = [];

        if (setCancelled) {
            //If we're deleting a whole series from an exception child, mark the parent as cancelled
            if (parentId) {
                var mergeParentOp = {
                    method: "merge",
                    params: {
                        props: {status: "CANCELLED", notify: true},
                        query: {
                            from : "com.palm.calendarevent:1",
                            where: [
                                {prop: "_id", op: "=", val: parentId}
                            ]
                        }
                    }
                };
                operations.push(mergeParentOp);
            }
            //Otherwise, mark this event as cancelled
            else {
                var mergeOp = {
                    method: "merge",
                    params: {
                        objects: [
                            {_id: eventId, status: "CANCELLED", notify: true}
                        ]
                    }
                };
                operations.push(mergeOp);
            }
        }

        //delete this event
        var deleteEventOp = {
            method: "del",
            params: {
                "ids": [eventId]
            }
        };
        operations.push(deleteEventOp);

        //If we're deleting a series from an exception child, delete the parent
        if (parentId) {
            var deleteParentOp = {
                method: "del",
                params: {
                    ids: [parentId]
                }
            };
            operations.push(deleteParentOp);
        }

        //If we're deleting a series, delete any children of this event
        if (deleteChildren) {
            var deleteChildrenOp = {
                method: "del",
                params: {
                    query: {
                        from : "com.palm.calendarevent:1",
                        where: [
                            {prop: "parentId", op: "=", val: eventId}
                        ]
                    }
                }
            };
            operations.push(deleteChildrenOp);
        }

        //If we're deleting a series from an exception child, delete this event's siblings (other exceptions in the series)
        if (parentId && deleteChildren) {
            var deleteSiblingsOp = {
                method: "del",
                params: {
                    query: {
                        from : "com.palm.calendarevent:1",
                        where: [
                            {prop: "parentId", op: "=", val: parentId}
                        ]
                    }
                }
            };
            operations.push(deleteSiblingsOp);
        }

        var request = this.$.batch.call({ operations: operations });
        this.shimCallbacks(request, successCB, failureCB);
    },

    //Used for deleting spare prefs in the db.
    deleteByIds                 : function deleteByIds(idsArray, successCB, failureCB) {
        var request = this.$.deleteByIds.call({"ids": idsArray});
        this.shimCallbacks(request, successCB, failureCB);
    },

    //Used for adding an exception to a parent, and creating the exception child event.
    updateParentAddChild        : function updateParentAddChild(parentSlice, childEvent, successCB, failureCB, markChildDeleted) {
        //Mojo.Log.info("$$$$$$$$$$$$ In updateParentAddChild %j, %j", parentSlice, childEvent);
        var parent = new CalendarEvent(parentSlice);
        var child = new CalendarEvent(childEvent);

        if (markChildDeleted) {
            child._del = true;
        }

        var updateParentOp = {
            method: "merge",
            params: {
                objects: [parent]
            }
        };

        var addChildOp = {
            method: "put",
            params: {
                objects: [child]
            }
        };

        var operations = [updateParentOp, addChildOp];

        var request = this.$.batch.call({ operations: operations });
        this.shimCallbacks(request, successCB, failureCB);
    },

    //Used when changing the time of a whole series - any child exceptions are deleted,
    //and any exdates are removed from the parent
    updateEventDeleteChildren   : function updateEventDeleteChildren(event, successCB, failureCB) {
        var cleanEvent = new CalendarEvent(event);
        cleanEvent.exdates = [];
        var updateEventOp = {
            method: "merge",
            params: {
                objects: [cleanEvent]
            }
        };

        var deleteChildrenOp = {
            method: "del",
            params: {
                query: {
                    from : "com.palm.calendarevent:1",
                    where: [
                        {prop: "parentId", op: "=", val: event._id}
                    ]
                }
            }
        };

        var operations = [deleteChildrenOp, updateEventOp];

        var request = this.$.batch.call({ operations: operations });
        this.shimCallbacks(request, successCB, failureCB);
    },

    //Handles changing an event's calendar.
    //The event's kind, calendarId and accountId were changed in edit view before we got here.
    //We strip off any transport-specific fields so that we don't cross-pollute.
    //We delete the old event and re-insert it as a new event so that any watches based on the old kind will get a _del:true flag.
    //If this is a repeating event with children, we have to update the children too.
    //We propagate the new kind, calendarId, and accountId to the children and strip transport-specific fields. We delete and reinsert
    //all of the children. We then go back and update the children to have the new parentId.
    // NOTE: If this is a child event whose calendar has been changed, only the child event is moved.
    moveEventToDifferentCalendar: function moveEventToDifferentCalendar(event, callback) {
        //set the new kind on the event
        var newKind = event._kind;
        var dbmgr = this;

        //if the event has no _id, then it's not in the db yet, can't have any children yet, and changing the
        //kind is all we have to do
        if (!event._id) {
            callback();
            return;
        }

        var numChildren = 0;
        var parentEventId = event._id;
        var parentCalendarId = event.calendarId;
        var parentAccountId = event.accountId;
        var findQuery = {"where": [
            {"prop": "parentId", "op": "=", "val": parentEventId}
        ] };
        var mergeQuery = {
            "from" : "com.palm.calendarevent:1",
            "where": [
                {"prop": "parentId", "op": "=", "val": parentEventId}
            ]
        };

        //EventIds of the events we're going to delete. At minimum, we're deleting the event.
        var eventIds = [event._id];

        //Events we're going to add. At minimum, we're adding the event.
        var newEvent = new CalendarEvent(event, {exclude: ["_id"]});
        var cleanedEvents = [newEvent];

        //Query for children events.  If present, we have to move them too
        var request0 = this.$.findCalendarEvents.call({query: findQuery    });
        var gotChildrenCB = enyo.bind(this, gotChildren);
        this.shimCallbacks(request0, gotChildrenCB, gotChildrenCB);

        //If there are children, we have to move them too.
        //Append their _ids to the eventIds array, set their kinds to the new kind, and append their full content to
        //the events array.
        function gotChildren(response) {
            var childEvents = response.results;
            numChildren = childEvents && childEvents.length;
            for (var i = 0; i < numChildren; i++) {
                var event = childEvents[i];
                eventIds.push(event._id);
                event._kind = newKind;
                event.calendarId = parentCalendarId;
                event.accountId = parentAccountId;
                cleanedEvents.push(new CalendarEvent(event, {exclude: ["_id"]}));
            }

            var delEventsOp = {
                method: "del",
                params: {
                    "ids": eventIds
                }
            };

            //Add copies of the event and any children, now with the new kind.
            var putEventsOp = {
                method: "put",
                params: {
                    "objects": cleanedEvents
                }
            };

            var operations = [delEventsOp, putEventsOp];
            var request1 = this.$.batch.call({ operations: operations });
            var movedEventsCB = enyo.bind(this, movedEvents);
            this.shimCallbacks(request1, movedEventsCB, movedEventsCB);
        }

        function movedEvents(response) {
            var responses = response.responses;
            var putResponse = responses && responses[1];
            var putResponseResults = putResponse && putResponse.results && putResponse.results[0];
            var newEventId = putResponseResults && putResponseResults.id;
            newEvent._id = newEventId;
            callback(newEvent);

            if (numChildren) {
                //now that we have the new eventId for the parent, update the parentId field for the children
                var props = {"parentId": newEventId};
                var request2 = this.$.merge.call({
                    query: mergeQuery,
                    props: props
                });
                var updatedChildrenCB = enyo.bind(this, updatedChildren);
                this.shimCallbacks(request2, updatedChildrenCB, updatedChildrenCB);
            }
        }

        function updatedChildren(response) {
            //console.info("===== 3 Updated children: "+JSON.stringify(response));
        }
    },

    setCalendarPrefs: function setCalendarPrefs(prefsSlice, successCB, failureCB) {
        if (!prefsSlice) {
            this.warn("$$$$$$$$$$$$ In setCalendarPrefs with undefined prefs");
            return;
        }
        DEBUG && this.log("$$$$$$$$$$$$ In setCalendarPrefs slice.");//+ prefsSlice);
        delete prefsSlice._rev;

        var params = { objects: [prefsSlice] }
        var request;
        if (prefsSlice._id) {
            request = this.$.merge.call(params);
        }
        else {
            request = this.$.put.call(params);
        }
        this.shimCallbacks(request, successCB, failureCB);
    },

    addPalmProfileCalendar: function addPalmProfileCalendar(calendar, successCB, failureCB) {
        //THIS SHOULD ONLY BE USED TO ADD PALM PROFILE TO THE CALENDAR TABLE

        var request = this.$.put.call({    objects: [calendar] });
        this.shimCallbacks(request, successCB, failureCB);
    },

    updateCalendars: function updateCalendars(calendarList, successCB, failureCB) {

        var request = this.$.merge.call({ objects: calendarList });
        this.shimCallbacks(request, successCB, failureCB);
    },

    isEventDirty: function isEventDirty(oldEvent, newEvent) {
        //Mojo.Log.info("in check for isEventDirty");

        if (oldEvent === undefined) {
            //Mojo.Log.info("old event is undefined");
            return true;
        }

        //This will strip any id/rev/transport specific fields away, and ensure our objects are CalendarEvents.
        var cleanOld = new CalendarEvent(oldEvent);
        var cleanNew = new CalendarEvent(newEvent);
        var equal = cleanOld.isEqualTo(cleanNew);
        //Mojo.Log.info("---:---: isEventDirty: "+(!equal));
        return !equal;
    },

    makeABunchOfEvents: function makeABunchOfEvents(params) {
        /*
         * PARAMS:
         * numEvents || 100;
         * subjectLength || 25;
         * locationLength || 25;
         * noteLength || 100;
         * numRepeat || (numEvents / 2);
         * numCountRepeat || (numRepeat / 2);
         * numAllDay || (numEvents / 6);
         * earliestYear || 1970
         * latestYear || 2020
         */
        function randomString(strLength) {
            var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
            var string = '';
            for (var i = 0; i < strLength; i++) {
                var j = Math.floor(Math.random() * chars.length);
                string += chars.substring(j, j + 1);
            }
            return string;
        }

        function semiRandomRRule(useCount) {
            var freqs = ["DAILY", "DAILY", "DAILY", "WEEKLY", "WEEKLY", "WEEKLY", "MONTHLY", "MONTHLY", "YEARLY"];
            var intervals = [1, 1, 1, 1, 2, 2, 3];
            var freq = freqs[ (Math.floor(Math.random() * freqs.length)) ];
            var interval = Math.floor(Math.random() * intervals.length);

            var rule = {freq: freq, interval: interval};
            if (useCount) {
                var maxCount = 200;
                var count = Math.floor(Math.random() * maxCount) + 1;
                rule.count = count;
            }
            return rule;
        }

        function randomDate(earliestYear, latestYear) {
            var range = latestYear - earliestYear + 1;
            var randomMonth = Math.floor(Math.random() * 12);
            var randomDay = Math.floor(Math.random() * 29);
            var randomYear = earliestYear + Math.floor(Math.random() * range);
            var randomHour = Math.floor(Math.random() * 25);
            var date = new Date(randomYear, randomMonth, randomDay, randomHour, 0, 0, 0);
            return date.getTime();
        }

        function after(response) {
            console.info("---:---: ");
            console.info("DONE: " + JSON.stringify(response));
            console.info("---:---: ");
        }

        var numEvents = params.numEvents || 100;
        var subjectLength = params.subjectLength || 25;
        var locationLength = params.locationLength || 25;
        var noteLength = params.noteLength || 100;
        var numRepeat = params.numRepeat || (numEvents / 2);
        var numCountRepeat = params.numCountRepeat || (numRepeat / 2);
        var numAllDay = params.numAllDay || (numEvents / 6);
        var earliestYear = params.earliestYear || 1970;
        var latestYear = params.latestYear || 2020;
        var events = [];
        for (var i = 0; i < numEvents; i++) {
            var event = new CalendarEvent();
            event._kind = "com.palm.calendarevent:1";
            event.subject = "" + i + "_" + randomString(subjectLength);
            event.location = randomString(locationLength);
            event.note = randomString(noteLength);
            event.allDay = Boolean(i < numAllDay);
            event.alarm = undefined;
            event.tzId = "America/Los_Angeles";
            event.calendarId = "RANDOMGENERATOR";
            event.dtstart = randomDate(earliestYear, latestYear);
            var randomDuration = Math.floor(Math.random() * 25);
            event.dtend = event.dtstart + (60 * 60 * 1000 * randomDuration); //end = start + some # of hours.  Hours will be less than 24.
            if (i < numRepeat) {
                if (i < numCountRepeat) {
                    event.rrule = semiRandomRRule(true);  //make a count event.  Will repeat less than 200 times.
                }
                else {
                    event.rrule = semiRandomRRule(false);
                    if (i % 2) {
                        event.rrule.until = event.dtstart + (86400000 * 30 * randomDuration); //until = start + some # of roughly approximated months.  Will be less than 2 years.
                    }
                }
            }
            events.push(event);
        }

        //for(i = 0; i < numEvents; i++){
        //Mojo.Log.error("event["+i+"]: "+new Date(events[i].dtstart) +" / "+ new Date(events[i].dtend)+" / "+ JSON.stringify(events[i].rrule));
        //}

        var request = this.$.put.call({ objects: events });
        this.shimCallbacks(request, after, after);
    }

});
