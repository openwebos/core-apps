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
/*global enyo, console, $L, window */

enyo.kind({
    name     : "contactsFirstUse",
    kind     : enyo.VFlexBox,
    className: "enyo-bg",

    components: [
        {name        : "firstLaunch", kind: "firstLaunchView", onAccountsFirstLaunchDone: "openMainAppView", capability: 'CONTACTS',
            iconSmall: "images/header-icon-contacts-48x48.png",
            iconLarge: "images/first-launch-contacts.png"}
    ],

    create: function create() {
        this.inherited(arguments);
    },

    ready: function ready() {
        if (true) {
            var msgs = {
                    pageTitle: $L("Your contacts accounts"),
                    welcome  : $L("To get started, set up a Contacts account")
                },
                exclude;
            this.$.firstLaunch.startFirstLaunch(exclude, msgs);
        }
    },

    destroy: function () {
        this.inherited(arguments);
    },

    openMainAppView: function openMainAppView() {
        window.startTheApp();
    }

});
