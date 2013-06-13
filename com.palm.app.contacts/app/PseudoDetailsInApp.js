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
/*global ContactsLib, enyo, console, crb, com, $contactsui_path, PalmSystem, window */

enyo.kind({
    name                 : "pseudoDetailsInApp",
    kind                 : "VFlexBox",
    className            : "enyo-bg",
    person               : null,
    showDone             : true,
    published            : {
        personId          : null,
        contact           : null,
        showButtonsHideBar: false
    },
    events               : {
        onEdit                    : "",
        onDone                    : "",
        onDoneCreatingPersonObject: ""
    },
    components           : [
        {kind: "PalmService", service: "palm://com.palm.applicationManager/", components: [
            {name: "launchApp", method: "launch"},
            {name: "openApp", method: "open"},
            {name: "getDefaultMapApp", method: "listAllHandlersForUrl"}
        ]},
        {kind: "DbService", components: [
            {name: "watchPerson", method: "find", dbKind: "com.palm.person:1", onSuccess: "personWatchFired", onWatch: "personWatchFired", subscribe: true, sortBy: "sortKey"}
        ]},
        {name: "AllDetails", className: "details", kind: "Scroller", horizontal: false, autoHorizontal: false, showing: false, flex: 1, components: [
            {kind: "Control", className: "container", components: [
                {kind: "Control", className: "content", components: [
                    {kind: "HFlexBox", className: "header", components: [
                        {name: "photo", kind: "Control", className: "avatar", components: [
                            {name: "photoImage", className: "img", kind: "Control"},
                            {kind: "Control", className: "mask"}
                        ]},
                        {kind: "Control", layoutKind: "VFlexLayout", flex: 1, pack: "justify", align: "end", components: [
                            {name: "favIndicator", kind: "Control", className: "favorite", onclick: "toggleFavorite"},
                            {kind: "Control", layoutKind: "VFlexLayout", className: "nameinfo", align: "start", components: [
                                {name: "title", className: "name"},
                                {name: "nickname", className: "nickname"},
                                {name: "desc", className: "position"}
                            ]},
                            {name      : "linkCounter", kind: "enyo.Button", toggling: true, caption: "", className: "enyo-button-light profiles-button",
                                onclick: "linkedProfilesClick", onmousedown: "photoMousedown", onmouseup: "photoMouseup"}
                        ]}
                    ]},
                    {name: "linkPanel", kind: "enyo.Drawer", open: false},
                    {name: "phoneGroup", kind: "com.palm.library.contactsui.FieldGroup", onFieldClick: "phoneFieldClick", onGetActionIcon: "phoneGetActionIcon", onActionIconClick: "phoneActionIconClick"},
                    {name: "emailGroup", kind: "com.palm.library.contactsui.FieldGroup", onFieldClick: "emailFieldClick"},
                    {name: "imGroup", kind: "com.palm.library.contactsui.FieldGroup", onFieldClick: "imFieldClick", onShowArrow: "showImDropdownArrow"},
                    {name: "addressGroup", kind: "com.palm.library.contactsui.FieldGroup", onGetFieldValue: "getAddressFieldValue", onFieldClick: "addressFieldClick"},
                    {name: "urlGroup", kind: "com.palm.library.contactsui.FieldGroup", onFieldClick: "urlFieldClick"},
                    {name: "notesGroup", kind: "com.palm.library.contactsui.FieldGroup", onGetFieldValue: "getNotesFieldValue"},
                    {name: "moreDetailsGroup", kind: "com.palm.library.contactsui.FieldGroup", propertyName: "moredetails", onGetFieldValue: "getMoreDetailsValue"}
                ]}
            ]}
//			{style: "height: 48px;"}
        ]},

        {name: "toolbar", kind: "Toolbar", className: "details-toolbar enyo-toolbar-light", showing: false, pack: "end", components: [
            {kind: "Control", className: "border"},
            {name: "doneButton", content: crb.$L("Done"), onclick: "doDone"},
//			{name: "favoriteBtn", icon: $contactsui_path + "/images/menu-icon-favorites.png", onclick: "toggleFavorite", showing: false},
//			{kind: "Control"},
//			{name: "shareButton", icon: $contactsui_path + "/images/btn_share.png", onclick: "sharePerson"},
            {name: "editButton", className: "edit-contact", icon: $contactsui_path + "/images/btn_edit.png", onclick: "editPerson"},
            {name: "addToContactButton", content: crb.$L("Add to contacts"), onclick: "addToContactClick"}
        ]},
        {name: "SelectAContact", kind: "VFlexBox", flex: 1, pack: "center", showing: true, className: "details-placeholder", style: "border-left:1px solid #a8a8a8;text-align: center; color: grey;", components: [
            {kind: "Spacer", flex: 5},
            {kind: "Image", src: "images/contacts-by-webos.png"},
//			{content: crb.$L("Select a contact on the left to see more information."), style: "width:250px;margin:0 auto;"},
            {kind: "Spacer", flex: 5}
        ]},
        {name  : "ButtonsWrapper", /*style: "position:relative",*/ components: [
            {kind: "Button", name: "addToNewButtonInline", caption: crb.$L("Add New Contact"), onclick: "addNewContactClick", showing: false},
            {kind: "Button", name: "addToExistingButtonInline", caption: crb.$L("Add To Existing"), onclick: "addToExistingClick", showing: false},
            {kind: "Button", name: "editButtonInline", caption: crb.$L("Edit Contact"), onclick: "editPerson", showing: false}
        ], flex: 1, kind: "VFlexBox", showing: false},
        {name: "skypeMenu", kind: "PopupSelect", width: (crb.$L("Video Call").length > 10 ? "160px" : "120px"), /*workaround to increase the popup width for non-english locales*/ onSelect: "onSkypeMenuSelect", onBeforeOpen: "onSkypeMenuBeforeOpen", onClose: "onSkypeMenuClose"}
    ],
    create               : function () {
        this.inherited(arguments);

        this.$.addToContactButton.hide();
        if (!this.showDone) {
            this.$.doneButton.hide();
        }

        if (this.showButtonsHideBar) { //shows either the chrome with buttons or inlines the buttons for in-dialog use. Triggered with this.showButtonsHideBar
            this.$.toolbar.hide();
            this.$.ButtonsWrapper.show();
        }

        this.personIdChanged(this.currentPersonLoadedId);
    },
    launchContacts       : function (params) {
        this.$.launchApp.call({
            id    : "com.palm.app.contacts",
            params: params
        });
    },
    addToContactClick    : function () {
        window.ContactsApplication.addNewContact(this.contact.getDBObject(), true);
    },
    addNewContactClick   : function (inSender) {
        window.ContactsApplication.addNewContact(this.contact.getDBObject());
    },
    addToExistingClick   : function (inSender) {
        window.ContactsApplication.addToExistingContact(this.person.getDBObject());
    },
    showDetails          : function (show) {
        this.$.AllDetails.setShowing(show);
        this.$.toolbar.setShowing(show);
        if (!show) {
            this.cancelWatch();
        }
        this.$.SelectAContact.setShowing(!show);
        this.$.AllDetails.scrollIntoView(0, 0); //autoscroll to top unconditionally (useful when person being looked at previously has a long profile and user scrolls out of the range of the first page.)
    },
    contactChanged       : function () {
        this.cancelWatch(); //cancels refresh watch if one exists on a given person
        if (!this.contact) {
            this.showDetails(false);
            this.person = null;
            this.personId = null;
            return;
        }

        if (!this.showButtonsHideBar) { //buttons on chrome mode
            this.$.addToContactButton.show();
            this.$.editButton.hide();
        } else { //inline buttons mode
            this.$.addToNewButtonInline.show();
            this.$.addToExistingButtonInline.show();
            this.$.editButtonInline.hide();
        }

        this.$.linkCounter.setDepressed(false);
        this._closeLinkPanel();

        this.person = ContactsLib.PersonFactory.createPersonDisplay(this.contact);
        this.personId = null;
        this.renderPerson();
    },
    personIdChanged      : function (inValue) {
        var personFuture;

        if (!this.showButtonsHideBar) { //buttons on chrome mode
            this.$.addToContactButton.hide();
            this.$.editButton.show();
        } else { //inline buttons mode
            this.$.addToNewButtonInline.hide();
            this.$.addToExistingButtonInline.hide();
            this.$.editButtonInline.show();
        }

        this.$.linkCounter.setDepressed(false);
        this._closeLinkPanel();

        if (!this.personId) {
            this.showDetails(false);
            return;
        }

        personFuture = ContactsLib.Person.getDisplayablePersonAndContactsById(this.personId);
        personFuture.then(this, function (personFuture) {
            this.log(" ENYO PERF: TRANSITION DONE time: " + Date.now());
            try {
                this.person = personFuture.result || {};
                this.cancelWatch();

                this.currentPersonLoadedId = this.person.getId() || null;
                if (this.currentPersonLoadedId) {
                    this.setupWatch();
                }

                this.renderPerson();  //TODO: move this back into try block
                if (enyo.windowParams && enyo.windowParams.launchType === "editContact") {
                    this.doDoneCreatingPersonObject();
                    enyo.windowParams = {}; //global
                }
            } catch (e) {
                enyo.log("person failed: " + e);
                this.showDetails(false);
                return;
            }
        });

    },
    setupWatch           : function () {
        this.cancelWatch();
        this.$.watchPerson.call({query: {from: "com.palm.person:1", where: [
            {prop: "_id", op: "=", val: this.currentPersonLoadedId}
        ]}});
        this.personWatch = true;
    },
    cancelWatch          : function () {
        if (this.personWatch) {
            this.$.watchPerson.cancel();
        }
    },
    personWatchFired     : function (inSender, inResult) {
        if ("fired" in inResult && inResult.fired === true) {
            this.personWatch = false;
            this.reloadPerson();
        } else if (!inResult || !(inResult.results) || !(inResult.results[0])) { //exists in db
            this.showDetails(false); //show details init screen
            this.cancelWatch();
        }
    },
    reloadPerson         : function () {
        this.personIdChanged(this.currentPersonLoadedId);
    },
    renderPerson         : function () {
        if (!this.person) {
            return;
        }

        var photoFuture;
        this.$.title.setContent(this.person.displayName);
        this.$.desc.setContent(this.person.workInfoLine);
        this.$.nickname.setContent(this.getNickName(this.person));
        this.renderLinkDetails();

        this.$.moreDetailsGroup.setFields(this.getMoreDetailsFields());
        this.$.emailGroup.setFields(this.person.getEmails().getArray());
        this.$.phoneGroup.setFields(this.person.getPhoneNumbers().getArray());
        this.$.imGroup.setFields(this.person.getIms().getArray());
        this.$.addressGroup.setFields(this.person.getAddresses().getArray());
        this.$.urlGroup.setFields(this.person.getUrls().getArray());
        this.$.notesGroup.setFields(this.addTypeToNotes(this.person.getNotes().getArray()));

        photoFuture = this.person.getPhotos().getPhotoPath(ContactsLib.PersonPhotos.TYPE.BIG);
        photoFuture.then(this, function () {
            this.$.photoImage.applyStyle("background-image", "url(" + photoFuture.result + ");");
        });

//		this.$.favoriteBtn.setState("down", this.person.isFavorite() ? true : false);
        this.$.favIndicator.addRemoveClass("true", this.person.isFavorite() ? true : false);
        this.showDetails(true);
    },
    addTypeToNotes       : function (array) {
        var i;
        for (i = 0; i < array.length; i += 1) {
            array[i].x_displayType = crb.$L("notes");
        }
        return array;
    },
    // returns the first one in the list that passes a truth test (iterator)
    detect               : function (obj, iterator) {
        var result,
            i;
        for (i in obj) {
            if (iterator.call(this, obj[i])) {
                result = obj[i];
                return result;
            }
        }
        return result;
    },
    getMoreDetailsFields : function () {
        var array = [],
        // Note: getDisplayValue relies on Mojo.Format which we are not importing therefore we are using Utils.formatBirthday as an alternative
            birthday = com.palm.library.contacts.Utils.formatBirthday(this.person.getBirthday()),
            relations = this.person.getRelations().getArray(),
            spouse = this.detect(relations, function (relation) {
                return relation.getType() === ContactsLib.Relation.TYPE.SPOUSE;
            }),
            child = this.detect(relations, function (relation) {
                return relation.getType() === ContactsLib.Relation.TYPE.CHILD;
            });

        if (birthday) {
            array.push({"value": birthday, "x_displayType": crb.$L("BIRTHDAY")});
        }
        if (spouse) {
            array.push({"value": spouse.getDisplayValue(), "x_displayType": crb.$L("SPOUSE")});
        }
        if (child) {
            array.push({"value": child.getDisplayValue(), "x_displayType": crb.$L("CHILDREN")});
        }
        return array;

    },
    getNickName          : function (inPerson) {
        return inPerson.getNickname().getDisplayValue() || "";
    },
    emailFieldClick      : function (inSender, inEvent, inField) {
        this.$.openApp.call(
            {
                target: "mailto:" + inSender.getFieldValue(inField)
            }
        );
    },
    onSkypeMenuSelect    : function (inSender, inSelected) {
        if (inSelected.getValue() === "CHAT") {
            this.$.openApp.call({
                id    : "com.palm.app.messaging",
                params: {
                    compose: {
                        personId: this.personId,
                        ims     : [inSelected.field.getDBObject()]
                    }
                }
            });
        }
        else if (inSelected.getValue() === "VOICE") {
            this.openPhoneApp(inSelected.inSender.getFieldValue(inSelected.field.getDBObject()), "com.palm.skype");
        }
        else if (inSelected.getValue() === "VIDEO") {
            this.openPhoneApp(inSelected.inSender.getFieldValue(inSelected.field.getDBObject()), "com.palm.skype", true);
        }
    },
    onSkypeMenuBeforeOpen: function () {
        this.$.skypeMenu.setItems(this.skypPopupItems);
    },
    onSkypeMenuClose     : function () {
        this.skypPopupItems = [];
    },

    openPhoneApp        : function (address, transport, video) {
        this.$.openApp.call({
            id    : "com.palm.app.phone",
            params: {
                address  : address,
                transport: transport,
                video    : video
            }
        });
    },
    phoneActionIconClick: function (inSender, inEvent, inField) {
        this.$.openApp.call(
            {
                id    : "com.palm.app.messaging",
                params: {
                    compose: {
                        personId    : this.personId,
                        phoneNumbers: [inField.getDBObject()]
                    }
                }
            }
        );
    },
    phoneGetActionIcon  : function () {
        return $contactsui_path + "/images/btn_sms.png";
    },
    phoneFieldClick     : function (inSender, inEvent, inField) {
        this.openPhoneApp(inSender.getFieldValue(inField), "com.palm.telephony");
    },
    showImDropdownArrow : function (inSender, inType) {
        return (inType === ContactsLib.IMAddress.TYPE.SKYPE);
    },
    imFieldClick        : function (inSender, inEvent, inField) {
        if (inSender.getFieldType(inField) === ContactsLib.IMAddress.TYPE.SKYPE) {
            // maxSkypeMenuXPosition is a work-around for DFISH-12977 (This should be handled by the fmwk)
            var deviceDetails = PalmSystem && JSON.parse(PalmSystem.deviceInfo),
                maxSkypeMenuXPosition,
                orientation;

            this.skypPopupItems = [
                {caption: crb.$L("Chat"), value: "CHAT", field: inField, inSender: inSender},
                {caption: crb.$L("Voice Call"), value: "VOICE", field: inField, inSender: inSender},
                {caption: crb.$L("Video Call"), value: "VIDEO", field: inField, inSender: inSender}
            ];

            if (deviceDetails) {
                orientation = enyo.getWindowOrientation();
                if (orientation === "up" || orientation === "down") {
                    maxSkypeMenuXPosition = deviceDetails.screenWidth - (parseInt(this.$.skypeMenu.width, 10) + 28);
                } else if (orientation === "left" || orientation === "right") {
                    maxSkypeMenuXPosition = deviceDetails.screenHeight - (parseInt(this.$.skypeMenu.width, 10) + 28);
                }
            }

            if (maxSkypeMenuXPosition && (inEvent.clientX > maxSkypeMenuXPosition)) {
                this.$.skypeMenu.openAt({left: maxSkypeMenuXPosition, top: inEvent.clientY});
            } else {
                this.$.skypeMenu.openAtEvent(inEvent);
            }

            return;
        }

        this.$.openApp.call(
            {
                id    : "com.palm.app.messaging",
                params: {
                    compose: {
                        personId: this.personId,
                        ims     : [inField.getDBObject()]
                    }
                }
            }
        );
    },
    getAddressFieldValue: function (inSender, inField) {
        return inField.getDisplayValue();
    },

    getNotesFieldValue   : function (inSender, inField) {
        // Don't call getDisplayValue since escaping of html & replacement of newlines to <br> tags is handled in the FieldGroup
        //return inField.getDisplayValue();
        return inField.getValue();
    },

    /*
     1. get maps app call: com.palm.applicationManager/listAllHandlersForUrl
     2. return: { "subscribed": false, "url": "mapto:", "returnValue": true, "redirectHandlers": { "activeHandler": { "url": "^mapto:", "appId": "com.palm.app.maps", "index": 24, "tag": "system-default", "schemeForm": true, "appName": "Google Maps" } } }
     3. default maps app call: {"id":"com.palm.app.maps","params":{"target":"maploc:666 HELL AVENUE, HELL, MD!!!!!"}
     */
    addressFieldClick    : function (inSender, inEvent, inField) {
        this.$.openApp.call(
            {id: "com.palm.app.maps", params: { //TODO: this will need to change in the future to the system default - goog maps or carrier gps nav app
                address: "" + inField.getDisplayValue()
            }}
        );
    },
    urlFieldClick        : function (inSender, inEvent, inField) {
        this.$.openApp.call(
            {id: "com.palm.app.browser", params: {
                url: inSender.getFieldValue(inField)
            }}
        );
    },
    editPerson           : function () {
        this.launchContacts(
            {
                contact   : this.person.getDBObject(),
                launchType: "editContact"
            }
        );

        this.doEdit();
    },
    toggleFavorite       : function () {
        this.personShouldBeFavorite = !this.person.isFavorite();

        //business logic that saves, changes appearance
//		this.$.favoriteBtn.setState("down", this.personShouldBeFavorite ? true : false);
        this.$.favIndicator.addRemoveClass("true", this.personShouldBeFavorite ? true : false);
        if (this.personShouldBeFavorite) {
            this.person.makeFavorite();
        } else {
            this.person.unfavorite();
        }

    },
    createContactDisplay : function () {
        return ContactsLib.ContactFactory.createContactDisplay();
    },
    _closeLinkPanel      : function () {
        // This is needed since there is a timing issue when a user udpates a person and if they trigger linkedProfilesClick around
        // the same time "this.$.linkPanel.setOpen(false);" is called, then the drawer doesn open up properly.  By setting the 'animate'
        // property to false before setting open to false, the drawer toggling issue seems to be greatly reduced.
        this.$.linkPanel.setAnimate(false);
        this.$.linkPanel.setOpen(false);
        this.$.linkPanel.setAnimate(true);
    },

    // These are "overridden" by the Details scene
    photoMousedown       : function () {
    },
    photoMouseup         : function () {
    },
    linkContact          : function (inPerson) {
    },
    linkedContactsChanged: function (inSender, inPerson) {
    },
    linkedProfilesClick  : function () {
    },
    renderLinkDetails    : function () {
        this.$.linkCounter.setShowing(false);
    }
});
