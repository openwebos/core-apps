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
 NOTE: calendar.CacheManager handles caching Calendar app events.

 TODO: Make this the central module for events' lifecycle (create, read, update, delete)
 - Watch for those actions and notify others when relevant.

 TODO: Watch currentDate:
 - Update event occurrences when currentDate shifts ahead or behind the cache window (i.e. 3 months).

 TODO: Implement ordered event querying order for faster display:
 1. Find new Single occurrence events in range.
 2. Skip new Repeating events with exdates in range.
 3. Find displayed events and update or remove as necessary.
 4. Find new Repeating without counts.
 5. Find new Repeating with counts.
 **/
enyo.kind({
    name       : "calendar.CacheManager",
    kind       : enyo.Component,
    timeMachine: new Date(),    // Used to calculate timestamps without creating new [expensive] Date instances within loops.
    cacheLimit : 182,           // timestamp cache length limit
    published  : {
        accountsAndCalendars: null, // Array	: For watching Accounts and Calendars changes.
        calendars           : null, // Object	: For watching calendar changes.
        currentDate         : null, // Date		: For watching when the current date changes.
        tzId                : null  // String	: For watching timezone changes.
    },

    create: function CacheManager() {
        var enyoApp = enyo.application;

        this.eventCache = {};
        this.timestampCache = {};

        this.hiddenCalendars = {};
        this.queries = {active: {}, canceled: {}};

        this.activeQueries = [];
        this.nextWorkerId = 0;

        this.databaseChanged = enyo.bind(this, this.databaseChanged);
        this.getDays = enyo.bind(this, this.getDays);
        this.getEvents = enyo.bind(this, this.getEvents);
        //protected area of cache, do not remove during pruning.
        this.protectedRange = [+(new Date().addDays(-46).clearTime()), +(new Date().addDays(46).clearTime())];

        this.inherited(arguments);
        enyoApp.cacheManager = this;

        enyoApp.watch({ accountsAndCalendars: this, calendars: this, currentDate: this, tzId: this }, {name: "CacheManager"});

        this.busyFreeManager = enyo.application.busyFreeManager = new BusyFreeManager();
        this.layoutManager = enyo.application.layoutManager = new LayoutManager();

        this.eventManager = new EventManager();
        // NOTE: First run flag is here because tzIdChanged and databaseChanged will fight
        // over who gets called first on small calendars, and if databaseChanged is called
        // first, there are potential duplicate issues that can pop up. This flag
        // is used only to force database events to only be watched after the timezone
        // has been set.
        this.firstRun = true;
        this.eventManager.getEvents();
    },

    destroy    : function destroy() {
        var eventManager = this.eventManager,
            enyoApp = enyo.application;

        eventManager.stopObservingDatabaseChanges("cache", this);
        eventManager.cancelGetEventsInRange();

        enyoApp.ignore({ calendars: this, currentDate: this, eventsQuery: this, tzId: this });

        // Cleanup references.
        delete this.busyFreeManager;
        delete this.layoutManager;
        delete this.eventManager;
        delete enyoApp.busyFreeManager;
        delete enyoApp.layoutManager;
        delete enyoApp.cacheManager;

        this.inherited(arguments);
    },

    //SECTION Property Share Handlers
    tzIdChanged: function tzIdChanged(oldTzId) {
        // NOTE: First run flag check. See comment in this.constructor.
        if (this.firstRun) {
            this.eventManager.observeDatabaseChanges("cache", this);
            this.firstRun = false;
        }
        //invoke discardTimestampCache, continue to buildEventCache
        this.discardTimestampCache();
        return this.buildEventCache(true);
    },

    databaseChanged: function databaseChanged() {
        //invoke buildEventCache
        return this.buildEventCache(false);
    },
    //ENDSECTION Property Share Handlers

    //SECTION Event Cache Management

    buildEventCache        : function buildEventCache(force) {
        var resultSet = this.eventManager.queryResults;
        var delta = this.compareEventCache(resultSet, force);
        this.updateEventCacheIndices();
        var updated_ids = [];
        //update objects in the cache
        for (var i = 0, len = delta.updated.length; i < len; i++) {
            var index = delta.updated[i];
            var ev = resultSet[index];
            updated_ids.push(ev._id);
            var o = this.eventCache[ev._id] || {};
            o.id = ev._id;
            o.revSet = ev.eventDisplayRevset;
            o.dtstart = ev.dtstart;
            o.dtend = ev.dtend;
            o.index = index;
            o.instances = o.instances || [];
            this.eventCache[ev._id] = o;
        }
        //swap the updated-by-indices to updated-by-ids for later functions
        delta.updated = updated_ids;
        //deletion will occur in updateTimestampCache
        return this.updateTimestampCache(delta);
    },
    updateEventCacheIndices: function updateEventCacheIndices() {
        var qr = this.eventManager.queryResults;
        for (var i = 0, len = qr.length; i < len; i++) {
            var id = qr[i]._id;
            var cacheObject = this.eventCache[id];
            if (!!cacheObject) {
                cacheObject.index = i;
            }
        }
    },
    compareEventCache      : function compareEventCache(resultSet, force) {
        function lambdaFilter(e, i, a) {
            return keys.indexOf(e) == -1;
        }

        var retval = {updated: []};
        var thi$ = this;
        //get the keys in both the new and old for comparison
        var cachedKeys = this._getKeys(this.eventCache);
        var keys = resultSet.map(function (e) {
            return e._id;
        });

        for (var i = 0, len = resultSet.length; i < len; i++) {
            var ev = resultSet[i];
            var cachedEv = this.eventCache[ev._id] || null;
            if (cachedEv === null) {    //event did not exist in cache prior to this run
                retval.updated.push(i);
                continue;
            }
            if (force || cachedEv.revSet != ev.eventDisplayRevset) { //event existed, but is out of date
                retval.updated.push(i);
                continue;
            }
            //if we get here, the event is the same in both, no updates needed.
        }

        retval.deleted = cachedKeys.filter(lambdaFilter);
        return retval;
    },
    //ENDSECTION Event Cache Management

    //SECTION Timestamp Cache Management
    updateTimestampCache   : function updateTimestampCache(updateList) {
        var timeMachine = new Date();
        var timeRanges = this.calculateRanges();

        if (timeRanges.length == 0) { //empty cache, use default cache ranges
            var start = (Date.today()).addDays(-46).getTime();
            var end = (Date.today()).addDays(46).addSeconds(-1).getTime();
            timeRanges.push([start, end]);
        }
        for (var i = 0, rlen = timeRanges.length; i < rlen; i++) {
            var start = timeRanges[i][0], end = timeRanges[i][1];
            for (timeMachine.setTime(start); +timeMachine < end; timeMachine.addDays(1)) {
                var ts = +timeMachine;
                this.timestampCache[ts] = this.timestampCache[ts] || [];
            }
        }
        //toss all instances of the events in the updateList out of the cache.
        for (var i = 0, uulen = updateList.updated.length; i < uulen; i++) {
            var ev = updateList.updated[i];
            this.discardEvent(ev, false);
        }
        for (var i = 0, udlen = updateList.deleted.length; i < udlen; i++) {
            var ev = updateList.deleted[i];
            this.discardEvent(ev, true);
        }
        return this.doAsyncTimestampUpdate(updateList, timeRanges);
    },
    discardTimestampCache  : function discardTimestampCache() {
        //do the naive thing for now and just build a new one. If we need to break out delete later we can.
        this.timestampCache = {};
        var eventsInCache = this._getKeys(this.eventCache);
        for (var i = 0, len = eventsInCache.length; i < len; i++) {
            eventsInCache[i].instances = [];
        }
    },

    //ENDSECTION Timestamp Cache Management

    //SECTION Cache Range Methods

    //returns a list of ranges that covers the full range of the current cache
    calculateRanges        : function calculateRanges() {
        var timestamps = this._getKeys(this.timestampCache,
            function (e) {
                return +e;
            }).sort();
        return this.buildRangesForDays(timestamps);
    },

    //assumptions: timestamps are sorted midnight timestamps
    buildRangesForDays     : function buildRangesForDays(tsin) {
        var timestamps = tsin.sort();
        var timeMachine = new Date(); //for date calculations
        if (timestamps.length == 0) {
            return [];
        }
        var ranges = [
            [timestamps[0]]
        ], currentRange = 0;
        //pass 1: chunk the days in the timestamp cache
        for (var i = 1, len = timestamps.length; i < len; i++) {
            var prev = timestamps[i - 1], current = timestamps[i];
            timeMachine.setTime(prev);
            timeMachine.addDays(1);
            var isContiguous = +timeMachine == current;
            if (isContiguous) {
                ranges[currentRange].push(current);
            } else {
                ranges.push([current]);
                currentRange++;
            }
        }
        //pass 2, calculate start and ends
        var results = ranges.map(function (e, i, a) {
            //e cannot be zero-length due to how it is being built, so get the first day
            //in the array and the last day, turn the last day to 11:59:59 PM on that day
            //and return that range
            timeMachine.setTime(e[e.length - 1]);
            timeMachine.addDays(1);
            var nextMidnight = +timeMachine - 1;
            return [e[0], nextMidnight];
        });
        return results;
    },

    //ENDSECTION Cache Range Methods

    //SECTION Utility Methods
    _getKeys               : function getKeys(o, fn) {
        if (typeof(fn) == "undefined") {
            fn = function (e) {
                return e;
            }
        }
        var keys = Object.keys(o);
        var ret = keys.map(fn);
        return ret;
    },
    getEventInCache        : function getEventInCache(e) {
        var ev = this.eventCache[e];
        if (typeof(ev) == "undefined") {
            return null;
        }
        return this.eventManager.queryResults[ev.index];
    },
    discardEvent           : function discardEvent(victim, doDelete) {
        var ev = this.eventCache[victim];
        if (typeof(ev) == "undefined") { //how did this happen?!
            return;
        }
        for (var i = 0, evlen = ev.instances.length; i < evlen; i++) {
            var timestamp = ev.instances[i];
            var thatDay = this.timestampCache[timestamp];
            if (typeof(thatDay) == "undefined") {
                continue;
            }
            var removed = thatDay.filter(function (e, i, a) {
                return e[0] != victim;
            });
            this.timestampCache[timestamp] = removed;
        }
        ev.instances = [];
        if (doDelete) {
            delete this.eventCache[victim];
        }
    },

    /*
     This is the cache maintenance algorithm. This function has several goals:

     -	Expand the cache into holes, where there are small gaps in the cache and the
     size of the cache is not yet at limit.
     -	Cull the cache from the future-most edge in the event of the cache being
     too full.

     */
    performCacheMaintenance: function performCacheMaintenance() {
        function paramCompare(i) {
            var index = i;
            return function compare(a, b) {
                if (a[index] == b[index]) {
                    return 0;
                }
                return a[index] < b[index] ? -1 : 1;
            }
        }

        var thi$ = this;
        var keys = this._getKeys(this.timestampCache);
        //expand behavior
        if (keys.length < this.cacheLimit) {
            //do nothing for now, we need to more carefully define the heuristics
            //that this should use before implementing it.
        } else { //collapse behavior
            //this builds a triple for each day in the timestampCache
            //the first item is the timestamp (the key in timestampCache to get the day's events)
            //the second item is the day's access time (updated on change or read)
            //the third is if the day is inside the current protected range, and thus exempt from culling
            var timeArray = keys.map(function (key) {
                var id = +key;
                return [id, thi$.timestampCache[id].accessTime,
                        id > thi$.protectedRange[0] && id < thi$.protectedRange[1]];
            });
            var filtered = timeArray.filter(function (e, i, a) {
                return !e[2];
            });

            //cull days outside the protected range by least-recently used
            var daysRemainingToCull = keys.length - this.cacheLimit;
            filtered.sort(paramCompare(1));
            filtered.reverse();
            while (daysRemainingToCull && filtered.length) {
                var nextDay = filtered.pop();
                delete this.timestampCache[nextDay[0]];
                daysRemainingToCull--;
            }
        }
    },

    //ENDSECTION Utility Methods

    //SECTION EventManager Query Methods
    doAsyncTimestampUpdate : function buildAsyncTimestampUpdate(updateList, ranges, finishFunction) {
        var thi$ = this;
        if (!updateList) {
            updateList = {
                updated: this._getKeys(this.eventCache)
            };
        }
        if (typeof(finishFunction) == "undefined") {
            finishFunction = this.shareEvents.bind(this);
        }
        var worker = (function setup() {
            var working_ranges = ranges.slice(0);
            var working_events = updateList.updated.map(thi$.getEventInCache.bind(thi$));
            var working_results = [];
            var startTime = +Date.now();

            function asyncTimestampUpdate(results) {
                //store last run, if existing
                if (!!results) {
                    working_results = working_results.concat(results.days);
                }
                //start next run
                if (!working_ranges.length || worker.cancel) {
                    //finish up, we've run through everything.
                    var endTime = +Date.now();
                    for (var i = 0; i < this.activeQueries.length; i++) {
                        if (this.activeQueries[i] == worker) {
                            this.activeQueries.splice(i, 1);
                            break;
                        }
                    }
                    if (this.activeQueries.length) {
                        setTimeout(this.activeQueries[0], 4);
                    }	//start the next worker in the list after we're done.
                    return this.populateTimestampCache(working_results, finishFunction);
                }
                var next_range = working_ranges.pop();
                var range = { start: next_range[0], end: next_range[1], tzId: this.tzId || "America/Los_Angeles"};

                DEBUG && this.log("GET NEW EVENTS FOR MISSING RANGE : " + new Date(range.start) + " / " + new Date(range.end));

                this.eventManager.getEventsInRange(range, worker, working_events, false);
            }

            return asyncTimestampUpdate.bind(thi$);
        })();
        worker.cancel = false;
        if (this.activeQueries.length == 0) {
            this.activeQueries.push(worker);
            worker();
        } else {
            for (var i = 0; i < this.activeQueries.length; i++) {
//				this.activeQueries[i].cancel = true;
            }
            this.activeQueries.push(worker);
        }
    },

    doRequestMissingRanges: function doRequestMissingRanges(ranges, desiredRange) {
        var shareDays = (function (thisp) {
            var rangeClone = desiredRange.slice(0);

            function callback() {
                this.shareDays(rangeClone);
            }

            return callback.bind(thisp);
        })(this);
        return this.doAsyncTimestampUpdate(null, ranges, shareDays);
    },

    populateTimestampCache     : function populateTimestampCache(results, callWhenDone) {
        function flattenEvents(someEvents) {
            var eventsArray = [];
            for (var j = 0, len = someEvents.length; j < len; j++) {
                var ev = someEvents[j];
                eventsArray.push([ev._id, ev.currentLocalStart, ev.currentLocalEnd, ev.renderStartTime, ev.renderEndTime, ev.eventDisplayRevset]);
            }
            return eventsArray;
        }

        var runTime = +Date.now();
        for (var i = 0, ilen = results.length; i < ilen; i++) {
            var oldEventsArray = this.timestampCache[results[i].date] || [];
            //Set the access time parameter to each events array, this will be used
            //to determine which days should be removed from the array in the event of
            //cache culling.
            var eventsArray = oldEventsArray.concat(flattenEvents(results[i].events),
                flattenEvents(results[i].allDayEvents),
                flattenEvents(results[i].hiddenEvents),
                flattenEvents(results[i].hiddenAllDay));
            eventsArray.accessTime = runTime;
            for (var j = 0, jlen = eventsArray.length; j < jlen; j++) {
                var id = eventsArray[j][0];
                this.eventCache[id].instances.push(results[i].date);
            }
            this.timestampCache[results[i].date] = eventsArray;
        }
        callWhenDone();
        this.performCacheMaintenance();
    },


    //ENDSECTION

    //SECTION UI query API
    getDays                    : function getDays(dayInfo) {
        /* Queries the DB for events matching the criteria specified by dayInfo.
         dayInfo: {date:Date, expand?:Number, calendarId?:String}
         */
        if (!dayInfo || !dayInfo.date) {
            this.warn("---:---: No current day specified. Retrieving events for yesterday, today and tommorow.");
        }

        var calendarId = dayInfo ? dayInfo.calendarId : null,
            expand = dayInfo && dayInfo.expand,
            hidden = dayInfo && dayInfo.hiddenCalendars,
            limit = dayInfo && dayInfo.limit,
            start = (dayInfo && dayInfo.date) || new Date();
        isNaN(expand) && (expand = 0);
        start.clearTime().addDays(-1 * expand);			// Number of days to include before the specified date. Default is none.

        var end = new Date(start);
        end.addDays((expand && (expand * 2 + 1)) || 1);	// Number of days to include after the specified date. Default is none.
        end.addMilliseconds(-1);							// Set to almost midnight of end day 23:59:59:999.

        var missingDays = this.getMissingDays(+start, +end, this.timestampCache);

        DEBUG && this.log("FOUND MISSING DAYS : " + missingDays.length);

        if (missingDays.length) {
            var now = +Date.now();
            for (var i = 0, len = missingDays.length; i < len; i++) {
                this.timestampCache[missingDays[i]] = []; //insert placeholder.
                this.timestampCache[missingDays[i]].accessTime = now;
            }
            var missingRanges = this.buildRangesForDays(missingDays);
            return this.doRequestMissingRanges(missingRanges, [start, end]);
        } else {
            return this.shareDays([+start, +end]);
        }
    },

    //assumptions: all keys in timestampCache are days at midnight.
    getMissingDays             : function getMissingDays(start, end, inCache) {
        var currentCachedDays = this._getKeys(inCache,
            function (e) {
                return +e;
            }).sort();
        var i = 0, missing = [], currentDay = new Date(start);
        while (+currentDay < end) {
            if (currentCachedDays.indexOf(+currentDay) == -1) {
                missing.push(+currentDay);
            }
            currentDay.addDays(1);
        }
        return missing;
    },
    //ENDSECTION


    //SECTION Final Data Share Methods
    shareDays                  : function shareDays(desiredRange) {
        //format data for view
        var runStart = +Date.now();
        var start = desiredRange[0], end = desiredRange[1],
            timeMachine = new Date(start);
        var dates = [];
        var events = [];
        var runTime = +Date.now();
        while (+timeMachine < end) {
            dates.push(+timeMachine);
            var day = this.timestampCache[+timeMachine];
            if (!day) { //oh dear. something blew up badly.
                console.error("Unable to return requested day, " + (+timeMachine) + ", because it is not in cache.");
                timeMachine.addDays(1);
                continue;
            }
            //update this day's access time for use in LRU pruning of cache
            day.accessTime = runTime;
            for (var i = 0, ilen = day.length; i < ilen; i++) {
                var e_tuple = day[i];
                var id = e_tuple[0];
                var ev = this.getEventInCache(id);
                var clone = new CalendarEvent(ev);
                clone.currentLocalStart = e_tuple[1];
                clone.currentLocalEnd = e_tuple[2];
                clone.renderStartTime = e_tuple[3];
                clone.renderEndTime = e_tuple[4];
                events.push(clone);
            }
            timeMachine.addDays(1);
        }
        var results = this.mapEventsByDate(this.eventManager.utils.formatResponse(events, dates, false, this.hiddenCalendars));
        return enyo.application.share({days: results});
    },
    shareEvents                : function shareEvents() {
        return enyo.application.share({events: []}, {keep: true});
    },
    mapEventsByDate            : function mapEventsByDate(eventDays) {
        if (!(eventDays && Array.isArray(eventDays))) {
            this.warn("---:---: Unable to transform invalid events array: ", eventDays);
            return;
        }

        var date = this.timeMachine,
            eventCount = 0,
            days = {};
        for (var i = 0, numDays = eventDays.length; i < numDays; ++i) {
            date.setTime(eventDays[i].date);
            date.clearTime();
            days [String(+date)] = {
                allDayEvents: eventDays[i].allDayEvents,
                events      : eventDays[i].events,
                hiddenAllDay: eventDays[i].hiddenAllDay,
                hiddenEvents: eventDays[i].hiddenEvents
            };
            DEBUG && (eventCount = eventCount + eventDays[i].allDayEvents.length + eventDays[i].events.length + eventDays[i].hiddenAllDay.length + eventDays[i].hiddenEvents.length);
        }

        DEBUG && this.log("\tQueued [", eventCount, "] events for rendering...\t");//\n\n\t", weekEvents, "\n\n\t");
        return days;
    },
    //ENDSECTION


    //CUT HERE for old code
    // TODO: We need to move the functionality provided by accountsAndCalendarsChanged into CalendarsManager
    accountsAndCalendarsChanged: function accountsAndCalendarsChanged(oldAccountsAndCalendars) {

        // Ignore accountsAndCalendars immediately.  The idea is that we are only using
        // this to get the initial show/hide status of calendars and let the CalendarList
        // component take over from there.  There are still holes, though, so the show/hide
        // status stuff should be moved from CalendarList to CalendarsManager.
        enyo.application.ignore({ accountsAndCalendars: this });

        var calendars = {},
            calendarsList = enyo.application.calendarsManager.getCalendarsList({ sorted: true });
        for (var calendar, i = 0, j = calendarsList.length; i < j; ++i) {
            calendar = calendarsList [i];
            calendars [calendar._id] = { color: calendar.color, on: !!calendar.visible };
        }
        this.setCalendars(calendars);
    },

    calendarsChanged: function calendarsChanged(oldCalendars) {
        if (!this.calendars) {
            return;
        }

        var calendars = this.calendars,
            hidden = this.hiddenCalendars = {},
            ids = Object.keys(calendars);
        for (var calendar, id, i = 0, j = ids.length; i < j; ++i) {
            id = ids [i];
            !calendars [id].on && (hidden [id] = true);
        }
    },

    currentDateChanged: function currentDateChanged(oldDate) {
        //DEBUG && this.log ("\t\t");	// TODO: Update cached event occurrences when currentDate moves out of the cache window (i.e. 3 months).
    },

    filterEvents: function filterEvents(eventSet, dates, calendars) {
        this.calendars = calendars;
        this.calendarsChanged();
        return this.eventManager.utils.formatResponse(eventSet, dates, undefined, this.hiddenCalendars);
    }

});
