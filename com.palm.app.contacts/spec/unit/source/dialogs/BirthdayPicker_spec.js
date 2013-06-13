// LICENSE@@@
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
// @@@LICENSE

/*jslint white: true, onevar: true, undef: true, eqeqeq: true, plusplus: true, bitwise: true,
 regexp: true, newcap: true, immed: true, nomen: false, maxerr: 500 */
/*global ContactsLib, document, BirthdayPicker, enyo, console, describe, it, expect, runs, waits, waitsFor */

describe("BirthdayPicker", function () {
    var birthdayPicker;

    it("Should be present", function () {
        birthdayPicker = new BirthdayPicker();
        expect(birthdayPicker).toBeDefined();
    });

    it("dateToLocalDate", function () {
        var bDay = birthdayPicker.dateToLocalDate(new Date(1950, 0, 3));
        expect(bDay).toEqual("1950-01-03");

        bDay = birthdayPicker.dateToLocalDate(new Date(1999, 5, 30));
        expect(bDay).toEqual("1999-06-30");

        bDay = birthdayPicker.dateToLocalDate(new Date(2000, 11, 31));
        expect(bDay).toEqual("2000-12-31");

        bDay = birthdayPicker.dateToLocalDate(new Date(2015, 1, 28));
        expect(bDay).toEqual("2015-02-28");
    });
});
