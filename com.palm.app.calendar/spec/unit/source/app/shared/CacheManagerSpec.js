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


/*
 * CacheManager Unit Test Specs
 * I hope for your sanity that your editor has code folding.
 */

function EventManager() {
    //clone the results, because some of the tests do modify this.
    this.queryResults = EventManager.prototype.queryResults.slice(0);
}
EventManager.prototype = {
    getEvents                   : function () {
        return true;
    },
    utils                       : {
        formatResponse: function (events, days, whocares, hidden) {
            return [];
        }
    },
    getEventsInRange            : function () {
        return {
            'days': [
                {
                    date        : 1292659200000,
                    events      : [
                        {
                            "_id"               : "++HVowZQy5WRusag",
                            "_kind"             : "com.palm.calendarevent:1",
                            "accountId"         : "++HM6sJVRCK4_5D7",
                            "calendarId"        : "++HM6sN4VPZ3aGzr",
                            "dtend"             : 1292695200000,
                            "dtstart"           : 1292691600000,
                            "currentLocalEnd"   : 1292695200000,
                            "currentLocalStart" : 1292691600000,
                            "renderEndTime"     : 1292695200000,
                            "renderStartTime"   : 1292691600000,
                            "location"          : "",
                            "note"              : "",
                            "subject"           : "Test 1",
                            "tzId"              : "America/Los_Angeles",
                            "eventDisplayRevset": 1
                        },
                        {
                            "_id"               : "++HVowZQy5WRusah",
                            "_kind"             : "com.palm.calendarevent:1",
                            "accountId"         : "++HM6sJVRCK4_5D7",
                            "calendarId"        : "++HM6sN4VPZ3aGzr",
                            "dtend"             : 1292695800000,
                            "dtstart"           : 1292692200000,
                            "currentLocalEnd"   : 1292695800000,
                            "currentLocalStart" : 1292692200000,
                            "renderEndTime"     : 1292695800000,
                            "renderStartTime"   : 1292692200000,
                            "location"          : "",
                            "note"              : "",
                            "subject"           : "Test 2",
                            "tzId"              : "America/Los_Angeles",
                            "eventDisplayRevset": 2
                        },
                        {
                            "_id"               : "++HVowZQy5WRusai",
                            "_kind"             : "com.palm.calendarevent:1",
                            "accountId"         : "++HM6sJVRCK4_5D7",
                            "calendarId"        : "++HM6sN4VPZ3aGzr",
                            "dtend"             : 1292696400000,
                            "dtstart"           : 1292692800000,
                            "currentLocalEnd"   : 1292696400000,
                            "currentLocalStart" : 1292692800000,
                            "renderEndTime"     : 1292696400000,
                            "renderStartTime"   : 1292692800000,
                            "location"          : "",
                            "note"              : "",
                            "subject"           : "Test 3",
                            "tzId"              : "America/Los_Angeles",
                            "eventDisplayRevset": 3
                        }
                    ],
                    allDayEvents: [],
                    hiddenEvents: [],
                    hiddenAllDay: []
                }
            ]
        }
    },
    observeDatabaseChanges      : function () {
        return;
    },
    stopObservingDatabaseChanges: function () {
        return;
    },
    cancelGetEventsInRange      : function () {
    },
    queryResults                : [
        {
            "_id"               : "++HVowZQy5WRusag",
            "_kind"             : "com.palm.calendarevent:1",
            "accountId"         : "++HM6sJVRCK4_5D7",
            "calendarId"        : "++HM6sN4VPZ3aGzr",
            "dtend"             : 1292695200000,
            "dtstart"           : 1292691600000,
            "location"          : "",
            "note"              : "",
            "subject"           : "Test 1",
            "tzId"              : "America/Los_Angeles",
            "eventDisplayRevset": 1
        },
        {
            "_id"               : "++HVowZQy5WRusah",
            "_kind"             : "com.palm.calendarevent:1",
            "accountId"         : "++HM6sJVRCK4_5D7",
            "calendarId"        : "++HM6sN4VPZ3aGzr",
            "dtend"             : 1292695800000,
            "dtstart"           : 1292692200000,
            "location"          : "",
            "note"              : "",
            "subject"           : "Test 2",
            "tzId"              : "America/Los_Angeles",
            "eventDisplayRevset": 2
        },
        {
            "_id"               : "++HVowZQy5WRusai",
            "_kind"             : "com.palm.calendarevent:1",
            "accountId"         : "++HM6sJVRCK4_5D7",
            "calendarId"        : "++HM6sN4VPZ3aGzr",
            "dtend"             : 1292696400000,
            "dtstart"           : 1292692800000,
            "location"          : "",
            "note"              : "",
            "subject"           : "Test 3",
            "tzId"              : "America/Los_Angeles",
            "eventDisplayRevset": 3
        }
    ]
}

var MockCalendarsManager = (function () {
    var calendars = [
        {
            "_id"           : "++HM6sN4VPZ3aGzr",
            "_kind"         : "com.palm.calendar:1",
            "_sync"         : true,
            "accountId"     : "++HM6sJVRCK4_5D7",
            "calendarRevset": 1,
            "color"         : "blue",
            "excludeFromAll": false,
            "isReadOnly"    : false,
            "name"          : "Palm Profile",
            "syncSource"    : "Local",
            "visible"       : true
        },
        {
            "_id"           : "++Hi5iQLpFBvs9dU",
            "_kind"         : "com.palm.calendar.eas:1",
            "accountId"     : "++Hdct1z0XF3siEx",
            "calendarRevset": 2,
            "color"         : "red",
            "lastSyncRev"   : 2,
            "lastSyncTime"  : 2147483647,
            "name"          : "Calendar",
            "serverId"      : "1",
            "serverParentId": "0",
            "serverType"    : 8,
            "syncKey"       : "1594137524",
            "visible"       : false
        }
    ];

    function getCalendarsList() {
        return JSON.parse(JSON.stringify(calendars));	// Return a copy of the calendars.
    }

    return {
        getCalendarsList: getCalendarsList
    };
})();

