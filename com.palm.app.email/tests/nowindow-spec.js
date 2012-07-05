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

/*global describe, it, beforeEach, expect, waits, waitsFor, runs, spyOn, enyo, EmailAppLaunch, EmailApp, window, setTimeout */

// Here we test the toplevel email global state machinery, not the actual mail app and operations.
describe('EmailAppLaunch', function () {

    beforeEach(function () {
        mockServices();
    });

    it('launches', function () {
        runs(function () {
            // The following should be the same as
            //     enyo.windows.activate("index.html"); //asynchronous
            // but alas, something gets bound wrong when we do that. (enyo? jasmine.suite? Fixme?)
            enyo.application.launcher = new EmailAppLaunch();
            enyo.applicationRelaunchHandler = function (params) {
                enyo.application.launcher.relaunch(params);
            };
            enyo.application.launcher.startup();
        });
        waitsFor(function () {
            return enyo.application.launcher;
        }, "windowless launch", 1000);
        runs(function () {  // After a waitsFor, any other testing/futzing has to be in a runs().
            // Tautologically defined given the waitsFor, but jasmine doesn't report results of specs that have no expect clause.
            expect(enyo.application.launcher).toBeDefined();
        });
    });
    it('has no window', function () {  // We'll separately test that the "mail" app DOES have a window.
        expect(1).toBe(1); // FIXME: show that there's no EmailAppLaunch window. But how?
    });
    it('has prefs', function () {
        waitsFor(function () {
            return enyo.application.prefs;
        }, "prefs", 1000);
        runs(function () {
            expect(enyo.application.prefs).toBeDefined(); // FIXME: more thorough test, please.
        });
    });
    it('has folder processor', function () {
        waitsFor(function () {
            return enyo.application.folderProcessor;
        }, "folder processor", 1000);
        runs(function () {
            expect(enyo.application.folderProcessor).toBeDefined(); // FIXME: more thorough test, please.
        });
    });
    it('has emailProcessor', function () {
        waitsFor(function () {
            return enyo.application.emailProcessor;
        }, "email processor", 1000);
        runs(function () {
            expect(enyo.application.emailProcessor).toBeDefined(); // FIXME: more thorough test, please.
        });
    });
    it('has dashboardManager', function () {
        var callbackDone = false;
        waitsFor(function () {
            return enyo.application.dashboardManager;
        }, "dashboard manager", 1000);
        // FIXME. This isn't yet really a test of the dashboard manager functionality. It just exercises the spy machinery a (very) little bit.
        runs(function () {
            spyOn(enyo.application.dashboardManager.$.screenState, "call").andCallFake(function () {
                var mock = EmailApp.Util.clone(enyo.g11n.Utils.getJsonFile({path: "tests/mock",
                    locale: "dashboardManager_screenState"
                }));
                // In this particular case, we could directly (synchronously) do:
                //    enyo.application.dashboardManager.displayUpdate(enyo.application.dashboardManager, mock);
                // However, that doesn't simulate the asynchronous behavior of a service call.
                var thunk = function () {
                    enyo.application.dashboardManager.displayUpdate(enyo.application.dashboardManager, mock);
                    callbackDone = true;
                };
                window.setTimeout(thunk, 0);
            });
            enyo.application.dashboardManager.$.screenState.call();
        });
        waitsFor(function () {
            // If we're not doing the fancy asynchronous thing above:
            //     return enyo.application.dashboardManager.$.screenState.call.callCount > 0;
            // But if we are:
            return callbackDone;
        }, "control status", 1000);
        runs(function () {
            expect(enyo.application.dashboardManager.displayOff).toBe(false);
        });
    });
    it('has accounts', function () {
        expect(1).toBe(1); // FIXME: test, please
    });
    it('relaunches as same object', function () {
        expect(1).toBe(1); // FIXME: test, please
    });

    // Waits for mail to be fully instantiated, so that the specs (and their beforeEach functions) in mail/tests/spec can run.
    it('launches mail app', function () {
        waitsFor(function () {
            return enyo.application.mailApp && enyo.application.mailApp.$ && enyo.application.mailApp.$.mail;
        }, "mail app", 2000);
        runs(function () {
            expect(enyo.application.mailApp.$.mail).toBeDefined();
        });
    });
    it('sets prefs defaultAccountId', function () {
        // The mock prefs db has defaultAccountId: ''.  This test queries the prefs db with a callback grab the prefs, and then checks it.
        var answer; // holds the retrieved prefs obj.
        runs(function () {
            EmailApp.Util.callService('palm://com.palm.db/find', {query: {from: "com.palm.app.email.prefs:1"}}, function (result) {
                answer = result.results[0];
            });
        });
        waitsFor(function () {
            return answer;
        }, "db callback", 500);
        runs(function () {
            expect(answer.defaultAccountId).toBe("fake-account-1");
        });
    });

    // emailFind is a dbService that does not go through EmailApp.Util.callService() defined above.
    // Here we stub in a .call() function to use our callService() responder. Of course, the operations of dbService are a little different,
    // which creates some hair here.
    it('has emailFind service', function () {
        var mail = enyo.application.mailApp.$.mail;
        waitsFor(function () {   // First wait until the components are initialized.
            return mail.$.emailFind && mail.$.mailList;
        }, "emailFind service", 2000);
        runs(function () {
            var service = mail.$.emailFind;
            expect(service).toBeDefined();
        });
    });
});