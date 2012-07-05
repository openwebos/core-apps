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
 NOTE: This script is meant to hold modules of code used to profile parts of the calendar application.
 - Currently works in WebKit & Safari browsers.
 - Add ../tests/profiling.js to calendar.html to enable this profiling module.
 - Switch to Day View to see 24hr mode changes.
 - Switch to Month View to see Start of Week changes.

 TODO: Support starting and stopping individual profiling on-demand.

 TODO: Support other profiling APIs, i.e. webOSProfiler, i.e.:
 webosEvent.start ("", "calendar.startOfWeek", JSON.stringify (enyo.application.prefsManager.prefs));
 webosEvent.stop ("", "calendar.startOfWeek", "");
 **/
var profiling =
{    ok: this.console && (typeof console.profile != "undefined") && (typeof console.profileEnd != "undefined")
//,	property	: value
};

setTimeout(function defineProfilingModules() {

    change24HrModeThread = setInterval(function change24HrMode() {
        profiling.ok && !profiling.is24HrCount && (profiling.is24HrCount = 1) && console.profile("is24Hr");

        if (!profiling.ok || profiling.is24HrCount % 9 == 0) {                // Change 24Hr mode 10 times.
            profiling && profiling.ok && console.profileEnd("is24Hr");
            clearInterval(change24HrModeThread);
            delete (profiling.is24HrCount);
            return;
        }

        var is24Hr = !!((++profiling.is24HrCount) % 2 == 0);
        enyo.application.share({is24Hr: is24Hr});
    }, 1000);


    changeStartOfWeekThread = setInterval(function changeStartOfWeek() {
        profiling.ok && !profiling.startOfWeekCount && (profiling.startOfWeekCount = 1) && console.profile("StartOfWeek");

        if (!profiling.ok || profiling.startOfWeekCount % 15 == 0) {        // Change to start of week to everyday twice.
            profiling.ok && console.profileEnd("StartOfWeek");
            clearInterval(changeStartOfWeekThread);
            delete (profiling.startOfWeekCount);
            return;
        }

        var prefs = enyo.application.prefsManager.prefs;
        prefs.startOfWeek = (prefs.startOfWeek % 7) + 1;
        ++profiling.startOfWeekCount;
        enyo.application.share({prefs: prefs});
    }, 1000);

}, 5000);
