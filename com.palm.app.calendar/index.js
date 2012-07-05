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
 NOTE: This is the Calendar app's starting point and control script for index.html.

 TODO: Only run tests if "test" launch or URL param is present.
 **/
(function initializeCalendarApp(global, undefined) {

    var DEBUG = !!this.DEBUG;		// Inherit any globally defined DEBUG state.

    function begin() {
        initializeTiming(true);

        enyo.application.app = enyo.application.app || new calendar.App();

        // initializeUtils();
        // initializeTests();
        initializeTiming(false);
    }

    function initializeTests() {
        // TODO: Only run tests if "test" launch or URL param is present.
        enyo.loadScript && enyo.loadScript("tests/testContactsManager.js");
    }

    function initializeTiming(start) {
        if (!start) {
            DEBUG && console.log("===:===: Calendar app initialized\t: ".toUpperCase() + (timing.start + Date.now()) + " ms");
            return;
        }
        DEBUG && console.log("===:===: Calendar app resources loaded\t: ".toUpperCase() + (timing.start + Date.now()) + " ms");

        global.document && document.addEventListener("DOMContentLoaded", function calendarDOMLoaded() {
            DEBUG && console.log("===:===: Calendar app DOM loaded\t: ".toUpperCase() + (timing.start + Date.now()) + " ms");
        });

        global.window && window.addEventListener("load", function calendarViewLoaded() {
            // console.profileEnd && console.profileEnd ("calendar");
            DEBUG && console.log("===:===: Calendar app GUI loaded\t: ".toUpperCase() + (timing.start + Date.now()) + " ms");
        });
    }

    function initializeUtils() {
        LogsConfig = [
            {    host : global,
                config: {
                    prepend: "\n\n===:===: Calendar: ",
                    append : "\n\n",
                    level  : "log"
                }
            }
        ];
        enyo.loadScript && enyo.loadScript("libs/Logger.js");
    }

    begin();

})(this);
