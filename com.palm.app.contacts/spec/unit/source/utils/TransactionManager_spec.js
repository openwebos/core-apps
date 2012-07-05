// LICENSE@@@
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
// @@@LICENSE

/*jslint white: true, onevar: true, undef: true, eqeqeq: true, plusplus: true, bitwise: true,
 regexp: true, newcap: true, immed: true, nomen: false, maxerr: 500 */
/*global ContactsLib, document, TransactionManager, enyo, console, describe, it, expect, runs, waits, waitsFor */

describe("TransactionManager", function () {
    var transactionManager;

    it("Should be present", function () {
        transactionManager = new TransactionManager();
        expect(transactionManager).toBeDefined();
    });

    /*it("BeginTransaction - timesout properly", function () {
     runs(function () {
     transactionManager.BeginTransaction("TestTransactionA");
     expect(transactionManager.curTransaction).toEqual("TestTransactionA");
     });

     waitsFor(function () {
     return (transactionManager.curTransaction === undefined);
     }, "Error - transaction didn't timeout in time", 11000); // The default timeout is 10000ms
     });*/

    it("BeginTransaction - ends after explicit timeout of 2 secs", function () {
        runs(function () {
            transactionManager.BeginTransaction("TestTransactionB", 2000);
            expect(transactionManager.curTransaction).toEqual("TestTransactionB");
        });

        waitsFor(function () {
            return (transactionManager.curTransaction === undefined);
        }, "Error - transaction didn't end in time", 3000);
    });

    it("EndTransaction", function () {
        runs(function () {
            transactionManager.BeginTransaction("TestTransactionC");
            waits(1000);
        });

        runs(function () {
            transactionManager.EndTransaction();
            expect(transactionManager.curTransaction).toBeUndefined();
        });
    });
});
