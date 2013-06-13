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


// global enyo
// TODO: When an event's "all day" state changes only commit that change if it's a single-occurence or an accepted change for a repeating event.

enyo.kind({
    name      : "calendar.edit.TimeSelectView",
    kind      : enyo.Scroller,
    className : "enyo-bg",
    published : {
        event : null,
        is24Hr: false
    },
    events    : {
        onExit: ""
    },
    G11N      : {
        durationFormatter: new enyo.g11n.DurationFmt({style: "long"}),
        durationMessage  : new enyo.g11n.Template($L("This event is #{duration} long."))
    },
    components: [
        {kind: enyo.Header, components: [
            {className: "edit-view-icon edit-view-icon-time"},
            {name: "subject", kind: enyo.VFlexBox, pack: "center", flex: 1}
        ]},
        {kind: enyo.HFlexBox, align: "center", height: "48px", components: [
            {name: "allDay", kind: enyo.CheckBox, style: "margin-left: 10px", onChange: "changeAllDay"},
            {content: $L("All day event")}
        ]},
        {kind: enyo.Divider, caption: $L("START")},
        {kind: enyo.HFlexBox, align: "center", className: "enyo-item enyo-first", components: [
            {className: "edit-view-label", content: $L("DATE")},
            {name: "startDate", kind: enyo.DatePicker, label: " ", minYear: 2010, maxYear: 2020, onChange: "changeStartTime"}
        ]},
        {name: "startTimeDrawer", kind: enyo.BasicDrawer, animate: false, components: [
            {kind: enyo.HFlexBox, align: "center", className: "enyo-item enyo-last", components: [
                {className: "edit-view-label", content: $L("TIME")},
                {name: "startTime", kind: enyo.TimePicker, label: " ", onChange: "changeStartTime"}
            ]}
        ]},
        {kind: enyo.Divider, caption: $L("END")},
        {kind: enyo.HFlexBox, align: "center", className: "enyo-item enyo-first", components: [
            {className: "edit-view-label", content: $L("DATE")},
            {name: "endDate", kind: enyo.DatePicker, label: " ", minYear: 2010, maxYear: 2020, onChange: "changeEndTime"}
        ]},
        {name: "endTimeDrawer", kind: enyo.BasicDrawer, animate: false, components: [
            {kind: enyo.HFlexBox, align: "center", className: "enyo-item enyo-last", components: [
                {className: "edit-view-label", content: $L("TIME")},
                {name: "endTime", kind: enyo.TimePicker, label: " ", onChange: "changeEndTime"}
            ]}
        ]},
        {name: "duration", content: "", style: "font-size: 14px; text-align: center"},
        {kind: enyo.Button, name: "btnDone", caption: $L("Done"), onclick: "doExit" }
    ],

    create: function create() {
        this.inherited(arguments);
        this.eventChanged();
    },

    destroy: function destroy() {
        enyo.application.ignore({ is24Hr: this });		// Make sure we ignore 24Hr changes.
        this.inherited(arguments);
    },

    showingChanged: function showingChanged() {
        this.inherited(arguments);
        var manage = this.getShowing() ? "watch" : "ignore";
        enyo.application [manage]({ is24Hr: this });
    },

    eventChanged: function eventChanged(oldEvent) {
        /* The focused event has changed so update the ui to display its details. */
        var event = this.event;
        if (!event) {
            return;
        }

        var ui = this.$;

        ui.subject.setContent(event.subject == null ? "" : event.subject);	// NOTE: Hide unsightly "undefined" or "null" values from display.
        ui.allDay.setChecked(!!event.allDay);
        ui.startDate.setValue(new Date(event.dtstart));
        ui.startTime.setValue(new Date(event.dtstart));

        this.endDateOld = new Date(event.dtend);
        this.endTimeOld = new Date(event.dtend);
        ui.endDate.setValue(this.endDateOld);
        ui.endTime.setValue(this.endTimeOld);

        this.changeAllDay();
        this.updateDuration();

        ui.startTimeDrawer.setAnimate(true);
        ui.endTimeDrawer.setAnimate(true);
    },

    is24HrChanged: function is24HrChanged() {
        /* 24hr clock mode has changed so update to reflect the change. */
        var ui = this.$,
            state = this.getIs24Hr();

        ui.startTime.setIs24HrMode(state);
        ui.endTime.setIs24HrMode(state);
    },

    changeAllDay: function changeAllDay() {
        /* The All-Day checkbox has been altered, so update this view to reflect the change. */
        var ui = this.$,
            state = (ui.allDay.checked);
        if (state) {
            this.endDateOld = ui.endDate.getValue();
            this.endTimeOld = ui.endTime.getValue();
            ui.endDate.setValue(ui.startDate.getValue());
            ui.endTime.setValue(ui.startTime.getValue());
        } else {
            ui.endDate.setValue(this.endDateOld);
            ui.endTime.setValue(this.endTimeOld);
        }
        this.event.allDay = state;
        ui.startTimeDrawer.setOpen(!state);
        ui.endTimeDrawer.setOpen(!state);
        this.changeEndTime();
    },

    changeEndTime: function changeEndTime() {
        var ui = this.$,
            date = ui.endDate.getValue(),
            time = ui.endTime.getValue();
        time.setFullYear(date.getFullYear());
        time.setMonth(date.getMonth());
        time.setDate(date.getDate());
        this.event.dtend = this.event.renderEndTime = time.getTime();
        this.updateDuration();
    },

    changeStartTime: function changeStartTime() {
        var ui = this.$,
            date = ui.startDate.getValue(),
            time = ui.startTime.getValue();
        time.setFullYear(date.getFullYear());
        time.setMonth(date.getMonth());
        time.setDate(date.getDate());
        this.event.dtstart = this.event.renderStartTime = time.getTime();
        this.updateDuration();
    },

    updateDuration: function updateDuration() {
        var event = this.event,
            duration = event.dtend - event.dtstart,
            parts = {},
            units;

        do {
            switch (true) {
            case !!event.allDay:
                parts.days = 1;
                duration = 0;
                break;
            case (units = Math.floor(duration / 31556926000)) >= 1:
                parts.years = units;
                duration -= units * 31556926000;
                break;
            case (units = Math.floor(duration / 2629743000)) >= 1:
                parts.months = units;
                duration -= units * 2629743000;
                break;
            case (units = Math.floor(duration / 604800000)) >= 1:
                parts.weeks = units;
                duration -= units * 604800000;
                break;
            case (units = Math.floor(duration / 86400000)) >= 1:
                parts.days = units;
                duration -= units * 86400000;
                break;
            case (units = Math.floor(duration / 3600000)) >= 1:
                parts.hours = units;
                duration -= units * 3600000;
                break;
            case (units = Math.floor(duration / 60000)) >= 1:
                parts.minutes = units;
                duration -= units * 60000;
                break;
            default:
                units = Math.floor(duration / 1000);
                if (units < 0) {
                    units = 0;
                }
                parts.seconds = units;
                duration = 0;
                break;
            }
        } while (duration > 1000);

        this.$.duration.setContent(this.G11N.durationMessage.evaluate({duration: this.G11N.durationFormatter.format(parts)}));
    }
});
