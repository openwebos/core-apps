// LICENSE@@@
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
// @@@LICENSE

/*jslint white: true, onevar: true, undef: true, eqeqeq: true, plusplus: true, bitwise: true,
 regexp: true, newcap: true, immed: true, nomen: false, maxerr: 500 */
/*global ContactsLib, document, Foundations, enyo, crb*/


enyo.kind({
    name : "PeoplePickerApp",
    kind : "VFlexBox",
    style: "background-color: #ccc;",

    published : {
        exclusions         : [],
        mode               : "noFilter",
        showSearchBar      : true,
        showIMStatuses     : true,
        showFavStars       : true,
        enableGAL          : false,
        dialogMode         : "peoplePicker",
        enableFavoriting   : false,
        listIndexForDefault: null,
        contactPointTypes  : [],
        autoClose          : false
    },
    events    : {
    },
    components: [
        {kind: "Pane", height: "260px", layoutKind: "VFlexLayout", className: "group", components: [
            {name: "listWrapper", flex: 1, style: "margin: -6px -6px 0px;", components: [], tapHighlight: true, kind: "VFlexBox"},
            {name: "cppWrapper", flex: 1, style: "margin: -6px -6px 0px;", components: [], kind: "VFlexBox"}
        ]},
        {kind: "Button", caption: crb.$L("Cancel"), onclick: "_cancelClick"},
        {kind: "CrossAppResult", name: "crossAppResult"},
        {kind: "ApplicationEvents", onUnload: "_unloadHandler", onWindowParamsChange: "_messageReceived"}
    ],
    create    : function () {
        var parameter,
            index;
        this.inherited(arguments);
        this.params = enyo.windowParams;

        for (parameter in this.params) {
            this[parameter] = this.params[parameter];
        }

        for (index = 0; index < this.contactPointTypes.length; index++) { //turn user-specified strings into contacts library constants
            if (this.contactPointTypes[index] === "EmailAddress") {
                this.contactPointTypes[index] = ContactsLib.ContactPointTypes.EmailAddress;
            } else if (this.contactPointTypes[index] === "IMAddress") {
                this.contactPointTypes[index] = ContactsLib.ContactPointTypes.IMAddress;
            } else if (this.contactPointTypes[index] === "PhoneNumber") {
                this.contactPointTypes[index] = ContactsLib.ContactPointTypes.PhoneNumber;
            } else {
                this.contactPointTypes.splice(index, 1); //remove element if it is of unknown type
            }
        }

        this.$.listWrapper.createComponent({kind: "com.palm.library.contactsui.personListWidget",
            name                                : "personListWidget",
            width                               : "280px",
            flex                                : 1,
            mode                                : this.mode,
            showSearchBar                       : this.showSearchBar,
            showAddButton                       : false,
            onContactClick                      : "_contactClick",
            onListUpdated                       : "_sendListUpdatedEvent",
            onAddClick                          : enyo.nop,
            onSearchCriteriaUpdated             : "_sendSearchUpdatedEvent",
            onSearchCriteriaCleared             : "_sendSearchClearedEvent",
            showIMStatuses                      : this.showIMStatuses,
            showFavStars                        : this.showFavStars,
            enableGAL                           : this.enableGAL,
            favoritingAppId                     : this.favoritingAppId,
            owner                               : this
        });

        this.$.cppWrapper.createComponent({kind: "com.palm.library.contactsui.contactPointPickerList",
            name                               : "ContactPointPicker",
            flex                               : 1,
            saveSelectionAsPrimary             : this.enableFavoriting,
            listIndexForDefault                : this.listIndexForDefault,
            onContactPointClick                : "_sendContactPointClickEvent",
            onRendered                         : "_showCPP",
            favoritingAppId                    : this.favoritingAppId,
            owner                              : this
        });
    },

    ready: function () {
        if (this.dialogMode === "combined" || this.dialogMode === "peoplePicker") {
            this.$.pane.selectViewByName("listWrapper");
        } else if (this.dialogMode === "contactPointPicker") {
            this.$.pane.selectViewByName("cppWrapper");
        }

        this.$.personListWidget.punt();
        if (this.exclusions && typeof(this.exclusions) === "array") {
            this.$.personListWidget.setExclusions = this.exclusions;
        }
    },

    lookupContactPointsByPersonId: function (personId) {
        this.$.pane.selectViewByName("cppWrapper");
        this.$.ContactPointPicker.lookupByPersonId(personId, this.contactPointTypes);
    },
    setExclusions                : function (exclusions) {
        this.$.personListWidget.setExclusions(exclusions);
    },
    clearSearchField             : function () {
        this.$.personListWidget.clearSearchField();
    },
    _unloadHandler               : function (e) {
        // Destroy component tree on window unload, so we can rely on destructors for cleanup.
        this.destroy();
    },
    _showCPP                     : function (sender, numContactPoints) {
        if (numContactPoints > 0) {
            this.$.pane.selectViewByName("cppWrapper");
        }
    },
    _messageReceived             : function (inSender) {
        if (enyo.windowParams.action) {
            if (enyo.windowsParams.action === "lookupContactPointsByPersonId") {
                this.lookupContactPointsByPersonId(enyo.windowParams.personId);
            } else if (enyo.windowParams.action === "setExclusions") {
                this.setExclusions(enyo.windowParams.exclusionsArray);
            } else if (enyo.windowParams.action === "clearSearchField") {
                this.clearSearchField();
            }
        }
    },
    _contactClick                : function (inSender, inParams) {
        if (this.enableFavoriting === true) {
            ContactsLib.PersonFactory.createPersonDisplay(inParams).makeFavorite();
        }
        if (this.dialogMode === "combined") {
            this.$.ContactPointPicker.lookupByPersonId(inParams._id, this.contactPointTypes);
        }
        this.$.crossAppResult.sendResult({"event": "contactClick", value: inParams});
    },
    _cancelClick                 : function () {
        this.$.crossAppResult.sendResult({"event": "cancelClick", value: ""});
    },
    _sendListUpdatedEvent        : function () {
        this.$.crossAppResult.sendResult({"event": "listUpdated", value: ""});
    },
    _sendSearchUpdatedEvent      : function () {
        this.$.crossAppResult.sendResult({"event": "searchUpdated", value: ""});
    },
    _sendSearchClearedEvent      : function () {
        this.$.crossAppResult.sendResult({"event": "searchCleared", value: ""});
    },
    _sendContactPointClickEvent  : function (inSender, inParams) {
        this.$.crossAppResult.sendResult({"event": "contactPointClick", value: inParams});
    }
});
