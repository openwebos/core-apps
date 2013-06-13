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


/*
 tests/app/shared/LayoutManagerSpecs.js
 */

describe("LayoutManager", function () {
    var lm = window.LayoutManager,
        tests = lm.getTestable();

    /*
     An array-derived type for testing the non-native isArray and isArrayLike functions

     The purpose for this test is that this class is incredibly similar to a real array, however it fails at one critical part:
     If you add an object to the array like this:
     var sa = new SpecialArray();
     sa[0] = "foo";

     At that point, a real array would have length 1, but the special array has length 0. This will cause the Array.push()
     function to break badly (overwriting what you manually inserted), and cause the pop function to remove the wrong object.

     The browser isArray method considers this to not be an array, and our test should also consider this to not be an array for
     the same reason.
     */
    function SpecialArray() {
        Array.constructor.apply(this, arguments);
        this.Foo = "Bar";
    }

    SpecialArray.prototype = new Array();
    SpecialArray.constructor = SpecialArray;

    it(".isArray(): test for compatibility with the built in Array.isArray.", function () {
        //test a generic array, then things which are very much not arrays.
        expect(tests.isArray([])).toEqual(Array.isArray([]));
        expect(tests.isArray({})).toEqual(Array.isArray({}));
        expect(tests.isArray(false)).toEqual(Array.isArray(false));
        expect(tests.isArray()).toEqual(false);

        expect(tests.isArray("hello")).toEqual(Array.isArray("hello"));
        expect(tests.isArray(1)).toEqual(Array.isArray(1));

        //test an array-based object
        var se = new SpecialArray();

        expect(tests.isArray(se)).toEqual(Array.isArray(se));
        expect(se.Foo).toBe("Bar");
    });

    it("Row class, Row.addEvent(): test adding events to a row", function () {
        var Row = tests.Row,
            //create a row with an event from 8:30 to 10:00
            r = new Row(1, {start_decimal: 850, end_decimal: 1000, tag: "test1"});

        //add an event at 9:30 to 9:45, expect this to not add.
        r.addEvent({start_decimal: 950, end_decimal: 975, tag: "test2"});
        expect(r.events.length).toBe(1);

        //add an event at 10:00 to 11:00, expect this to work
        r.addEvent({start_decimal: 1000, end_decimal: 1100, tag: "test3"});
        expect(r.events.length).toBe(2);

        //call without arguments, expect no change.
        r.addEvent();
        expect(r.events.length).toBe(2);
        expect(r.events.map(function (e, i, a) {
            return e.tag;
        })).toEqual(["test1", "test3"]);

        //not going to test with garbage here because the code really isn't expected to receive hostile values (malformed events, etc).
    });

    it(".setPositions(): testing calculated decimal start and end values", function () {
        var test1 = {renderStartTime: new Date(2011, 6, 25, 16, 55, 0), renderEndTime: new Date(2011, 6, 25, 17, 55, 0), tag: "test1"},
            test2 = {renderStartTime: new Date(2011, 6, 25, 16, 35, 0), renderEndTime: new Date(2011, 6, 25, 18, 15, 0), tag: "test2"},
            test3 = {renderStartTime: new Date(2011, 6, 25, 18, 0, 0), renderEndTime: new Date(2011, 6, 25, 19, 0, 0), tag: "test3"},
            test4 = {renderStartTime: new Date(2011, 6, 25, 12, 0, 0), renderEndTime: new Date(2011, 6, 25, 12, 5, 0), tag: "test4"};
        var list = [test1, test2, test3, test4];
        var result = tests.setPositions(list);

        expect(Math.floor(test1.start_decimal)).toBe(1691);
        expect(Math.floor(test2.start_decimal)).toBe(1658);
        expect(test3.start_decimal).toBe(1800);
        expect(Math.floor(test1.end_decimal)).toBe(1791);
        expect(Math.floor(test2.end_decimal)).toBe(1825);
        expect(test3.end_decimal).toBe(1900);
        expect(test4.start_decimal).toBe(1200);
        expect(test4.end_decimal).toBe(1250);
    });


    //data set used in tests for setOverlapCounts and getOverlapGroups
    var testset = [
        {renderStartTime: new Date(2011, 6, 25, 16, 55, 0), renderEndTime: new Date(2011, 6, 25, 17, 55, 0), tag: "test1"},
        {renderStartTime: new Date(2011, 6, 25, 16, 35, 0), renderEndTime: new Date(2011, 6, 25, 18, 15, 0), tag: "test2"},
        {renderStartTime: new Date(2011, 6, 25, 18, 15, 0), renderEndTime: new Date(2011, 6, 25, 19, 15, 0), tag: "test3"},
        {renderStartTime: new Date(2011, 6, 25, 18, 20, 0), renderEndTime: new Date(2011, 6, 25, 20, 0, 0), tag: "test4"},
        {renderStartTime: new Date(2011, 6, 25, 18, 45, 0), renderEndTime: new Date(2011, 6, 25, 19, 0, 0), tag: "test5"},
        {renderStartTime: new Date(2011, 6, 25, 12, 0, 0), renderEndTime: new Date(2011, 6, 25, 13, 0, 0), tag: "test6"}
    ];

    testset = tests.setPositions(testset);
    var sorted = testset.sort(function (e1, e2) {
        return e1 && e2 ? e1.start_decimal - e2.start_decimal : 0;
    });

    function getByTag(t) {
        var subset = testset.filter(function (e, i, a) {
            return e.tag == t;
        });
        return subset.length ? subset[0] : null;
    }

    function generateTagList(a) {
        return a.map(function (e, i, a) {
            return e.tag;
        });
    }

    //these two tests are sequential.
    it(".getOverlapGroups(): testing grouping of events that overlap", function () {

        //populate the start and end times with setPositions
        var groups = tests.getOverlapGroups(sorted);

        expect(groups.length).toEqual(3);

        expect(groups[0].length).toEqual(1); //this should be the earliest event, test6
        expect(generateTagList(groups[0])).toEqual(['test6']);

        expect(groups[1].length).toEqual(2); //this should be test 1 and 2.
        var g = generateTagList(groups[1]);
        expect(g).toContain('test1');
        expect(g).toContain('test2');

        expect(groups[2].length).toEqual(3); //this should be 3, 4, and 5.
        g = generateTagList(groups[2]);
        expect(g).toContain('test3');
        expect(g).toContain('test4');
        expect(g).toContain('test5');
    });

    it(".setOverlapCounts(): test calculating the overlap counts", function () {

        var groups = tests.getOverlapGroups(sorted);

        tests.setOverlapCounts(groups);

        //first group, the noon lunch event test6
        var data = getByTag('test6');
        expect(data.overlap_index).toEqual(0);
        expect(data.overlap_count).toEqual(1);

        //second group, the 2 overlapping meetings test1 and test2. test1 starts after test2
        data = getByTag('test1');
        expect(data.overlap_index).toEqual(1);
        expect(data.overlap_count).toEqual(2);
        data = getByTag('test2');
        expect(data.overlap_index).toEqual(0);
        expect(data.overlap_count).toEqual(2);

        //third group, the 3 overlapping meetings tests 3, 4, and 5. They should be in order.
        data = getByTag('test3');
        expect(data.overlap_index).toEqual(0);
        expect(data.overlap_count).toEqual(3);
        data = getByTag('test4');
        expect(data.overlap_index).toEqual(1);
        expect(data.overlap_count).toEqual(3);
        data = getByTag('test5');
        expect(data.overlap_index).toEqual(2);
        expect(data.overlap_count).toEqual(3);

    });
})
