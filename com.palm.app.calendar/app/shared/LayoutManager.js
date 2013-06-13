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
 *    Calendar's Layout Manager:
 */



(function () {
    /** Closure that defines the LayoutManager component. */


    function LayoutManager() {
        /**
         *    Layout Manager Constructor:
         *
         *    Each Calendar view is expected to create an instance and overload its render method.
         */
    }


    var testable;	// Stores all testable code units.

    LayoutManager.getTestable = function () {
        /**
         *    Returns an object whose properties are units that can be tested.
         *    Only returns these internal entities if a valid LayoutManagerTests instance is
         *    provided as the first parameter.
         *
         *    @return    testable    An object whose properties are testable units.
         */

        return    testable || (testable = {
            compareEvents   : compareEvents,
            getOverlapGroups: getOverlapGroups,
            isArray         : nonNativeIsArray,
            Row             : Row,
            setOverlapCounts: setOverlapCounts,
            setPositions    : setPositions
        });
    };


    LayoutManager.prototype.positionEvents = function positionEvents(eventList, options) {
        /**
         *    Sets positioning properties of each event in the eventList to support proper rendering.
         *
         *    @param eventList    Array    : List of events.
         *    @param options        Object    : Various options for positioning the events.
         *                        { overlap	: Boolean	: Indicates whether overlap information should be calculated.
         *                        , sort        : Boolean    : Indicates whether the event list should be sorted.
         *                        }
         */

        if (!isArray(eventList) || eventList.length <= 0) {    // If eventList is not an aray or is empty:
            return;												//		Exit since there's nothing to position.
        }

        var hasOptions = options && ("object" == typeof options),
            doOverlap = hasOptions && ("overlap"    in    options ? !!options.overlap : true),
            doSort = hasOptions && ("sort"        in    options ? !!options.sort : true);

        doSort && eventList.sort(compareEvents);						// Sort events by start time.
        setPositions(eventList);										// Position events relative to a 24Hr time range.
        doOverlap && setOverlapCounts(getOverlapGroups(eventList));	// Position events relative to each other.
    };

    function compareEvents(event1, event2) {
        /**
         *    Comparator for sorting events by start time:
         *
         *    @param event1    The first of two events to be compared.
         *    @param event2    The second of two events to be compared.
         */
        return (event1 && event2) ? (event1.renderStartTime - event2.renderStartTime) : 0;
    }


    function isArray(item) {
        /**
         *    Determines if @param item is an Array.
         */
        var isObject = !!item && ("object" == typeof item),
            hasConstructor = isObject && ("function" == typeof item.constructor),
            isLocalArray = hasConstructor && (Array == item.constructor),
            matchToString = Object.prototype.toString.call(item) === "[object Array]";

        if (!matchToString) {
            return false;
        }
        if (isLocalArray) {
            return true;
        }

        var content = String(Math.random()), // Create random content.
            array = hasConstructor && item.constructor(content), // Create an array with the item's constructor using random content.
            isArray = !!array && (typeof array == "object") && (array[0] === content);	// Was an array created with the expected content?
        return isArray && isFinite(array.length);
    }

    var nonNativeIsArray = isArray;	//keep a copy of this thing around so we can test it.

    // Publish compareEvents as a LayoutManager class method:
    LayoutManager.compareEvents = compareEvents;

    // Publish isArray as a LayoutManager class method:
    LayoutManager.isArray = isArray = (typeof Array.isArray == "function") ? Array.isArray : isArray;

    // Publish LayoutManager in the current scope (global or something else if this is script's text is being eval'd):
    this.LayoutManager = LayoutManager;


    function Row(rowIndex, firstEvent) {
        /**
         *    Ported from Java Calendar Service.
         *
         *    Private class used by LayoutManager to represent a row of events in the calendar.
         *
         *    @param rowIndex        Row index from the bottom.
         *    @param firstEvent    Event to add.
         */

            // Zero-based row index from the bottom.
        this.index = rowIndex || 0;

        // Events in this row
        this.events = [];
        this.addEvent(firstEvent);
    }


    Row.prototype.addEvent = function addEvent(event) {
        /**
         *    Ported from Java Calendar Service.
         *
         *    Try to add an event into a row so that it doesn't intersect the ones
         *    that are already in that row. This function sets the overlap_index
         *    for the event.
         *
         *    @param    event    Event to add
         *    @return    true if successfully added, false if there's already an
         *            event in the row in this space.
         */

        if (!event) {
            return false;
        }

        for (var e, all = this.events, i = 0, j = all.length; i < j; ++i) {
            e = all[ i ];
            if (e.start_decimal >= event.end_decimal) {
                break;
            }
            if (e.end_decimal > event.start_decimal) {
                return false;
            }
        }

        this.events.push(event);
        event.overlap_index = this.index;
        return true;
    };


    function getOverlapGroups(eventList) {
        /**
         *    Ported from the Java Calendar Service.
         *
         *    Create groups of overlapping events:
         *
         *    @param eventList    An array of events.
         *
         *
         *    |----| |----|
         *    |----| |    |   <- 1st overlap group (i.e. 2 per width)
         *         |----|
         *
         *    |--||--||--|
         *    |--||  ||--|    <- 2nd overlap group (i.e. 3 per width)
         *        |--|
         *
         *    |-----------|
         *    |           |   <- 3rd overlap group (i.e. 1 per width)
         *    |-----------|
         */

        var groups = [], // Array of all event groups
            group, // Placeholder for current group of events
            groupEnd = eventList[0].start_decimal, // Placeholder for current group's end time
            groupId = -1;

        // Since the list is sorted by start times, we only need to compare
        // event end times to determine if they intersect the current group.
        for (var end, event, i = 0, j = eventList.length; i < j; i++) {

            event = eventList[i];
            end = event.end_decimal;

            if (event.start_decimal >= groupEnd) {
                groupId++;
                group = [event];
                event.group_id = groupId;
                groups.push(group);
                groupEnd = end;
                continue;
            }
            event.group_id = groupId;
            group.push(event);

            if (end > groupEnd) {
                groupEnd = end;
            }
        }

        return groups;
    }


    function setOverlapCounts(groups) {
        /**
         *    Ported from the Java Calendar Service.
         *
         *    @param groups    An array of arrays of events.
         */
        // TODO: Performance analysis needed.

        for (var events, rows, g = 0, gl = groups.length; g < gl; ++g) {

            events = groups[ g ];
            rows = [];

            group_loop:
                for (var e = 0, el = events.length; e < el; ++e) {
                    for (var r = 0, rl = rows.length; r < rl; ++r) {
                        if (rows[ r ].addEvent(events[ e ])) {
                            continue group_loop;
                        }
                    }

                    // Couldn't squeeze the event in the existing rows - we need another row:
                    rows.push(new Row(rows.length, events[ e ]));
                }

            // Now we know what's the number of rows we need, let's fill in the overlap_count:
            for (var overlapCount = rows.length, e1 = events.length; e1--;) {
                events[ e1 ].overlap_count = overlapCount;
            }

            /* Comment preserved from Java Calendar Service:
             *
             * TODO: A useful thing would be to expand the width to include
             * all the available space (look at elements 2 and 7). We need to
             * implement this in the layout first.
             *
             *   |===|    |==5==|  |===|
             *   |=2=||==3==|      |=7=|
             * |===1===||==4==||===6====|
             *
             */
        }
    }


    function setPositions(eventList) {
        /**
         *    Sets start and end decimal position values of each event in the eventList to support proper rendering.
         *
         *    @param eventList    An array of events.
         */

        // Set start and end decimals for listed events:
        for (var event, i = 0, j = eventList.length; i < j; ++i) {
            event = eventList [i];
            var end = new Date(event.renderEndTime),
                endHour = end.getHours(),
                endMinute = end.getMinutes(),
                start = new Date(event.renderStartTime);

            // Events ending at midnight have an "hour" of 0 since midnight is also the
            // beginning of a 24-hour day. Therefore set hour to 24 (day's end) if the event's
            // end day is different from its start day:
            if (!endHour && !endMinute && (end.toDateString() != start.toDateString())) {
                endHour = 24;
            }

            // Calculate the start and end decimal units used to render this event:
            event.start_decimal =
                start = start.getHours() * 100 + (start.getMinutes() * 10) / 6;
            end = endHour * 100 + (endMinute * 10) / 6;

            // Events must be at least 50 units tall to display their description so
            // if this event's render height is less than 50 units reset it to 50 units:
            event.end_decimal = (end - start < 50) ? (start + 50) : end;

            //For accurate free time reporting in agenda view, we need true start/end decimals,
            //that directly represent the event's start and end time, not those that have
            //been adjusted for the 30-minute minimum display height.
            event.true_start_decimal = event.start_decimal;
            event.true_end_decimal = end;
        }

        return eventList;
    }

})();
