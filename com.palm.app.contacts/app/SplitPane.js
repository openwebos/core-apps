// LICENSE@@@
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
// @@@LICENSE

/*jslint white: true, onevar: true, undef: true, eqeqeq: true, plusplus: true, bitwise: true,
 regexp: true, newcap: true, immed: true, nomen: false, maxerr: 500 */
/*global _, ContactsLib, document, enyo, console, $L, GALHelper */

enyo.kind({
    name                  : "SplitPane",
    kind                  : "HFlexBox",
    className             : "enyo-bg",
    events                : {
        onListAddClick                   : "",
        onListUpdated                    : "",
        onDetailsEdit                    : "",
        onDetailsLinkProfilesTap         : "",
        onDetailsDoneCreatingPersonObject: "",
        onAddFavoriteClick               : ""
    },
    components            : [
        {name: "left", kind: "HFlexBox", width: "320px", className: "enyo-bg leftpane", height: "100%", components: [
            {name         : "contacts", kind: "com.palm.library.contactsui.personListWidget", flex: 1, width: "100%", height: "100%", onContactClick: "contactClick", onAddClick: "doListAddClick", onListUpdated: "doListUpdated",
                showToggle: true, showSearchBar: true, showAddButton: true, onSearchCriteriaUpdated: "searchCriteriaUpdated", onSearchCriteriaCleared: enyo.nop, showIMStatuses: true, showFavStars: true,
                mode      : "noFilter", enableGAL: false, resizeOnSearchFocus: false, onAddFavoriteClick: "doAddFavoriteClick"}
        ]},
        {name: "pane", kind: "Pane", flex: 1, transitionKind: "enyo.transitions.Simple", onCreateView: "paneAddView", components: [
            {name: "details", kind: "Details", flex: 1, onEdit: "doDetailsEdit", onLinkProfilesTap: "doDetailsLinkProfilesTap", onLinkProfilesChanged: "onLinkProfilesChanged", onDoneCreatingPersonObject: "doDetailsContinueCrossLaunch"}
        ]}
    ],
    create                : function () {
        this.inherited(arguments);
    },
    enableListButtons     : function (state) {
        this.$.contacts.enableButtons(state);
    },
    puntList              : function () {
        this.$.contacts.punt();
    },
    resetList             : function () {
        this.$.contacts.reset();
    },
    setPersonId           : function (inPersonId) {
        this.$.details.setPersonId(inPersonId);
    },
    setContact            : function (inPerson) {
        if (inPerson && inPerson.isGAL === true) {
            inPerson = GALHelper.makeContact(inPerson);
        }
        this.$.details.setContact(inPerson);
    },
    selectViewByName      : function (name) {
        this.$.pane.selectViewByName(name);
    },
    selectContact         : function (inPersonId) {
        this.$.contacts.selectContact(inPersonId);
    },
    getDetailsViewPersonId: function () {
        return this.$.details.personId;
    },
    reloadPerson          : function () {
        this.$.details.reloadPerson();
    },
    editPerson            : function () {
        this.$.details.editPerson();
    },
    linkContact           : function (inPerson) {
        this.$.details.linkContact(inPerson);
    },
    setEditButtonDisabled : function (state) {
        this.$.details.setEditButtonDisabled(state);
    },
    contactClick          : function (inSender, inPerson) {
        this.log(" ENYO PERF: TRANSITION START time: " + Date.now());
        // Don't call showPerson since it calls selectContact which is not needed in the case of onclick
        if (inPerson._id) {
            this.$.details.setPersonId(inPerson._id);
        } else {
            this.setContact(inPerson);
        }
    },
    showPerson            : function (inSender, inPersonId, inPerson) {
        if (inPersonId) {
            this.$.details.setPersonId(inPersonId);
        } else {
            this.setContact(inPerson);
        }
        if (inPersonId) {
            this.$.contacts.selectContact(inPersonId);
        }
    },
    searchCriteriaUpdated : function (inSender) {
        if (this.ignoreSearchCriteriaUpdate !== true) {
            this.$.details.setPersonId("");
        } else {
            this.reloadPerson();
            this.ignoreSearchCriteriaUpdate = false;
        }
    },
    onLinkProfilesChanged : function (inSender) {
        if (this.$.contacts.$.searchField.getValue()) {
            this.ignoreSearchCriteriaUpdate = true;
            this.$.contacts.filterList(inSender);
        } else {
            this.$.contacts.$.list.$.personList.reset();
        }
    }
});
