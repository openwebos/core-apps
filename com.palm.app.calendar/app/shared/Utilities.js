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


/* Copyright 2011 Palm, Inc.  All rights reserved. */

/*jslint laxbreak: true, white: false */
/*global $L: false */


(function defineCalendarUtilities() {
    /** Closure to define various Calendar application utility functions and values.  */

    var DEBUG = !!this.DEBUG,       // Inherit any globally defined DEBUG state.
        MAX_INDEXABLE_SIZE = 5000;	// Used for getIndexedEventNote.  This is a reasonable max size for perf reasons.

    function wrapIt(string, oneDate, length) {
        //Assuming an input string that is two dates or date-times separated by " - "
        //Try to find the " - " and break into two lines after it.
        var searchTerm = oneDate ? ", " : " - ",
            i = string.search(searchTerm);
        if (i > 0) {
            var breakpoint = i + searchTerm.length - 1;
            return [string.substring(0, breakpoint), string.substring(breakpoint + 1)];
        }
        else {
            //We couldn't find the " - " or the ", ".  Hopefully param 'length' accurately describes the length of one of the dates/date-times,
            //and we'll try to break at the next convenient space or comma.
            i = length;
            if (string.length > length + 2) {
                while (i) {
                    if (string.charAt(i) === ',' || enyo.g11n.Char.isSpace(string.charAt(i))) {
                        return [string.substring(0, i), string.substring(i + 1)];
                    }
                    i--;
                }
            }
        }
        //No telling where we should break. Just return the string we got.
        return [string, ""];
    }

    // Return the event's indexed note if it exists. If not, create one if we
    // can and return that. Otherwise, return an empty string.
    function getIndexedEventNote(event) {

        if (!event.indexedNote && event.note && event.note.length) {
            var note = enyo.string.escapeHtml(event.note);	// Let's escape prior to doing anything, regardless of length.
//			var note = enyo.string.removeHtml(event.note);	// removeHTML now uses a regex and also escapes the html.

            event.note.length < MAX_INDEXABLE_SIZE && (note = enyo.string.runTextIndexer(note));  // If we can, index the note.

            note = note.replace(/\n/g, "<br />");			// Finally, do the replace for breaks.

            event.indexedNote = note;						// Save the indexed note on the event.
        }

        return event.indexedNote || "";	// Return the best match.
    }

    // ** EVENT ATTENDEE/PARTICIPANT FUNCTIONS
    //

    // Scans the input attendee array for the organizer, returning an object
    // hash of the organizer attendee and the array index
    // Params:
    //     attendees - Event attendees. (array)  See the Attendee schema.
    // Returns:
    //     An object containing the below properties, or undefined:
    //     attendee			: reference to the attendee
    //     attendeeIndex	: The index location of the organizer
    function getOrganizer(attendees) {
        var count = attendees && attendees.length;

        if (count) {
            for (var i = 0; i < count; ++i) {
                if (attendees[i].organizer) {
                    return {attendee: attendees[i], attendeeIndex: i};
                }
            }
        }
        return undefined;
    }

    // If there isn't an organizer property on the event, find who the organizer
    // is and set it.  If the property is set and false, there is no organizer.
    function findEventOrganizer(event) {
        if (!event) {
            return;
        }

        var attendees = Utilities.getActiveAttendees(event),
            num = attendees && attendees.length,
            organizer = event.organizer;

        !num && (organizer = event.organizerIndex = event.organizer = false);	// No attendees, no
        // organizer.

        if (organizer || organizer === false) {        // Did we run already?
            return;
        }

        if (organizer = getOrganizer(attendees)) {
            event.organizerIndex = organizer.attendeeIndex;
            event.organizer = organizer.attendee
        } else {
            event.organizer = event.organizerIndex = false;
        }
    }

    // Get the cached active (non-deleted) attendees on an event
    function getActiveAttendees(event) {
        if (!event) {
            return;
        }

        var attendees = event.attendees,
            num = attendees && attendees.length,
            activeAttendees = event.activeAttendees;


        !num && (activeAttendees = event.activeAttendees = false);	// No attendees, no count

        if (activeAttendees || activeAttendees === false) {    // Did we run already?
            return activeAttendees;
        }

        activeAttendees = [];
        for (var i = 0; i < num; ++i) {
            if (!attendees[i].notifyState || attendees[i].notifyState != "DELETED") {
                activeAttendees.push(attendees[i]);
            }
        }

        return event.activeAttendees = activeAttendees;
    }

    // We can edit events under the following conditions:
    // First and foremost, the calendar must be writeable
    // Second, if there are no attendees (in which case there also is no organizer)
    // OR if there are attendees either there is no organizer or you are the organizer.
    function isEventEditable(event) {
        if (!event || !event.calendarId) {
            return;
        }

        findEventOrganizer(event);

        var calendarsManager = enyo.application.calendarsManager,
            isWriteable = !calendarsManager.isCalendarReadOnly(event.calendarId),
            attendees = getActiveAttendees(event),
            numAttendees = attendees && attendees.length,
            organizer = numAttendees && event.organizer,
            accountUserName = numAttendees && calendarsManager.getCalAccountUser(event.calendarId),
            organizerEmail = organizer && organizer.email && organizer.email.toLowerCase(),
            youAreOrganizer = organizerEmail && accountUserName && organizerEmail == accountUserName.toLowerCase();

        return isWriteable && (!numAttendees || youAreOrganizer);
    }

    // ** DATE/TIME UTILITY FUNCTIONS
    var UNITS_YEARS = "0";
    var UNITS_MONTHS = "1";
    var UNITS_WEEKS = "2";
    var UNITS_DAYS = "3";
    var UNITS_HOURS = "4";
    var UNITS_MINUTES = "5";
    var UNITS_SECONDS = "6";

    function getDOWCount(value) {
        var date = new Date(value);
        var day;
        /*if it is the very first day, subtracting one day will cause it to go to previous month*/
        day = (date.getDate() === 1) ? 1 : date.addDays(-1).getDate();
        var num = parseInt((day / 7), 10) + 1;
        return num;
    }

    function getMillisecondsSinceMidnight(dateOrTimestamp) {
        // Returns the number of milliseconds since midnight of the specified date or timestamp.

        !getMillisecondsSinceMidnight.date && (getMillisecondsSinceMidnight.date = new Date());
        var date = getMillisecondsSinceMidnight.date;
        date.setTime(dateOrTimestamp == null ? NaN : +dateOrTimestamp);

        return (date.getHours() * 36e5) + (date.getMinutes() * 6e4) + (date.getSeconds() * 1e3) + date.getMilliseconds();
    }

    function getPeriodUnits(text) {
        var units;
        var isTime = false;

        text = text.toUpperCase();
        if (text.substring(0, 2) == "PT") {
            isTime = true;
        }
        else if (text.substring(0, 1) == "P") {
            isTime = false;
        }
        else {
            return undefined;
        }

        switch (text.charAt(text.length - 1)) {
        case 'Y':
            units = isTime ? undefined : UNITS_YEARS;
            break;
        case 'M':
            units = isTime ? UNITS_MINUTES : UNITS_MONTHS;
            break;
        case 'D':
            units = isTime ? undefined : UNITS_DAYS;
            break;
        case 'H':
            units = isTime ? UNITS_HOURS : undefined;
            break;
        case 'S':
            units = isTime ? UNITS_SECONDS : undefined;
            break;
        }

        return units;
    }

    function getPeriodValue(text) {
        if (text == "none") {
            return undefined;
        }

        var ch;
        var i;
        for (i = 0; i < text.length; i++) {
            ch = text.charAt(i);
            if (ch >= '0' && ch <= '9') {
                break;
            }
        }
        var startIndex = i;

        for (i = startIndex; i < text.length; i++) {
            ch = text.charAt(i);
            if (ch < '0' || ch > '9') {
                break;
            }
        }
        var endIndex = i;

        return text.substring(startIndex, endIndex);
    }

    function numToSuffix(num) {
        if (!this._suffixTempl) {
            this._suffixTempl = new enyo.g11n.Template($L("1#1st|2#2nd|3#3rd|21#21st|22#22nd|23#23rd|31#31st|##{n}th"));
        }

        return this._suffixTempl.formatChoice(num, {n: num});
    }

    function findReminderValue(alarm) {
        var reminderValue;
        var displayAlarmIndex = findDisplayAlarm(alarm);
        if (!alarm || displayAlarmIndex === null) {
            reminderValue = "none";
        } else {
            // TODO: Handle custom alarm times
            reminderValue = getAlarm(alarm [displayAlarmIndex]);
        }
        return reminderValue;
    }

    // Scans the alarm array looking for a valid alarm item we can use,
    // i.e., an alarm that has no action or has a 'display' action,
    // where trigger value type is DURATION, and has a trigger value.
    // Params:
    //     eventAlarm - Event's alarm property (object). See event spec.
    // Returns:
    //     The integer index of this alarm item in the array, or NULL.
    function findDisplayAlarm(eventAlarm) {
        var displayAlarmIndex = null;
        if (!eventAlarm) {
            return displayAlarmIndex;
        }
        var numAlarms = eventAlarm.length;

        for (var i = 0; i < numAlarms; i++) {
            //if it's not a 'display' alarm, skip it
            if (eventAlarm[i].action && eventAlarm[i].action.toLowerCase() != "display") {
                continue;
            }
            var trigger = eventAlarm[i].alarmTrigger;
            if (trigger && trigger.valueType == "DURATION" && trigger.value) {
                if (trigger.related && trigger.related.toLowerCase() != "start") {
                    continue;
                }
                return i;
            }
        }
        return displayAlarmIndex;
    }

    function isStandardAlarmValue(alarmValue, isAllDay) {
        var isStandard = false;
        var isStandardForType = false;

        switch (alarmValue) {
        case "none":
        case '-PT0M':
        case 'PT0M':
        case '+PT0M':
        case '-P1D':
        case '-P2D':
        case '-P3D':
        case '-P1W':
        case '-PT5M':
        case '-PT10M':
        case '-PT15M':
        case '-PT30M':
        case '-PT1H':
            isStandard = true;
        }
        if (isAllDay) {
            switch (alarmValue) {
            case "none":
            case '-PT0M':
            case 'PT0M':
            case '+PT0M':
            case '-P1D':
            case '-P2D':
            case '-P3D':
            case '-P1W':
                isStandardForType = true;
            }
        }
        else {
            switch (alarmValue) {
            case "none":
            case '-PT0M':
            case 'PT0M':
            case '+PT0M':
            case '-PT5M':
            case '-PT10M':
            case '-PT15M':
            case '-PT30M':
            case '-PT1H':
            case '-P1D':
                isStandardForType = true;
            }
        }

        return {isStandard: isStandard, isStandardForType: isStandardForType};
    }

    // Adapted from Mojo2: app/models/formatter_service.js:Formatter.getAlarmStrings()
    // It differs in behavior primarily in that it only processes one alarm
    // value at a time.
    // Params:
    //     alarmValue - A string that specifies an RFC5545 duration.
    //         Example: -PT5M
    // Returns:
    //     String description of alarm.
    //         Example: 5 minutes before (Processed param example from above)
    function getAlarmString(alarmValue) {
        DEBUG && console.log("===:===: in getAlarmString:" + alarmValue);

        // we are hardcoding static options to avoid
        // having to parse the period unnecessarily every time.
        var val;
        switch (alarmValue) { // TODO: Implement a regex or something to check alarm format. We always assume that it is correct.
        case "none":
            val = $L('No Reminder');
            break;

        case '-PT0M':
        case 'PT0M':
        case '+PT0M':
            val = $L('At Start Time');
            break;

        case '-PT5M':
            val = $L('5 minutes before');
            break;

        case '-PT10M':
            val = $L('10 minutes before');
            break;

        case '-PT15M':
            val = $L('15 minutes before');
            break;

        case '-PT30M':
            val = $L('30 minutes before');
            break;

        case '-PT1H':
            val = $L('1 hour before');
            break;

        case '-PT5M':
            val = $L('5 minutes before');
            break;

        case '-P1D':
            val = $L('1 day before');
            break;

        case '-P1D':
            val = $L('1 day before');
            break;

        case '-P2D':
            val = $L('2 days before');
            break;

        case '-P3D':
            val = $L('3 days before');
            break;

        case '-P1W':
            val = $L('1 week before');
            break;

        default:
            var period = getAlarmPartsFromString(alarmValue),
                template;
            val = formatPeriod(period);

            //Occasionally, we get an invalid alarm value, like "-PT",
            //and formatPeriod returns 'undefined'
            if (!val) {
                val = $L('No Reminder');
                break;
            }

            if (period.negative) {
                template = new enyo.g11n.Template($L("#{val} before"));
            }
            else {
                template = new enyo.g11n.Template($L("#{val} after"));
            }
            val = template.evaluate({val: val});

            break;
        }

        DEBUG && console.log("===:===: Processed alarm string:" + val);
        return val;
    }

    // Formats hour number for day and week view according to the conventions
    // of the current formats locale and the 12/24 pref.
    function formatHour(hours, is24Hr) {
        if (!this._hourFmt12 || !this._hourFmt24) {
            var fmts = new enyo.g11n.Fmts();
            this._hourFmt12 = new enyo.g11n.DateFmt({format: fmts.dateTimeFormatHash.timeH12});
            this._hourFmt24 = new enyo.g11n.DateFmt({format: fmts.dateTimeFormatHash.timeH24});
            this.timeMachine = new Date();
        }
        this.timeMachine.setHours(hours);
        return is24Hr ? this._hourFmt24.format(this.timeMachine) : this._hourFmt12.format(this.timeMachine);
    }

    // Adapted from Mojo2: app/models/formatter_service.js:Formatter.periodFormatter()
    // Formats a time period object into a readable string.
    // Params:
    //     period - Object of format: {weeks, days, hours, minutes, seconds, negative}
    //         Example: { weeks:0, days:0, hours:0, minutes:5, seconds:0, negative:true }
    // Returns:
    //     String description of alarm.
    //         Example: 5 minutes (Processed period example from above)
    function formatPeriod(period) {
        DEBUG && console.log("===:===: period:" + JSON.stringify(period));

        if (!this.durationFormatter) {
            this.durationFormatter = new enyo.g11n.DurationFmt({style: "full"});
        }
        return this.durationFormatter.format(period);
    }

    // Copied from Mojo2: javascripts/formatting-utils.js
    // Dissects the alarmString into the number of weeks, days, hours, minutes,
    // and seconds. It also determines if the alarm was positive or negative.
    // Params:
    //     alarmString - A string that specifies an RFC5545 duration.
    //         Example: -PT5M (5 minutes before)
    // Returns:
    //     Object of format: {weeks, days, hours, minutes, seconds, negative}
    //         Example: { weeks:0, days:0, hours:0, minutes:5, seconds:0, negative:true }
    function getAlarmPartsFromString(alarmString) {

        var duration = {weeks: 0, days: 0, hours: 0, minutes: 0, seconds: 0, negative: (alarmString[0] == "-")};

        //regexp matches one or more digits followed by the letters W|D|H|M|S.
        //This regexp will allow duration strings that do not follow the
        //duration definition - for example, it does not disallow other
        //components if the week component is present. There's probably a way to
        //write this regexp to enforce the standard more strictly. There's also
        //probably a way to write this so that you don't have to call it in a
        //loop. If your regexp kung-fu is strong, feel free to try to improve
        //this.

        var regexp = new RegExp(/(\d+)([WDHMS])/g);
        var tokens = regexp.exec(alarmString);
        //tokens[0]: whole parts "5M"
        //tokens[1]: numeric part "5"
        //tokens[2]: character part "M"
        //if tokens.length != 3, the duration string is malformed

        while (tokens !== null && tokens.length === 3) {
            switch (tokens[2]) {
            case "W":
                duration.weeks = parseInt(tokens[1], 10);
                break;
            case "D":
                duration.days = parseInt(tokens[1], 10);
                break;
            case "H":
                duration.hours = parseInt(tokens[1], 10);
                break;
            case "M":
                duration.minutes = parseInt(tokens[1], 10);
                break;
            case "S":
                duration.seconds = parseInt(tokens[1], 10);
                break;
            }
            tokens = regexp.exec(alarmString);
        }

        return duration;
    }

    function setAlarm(alarm, value) {
        alarm.alarmTrigger.value = value;
    }

    function getAlarm(alarm) {
        return alarm.alarmTrigger.value;
    }

    function addException(targetEvent, date) {
        // TODO: We should probably make exceptions always in UTC.  In the evaluateExceptions function, we're assuming
        //non-UTC datetime exceptions were always created in the event's timezone, but if an exception was created
        //while the device is not in the event's timezone, the exception would NOT be in the same timezone.
        var exdate = this.getUTCFormatDateString(date);
        if (!targetEvent.exdates) {
            targetEvent.exdates = [exdate];
        }
        else {
            var exdates = targetEvent.exdates;
            var exdatesLength = exdates.length;
            var insertIndex = exdatesLength;
            //find where we need to insert the exdate
            //Ideally this is an ordered list.
            // TODO: We might remove this.  If during sync, we're not actively enforcing that our exdates are in the same format, then we can't
            //enforce an ordered list. If we don't have an ordered list, we can't exit out of our evaluation early.  This makes
            //cycling through the list to add exdates at the right index pointless. We can just stick it on the end.
            for (var i = 0; i < exdatesLength; i++) {
                if (exdates[i] > exdate) {
                    insertIndex = i;
                    break;
                }
            }
            exdates.splice(insertIndex, 0, exdate);
        }
    }

    function getUTCFormatDateString(date, formatType) {
        var year = date.getUTCFullYear();
        var mon = date.getUTCMonth() + 1;
        var day = date.getUTCDate();

        var hrs = date.getUTCHours();
        var min = date.getUTCMinutes();
        var sec = date.getUTCSeconds();

        mon = (mon < 10) ? ("0" + mon) : mon;
        day = (day < 10) ? ("0" + day) : day;
        hrs = (hrs < 10) ? ("0" + hrs) : hrs;
        min = (min < 10) ? ("0" + min) : min;
        sec = (sec < 10) ? ("0" + sec) : sec;

        var dateString;
        if (formatType && formatType.format == "activity") {
            //YYYY-MM-DD HH:MM:SSZ
            dateString = "" + year + "-" + mon + "-" + day + " " + hrs + ":" + min + ":" + sec + "Z";
        }
        else {
            //YYYYMMDDTHHMMSSZ
            dateString = "" + year + mon + day + "T" + hrs + min + sec + "Z";
        }

        return dateString;
    }

//--------------------------------------------------------------------------------------------------------------------
// TODO: Move all RRule manipulation functions below this comment into the Calendar.RRuleManager loadable library.
//--------------------------------------------------------------------------------------------------------------------
    function makeBasicRRule(repeatType, dtstart) {
        var rrule = {interval: 1};
        var day = new Date(dtstart).getDay();
        switch (repeatType) {
        case "weekly":
            rrule.freq = "WEEKLY";
            rrule.rules = [
                {ruleType: "BYDAY", ruleValue: [
                    {day: day}
                ]}
            ];
            break;

        case "weekday":
            rrule.freq = "WEEKLY";
            rrule.rules = [
                {ruleType: "BYDAY", ruleValue: [
                    {day: 1},
                    {day: 2},
                    {day: 3},
                    {day: 4},
                    {day: 5}
                ]}
            ];
            break;

        case "daily":
        default:
            rrule.freq = "DAILY";
            rrule.rules = [];
            break;
        }
        return rrule;
    }

    function findRepeatValue(rrule) {
        switch (true) {
        case (!rrule || !rrule.freq):
            return "never";

        case (rrule.count && rrule.count == 1):
            return "never";

        case (isBasicDailyRepeatRRule(rrule)):
            return "daily";

        case (isBasicWeeklyRepeatRRule(rrule)):
            return "weekly";

        case (isBasicWeekdaysRepeatRRule(rrule)):
            return "weekday";

        default:
            switch (rrule.freq) {
            case "DAILY":
                return "customDaily";

            case "WEEKLY":
                return "customWeekly";

            case "MONTHLY":
                return "customMonthly";

            case "YEARLY":
                return "customYearly";

            default:
                return "custom";
            }
        }
    }

    var LEGACY_UNTIL_VALUE = "Long.MAX_VALUE";

    function isBasicDailyRepeatRRule(rrule) {
        return (rrule.freq == 'DAILY' &&
            (!rrule.until || rrule.until == LEGACY_UNTIL_VALUE) &&
            (!rrule.count) &&
            (!rrule.interval || rrule.interval == 1));
    }

    function isBasicWeeklyRepeatRRule(rrule) {
        return (rrule.freq == 'WEEKLY' && //repeats weekly
            (!rrule.until) && (!rrule.count) && //has no until or until is forever
            (!rrule.interval || rrule.interval == 1) && //has no interval or interval is 1
            (!rrule.rules || //has no rules OR
                ((rrule.rules && rrule.rules.length == 1 && rrule.rules[0].ruleType == 'BYDAY') && //has one byday rule
                    (rrule.rules[0].ruleValue.length == 1 && !rrule.rules[0].ruleValue[0].ord))));
    }

    function isBasicWeekdaysRepeatRRule(rrule) {
        if (!rrule.rules) {
            return false;
        }

        if (rrule.freq == 'WEEKLY' &&
            (!rrule.until || rrule.until == LEGACY_UNTIL_VALUE) && (!rrule.count) &&
            (!rrule.interval || rrule.interval == 1) &&
            (rrule.rules.length == 1 && rrule.rules[0].ruleType == 'BYDAY')) {
            var dayArray = rrule.rules[0].ruleValue;
            if (dayArray.length == 5) {
                for (var i = 0; i < 5; i++) {
                    if (dayArray[i].day !== (i + 1) || dayArray[i].ord) {
                        break;
                    }
                }
                return (i == 5);
            }
        }
        return false;
    }

//-----------------------------------------------------------------------------------
//  Used by the 'setting date time' section of edit view.  If you don't know anything about
//  RRULEs, then don't touch this.
//-----------------------------------------------------------------------------------
    //When the start date of the event is changed, WEEKLY:single day, WEEKLY:custom, MONTHLY repeating events
    //must update their rrule. DAILY, YEARLY, and WEEKLY:weekdays repeating events do not need to be changed.
    //This function only changes the rrule's BYDAY rule and/or rrule's BYMONTHDAY rule. All other fields are left unchanged.
    //Params: removeDate - the day/date to be removed from byday/bymonthday
    //        addDate - the day/date to be added to the byday/bymonthday array.
    function updateByDayRRule(rrule, removeDate, addDate) {
        var frequency = rrule && rrule.freq;

        if (frequency != 'WEEKLY' && frequency != 'MONTHLY') {
            return;
        }

        var oldDate = new Date(removeDate),
            newDate = new Date(addDate);

        //Need to know if we have BYDAY rule or a BYMONTHDAY rule, and if so, which one is it?
        var byDayRuleIndex = -1;
        var byMonthDayRuleIndex = -1;
        var rulesLength = rrule.rules.length;
        for (var i = 0; i < rulesLength; i++) {
            var rule = rrule.rules[i];
            if (rule.ruleType == "BYMONTHDAY") {
                byMonthDayRuleIndex = i;
                break;
            }
            else if (rule.ruleType == "BYDAY") {
                byDayRuleIndex = i;
                break;
            }
        }

        var dayArray;
        var monthDayArray;
        switch (frequency) {

        case 'WEEKLY': // Do NOT Localize
            //if we're weekly and don't have a BYDAY rule, bad things would happen.
            if (byDayRuleIndex == -1) {
                break;
            }

            dayArray = rrule.rules[byDayRuleIndex].ruleValue;
            if (!dayArray) {
                break;
            }

            //Weekly: weekdays
            if (Utilities.isWeekdaysRule(dayArray) && (rrule.interval == 1 || !rrule.interval)) {
                //Weekdays -> do nothing.
                break;
            }

            //Weekly: single day
            else if (dayArray.length === 1) {
                rrule.rules[byDayRuleIndex].ruleValue = [
                    {"day": newDate.getDay()}
                ];
            }

            //Weekly: custom.
            //Remove old date's weekday, add new date's weekday, leaving previous values intact
            else {
                //find the index of the old date's weekday in the byday array
                var oldDayIndex = Utilities.findDayInByDayArray(dayArray, oldDate.getDay());
                var newDay = newDate.getDay();
                //remove the old day from the byday array
                if (oldDayIndex > -1) {
                    dayArray.splice(oldDayIndex, 1);
                }

                //Make sure the new day we're adding isn't already in the array
                if (Utilities.findDayInByDayArray(dayArray, newDay) == -1) {
                    //find the right spot to add the new day
                    var j = 0;
                    var daysLength = dayArray.length;
                    while (j < daysLength && newDay > dayArray[j].day) {
                        j++;
                    }
                    //insert the new day
                    dayArray.splice(j, 0, {"day": newDay});
                }
            }
            break;

        case 'MONTHLY': // Do NOT Localize
            //Monthly by date

            if (byMonthDayRuleIndex != -1) {
                rrule.rules[byMonthDayRuleIndex].ruleValue = [
                    {"ord": newDate.getDate()}
                ];
            }
            else {
                var nth = Utilities.getDOWCount(newDate);
                rrule.rules[byDayRuleIndex].ruleValue = [
                    {"ord": nth, "day": newDate.getDay()}
                ];
            }
            break;

        default:
            break;
        }
    }

    function isWeekdaysRule(ruleArray) {
        if (ruleArray.length == 5) {
            for (var i = 0; i < 5; i++) {
                if (ruleArray[i].day !== (i + 1) || ruleArray[i].ord) {
                    break;
                }
            }
            return (i == 5);
        }
        return false;
    }

    function findDayInByDayArray(array, dayToFind) {
        var arrayLength = array.length;
        var dayIndex = -1;
        for (var i = 0; i < arrayLength; i++) {
            if (array[i].day == dayToFind) {
                dayIndex = i;
                break;
            }
        }
        return dayIndex;
    }

    function isLastDayofMonthRule(rrule) {
        //"rrule":{"freq":"MONTHLY","rules":[{"ruleType":"BYMONTHDAY","ruleValue":[{"ord":-1}]}]}
        if (!rrule) {
            return false;
        }
        if (rrule.freq == "MONTHLY" && rrule.rules && rrule.rules.length == 1) {
            var rule = rrule.rules[0];
            if (rule.ruleType == "BYMONTHDAY" && rule.ruleValue && rule.ruleValue.length == 1) {
                var value = rule.ruleValue[0];
                if (value.ord && value.ord == -1 && !value.day) {
                    return true;
                }
            }
        }
        return false;
    }

    function isArrayLike(item) {
        /**
         *    Determines if @param item can be used as an Array.
         */
        console.info(Object.prototype.toString.call(item));
        var array,
            isObject = !!item && ("object" == typeof item);
        return isObject &&
            (    !!Array.prototype.slice                            // Environment support's Array's slice method.
                && (array = Array.prototype.slice.call(item, 0))    // Creates an array using the object's contents.
                && (array.length === item.length)                    // Created array and item have expected number of contents.
                || (item.length && isNaN(item.length))            // Or Created array has content and item doesn't support the length property.
                );
    }

    function assignEventColors(days, calendars) {
        var allEvents = [],
            cal,
            event,
            length;

        if (!calendars || !days) {
            return;
        }

        for (var date in days) {
            var day = days[date];
            Array.isArray(day.allDayEvents) && (allEvents = allEvents.concat(day.allDayEvents));
            Array.isArray(day.hiddenAllDay) && (allEvents = allEvents.concat(day.hiddenAllDay));
            Array.isArray(day.events) && (allEvents = allEvents.concat(day.events));
            Array.isArray(day.hiddenEvents) && (allEvents = allEvents.concat(day.hiddenEvents));
        }

        length = allEvents.length;
        for (var i = 0; i < length; i++) {
            event = allEvents[i];
            cal = calendars [event.calendarId];
            cal && (event.color = cal.color);
        }
    }

    // Quick and dirty deep clone.  Works for data objects.
    function deepCloneObject(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    function getSetterGetterMethod(property, setOrGet) {
        /* Used to generate the setter or getter function name off of a property name
         /	setOrGet: string "set"|"get", default "get"
         \	property: string name of property.
         */
        return ((setOrGet === "set") ? "set" : "get") + property.charAt(0).toUpperCase() + property.substring(1);	// Auto-camel-case for setters i.e. is24Hr -> setIs24Hr.
    }

//--------------------------------------------------------------------------------------------------------------------
// TODO: Move all RRule manipulation functions below this comment into the Calendar.RRuleManager loadable library.
//--------------------------------------------------------------------------------------------------------------------

    // Publish the Utilities object for public access:
    this.Utilities = {
        addException                : addException,
        assignEventColors           : assignEventColors,
        deepCloneObject             : deepCloneObject,
        findDayInByDayArray         : findDayInByDayArray,
        findDisplayAlarm            : findDisplayAlarm,
        findEventOrganizer          : findEventOrganizer,
        findReminderValue           : findReminderValue,
        findRepeatValue             : findRepeatValue,
        formatHour                  : formatHour,
        formatPeriod                : formatPeriod,
        getActiveAttendees          : getActiveAttendees,
        getAlarm                    : getAlarm,
        getAlarmPartsFromString     : getAlarmPartsFromString,
        getAlarmString              : getAlarmString,
        getDOWCount                 : getDOWCount,
        getIndexedEventNote         : getIndexedEventNote,
        getOrganizer                : getOrganizer,
        getPeriodUnits              : getPeriodUnits,
        getPeriodValue              : getPeriodValue,
        getMillisecondsSinceMidnight: getMillisecondsSinceMidnight,
        getSetterGetterMethod       : getSetterGetterMethod,
        getUTCFormatDateString      : getUTCFormatDateString,
        isArrayLike                 : isArrayLike,
        isBasicDailyRepeatRRule     : isBasicDailyRepeatRRule,
        isBasicWeeklyRepeatRRule    : isBasicWeeklyRepeatRRule,
        isBasicWeekdaysRepeatRRule  : isBasicWeekdaysRepeatRRule,
        isEventEditable             : isEventEditable,
        isLastDayofMonthRule        : isLastDayofMonthRule,
        isWeekdaysRule              : isWeekdaysRule,
        isStandardAlarmValue        : isStandardAlarmValue,
        makeBasicRRule              : makeBasicRRule,
        numToSuffix                 : numToSuffix,
        setAlarm                    : setAlarm,
        updateByDayRRule            : updateByDayRRule,
        wrapIt                      : wrapIt
    };

})();
