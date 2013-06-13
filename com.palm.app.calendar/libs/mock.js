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


/**
 NOTE: This script defines a mock environment to allow the Calendar app to be viewed and debugged as a web page.

 TODO: Add events for multiple days.
 **/
(function defineMockEnvironment(global, DEBUG) {

    var override;

    function begin() {
        global.MOCK = {
            doNothing : function doNothing() {
            },
            initialize: initialize
        };
    }

    function initialize(options) {
        override = !!(options && options.override);
        !DEBUG && (DEBUG = global.DEBUG);
        mockData();
        mockCalendar();
    }

    function mockData() {
        if (top != window && top.MOCK && top.MOCK.events) {        // If in a multi-window predefined MOCK environment
            MOCK = top.MOCK;									//		point local MOCK to the original.
            return;
        }
//		var times =
//		[	[11, 0], [13, 0]	// 11:00 am - 01:00 pm
//		,	[11,30], [12,30]	// 11:30 am - 12:30 pm
//		,	[ 8,15], [ 9,15]	// 08:15 am - 09:15 am
//		,	[14, 0], [15, 0]	// 02:00 pm - 03:00 pm
//		,	[ 8,45], [10,15]	// 08:45 am - 10:15 am
//		]
        var times = [
            [ 1, 0],
            [ 2, 0],
            // 01:00 am - 02:00 am  //Single event, even hour
            [ 3, 0],
            [ 3, 10],
            // 03:00 am - 03:10 am  //Single event, less than 30 mins
            [ 4, 30],
            [ 5, 30],
            // 04:30 am - 05:30 am  //Single event starts & ends not on hour lines
            [ 6, 00],
            [ 8, 00],
            // 06:00 am - 08:00 am  //{_ Overlapping events
            [ 6, 30],
            [ 7, 45],
            // 06:30 am - 07:45 am  //}
            [ 8, 0],
            [ 9, 0],
            // 08:00 am - 09:00 am  //{_ Overlap, ending with less than 30 minutes
            [ 8, 55],
            [ 9, 15],
            // 08:55 am - 09:15 am  //}
            [11, 0],
            [11, 45],
            // 11:00 am - 11:45 am  //{_Two groups that start in the same hour
            [11, 45],
            [12, 45]    // 11:45 am - 12:45 pm  //}
        ];


        for (var timeMachine = new Date(), time, start, end, i = times.length; i--;) {
            time = times    [i];
            times [i] = (timeMachine.setHours(time[0]), timeMachine.setMinutes(time[1]), timeMachine.setSeconds(0), timeMachine.setMilliseconds(0));
        }

        MOCK.emptyArray = [];

        MOCK.failureResponse = {
            errorCode  : Number.MIN_VALUE,
            errorText  : "This is a mock failed service response.",
            returnValue: false
        };

        MOCK.successResponse = {
            returnValue: true
        };

        MOCK.prefs = {
        };

        MOCK.accounts = [
            {_id: "a1", username: "webOS@facebook.com", templateId: "com.palm.facebook", alias: "My Facebook", loc_name: "Facebook"},
            {_id: "a2", username: "webOS@google.com", templateId: "com.palm.google", alias: "My Google", loc_name: "Google"},
            {_id: "a3", username: "webOS@microsoft.com", templateId: "com.palm.eas", alias: "My Outlook", loc_name: "Microsoft Exchange"    },
            {_id: "a4", username: "webOS@palm.com", templateId: "com.palm.palmprofile", alias: "My HP webOS Account", loc_name: "HP webOS Account"},
            {_id: "a5", username: "webOS@yahoo.com", templateId: "com.palm.yahoo", alias: "My Yahoo!", loc_name: "Yahoo!"},
            {_id: "a6", username: "webOS@aol.com", templateId: "com.palm.aol", alias: "AOL", loc_name: "AOL"},
            {_id: "a7", username: "webOS@hotmail.com", templateId: "com.palm.hotmail", alias: "Hot Mail", loc_name: "Hot Mail"},
            {_id: "a8", username: "webOS@gmail.com", templateId: "com.palm.gmail", alias: "Gmail Office", loc_name: "Gmail Office"}
        ];

        MOCK.calendars = [
            {_id: "c4", accountId: "a4", readOnly: false, color: "green", name: "HP webOS Account", on: true, visible: true, syncSource: "Local"        },  //blue		#91d3ea	#33f	#c2ecf8
            {_id: "c3", accountId: "a3", readOnly: false, color: "red", name: "Microsoft Exchange", on: true, visible: true},                               //orange	#fded23	#f100ff
            {_id: "c1", accountId: "a1", readOnly: true, color: "blue", name: "Facebook", on: true, visible: true},                                         //red		#f33	#ff9797 #3B5998
            {_id: "c2", accountId: "a2", readOnly: false, color: "orange", name: "Google", on: true, visible: true},                                        //green	    #62dc34	#bcffba
            {_id: "c5", accountId: "a5", readOnly: false, color: "pink", name: "Yahoo!", on: true, visible: true},                                          //yellow	#731A8B
            {_id: "c6", accountId: "a6", readOnly: false, color: "purple", name: "aol", on: true, visible: true},                                           //yellow	#731A8B
            {_id: "c7", accountId: "a7", readOnly: false, color: "teal", name: "hotmail", on: true, visible: true},                                         //yellow	#731A8B
            {_id: "c8", accountId: "a8", readOnly: false, color: "yellow", name: "gmail", on: true, visible: true}                                          //yellow	#731A8B
        ];

        MOCK.allDayEvents = [
            {_id     : "e06", calendarId: "c4", dtstart: times[8], dtend: times[9], accountId: "a4", subject: "Building the future...", location: "Silicon Valley", attendees: [
                {commonName: "Mike Lee (Palm GBU)", role: "REQ-PARTICIPANT"}
            ], allDay: true},
            {_id     : "e07", calendarId: "c2", dtstart: times[8], dtend: times[9], accountId: "a2", subject: "Building the future...", location: "Silicon Valley", attendees: [
                {commonName: "Lauren Lagarde (Palm GBU)", role: "REQ-PARTICIPANT"}
            ], allDay: true},
            {_id     : "e08", calendarId: "c5", dtstart: times[8], dtend: times[9], accountId: "a5", subject: "Building the future...", location: "Silicon Valley", attendees: [
                {commonName: "Rukhsana Azeem (Palm GBU)", role: "REQ-PARTICIPANT"}
            ], allDay: true},
            {_id     : "e09", calendarId: "c1", dtstart: times[8], dtend: times[9], accountId: "a1", subject: "Building the future...", location: "Silicon Valley", attendees: [
                {commonName: "Robert Yawn (Palm GBU)", role: "REQ-PARTICIPANT"}
            ], allDay: true}
        ];

        MOCK.events = [
            {_id: "e01", calendarId: "c2", dtstart: times[0], dtend: times[1], accountId: "a2", subject: "01:00 am - 02:00 am", location: "Building 3 Parking Lot", note: "To celebrate another amazing release we will be having a BBQ outside building 1!<br /><br />There will be burgers, brats, and beer.", rrule: {freq: "WEEKLY", interval: 4, wkst: 0, rules: [
                {"ruleType": "BYDAY", "ruleValue": [
                    {"day": 1},
                    {"day": 3}
                ]}
            ] }},
            {_id       : "e02", calendarId: "c3", dtstart: times[2], dtend: times[3], accountId: "a3", subject: "03:00 am - 03:10 am", location: "Ruby's Office Next to the staircase under the roof", attendees: [
                {commonName: "Ruby Johnenstein (Palm GBU)"}
            ], reminder: "-PT15M"},
            {_id: "e03", calendarId: "c1", dtstart: times[4], dtend: times[5], accountId: "a1", subject: "04:30 am - 05:30 am", location: "The penthouse veranda", attendees: [
                {commonName: "Dana Sculley (FBI)", role: "REQ-PARTICIPANT", organizer: true, email: "dana.sculley@fbi.gov"},
                {commonName: "Fox Mulder (FBI)", role: "REQ-PARTICIPANT", email: "fox.mulder@fbi.gov"}
            ]},
            {_id: "e04", calendarId: "c5", dtstart: times[6], dtend: times[7], accountId: "a5", subject: "06:00 am - 08:00 am", location: "The hut on the beach", attendees: [
                {commonName: "John John (Palm GBU)", role: "REQ-PARTICIPANT"},
                {commonName: "Special Someone", role: "REQ-PARTICIPANT", organizer: true}
            ]},
            {_id: "e05", calendarId: "c4", dtstart: times[8], dtend: times[9], accountId: "a4", subject: "06:30 am - 07:45 am", location: "Palm Cafe", attendees: [
                {commonName: "Everyone! (Palm GBU)", role: "REQ-PARTICIPANT"},
                {commonName: "El Rubyo (Palm GBU)", role: "REQ-PARTICIPANT", organizer: true}
            ]},
            {_id: "e10", calendarId: "c4", dtstart: times[10], dtend: times[11], accountId: "a4", subject: "08:00 am - 09:00 am", location: "Palm Cafe", attendees: [
                {commonName: "Everyone! (Palm GBU)", role: "REQ-PARTICIPANT"},
                {commonName: "El Rubyo (Palm GBU)", role: "REQ-PARTICIPANT", organizer: true}
            ]},
            {_id: "e11", calendarId: "c4", dtstart: times[12], dtend: times[13], accountId: "a4", subject: "08:55 am - 09:15 am", location: "Palm Cafe", attendees: [
                {commonName: "Everyone! (Palm GBU)", role: "REQ-PARTICIPANT"},
                {commonName: "El Rubyo (Palm GBU)", role: "REQ-PARTICIPANT", organizer: true}
            ]},
            {_id: "e12", calendarId: "c4", dtstart: times[14], dtend: times[15], accountId: "a4", subject: "11:00 am - 11:45 am", location: "Palm Cafe", attendees: [
                {commonName: "Everyone! (Palm GBU)", role: "REQ-PARTICIPANT"},
                {commonName: "El Rubyo (Palm GBU)", role: "REQ-PARTICIPANT", organizer: true}
            ]},
            {_id: "e13", calendarId: "c4", dtstart: times[16], dtend: times[17], accountId: "a4", subject: "11:45 am - 12:45 pm", location: "Palm Cafe", attendees: [
                {commonName: "Everyone! (Palm GBU)", role: "REQ-PARTICIPANT"},
                {commonName: "El Rubyo (Palm GBU)", role: "REQ-PARTICIPANT", organizer: true}
            ]}
            //{"returnValue":true,"results":[{"_id":"++HMfjUamRsmpzjh","_kind":"com.palm.calendarevent:1","_rev":792,"_sync":true,"accountId":"++HM6sJVRCK4_5D7","alarm":[{"_id":"319","action":"display","alarmTrigger":{"value":"-PT15M","valueType":"DURATION"}}],"allDay":false,"calendarId":"++HM6sN4VPZ3aGzr","dtend":1292695200000,"dtstart":1292691600000,"eventDisplayRevset":792,"location":"","note":"","rrule":{"freq":"DAILY","interval":1,"rules":[],"until":1292781600000},"subject":"Woo hoo! Events BABY!","tzId":"America/Los_Angeles"}]}
        ];

//		MOCK.events =
//		[	{_id:"e1", calendarId:"c2", dtstart: times[0], dtend: times[1], accountId:"a2", subject: "The most awesomest team BBQ EVER!"	, location: "Building 3 Parking Lot"	, note: "To celebrate another amazing release we will be having a BBQ outside building 1!<br /><br />There will be burgers, brats, and beer.", rrule:{freq:"WEEKLY", interval:4, wkst:0, rules: [{"ruleType": "BYDAY", "ruleValue": [{"day": 1},{"day": 3}]}] }}
//		,	{_id:"e2", calendarId:"c3", dtstart: times[2], dtend: times[3], accountId:"a3", subject: "Meeting with Ruby"					, location: "Ruby's Office Next to the staircase under the roof", attendees: [{commonName: "Ruby Johnenstein (Palm GBU)"}], reminder: "-PT15M"}
//		,	{_id:"e3", calendarId:"c1", dtstart: times[4], dtend: times[5], accountId:"a1", subject: "Breakfast on the veranda :-)"			, location: "The penthouse veranda"	, attendees: [{commonName: "Dana Sculley (FBI)"			, role: "REQ-PARTICIPANT", organizer: true, email:"dana.sculley@fbi.gov"}, {commonName: "Fox Mulder (FBI)", role: "REQ-PARTICIPANT", email:"fox.mulder@fbi.gov"}]}
//		,	{_id:"e4", calendarId:"c5", dtstart: times[6], dtend: times[7], accountId:"a5", subject: "Dinner on the beach :-D"				, location: "The hut on the beach"	, attendees: [{commonName: "John John (Palm GBU)"		, role: "REQ-PARTICIPANT"}, {commonName: "Special Someone"		, role: "REQ-PARTICIPANT", organizer: true}]}
//		,	{_id:"e5", calendarId:"c4", dtstart: times[8], dtend: times[9], accountId:"a4", subject: ".;{. Topaz Launch .};."				, location: "Palm Cafe"				, attendees: [{commonName: "Everyone! (Palm GBU)"		, role: "REQ-PARTICIPANT"}, {commonName: "El Rubyo (Palm GBU)"	, role: "REQ-PARTICIPANT", organizer: true}]}
//		,	{_id:"e6", calendarId:"c4", dtstart: times[8], dtend: times[9], accountId:"a4", subject: "Building the future..."				, location: "Silicon Valley"		, attendees: [{commonName: "Mike Lee (Palm GBU)"		, role: "REQ-PARTICIPANT"}], allDay: true}
//		,	{_id:"e7", calendarId:"c2", dtstart: times[8], dtend: times[9], accountId:"a2", subject: "Building the future..."				, location: "Silicon Valley"		, attendees: [{commonName: "Lauren Lagarde (Palm GBU)"	, role: "REQ-PARTICIPANT"}], allDay: true}
//		,	{_id:"e8", calendarId:"c5", dtstart: times[8], dtend: times[9], accountId:"a5", subject: "Building the future..."				, location: "Silicon Valley"		, attendees: [{commonName: "Rukhsana Azeem (Palm GBU)"	, role: "REQ-PARTICIPANT"}], allDay: true}
//		,	{_id:"e9", calendarId:"c1", dtstart: times[8], dtend: times[9], accountId:"a1", subject: "Building the future..."				, location: "Silicon Valley"		, attendees: [{commonName: "Robert Yawn (Palm GBU)"		, role: "REQ-PARTICIPANT"}], allDay: true}
//
//		//{"returnValue":true,"results":[{"_id":"++HMfjUamRsmpzjh","_kind":"com.palm.calendarevent:1","_rev":792,"_sync":true,"accountId":"++HM6sJVRCK4_5D7","alarm":[{"_id":"319","action":"display","alarmTrigger":{"value":"-PT15M","valueType":"DURATION"}}],"allDay":false,"calendarId":"++HM6sN4VPZ3aGzr","dtend":1292695200000,"dtstart":1292691600000,"eventDisplayRevset":792,"location":"","note":"","rrule":{"freq":"DAILY","interval":1,"rules":[],"until":1292781600000},"subject":"Woo hoo! Events BABY!","tzId":"America/Los_Angeles"}]}
//		];

        MOCK.accountTemplates = [
            {"capabilityProviders": [
                    {"_id": "acfb", "capability": "CALENDAR", "dbkinds": {"calendar": "com.palm.calendar.facebook:1", "calendarevent": "com.palm.calendarevent.facebook:1"}, "id": "com.palm.facebook.calendar", "implementation": "palm://com.palm.service.calendar.facebook/", "onCreate": "palm://com.palm.service.calendar.facebook/onCreate", "onDelete": "palm://com.palm.service.calendar.facebook/onDelete", "onEnabled": "palm://com.palm.service.calendar.facebook/onEnabled", "readOnlyData": true, "sync": "palm://com.palm.service.calendar.facebook/sync"}
                ],
                "icon"            : {"loc_32x32": "../images/mypalm-32x32.png", "loc_48x48": "/usr/palm/public/accounts/com.palm.facebook/images/facebook-48x48.png"},
                "loc_name"        : "Facebook", "loc_usernameLabel": "email address", "readPermissions": ["com.palm.app.facebook", "com.palm.app.facebook.beta"],
                "templateId"      : "com.palm.facebook", "validator": "palm://com.palm.service.contacts.facebook/checkCredentials", "writePermissions": ["com.palm.app.facebook", "com.palm.app.facebook.beta"]
            },
            {"capabilityProviders": [
                    {"_id": "acg", "capability": "CALENDAR", "dbkinds": {"calendar": "com.palm.calendar.google:1", "calendarevent": "com.palm.calendarevent.google:1"}, "icon": {"loc_32x32": "../images/mypalm-32x32.png", "loc_48x48": "/usr/palm/public/accounts/com.palm.google/images/googlecalendar-48x48.png"}, "id": "com.palm.google.calendar", "implementation": "palm://com.palm.service.calendar.google/", "onCreate": "palm://com.palm.service.calendar.google/onCreate", "onDelete": "palm://com.palm.service.calendar.google/onDelete", "onEnabled": "palm://com.palm.service.calendar.google/onEnabled", "subKind": "com.palm.calendarevent.google:1", "sync": "palm://com.palm.service.calendar.google/sync", "validator": "palm://com.palm.service.calendar.google/checkCredentials"}
                ],
                "icon"            : {"loc_32x32": "../images/mypalm-32x32.png", "loc_48x48": "/usr/palm/public/accounts/com.palm.google/images/google-48x48.png"},
                "loc_name"        : "Google", "loc_usernameLabel": "email address", "templateId": "com.palm.google", "validator": "palm://com.palm.service.contacts.google/checkCredentials"
            },
            {"capabilityProviders": [
                    {"_id": "ace", "capability": "CALENDAR", "dbkinds": {"calendarevent": "com.palm.calendarevent.eas:1"}, "icon": {"loc_32x32": "../images/mypalm-32x32.png", "loc_48x48": "/usr/palm/public/accounts/com.palm.eas/images/easmail48.png"}, "id": "com.palm.eas.calendar", "implementation": "palm://com.palm.eas/", "subKind": "com.palm.calendarevent.eas:1", "sync": "palm://com.palm.eas/syncAllCalendars"}
                ],
                "hidden"          : false, "icon": {"loc_32x32": "../images/mypalm-32x32.png", "loc_48x48": "/usr/palm/public/accounts/com.palm.eas/images/easmail48.png"},
                "loc_name"        : "Microsoft Exchange", "onCapabilitiesChanged": "palm://com.palm.eas/accountCapabilities", "onCredentialsChanged": "palm://com.palm.eas/accountUpdated", "readPermissions": ["com.palm.eas"],
                "templateId"      : "com.palm.eas", "validator": {"address": "palm://com.palm.eas/validateAccount", "customUI": {"appId": "com.palm.app.email", "name": "wizard"}}, "writePermissions": []
            },
            {"capabilityProviders": [
                    {"_id": "acp", "capability": "CALENDAR", "id": "com.palm.palmprofile.calendar"}
                ], "icon"             : {"loc_32x32": "../images/mypalm-32x32.png", "loc_48x48": "/usr/palm/public/accounts/com.palm.palmprofile/images/mypalm-48x48.png"}, "loc_name": "HP webOS Account", "templateId": "com.palm.palmprofile"
            },
            {"capabilityProviders": [
                    {"_id": "acy", "capability": "CALENDAR", "dbkinds": {"calendar": "com.palm.calendar.yahoo:1", "calendarevent": "com.palm.calendarevent.yahoo:1"}, "id": "com.palm.yahoo.calendar", "implementation": "palm://com.palm.service.calendar.yahoo/", "onCreate": "palm://com.palm.service.calendar.yahoo/onCreate", "onDelete": "palm://com.palm.service.calendar.yahoo/onDelete", "onEnabled": "palm://com.palm.service.calendar.yahoo/onEnabled", "subKind": "com.palm.calendarevent.yahoo:1", "sync": "palm://com.palm.service.calendar.yahoo/sync"}
                ],
                "icon"            : {"loc_32x32": "../images/mypalm-32x32.png", "loc_48x48": "/usr/palm/public/accounts/com.palm.yahoo/images/yahoo-48x48.png"},
                "loc_name"        : "Yahoo!", "loc_usernameLabel": "email address", "templateId": "com.palm.yahoo", "validator": "palm://com.palm.yahoo/validate"
            }
        ];

        for (var a = MOCK.accounts, at = MOCK.accountTemplates, tId, i = a.length; i--;) {
            // Add capability providers to accounts to support DFISH-10507 fix:
            tId = a[i].templateId;
            for (var j = at.length; j--;) {
                if (at[j].templateId == tId) {
                    a[i].capabilityProviders = at[j].capabilityProviders;
                    break;
                }
            }
        }
    }

    function mockCalendar() {
        if (!(override || global.Calendar)) {   // Don't mock Calendar if the Calendar library was loaded or explicitly not overriding key components.
            return;
        }
        mockCalendarsManager();
        mockDatabaseManager();
        mockEventManager();
    }

    function mockCalendarsManager() {
        CalendarsManager = global.CalendarsManager || function mockCalendarsManager() {
        };

        function getColorListFrom(calendars) {
            var colors = {},
                colorList = [];
            for (var i = calendars.length; i--; colors[calendars[i].color] = true) {
                ;
            }
            for (var color in colors) {
                colorList.push(color);
            }
            return (colorList && colorList.length) ? colorList : null;
        }

        var cmp = CalendarsManager.prototype;
        cmp.getAccounts = function mockGetCalendarAccounts() {
            this.gotAccounts(this, {accounts: MOCK.accounts, templates: MOCK.accountTemplates});
        };
        cmp.getCalendars = function mockGetCalendars() {
            cmp.colorList = getColorListFrom(MOCK.calendars);
            this.rawCalendars = MOCK.calendars;
            this.generateAccountsAndCalendarArray();
        };
    }

    function mockDatabaseManager() {
        DatabaseManager = global.DatabaseManager || function mockDatabaseManager() {
        };

        function mockDBChangedEvent() {
            enyo.application.share({ events: MOCK.emptyArray });
        }

        var dmp = DatabaseManager.prototype;
        dmp.isEventDirty = function mockDBManagerIsEventDirty() {
            return true;
        };
        dmp.updateCalendars = function mockDBUpdateCalendars(calendarSlice, onSuccess, onFailure) {
            var thi$ = this;
            enyo.isFunction(onSuccess) && onSuccess(MOCK.successResponse);
            setTimeout(function mockDBUpdatedCalendars() {
                enyo.application.calendarsManager.watchCalendarsFired({fired: true});
            }, 50);
        };
        dmp.deleteEvent = function mockDBManagerEventDelete(eventId, pass, fail) {
            for (var m = MOCK.events, i = 0, j = m.length; i < j; ++i) {
                if (eventId != m [i]._id) {
                    continue;
                }
                DEBUG && console.log("---:---: Deleted event [" + (m[i].subject || eventId) + "]!");
                pass && pass({ returnValue: true, results: [
                    { id: eventId, rev: Number.MAX_VALUE }
                ]});
                m.splice(i, 1);
                setTimeout(mockDBChangedEvent, 50);
                return;
            }
            fail && fail(MOCK.failureResponse);
        };
        dmp.createEvent =
            dmp.moveEventToDifferentCalendar =
                dmp.updateEvent =
                    dmp.updateEventDeleteChildren =
                        dmp.updateParentAddChild = function mockDBManagerEventUpdate(event, pass, fail, child, tmp) {
                            if (!event) {
                                fail && fail(MOCK.failureResponse);
                                return;
                            }
                            child && (tmp = child) && (child = pass) && (pass = fail) && (fail = tmp);
                            var isNew = true;
                            for (var id = event._id || event.id, m = MOCK.events, i = 0, j = m.length; i < j; ++i) {
                                if (id != m [i]._id) {
                                    continue;
                                }
                                m [i] = event;
                                DEBUG && console.log("---:---: Updated event [" + (event.subject || id) + "]!");
                                isNew = false;
                            }
                            isNew && (event._id = "e" + Math.random()) && (MOCK.events.push(event));
                            isNew && console.log("---:---: Created event [" + (event.subject || event._id) + "]!");
                            pass && pass({ returnValue: true, results: [
                                { id: event._id, rev: Number.MAX_VALUE }
                            ]});
                            setTimeout(mockDBChangedEvent, 50);
                        };
    }

    function mockEventManager() {
        EventManager = (override || !global.EventManager) ? function mockEventManager() {
        } : global.EventManager;
        LayoutManager = global.LayoutManager;

        var emp = EventManager.prototype,
            empListener,
            layoutManager = LayoutManager && new LayoutManager();
        emp.cancelGetEventsInRange = MOCK.doNothing;

        emp.queryResults = [];
        emp.queryResults = emp.queryResults.concat(MOCK.events, MOCK.allDayEvents);

        emp.getEvents = function mockEMGetEvents() {
            empListener && setTimeout(empListener.databaseChanged, 15.625);
        };

        emp.getEventsInRange = function mockEMGetEventsInRange(range, callback, eventSet) {
            callback && callback(formatEventsResponse(eventSet));
        };

        emp.observeDatabaseChanges = function mockEMObserveDatabaseChanges(name, listener) {
            empListener = listener;
        };
        emp.stopObservingDatabaseChanges = MOCK.doNothing;

        emp.utils = {};
        emp.utils.formatResponse = function mockEMFormatResponse(events, dates, calendarId, excludedCalendars) {
            var allDayEvents = [],
                datesLength = dates.length,
                day,
                days = [],
                eventsLength = events.length,
                hiddenAllDay = [],
                hiddenEvents = [],
                i,
                regularEvents = [];

            // If we don't have any dates do nothing:
            if (!datesLength) {
                return;
            }

            // If the current calendar is an excluded calendar ignore all excluded calendars:
            var useExcluded = excludedCalendars && !(calendarId && excludedCalendars [calendarId]);

            // Split normal and hidden all-day and regular events into separate arrays:
            var event, isHidden;
            for (i = 0; i < eventsLength; i++) {
                event = events[i];

                // Filter events by calendar id or excluded calendar:
                isHidden = ((calendarId && (calendarId != event.calendarId))
                    || (useExcluded && excludedCalendars [event.calendarId]));

                if (event.allDay) {
                    (isHidden ? hiddenAllDay : allDayEvents).push(event);
                } else {
                    (isHidden ? hiddenEvents : regularEvents).push(event);
                }
            }

            for (i = 0; i < datesLength; i++) {
                days.push({
                    date        : dates[i],
                    events      : regularEvents,
                    allDayEvents: allDayEvents,
                    freeTimes   : [],
                    busyTimes   : [],
                    hiddenEvents: hiddenEvents,
                    hiddenAllDay: hiddenAllDay
                });
            }
            return days;
        };

        function formatEventsResponse(events) {
            var allDayEvents = [];
            if (events) {
                for (var e, next = events.length; next--;) {
                    e = events [next];
                    if (e.allDay) {
                        e = events.splice(next, 1);
                        allDayEvents.push(e[0]);
                    }
                }
            }
            else {
                events = MOCK.events
                allDayEvents = MOCK.allDayEvents;
            }

            for (var e, next = events.length; next--;) {
                e = events [next];
                e.renderStartTime = e.dtstart;
                e.renderEndTime = e.dtend;
            }

            layoutManager.positionEvents(events);
            var emptyArray = MOCK.emptyArray;
            var tempDate = new Date().clearTime();
            var result = {
                days: [
                    {   // Structure returned from EventManager.getEventsInRange().
                        date        : +tempDate,
                        events      : events,
                        allDayEvents: allDayEvents,
                        freeTimes   : emptyArray,
                        busyTimes   : emptyArray,
                        hiddenEvents: emptyArray,
                        hiddenAllDay: emptyArray
                    }
                ]
            };
            return result;
        }
    }

    begin();

})(this);
