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


/*global enyo Utilities */
/*jslint laxbreak: true, devel: true*/

/*	TODO: Integrate EventManager to calculate number of occurences for description update.
 TODO: Integrate with localization
 TODO: Notify framework team that list selector does not allow 0 as a value
 */
enyo.kind({
    name     : "calendar.edit.RepeatView",
    kind     : enyo.VFlexBox,
    className: "calendar-repeat-view",
    events   : {
        onExit        : "",
        onRepeatChange: ""
    },

    published: {
        event      : null, // NOTE: Expected to be a CalendarEvent instance.
        currentDate: null
    },

    G11N: {
        foreverString: $L("This event repeats forever."),
        occursString : $L("Occurs #{n} times"),
        untilTemplate: new enyo.g11n.Template($L("This event repeats until #{date}.")),
        countTemplate: new enyo.g11n.Template($L("This event repeats #{count} times.")),
        dateFormatter: new enyo.g11n.DateFmt({date: "medium", dateComponents: "mdy", weekday: "long"}),
        fmts         : new enyo.g11n.Fmts()
    },

    components: [
        {name: "contentScroller", kind: enyo.Scroller, flex: 1, components: [
            //{name:"subject", className: "repeat-view-subject"},
            {kind: enyo.Group, caption: $L("CHOOSE CUSTOM REPEAT"), components: [
                {kind: enyo.Item, style: "border-top:0", components: [
                    {name: "repeatFreq", kind: enyo.ListSelector, value: "daily", flex: 1, hideArrow: true, onChange: "changeRepeatFreq"}
                ]},
                {name: "weekDrawer", kind: enyo.BasicDrawer, animate: true, open: false, tapHighlight: false, components: [
                    {kind: enyo.Item, align: " center", tapHighlight: false, defaultKind: enyo.Control, layoutKind: enyo.HLayout, components: [
                        {    tapHighlight: false, components: [
                            {name: "weekday0"},
                            {kind: enyo.CheckBox, name: "cb0", onChange: "weekdayClicked"}
                        ], className     : "repeat-weekday-checkbox"},
                        {    tapHighlight: false, components: [
                            {name: "weekday1"},
                            {kind: enyo.CheckBox, name: "cb1", onChange: "weekdayClicked"}
                        ], className     : "repeat-weekday-checkbox"},
                        {    tapHighlight: false, components: [
                            {name: "weekday2"},
                            {kind: enyo.CheckBox, name: "cb2", onChange: "weekdayClicked"}
                        ], className     : "repeat-weekday-checkbox"},
                        {    tapHighlight: false, components: [
                            {name: "weekday3"},
                            {kind: enyo.CheckBox, name: "cb3", onChange: "weekdayClicked"}
                        ], className     : "repeat-weekday-checkbox"},
                        {    tapHighlight: false, components: [
                            {name: "weekday4"},
                            {kind: enyo.CheckBox, name: "cb4", onChange: "weekdayClicked"}
                        ], className     : "repeat-weekday-checkbox"},
                        {    tapHighlight: false, components: [
                            {name: "weekday5"},
                            {kind: enyo.CheckBox, name: "cb5", onChange: "weekdayClicked"}
                        ], className     : "repeat-weekday-checkbox"},
                        {    tapHighlight: false, components: [
                            {name: "weekday6"},
                            {kind: enyo.CheckBox, name: "cb6", onChange: "weekdayClicked"}
                        ], className     : "repeat-weekday-checkbox"}
                    ]}
                ]},
                {kind: enyo.Item, layoutKind: enyo.HLayout, tapHighlight: false, style: "padding:0; border-bottom:0;", components: [
                    {name: "intervalLabelLeft", content: "", style: "margin-left:10px;"},
                    {kind: enyo.IntegerPicker, name: "interval", value: 1, min: 1, max: 99, label: "", onChange: "changeInterval", style: "margin:0 5px;"},
                    {name: "intervalLabelRight", content: ""}
                ]}
            ]},
            {kind: enyo.Group, caption: $L("REPEAT UNTIL"), components: [
                {kind: enyo.Item, style: "border-top:0;", components: [
                    {name: "endType", kind: enyo.ListSelector, onChange: "changeEndType", items: [
                        {caption: $L("Forever"), value: "forever"}
                        ,
                        {caption: $L("End Date"), value: "until"}
                        ,
                        {caption: $L("Number of Occurrences"), value: "count"}
                    ]
                    }
                ]
                },
                {name: "dateDrawer", kind: enyo.BasicDrawer, animate: true, open: false, components: [
                    {kind: enyo.Item, tapHighlight: false, style: "padding:0; border-bottom:0;", components: [
                        {name: "until", kind: enyo.DatePicker, label: "", onChange: "changeUntil", style: "margin: 0 0 10px 0;"}
                    ]}
                ]},
                {name: "countDrawer", kind: enyo.BasicDrawer, animate: true, open: false, components: [
                    {kind: enyo.Item, tapHighlight: false, layoutKind: enyo.HLayout, align: "left", style: "padding:0; border-bottom:0;", components: [
                        {name: "occursLeft", content: "", style: "margin-left:10px;"},
                        {name: "count", kind: "Picker", value: "10", onChange: "changeCount", style: "margin:0", items: [
                            "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "47", "48", "49", "50"]
                        },
                        {name: "occursRight", content: ""}
                    ]}
                ]}
            ]},
            {name: "description", className: "enyo-footnote"},
        ]},
        {kind: enyo.HFlexBox, components: [
            {name: "btnCancel", kind: enyo.Button, caption: $L("Cancel"), onclick: "cancelClicked", flex: 1, className: "enyo-button-light"},
            {name: "btnDone", kind: enyo.Button, caption: $L("Done"), onclick: "doneClicked", flex: 1, className: "spaceButton enyo-button-light"}
        ]},
        {kind             : "ApplicationEvents",
            onWindowHidden: "cancelClicked"
        }
    ],

    create: function create() {
        this.inherited(arguments);

        this.setupOnClose();

        this.types = {
            DAILY      : 1,
            WEEKLY     : 2,
            MONTHLYDATE: 3,
            MONTHLYDAY : 4,
            YEARLY     : 5,
            LASTOFMONTH: 6
        };

        var ui = this.$,
            occurs;

        this.startOfWeek = enyo.application.prefsManager.prefs.startOfWeek - 1 || this.G11N.fmts.getFirstDayOfWeek();
        this.setupWeekdayCheckboxes();

        // This is how we can deal with putting the list selector in the right spot in the
        // string. First, we localize the whole string, then pick out the replacement parameter
        // and split the string into the left and right parts. In some languages, the left or
        // right will be empty.
        occurs = this.G11N.occursString.split(/#\{n\}/);
        this.$.occursLeft.setContent(occurs[0]);
        this.$.occursRight.setContent(occurs[1]);
    },

    exitView: function exitView() {
        DEBUG && this.log("########## Exit RepeatView view.");
        this.oldWeeklyDayValues = null;
        if (enyo.isFunction(this.container.close)) {
            this.container.close();
        } else {
            this.doExit();
            this.reset();					//	always reset the view (i.e. pane and scroll position)
        }
    },

    reset: function reset() {
        var ui = this.$;
        ui.contentScroller.setScrollTop(0);	// Reset the scroll position.
    },

    setupOnClose: function setupOnClose() {
        if (!enyo.isFunction(this.container.doClose)) {
            return;
        }
        var view = this,
            doClose = this.container.doClose;
        this.container.doClose = function closeManager() {        // Override this popup's onClose handler to:
            DEBUG && this.log("########## Hiding RepeatView popup.");
            view.doExit();
            doClose.apply(this, arguments);						//		then run any defined "onClose" handler.
            view.reset();											//		always reset the view (i.e. pane and scroll position)
        };
    },

    eventChanged          : function eventChanged(oldEvent) {
        var event = this.event;
        if (!event) {
            return;
        }

        if (event && event.rrule) {
            this.rrule = JSON.parse(JSON.stringify(event.rrule));
        }
        else {
            this.rrule = {freq: "DAILY", interval: 1};
        }


        var ui = this.$,
            hasCount = !(isNaN(this.rrule.count)),
            hasUntil = !(isNaN(this.rrule.until)),
            ruleType = this.whatKindOfRRule(this.rrule);

        //("color" in event) && this.updateColorTheme (event.color);	// NOTE: Hiding the event subject & not updating the color - may include this again later.

        this.setupFreqLabels();

        //ui.subject			.setContent	(event.subject == null ? "" : event.subject);	// NOTE: Hide unsightly "undefined" or "null" values from display.
        ui.dateDrawer.setOpen(hasUntil);
        ui.countDrawer.setOpen(hasCount);
        ui.repeatFreq.setValue(ruleType);

        var until = this.rrule.until;
        var untilDate = (until) ? new Date(until) : new Date(this.currentDate);
        ui.until.setValue(untilDate);

        var count = this.rrule.count || 10;
        if (count > 50) {
            var items = ui.count.getItems();
            items.push("" + count);
            this.customItemAdded = count;
        }
        ui.count.setValue(count);

        this.setupEndType();

        var interval = this.rrule.interval || 1;
        ui.interval.setValue(interval);
        this.updateFreqUI(ruleType);
    },

    /*updateColorTheme: function updateColorTheme (color) {
     if (!color) { return; }
     var	header = this.$.subject;
     header.removeClass (this.colorThemeClass);
     this.colorThemeClass = "theme-" + color;
     header.addClass (this.colorThemeClass);
     },*/

    /*
     * Arrange labels and weekday values of the 'WEEKLY' repeat checkboxes to reflect start of week preference.
     */
    setupWeekdayCheckboxes: function setupWeekdayCheckboxes() {
        var ui = this.$,
            labels = this.G11N.fmts.dateTimeHash["short"].day, // 2-letter day name labels
            i,
            j,
            dayValues = [0, 1, 2, 3, 4, 5, 6],
            checkboxes = [ui.cb0, ui.cb1, ui.cb2, ui.cb3, ui.cb4, ui.cb5, ui.cb6],
            vflexboxes = [ui.weekday0, ui.weekday1, ui.weekday2, ui.weekday3, ui.weekday4, ui.weekday5, ui.weekday6];

        for (i = 0, j = this.startOfWeek; i < 7; i++) {
            var cb = checkboxes[i],
                vb = vflexboxes[i];
            vb.setContent(labels[j]);
            cb.dayOfWeekValue = dayValues[j];
            j = (j + 1) % 7;
        }
    },

    /*
     * Sets up the 'Monthly on the 7th" or "Monthly on the 1st Tuesday" labels
     *
     */
    setupFreqLabels       : function setupFreqLabels() {
        var event = this.event,
            ui = this.$,
            date = new Date(this.currentDate),
            weekdayNames = this.G11N.fmts.dateTimeHash["long"].day;

        var dayOfMonth = date.getDate(),
            month = date.getMonth(),
            weekdayPosition = Utilities.getDOWCount(date.getTime()),
            weekdayPositionString = Utilities.numToSuffix(weekdayPosition),
            dateStr = Utilities.numToSuffix(dayOfMonth),
            monthlyDateTempl = new enyo.g11n.Template($L("Monthly on the #{dayofmonth}")),
            monthlyDate,
            monthlyDayTempl = new enyo.g11n.Template($L("Monthly on the #{nth} #{dayofweek}")),
            monthlyDay,
            mdFmt = new enyo.g11n.DateFmt({date: 'medium', dateComponents: "md"}),
            //  monthday = new Date(1970, month, dayOfMonth),
            yearlyTempl = new enyo.g11n.Template($L("Yearly on #{monthday}")),
            yearly,
            captions,
            i,
            j;

        var items = [];

        monthlyDate = monthlyDateTempl.evaluate({
            dayofmonth: dateStr
        });
        monthlyDay = monthlyDayTempl.evaluate({
            nth      : weekdayPositionString,
            dayofweek: weekdayNames[date.getDay()]
        });
        yearly = yearlyTempl.evaluate({
            monthday: mdFmt.format(date)
        });

        captions = [$L("Daily"), $L("Weekly"), monthlyDate, monthlyDay, yearly];

        for (i = 0, j = captions.length; i < j; i++) {
            items.push({caption: captions[i], value: i + 1});
        }
        if (this.isLastDay(date) || Utilities.isLastDayofMonthRule(this.rrule)) {
            items.push({caption: $L("Last day of the month"), value: i + 1});
        }
        ui.repeatFreq.setItems(items);

    },

    isLastDay: function isLastDay(date) {
        var day = date.getDate();
        var isLast = false;
        if (day < 28) {
            return false;
        }

        // TODO: use the localized calendar object to figure this out when it comes available in a future release
        var month = date.getMonth() + 1;
        var year = date.getFullYear();
        switch (month) {
            //January, March, May, July, August, October, December
        case 1:
        case 3:
        case 5:
        case 7:
        case 8:
        case 10:
        case 12:
            isLast = (day == 31);
            break;

            //April, June, September, November
        case 4:
        case 6:
        case 9:
        case 11:
            isLast = (day == 30);
            break;
            //February
        case 2:
            isLast = Date.isLeapYear(year) ? (day == 29) : (day == 28);
            break;
        }
        return isLast;
    },

    setupEndType: function setupEndType() {
        var ui = this.$,
            endType = "forever";

        if (this.rrule.until) {
            endType = "until";
        }
        else if (this.rrule.count) {
            endType = "count";
        }

        ui.endType.setValue(endType);
        this.changeEndType();
        this.setDescription(endType);
    },

    changeRepeatFreq: function changeRepeatFreq() {
        var ui = this.$,
            repeatType = ui.repeatFreq.value;
        this.updateRRuleFreq(repeatType);
        this.updateFreqUI(repeatType);
        this.log("---:---: New rrule: " + JSON.stringify(this.rrule));
    },

    updateRRuleFreq: function updateRRuleFreq(repeatType) {
        var start = new Date(this.currentDate),
            day = start.getDay(),
            date = start.getDate(),
            nth = Utilities.getDOWCount(this.currentDate),
            ordDay;

        this.rrule.rules = [];

        switch (repeatType) {
        case this.types.DAILY:
            this.rrule.freq = 'DAILY';	// Do NOT Localize
            break;

        case this.types.WEEKLY:
            this.rrule.freq = 'WEEKLY'; // Do NOT Localize
            var ruleValue;
            if (this.oldWeeklyDayValues) {
                ruleValue = this.oldWeeklyDayValues;
            }
            else {
                ordDay = this.makeOrdDay(undefined, day);
                ruleValue = [ordDay];
            }
            this.addRule("BYDAY", ruleValue);
            this.oldWeeklyDayValues = this.getBydayRuleValues(this.rrule);
            break;

        case this.types.MONTHLYDATE:
            this.rrule.freq = 'MONTHLY'; // Do NOT Localize
            ordDay = this.makeOrdDay(date, undefined);
            this.addRule("BYMONTHDAY", [ordDay]);
            break;

        case this.types.MONTHLYDAY:
            this.rrule.freq = 'MONTHLY'; // Do NOT Localize
            ordDay = this.makeOrdDay(nth, day);
            this.addRule("BYDAY", [ordDay]);
            break;

        case this.types.YEARLY:
            this.rrule.freq = 'YEARLY'; // Do NOT Localize
            break;

        case this.types.LASTOFMONTH:
            this.rrule.freq = 'MONTHLY'; // Do NOT Localize
            ordDay = this.makeOrdDay(-1, undefined);
            this.addRule("BYMONTHDAY", [ordDay]);
            break;

        }
        // this.log("---:---: RRULE: "+JSON.stringify(this.rrule));
    },

    updateFreqUI: function updateFreqUI(repeatType) {
        var ui = this.$, // FYI: Cache checkboxes array instead of recreating a new one each time.
            checkboxes = this.checkboxes || (this.checkboxes = [ui.cb0, ui.cb1, ui.cb2, ui.cb3, ui.cb4, ui.cb5, ui.cb6]),
            types = [ "", // DON'T LOCALIZE
                      "daily", // DON'T LOCALIZE
                      "weekly", // DON'T LOCALIZE
                      "monthly-date", // DON'T LOCALIZE
                      "monthly-day", // DON'T LOCALIZE
                      "yearly", // DON'T LOCALIZE
                      "monthly-day"      // DON'T LOCALIZE - for last of month
            ],
            intervalLabels = [ "",
                               $L("Every #{n} day(s)"), // DO LOCALIZE
                               $L("Every #{n} week(s)"), // DO LOCALIZE
                               $L("Every #{n} month(s)"), // DO LOCALIZE
                               $L("Every #{n} month(s)"), // DO LOCALIZE
                               $L("Every #{n} year(s)"), // DO LOCALIZE
                               $L("Every #{n} month(s)")    // DO LOCALIZE
            ],
            isWeekly = (types [repeatType] === "weekly"),
            cb,
            i,
            j;
        ui.weekDrawer.setOpen(isWeekly);

        // This is how we can deal with putting the list selector in the right spot in the
        // string. First, we localize the whole string, then pick out the replacement parameter
        // and split the string into the left and right parts. In some languages, the left or
        // right will be empty.
        var labels = intervalLabels[repeatType].split(/#\{n\}/);
        ui.intervalLabelLeft.setContent(labels[0]);
        ui.intervalLabelRight.setContent(labels[1]);

        for (cb, i = checkboxes.length; i--;) {    // reset the weekly checkboxes:
            cb = checkboxes[i];
            cb.setChecked(false);				// Clear existing selections
            cb.setDisabled(false);				// Re-enable checkbox selection
        }

        if (!isWeekly) {
            return;
        }

        if (enyo.application.prefsManager.prefs.startOfWeek - 1 !== this.startOfWeek && enyo.application.prefsManager.prefs.userChangedStartOfWeek) {
            // have to redo the labels
            this.startOfWeek = enyo.application.prefsManager.prefs.startOfWeek - 1;
            this.setupWeekdayCheckboxes();
        }

        var ruleDays = this.getBydayRuleDays(),
            mandatoryDay = ruleDays.mandatory,
            days = ruleDays.days,
            index = days.length;
        for (j; index--;) {
            j = (days [index] - this.startOfWeek + 7) % 7; // NOTE: Adjust for start of week rearranged
            checkboxes[j].setChecked(true);
            (days [index] == mandatoryDay) && checkboxes[j].setDisabled(true);
        }
    },

    weekdayClicked: function weekdayClicked(cb) {
        var dayValue = cb.dayOfWeekValue;
        cb.checked ? this.addDayRuleValue(dayValue) : this.removeDayRuleValue(dayValue);
    },

    changeInterval: function changeInterval() {
        this.rrule.interval = this.$.interval.getValue();
    },

    changeEndType: function changeEndType() {
        var ui = this.$,
            endType = ui.endType.getValue();
        switch (endType) {
        case "forever":
            delete this.rrule.until;
            delete this.rrule.count;
            ui.dateDrawer.setOpen(false);
            ui.countDrawer.setOpen(false);
            break;
        case "until":
            delete this.rrule.count;
            this.rrule.until = ui.until.getValue().getTime();
            ui.dateDrawer.setOpen(true);
            ui.countDrawer.setOpen(false);
            break;
        case "count":
            delete this.rrule.until;
            this.rrule.count = ui.count.getValue();
            ui.dateDrawer.setOpen(false);
            ui.countDrawer.setOpen(true);
            break;
        }
        this.setDescription(endType);
    },

    changeUntil: function changeUntil() {
        //This should be the date shown on the date picker, and the start time of the event
        var until = this.$.until.getValue().getTime();
        this.rrule.until = until;

        if (until < this.currentDate) {
            this.rrule.until = this.currentDate;
            this.$.until.setValue(new Date(this.rrule.until));
        }
        this.setDescription("until");
    },

    changeCount: function changeCount() {
        var count = this.$.count.getValue();
        this.rrule.count = count;
        this.setDescription("count");
    },

    setDescription: function setDescription(endType) {
        var desc = this.$.description;
        var content;
        switch (endType) {
        case "forever":
            content = this.G11N.foreverString;
            break;
        case "until":
            var date = new Date(this.rrule.until);
            content = this.G11N.untilTemplate.evaluate({date: this.G11N.dateFormatter.format(date)});
            break;
        case "count":
            content = this.G11N.countTemplate.evaluate({count: this.rrule.count});
            break;
        }
        desc.setContent(content);
    },


    cancelClicked: function cancelClicked() {
        this.exitView();
        return true;
    },

    doneClicked: function doneClicked() {

        // RepeatView exit point:
        this.event.rrule = this.rrule;
        this.event.repeatChanged = true;
        this.doRepeatChange();
        if (this.customItemAdded) {
            var items = this.$.count.getItems();
            items.pop();
            this.customItemAdded = undefined;
            this.$.count.setItems(items);
        }

        this.exitView();
    },

    //------------------- Maybe we need a section of rrule manipulation utilities-----------------

    whatKindOfRRule: function whatKindOfRRule(rrule) {
        var freq = rrule.freq,
            ruleType;
        switch (freq) {
        case "DAILY":
        case "WEEKLY":
        case "YEARLY":
            ruleType = this.types[freq];
            break;

        case "MONTHLY":
            var byDayRules = this.getBydayRuleValues(rrule);
            ruleType = this.types.MONTHLYDATE;

            //If we have BYDAY rules, and the value matches the currentDate, use monthly-by-day
            if (byDayRules) {
                var day = new Date(this.currentDate).getDay();
                var ord = Utilities.getDOWCount(this.currentDate);
                if (byDayRules.length === 1 &&
                    (byDayRules[0].day == day && byDayRules[0].ord == ord)) {
                    ruleType = this.types.MONTHLYDAY;
                }
            }

            if (ruleType == this.types.MONTHLYDATE) {
                var byMonthdayRules = this.getByMonthdayRuleValues(rrule);
                if (byMonthdayRules.length === 1 && byMonthdayRules[0].ord == -1) {
                    ruleType = this.types.LASTOFMONTH;
                }
            }
            break;
        }
        return ruleType;
    },

    getBydayRuleValues: function getBydayRuleValues(rrule) {
        var ruleValue = [],
            rules = rrule && rrule.rules,
            rulesLength = rules && rules.length;

        for (var i = 0; i < rulesLength; i++) {
            var rule = rules[i],
                ruleType = rule && rule.ruleType;

            if (ruleType == "BYDAY") {
                ruleValue = rule && rule.ruleValue;
                break;
            }
        }
        return ruleValue;
    },

    getByMonthdayRuleValues: function getByMonthdayRuleValues(rrule) {
        var ruleValue = [],
            rules = rrule && rrule.rules,
            rulesLength = rules && rules.length;

        for (var i = 0; i < rulesLength; i++) {
            var rule = rules[i],
                ruleType = rule && rule.ruleType;

            if (ruleType == "BYMONTHDAY") {
                ruleValue = rule && rule.ruleValue;
                break;
            }
        }
        return ruleValue;
    },

    addDayRuleValue: function addDayRuleValue(day) {
        var ruleValue = this.getBydayRuleValues(this.rrule);
        ruleValue.push({day: day});
    },

    removeDayRuleValue: function removeDayRuleValue(dayToRemove) {
        var ruleValue = this.getBydayRuleValues(this.rrule),
            ruleValueLength = ruleValue.length,
            removeIndex = -1;

        for (var i = 0; i < ruleValueLength; i++) {
            var val = ruleValue[i],
                day = val && val.day;
            if (day === dayToRemove) {
                removeIndex = i;
                break;
            }
        }

        ruleValue.splice(removeIndex, 1);
    },

    /*
     * Extracts the day values of a byday rule. Returns an object:
     * { days: [dayNum, ...], mandatory: dayNum }
     * mandatory = the day of week represented in currentDate, which should be either event.dtstart, or what will be event.dtstart if the user saves these changes.
     * days array will always contain at least the mandatory day
     *
     * NOTE: Format of an rrule:
     * "rrule": {
     *              "freq": "WEEKLY",
     *              "interval": 1,
     *              "rules": [{"ruleType": "BYDAY", "ruleValue": [{"day": 1},{"day": 3}]}],
     *              "until": <NULL>
     *           }
     */
    getBydayRuleDays  : function getBydayRuleDays() {
        //automatically include the start day of the event
        var eventStartDay = new Date(this.currentDate).getDay();
        var response = {days: [eventStartDay], mandatory: eventStartDay};
        var ruleValue = this.getBydayRuleValues(this.rrule);
        var ruleValueLength = ruleValue.length;

        for (var i = 0; i < ruleValueLength; i++) {
            var val = ruleValue [i],
                day = val && val.day;
            if (isFinite(day) && (day != eventStartDay)) {
                response.days.push(day);
            }

        }
        return response;
    },

    makeOrdDay: function makeOrdDay(ord, day) {
        var ordDay = {};
        isFinite(ord) && (ordDay.ord = ord);
        isFinite(day) && (ordDay.day = day);
        return ordDay;
    },

    addRule: function addRule(ruleType, dayOrdsList) {
        var rule = {ruleType: ruleType, ruleValue: dayOrdsList};
        !this.rrule.rules && (this.rrule.rules = []);
        this.rrule.rules.push(rule);
    }

});
