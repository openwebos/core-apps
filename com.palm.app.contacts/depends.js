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
/*global $contactsui_path:true, runningInBrowser:true, window, enyo  */

var pathsToImport = [
    // temp framework patches
    "app/patches.js",

    // framework libraries
    "$enyo-lib/systemui/",
    "$enyo/g11n/address/",
    "$enyo-lib/contactsui/", //Contacts UI library should point to $enyo-lib/contactsui/ for production OR optionally contactsui/ for rapid development

    // app files
    "app/AppLaunch.js",
    "app/SwipeableFancyInput.js",
    "app/EditableGroup.js",
    "app/EditableField.js",
    "app/Ringtones.js",
    "app/PseudoDetailsInApp.js",
    "app/Details.js",
    "app/Edit.js",
    "app/Prefs.js",
    "app/SplitPane.js",
    "app/ContactsApp.js",
    "app/FirstUse.js",

    "app/dialogs/AddToContactsDialog.js",
    "app/BirthdayPicker.js",
    "app/dialogs/ContactCountDialog.js",
    "app/dialogs/LinkDetails.js",
    "app/dialogs/NameDetails.js",
    "app/dialogs/OKCancelDialog.js",

    "app/utils/TransactionManager.js",
    "app/utils/GALHelper.js",
    "app/utils/VCardHelper.js",

    "css/contacts.css"
];

var mockPathsToImport = [
    "mock/ObjectUtils.js",
    "mock/mockStuffs.js"
];

runningInBrowser = (window.PalmSystem ? false : true);

if (!runningInBrowser) {
    /* emulator or device */
    enyo.depends.apply(this, pathsToImport);
} else {
    /* browser */
    enyo.depends.apply(this, mockPathsToImport.concat(pathsToImport));
}

var specsToTest = [
    "tests/ContactsAppSpecs.js"
];

/*
 //THIS SECTION IS FOR CENTAUR TUNNELING
 if (!window.PalmSystem){

 window.PalmSystem = {
 deviceInfo: '{"screenWidth": ' + document.width +
 ', "screenHeight": ' + document.height +
 ', "minimumCardWidth": ' + document.width +
 ', "minimumCardHeight": 188, "maximumCardWidth": ' +
 document.width + ', "maximumCardHeight": ' + document.height +
 ', "keyboardType": "QWERTY"}',
 launchParams: "{}",
 addBannerMessage: "",
 removeBannerMessage: function() {},
 clearBannerMessages: function() {},
 simulateMouseClick: function() {},
 stageReady: function() {},
 playSoundNotification: "",
 runTextIndexer: function(a) { return a;},
 version: "mojo-host",
 simulated: false,
 timeFormat: "HH12",
 locale: "en_us",
 localeRegion: "en_us",
 screenOrientation: 'up',
 windowOrientation: 'up',
 receivePageUpDownInLandscape: function() {},
 enableFullScreenMode: function() {},
 setWindowProperties: function() {},
 setWindowOrientation: function() {},
 identifier: "com.palm.app.contacts",
 isMinimal: false
 };

 }
 */
