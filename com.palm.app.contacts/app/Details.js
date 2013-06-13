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
/*global _, ContactsLib, document, enyo, console, $L */

enyo.kind({
    name                 : "Details",
    kind                 : "pseudoDetailsInApp",
    showDone             : false,
    className            : "enyo-bg",
    events               : {
        onEdit               : "",
        onLinkProfilesTap    : "",
        onLinkProfilesChanged: ""
    },
    renderLinkDetails    : function () {
        this.$.linkCounter.setShowing(this.person.contactCount > 0); // This can only be false (this.person.contactCount = 0) for a GAL person

        var cnt = this.person.contactCount,
            t = new enyo.g11n.Template($L("1#1 profile|1>##{num} linked profiles")),
            str = t.formatChoice(cnt, {num: cnt});

        this.$.linkCounter.setContent(str);
        this.$.linkDetails.setPerson(this.person);
    },
    linkedProfilesClick  : function () {
        this.$.linkPanel.toggleOpen();
        this.$.linkCounter.addRemoveClass("enyo-button-held", this.$.linkPanel.getOpen());
    },
    linkedContactsChanged: function (inSender, inPerson) {
        this.setPerson(inPerson);
    },
    linkContact          : function (inPerson) {
        ContactsLib.Person.manualLink(this.person.getId(), inPerson._id).then(this, function (future) {
            this.doLinkProfilesChanged();
        });

    },
    create               : function () {
        this.inherited(arguments);

        this.$.linkPanel.createComponent(
            {name: "linkDetails", kind: "LinkDetails", onLinkProfilesTap: "doLinkProfilesTap", onLinkProfilesChanged: "doLinkProfilesChanged", owner: this}
        );

        this.$.AllDetails.onScroll = "onAllDetailsScroll";
    },
    photoMousedown       : function () {
        //	this.$.photo.addRemoveClass("selected", true);
    },
    photoMouseup         : function () {
        //	this.$.photo.addRemoveClass("selected", false);
    },
    editPerson           : function () {
        this.doEdit(this.person);
    },
    setEditButtonDisabled: function (inDisable) {
        this.$.editButton.setDisabled(inDisable);
    },
    onAllDetailsScroll   : function (inSender) {
        this.$.linkDetails.handleParentScrolling();
    }
});
