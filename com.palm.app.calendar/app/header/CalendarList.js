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
/*Copyright 2011 HP, Inc.  All rights reserved. */



/**
 NOTE: calendar.CalendarList is the Calendar app's interactive, color-coded
 calendars toggles that allows toggling event(s) visibility in the main
 views based on their membership within the selected calendar(s).
 **/
enyo.kind({
    name      : "calendar.CalendarList",
    className : "calendarList",
    kind      : enyo.HFlexBox,
    events    : {
    },
    published : {
        accountsAndCalendars: null, // Array	: For watching Accounts and Calendars changes.
        toggleAllLimit      : 4        // Number	: Minimum number of calendars required to show toggle.
    },
    G11N      : { // Cached Globalization strings:
        HideAll: $L("Hide All"),
        ShowAll: $L("Show All"),
        HPWebOS: $L("HP webOS")
    },
    components: [
        {name: "calendarScroller", className: "toggles", kind: enyo.Scroller, autoVertical: false, vertical: false, flex: 1, components: [
            {name: "toggles", className: "container", kind: enyo.HFlexBox, defaultKind: enyo.VFlexBox, defaultLayoutKind: enyo.VFlexLayout}
        ]},
        {name: "toggleAllButton", className: "toggleAllButton enyo-button-natural-width enyo-button-dark ellipsis", kind: enyo.Button, onclick: "toggleAll", showing: false},
        {kind: "ApplicationEvents", onWindowDeactivated: "windowDeactivatedHandler"}
    ],

    constructor: function CalendarList() {
        this.inherited(arguments);
    },

    create: function create() {
        this.inherited(arguments);
        this.$.toggleAllButton.caption = this.G11N.hideAll;
        enyo.application.watch({accountsAndCalendars: this});
    },

    destroy: function destroy() {
        enyo.application.ignore({accountsAndCalendars: this});
        this.inherited(arguments);
    },

// BEGIN :-------: Framework Handlers :-----------------------------------------------------------------------------------------------------------------------//

    is24HrHandler: function is24HrHandler() {/*do nothing*/
    },

    windowDeactivatedHandler: function windowDeactivatedHandler() {
        // As we leave the app, save the calendar toggle state.
        enyo.application.calendarsManager.saveCalendarOnOffState(this.calendarMap);
    },
//-------------------------------

    accountsAndCalendarsChanged: function accountsAndCalendarsChanged(oldAccountsAndCalendars) {
        this.updateList();
    },

    shareCalendars: function shareCalendars(calendarMap) {
        !calendarMap && (calendarMap = this.calendarMap);
        var cals = JSON.parse(JSON.stringify(calendarMap));

        enyo.application.share({calendars: cals}, {keep: true});   // Share all calendars' color and on/off state with all watchers.
    },

    toggleAll: function toggleAll() {                          // Toggle everything right away
        var calendarMap = this.calendarMap,
            on = this.toggleAllOn = !this.toggleAllOn,
            toggleMap = this.toggleMap,
            toggle;
        for (var id in calendarMap) {                               // TODO: Set current calendarId to single-selected writeable calendar or default cal.
            if (calendarMap.hasOwnProperty(id)) {
                toggle = toggleMap    [id];
                toggle.on = calendarMap [id].on = on;
                this.updateLegend(toggle);
            }
        }
        if (this.showToggleAll) {
            if (on) {                                                   // Change the button caption and reset numShowingCalendars to the new count
                this.numShowingCalendars = this.totalCalendars;
                this.$.toggleAllButton.setCaption(this.G11N.HideAll);
            } else {
                this.numShowingCalendars = 0;
                this.$.toggleAllButton.setCaption(this.G11N.ShowAll);
            }
        }
        this.shareCalendars();
    },

    toggleSingle: function toggleSingle(toggle, domEvent) {
        toggle = this.toggleMap    [toggle.calendarId];             // Uses the actual toggle control instead of one of its sub-controls.
        var calendar = this.calendarMap    [toggle.calendarId],
            on = toggle.on = calendar.on = !calendar.on,
            numShowing = this.numShowingCalendars;
        this.updateLegend(toggle, domEvent.type);

        if (this.showToggleAll) {
            numShowing = on ? ++this.numShowingCalendars : --this.numShowingCalendars;	// Modify the number of showing calendars.
            this.updateToggleAllButton(numShowing, this.totalCalendars);
        }
        this.shareCalendars();
        return true;
    },

    updateLegend: function updateLegend(toggle, type) {
        toggle [toggle.on ? "removeClass" : "addClass"]("off");
    },

    updateToggleAllButton: function updateToggleAllButton(numShowing, totalCalendars) {
        if (numShowing == (totalCalendars || this.totalCalendars)) {    // If all calendars are showing:
            this.toggleAllOn = true;
            this.$.toggleAllButton.setCaption(this.G11N.HideAll);		//		Display "Hide All".
        } else {                                                        // Otherwise:
            this.toggleAllOn = false;
            this.$.toggleAllButton.setCaption(this.G11N.ShowAll);		//		Display "Show All".
        }
    },

    updateList: function updateList(calendars) {
        !calendars &&
        (calendars = enyo.application.calendarsManager.getCalendarsList({sorted: true}));
        !this.toggleAllOn && (this.toggleAllOn = true); 					// Set the default toggle all state if it isn't already set

        var erasedCalendars = this.calendarMap, // Create a map of erased calendars using the old calendar map.
            oldMap = JSON.stringify(this.calendarMap),
            calendarCount = calendars.length,
            calendarMap = this.calendarMap = {},
            numShowing = 0,
            toggleMap = this.toggleMap || (this.toggleMap = {}),
            toggles = this.$.toggles,
            toggleParts;
        this.totalCalendars = calendarCount;

        for (var calendar, name, color, id, toggle, on, i = 0, j = calendars.length; i < j; i++) {
            calendar = calendars [i];
            id = calendar._id;
            toggle = toggleMap [id];
            name = (calendar.syncSource == "Local") ? this.G11N.HPWebOS : calendar.showName;
            color = id == "all" ? "grey" : calendar.color;									// Handle  old "All" calendar in this new design.
            on = ("visible" in calendar) ? !!calendar.visible : true;						// Check for existing on/off state, otherwise assume 'on'
            on && numShowing++;															// Save the total number of calendars to switch the hide/show all button state
            erasedCalendars && (delete erasedCalendars [id]);									// Remove existing calendars from the erased calendars list.

            if (toggle) {
                toggleParts = toggle.getControls(); 		 									// Using getControls() because getComponents() returned an empty array.
                toggleParts[0].setClassName("theme-" + color + " legend");
                toggleParts[1].setContent(name);
                toggle.on = on;

            } else {
                toggle = toggleMap [id] = toggles.createComponent({                                // Avoid re-creating existing calendar toggles.
                    calendarId: id,
                    className : "toggle",
                    align     : "center",
                    on        : on,
                    onclick   : "toggleSingle",
                    owner     : this,
                    components: [
                        {calendarId: id, className: "theme-" + color + " legend"},
                        {calendarId: id, className: "ellipsis name", content: enyo.string.escapeHtml(name)}
                    ]
                });
            }
            calendarMap [id] = { color: color, on: !!toggle.on };
            this.updateLegend(toggle);
        }
        this.numShowingCalendars = numShowing;
        var showToggleAll = (calendarCount >= this.toggleAllLimit);	// Set a flag so that we only do toggle all processing if needed
        this.showToggleAll = showToggleAll
        this.$.toggleAllButton.setShowing(showToggleAll); 						// Show the toggle all button if there are enough calendars.

        if (!showToggleAll) {
            this.toggleAllOn = false;											// Reset the toggle all button state if it isn't being shown.
        } else {
            this.updateToggleAllButton(numShowing, calendarCount);
        }
        for (var calId in erasedCalendars) {    // Iterate over all erased calendars and:
            toggleMap [calId].destroy();		//	destroy each one's toggle
            delete toggleMap [calId];			//	delete the toggle from the toggleMap
            delete erasedCalendars [calId];		//	delete the old calendar entry
        }
        toggles.render();

        if (oldMap != JSON.stringify(this.calendarMap)) {    // TODO: Maybe write a calendar map comparison function instead of using stringify
            this.shareCalendars();
        }
    }
});
