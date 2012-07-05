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
 NOTE: WeekHeader is the visual representation of a week's date.

 + WeekCarousel:
 + WeekViewFrame
 + WeekHeader <------------ This module.
 + Date Header
 + Agenda Button
 + Pane
 + WeekView
 + Day of Week Header
 + Scroller
 + Week AllDay Header
 + weekhours:
 + DayHour (24)
 + weekdays:
 + DayView (7)
 + AgendaView

 */
enyo.kind({
    name      : "calendar.week.WeekHeader",
    className : "week-header header",
    kind      : enyo.Control,
    published : {
        agendaMode: null,
        date      : null    // Date		: This week's start date.
    },
    G11N      : {
        HeaderFmt: new enyo.g11n.DateFmt({date: "medium", dateComponents: "d", weekday: true}),
        Fmts     : new enyo.g11n.Fmts()
    },
    components: [
        {name: "dateHeader", kind: "calendar.DateHeader", className: "date", duration: 6, fit: false, formats: {
            "short": new enyo.g11n.DateFmt({date: "medium"}),
            full   : new enyo.g11n.DateFmt({date: "long"})
        }},
        {name: "agendaButton", kind: enyo.CustomButton, toggling: true, caption: $L("Agenda"), onclick: "agendaModeToggled", width: "100px", className: "enyo-button today"},
    ],

    constructor: function constructor() {
        this.inherited(arguments);
        this.timeMachine = new Date();
    },

    create: function create() {
        this.inherited(arguments);
        enyo.application.watch({agendaMode: this});
        this.dateChanged();
    },

    destroy          : function destroy() {
        enyo.application.ignore({agendaMode: this});
        this.inherited(arguments);
    },

// BEGIN :-------: Published Property Handlers :--------------------------------------------------------------------------------------------------------------//
    agendaModeChanged: function agendaModeChanged() {
        this.$.agendaButton.setDepressed(this.agendaMode);
    },

    dateChanged: function dateChanged(oldDate) {
        var date = this.date;
        if (!date || +this.date === +oldDate) {
            return;
        }
        var ui = this.$,
            startDate = this.timeMachine.setTime(+date);
        ui.dateHeader.setDate(new Date(startDate));
    },

// BEGIN :-------: Custom Methods :---------------------------------------------------------------------------------------------------------------------------//

    agendaModeToggled: function agendaModeToggled() {
        enyo.application.share({agendaMode: !this.agendaMode}, {keep: true});
    }
});
