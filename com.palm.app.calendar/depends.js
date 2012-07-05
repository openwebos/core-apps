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


var DEBUG = !!(enyo.args && enyo.args.debug);	// Define global DEBUG state used by all modules. TODO: move to AppComponent.debug.

enyo.depends(
    "$enyo-lib/accounts/",
    "libs/DataHub.js",
    "libs/date.js", // Okay because DateJS now avoids multiple instantiation thereby avoiding the Date.toString() stack overflow issue.
    "libs/Mojo.Core.Service.js", // Required by MojoLoaded calendar 1.0 library.
    "libs/Mojo.Service.Request.js", // Required by MojoLoaded calendar 1.0 library.
    "app/App.js",
    "app/AppIcon.js",
    "app/shared/BusyFreeManager.js",
    "app/shared/CacheManager.js",
    "app/shared/CalendarEvent.js",
    "app/shared/CalendarsManager.js",
    "app/shared/DatabaseManager.js",
    "app/shared/LayoutManager.js",
    "app/shared/LunaAppManager.js",
    "app/shared/PrefsManager.js",
    "app/shared/ReminderManager.js",
    "app/shared/Utilities.js"
);
