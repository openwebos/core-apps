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
 NOTE: This is the Calendar App's GUI starting point and control script for calendar.html.

 TODO: PLAN: Move FirstUse to AppView as a pane; should be called FirstLaunch to avoid confusion with actual FirstUse process & app.
 TODO: PLAN: Only run tests if "test" launch or URL param is present.
 **/
(function initializeCalendarView(window, undefined) {

    var DEBUG = !!this.DEBUG, // Inherit any globally defined DEBUG state.
        enyoApp = enyo.application,
        firstLaunchView;

    DEBUG && console.log("\tAPP WINDOW VISIBLE\t" + (timing.start + Date.now()) + "\t\tPERF\t");

    var firstLaunchWatcher = {
        firstLaunch: {
            name          : "firstLaunchWatcher",
            setFirstLaunch: function setFirstLaunch(firstLaunch) {
                showView(firstLaunch);									// If we are going to show the main view, do so first before destroying First Launch (perf).
                if (!firstLaunch && firstLaunchView) {
                    !firstLaunchView.destroyed && firstLaunchView.destroy();			//		Destroy first Launch.
                    firstLaunchView = undefined;
                }
            }
        }
    };

    function showView(isFirstLaunch) {
        var view;

        if (isFirstLaunch) {                                                    // If this is the Calendar application's first launch:
            view = enyoApp.view = firstLaunchView = new calendar.FirstLaunchView();					//		Create the First Launch view.
        } else {                                                                // Otherwise:
            enyoApp.ignore(firstLaunchWatcher);										//		Ignore First Launch changes.
            view = enyoApp.view = new calendar.AppView();										//		Create the main view.
        }
        view.renderInto(window.document.body);									// Display the created view.
    }

    window.addEventListener("unload", function cleanupCalendarViewInitialization() {
        enyoApp.ignore(firstLaunchWatcher);
    }, false);

    enyoApp.watch(firstLaunchWatcher, {wait: true});											// Watch to see which view to load into the main window.

})(this);
