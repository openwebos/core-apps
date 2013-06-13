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


/*global enyo */

/*	NOTE: Accepts formatter param objects in the below format:
 {	name	: string	// The name of the formatter, used as a key for lookup/creation purposes
 type	: string	// The formatter type (ie. enyo.g11n._DateFmt_).  Default: DateFmt
 params	: object	// Param object to pass to formatter during creation.
 }

 - Also can accept a collection of the above objects using setFormatters for bulk setting of formatters.
 Keep in mind that these are *NOT* screened for needed properties.
 {	LongDate: {	name: LongDate, type: DateFmt, params: ... },
 ...
 }

 TODO: Make this more generic and usable across the app!
 */
enyo.kind({
    name     : "calendar.FormatterCache",
    kind     : enyo.Component,
    events   : {
        onFormatsChanged: ""
    },
    published: {
        formats: null
    },
    defaults : {
        type: "DateFmt"
    },

    create: function create() {
        this.inherited(arguments);
    },

    destroy: function destroy() {
        this.inherited(arguments);
    },

    formatsChanged: function formatsChanged() {
        this.formatters = null;
        this.doFormatsChanged();
    },

    validateProps: function validateProps(format) {
        if (!format || typeof format != "object" || ("type" in format && !enyo.g11n[format.type])) {
            return false;
        }
        return true;
    },

    addFormat: function addFormat(name, format) {
        if (!name || !this.validateProps(format)) {
            return;
        }

        // Remove remnants of formatters with the same name
        this.removeFormat(name);

        var formats = this.formats;
        !formats && (formats = this.formats = {});

        formats[name] = format;
    },

    getFormatter: function getFormatter(name, refresh) {
        if (!name) {
            return;
        }

        var formats = this.formats,
            format = formats && formats[name];

        if (!format) {
            return;
        }

        var formatters = this.formatters;
        !formatters && (formatters = this.formatters = {});

        return (!refresh && formatters[name]) || (formatters[name] = new enyo.g11n[format.type || this.defaults.type](format));
    },

    removeFormat: function removeFormat(name) {
        if (!name) {
            return;
        }
        var formats = this.formats,
            formatters = this.formatters;
        formats && formats[name] && (delete formats[name]);
        formatters && formatters[name] && (delete formatters[name]);
    }
});
