// @@@LICENSE
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
// LICENSE@@@


enyo.kind({
    name      : "calendar.FirstLaunchView",
    kind      : enyo.VFlexBox,
    className : "enyo-bg",
    components: [
        {kind: "ApplicationEvents", onUnload: "unloadHandler"},
        {name        : "firstLaunch", kind: "firstLaunchView", onAccountsFirstLaunchDone: "firstLaunchCompleted", capability: 'CALENDAR',
            iconSmall: "../images/header-icon-calendar48x48.png",
            iconLarge: "../images/icon-256x256.png"}
    ],

    create: function create() {
        this.inherited(arguments);
    },

    destroy: function destroy() {
        this.inherited(arguments);
    },

    ready: function ready() {
        var msgs = {
            pageTitle: $L("Your calendar accounts"),
            welcome  : $L("To get started, set up a Calendar account")
        };
        var exclude = undefined;
        this.$.firstLaunch.startFirstLaunch(exclude, msgs);
    },

    unloadHandler: function unloadHandler() {
        DEBUG && this.log("======= UNLOADING...\t");
        this.destroy();
    },

    firstLaunchCompleted: function firstLaunchCompleted() {
        enyo.application.share({firstLaunchDone: true});
    }

});
