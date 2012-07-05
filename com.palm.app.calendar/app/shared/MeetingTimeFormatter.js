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


/* Copyright 2011 Palm, Inc.  All rights reserved. */

/*globals enyo,$L,Utilities*/

var Template = enyo.g11n.Template;
var DateFmt = enyo.g11n.DateFmt;

var MeetingTimeFormatter = {
    templates: {
        // Time range for recurring event
        startTimeFormat    : new DateFmt({time: "short"}),
        endTimeFormat      : new DateFmt({time: "short", timeComponents: "z"}),

        // For a single occurrence
        longDateFormat     : new DateFmt({date: "full"}),

        // For date range
        shortDateFormat    : new DateFmt({date: "short"}),
        dateRangeFormat    : new DateFmt({date: "medium"}),

        // For yearly recurrences
        dayMonthFormat     : new DateFmt({date: "medium", dateComponents: "dm"}),

        // For events spanning multiple days
        multidayRangeFormat: new DateFmt({time: "short", timeComponents: "z"}),

        // Overall format
        onDateFormat       : new Template($L("#{date} #{eventTime}.")),
        recursFormat       : new Template($L("Occurs #{recurrence} from #{eventTime}. #{effective}.")),

        // Time of day description
        allDayText         : $L("All day event"),
        eventTimeFormat    : new Template($L("#{startTime}-#{endTime}")),

        // Effective dates description
        effectiveDateFormat: new Template($L("1#Effective #{dateOrRange}|1>#Effective #{dateOrRange} for #{count} occurrences")),

        // Recurrence description
        dailyFormat        : new Template($L("1#every day|1>#every #{interval} days")),
        weeklyFormat       : new Template($L("1#every week on #{days}|1>#every #{interval} weeks on #{days}")),
        monthlyFormat      : new Template($L("1#every month on the #{days}|1>#every #{interval} months on the #{days}")),
        yearlyFormat       : new Template($L("1#every year on #{days}|1>#every #{interval} years on #{days}")),
        customText         : $L("custom recurrence"),

        dayOfCountWeekFormat: new Template($L("1#first #{dayOfWeek}|2#second #{dayOfWeek}|3#third #{dayOfWeek}|4#fourth #{dayOfWeek}|5#last #{dayOfweek}")),

        weekDaysText: $L("weekdays"),

        daysOfWeek: [$L("Sunday"), $L("Monday"), $L("Tuesday"), $L("Wednesday"), $L("Thursday"), $L("Friday"), $L("Saturday")]
    },

    describeEvent  : function (event) {
        var templates = this.templates;

        var byDayRule, byMonthDayRule, byMonthRule, daysString;

        var interval = (event.rrule && event.rrule.interval) || 1;

        var timeText;

        if (event.allDay) {
            timeText = templates.allDayText;
        } else {
            var startTimeText = templates.startTimeFormat.format(new Date(event.dtstart));
            var endTimeText = templates.endTimeFormat.format(new Date(event.dtend));

            // NOTE: Currently we'll always use the device timezone, regardless of the event's tzId
            timeText = templates.eventTimeFormat.evaluate({startTime: startTimeText, endTime: endTimeText});
        }

        if (event.rrule) {
            // Recurring event
            var freq = event.rrule.freq.toUpperCase();

            var recurText = templates.customText;

            if (freq == "DAILY") {
                recurText = templates.dailyFormat.formatChoice(interval, {interval: interval});
            } else if (freq == "WEEKLY") {
                byDayRule = this._getRuleValue(event.rrule, "BYDAY", false);

                daysString = "";

                if (byDayRule) {
                    if (Utilities.isWeekdaysRule(byDayRule)) {
                        // Weekdays
                        daysString = templates.weekDaysText;
                    } else {
                        daysString = this.describeDays(event, event.rrule);
                    }
                } else {
                    daysString = this.describeDefault(event, freq);
                }

                recurText = templates.weeklyFormat.formatChoice(interval, {days: daysString, interval: interval});
            } else if (freq == "MONTHLY") {
                byDayRule = this._getRuleValue(event.rrule, "BYDAY", false);
                byMonthDayRule = this._getRuleValue(event.rrule, "BYMONTHDAY", false);

                if (byMonthDayRule) {
                    // e.g. 13th of every month
                    daysString = this.describeMonthDates(event);
                } else if (byDayRule) {
                    // e.g. first Tuesday of every month
                    daysString = this.describeDays(event);
                } else {
                    daysString = this.describeDefault(event, freq);
                }

                recurText = templates.monthlyFormat.formatChoice(interval, {days: daysString, interval: interval});
            } else if (freq == "YEARLY") {
                byMonthRule = this._getRuleValue(event.rrule, "BYMONTH", false);

                if (byMonthRule) {
                    daysString = this.describeYearDates(event);
                } else {
                    daysString = this.describeDefault(event, freq);
                }

                recurText = templates.yearlyFormat.formatChoice(interval, {days: daysString, interval: interval});
            }

            // Figure out date
            var dateOrRangeText = "";
            if (event.rrule.until) {
                dateOrRangeText = templates.dateRangeFormat.formatRange(new Date(event.dtstart), new Date(event.rrule.until));
            } else {
                dateOrRangeText = templates.shortDateFormat.format(new Date(event.dtstart));
            }

            var count = event.rrule.count || 1;

            var effectiveText = templates.effectiveDateFormat.formatChoice(count, {dateOrRange: dateOrRangeText, count: count});

            return templates.recursFormat.evaluate({eventTime: timeText, recurrence: recurText, effective: effectiveText});
        } else {
            // Occurs on a specific date
            var dateText = templates.longDateFormat.format(new Date(event.dtstart));

            return templates.onDateFormat.evaluate({eventTime: timeText, date: dateText});
        }
    },

    // Handle the case where there's no rrule rules.
    // In this case, we need to calculate the rules based on dtstart.
    describeDefault: function (event, freq) {
        var templates = this.templates;

        // Figure out the recurrence info from the event (based on local time)
        var date = new Date(event.dtstart);

        if (freq == "WEEKLY") {
            // Same day every week
            return templates.daysOfWeek[date.getDay()];
        } else if (freq == "MONTHLY") {
            // Same day of month every month
            return this.formatDayOfMonth(date.getDate());
        } else if (freq == "YEARLY") {
            // same day/month every year
            return templates.dayMonthFormat.format(new Date(event.dtstart));
        }

        return templates.customText;
    },

    describeDays: function (event) {
        var templates = this.templates;

        if (!event.rrule) {
            return templates.customText;
        }

        var byDayRule = this._getRuleValue(event.rrule, "BYDAY", true);

        // Copy and sort days
        byDayRule = byDayRule.slice(0).sort(function (a, b) {
            if (a.ord === b.ord) {
                return a.day - b.day;
            } else {
                return b.ord - a.ord;
            }
        });

        var dayNames = [];

        for (var i = 0; i < byDayRule.length; i++) {
            var val = byDayRule[i];

            if (val.ord && val.day !== undefined) {
                // day of a particular week, e.g. second Tuesday
                var num = (val.ord > 0 && val.ord < 4) ? val.ord : 5;
                var dow = templates.daysOfWeek[val.day];

                dayNames.push(templates.dayOfCountWeekFormat.formatChoice(num, {dayOfWeek: dow}));
            } else if (val.ord) {
                // day of month, e.g. 2nd
                dayNames.push(this.formatDayOfMonth(val.ord));
            } else if (val.day !== undefined) {
                // day of week, e.g. Tuesday
                dayNames.push(templates.daysOfWeek[val.day]);
            }
        }

        return this.joinList(dayNames) || templates.customText;
    },

    formatDayOfMonth: function (dayOfMonth) {
        return Utilities.numToSuffix(dayOfMonth);
    },

    describeMonthDates: function (event) {
        var templates = this.templates;

        var byMonthDayRule = this._getRuleValue(event.rrule, "BYMONTHDAY", true);

        var dateNames = [];

        for (var i = 0; i < byMonthDayRule.length; i++) {
            var val = byMonthDayRule[i];

            if (val.ord) {
                dateNames.push(this.formatDayOfMonth(val.ord));
            }
        }

        if (dateNames.length > 0) {
            return this.joinList(dateNames);
        } else {
            return templates.customText;
        }
    },

    // For yearly recurrences
    describeYearDates : function (event) {
        var templates = this.templates;

        var byMonthRule = this._getRuleValue(event.rrule, "BYMONTH", true);
        var byMonthDayRule = this._getRuleValue(event.rrule, "BYMONTHDAY", true);

        var dateNames = [];

        var now = new Date();

        // Iterate over months
        for (var i = 0; i < byMonthRule.length; i++) {
            var monthVal = byMonthRule[i];

            if (monthVal.ord) {
                // Iterate over days
                for (var j = 0; j < byMonthDayRule.length; j++) {
                    var monthDayVal = byMonthDayRule[j];

                    if (monthDayVal.ord) {
                        // Construct a date for the purposes of formatting
                        var date = new Date(now.getYear(), monthVal.ord, monthDayVal.ord);

                        var dateName = templates.dayMonthFormat.format(date);
                        dateNames.push(dateName);
                    }
                }
            }
        }

        if (dateNames.length > 0) {
            return this.joinList(dateNames);
        } else {
            return templates.customText;
        }
    },

    // Join a list of strings, localized
    joinList          : function (items) {
        if (!items || !items.length) {
            return "";
        }

        var joined = items[0];

        if (items.length > 1) {
            // First n-1 items use the normal separator
            for (var i = 1; i < items.length - 1; i++) {
                joined += $L(", ");
                joined += items[i];
            }

            // Last item uses the final conjunction
            joined += $L(", and ");
            joined += items[items.length - 1];
        }

        return joined;
    },

    _getRuleValue: function (rrule, type, required) {
        var rules = rrule.rules || [];

        for (var i = 0; i < rules.length; i++) {
            var rule = rules[i];

            if (rule.ruleType === type) {
                return rule.ruleValue;
            }
        }

        if (required) {
            throw new Error("couldn't find rule " + type + " in rrule");
        }

        return undefined;
    }
};