describe("CacheManager", function () {
    var cm = calendar.CacheManager;

    //Scaffold Test 1 sets up the cache with only the events in the mock harness above
    function setupScaffoldTest1(instance) {
        instance.eventCache = {
            "++HVowZQy5WRusag": {
                instances: []
            },
            "++HVowZQy5WRusah": {
                instances: []
            },
            "++HVowZQy5WRusai": {
                instances: []
            }
        }
        var em = new EventManager();
        var days = em.getEventsInRange(); //this will get us a days array that should look correct.
        var args = days.days;
        instance.populateTimestampCache(args, function () {
        });
    }

    var defaultExpectedECache = {
        "++HVowZQy5WRusag": {
            "instances": [],
            "index"    : 0,
            "id"       : "++HVowZQy5WRusag",
            "revSet"   : 1,
            "dtstart"  : 1292691600000,
            "dtend"    : 1292695200000
        },
        "++HVowZQy5WRusah": {
            "instances": [],
            "index"    : 1,
            "id"       : "++HVowZQy5WRusah",
            "revSet"   : 2,
            "dtstart"  : 1292692200000,
            "dtend"    : 1292695800000
        },
        "++HVowZQy5WRusai": {
            "instances": [],
            "index"    : 2,
            "id"       : "++HVowZQy5WRusai",
            "revSet"   : 3,
            "dtstart"  : 1292692800000,
            "dtend"    : 1292696400000
        }
    };
    //scaffold test 2 looks a lot like 1, but with the last event missing
    function setupScaffoldTest2(instance) {
        instance.eventCache = {
            "++HVowZQy5WRusag": {
                instances: []
            },
            "++HVowZQy5WRusah": {
                instances: []
            }
        }
        var em = new EventManager();
        em.queryResults = em.queryResults.slice(0, -1);
        var days = em.getEventsInRange(); //this will get us a days array that should look correct.
        days.days[0].events = days.days[0].events.slice(0, -1);
        var args = days.days;
        instance.populateTimestampCache(args, function () {
        });
    }

    describe("buildRangesForDays(): Test Suite", function () {
        var instance = new cm();
        it('Should return an empty list when argument range is empty', function () {
            var testRange = [];
            var expected = [];
            var result = instance.buildRangesForDays(testRange);
            expect(result).toEqual(expected);
        });

        it("When given a single day in its argument array, should return a single range covering only that day", function () {
            var testRange = [1315897200000];
            var expected = [
                [1315897200000, 1315983599999]
            ];
            var result = instance.buildRangesForDays(testRange);
            expect(result).toEqual(expected);
        });
        it('When multiple days are given for the argument, all of which are contiguous, should return a single range covering all days', function () {
            var testRange = [1315897200000, 1315983600000, 1316070000000, 1316156400000, 1316242800000, 1316329200000];
            var expected = [
                [1315897200000, 1316415599999]
            ];
            var result = instance.buildRangesForDays(testRange);
            expect(result).toEqual(expected);
        });

        it("When multiple days are given for the argument, at least one of which is non-contiguous, should return a list of correct ranges for the given days", function () {
            //2011-9-13 at 0:00, 9-14, 9-15, 9-17. 9-18
            var testRange = [1315897200000, 1315983600000, 1316070000000, 1316242800000, 1316329200000];
            //[2011-9-13 at 0:00 to 2011-9-15 at 23:59:59], [2011-9-17 at 0:00 to 2011-9-18 at 23:59:59]
            var expected = [
                [1315897200000, 1316156399999],
                [1316242800000, 1316415599999]
            ];
            var result = instance.buildRangesForDays(testRange);
            expect(result).toEqual(expected);
        });
        it("Should be able to handle its arguments not being in ascending order", function () {
            //test backwards arrays
            var testRange = [1315897200000, 1315983600000, 1316070000000, 1316242800000, 1316329200000];
            testRange.reverse();
            var expected = [
                [1315897200000, 1316156399999],
                [1316242800000, 1316415599999]
            ];
            var result = instance.buildRangesForDays(testRange);
            expect(result).toEqual(expected);
        });
    });

    describe("calculateRanges(): Test Suite", function () {
        it("Should return all ranges in the current timestampCache", function () {
            var instance = new cm();
            instance.timestampCache = {
                1315897200000: [],
                1315983600000: [],
                1316070000000: [],
                1316242800000: [],
                1316329200000: []
            }
            var expected = [
                [1315897200000, 1316156399999],
                [1316242800000, 1316415599999]
            ];
            var result = instance.calculateRanges();
            expect(result).toEqual(expected);

            //other tests on this function are covered by buildRangesForDays as this function simply calls buildRangesForDays
        });
    });

    describe("getMissingDays(): Test Suite", function () {
        var instance = new cm();
        var defaultCache = {
            1315897200000: [],
            1315983600000: [],
            1316070000000: [],
            1316242800000: [],
            1316329200000: []
        };
        it("For a range covering multiple midnights, at least one of which is not in the cache, " +
            "the function should return an array containing every midnight not in the cache.", function () {
            instance.timestampCache = defaultCache;
            var expected = [1316156400000];
            var result = instance.getMissingDays(1315897200000, 1316329200000 - 1, instance.timestampCache);
            expect(result).toEqual(expected);
        });
        it("For a range containing only a single midnight, the function should return an array " +
            "containing that day if it is not currently in the timestamp cache.", function () {
            instance.timestampCache = defaultCache;
            var expected = [];
            var result = instance.getMissingDays(1315897200000, 1315983600000 - 1, instance.timestampCache);
            expect(result).toEqual(expected);
            expected = [1316156400000];
            var result = instance.getMissingDays(1316156400000, 1316242800000 - 1, instance.timestampCache);
            expect(result).toEqual(expected);
        });
        it("For a range covering multiple midnights, all of which are in the cache, " +
            "the function should return an empty array.", function () {
            instance.timestampCache = defaultCache;
            var expected = [];
            var result = instance.getMissingDays(1315897200000, 1316156400000 - 1, instance.timestampCache);
            expect(result).toEqual(expected);
        });
        it("For any range covering at least one midnight timestamp, if the timestamp cache is " +
            "completely empty, every midnight in the input range should be returned.", function () {
            instance.timestampCache = {};
            var expected = [1315897200000, 1315983600000, 1316070000000, 1316156400000, 1316242800000];
            var result = instance.getMissingDays(1315897200000, 1316329200000 - 1, instance.timestampCache);
            expect(result).toEqual(expected);
        })
    });

    describe("populateTimestampCache(): Test Suite", function () {
        it("For an empty input days array, the timestamp and event caches should remain unchanged.",
            function () {
                var instance = new cm();
                instance.populateTimestampCache([], function () {
                });

                expect(instance.timestampCache).toEqual({});
                expect(instance.eventCache).toEqual({});
            });
        it('For a days array containing new events, the new event instances should be in the ' +
            'timestamp cache, and those instances should be noted in the event cache instances list ' +
            'for the new events.', function () {
            var instance = new cm();

            //we're testing PTC using the call in setupScaffoldTest1 here, rather than calling it ourself.
            setupScaffoldTest1(instance);
            var result = instance.timestampCache;
            var expectedTSCache = {
                1292659200000: [
                    ["++HVowZQy5WRusag", 1292691600000, 1292695200000, 1292691600000, 1292695200000, 1],
                    ["++HVowZQy5WRusah", 1292692200000, 1292695800000, 1292692200000, 1292695800000, 2],
                    ["++HVowZQy5WRusai", 1292692800000, 1292696400000, 1292692800000, 1292696400000, 3]
                ]
            }
            //expect the timestampCache to look exactly like the above.
            //Using JSON.stringify because the access time change breaks .toEqual when comparing
            //arrays.
            expect(JSON.stringify(result)).toEqual(JSON.stringify(expectedTSCache));

            //expect the instances entries for each of the events to contain 1292659200000
            expect(instance.eventCache["++HVowZQy5WRusag"].instances).toEqual([1292659200000]);
            expect(instance.eventCache["++HVowZQy5WRusah"].instances).toEqual([1292659200000]);
            expect(instance.eventCache["++HVowZQy5WRusai"].instances).toEqual([1292659200000]);
        });
        it('Day access times should be updated when the function is run on every day that has updates.',
            function () {
                var instance = new cm();
                var start = +Date.now();
                setupScaffoldTest1(instance);
                expect(instance.timestampCache["1292659200000"].accessTime).not.toBeLessThan(start);
            });
        it("For a days array containing days not currently in the timestamp cache, the new days " +
            "should be inserted into the timestamp cache, with all events for that day being listed " +
            "correctly. All events in the event cache that occur on the new day should have their " +
            "instances list updated to contain the new day.", function () {
            var instance = new cm();
            setupScaffoldTest1(instance);
            //we're going to make "++HVowZQy5WRusag" occur on the next day too
            //so there should be two instances in the event.instances for that event.
            var newDay = [
                {
                    date        : 1292745600000,
                    events      : [
                        {
                            "_id"               : "++HVowZQy5WRusag",
                            "_kind"             : "com.palm.calendarevent:1",
                            "accountId"         : "++HM6sJVRCK4_5D7",
                            "calendarId"        : "++HM6sN4VPZ3aGzr",
                            "dtend"             : 1292695200000,
                            "dtstart"           : 1292691600000,
                            "currentLocalEnd"   : 1292695200000,
                            "currentLocalStart" : 1292691600000,
                            "renderEndTime"     : 1292695200000,
                            "renderStartTime"   : 1292691600000,
                            "location"          : "",
                            "note"              : "",
                            "subject"           : "Test 1",
                            "tzId"              : "America/Los_Angeles",
                            "eventDisplayRevset": 1
                        }
                    ],
                    allDayEvents: [],
                    hiddenAllDay: [],
                    hiddenEvents: []
                }
            ];
            instance.populateTimestampCache(newDay, function () {
            });
            expect(instance.eventCache["++HVowZQy5WRusag"].instances.length).toEqual(2);
            expect(instance.timestampCache["1292745600000"]).not.toBeUndefined();
            expect(instance.timestampCache["1292745600000"][0][0]).toEqual("++HVowZQy5WRusag");
        });
    });

    describe("discardTimestampCache(): Test Suite", function () {
        it("timestampCache should be empty after run", function () {
            var instance = new cm();
            instance.timestampCache.garbage = "HELLO GARBAGE DATA";
            instance.discardTimestampCache();

            expect(instance.timestampCache).toEqual({});
        });
    });

    describe("discardEvent(): Test Suite", function () {
        it('For an event in both caches, if the delete argument is false, the event should be ' +
            'removed only from the timestamp cache', function () {
            var instance = new cm();
            setupScaffoldTest1(instance); //work with the scaffold 1 setup for CacheManager state.

            //test soft deletion (do not unlink from eventCache)
            instance.discardEvent("++HVowZQy5WRusag", false);

            var expectedTSCache = {
                1292659200000: [
                    ["++HVowZQy5WRusah", 1292692200000, 1292695800000, 1292692200000, 1292695800000, 2],
                    ["++HVowZQy5WRusai", 1292692800000, 1292696400000, 1292692800000, 1292696400000, 3]
                ]
            }

            expect(JSON.stringify(instance.timestampCache)).toEqual(JSON.stringify(expectedTSCache));
            expect(instance.eventCache["++HVowZQy5WRusag"].instances).toEqual([]);
        });
        it('For an event in both caches, if the delete argument is true, the event should be ' +
            'removed from both the timestamp and event caches', function () {
            var instance = new cm();
            setupScaffoldTest1(instance); //work with the scaffold 1 setup for CacheManager state.

            //test hard deletion (delete from eventCache too)
            instance.discardEvent("++HVowZQy5WRusag", true);

            var expectedTSCache = {
                1292659200000: [
                    ["++HVowZQy5WRusah", 1292692200000, 1292695800000, 1292692200000, 1292695800000, 2],
                    ["++HVowZQy5WRusai", 1292692800000, 1292696400000, 1292692800000, 1292696400000, 3]
                ]
            }
            expect(JSON.stringify(instance.timestampCache)).toEqual(JSON.stringify(expectedTSCache));
            expect(instance.eventCache["++HVowZQy5WRusag"]).toBeUndefined();
        });
        it('For an event not in either the timestamp nor event caches, both caches ' +
            'should be unchanged.', function () {
            var instance = new cm();
            setupScaffoldTest1(instance); //work with the scaffold 1 setup for CacheManager state.
            var oldECache = JSON.parse(JSON.stringify(instance.eventCache));
            instance.discardEvent("++HVowZQy5WRusaj", true);	//event doesn't exist

            var expectedTSCache = {
                1292659200000: [
                    ["++HVowZQy5WRusag", 1292691600000, 1292695200000, 1292691600000, 1292695200000, 1],
                    ["++HVowZQy5WRusah", 1292692200000, 1292695800000, 1292692200000, 1292695800000, 2],
                    ["++HVowZQy5WRusai", 1292692800000, 1292696400000, 1292692800000, 1292696400000, 3]
                ]
            }
            expect(JSON.stringify(instance.timestampCache)).toEqual(JSON.stringify(expectedTSCache));
            expect(instance.eventCache).toEqual(oldECache);
        });
        it('For an event in the event cache but not in the timestamp cache, the event cache should ' +
            'be modified and the timestamp cache left alone.', function () {
            var instance = new cm();
            setupScaffoldTest2(instance);
            instance.eventCache = JSON.parse(JSON.stringify(defaultExpectedECache)); //insert the missing event from test 1 back into the ecache

            var oldTSCache = JSON.stringify(instance.timestampCache);

            instance.discardEvent("++HVowZQy5WRusai", true);

            expect(instance.eventCache['++HVowZQy5WRusai']).toBeUndefined();
            expect(JSON.stringify(instance.timestampCache)).toEqual(oldTSCache);
        });
    });

    describe("buildEventCache(): Test Suite", function () {
        var instance = new cm();
        var ev = instance.eventManager;
        spyOn(instance, 'updateTimestampCache').andReturn(false);
        it('simple test with default data', function () {
            instance.databaseChanged();

            expect(instance.eventCache).toEqual(defaultExpectedECache);
        });
        it("drop event from cache", function () {
            var savedEvent = ev.queryResults.pop();
            instance.databaseChanged();

            var expectedEvCache = {
                "++HVowZQy5WRusag": {
                    "instances": [],
                    "index"    : 0,
                    "id"       : "++HVowZQy5WRusag",
                    "revSet"   : 1,
                    "dtstart"  : 1292691600000,
                    "dtend"    : 1292695200000
                },
                "++HVowZQy5WRusah": {
                    "instances": [],
                    "index"    : 1,
                    "id"       : "++HVowZQy5WRusah",
                    "revSet"   : 2,
                    "dtstart"  : 1292692200000,
                    "dtend"    : 1292695800000
                }
            };
            expect(instance.eventCache).toEqual(expectedEvCache);
            //reset for the next test
            ev.queryResults.push(savedEvent);
        });
        it('detect a change to revSet and update event objects', function () {
            var target = ev.queryResults.pop();
            var orig = JSON.parse(JSON.stringify(target));

            target.eventDisplayRevset = 4;
            target.dtend = 1292698800000;
            target.dtstart = 1292695200000;
            ev.queryResults.push(target);

            instance.databaseChanged();

            var expectedEvCache = {
                "++HVowZQy5WRusag": {
                    "instances": [],
                    "index"    : 0,
                    "id"       : "++HVowZQy5WRusag",
                    "revSet"   : 1,
                    "dtstart"  : 1292691600000,
                    "dtend"    : 1292695200000
                },
                "++HVowZQy5WRusah": {
                    "instances": [],
                    "index"    : 1,
                    "id"       : "++HVowZQy5WRusah",
                    "revSet"   : 2,
                    "dtstart"  : 1292692200000,
                    "dtend"    : 1292695800000
                },
                "++HVowZQy5WRusai": {
                    "instances": [],
                    "index"    : 2,
                    "id"       : "++HVowZQy5WRusai",
                    "revSet"   : 4,
                    "dtstart"  : 1292695200000,
                    "dtend"    : 1292698800000
                }
            };
            expect(instance.eventCache).toEqual(expectedEvCache);
            ev.queryResults.pop();
            ev.queryResults.push(orig);
            instance.eventCache = {};
        });
        it('add a new event to cache', function () {
            var newEv = JSON.parse(JSON.stringify(ev.queryResults[0]));
            newEv._id = "ANEWEVENT";
            newEv.eventDisplayRevset = 4;
            ev.queryResults.push(newEv);

            instance.databaseChanged();

            var expectedEvCache = {
                "++HVowZQy5WRusag": {
                    "instances": [],
                    "index"    : 0,
                    "id"       : "++HVowZQy5WRusag",
                    "revSet"   : 1,
                    "dtstart"  : 1292691600000,
                    "dtend"    : 1292695200000
                },
                "++HVowZQy5WRusah": {
                    "instances": [],
                    "index"    : 1,
                    "id"       : "++HVowZQy5WRusah",
                    "revSet"   : 2,
                    "dtstart"  : 1292692200000,
                    "dtend"    : 1292695800000
                },
                "++HVowZQy5WRusai": {
                    "instances": [],
                    "index"    : 2,
                    "id"       : "++HVowZQy5WRusai",
                    "revSet"   : 3,
                    "dtstart"  : 1292692800000,
                    "dtend"    : 1292696400000
                },
                "ANEWEVENT"       : {
                    "instances": [],
                    "index"    : 3,
                    "id"       : "ANEWEVENT",
                    "revSet"   : 4,
                    "dtstart"  : 1292691600000,
                    "dtend"    : 1292695200000
                }
            };
            expect(instance.eventCache).toEqual(expectedEvCache);
        });
    });

    describe('compareEventCache(): Test Suite', function () {
        var instance = new cm();
        var qr = instance.eventManager.queryResults;

        spyOn(instance, 'updateTimestampCache').andReturn(false);

        it('empty cache with empty results comparison', function () {
            instance.eventCache = {};
            var emptyQR = [];
            var results = instance.compareEventCache(emptyQR);
            var expected = {
                'updated': [],
                'deleted': []
            }
            expect(results).toEqual(expected);
        });

        it('populated cache with identical events (no change)', function () {
            //populate the cache with the default events now
            instance.databaseChanged();
            var results = instance.compareEventCache(qr);
            var expected = {
                updated: [],
                deleted: []
            }
            expect(results).toEqual(expected);
        });

        // NOTE: the next 3 tests run in sequence, do not rearrange this code without taking
        // this into account.
        var eventToAdd = {
            "_id"               : "NEWTESTEVENT",
            "_kind"             : "com.palm.calendarevent:1",
            "accountId"         : "++HM6sJVRCK4_5D7",
            "calendarId"        : "++HM6sN4VPZ3aGzr",
            "dtend"             : 1292695200000,
            "dtstart"           : 1292691600000,
            "location"          : "",
            "note"              : "",
            "subject"           : "Additional Test Event",
            "tzId"              : "America/Los_Angeles",
            "eventDisplayRevset": 9
        };

        it('populated cache with new event added', function () {
            //cache will have the default events in the cache when we start this.
            qr.push(eventToAdd);
            var results = instance.compareEventCache(qr);
            //we expect that the only update is to index 3 in the list
            var expected = {
                updated: [3],
                deleted: []
            };
            expect(results).toEqual(expected);
            //add to the database cache so we can remove eventToAdd in the next test
            instance.databaseChanged();
        });

        it('populated cache with event removed', function () {
            qr.pop();
            var results = instance.compareEventCache(qr);
            var expected = {
                updated: [],
                deleted: ['NEWTESTEVENT']
            };
            expect(results).toEqual(expected);
            //retain the event because we're going to modify it in the next test
        });

        it('populated cache with event modified', function () {
            qr.push(eventToAdd);
            eventToAdd.eventDisplayRevset = 10;

            var results = instance.compareEventCache(qr);
            var expected = {
                updated: [3],
                deleted: []
            };
            expect(results).toEqual(expected);
            //now remove the additional event and reset so that subsequent tests
            //have a normal database cache to work with.
            instance.databaseChanged();
        });
        //end sequential tests
    });

    describe('updateTimestampCache(): Test Suite', function () {

        //function used to build the timestamp cache in its default state
        //after the first run of updateTimestampCache. Used in the empty cache tests
        //as calculateRange() will cause the timestampCache to look like this
        function generateBlankDays() {
            var start = (Date.today()).addDays(-46).getTime();
            var end = (Date.today()).addDays(46).addSeconds(-1).getTime();
            var outputMap = {};
            var timeMachine = new Date();
            for (timeMachine.setTime(start); +timeMachine < end; timeMachine.addDays(1)) {
                var ts = +timeMachine;
                outputMap[ts] = [];
            }
            return outputMap;
        }

        it('Empty update list with an empty eventCache should result in no changes.', function () {
            var instance = new cm();
            spyOn(instance, 'doAsyncTimestampUpdate').andReturn(false);

            instance.eventCache = {};
            instance.timestampCache = {};

            var ul = {
                updated: [],
                deleted: []
            };
            var expectedTSCache = generateBlankDays();
            instance.updateTimestampCache(ul);
            expect(instance.eventCache).toEqual({});
            expect(JSON.stringify(instance.timestampCache)).toEqual(JSON.stringify(expectedTSCache));
        });
        it('Empty update list with a populated eventCache should result in no changes.',
            function () {
                var instance = new cm();
                setupScaffoldTest1(instance);
                //at this point, there should now be a 92-day blank coverage with some
                //additional events inserted around
                spyOn(instance, 'doAsyncTimestampUpdate').andReturn(false);
                var ul = {
                    updated: [],
                    deleted: []
                };
                var beforeTS = JSON.stringify(instance.timestampCache),
                    beforeE = JSON.parse(JSON.stringify(instance.eventCache));
                instance.updateTimestampCache(ul);
                expect(JSON.stringify(instance.timestampCache)).toEqual(beforeTS);
                expect(instance.eventCache).toEqual(beforeE);
            })
        it('Update list with new events should have the new events added to list to invoke ' +
            'getEventsInRange on.', function () {
            var instance = new cm();
            setupScaffoldTest2(instance);
            var spy = spyOn(instance, 'doAsyncTimestampUpdate').andReturn(false);
            var ev = instance.eventManager;
            ev.queryResults = EventManager.prototype.queryResults.slice(0); //re-insert the missing event

            var ul = {
                updated: ["++HVowZQy5WRusai"],
                deleted: []
            };
            instance.eventCache["++HVowZQy5WRusai"] = {
                instances: ["Canary in a coal-mine, I should be deleted"]
            }
            instance.updateTimestampCache(ul);
            expect(instance.eventCache["++HVowZQy5WRusai"].instances).toEqual([]);
            expect(instance.doAsyncTimestampUpdate).toHaveBeenCalled();

            var args = spy.mostRecentCall.args;
            expect(args[0]).toEqual(ul);
        });
        it('Update list with modified events should first drop any existing instances of the events' +
            ' from the timestamp cache, then add those events to the list to invoke getEventsInRange on.',
            function () {
                var instance = new cm();
                setupScaffoldTest1(instance);
                var spy = spyOn(instance, 'doAsyncTimestampUpdate').andReturn(false);

                var ul = {
                    updated: ["++HVowZQy5WRusai"],
                    deleted: []
                };
                instance.updateTimestampCache(ul);

                expect(instance.timestampCache[1292659200000].length).toEqual(2); //the ++HVowZQy5WRusai event should be gone
                var idsInCache = instance.timestampCache[1292659200000].map(function (e) {
                    return e[0];
                });
                expect(idsInCache).not.toContain('++HVowZQy5WRusai');

                expect(instance.doAsyncTimestampUpdate).toHaveBeenCalled();

                expect(spy.mostRecentCall.args[0]).toEqual(ul);
            });
        it('Update list with events deleted should remove instances of those events from the' +
            'timestampCache, then remove those events from the eventCache.', function () {
            var instance = new cm();
            setupScaffoldTest1(instance);
            var spy = spyOn(instance, 'doAsyncTimestampUpdate').andReturn(false);
            var ul = {
                updated: [],
                deleted: ["++HVowZQy5WRusai"]
            };
            instance.updateTimestampCache(ul);

            expect(instance.timestampCache[1292659200000].length).toEqual(2); //event should be removed from TS Cache
            expect(instance.eventCache["++HVowZQy5WRusai"]).toBeUndefined();

            expect(instance.doAsyncTimestampUpdate).toHaveBeenCalled();

            expect(spy.mostRecentCall.args[0]).toEqual(ul);
        });
    });

    describe('_getKeys(): Test Suite', function () {
        var testObj = {
            foo    : "bar",
            "12345": "aNumber"
        };
        var instance = new cm();
        it("Should return all keys in a given object", function () {
            var ret = instance._getKeys(testObj);
            var expected = Object.keys(testObj);

            expect(ret).toEqual(expected);
        });
        it("Should apply an optional input function to all keys, if supplied", function () {
            function toNumber(e) {
                if (isNaN(+e)) {
                    return e;
                }
                return +e;
            }

            var expected = ['foo', 12345];
            var ret = instance._getKeys(testObj, toNumber);
            //sorting them because the order may be different between _getKeys and expected depending on how the browser
            //evaluates Array.map
            ret.sort();
            expected.sort();

            expect(ret).toEqual(expected);
        });
    });

    describe('getDays(): Test Suite', function () {
        var instance, mdSpy, drmrSpy, sdSpy;
        beforeEach(function () {
            instance = new cm();
            mdSpy = spyOn(instance, 'getMissingDays').andCallThrough();
            drmrSpy = spyOn(instance, 'doRequestMissingRanges').andReturn(false);
            sdSpy = spyOn(instance, 'shareDays').andReturn(false);
            setupScaffoldTest1(instance);
        })
        it("Should calculate the range correctly from the given center date with the given number " +
            "of expansion days on both sides", function () {
            var centerDay = new Date(1292691600000).clearTime();
            var start = +new Date(centerDay).addDays(-10);
            var end = +new Date(centerDay).addDays(11) - 1;
            var dayInfo = {date: centerDay, expand: 10};
            instance.getDays(dayInfo);

            expect(mdSpy).toHaveBeenCalled();
            var args = mdSpy.mostRecentCall.args;
            expect(args[2]).toEqual(instance.timestampCache);
            expect(args[0]).toEqual(start);
            expect(args[1]).toEqual(end);
        });
        it('For a given calculated range, if days are found to be missing from the timestamp cache, ' +
            'doRequestMissingRanges should be called with all missing days, and the range of days ' +
            'requested.', function () {
            var centerDay = new Date(1292691600000).clearTime();
            instance.timestampCache[+centerDay] = [];
            var centerTS = +centerDay;
            var start = +new Date(centerDay).addDays(-10);
            var end = +new Date(centerDay).addDays(11) - 1;
            var dayInfo = {date: centerDay, expand: 10};
            instance.getDays(dayInfo);

            expect(mdSpy).toHaveBeenCalled();
            expect(drmrSpy).toHaveBeenCalled();
            expect(drmrSpy.mostRecentCall.args[0].length).toEqual(2);
            var ranges = drmrSpy.mostRecentCall.args[0];
            var lowerRange = [+new Date(centerTS).addDays(-10), +new Date(centerTS) - 1];
            var upperRange = [+new Date(centerTS).addDays(1), +new Date(centerTS).addDays(11) - 1];
            expect(ranges[0]).toEqual(lowerRange);
            expect(ranges[1]).toEqual(upperRange);
        });
        it('For a given calculated range, if all days are found to be in the timestamp cache, ' +
            'shareDays should be called directly with the requested range.', function () {
            var centerDay = new Date(1292691600000).clearTime();
            var centerTS = +centerDay;
            var start = +new Date(centerDay).addDays(-10);
            var end = +new Date(centerDay).addDays(11) - 1;
            var dayInfo = {date: centerDay, expand: 10};

            for (var timeMachine = new Date(start); +timeMachine < end; timeMachine.addDays(1)) {
                instance.timestampCache[+timeMachine] = [];
            }
            instance.getDays(dayInfo);

            expect(mdSpy).toHaveBeenCalled();
            expect(drmrSpy).not.toHaveBeenCalled();
            expect(sdSpy).toHaveBeenCalled();
        });
        it('If the doRequestMissingRanges code path is to be called, placeholder days should be ' +
            'inserted for every day in the calculated range.', function () {
            var centerDay = new Date(1292691600000).clearTime();
            instance.timestampCache[+centerDay] = [];
            var centerTS = +centerDay;
            var start = +new Date(centerDay).addDays(-10);
            var end = +new Date(centerDay).addDays(11) - 1;
            var dayInfo = {date: centerDay, expand: 10};
            instance.getDays(dayInfo);

            expect(mdSpy).toHaveBeenCalled();
            expect(drmrSpy).toHaveBeenCalled();
            for (var timeMachine = new Date(start); +timeMachine < end; timeMachine.addDays(1)) {
                expect(typeof(instance.timestampCache[+timeMachine])).not.toBeUndefined();
            }
        });
    });

    describe('doAsyncTimestampUpdate(): Test Suite', function () {

        // NOTE: insertQuery is UNDEFINED most of the time. It's only used in one test
        var instance, emSpy, ptcSpy, timeRanges, insertQuery;

        function fakeGetEventsInRange(range, callback, eventSet, limit) {
            //insertQuery is a workaround needed to insert a query while in the middle
            //of the worker running. It's used in the activeQueries test below.
            if (!!insertQuery) {
                instance.activeQueries.push(insertQuery);
                insertQuery = undefined;
            }
            callback({days: [
                {aFake: true}
            ]});
        }

        beforeEach(function () {
            instance = new cm();
            setupScaffoldTest1(instance);
            instance.eventCache = JSON.parse(JSON.stringify(defaultExpectedECache));
            emSpy = spyOn(instance.eventManager, 'getEventsInRange').andCallFake(fakeGetEventsInRange);
            ptcSpy = spyOn(instance, 'populateTimestampCache').andReturn(false);
            timeRanges = [
                [1292659200000, 1293263999999]
            ];
        });
        it("Should populate the updateList with all current events if none supplied", function () {
            instance.doAsyncTimestampUpdate(null, timeRanges);
            var expectedUpdateList = {
                updated: instance.eventManager.queryResults.slice(0),
                deleted: []
            };

            expect(emSpy).toHaveBeenCalled();
            var args = emSpy.mostRecentCall.args;
            expect(args[2]).toEqual(expectedUpdateList.updated);
            expect(ptcSpy).toHaveBeenCalled();
        });
        it("Should use shareEvents() as the finishFunction if no function is supplied", function () {
            var expectedUpdateList = {
                updated: ['++HVowZQy5WRusag', '++HVowZQy5WRusah', '++HVowZQy5WRusai'],
                deleted: []
            };
            var seSpy = spyOn(instance, 'shareEvents').andReturn(false);

            instance.doAsyncTimestampUpdate(expectedUpdateList, timeRanges);
            expect(emSpy).toHaveBeenCalled();
            expect(ptcSpy).toHaveBeenCalled();
            var args = ptcSpy.mostRecentCall.args;
            console.info(args);
            expect(typeof(args[1])).toEqual("function");
            args[1]();
            expect(seSpy).toHaveBeenCalled();
        });
        it("Should correctly getEventsInRange for a single range input (base case)", function () {
            instance.doAsyncTimestampUpdate(null, timeRanges);
            expect(emSpy).toHaveBeenCalled();
            expect(ptcSpy).toHaveBeenCalled();
            var args = ptcSpy.argsForCall;
            expect(args[0][0]).toEqual([
                {aFake: true}
            ]);
        });
        it("Should correctly getEventsInRange for multiple range inputs (recursive case)", function () {
            timeRanges.push([+Date.today().clearTime(), +Date.today().addDays(1).clearTime() - 1]);
            var originalRanges = timeRanges.slice(0);
            instance.doAsyncTimestampUpdate(null, timeRanges);
            expect(emSpy).toHaveBeenCalled();
            var calls = emSpy.argsForCall;
            expect(calls.length).toEqual(2);
            for (var i = calls.length - 1; i >= 0; i--) {
                var args = calls[i];
                var inRange = args[0];
                var range = [inRange.start, inRange.end];
                expect(originalRanges).toContain(range);
            }
            expect(ptcSpy).toHaveBeenCalled();
        });
        it("Should setTimeout to start any waiting query when the current query is finished",
            function () {
                var activeQueryWasCalled = false;

                function nextQuery() {
                    activeQueryWasCalled = true;
                }

                // NOTE: This setup is really hackish. What it does is hook an additional function in as insertQuery,
                //which is a test-unit scope parameter. If insertQuery is defined, when fakeGetEventsInRange
                //is called by doAsyncTimestampUpdate, it will add the given function to the instance's
                //activeQueries parameter. This simulates what happens when a query is inserted
                //while a long-running query is executing.

                //The reason such a hackish route was taken for inserting the query is that
                //in this testing scenario where fakes are being called constantly, there's no way
                //to insert a query into the instance while an asyncTimestampUpdate function is
                //presently completing a query. It cannot be inserted before the call to doAsyncTimestampUpdate
                //because if so, doAsyncTimestampUpdate will not start the query process, expecting
                //that the previous query will kick off the next one when it's complete.
                insertQuery = nextQuery;
                instance.doAsyncTimestampUpdate(null, timeRanges);
                expect(emSpy).toHaveBeenCalled();
                expect(ptcSpy).toHaveBeenCalled();
                waitsFor(function () {
                    return activeQueryWasCalled;
                });
            });
        it("Should pass the finish function through to populateTimestampCache, if provided", function () {
            var finished = false;

            function finishFunction() {
                finished = true;
            }

            instance.doAsyncTimestampUpdate(null, timeRanges, finishFunction);
            expect(emSpy).toHaveBeenCalled();
            expect(ptcSpy).toHaveBeenCalled();
            expect(ptcSpy.mostRecentCall.args[1]).toEqual(finishFunction);
            ptcSpy.mostRecentCall.args[1]();
            waitsFor(function () {
                return finished;
            });
        });
    });

    describe("doRequestMissingRanges(): Test Suite", function () {
        it("Test that generated trampoline function to shareDays correctly binds the original " +
            "range as the first argument.", function () {
            var instance = new cm();
            setupScaffoldTest1(instance);
            var datuSpy = spyOn(instance, 'doAsyncTimestampUpdate').andReturn(false);
            var sdSpy = spyOn(instance, 'shareDays').andReturn(false);
            var timeRanges = [
                [1292659200000, 1293263999999]
            ];
            var requestedTimeRanges = [1292659200000, 1293263999999];
            instance.doRequestMissingRanges(timeRanges, requestedTimeRanges);
            expect(datuSpy).toHaveBeenCalled();
            var args = datuSpy.mostRecentCall.args;
            args[2](); //call the generated function, which should go to shareDays.
            expect(sdSpy).toHaveBeenCalled();
            args = sdSpy.mostRecentCall.args;
            expect(args[0]).toEqual(requestedTimeRanges);
        });
    });

    describe('getEventInCache(): Test Suite', function () {
        var instance;
        beforeEach(function () {
            instance = new cm();
            setupScaffoldTest1(instance);
            spyOn(instance, 'updateTimestampCache').andReturn(false);
            instance.buildEventCache(false);
        });
        it("Test that requested event ID is retrieved from EventManager and returned as-is.", function () {
            var ev = instance.getEventInCache("++HVowZQy5WRusag");
            expect(ev).toEqual(instance.eventManager.queryResults[0]);
        });
        it("Test that if the requested event ID is not in the eventCache, algorithm gracefully " +
            "fails and returns null rather than throwing an exception.", function () {
            var ev = instance.getEventInCache("Nyan Cat");
            expect(ev).toBeNull();
        });
    });

    describe("performCacheMaintenance(): Test Suite", function () {
        var instance;
        beforeEach(function () {
            instance = new cm();
            setupScaffoldTest1(instance);
        });
        it("Test that the algorithm leaves the timestamp cache intact until it's reached maximum " +
            "capacity. Days should not be pruned from cache while cache is not full.", function () {
            var start = +Date.today();
            var end = +new Date(start).addDays(instance.cacheLimit - 1) - 1;
            var now = +Date.now();
            for (var timeMachine = new Date(+start); +timeMachine < end; timeMachine.addDays(1)) {
                instance.timestampCache[+timeMachine] = [];
                instance.timestampCache[+timeMachine].accessTime = now;
            }
            var dayCount = Object.keys(instance.timestampCache).length;
            var oldTC = JSON.stringify(instance.timestampCache);
            instance.performCacheMaintenance();
            expect(Object.keys(instance.timestampCache).length).toEqual(dayCount);
            expect(JSON.stringify(instance.timestampCache)).toEqual(oldTC);

            //we've tested that it works under capacity, test that it prunes when at capacity
            start = end;
            end = new Date(start).addDays(10);
            now = +Date.now();
            for (var timeMachine = new Date(+start); +timeMachine < end; timeMachine.addDays(1)) {
                instance.timestampCache[+timeMachine] = [];
                instance.timestampCache[+timeMachine].accessTime = now;
            }
            instance.performCacheMaintenance();
            expect(Object.keys(instance.timestampCache).length).toEqual(instance.cacheLimit);
            //we're not testing which days it trashed in this test, so that's sufficient.
        });
        it("If cache has more days than allowed, least recently used days outside the cache " +
            "range should be removed.", function () {
            var start = +Date.today();
            var end = +new Date(start).addDays(instance.cacheLimit + 10) - 1;
            var now = +Date.now();
            //Note the now++ in this, it means that there is 1 microsecond difference added on each loop.
            //this means that the lowest timestamp days that can be purged from the cache will be
            //starting at the edge of the protected range and going through for 10 days, since we added 10 days
            //more than are allowed.
            for (var timeMachine = new Date(+start); +timeMachine < end; timeMachine.addDays(1), now++) {
                instance.timestampCache[+timeMachine] = [];
                instance.timestampCache[+timeMachine].accessTime = now;
            }
            var firstDeleted = instance.protectedRange[1];
            instance.performCacheMaintenance();
            expect(Object.keys(instance.timestampCache).length).toEqual(instance.cacheLimit);
            for (var timeMachine = new Date(+firstDeleted), count = 10; count > 0; timeMachine.addDays(1), count--) {
                expect(instance.timestampCache[+timeMachine]).toBeUndefined();
            }
        });
    });

    describe("shareDays(): Test Suite", function () {
        //we're binding to eventManager.utils.formatResponse to check the exit parameters for this
        //function. The mock EventManager doesn't have an implementation of this, so
        //realistically the only way we can tell that it's sending everything through is
        //by looking at the parameters to that function and seeing if they're what they should be.

        var instance, exitSpy;
        beforeEach(function () {
            instance = new cm();
            setupScaffoldTest1(instance);
            spyOn(instance, 'updateTimestampCache').andReturn(false);
            instance.buildEventCache(false);
            exitSpy = spyOn(instance.eventManager.utils, 'formatResponse').andReturn([]);
            var start = +(new Date(1292659200000).addDays(1));
            var end = +(new Date(start).addDays(5)) - 1;
            var now = +Date.now();
            //add 5 more days to the cache, completely blank.
            for (var timeMachine = new Date(start); +timeMachine < end; timeMachine.addDays(1)) {
                instance.timestampCache[+timeMachine] = [];
                instance.timestampCache[+timeMachine].accessTime = now;
            }
        });
        it("Test that all days in the requested range in the timestampCache are shared. " +
            "All shared events should be correctly restored to be CalendarEvents.", function () {
            var range = [+new Date(1292659200000), +new Date(1292659200000).addDays(6) - 1];
            instance.shareDays(range);
            expect(exitSpy).toHaveBeenCalled();
            var args = exitSpy.mostRecentCall.args;
            //because of how the timestamp cache is constructed, all events in the event manager
            //will be expected to make a showing.
            var expectedEvents = instance.eventManager.queryResults.slice(0);
            var givenEvents = args[0];
            for (var i = 0; i < givenEvents.length; i++) {
                var matchingEvent;
                for (var j = 0; j < expectedEvents.length; j++) {
                    if (givenEvents[i]._id == expectedEvents[j]._id) {
                        matchingEvent = expectedEvents[j];
                    }
                }
                expect(matchingEvent).not.toBeUndefined();
                expect(givenEvents[i].prototype).toEqual(calendar.CalendarEvent);
                //all the events returned are expected. We're clear.
            }
        });
    });

    describe("Cross-functional Test Suite", function () {
        it('Event Cache indices should be correct after deletions/updates', function () {
            var instance = new cm();
            setupScaffoldTest1(instance);

            spyOn(instance, 'updateTimestampCache').andReturn(false); //cut off the call through the update process at the timestamp cache

            instance.databaseChanged();
            expect(instance._getKeys(instance.eventCache).length).toEqual(3);

            //should have all 3 events in the cache at this point. let's delete the first one.
            instance.eventManager.queryResults.splice(0, 1);
            instance.databaseChanged();
            for (var i = 0; i < instance.eventManager.queryResults.length; i++) {
                var ev = instance.eventManager.queryResults[i];
                var target = instance.eventCache[ev._id];
                expect(target.id).toEqual(ev._id);
                expect(target.index).toEqual(i);
            }
        });
    });

    describe("calendarsChanged(): Test Suite", function () {
        var instance
            , app = enyo.application
            ;
        app.calendarsManager = MockCalendarsManager;

        beforeEach(function () {
            instance = new cm();
            setupScaffoldTest1(instance);
        })

        it("When we receive a new array of calendars, we update the list of hidden calendars.", function () {
            var calendars = {
                "++HM6sN4VPZ3aGzr": {color: "blue", on: false}, "++Hi5iQLpFBvs9dU": {color: "red", on: true}
            };

            var expectedHidden = {
                "++HM6sN4VPZ3aGzr": true
            };

            instance.setCalendars(calendars);
            expect(instance.hiddenCalendars).toEqual(expectedHidden);
        });

        it("When we receive accountsAndCalendars, we request new calendars from CalendarsManager and update the list of hidden calendars.", function () {
            var expectedHidden = {
                "++Hi5iQLpFBvs9dU": true
            };

            instance.setAccountsAndCalendars({});
            expect(instance.hiddenCalendars).toEqual(expectedHidden);
        });
    });

});