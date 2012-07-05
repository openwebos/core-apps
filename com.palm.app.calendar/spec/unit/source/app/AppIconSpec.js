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
 NOTE: Test suite for the AppIcon component
 - tests/App/AppIconSpecs.js

 TODO: Implement DataHub.reset (enhancedObject) to remove DataHub from the enhanced object.
 TODO: Create tests for DataHub.reset().
 TODO: Create tests for DataHub.share ({data: withDataNotArrayWrapped}).
 */

describe("AppIcon", function defineDataHubTests() {
    var app = enyo.application,
        clock = new Date(),
        tester;

    DataHub.enhance(app);

    beforeEach(function beforeEach() {
        // /*Uncomment to see DataHub-enhanced object's state after each test.*/ console.info (app);

        // Init
        tester = new calendar.AppIcon({name: "appIcon"});
        clock.setTime(Date.now());
    });

    afterEach(function afterEach() {
        app.clearHub();
        tester.destroy();
        tester = null;
    });

    it("Share clock expecting date change.", function testAppIcon_dateChange() {

        // Set up spies on the tester's event pass through functions.
        spyOn(tester, "clockChanged").andCallThrough();
        spyOn(tester, "updatedIcon").andCallThrough();
        spyOn(tester, "updateIconFailed").andCallThrough();
        spyOn(tester, "updateIcon").andCallThrough();

        // Perform the initial clock share.
        app.share({clock: clock});

        // We continue when updatedIcon has been called (the initial icon is set).
        waitsFor(function () {
            return tester.updatedIcon.callCount == 1;
        });

        // Verify our state and then share the clock again.
        runs(function () {
            expect(tester.clockChanged.callCount).toEqual(1);
            expect(tester.updateIcon.callCount).toEqual(1);
            expect(tester.updatedIcon.callCount).toEqual(1);
            expect(tester.updateIconFailed.callCount).toEqual(0);
            app.share({clock: clock});
        });

        // Because the same date is being shared again, updateIcon should be called.
        waitsFor(function () {
            return tester.updateIcon.callCount == 2;
        });

        // Verify our state, add another day to the date on the clock, and then share again.
        runs(function () {
            expect(tester.clockChanged.callCount).toEqual(2);
            expect(tester.updateIcon.callCount).toEqual(2);
            expect(tester.updatedIcon.callCount).toEqual(1);
            expect(tester.updateIconFailed.callCount).toEqual(0);
            clock.setDate(clock.getDate() + 1);	// Add another day.
            app.share({clock: clock});
        });

        // Because we're sharing a different date, updatedIcon should be called.
        waitsFor(function () {
            return tester.updatedIcon.callCount == 2;
        });

        // Verify our state and then share an invalid clock value (null).
        runs(function () {
            expect(tester.clockChanged.callCount).toEqual(3);
            expect(tester.updateIcon.callCount).toEqual(3);
            expect(tester.updatedIcon.callCount).toEqual(2);
            expect(tester.updateIconFailed.callCount).toEqual(0);
            app.share({clock: null});
        });

        // Because we're sharing a different date, updatedIcon should be called.
        waitsFor(function () {
            return tester.updatedIcon.callCount == 3;
        });

        // Verify our state and then share an invalid clock value (string).
        runs(function () {
            expect(tester.clockChanged.callCount).toEqual(4);
            expect(tester.updateIcon.callCount).toEqual(4);
            expect(tester.updatedIcon.callCount).toEqual(3);
            expect(tester.updateIconFailed.callCount).toEqual(0);
            app.share({clock: '20091024155459'});
        });

        // Because we're sharing a different date, updatedIcon should be called.
        waitsFor(function () {
            return tester.clockChanged.callCount == 5;
        });

        // Verify the final state.
        runs(function () {
            expect(tester.clockChanged.callCount).toEqual(5);
            expect(tester.updateIcon.callCount).toEqual(5);
            expect(tester.updatedIcon.callCount).toEqual(3);
            expect(tester.updateIconFailed.callCount).toEqual(0);
        });
    });
});
