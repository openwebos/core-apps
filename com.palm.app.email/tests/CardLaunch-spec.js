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

/*global describe, it, xit, expect, waits, waitsFor, runs, spyOn, enyo, EmailAppLaunch, window, console */

// Here we test the toplevel email global state machinery, not the actual mail app and operations.
describe('EmailCardLaunch', function () {
    if (!enyo.application.launcher) {
        enyo.application.launcher = new EmailAppLaunch();
        enyo.applicationRelaunchHandler = function (params) {
            enyo.application.launcher.relaunch(params);
        };
        enyo.application.launcher.startup();
    }

    // Takes a prefix of a window name and returns true if one matches
    var findWindowByPrefix = function (prefix) {
        var windows = Object.keys(enyo.windows.getWindows());
        return windows.some(function (name) {
            return name.indexOf(prefix) !== -1;
        });
    };

    it('does not start with the compose view', function () {
        // verify we do not have it initially
        expect(findWindowByPrefix('compose')).toBe(false);
    });

    it('launches the compose view', function () {
        var found = false;
        enyo.application.launcher.launchCompose({});

        waitsFor(function () {
            found = findWindowByPrefix('compose');
            return found;
        }, 'compose view', 1000);

        runs(function () {
            expect(found).toBe(true);
        });
    });

    it('deactivates composer correctly', function () {
        var found = true;
        var windows = Object.keys(enyo.windows.getWindows());
        windows.forEach(function (name) {
            if (name.indexOf("compose") !== -1) {
                console.log("AK: deactivating: " + name);
                enyo.windows.fetchWindow(name).close();
            }
        });
        waitsFor(function () {
            found = findWindowByPrefix('compose');
            return found === false;
        }, 'compose view to disappear', 2000);

        runs(function () {
            expect(found).toBe(false);
        });
    });
});
