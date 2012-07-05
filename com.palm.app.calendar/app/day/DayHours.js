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


enyo.kind({
    name       : "calendar.day.DayHours",
    className  : "hourLabels",
    kind       : enyo.Control,
    defaultKind: "calendar.day.DayHoursBlock",
    published  : {
        is24Hr: false        // Boolean	: For accepting 24hr clock mode changes.
    },
    G11N       : {
        DateTimeHash: (new enyo.g11n.Fmts()).dateTimeHash,
        Noon        : $L("Noon")
    },

    create: function create() {
        this.inherited(arguments);
        this.hours = [];

        for (var i = 0; i < 24; ++i) {
            this.hours.push(this.createComponent());
        }
        if (this.is24Hr === undefined) {
            //coming from weekview
            this.setIs24Hr(!enyo.application.fmts.isAmPm());	// If 24Hr isn't set yet, grab the default setting.
        } else {
            //coming from dayview
            this.is24HrChanged();
        }
    },

    destroy: function destroy() {
        this.inherited(arguments);
    },

// BEGIN :-------: Custom Handlers :--------------------------------------------------------------------------------------------------------------------------//

    is24HrHandler: function is24HrHandler(is24Hr) {
        this.setIs24Hr(is24Hr);
    },

// BEGIN :-------: Property Change Handlers :-----------------------------------------------------------------------------------------------------------------//

    is24HrChanged: function is24HrChanged(was24Hr) {
        var is24Hr = this.is24Hr = !!this.is24Hr;		// Ensure is24Hr is a boolean value.
        if (was24Hr !== undefined && is24Hr == was24Hr) {        // 24Hr mode was previously defined and still has the same value:
            return;														//	So do nothing.
        }
        var hourLabel,
            hours = this.hours,
            numHours = hours && hours.length,
            g11n = this.G11N,
            noon = g11n.Noon,
            am = g11n.DateTimeHash.am,
            pm = g11n.DateTimeHash.pm;
        for (var hour = 0, last = numHours; hour < last; ++hour) {
            hourLabel = hours [hour];
            if (hourLabel) {
                hourLabel.setHourLabel(hour == 12 ? noon : Utilities.formatHour(hour, is24Hr));
                hourLabel.setAMPM(is24Hr || hour == 12 ? "" : hour < 12 ? am : pm);
            }
        }
    }
});

enyo.kind({
    name      : "calendar.day.DayHoursBlock",
    className : "hourLabelBlock active", // Added the "active" class by default.
    kind      : enyo.Control,
    published : {
        AMPM         : "",
        hour         : -1,
        hourLabel    : "",
        isActiveHour : false,
        isCurrentHour: false
    },
    components: [
        {className: "label", layoutKind: enyo.HLayout, components: [
            {name: "hourLabel", className: "number"},
            {name: "AMPM", className: "ampm"}
        ]},
        {className: "halfMarker"},
        {name: "current", className: "current", showing: false}
    ],

    create: function create() {
        this.inherited(arguments);
    },

// BEGIN :-------: Property Change Handlers :-----------------------------------------------------------------------------------------------------------------//

    AMPMChanged: function AMPMChanged(oldAMPM) {
        if (this.AMPM == oldAMPM) {
            return;
        }
        this.$.AMPM.setContent(this.AMPM);
    },

    hourLabelChanged: function hourLabelChanged(oldHourLabel) {
        if (this.hourLabel == oldHourLabel) {
            return;
        }
        this.$.hourLabel.setContent(this.hourLabel);
    },

    isActiveHourChanged: function isActiveHourChanged(wasActiveHour) {
//		if (this.isActiveHour == wasActiveHour) { return; }
//		this [true/*this.isActiveHour*/ ? "addClass" : "removeClass"] ("active");	// Per HI's new design, make all hours active (i.e. no inactive "greyed out" hours)
    },

    isCurrentHourChanged: function isCurrentHourChanged(wasCurrentHour) {
        if (this.isCurrentHour == wasCurrentHour) {
            return;
        }
        this.isCurrentHour ? this.$.current.show() : this.$.current.hide();
        // this.$.current [this.isCurrentHour ? "addClass" : "removeClass"] ("current");
    }
});
