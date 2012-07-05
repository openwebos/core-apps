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
/**
 *    Calendar's Free/Busy Time Manager.
 *
 * Copyright 2011 Palm, Inc.  All rights reserved.
 *
 */



/*jslint laxbreak:true, devel:true */
/*global Mojo */

(function () {

    function BusyTime(startDecimal, endDecimal) {
        this.previous = null;
        this.next = null;
        this.startDecimal = startDecimal;
        this.endDecimal = endDecimal;
    }

    /**
     * When adding new time, we first check to see whether the new time results in
     * an expansion of the current time this object already represents.
     *
     * If not, we create a new busy time.
     */
    BusyTime.prototype.addTime = function addTime(newStart, newEnd) {
        // Current interval:	|------------|
        // New interval:		   |-----|
        // Result:				no change
        if (newStart >= this.startDecimal && newEnd <= this.endDecimal) {
            return; // Do nothing, new time is already within current busy time
        }

        // Current interval:		|----|
        // New interval:		|------------|
        // Result:				|------------|
        else if (newStart <= this.startDecimal && newEnd >= this.endDecimal) {
            this.startDecimal = newStart;
            this.endDecimal = newEnd;
        }

        // Current interval:	|------------|
        // New interval:		     |-------------|
        // Result:				|------------------|
        else if (newStart >= this.startDecimal && newStart <= this.endDecimal && newEnd > this.endDecimal) {
            this.endDecimal = newEnd;
        }

        // Current interval:		|------------|
        // New interval:		|---------|
        // Result:				|----------------|
        else if (newStart < this.startDecimal && newEnd >= this.startDecimal && newEnd <= this.endDecimal) {
            this.startDecimal = newStart;
        }

        // Current interval:	|-----|
        // New interval:		         |-----|
        // Result:				add to next busy time
        else if (newStart > this.endDecimal) {
            if (!this.next) {
                this.next = new BusyTime(newStart, newEnd);
                this.next.previous = this;
            }
            // insert between current and next
            else if (newEnd < this.next.startDecimal) {
                var newNext = new BusyTime(newStart, newEnd);
                newNext.previous = this;
                newNext.next = this.next;
                this.next.previous =
                    this.next = newNext;
            }
            else {
                this.next.addTime(newStart, newEnd);
            }
        }

        // Current interval:				|-----|
        // New interval:		|-----|
        // Result:				add to previous busy time
        else if (newEnd < this.startDecimal) {
            if (!this.previous) {
                this.previous = new BusyTime(newStart, newEnd);
                this.previous.next = this;
            }
            // insert between current and previous
            else if (newStart > this.previous.endDecimal) {
                var newPrevious = new BusyTime(newStart, newEnd);
                newPrevious.next = this;
                newPrevious.previous = this.previous;
                this.previous.next =
                    this.previous = newPrevious;
            }
            else {
                this.previous.addTime(newStart, newEnd);
            }
        }

        // We should've covered all cases by now!
        else {
            console.log("Unhandled case in BusyTime.addTime()!");
        }

    };

    /**
     * Returns the root of the list,
     * a BusyTime object representing the first busy time in the day
     */
    BusyTime.prototype.getRoot = function getRoot() {
        return this.getRootRecursively(this);
    };

    BusyTime.prototype.getRootRecursively = function getRootRecursively(node) {
        if (!node.previous) {
            return node;
        }
        return this.getRootRecursively(node.previous);
    };

    BusyTime.prototype.coalesce = function coalesce() {
        var root = this.getRoot();
        var node = root;
        while (node) {
            if (node.previous) {
                if (node.previous.endDecimal >= node.startDecimal) {
                    if (node.previous.endDecimal < node.endDecimal) {
                        node.previous.endDecimal = node.endDecimal;
                    }
                    node.previous.next = node.next;
                    if (node.next) {
                        node.next.previous = node.previous;
                    }
                }
            }
            node = node.next;
        }
        return root;
    };

    BusyTime.prototype.toArray = function toArray() {
        var array = [];
        var node = this.coalesce();
        while (node) {
            array.push({start_decimal: node.startDecimal, end_decimal: node.endDecimal});
            node = node.next;
        }
        return array;
    };

    /****************************************************************************************/

    function FreeTime(startDecimal, endDecimal) {
        this.next = null;
        this.previous = null;
        this.startDecimal = startDecimal || 0;		// Initial free time start
        this.endDecimal = endDecimal || 2400;	// Initial free time end
    }

    FreeTime.prototype.EMPTY = -1;
    /**
     * When adding new time, we first check to see whether the new time results in
     * an expansion of the current time this object already represents.
     *
     * If not, we create a new free time.
     */
    FreeTime.prototype.addEventTime = function addEventTime(newStart, newEnd) {
        // If this free time is empty, just pass on to next free time
        if (this.isEmpty()) {
            if (this.next) {
                this.next.addEventTime(newStart, newEnd);
            }
        }
        // Current free time:	|------------|
        // Event interval:		   |-----|
        // Result:				|--|     |---|  shorten current free time, add new free time
        else if (newStart >= this.startDecimal && newEnd <= this.endDecimal) {
            if (!this.next) {
                this.next = new FreeTime(newEnd, this.endDecimal);
                this.next.previous = this;
            }
            // insert between current and next
            else {
                var newNext = new FreeTime(newEnd, this.endDecimal);
                newNext.previous = this;
                newNext.next = this.next;
                this.next.previous =
                    this.next = newNext;
            }

            this.endDecimal = newStart;
            return;
        }

        // Current free time:		|----|
        // Event interval:		|------------|
        // Result:				this free time is empty, add to next free time
        else if (newStart <= this.startDecimal && newEnd >= this.endDecimal) {
            this.setEmpty();

            if (this.next) {
                this.next.addEventTime(newStart, newEnd);
            }
        }
        // Current free time:	|------------|
        // Event interval:		     |-------------|
        // Result:				|----|    shorten current free time, add to next free time
        else if (newStart >= this.startDecimal && newStart <= this.endDecimal && newEnd > this.endDecimal) {
            this.endDecimal = newStart;

            if (this.next) {
                this.next.addEventTime(newStart, newEnd);
            }
        }

        // Current free time:		|------------|
        // Event interval:		|---------|
        // Result:				          |------|	shorten current free time
        else if (newStart < this.startDecimal && newEnd >= this.startDecimal && newEnd <= this.endDecimal) {
            this.startDecimal = newEnd;
        }

        // Current free time:	|-----|
        // Event interval:		         |-----|
        // Result:				add to next free time
        else if (newStart > this.endDecimal) {
            if (this.next) {
                this.next.addEventTime(newStart, newEnd);
            }
        }

        // Current free time:				|-----|
        // Event interval:		|-----|
        // Result:				dont care
        else if (newEnd < this.startDecimal) {
            return;	// dont care
        }

        // We should've covered all cases by now!
        else {
            console.log("Unhandled case in FreeTime.addTime()!");
        }
    };

    FreeTime.prototype.setEmpty = function setEmpty() {
        this.startDecimal = this.EMPTY;
        this.endDecimal = this.EMPTY;
    };

    FreeTime.prototype.isEmpty = function isEmpty() {
        return (this.startDecimal === this.EMPTY) || (this.endDecimal === this.EMPTY) || (this.startDecimal === this.endDecimal);
    };

    /**
     * Returns the root of the list.
     * @return FreeTime object representing the first free time in the day
     */
    FreeTime.prototype.getRoot = function getRoot() {
        return this.getRootRecursively(this);
    };

    FreeTime.prototype.getRootRecursively = function getRootRecursively(node) {
        if (!node.previous) {
            return node;
        }

        return this.getRootRecursively(node.previous);
    };

    FreeTime.prototype.toArray = function toArray(minEventHeight, minFreeSize) {
        var array = [];
        var node = this.getRoot();

        while (node) {
            if ((!node.isEmpty()) && // Ignore empty free times
                ( node.startDecimal !== 0) && // Ignore free time before first event
                ( node.endDecimal !== 2400))    // Ignore free time after last event
            {
                // Make sure free times is larger then the minimum free size
                if ((node.endDecimal - node.startDecimal) > minFreeSize) {
                    // Make sure free times don't overlap events less than the minimum event height
                    if (node.previous && ((node.startDecimal - node.previous.endDecimal) < minEventHeight)) {
                        node.startDecimal = node.previous.endDecimal + minEventHeight;
                    }

                    array.push({
                        duration     : node.endDecimal - node.startDecimal,
                        end_decimal  : node.endDecimal,
                        start_decimal: node.startDecimal
                    });
                }
            }

            node = node.next;
        }
        return array;
    };

    /*
     * Helper function to calc busy times given an array of events
     * @param events: the list of events for which to calculate busy time
     * @param excludedCalendars: a list of calendars. If an event belongs to one of these
     *							calendars, it will not be included in the busy time calculation
     * @param useTrueDecimals: an event should have two pairs of layout info attached:
     *			start_decimal, end_decimal: which may have been adjusted for minimum height requirements when drawing event boxes
     *			true_start_decimal, true_end_decimal: which should correspond directly to the start/end times of the events.
     *			If useTrueDecimals is true, then the true_*_decimal numbers will be used.
     */
    function calcBusyTimes(events, excludedCalendars, useTrueDecimals) {
        if (!events || !events.length) {
            return [];
        }

        var busyTimes;
        var start;
        var end;
        for (var event, i = 0, j = events.length; i < j; i++) {
            event = events[i];

            if (excludedCalendars && excludedCalendars [event.calendarId]) {
                // Skip events in excluded calendars:
                continue;
            }
            if (useTrueDecimals) {
                start = event.true_start_decimal;
                end = event.true_end_decimal;
            }
            else {
                start = event.start_decimal;
                end = event.end_decimal;
            }
            if (!busyTimes) {
                busyTimes = new BusyTime(start, end);
            } else {
                busyTimes.addTime(start, end);
            }
        }
        return busyTimes ? busyTimes.toArray() : [];
    }

    /*
     * Helper function to calc free times given an array of busy times
     */
    function calcFreeTimes(busyTimes, minEventHeight, minFreeSize) {
        if (!busyTimes || !busyTimes.length) {
            return [];
        }

        //Zero should be an allowable value, but if it's null or undefined, use a default.
        if (!isFinite(minEventHeight) || minEventHeight === null) {
            minEventHeight = 50;
        }
        if (!isFinite(minFreeSize) || minFreeSize === null) {
            minFreeSize = 150;
        }

        var freeTimes = new FreeTime();
        for (var busy, i = 0, j = busyTimes.length; i < j; i++) {
            busy = busyTimes[i];
            freeTimes.addEventTime(busy.start_decimal, busy.end_decimal);
        }
        return freeTimes.toArray(minEventHeight, minFreeSize);
    }

    function BusyFreeManager() {
    }

    BusyFreeManager.prototype.getBusyTimes = function getBusyTimes(eventList, excludedCalendars, useTrueDecimals) {
        return calcBusyTimes(eventList, excludedCalendars, useTrueDecimals);
    };

    BusyFreeManager.prototype.getFreeTimes = function getFreeTimes(busyTimes, minEventHeight, minFreeSize) {
        return calcFreeTimes(busyTimes, minEventHeight, minFreeSize);
    };

    // Create the singular private BusyFreeManager instance:
    var singleton = new BusyFreeManager();

    // Override the BusyFreeManager constructor to always returns its singular instance:
    this.BusyFreeManager = function BusyFreeManager() {
        return singleton;
    };
})();
