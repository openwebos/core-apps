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
/*global Foundations, PalmCall, Future, _, ContactsLib, document, enyo, console, AccountsList, $L */

enyo.kind({
    name                  : "LinkDetails",
    kind                  : "VFlexBox",
    published             : {
        person: null
    },
    events                : {
        onLinkProfilesTap    : "",
        onLinkProfilesChanged: ""
    },
    components            : [
        {name: "links", className: "profiles", kind: "VFlexBox", components: []},

        {name: "alertDialog", scrim: true, modal: true, kind: "Popup", components: [
            {name: "title", content: "", style: "padding:0 0 10px"},
            {name: "unlinkContactButton", kind: "Button", caption: $L("Unlink this profile"), onclick: "unlinkAction", className: "enyo-button-dark"},
            {name: "makePrimaryButton", kind: "Button", caption: $L("Set as primary profile"), onclick: "makePrimaryAction"},
            {name: "deleteProfileButton", kind: "Button", caption: $L("Delete this profile"), onclick: "deleteProfileAction", className: "enyo-button-negative"},
            {kind: "Button", className: "enyo-button-light", caption: $L("Cancel"), onclick: "cancelAction"}
        ]}
    ],
    personChanged         : function () {
        this.renderLinks();
    },
    handleLinkedContactTap: function (inSender, inResponse) {
        var isReadOnly,
            isPrimary,
            contactIdsArray;

        if (this.person.getContacts().length < 2) {
            return;
        }
        this.$.alertDialog.validateComponents();
        this.$.title.setContent(inSender.contact.displayName);

        contactIdsArray = this.person.getContactIds().getArray();
        // Hide the set as primary if it is already the primary
        isPrimary = (contactIdsArray[0].getValue() === inSender.contact.getId());
        this.$.makePrimaryButton.setShowing(!isPrimary);

        // Hide delete profile option if the contact is read only
        isReadOnly = AccountsList.isContactReadOnly(inSender.contact);
        this.$.deleteProfileButton.setShowing(!isReadOnly);

        this.$.alertDialog.contact = inSender.contact;
        this.$.alertDialog.openAtCenter();
    },
    renderLinks           : function () {
        var future,
            that = this;
        this.$.links.destroyControls();

        future = ContactsLib.ContactPhoto.attachPhotoPathsToContacts(this.person.getContacts(), ContactsLib.ContactPhoto.TYPE.SQUARE, "drawerPhotoPath");
        future.then(this, function () {

            this.person.getContacts().forEach(function (contact) {
                var iconPath = AccountsList.getAccountIcon(contact.getAccountId().getValue(), contact.getKindName(true));
                that.$.links.createComponent(
                    {kind: "Pushable", components: [
                        {kind: "Item", layoutKind: "HFlexLayout", pack: "justify", align: "center", contact: contact, onclick: "handleLinkedContactTap", components: [
                            {className: "icon", components: [
                                {name: "linkedPhoto", kind: "Control", className: "img"},
                                {kind: "Control", className: "mask"}
                            ]},
                            {content: enyo.string.escapeHtml(contact.displayName), flex: 1},
                            {kind: "Image", src: iconPath, className: "service-icon"}
                        ]}
                    ]}, {owner: that, contactId: contact.getId() });
                that.$.linkedPhoto.setStyle("background-image: url(" + contact.drawerPhotoPath + ");", contact.drawerPhotoPath);
            });
            this.$.links.createComponent(
                {kind: "Pushable", components: [
                    {kind: "Item", layoutKind: "HFlexLayout", align: "center", onclick: "doLinkProfilesTap", components: [
                        {content: $L("Link more profiles...")}
                    ]}
                ]}, {owner: this});
            this.$.links.render();
            this.$.links.contentChanged();
        });
    },
    cancelAction          : function (inSender) {
        this.$.alertDialog.toggleOpen();
    },
    unlinkAction          : function (inSender) {
        var future,
            contact = this.$.alertDialog.contact;

        future = ContactsLib.Person.manualUnlink(this.person.getId(), contact.getId());
        future.then(this, function (future) {
            future.result = true;
            this.doLinkProfilesChanged();
        });

        this.$.alertDialog.toggleOpen();
    },
    makePrimaryAction     : function (inSender) {
        var future,
            foundPrimary,
            contact = this.$.alertDialog.contact;

        foundPrimary = this.person.setContactWithIdAsPrimary(contact.getId());
        if (foundPrimary) {
            future = this.person.fixup();
            future.then(this, function (future) {
                return this.person.save();
            });

            future.then(this, function () {
                future.result = true;
                this.doLinkProfilesChanged();
            });
        }

        this.$.alertDialog.toggleOpen();
    },
    deleteProfileAction   : function (inSender) {
        var future,
            contact = this.$.alertDialog.contact;

        future = contact.deleteContact();
        future.then(this, function () {
            future.result = true;
            this.doLinkProfilesChanged();
        });

        this.$.alertDialog.toggleOpen();
    },
    handleParentScrolling : function () {
        this.$.links.broadcastMessage("mouseup");
    }
});
