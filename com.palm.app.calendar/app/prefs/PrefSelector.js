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


// TODO: Support dynamic schema.

/*global enyo Utilities */

enyo.kind(
    {    name: "calendar.prefs.PrefSelector",
        kind : enyo.Control,

        events: {
            onChange: ""
        },

        published: {
            label: "",
            pref : undefined,
            prefs: null
        },

        components: [
            {kind: enyo.ListSelector, onChange: "selectorChangeHandler"}
        ],

        create: function create() {
            this.inherited(arguments);
            var enyoApp = enyo.application;
            this.prefsManager = enyoApp.prefsManager;
            this.labelChanged();
            this.prefChanged();

            enyoApp.watch({prefs: this}, {newOnly: true});	// We only need this for future updates (i.e. database changes) so we set newOnly: true.
        },

        destroy: function destroy() {
            enyo.application.ignore({prefs: this});
            this.inherited(arguments);
        },

// BEGIN :-------: Published Property Handlers :--------------------------------------------------------------------------------------------------------------//

        labelChanged: function labelChanged(oldLabel) {
            this.$.listSelector.setLabel(this.label);	// Quick pass through
        },

        prefChanged: function prefChanged(oldPref) {
            var pref = this.pref,
                prefsManager = this.prefsManager,
                schema = pref && prefsManager.schema[pref];

            if (!pref || !schema || pref === oldPref) {    // Skip out early if we can.
                DEBUG && this.error("Not updating pref selector: ", (!pref ? "Pref not set or invalid." : ""), (!schema ? "Schema not set or invalid." : ""), (pref === oldPref ? "Pref already set." : ""));
                return;
            }

            // NOTE: May want to support different schema source types.  For now, we only support static schema.
            var items = Utilities.deepCloneObject(schema),
                method = Utilities.getSetterGetterMethod(pref, "get")
            ui = this.$;

            if (items && prefsManager[method]) {
                ui.listSelector.setItems(items);
                ui.listSelector.setValue(prefsManager[method]());
            }
        },

        prefsChanged: function prefsChanged(oldPrefs) {
            var pref = this.pref;
            if (!pref) {
                DEBUG && this.error("Attempted to update a pref selector with an invalid pref.");
                return;
            }

            var method = Utilities.getSetterGetterMethod(pref, "get");
            this.prefsManager[method] && this.$.listSelector.setValue(this.prefsManager[method]());
        },

// BEGIN :-------: Custom Methods :---------------------------------------------------------------------------------------------------------------------------//

        selectorChangeHandler: function changeHandler(inSender, inNewValue, inOldValue) {
            var pref = this.pref;
            if (!pref) {
                DEBUG && this.error("Attempted to update a pref selector with an invalid pref.");
                return;
            }

            var method = Utilities.getSetterGetterMethod(pref, "set");
            this.prefsManager[method] && this.prefsManager[method](inNewValue);

            this.doChange(inNewValue, inOldValue);
        }
    });