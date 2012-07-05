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
 NOTE: calendar.AppMenu is the Calendar app's Menu Handler.

 TODO: PLAN: In a future release: Dynamically adjust menus.
 **/
enyo.kind({
    name       : "calendar.AppMenu",
    kind       : enyo.AppMenu,
    events     : {
        onCreateAllDayEvent  : "",
        onCreateEvent        : "",
        onDeleteEvent        : "",
        onJumpTo             : "",
        onShowHelp           : "",
        onShowMap            : "",
        onShowMapRoute       : "",
        onShowMissedReminders: "",
        onShowPreferences    : "",
        onShowToday          : "",
        onSyncNow            : ""
    },
    published  : {
        device: "",             // String	: Indicates what device the app is running on; used to adjust menu availability.
        missedReminders: false, // Boolean	: Indicates whether the missed reminders menu item should be enabled or disabled.
        views: null             // Object	: {current: enyo.Control, last: enyo.Control}
    },
    components : [
        {name: "menuNew", caption: $L("New"), showing: false, components: [
            {name: "menuAllDay", caption: $L("All Day Event"), onclick: "doCreateAllDayEvent"},
            {name: "menuEvent", caption: $L("Event"), onclick: "doCreateEvent"}
        ]},
        {name: "menuMap", caption: $L("Event Location"), showing: false, components: [
            {name: "menuMapIt", caption: $L("Show on map"), onclick: "showMap"},
            {name: "menuMapRoute", caption: $L("Get Directions"), onclick: "showMap"}
        ]},
        {name: "menuDelete", caption: $L("Delete event"), onclick: "deleteEvent", showing: false},
        {name: "menuSync", caption: $L("Sync Now"), onclick: "doSyncNow", showing: false},
        {name: "menuToday", caption: $L("Show today"), onclick: "doShowToday", showing: false},
        // TODO: In a future release, set onresize showing:true
        {name: "menuJump", caption: $L("Jump to..."), onclick: "doJumpTo", showing: false},
        // TODO: In a future release, set onresize showing:true
        {name: "menuReminders", caption: $L("Missed reminders..."), onclick: "doShowMissedReminders", showing: false},
        // TODO: Enable when missed reminders view is completed.
        {name: "menuPrefs", caption: $L("Preferences & Accounts"), onclick: "doShowPreferences", showing: false},
        {name: "menuHelp", caption: $L("Help"), onclick: "doShowHelp"}
    ],
    MENU_STATES: {
        calendarView: {
            menuNew   : false,
            menuAllDay: false,
            menuEvent : false,
            menuSync  : true,
            menuToday : false,
            menuJump  : false,
            menuPrefs : true,
            menuHelp  : true
        },
        defaultView : {
            menuHelp: true
        },
        editView    : {
            menuDelete  : false,
            menuMap     : false,
            menuMapIt   : false,
            menuMapRoute: false,
            menuHelp    : true
        },
        subView     : {
            menuPrefs: false,   // Disabling since Preferences View will load under the popup's scrim.
            menuHelp : true
        }
    },

    create: function create() {
        this.inherited(arguments);  // Required for inheritance.
    },

// BEGIN :-------: Published Property Handlers :--------------------------------------------------------------------------------------------------------------//

    missedRemindersChanged: function missedRemindersChanged(missedRemindersLastTime) {
        this.$.menuReminders.setShowing(!!this.missedReminders);
    },

    viewsChanged: function viewsChanged(lastViewChange) {
        var views = this.views,
            lastViewName = views.last && views.last.name,
            viewName = views.current && views.current.name;
        switch (viewName) {
        case "calendarView":
            this.toggleMenus(this.MENU_STATES.calendarView);
            break;

        case "detailView":
        case "repeatView":
            this.toggleMenus(this.MENU_STATES.subView);
            break;

        case "editView":
            this.toggleMenus(this.MENU_STATES.editView);
            break;

        case "firstLaunchView"    :
        case "prefsView"        :
        default                    :
            this.toggleMenus(this.MENU_STATES.defaultView);
            break;
        }
    },

// BEGIN :-------: Custom Methods :---------------------------------------------------------------------------------------------------------------------------//

    deleteEvent: function deleteEvent(from, domEvent) {
        var view = this.views.current,
            event = view && view.event;
        this.doDeleteEvent(event);
    },

    showMap: function showMap(from, domEvent) {
        var view = this.views.current,
            event = view && view.event;
        from == this.$.menuMap && this.doShowMap(event.location);
        from == this.$.menuMapRoute && this.doShowMapRoute(event.location);
    },

    toggleMenus: function toggleMenus(menuStateMap) {
        var menu = this.$;

        for (var item in menu) {
            if (menu.hasOwnProperty(item) && (item.indexOf("menu") == 0)) {
                menu[item].setShowing(!!menuStateMap[item]);
            }
        }
    }
});
