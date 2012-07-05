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
    name       : "calendar.month.MonthWeek",
    kind       : enyo.HFlexBox,
    defaultKind: "calendar.month.MonthDay",
    flex       : 1,
    published  : {
        date: null, // Date		: The day's date which may be in a different month than what's being displayed.
        days: null  // Object	: For day events.
    },

    constructor: function MonthWeek() {
        this.inherited(arguments);
        this.timeMachine = new Date();
        this.date = new Date();
        this.monthDate = new Date();
        this.weekdays = [];
    },

    create: function create() {
        this.inherited(arguments);
        for (var i = 0; i < 7; ++i) {
            this.weekdays.push(this.createComponent());
        }
    },

// BEGIN :-------: Published Property Handlers :--------------------------------------------------------------------------------------------------------------//

    dateChanged: function dateChanged(oldDate) {
        var weekdays = this.weekdays,
            date = this.timeMachine,
            monthDate = this.monthDate;
        date.setTime(this.date.clearTime());

        for (var i = 0; i < 7; ++i) {
            weekdays[i].monthDate.setTime(monthDate);		// Reuse the month days's existing Date object.
            weekdays[i].date.setTime(date);				    // Reuse the month day's existing date object.
            weekdays[i].dateChanged();						// Inform the monthDay of the change.
            date.addDays(1);
        }
    },

    daysChanged: function daysChanged(oldDays) {
        var days = this.days,
            weekdays = this.weekdays;
        for (var i = 0; i < 7; i++) {
            weekdays[i].setDays(days);
        }
    }

// BEGIN :-------: Custom Methods :---------------------------------------------------------------------------------------------------------------------------//
});
