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


/*global enyo */

/**
 NOTE: DateHeader is the visual, formatted representation of a view's date.
 TODO: For some reason, on device the header isn't notified of a resize event when an adjacent item's showing is changed.
 In this case, force a reset by calling checkFormatFit().
 TODO: This should have some sort of "defaultFormat" published property.
 TODO: May want to use an array of formats in some sort order for resizing.
 */
enyo.kind({
    name       : "calendar.DateHeader",
    kind       : enyo.HFlexBox,
    timeMachine: new Date(),
    published  : {
        date    : null, // Date     : This view's date.
        duration: 0,    // int		: Number of days from start date (specify for a duration header).
        fit     : true, // boolean	: Enable auto-fitting.
        format  : null, // string	: Currently displaying format (see formats property above).
        formats : null  // object	: Formats object consisting of "short" and "full" properties that are date formatters.
    },
    components : [
// TODO: The dateHighlight section below is for a bolded portion of the date.  This
// isn't currently handled and could be when we break up the date into usable parts.
//		{name:"dateHighlight"	, className:"date-highlight"},
        {name: "dateNormal", className: "date-normal"},
        {kind: enyo.Spacer}
    ],

    render: function render() {
        var ui = this.$,
            date = this.date,
            duration = this.duration,
            format = this.format;

        if (!date) {                // Need at least a date at minimum to render.
            return;
        }

        if (!format) {
            this.formatChanged();	// Need to at least set a default format before rendering.
            return;
        }

        var formatter = this.formats && this.formats[format];

        if (format) {                // We only need to do this if the format was found.
            var headerString;

            if (duration) {
                var startDate = (this.timeMachine.setTime(+date), this.timeMachine),
                    endDate = new Date(+startDate);

                endDate.addDays(duration);
                headerString = formatter.formatRange(startDate, endDate);
            } else {
                headerString = formatter.format(date)
            }
            DEBUG && this.log("Generated string:", headerString, "The date:", date);
            ui.dateNormal.setContent(headerString);
        }
        this.inherited(arguments);
    },

    rendered: function rendered() {
        this.inherited(arguments);
        if (this.fit) {
            this.checkFormatFit();
        }
    },

// BEGIN :-------: Framework Handlers :-----------------------------------------------------------------------------------------------------------------------//

    resizeHandler: function resizeHandler(from, domEvent) {
        DEBUG && this.log("======= RESIZED\t");
        this.inherited(arguments);
        this.render();
    },

// BEGIN :-------: Published Property Handlers :--------------------------------------------------------------------------------------------------------------//

    formatChanged: function formatChanged(oldFormat) {
        var format = this.format;

        if (!format || format != oldFormat) {
            !format && (format = this.format = "full");	// Set the default format if not already set
            DEBUG && this.log("Format changed:", format);
            this.render();
        }
    },

    // TODO: Potentially build a formatsChanged method here

    dateChanged: function dateChanged(oldDate) {
        var date = this.date;
        if (!date) {
            DEBUG && this.log("No date set.");
            return;
        }
        if (!oldDate || +date != +oldDate) {
            DEBUG && this.log("Date changed:", this.date);
            this.shortWidth = null;
            this.fullWidth = null;
            this.setFormat(null);
        }
    },

    durationChanged: function durationChanged(oldDuration) {
        if (!oldDuration || this.duration != oldDuration) {
            DEBUG && this.log("Duration changed:", this.duration);
            this.shortWidth = null;
            this.fullWidth = null;
            this.setFormat(null);
        }
    },

// BEGIN :-------: Custom Methods :---------------------------------------------------------------------------------------------------------------------------//

    checkFormatFit: function checkFormatFit() {    // TODO: Check for more perf optimizations (eg. better caching, perhaps)
        var dateNode = this.$.dateNormal.hasNode(),
            dateStyle = dateNode && enyo.dom.getComputedStyle(dateNode),
            dateWidth = dateStyle && (      // NOTE: Add in more styles as needed here (margin, border, etc)
                parseInt(dateStyle.getPropertyValue("width"))
                ) || 0,
            dateWidthChanged = false,
            headerNode = this.hasNode(),
            headerStyle = headerNode && enyo.dom.getComputedStyle(headerNode),
            headerWidth = headerStyle && (  // NOTE: Add in more styles as needed here (margin, border, etc)
                parseInt(headerStyle.getPropertyValue("width"))
                ) || 0,
            headerWidthChanged = false,
            format = this.format;

        if (!this.headerWidth || this.headerWidth != headerWidth) {
            this.headerWidth = headerWidth;
            headerWidthChanged = true;
        }

        if (!this[format + "Width"] || this[format + "Width"] != dateWidth) {
            this[format + "Width"] = dateWidth;		// Cache the date width
            dateWidthChanged = true;
        }

        if (headerWidthChanged || dateWidthChanged) {
            DEBUG && headerWidth && this.log("Date Width:", dateWidth, "Header width:", headerWidth);

            if ((dateWidth && (dateWidth > headerWidth)) || (this.fullWidth && this.fullWidth > headerWidth)) {
                DEBUG && this.log("Short header.");
                this.setFormat("short");
            } else {
                DEBUG && this.log("Full header.");
                this.setFormat("full");
            }
        }
    }
});
