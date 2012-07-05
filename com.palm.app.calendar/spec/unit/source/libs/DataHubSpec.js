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
 NOTE: Test suite for the DataHub object.
 - tests/libs/DataHubSpecs.js

 TODO: Implement DataHub.reset (enhancedObject) to remove DataHub from the enhanced object.
 TODO: Create tests for DataHub.reset().
 TODO: Create tests for DataHub.share ({data: withDataNotArrayWrapped}).
 */

describe("DataHub", function defineDataHubTests() {
    var app = enyo.application;

    DataHub.enhance(app);

    beforeEach(function beforeEach() {
        // /*Uncomment to see DataHub-enhanced object's state after each test.*/ console.info (app);
    });

    afterEach(function afterEach() {
        app.clearHub();
    });

    function Watcher(name) {
        this.name = name || "Watcher";	// Use the default name if a name argument isn't passed in the constructor.
        this.data = this.data2 = null;

        this.setData = function setData(data) {
            this.data = data;
            this.notify && this.notify();
        };

        this.setData2 = function setData2(data) {
            this.data2 = data;
            this.notify2 && this.notify2();
        };
    }

    it(".clearHub(): Clears all watches, transactions, and kept data", function testDataHub_clearHub() {

        var watcher = new Watcher();

        app.watch({data: watcher}, {wait: true});
        app.share({data: "magic token"}, {keep: true});

        expect(app._DataHub.watches.data.share.sharer).toEqual("testDataHub_clearHub");

        app.clearHub();
        expect(app._DataHub.watches).not.toBeDefined();			// There should be no watches.

        app.share({data: "HOW DID I GET SET?!"});
        expect(app._DataHub.watches.watchers).toBeUndefined();		// There should be no watchers.

        expect(watcher.data).toEqual("magic token");
    });

    it(".watch ({data: watcher}): Watches for data shared asynchronously.", function testDataHub_watchAsyncShare() {

        var watcher = new Watcher();

        app.watch({data: watcher});
        app.share({data: 42});

        waitsFor(function () {
            return watcher.data !== null;
        }, 1000);

        runs(function () {
            expect(watcher.data).toEqual(42);
        });
    });

    it(".watch ({data: watcher}, {wait:true}): Watches for data shared synchronously.", function testDataHub_watchSyncShare() {

        var watcher = new Watcher();

        app.watch({data: watcher}, {wait: true});
        app.share({data: 42});

        expect(watcher.data).toEqual(42);
    });

    it(".share ({data: ...}, {keep: true}): When sharing, share ids increment as expected.", function testDataHub_checkTransactionIds() {

        var id;

        app.share({data: "something"}, {keep: true});
        id = app._DataHub.watches.data.share.shareId;	// Cache the id so we know what the next one should be.
        expect(app._DataHub.watches.data.share.sharer).toEqual("testDataHub_checkTransactionIds");

        app.share({data: "something else"}, {keep: true});

        expect(app._DataHub.watches.data.share.shareId).toEqual(id + 1);
        expect(app._DataHub.watches.data.share.sharer).toEqual("testDataHub_checkTransactionIds");
    });

    it(".share ({data: ...}): Shares all JS data types asynchronously.", function testDataHub_shareAnythingAsynchronously() {

        this.addMatchers({
            toBeNaN: function () {
                return isNaN(this.actual);
            }
        });

        var data = {},
            watcher = new Watcher();

        spyOn(watcher, "setData").andCallThrough();

        app.watch({data: watcher});
        app.share({data: 1});						//test sending numbers

        waitsFor(function () {
            return watcher.setData.callCount == 1;
        });

        runs(function () {
            expect(watcher.data).toEqual(1);
            app.share({data: -1});
        });

        waitsFor(function () {
            return watcher.setData.callCount == 2;
        });

        runs(function () {
            expect(watcher.data).toEqual(-1);
            app.share({data: 0});
        });

        waitsFor(function () {
            return watcher.setData.callCount == 3;
        });

        runs(function () {
            expect(watcher.data).toEqual(0);
            app.share({data: ""});					//test sending strings
        });

        waitsFor(function () {
            return watcher.setData.callCount == 4;
        });

        runs(function () {
            expect(watcher.data).toEqual("");
            app.share({data: "nonempty"});
        });

        waitsFor(function () {
            return watcher.setData.callCount == 5;
        });

        runs(function () {
            expect(watcher.data).toEqual("nonempty");
            app.share({data: Number.NaN});			//test sending garbage
        });

        waitsFor(function () {
            return watcher.setData.callCount == 6;
        });

        runs(function () {
            expect(watcher.data).toBeNaN();
            app.share({data: null});
        });

        waitsFor(function () {
            return watcher.setData.callCount == 7;
        });

        runs(function () {
            expect(watcher.data).toBeNull();
            app.share({data: undefined});
        });

        waitsFor(function () {
            return watcher.setData.callCount == 8;
        });

        runs(function () {
            expect(watcher.data).not.toBeDefined();
            app.share({data: []});					//test sending arrays
        });

        waitsFor(function () {
            return watcher.setData.callCount == 9;
        });

        runs(function () {
            expect(watcher.data).toEqual([]);
            app.share({data: [1]});
        });

        waitsFor(function () {
            return watcher.setData.callCount == 10;
        });

        runs(function () {
            expect(watcher.data).toEqual([1]);
            app.share({data: [
                []
            ]});
        });

        waitsFor(function () {
            return watcher.setData.callCount == 11;
        });

        runs(function () {
            expect(watcher.data).toEqual([
                []
            ]);
            app.share({data: [
                [1, 2, 3],
                [4, 5, 6]
            ]});
        });

        waitsFor(function () {
            return watcher.setData.callCount == 12;
        });

        runs(function () {
            expect(watcher.data).toEqual([
                [1, 2, 3],
                [4, 5, 6]
            ]);

            data = [];
            data.anAttribute = "array attribute";
            app.share({data: data});				//test sending attributed arrays
        });

        waitsFor(function () {
            return watcher.setData.callCount == 13;
        });

        runs(function () {
            expect(watcher.data.anAttribute).toEqual("array attribute");
            app.share({data: {aProperty: "object property"}});	//test sending an object
        });

        waitsFor(function () {
            return watcher.setData.callCount == 14;
        });

        runs(function () {
            expect(watcher.data.aProperty).toEqual("object property");
            data = /foo/;
            app.share({data: data});				//test sending a regex
        });

        waitsFor(function () {
            return watcher.setData.callCount == 15;
        });

        runs(function () {
            expect(watcher.data).toEqual(data);
            expect(watcher.data.exec("foo").length).not.toEqual(0);

            data = function () {
                return "hello";
            };
            app.share({data: data});				//test sending a function
        });

        waitsFor(function () {
            return watcher.setData.callCount == 16;
        });

        runs(function () {
            expect(watcher.data).toEqual(data);
            expect(watcher.data()).toEqual("hello");

            //that more or less handles the cases it shouldn't have a problem with
            //lets get to the ones that might cause it to blow up.
            app.share({data: window});				//test sending window
        });

        waitsFor(function () {
            return watcher.setData.callCount == 17;
        });

        runs(function () {
            expect(watcher.data).toEqual(window);
            app.share({data: enyo});				//test sending enyo
        });

        waitsFor(function () {
            return watcher.setData.callCount == 18;
        });

        runs(function () {
            expect(watcher.data).toEqual(enyo);
        });

        if (typeof JSON != "undefined") {
            runs(function () {
                app.share({data: JSON});			//test sending browser-native JSON object
            });

            waitsFor(function () {
                return watcher.setData.callCount == 19;
            });

            runs(function () {
                expect(watcher.data).toEqual(JSON);
            });
        }
    });

    it(".share ({data: ...}): Shares all JS data types synchronously.", function testDataHub_shareAnythingSynchronously() {

        this.addMatchers({
            toBeNaN: function () {
                return isNaN(this.actual);
            }
        });

        var data,
            watcher = new Watcher();

        app.watch({data: watcher}, {wait: true});

        //test sending numbers
        app.share({data: 1});
        expect(watcher.data).toEqual(1);

        app.share({data: -1});
        expect(watcher.data).toEqual(-1);

        app.share({data: 0});
        expect(watcher.data).toEqual(0);

        //test sending bare strings
        app.share({data: ""});
        expect(watcher.data).toEqual("");

        app.share({data: "nonempty"});
        expect(watcher.data).toEqual("nonempty");

        //test sending garbage
        app.share({data: Number.NaN});
        expect(watcher.data).toBeNaN();

        app.share({data: null});
        expect(watcher.data).toBeNull();

        app.share({data: undefined});
        expect(watcher.data).not.toBeDefined();

        //test sending arrays
        app.share({data: []});
        expect(watcher.data).toEqual([]);	//should return an empty array back

        app.share({data: [1]});
        expect(watcher.data).toEqual([1]);	//should return [1]

        app.share({data: [
            []
        ]});
        expect(watcher.data).toEqual([
            []
        ]);

        app.share({data: [
            [1, 2, 3],
            [4, 5, 6]
        ]});
        expect(watcher.data).toEqual([
            [1, 2, 3],
            [4, 5, 6]
        ]);

        //test sending attributed arrays through
        data = [];
        data.anAttribute = "present";
        app.share({data: data});
        expect(watcher.data.anAttribute).toEqual("present");

        //test sending an object through
        data = {data: "present"};
        app.share({data: data});
        expect(watcher.data).toEqual(data);

        //test sending a regex through
        data = /foo/;
        app.share({data: data});
        expect(watcher.data).toEqual(data);
        expect(watcher.data.exec("foo").length).not.toEqual(0);

        //test sending a function through (possibly as a callback)
        data = function () {
            return "hello";
        };
        app.share({data: data});
        expect(watcher.data).toEqual(data);
        expect(watcher.data()).toEqual("hello");

        //that more or less handles the cases it shouldn't have a problem with
        //lets get to the ones that might cause it to blow up.

        //pass through the browser-native JSON object;

        if (typeof JSON != "undefined") {
            app.share({data: JSON});
            expect(watcher.data).toEqual(JSON);
        }

        //pass through window
        app.share({data: window});
        expect(watcher.data).toEqual(window);

        //pass through enyo
        app.share({data: enyo});
        expect(watcher.data).toEqual(enyo);
    });

    describe("share, then watch (SW)", function () {
        it('.share ({data: ...}): Doesn\'t "keep" data for future watchers; share asynchronously.', function testDataHub_dontKeepAsyncShare_SW() {
            var watcher = new Watcher();
            spyOn(watcher, "setData").andCallThrough();

            app.share({data: "unkept value"});	// Share something before any watchers are set.
            app.watch({data: watcher});		// Watch something that was already shared.
            expect(app._DataHub.watches.data.watchers[watcher._DataHub.watcherId].transaction).not.toBeDefined();	// No share transaction should be present.
            expect(app._DataHub.watches.data.share).not.toBeDefined();	// Share object should not be present
            expect(watcher.setData.callCount).toEqual(0);				// setData shouldn't have been called.

            var delayDone = false;
            setTimeout(function () {
                delayDone = true;
            }, 20);	// Set timer to go off after asynchronous share would complete

            waitsFor(function () {
                return delayDone;
            });

            runs(function () {
                expect(app._DataHub.watches.data.watchers[watcher._DataHub.watcherId].transaction).not.toBeDefined();	// No share transaction should be present.
                expect(watcher.setData.callCount).toEqual(0);	// setData shouldn't have been called.
                expect(watcher.data).toEqual(null);
            });
        });

        it('.share ({data: ...}): Doesn\'t keep data for future watchers; share synchronously.', function testDataHub_dontKeepSyncShare_SW() {
            var watcher = new Watcher();
            spyOn(watcher, "setData").andCallThrough();

            app.share({data: "unkept value"});						// Share something before any watchers are set.
            app.watch({data: watcher}, {wait: true});				// Watch something that was already shared.

            expect(app._DataHub.watches.data.watchers[watcher._DataHub.watcherId].transaction).not.toBeDefined();	// No share transaction should be present.
            expect(app._DataHub.watches.data.share).not.toBeDefined();		// Share object should not be present
            expect(watcher.setData.callCount).toEqual(0);			// setData shouldn't have been called.
            expect(watcher.data).toEqual(null);

            app.share({data: "unkept value2"});					// Share again to ensure sharing isn't just failing

            expect(app._DataHub.watches.data.watchers[watcher._DataHub.watcherId].transaction).not.toBeDefined();	// No share transaction should be present since this was a synchronous share.
            expect(watcher.setData.callCount).toEqual(1);			// setData should have only been called once.
            expect(watcher.data).toEqual("unkept value2");

            var delayDone = false;
            setTimeout(function () {
                delayDone = true;
            }, 20);		// Set timer to go off after asynchronous share would complete

            waitsFor(function () {
                return delayDone;
            });

            runs(function () {
                expect(app._DataHub.watches.data.watchers[watcher._DataHub.watcherId].transaction).not.toBeDefined();	// No share transaction should be present since this was a synchronous share.
                expect(watcher.setData.callCount).toEqual(1);		// setData should still have only been called once.
                expect(watcher.data).toEqual("unkept value2");		// watcher's data value shouldn't have changed.
            });
        });

        it('.share ({data: ...}, {keep: true}): Keeps data marked as "keep" for future watchers; share asynchronously.', function testDataHub_keepAsyncShare_SW() {
            var watcher = new Watcher();
            spyOn(watcher, "setData").andCallThrough();

            app.share({data: "retained value"}, {keep: true});		// Share something before any watchers are set.
            expect(app._DataHub.watches.data.share).toBeDefined();						// The "data" property should have kept data.
            expect(app._DataHub.watches.data.share.data).toEqual("retained value");	// The kept data should be what was shared previously.

            app.watch({data: watcher});							// Watch something that was already shared.

            expect(watcher.data).toEqual(null);					// Confirm share hasn't happened synchronously
            expect(app._DataHub.watches.data.watchers[watcher._DataHub.watcherId].transaction).toBeDefined();							// A share transaction should be present.
            expect(app._DataHub.watches.data.watchers[watcher._DataHub.watcherId].transaction.share.data).toEqual("retained value");	// The data waiting in the transaction should be the data shared previously.
            expect(watcher.setData.callCount).toEqual(0);			// setData shouldn't have been called yet.


            waitsFor(function () {
                return watcher.data !== null;
            }, 1000);

            runs(function () {
                expect(app._DataHub.watches.data.watchers[watcher._DataHub.watcherId].transaction).toBeNull();		// The reference to the share transaction should be removed.
                expect(watcher.setData.callCount).toEqual(1);		// setData should've have been called only once.
                expect(watcher.data).toEqual("retained value");
            });
        });

        it('.share ({data: ...}, {keep: true}): Keeps data marked as "keep" for future watchers; share synchronously.', function testDataHub_keepSyncShare_SW() {
            var watcher = new Watcher();
            spyOn(watcher, "setData").andCallThrough();

            app.share({data: "retained value"}, {keep: true});		// Share something before any watchers are set.
            app.watch({data: watcher}, {wait: true});				// Watch something that was already shared.

            expect(app._DataHub.watches.data.watchers[watcher._DataHub.watcherId].transaction).not.toBeDefined();	// No share transaction should be present since this was a synchronous share.
            expect(watcher.setData.callCount).toEqual(1);		// setData should have only been called once.

            expect(watcher.data).toEqual("retained value");
        });
    });

    describe("watch, then share (WS)", function () {
        it('.share ({data: ...}): Doesn\'t "keep" data or "wait"', function testDataHub_dontKeepAsyncShare_WS() {
            var watcher = new Watcher();
            spyOn(watcher, "setData").andCallThrough();

            app.watch({data: watcher});									// Watch something that hasn't been shared yet
            expect(watcher.data).toEqual(null);

            app.share({data: "unkept value"});
            expect(watcher.data).toEqual(null);							// Confirm share hasn't happened synchronously

            expect(app._DataHub.watches.data.share).not.toBeDefined();		// There should be no kept data.
            expect(app._DataHub.watches.data.watchers[watcher._DataHub.watcherId].transaction).toBeDefined();						// A share transaction should be present.
            expect(app._DataHub.watches.data.watchers[watcher._DataHub.watcherId].transaction.share.data).toEqual("unkept value");	// The data waiting in the transaction should be the data shared previously.
            expect(watcher.setData.callCount).toEqual(0);					// setData shouldn't have been called yet.

            waitsFor(function () {
                return watcher.data !== null;
            }, 1000);

            runs(function () {
                expect(app._DataHub.watches.data.watchers[watcher._DataHub.watcherId].transaction).toBeNull();		// The reference to the share transaction should be removed.
                expect(watcher.setData.callCount).toEqual(1);				// setData should've have been called only once.
                expect(watcher.data).toEqual("unkept value");
            });
        });

        it('.share ({data: ...}): Doesn\'t keep data for future watchers; share synchronously.', function testDataHub_dontKeepSyncShare_WS() {
            var watcher = new Watcher();
            spyOn(watcher, "setData").andCallThrough();

            app.watch({data: watcher}, {wait: true});			// Watch something that hasn't been shared yet
            expect(watcher.data).toEqual(null);

            app.share({data: "unkept value"});
            expect(app._DataHub.watches.data.share).not.toBeDefined();													// There should be no kept data.
            expect(app._DataHub.watches.data.watchers[watcher._DataHub.watcherId].transaction).not.toBeDefined();		// No transactions should have been created.
            expect(watcher.setData.callCount).toEqual(1);		// setData should've have been called only once.
            expect(watcher.data).toEqual("unkept value");
        });

        it('.share ({data: ...}, {keep: true}): Keeps data marked as "keep" for future watchers; share asynchronously.', function testDataHub_keepAsyncShare_WS() {
            var watcher = new Watcher();
            spyOn(watcher, "setData").andCallThrough();

            app.watch({data: watcher});
            expect(watcher.data).toEqual(null);	// Confirm share hasn't happened synchronously

            app.share({data: "retained value"}, {keep: true});
            expect(app._DataHub.watches.data.share).toBeDefined();						// The "data" property should have kept data.
            expect(app._DataHub.watches.data.share.data).toEqual("retained value");	// The kept data should be what was shared previously.

            expect(watcher.data).toEqual(null);					// Confirm share hasn't happened synchronously
            expect(app._DataHub.watches.data.watchers[watcher._DataHub.watcherId].transaction).toBeDefined();							// A share transaction should be present.
            expect(app._DataHub.watches.data.watchers[watcher._DataHub.watcherId].transaction.share.data).toEqual("retained value");	// The data waiting in the transaction should be the data shared previously.
            expect(watcher.setData.callCount).toEqual(0);			// setData shouldn't have been called yet.

            waitsFor(function () {
                return watcher.data !== null;
            }, 1000);

            runs(function () {
                expect(app._DataHub.watches.data.watchers[watcher._DataHub.watcherId].transaction).toBeNull();		// The reference to the share transaction should be removed.
                expect(watcher.setData.callCount).toEqual(1);		// setData should've have been called only once.
                expect(watcher.data).toEqual("retained value");
            });
        });

        it('.share ({data: ...}, {keep: true}): Keeps data marked as "keep" for future watchers; share synchronously.', function testDataHub_keepSyncShare_WS() {
            var watcher = new Watcher();
            spyOn(watcher, "setData").andCallThrough();

            app.watch({data: watcher}, {wait: true});			// Watch something that hasn't been shared yet
            expect(watcher.data).toEqual(null);

            app.share({data: "retained value"}, {keep: true});
            expect(app._DataHub.watches.data.share).toBeDefined();						// The "data" property should have kept data.
            expect(app._DataHub.watches.data.share.data).toEqual("retained value");	// The kept data should be what was shared previously.

            expect(app._DataHub.watches.data.watchers[watcher._DataHub.watcherId].transaction).not.toBeDefined();		// No transactions should have been created.
            expect(watcher.setData.callCount).toEqual(1);		// setData should've have been called only once.
            expect(watcher.data).toEqual("retained value");
        });
    });

    describe("watch, then share, then share again (WSS)", function () {
        it('.share ({data: ...}): Doesn\'t "keep" data or "wait"', function testDataHub_dontKeepAsyncShare_WSS() {
            var watcher = new Watcher();

            app.watch({data: watcher});			// Watch something that hasn't been shared yet
            expect(watcher.data).toEqual(null);

            app.share({data: "unkept value"});
            expect(watcher.data).toEqual(null);	// Confirm no synchronous share

            app.share({data: "unkept value 2"});
            expect(watcher.data).toEqual(null);	// Confirm no synchronous share

            var testDone = false;

            watcher.notify = function () {
                expect(app._DataHub.watches.data.share).not.toBeDefined();
                expect(watcher.data).toEqual("unkept value 2");
                testDone = true;
            };

            waitsFor(function () {
                return testDone;
            });
        });

        it('.share ({data: ...}, {keep: true}): Keeps data marked as "keep" for future watchers, share asynchronously.', function testDataHub_keepAsyncShare_WSS() {
            var watcher = new Watcher();

            app.watch({data: watcher});	// Watch something that hasn't been shared yet
            expect(watcher.data).toEqual(null);

            app.share({data: "retained value"}, {keep: true});
            expect(watcher.data).toEqual(null);	// Confirm not sharing synchronously

            app.share({data: "retained value 2"}, {keep: true});
            expect(watcher.data).toEqual(null);	// Confirm not sharing synchronously

            var testDone = false;

            watcher.notify = function () {
                expect(app._DataHub.watches.data.share).toBeDefined();
                expect(watcher.data).toEqual("retained value 2");
                testDone = true;
            };

            waitsFor(function () {
                return testDone;
            });
        });

        it('.share ({data: ...}): Doesn\'t keep data for future watchers; share synchronously.', function testDataHub_dontKeepSyncShare_WSS() {
            var watcher = new Watcher();

            app.watch({data: watcher}, {wait: true});	// Watch something that hasn't been shared yet
            expect(watcher.data).toEqual(null);

            app.share({data: "unkept value"});
            expect(watcher.data).toEqual("unkept value");

            app.share({data: "unkept value 2"});
            expect(watcher.data).toEqual("unkept value 2");
        });

        it('.share ({data: ...}, {keep: true}): Keeps data marked as "keep" for future watchers; share synchronously.', function testDataHub_keepSyncShare_WSS() {
            var watcher = new Watcher();

            app.watch({data: watcher}, {wait: true});			// Watch something that hasn't been shared yet
            expect(watcher.data).toEqual(null);

            app.share({data: "retained value"}, {keep: true});
            expect(watcher.data).toEqual("retained value");

            app.share({data: "retained value 2"}, {keep: true});
            expect(watcher.data).toEqual("retained value 2");
        });
    });


    describe("share, then watch, then share again (SWS)", function () {
        it('.share ({data: ...}): Doesn\'t "keep" data or "wait"', function testDataHub_dontKeepAsyncShare_SWS() {
            var watcher = new Watcher();

            var testDone = false;

            watcher.notify = function () {
                expect(app._DataHub.watches.data.share).not.toBeDefined();
                expect(watcher.data).toEqual("unkept value 2");
                testDone = true;
            };

            app.share({data: "unkept value"});
            app.watch({data: watcher});
            expect(watcher.data).toEqual(null);

            app.share({data: "unkept value 2"});
            expect(watcher.data).toEqual(null);

            waitsFor(function () {
                return testDone;
            }, 1000);
        });

        it('.share ({data: ...}): Doesn\'t keep data for future watchers; share synchronously.', function testDataHub_dontKeepSyncShare_SWS() {
            var watcher = new Watcher();

            app.share({data: "unkept value"});

            app.watch({data: watcher}, {wait: true});		// Watch something that hasn't been shared yet
            expect(watcher.data).toEqual(null);

            app.share({data: "unkept value 2"});
            expect(watcher.data).toEqual("unkept value 2");
        });

        it('.share ({data: ...}, {keep:true}): Keeps data marked as "keep" for future watchers; share asynchronously.', function testDataHub_keepAsyncShare_SWS() {
            var watcher = new Watcher();

            var testDone = false,
                sId;

            watcher.notify = function () {
                expect(app._DataHub.watches.data.share).toBeDefined();
                expect(watcher.data).toEqual("retained value 2");
                sId = app._DataHub.watches.data.share.shareId;
                testDone = true;
            };

            app.share({data: "retained value"}, {keep: true});

            app.watch({data: watcher});
            expect(watcher.data).toEqual(null);	// Confirm share hasn't happened synchronously

            app.share({data: "retained value 2"}, {keep: true});
            expect(watcher.data).toEqual(null);	// Confirm share hasn't happened synchronously

            waitsFor(function () {
                return testDone;
            }, 1000);

            waits(1000);

            runs(function () {
                // No further transactions should have taken place
                expect(app._DataHub.watches.data.share.shareId).toEqual(sId);
            });
        });

        it('.share ({data: {keep:true, wait:true}}): Keeps data marked as "keep" for future watchers; share synchronously.', function testDataHub_keepSyncShare_SWS() {
            var watcher = new Watcher();

            app.share({data: "retained value"}, {keep: true});
            app.watch({data: watcher}, {wait: true});			// Watch something that hasn't been shared yet
            expect(watcher.data).toEqual("retained value");	// "Keep"ing should share with us immediately

            app.share({data: "retained value 2"}, {keep: true});
            expect(watcher.data).toEqual("retained value 2");
        });
    });

    describe("share, then share again, then watch (SSW)", function () {
        it('.share ({data: ...}): Doesn\'t "keep" data or "wait".', function testDataHub_dontKeepAsyncShare_SSW() {
            var watcher = new Watcher();

            app.share({data: "unkept value"});
            app.share({data: "unkept value 2"});

            app.watch({data: watcher});

            var delayDone = false;
            setTimeout(function () {
                delayDone = true;
            }, 20);		// Set timer to go off after asynchronous share would complete

            waitsFor(function () {
                return delayDone;
            });

            runs(function () {
                expect(app._DataHub.watches.data.share).not.toBeDefined();
                expect(watcher.data).toEqual(null);
            });
        });

        it('.share ({data: ...}): Doesn\'t keep data for future watchers; share synchronously.', function testDataHub_dontKeepSyncShare_SSW() {
            var watcher = new Watcher();

            app.share({data: "unkept value"});
            expect(app._DataHub.watches.data.share).not.toBeDefined();

            app.share({data: "unkept value 2"});
            expect(app._DataHub.watches.data.share).not.toBeDefined();

            app.watch({data: watcher}, {wait: true});
            expect(app._DataHub.watches.data.share).not.toBeDefined();
            expect(watcher.data).toEqual(null);

            var delayDone = false;
            setTimeout(function () {
                delayDone = true;
            }, 20);		// Set timer to go off after asynchronous share would complete

            waitsFor(function () {
                return delayDone;
            });

            runs(function () {
                expect(app._DataHub.watches.data.share).not.toBeDefined();
                expect(watcher.data).toEqual(null);
            });
        });

        it('.share ({data: ...}, {keep: true}): Keeps data marked as "keep" for future watchers; share asynchronously.', function testDataHub_keepAsyncShare_SSW() {
            var watcher = new Watcher(),
                sId;

            app.share({data: "retained value"}, {keep: true});
            expect(app._DataHub.watches.data.share).toBeDefined();
            sId = app._DataHub.watches.data.share.shareId;

            app.share({data: "retained value 2"}, {keep: true});
            expect(app._DataHub.watches.data.share).toBeDefined();
            expect(app._DataHub.watches.data.share.shareId).not.toEqual(sId);	// New share ID for second share
            sId = app._DataHub.watches.data.share.shareId;

            var delayDone = false,
                testDone = false,
                secondShare = false;

            watcher.notify = function () {
                testDone = true;
                expect(app._DataHub.watches.data.share.shareId).toEqual(sId);	// No further shares
                expect(watcher.data).toEqual("retained value 2");
                watcher.notify = function () {
                    secondShare = true;
                };
            };

            app.watch({data: watcher});

            waitsFor(function () {
                return testDone;
            });

            runs(function () {
                expect(app._DataHub.watches.data.share.shareId).toEqual(sId);	// No further shares
                expect(watcher.data).toEqual("retained value 2");				// No change to the data
                setTimeout(function () {
                    delayDone = true;
                }, 20);				// Set timer to go off after asynchronous share would complete
            });

            waitsFor(function () {
                return delayDone;
            });

            runs(function () {
                expect(secondShare).toBeFalsy();
                expect(app._DataHub.watches.data.share.shareId).toEqual(sId);	// No further shares
                expect(watcher.data).toEqual("retained value 2");				// No change to the data
            });
        });

        it('.share ({data: ...}, {keep: true}): Keeps data marked as "keep" for future watchers; share synchronously', function testDataHub_keepSyncShare_SSW() {
            var watcher = new Watcher();

            app.share({data: "retained value"}, {keep: true});

            app.share({data: "retained value 2"}, {keep: true});

            app.watch({data: watcher}, {wait: true});
            expect(watcher.data).toEqual("retained value 2");

            var delayDone = false;
            setTimeout(function () {
                delayDone = true;
            }, 20);			// Set timer to go off after asynchronous share would complete

            waitsFor(function () {
                return delayDone;
            });

            runs(function () {
                expect(watcher.data).toEqual("retained value 2");		// No change to the data
            });
        });
    });

    describe("share, then watch; queued (SWQ)", function () {
        it('.share ({data: ...}): Doesn\'t "keep" data for future watchers; share asynchronously, queued.', function testDataHub_dontKeepAsyncShare_SWQ() {
            var watcher = new Watcher();

            app.share({data: "unkept value"});							// Share something before any watchers are set.
            app.watch({data: watcher}, {queue: true});					// Watch something that was already shared; queue shares.

            var delayDone = false;
            setTimeout(function () {
                delayDone = true;
            }, 20);			// Set timer to go off after asynchronous share would complete

            waitsFor(function () {
                return delayDone;
            });

            runs(function () {
                expect(app._DataHub.watches.data.share).not.toBeDefined();
                expect(watcher.data).toEqual(null);
            });
        });

        it('.share ({data: ...}): Doesn\'t keep data for future watchers; share synchronously, queued.', function testDataHub_dontKeepSyncShare_SWQ() {
            var watcher = new Watcher();

            app.share({data: "unkept value"});							// Share something before any watchers are set.
            app.watch({data: watcher}, {queue: true, wait: true});		// Watch something that was already shared; queue shares.

            expect(app._DataHub.watches.data.share).not.toBeDefined();
            expect(watcher.data).toEqual(null);

            app.share({data: "unkept value2"});						// Share again to ensure sharing isn't just failing

            expect(app._DataHub.watches.data.share).not.toBeDefined();
            expect(watcher.data).toEqual("unkept value2");
        });

        it('.share ({data: ...}, {keep: true}): Keeps data marked as "keep" for future watchers; share asynchronously, queued.', function testDataHub_keepAsyncShare_SWQ() {
            var watcher = new Watcher();

            app.share({data: "retained value"}, {keep: true});			// Share something before any watchers are set.
            app.watch({data: watcher}, {queue: true});					// Watch something that was already shared; queue shares.

            expect(watcher.data).toEqual(null);						// Confirm share hasn't happened synchronously

            waitsFor(function () {
                return watcher.data !== null;
            }, 1000);

            runs(function () {
                expect(watcher.data).toEqual("retained value");
            });
        });

        it('.share ({data: ...}, {keep: true}}): Keeps data marked as "keep" for future watchers; share synchronously, queued.', function testDataHub_keepSyncShare_SWQ() {
            var watcher = new Watcher();

            app.share({data: "retained value"}, {keep: true});			// Share something before any watchers are set.
            app.watch({data: watcher}, {queue: true, wait: true});		// Watch something that was already shared; queue shares.

            expect(watcher.data).toEqual("retained value");
        });
    });

    describe("watch, then share; queued (WSQ)", function () {
        it('.share ({data: ...}): Doesn\'t "keep" data or "wait, queued"', function testDataHub_dontKeepAsyncShare_WSQ() {
            var watcher = new Watcher();

            app.watch({data: watcher}, {queue: true});			// Watch something that hasn't been shared yet; queue shares
            expect(watcher.data).toEqual(null);
            app.share({data: "unkept value"});

            var delayDone = false;
            setTimeout(function () {
                delayDone = true;
            }, 20);	// Set timer to go off after asynchronous share would complete

            waitsFor(function () {
                return delayDone;
            }, 1000);

            runs(function () {
                expect(app._DataHub.watches.data.share).not.toBeDefined();
                expect(watcher.data).toEqual("unkept value");
            });
        });

        it('.share ({data: ...}): Doesn\'t keep data for future watchers; share synchronously, queued.', function testDataHub_dontKeepSyncShare_WSQ() {
            var watcher = new Watcher();

            app.watch({data: watcher}, {queue: true, wait: true});		// Watch something that hasn't been shared yet; queue shares
            expect(watcher.data).toEqual(null);

            app.share({data: "unkept value"});
            expect(watcher.data).toEqual("unkept value");
        });

        it('.share ({data: ...}, {keep:true}): Keeps data marked as "keep" for future watchers; share asynchronously, queued.', function testDataHub_keepAsyncShare_WSQ() {
            var watcher = new Watcher();

            app.watch({data: watcher}, {queue: true});		// Queue shares
            expect(watcher.data).toEqual(null);			// Confirm share hasn't happened synchronously

            app.share({data: "retained value"}, {keep: true});

            waitsFor(function () {
                return watcher.data !== null;
            }, 1000);

            runs(function () {
                expect(watcher.data).toEqual("retained value");
            });
        });

        it('.share ({data: {keep:true, wait:true}}): Keeps data marked as "keep" for future watchers; share synchronously, queued.', function testDataHub_keepSyncShare_WSQ() {
            var watcher = new Watcher();

            app.watch({data: watcher}, {queue: true, wait: true});		// Watch something that hasn't been shared yet; queue shares.
            expect(watcher.data).toEqual(null);

            app.share({data: "retained value"}, {keep: true});

            expect(watcher.data).toEqual("retained value");
        });
    });

    describe("watch, then share, then share again; queued (WSSQ)", function () {
        it('.share ({data: ...}): Doesn\'t "keep" data or "wait"; share asynchronously, queued', function testDataHub_dontKeepAsyncShare_WSSQ() {
            var watcher = new Watcher();

            app.watch({data: watcher}, {queue: true});		// Watch something that hasn't been shared yet; queue shares
            expect(watcher.data).toEqual(null);

            app.share({data: "unkept value"});
            expect(watcher.data).toEqual(null);	// Confirm no synchronous share

            app.share({data: "unkept value 2"});
            expect(watcher.data).toEqual(null);	// Confirm no synchronous share

            var nextTest = false,
                testDone = false;

            function secondNotify() {
                expect(app._DataHub.watches.data.share).not.toBeDefined();
                expect(watcher.data).toEqual("unkept value 2");
                testDone = true;
            }

            function firstNotify() {
                expect(app._DataHub.watches.data.share).not.toBeDefined();
                expect(watcher.data).toEqual("unkept value");
                watcher.notify = secondNotify;
                nextTest = true;
            }

            watcher.notify = firstNotify;

            waitsFor(function () {
                return nextTest;
            });
            waitsFor(function () {
                return testDone;
            });
        });

        it('.share ({data: {wait:true}}): Doesn\'t keep data for future watchers; share synchronously, queued.', function testDataHub_dontKeepSyncShare_WSSQ() {
            var watcher = new Watcher();

            app.watch({data: watcher}, {queue: true, wait: true});		// Watch something that hasn't been shared yet; queue shares
            expect(watcher.data).toEqual(null);

            app.share({data: "unkept value"});
            expect(watcher.data).toEqual("unkept value");

            app.share({data: "unkept value 2"});
            expect(watcher.data).toEqual("unkept value 2");
        });

        it('.share ({data: ...}, {keep:true}): Keeps data marked as "keep" for future watchers, share asynchronously, queued.', function testDataHub_keepAsyncShare_WSSQ() {
            var watcher = new Watcher();

            app.watch({data: watcher}, {queue: true});		// Watch something that hasn't been shared yet; queue shares
            expect(watcher.data).toEqual(null);

            app.share({data: "retained value"}, {keep: true});
            expect(watcher.data).toEqual(null);	// Confirm not sharing synchronously

            app.share({data: "retained value 2"}, {keep: true});
            expect(watcher.data).toEqual(null);	// Confirm not sharing synchronously

            var nextTest = false,
                testDone = false;

            function secondNotify() {
                expect(app._DataHub.watches.data.share).toBeDefined();
                expect(watcher.data).toEqual("retained value 2");
                testDone = true;
            }

            function firstNotify() {
                expect(app._DataHub.watches.data.share).toBeDefined();
                expect(watcher.data).toEqual("retained value");
                nextTest = true;
                watcher.notify = secondNotify;
            }

            watcher.notify = firstNotify;

            waitsFor(function () {
                return nextTest;
            });

            waitsFor(function () {
                return testDone;
            });
        });

        it('.share ({data: ...}, {keep:true}): Keeps data marked as "keep" for future watchers; share synchronously, queued.', function testDataHub_keepSyncShare_WSSQ() {
            var watcher = new Watcher();

            app.watch({data: watcher}, {queue: true, wait: true});			// Watch something that hasn't been shared yet; queue shares
            expect(watcher.data).toEqual(null);

            app.share({data: "retained value"}, {keep: true});
            expect(watcher.data).toEqual("retained value");

            app.share({data: "retained value 2"}, {keep: true});
            expect(watcher.data).toEqual("retained value 2");
        });
    });

    describe("share, then watch, then share again; queued (SWSQ)", function () {
        it('.share ({data: ...}): Doesn\'t "keep" data or "wait"; share asynchronously, queued', function testDataHub_dontKeepAsyncShare_SWSQ() {
            var watcher = new Watcher();

            var testDone = false;

            watcher.notify = function () {
                expect(app._DataHub.watches.data.share).not.toBeDefined();
                expect(watcher.data).toEqual("unkept value 2");
                testDone = true;
            };

            app.share({data: "unkept value"});
            app.watch({data: watcher}, {queue: true});		// Queue shares
            expect(watcher.data).toEqual(null);

            app.share({data: "unkept value 2"});
            expect(watcher.data).toEqual(null);

            waitsFor(function () {
                return testDone;
            }, 1000);
        });

        it('.share ({data: ...}): Doesn\'t keep data for future watchers; share synchronously, queued.', function testDataHub_dontKeepSyncShare_SWSQ() {
            var watcher = new Watcher();

            app.share({data: "unkept value"});

            app.watch({data: watcher}, {queue: true, wait: true});		// Watch something that hasn't been shared yet; queue shares
            expect(watcher.data).toEqual(null);

            app.share({data: "unkept value 2"});
            expect(watcher.data).toEqual("unkept value 2");
        });

        it('.share ({data: ...}, {keep: true}): Keeps data marked as "keep" for future watchers; share asynchronously, queued.', function testDataHub_keepAsyncShare_SWSQ() {
            var watcher = new Watcher();

            var nextTest = false,
                testDone = false,
                sId;

            function secondNotify() {
                expect(app._DataHub.watches.data.share).toBeDefined();
                expect(watcher.data).toEqual("retained value 2");
                sId = app._DataHub.watches.data.share.shareId;
                testDone = true;
            }

            function firstNotify() {
                expect(app._DataHub.watches.data.share).toBeDefined();
                expect(watcher.data).toEqual("retained value");
                watcher.notify = secondNotify;
                nextTest = true;
            }

            watcher.notify = firstNotify;

            app.share({data: "retained value"}, {keep: true});

            app.watch({data: watcher}, {queue: true});		// Queue shares
            expect(watcher.data).toEqual(null);			// Confirm share hasn't happened synchronously

            app.share({data: "retained value 2"}, {keep: true});
            expect(watcher.data).toEqual(null);			// Confirm share hasn't happened synchronously

            waitsFor(function () {
                return nextTest;
            }, 1000);

            waitsFor(function () {
                return testDone;
            }, 1000);

            waits(1000);

            runs(function () {
                // No further transactions should have taken place
                expect(app._DataHub.watches.data.share.shareId).toEqual(sId);
            });
        });

        it('.share ({data: ...}, {keep: true}): Keeps data marked as "keep" for future watchers; share synchronously, queued.', function testDataHub_keepSyncShare_SWSQ() {
            var watcher = new Watcher();

            app.share({data: "retained value"}, {keep: true});
            app.watch({data: watcher}, {queue: true, wait: true});		// Watch something that hasn't been shared yet; queue shares
            expect(watcher.data).toEqual("retained value");			// "Keep"ing should share with us immediately

            app.share({data: "retained value 2"}, {keep: true});
            expect(watcher.data).toEqual("retained value 2");
        });
    });

    describe("share, then share again, then watch; queued (SSWQ)", function () {
        it('.share ({data: ...}): Doesn\'t "keep" data or "wait"; share asynchronously, queued.', function testDataHub_dontKeepAsyncShare_SSWQ() {
            var watcher = new Watcher();

            app.share({data: "unkept value"});
            app.share({data: "unkept value 2"});

            app.watch({data: watcher}, {queue: true});		// Queue shares

            waits(1000);									// Wait for any possible asynchronous shares to complete

            runs(function () {
                expect(app._DataHub.watches.data.share).not.toBeDefined();
                expect(watcher.data).toEqual(null);
            });
        });

        it('.share ({data: ...}): Doesn\'t keep data for future watchers; share synchronously, queued.', function testDataHub_dontKeepSyncShare_SSWQ() {
            var watcher = new Watcher();

            app.share({data: "unkept value"});
            expect(app._DataHub.watches.data.share).not.toBeDefined();

            app.share({data: "unkept value 2"});
            expect(app._DataHub.watches.data.share).not.toBeDefined();

            app.watch({data: watcher}, {queue: true, wait: true});				// Queue shares
            expect(app._DataHub.watches.data.share).not.toBeDefined();
            expect(watcher.data).toEqual(null);

            waits(1000);														// Wait for any possible asynchronous shares to complete

            runs(function () {
                expect(app._DataHub.watches.data.share).not.toBeDefined();
                expect(watcher.data).toEqual(null);
            });
        });

        it('.share ({data: ...}, {keep: true}): Keeps data marked as "keep" for future watchers; share asynchronously, queued.', function testDataHub_keepAsyncShare_SSWQ() {
            var watcher = new Watcher(),
                sId;

            app.share({data: "retained value"}, {keep: true});
            expect(app._DataHub.watches.data.share).toBeDefined();
            sId = app._DataHub.watches.data.share.shareId;

            app.share({data: "retained value 2"}, {keep: true});
            expect(app._DataHub.watches.data.share).toBeDefined();
            expect(app._DataHub.watches.data.share.shareId).not.toEqual(sId);	// New transaction ID for second share
            sId = app._DataHub.watches.data.share.shareId;

            var testDone = false,
                secondShare = false;

            watcher.notify = function () {
                testDone = true;
                expect(app._DataHub.watches.data.share.shareId).toEqual(sId);	// No further transactions
                expect(watcher.data).toEqual("retained value 2");
                watcher.notify = function () {
                    secondShare = true;
                };
            };

            app.watch({data: watcher}, {queue: true});							// Queue shares

            waitsFor(function () {
                return testDone;
            });

            runs(function () {
                expect(app._DataHub.watches.data.share.shareId).toEqual(sId);	// No further transactions
                expect(watcher.data).toEqual("retained value 2");				// No change to the data
            });

            waits(1000);		// Wait for any further asynchronous shares to complete

            runs(function () {
                expect(secondShare).toBeFalsy();
                expect(app._DataHub.watches.data.share.shareId).toEqual(sId);	// No further transactions
                expect(watcher.data).toEqual("retained value 2");				// No change to the data
            });
        });

        it('.share ({data: ...}, {keep: true}): Keeps data marked as "keep" for future watchers; share synchronously, queued', function testDataHub_keepSyncShare_SSWQ() {
            var watcher = new Watcher(),
                sId;

            app.share({data: "retained value"}, {keep: true});
            expect(app._DataHub.watches.data.share).toBeDefined();
            sId = app._DataHub.watches.data.share.shareId;

            app.share({data: "retained value 2"}, {keep: true});
            expect(app._DataHub.watches.data.share).toBeDefined();
            expect(app._DataHub.watches.data.share.shareId).not.toEqual(sId);	// New transaction ID for second share
            sId = app._DataHub.watches.data.share.shareId;

            app.watch({data: watcher}, {queue: true, wait: true});				// Queue shares
            expect(watcher.data).toEqual("retained value 2");

            waits(1000);														// Wait for any further asynchronous shares to complete

            runs(function () {
                expect(app._DataHub.watches.data.share.shareId).toEqual(sId);	// No further transactions
                expect(watcher.data).toEqual("retained value 2");				// No change to the data
            });
        });
    });

    describe("Test arrays of watchers/shares", function testDataHub_arraysOfSharesAndWatchers() {
        it(".share ([[{data: ...}],[{data: ...}, {keep: true}]]):  Test an array of shares that have different options.", function testDataHub_arrayOfShares() {
            var watcher = new Watcher("Watcher One");
            var watcher2 = new Watcher("Watcher Two");

            app.watch({data: watcher}, {wait: true});
            app.share([
                [
                    {data: "value 1"}
                ],
                [
                    {data2: "value 2"},
                    {keep: true}
                ]
            ]);
            expect(app._DataHub.watches.data.share).not.toBeDefined();
            expect(app._DataHub.watches.data2.share).toBeDefined();

            expect(watcher.data).toEqual("value 1");
            expect(watcher2.data2).toBeNull();

            app.watch({data2: watcher2});

            waitsFor(function () {
                return watcher2.data2 !== null;
            });

            runs(function () {
                expect(watcher2.data2).toEqual("value 2");
            });
        });
        it(".watch ([[{data: watcher}, {wait: true}],[{data: watcher2}]]):  Test an array of watchers that have different options.", function testDataHub_arrayOfWatches() {
            var watcher = new Watcher("Watcher One");
            var watcher2 = new Watcher("Watcher Two");

            app.watch([
                [
                    {data: watcher},
                    {wait: true}
                ],
                [
                    {data: watcher2}
                ]
            ]);
            app.share({data: "a value"});
            expect(app._DataHub.watches.data.share).not.toBeDefined();

            expect(watcher.data).toEqual("a value");
            expect(watcher2.data).toBeNull();

            waitsFor(function () {
                return watcher2.data !== null;
            });

            runs(function () {
                expect(watcher2.data).toEqual("a value");
            });
        });
        it(".watch({data: [watcher, watcher2], data2: watcher}): Test an array of watchers in a normal watch map.", function testDataHub_arrayInWatchMap() {
            var watcher = new Watcher("Watcher One"),
                watcher2 = new Watcher("Watcher Two");

            app.watch({
                data : [
                    watcher,
                    watcher2
                ],
                data2: watcher
            }, {wait: true});

            app.share({data: "value 1"});
            app.share({data2: "value 2"});

            expect(watcher.data).toEqual("value 1");
            expect(watcher2.data).toEqual("value 1");

            expect(watcher.data2).toEqual("value 2");
            expect(watcher2.data2).toEqual(null);
        });
        it(".watch([[{data: [watcher, watcher2]}],[{data2: watcher}]]): Test an array of watchers in an array in a normal watch map.", function testDataHub_arrayOfArrayInWatchMap() {
            var watcher = new Watcher("Watcher One"),
                watcher2 = new Watcher("Watcher Two");

            app.watch([
                [
                    {
                        data: [
                            watcher,
                            watcher2
                        ]},
                    {wait: true}
                ],
                [
                    {
                        data2: watcher
                    },
                    {wait: true}
                ]
            ]);

            app.share({data: "value 1"});
            app.share({data2: "value 2"});

            expect(watcher.data).toEqual("value 1");
            expect(watcher2.data).toEqual("value 1");

            expect(watcher.data2).toEqual("value 2");
            expect(watcher2.data2).toEqual(null);
        });
    });

    describe("Test multiple-argument shares.", function testDataHub_multipleArguments() {
        it(".share ({data: [arg1, arg2, ...]}, {multiple: true):  Test async share of a property that has multiple arguments.", function testDataHub_multipleArgumentsAsync() {
            var testDone = false;

            var watcher = function (arg1, arg2) {
                expect(arg1).toEqual("value 1");
                expect(arg2).toEqual("value 2");
                testDone = true;
            };

            app.watch({data: watcher});
            app.share({data: ["value 1", "value 2"]}, {multiple: true});

            waitsFor(function () {
                return testDone;
            }, 1000);

            runs(function () {
                expect(app._DataHub.watches.data.share).not.toBeDefined();
                expect(testDone).toEqual(true);
            });
        });

        it(".share ({data: [arg1, arg2, ...]}, {multiple: true):  Test synchronous share of a property that has multiple arguments.", function testDataHub_multipleArgumentsSync() {
            var testDone = false;

            var watcher = function (arg1, arg2) {
                expect(arg1).toEqual("value 1");
                expect(arg2).toEqual("value 2");
                testDone = true;
            };

            app.watch({data: watcher}, {wait: true});
            app.share({data: ["value 1", "value 2"]}, {multiple: true});

            expect(app._DataHub.watches.data.share).not.toBeDefined();
            expect(testDone).toEqual(true);
        });
    });

    it(".share ({data: ...}):  Perform multiple async shares of the same property, confirming that only the most recent data is received.", function testDataHub_multipleAsyncShares() {
        var watcher = new Watcher()
            ;
        spyOn(watcher, "setData").andCallThrough();

        app.watch({data: watcher});
        app.share({data: "magic cookie1"});
        app.share({data: "magic cookie2"});

        waitsFor(function () {
            return watcher.data !== null;
        });

        runs(function () {
            expect(watcher.setData.argsForCall).toEqual([
                ["magic cookie2"]
            ]);	// Make sure that only one call to "setData" occurred, and that it was with the last share value as an argument.
            expect(watcher.data).toEqual("magic cookie2");
        });
    });

    it('.share ({data: ...}, {keep:true}): Keeps data marked as "keep" for future watchers.', function testDataHub_keepSyncShare() {
        var watcher = new Watcher();

        app.share({data: "retained value"}, {keep: true});			// Share something before any watchers are set.
        app.watch({data: watcher}, {wait: true});					// Watch something that was already shared.

        expect(watcher.data).toBe("retained value");
    });

    it(".ignore ({data: watcher}): Ignores data shared synchronously.", function testDataHub_ignoreSynchronously() {

        var watcher = new Watcher();

        app.watch({data: watcher}, {wait: true});
        app.share({data: "magic cookie"});

        app.ignore({data: watcher});
        app.share({data: "cookie monster"});

        expect(watcher.data).toEqual("magic cookie");

        app.watch({data: watcher}, {wait: true});
        app.share({data: "success" });

        expect(watcher.data).toBe("success");
    });

    it(".ignore ({data: watcher}): Ignores data shared asynchronously, preventing the share from occurring if it hasn't occurred yet.", function testDataHub_ignoreSynchronously() {

        var watcher = new Watcher();

        app.watch({data: watcher});
        app.share({data: "magic cookie"});

        waitsFor(function () {
            return watcher.data !== null;
        });

        runs(function () {
            expect(watcher.data).toEqual("magic cookie");
            app.share({data: "cookie monster"});

            app.ignore({data: watcher});	// We tell the watcher to ignore, next.  Because this operation is synchronous, the watcher should never get the new data.
        });

        waits(1000);						// INFO: Waits is deprecated, we need a better way of doing this.

        runs(function () {
            expect(watcher.data).toEqual("magic cookie");
        });
    });

    it(".free ({data: true}): Frees the specified kept data.", function testDataHub_free() {

        var watcher = new Watcher(),
            watcher2 = new Watcher(),
            watcher3 = new Watcher();

        app.watch({data: watcher}, {wait: true});
        app.share({data: "long-term retained value"}, {keep: true});

        //watcher should now have the retained value.

        app.watch({data: watcher2}, {wait: true});
        //watcher2 should now have the retained value

        app.free({data: true});
        app.watch({data: watcher3}, {wait: true});

        expect(watcher.data).toBe("long-term retained value");
        expect(watcher2.data).toBe("long-term retained value");
        expect(watcher3.data).not.toBe("long-term retained value");

        app.share({data: "a new value"});

        //all 3 should get the new value
        expect(watcher.data).toBe("a new value");
        expect(watcher2.data).toBe("a new value");
        expect(watcher3.data).toBe("a new value");
    });
});
