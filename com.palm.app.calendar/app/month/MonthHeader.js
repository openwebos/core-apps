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
    name      : "calendar.month.MonthHeader",
    kind      : enyo.VFlexBox,
    className : "header",
    published : {
        date       : null,
        startOfWeek: 0
    },
    G11N      : {
        fmts: new enyo.g11n.Fmts()
    },
    components: [
        {name: "dateHeader", kind: "calendar.DateHeader", className: "date", fit: false, formats: {
            "short": new enyo.g11n.DateFmt({date: "medium", dateComponents: "my"}),
            full   : new enyo.g11n.DateFmt({date: "long", dateComponents: "my"})
        }},
        {name: "weekHeader", className: "weeks", kind: enyo.HFlexBox}
    ],
    days      : [ "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday" ], // do not localize

    create: function create() {
        this.inherited(arguments);
        this.makeDayHeaders();
    },

    dateChanged: function dateChanged(oldDate) {
        if (+this.date == +oldDate) {
            return;
        }
        var ui = this.$,
            date = this.date || new Date();
        ui.dateHeader.setDate(new Date(date));
    },

    startOfWeekChanged: function startOfWeekChanged(oldStartOfWeek) {
        if (this.startOfWeek === oldStartOfWeek) {
            return;
        }
        var dayFormats = this.G11N.fmts.dateTimeHash["long"].day,
            headers = this.$.weekHeader.getComponents(),
            startOfWeek = this.startOfWeek,
            weekLength = dayFormats.length;
        for (var dayIndex, i = 0; i < weekLength; ++i) {
            dayIndex = (i + startOfWeek) % weekLength;
            headers[i].setContent(dayFormats [dayIndex]);
        }
    },

    makeDayHeaders: function makeDayHeaders() {
        var dayFormats = this.G11N.fmts.dateTimeHash["long"].day,
            weekLength = dayFormats.length,
            weekHeader = this.$.weekHeader;
        for (var day, dayIndex, i = 0; i < weekLength; ++i) {
            dayIndex = (i + this.startOfWeek) % weekLength;
            day = this.days [dayIndex];
            weekHeader.createComponent({
                name   : day,
                content: dayFormats [dayIndex],
                flex   : 1
            });
        }
        this.startOfWeekChanged();
    }
});
