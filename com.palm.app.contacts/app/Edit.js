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
/*global Foundations, PalmCall, Future, _, ContactsLib, document, enyo, console, AccountsList, $L, DefaultAccountId, com, Edit */

enyo.kind({
    name                           : "Edit",
    kind                           : "VFlexBox",
    className                      : "edit",
    primaryContact                 : null,
    linkedContacts                 : null,
    newPerson                      : false,
    newPersonIsDirty               : false,
    singleItemAccountChoices       : [],
    groupItemAccountChoices        : [],
    addingNewContactsToPerson      : false,
    published                      : {
        person        : null,
        transactionMgr: undefined
    },
    events                         : {
        onShowPerson   : "",
        onShowRingtones: "",
        onExit         : ""
    },
    statics                        : {
        Action: {
            CANCELLED: 0,
            UPDATED  : 1,
            INSERTED : 2,
            DELETED  : 3
        }
    },
    components                     : [
        {kind: "Toolbar", className: "enyo-toolbar-light edit-toolbar", layoutKind: "HFlexLayout", pack: "justify", components: [
            {kind: "Spacer"},
            {name: "heading", kind: "Control"},
            {kind: "Spacer"},
            {name: "accountPicker", kind: enyo.ListSelector, className: "enyo-button switch-account", value: null, onChange: "accountSelected", items: [], hideItem: true, hideArrow: false, components: [
                {kind: enyo.Image, name: "accountPickerIcon"}
            ]}
        ]},
        {name: "EditDetails", kind: "Scroller", width: "100%", flex: 1, horizontal: false, autoHorizontal: false, components: [
            {kind: "HFlexBox", pack: "center", components: [
                {kind: "Control", style: "width:700px;padding:20px 0;", components: [
                    {kind: "HFlexBox", align: "start", pack: "start", components: [
                        {className: "avatar", components: [
                            {name: "photoImage", className: "img", kind: "Control"},
                            {className: "mask"},
                            {name: "changeButton", kind: "IconButton", className: "change enyo-button-light", onclick: "photoTap", icon: "images/btn_edit.png"}
                        ]},
                        {name: "groupContainingName", kind: "RowGroup", flex: 1, components: [
                            {name: "nameField", kind: "EditableField", className: "edit-top-item", propertyName: "name", hint: $L("Name"), autoCapitalize: "title", autocorrect: false, onGetFieldValue: "getNameFieldValue", onUpdateField: "updateNameField", components: [
                                {className: "field-button", style: "margin-right:8px", components: [ //addClass('true') would be good
                                    {className: "field-button-inner favorite", kind: "Control", name: "favIndicator", onclick: "toggleFavorite"}
                                ]},
                                {className: "field-button", components: [
                                    {className: "field-button-inner prefix", kind: "Control", onclick: "openNameDetails", onmousedown: "nameFieldButtonOnMouseDown"}
                                ]}
                            ]},
                            {name: "namePrefixField", kind: "EditableField", className: "edit-item", propertyName: "", hint: $L("Prefix"), autocorrect: false, onGetFieldValue: "getNamePrefixFieldValue", onUpdateField: "updateNamePrefixField", components: [
                                {className: "field-button", onclick: "closeNameDetails", components: [
                                    {className: "field-button-inner prefix", onmousedown: "namePrefixFieldButtonOnMouseDown"}
                                ]}
                            ]},
                            {name: "nameFirstNameField", kind: "EditableField", className: "edit-item", propertyName: "", hint: $L("First Name"), autocorrect: false, onGetFieldValue: "getNameFirstNameFieldValue", onUpdateField: "updateNameFirstNameField"},
                            {name: "nameMiddleNameField", kind: "EditableField", className: "edit-item", propertyName: "", hint: $L("Middle Name"), autocorrect: false, onGetFieldValue: "getNameMiddleNameFieldValue", onUpdateField: "updateNameMiddleNameField"},
                            {name: "nameLastNameField", kind: "EditableField", className: "edit-item", propertyName: "", hint: $L("Last Name"), autocorrect: false, onGetFieldValue: "getNameLastNameFieldValue", onUpdateField: "updateNameLastNameField"},
                            {name: "nameSuffixField", kind: "EditableField", className: "edit-item", propertyName: "", hint: $L("Suffix"), autocorrect: false, onGetFieldValue: "getNameSuffixFieldValue", onUpdateField: "updateNameSuffixField"},

                            {name: "nicknameField", kind: "EditableField", className: "edit-item", propertyName: "", hint: $L("Nickname"), autocorrect: false, onGetFieldValue: "getNicknameFieldValue", onUpdateField: "updateNicknameField"},
                            {name: "titleField", kind: "EditableField", className: "edit-item", propertyName: "title", hint: $L("Job Title"), autocorrect: false, onGetFieldValue: "getTitleFieldValue", onUpdateField: "updateTitleField"},
                            {name: "companyField", kind: "EditableField", className: "edit-item", propertyName: "organization", hint: $L("Company"), autocorrect: false, onGetFieldValue: "getCompanyFieldValue", onUpdateField: "updateCompanyField"}

                        ]}
                    ]},
                    {name: "phoneGroup", kind: "EditableGroup", propertyName: "phoneNumbers", onGetFieldObject: "getPhoneFieldObject", onGetFieldTypeOptions: "getPhoneFieldTypeOptions",
                        onMakeNewItem: "makeNewPhoneNumber", hint: $L("New Phone Number"), onFormat: "phoneNumberFormat"},
                    {name: "emailGroup", kind: "EditableGroup", propertyName: "emails", onGetFieldObject: "getEmailFieldObject", onGetFieldTypeOptions: "getEmailFieldTypeOptions", onMakeNewItem: "makeNewEmail", hint: $L("New Email Address"), keyboardType: "email"},
                    {name: "imGroup", kind: "EditableGroup", propertyName: "ims", onGetFieldObject: "getImFieldObject", onGetFieldTypeOptions: "getIMAddressFieldTypeOptions", onMakeNewItem: "makeNewIm", hint: $L("New IM Address")},
                    {name: "addressGroup", kind: "EditableGroup", propertyName: "addresses", onGetFieldObject: "getAddressFieldObject", onGetFieldTypeOptions: "getAddressFieldTypeOptions", onMakeNewItem: "makeNewAddress", hint: $L("New Address"), onGetFieldValue: "getAddressFieldValue", onUpdateField: "updateAddressField"},
                    {name: "urlGroup", kind: "EditableGroup", propertyName: "urls", onGetFieldObject: "getUrlFieldObject", onMakeNewItem: "makeNewUrl", hint: $L("New URL"), keyboardType: "url"},

                    {kind: "RowGroup", components: [
                        {name: "notesField", kind: "RichText", className: "notes", hint: "", onblur: "onNotesBlur", components: [
                            {content: $L("notes"), className: "label" }
                        ] }
                    ]},
                    {name: "groupContainingBirthday", kind: "RowGroup", components: [
                        {name: "birthdayField", kind: "LabeledContainer", className: "enyo-input birthday", onclick: "birthdayTap", hint: "", components: [
                            {content: $L("birthday"), className: "label" }
                        ] },
                        {name: "birthdayPicker", kind: "BirthdayPicker", onSave: "birthdayPickerSave", onDone: "birthdayDone"},
                        {name: "spouseField", kind: "Input", hint: "", autocorrect: false, onblur: "onSpouseBlur", components: [
                            {content: $L("spouse"), className: "label" }
                        ] },
                        {name: "childrenField", kind: "Input", hint: "", autocorrect: false, onblur: "onChildrenBlur", components: [
                            {content: $L("children"), className: "label" }
                        ] }
                    ]},
                    {content: $L("Delete"), kind: "Button", style: "margin:0 160px", className: "enyo-button-negative", onclick: "deletePerson", name: "deleteButton"}
                ]}
            ]}
        ]},
        {kind: "Toolbar", className: "enyo-toolbar-light", pack: "center", components: [
            {kind: "Button", content: $L("Cancel"), onclick: "cancelEditContact", width: "15rem;margin:0 0.8em 0 0"},
            {kind: "Button", content: $L("Done"), className: "enyo-button-dark", onclick: "doneEditContact", width: "15rem;"}
        ]},
        {name: "DeleteDialog", kind: "ModalDialog", components: [
            {name: "DeleteDialogTitle", className: "enyo-item enyo-first", style: "padding: 12px", content: ""},
            {kind: "Button", name: "deleteAllProfilesButton", className: "enyo-button-negative", caption: $L("Delete All Profiles"), onclick: "deleteAllProfiles"},
            {kind: "Button", name: "deleteOtherProfilesButton", className: "enyo-button-negative", caption: $L("Delete other profiles"), onclick: "deleteOtherProfiles"},
            {kind: "Button", className: "enyo-button-light", caption: $L("Cancel"), onclick: "cancelAction"}
        ]},
        {name: "photoMenu", kind: "PopupSelect", onSelect: "onPhotoMenuSelect"},
        {name: "imagePicker", kind: "FilePicker", cropWidth: 256, cropHeight: 256, fileType: ["image"], allowMultiSelect: false, onPickFile: "photoChosen"}
    ],
    // This function is called when editing a contact that is to be added but doesn't exist yet
    newContact                     : function (contact) {
        this.newPerson = true;
        this.newPersonIsDirty = true;
        this.person = new ContactsLib.Person();

        // create a new contact to be populated
        this.primaryContact = ContactsLib.ContactFactory.createContactDisplay(contact);

        // This is a new contact so we shouldn't have any linked contacts.
        // Just set the linkedContacts to this objects contact object.
        this.linkedContacts = [this.primaryContact];
        this.updateAccountPickers(true);
        this.$.heading.setContent($L("Create New Contact"));
        this.$.deleteButton.hide();
        this.personShouldBeFavorite = undefined;
        this.renderContact();
    },
    personChanged                  : function () {
        // this.hasNoLinkedContacts will only be set to true in the case that the person doesn't have any linked contacts.
        // The only known situation for this is when the user has a plaxo account and then deletes the sample plaxo app.
        this.hasNoLinkedContacts = false;
        this.newPersonIsDirty = false;

        // this means the user is creating a new person (and contact)
        if (!this.person) {
            this.newPerson = true;
            this.person = new ContactsLib.Person();
            this.personShouldBeFavorite = undefined;
            this.$.heading.setContent($L("Create New Contact"));
            this.$.deleteButton.hide();
            // create a new contact to be populated
            this.primaryContact = ContactsLib.ContactFactory.createContactDisplay();

            // This is a new contact so we shouldn't have any linked contacts.
            // Just set the linkedContacts to this objects contact object.
            this.linkedContacts = [this.primaryContact];
            this.updateAccountPickers(true);
            this.renderContact();
        } else {
            this.newPerson = false;
            this.personShouldBeFavorite = undefined;
            this.$.heading.setContent($L("Edit Contact"));
            this.$.deleteButton.show();
            // Array of contacts that are linked to the person record.
            this.linkedContacts = this.person.getContacts();
            if (!this.linkedContacts || this.linkedContacts.length === 0) {
                this.linkedContacts = [ContactsLib.ContactFactory.createContactDisplay(this.person.getDBObject())];
                this.hasNoLinkedContacts = true;
            }
            this.primaryContact = this.linkedContacts[0];

            this.ensureSelectedContactIsEditable();

            this.updateAccountPickers(false);
            this.renderContact();
        }

    },
    ensureSelectedContactIsEditable: function () {
        //loop through the contacts to see if there are any editable ones
        var i,
            newContact,
            primary;
        for (i = 0; i < this.linkedContacts.length; i += 1) {
            if (!AccountsList.isContactReadOnly(this.linkedContacts[i])) {
                return;
            }
        }

        // If we got this far, then all the contacts are readOnly
        newContact = new ContactsLib.Contact();
        newContact.getAccountId().setValue(DefaultAccountId);
        primary = this.linkedContacts[0];
        newContact.getName().set(primary.getName());
        newContact.setKind(AccountsList.getProvider(DefaultAccountId).dbkinds.contact);

        this.addingNewContactsToPerson = true;
        this.linkedContacts.push(newContact);

        // TODO: Why is this necessary?  Is this marking it dirty perhaps?
        newContact.getDBObject();
        return newContact;
    },
    updateAccountPickers           : function (isNewPerson) {
        var accounts = [],
            i,
            contact,
            accountId,
            account,
            selectedAccount = 0,
            acct;

        /*
         * New contacts:
         *	- show account picker at top of screen showing all editable accounts from the accountsList
         *	- group items: don't show account pickers
         * Existing contacts:
         *	  - don't show account picker at top of screen (used to show all linked contact accounts)
         *	  - group items: show all editable accounts from the linked contact accounts
         */

        this.singleItemAccountChoices = [];
        this.groupItemAccountChoices = [];
        if (isNewPerson) {
            //TODO: change getDefaultAccountsDisplayList to return what we want??
            accounts = AccountsList.getDefaultAccountsDisplayList();
            for (i = 0; i < accounts.length; i += 1) {
                acct = {
                    caption  : accounts[i].label,
                    value    : i,
                    accountId: accounts[i].command,
                    icon     : accounts[i].secondaryIconPath
                };
                if (DefaultAccountId && acct.accountId === DefaultAccountId) { //if found default account (from AppPrefs)
                    selectedAccount = i;
                }
                this.singleItemAccountChoices.push(acct);
            }
            this.changeNewContactAccount(this.singleItemAccountChoices[selectedAccount].accountId);
        } else {
            for (i = 0; i < this.linkedContacts.length; i += 1) {
                contact = this.linkedContacts[i];
                accountId = contact.getAccountId().getValue();
                account = AccountsList.getAccount(accountId);
                acct =
                {
                    caption   : contact.getName().getFullName(),
                    icon      : AccountsList.getAccountIcon(accountId),
                    value     : i,
                    accountId : accountId,
                    contactId : contact.getId(),
                    isReadOnly: (AccountsList.isContactReadOnly(contact) || (account === undefined) || (account.templateId === "com.palm.sim") ||
                        contact.getKindName(true) === "com.palm.contact.libpurple:1")
                };
                if (this.primaryContact.getId() === contact.getId()) {
                    selectedAccount = i;
                }
                if (!acct.isReadOnly) {
                    this.groupItemAccountChoices.push(acct);
                }
            }

        }
        if (this.singleItemAccountChoices.length > 0) {
            this.$.accountPicker.setShowing(true);
            this.$.accountPicker.setItems(this.singleItemAccountChoices);
            this.$.accountPickerIcon.setSrc("" + this.singleItemAccountChoices[selectedAccount].icon);
            this.$.accountPicker.setValue(selectedAccount);
        } else {
            this.$.accountPicker.setShowing(false);
        }
    },
    accountSelected                : function (inSender, inValue, inOldValue) {
        this.$.accountPickerIcon.setSrc("" + this.singleItemAccountChoices[inValue].icon);
        if (this.newPerson) {
            this.changeNewContactAccount(this.singleItemAccountChoices[inValue].accountId);
        }
    },
    changeNewContactAccount        : function (accountId) {
        if (!accountId) {
            enyo.error("EditAssistant: changeNewContactAccount: No accountId given");
            return;
        }
        // If this function was called from the tap event, the second param will be a HTML div,
        // so we'll fetch the 'kind' ourselves
        var kindName = AccountsList.getProvider(accountId).dbkinds.contact;
        if (kindName) {
            // Set the desired account in the selected contact
            this.primaryContact.getAccountId().setValue(accountId);
            this.primaryContact.setKind(kindName);
        }
    },
    birthdayDone                   : function () {
        this.$.groupContainingBirthday.hideRow(1);
        this.$.groupContainingBirthday.showRow(0);
    },
    birthdayTap                    : function () {
        this.$.birthdayPicker.open();
        this.$.groupContainingBirthday.hideRow(0);
        this.$.groupContainingBirthday.showRow(1);
    },
    birthdayPickerSave             : function (inSender, dateString) {
        this.saveMoreDetails("birthday", dateString);

        if (dateString) {
            // Now update the UI to reflect the new date
            this.$.birthdayField.setLabel(com.palm.library.contacts.Utils.formatBirthday(this.$.birthdayPicker.birthdayObject));
        } else {
            // Birthday is being removed
            this.$.birthdayField.setLabel("");
        }
    },
    renderContact                  : function () {
        var primaryContactIsReadOnly = AccountsList.isContactReadOnly(this.primaryContact),
            tempNote = null,
            tempBirthday = null,
            tempChildren = null,
            tempSpouse = null;

        this.$.nameField.setPerson(this.person);
        this.$.nicknameField.setPerson(this.person);
        this.$.titleField.setPerson(this.person);
        this.$.companyField.setPerson(this.person);

        this.$.namePrefixField.setPerson(this.person);
        this.$.nameFirstNameField.setPerson(this.person);
        this.$.nameMiddleNameField.setPerson(this.person);
        this.$.nameLastNameField.setPerson(this.person);
        this.$.nameSuffixField.setPerson(this.person);

        // Disable Readonly fields for non-group items
        this.$.nameField.setDisabled(primaryContactIsReadOnly);
        this.$.nicknameField.setDisabled(primaryContactIsReadOnly);
        this.$.titleField.setDisabled(primaryContactIsReadOnly);
        this.$.companyField.setDisabled(primaryContactIsReadOnly);
        this.$.namePrefixField.setDisabled(primaryContactIsReadOnly);
        this.$.nameFirstNameField.setDisabled(primaryContactIsReadOnly);
        this.$.nameMiddleNameField.setDisabled(primaryContactIsReadOnly);
        this.$.nameLastNameField.setDisabled(primaryContactIsReadOnly);
        this.$.nameSuffixField.setDisabled(primaryContactIsReadOnly);
        this.$.notesField.setDisabled(primaryContactIsReadOnly);
        this.$.childrenField.setDisabled(primaryContactIsReadOnly);
        this.$.spouseField.setDisabled(primaryContactIsReadOnly);
        this.$.birthdayField.onclick = primaryContactIsReadOnly ? "" : "birthdayTap";

        this.$.favIndicator.addRemoveClass("true", this.person.isFavorite() ? true : false);

        // Set spouse
        tempSpouse = this.findFirstRelationForType(ContactsLib.Relation.TYPE.SPOUSE, this.primaryContact);
        tempSpouse = tempSpouse ? tempSpouse.getValue() : null;
        this.$.spouseField.setValue(tempSpouse);

        // Set children
        tempChildren = this.findFirstRelationForType(ContactsLib.Relation.TYPE.CHILD, this.primaryContact);
        tempChildren = tempChildren ? tempChildren.getValue() : null;
        this.$.childrenField.setValue(tempChildren);

        // Set birthday
        tempBirthday = this.primaryContact.getBirthday();
        if (tempBirthday.getValue() && tempBirthday.getValue() !== "0") {
            this.$.birthdayField.setLabel(com.palm.library.contacts.Utils.formatBirthday(tempBirthday));
            this.$.birthdayPicker.birthdayObject = tempBirthday;
        } else {
            this.$.birthdayPicker.birthdayObject = undefined;
            this.$.birthdayField.setLabel("");
        }

        // Set notes
        tempNote = this.primaryContact.getNote();
        this.$.notesField.setValue(tempNote.getValue() ? tempNote.getDisplayValue() : null);

        this.$.emailGroup.accountList = this.groupItemAccountChoices;
        this.$.emailGroup.setLinkedContacts(this.linkedContacts);
        this.$.emailGroup.setFields(this.person.getEmails().getArray());
        this.$.phoneGroup.accountList = this.groupItemAccountChoices;
        this.$.phoneGroup.setLinkedContacts(this.linkedContacts);
        this.$.phoneGroup.setFields(this.person.getPhoneNumbers().getArray());
        this.$.imGroup.accountList = this.groupItemAccountChoices;
        this.$.imGroup.setLinkedContacts(this.linkedContacts);
        this.$.imGroup.setFields(this.person.getIms().getArray());
        this.$.addressGroup.accountList = this.groupItemAccountChoices;
        this.$.addressGroup.setLinkedContacts(this.linkedContacts);
        this.$.addressGroup.setFields(this.person.getAddresses().getArray());
        this.$.urlGroup.accountList = this.groupItemAccountChoices;
        this.$.urlGroup.setLinkedContacts(this.linkedContacts);
        this.$.urlGroup.setFields(this.person.getUrls().getArray());

        this.renderPhoto();

        this.$.groupContainingBirthday.hideRow(1);
        this.$.groupContainingBirthday.showRow(0);

        this.$.groupContainingName.showRow(0);
        this.$.groupContainingName.hideRow(1);
        this.$.groupContainingName.hideRow(2);
        this.$.groupContainingName.hideRow(3);
        this.$.groupContainingName.hideRow(4);
        this.$.groupContainingName.hideRow(5);
    },

    // Name field
    getNameFieldValue              : function (inSender, inField) {
        return this.primaryContact.getName().x_fullName;
    },
    updateNameField                : function (inSender, inValue) {
        this.primaryContact.getName().x_fullName = inValue;
    },

    onNotesBlur: function () {
        var note = this.$.notesField.getValue();
        note = note.replace(/<br>/g, "\n");
        this.primaryContact.getNote().setValue(note);
    },

    onSpouseBlur: function () {
        this.saveMoreDetails("spouse", this.$.spouseField.getValue());
    },

    onChildrenBlur       : function () {
        this.saveMoreDetails("children", this.$.childrenField.getValue());
    },
    toggleFavorite       : function (inSender, inResult) {
        this.personShouldBeFavorite = !this.$.favIndicator.hasClass("true");
        this.$.favIndicator.addRemoveClass("true", this.personShouldBeFavorite ? true : false);
    },
    getOrganization      : function () {
        var organizations, organization;
        organizations = this.primaryContact.getOrganizations().getArray();

        if (organizations.length > 0) {
            organization = organizations[0];
        } else {
            this.primaryContact.getOrganizations().add(new ContactsLib.Organization());
            // Added organization for display purposes. However doing this will mark the organization as
            // dirty. We mark it as not dirty to get around that for ui purposes.
            this.primaryContact.getOrganizations().markArrayNotDirty();
            organization = this.primaryContact.getOrganizations().getArray()[0];
        }

        return organization;
    },

    // Title
    getTitleFieldValue   : function (inSender, inField) {
        return this.getOrganization().getTitle();
    },
    updateTitleField     : function (inSender, inValue) {
        this.getOrganization().setTitle(inValue);
    },

    // Nickname
    getNicknameFieldValue: function (inSender, inField) {
        return this.primaryContact.getNickname().getValue() || "";
    },
    updateNicknameField  : function (inSender, inValue) {
        this.primaryContact.getNickname().setValue(inValue);
    },

    // Company name
    getCompanyFieldValue : function (inSender, inField) {
        return this.getOrganization().getName();
    },
    updateCompanyField   : function (inSender, inValue) {
        this.getOrganization().setName(inValue);
    },

    getEmailFieldObject: function (inSender, contact) {
        return contact.getEmails() || {};
    },

    getAddressFieldObject: function (inSender, contact) {
        return contact.getAddresses() || {};
    },

    getImFieldObject: function (inSender, contact) {
        return contact.getIms() || {};
    },

    getNamePrefixFieldValue    : function (inSender, inField) {
        return this.primaryContact.getName().getHonorificPrefix() || "";
    },
    updateNamePrefixField      : function (inSender, inValue) {
        return this.primaryContact.getName().setHonorificPrefix(inValue) || "";
    },
    getNameFirstNameFieldValue : function (inSender, inField) {
        return this.primaryContact.getName().getGivenName() || "";
    },
    updateNameFirstNameField   : function (inSender, inValue) {
        return this.primaryContact.getName().setGivenName(inValue) || "";
    },
    getNameMiddleNameFieldValue: function (inSender, inField) {
        return this.primaryContact.getName().getMiddleName() || "";
    },
    updateNameMiddleNameField  : function (inSender, inValue) {
        return this.primaryContact.getName().setMiddleName(inValue) || "";
    },
    getNameLastNameFieldValue  : function (inSender, inField) {
        return this.primaryContact.getName().getFamilyName() || "";
    },
    updateNameLastNameField    : function (inSender, inValue) {
        return this.primaryContact.getName().setFamilyName(inValue) || "";
    },
    getNameSuffixFieldValue    : function (inSender, inField) {
        return this.primaryContact.getName().getHonorificSuffix() || "";
    },
    updateNameSuffixField      : function (inSender, inValue) {
        return this.primaryContact.getName().setHonorificSuffix(inValue) || "";
    },


    phoneNumberFormat : function (inSender, value) {
        return ContactsLib.PhoneNumber.format(value);
    },
    makeNewPhoneNumber: function (inSender, value) {
        var toReturn = new ContactsLib.PhoneNumber();
        toReturn.setType(ContactsLib.PhoneNumber.TYPE.MOBILE);
        toReturn.forceMarkDirty();
        toReturn.setValue(value);
        return toReturn;
    },

    makeNewIm: function (inSender, value) {
        var toReturn = new ContactsLib.IMAddress();
        toReturn.setType(ContactsLib.IMAddress.TYPE.GTALK);
        toReturn.forceMarkDirty();
        toReturn.setValue(value);
        return toReturn;
    },

    makeNewEmail: function (inSender, value) {
        var toReturn = new ContactsLib.EmailAddress();
        toReturn.setType(ContactsLib.EmailAddress.TYPE.HOME);
        toReturn.forceMarkDirty();
        toReturn.setValue(value);
        return toReturn;
    },

    makeNewUrl: function (inSender, value) {
        var toReturn = new ContactsLib.Url();
        toReturn.setType(ContactsLib.Url.TYPE.HOME);
        toReturn.forceMarkDirty();
        toReturn.setValue(value);
        return toReturn;
    },

    makeNewAddress: function (inSender, value) {
        var toReturn = new ContactsLib.Address();
        toReturn.setType(ContactsLib.Address.TYPE.WORK);
        toReturn.forceMarkDirty();
        toReturn.x_displayValue = value;
        return toReturn;
    },

    getPhoneFieldObject     : function (inSender, contact) {
        return contact.getPhoneNumbers() || {};
    },
    getPhoneFieldTypeOptions: function (inSender, contact) {
        return this.addCaptionFromLabels(ContactsLib.PhoneNumber.Labels.getPopupLabels());
    },

    getEmailFieldTypeOptions: function (inSender, contact) {
        return this.addCaptionFromLabels(ContactsLib.EmailAddress.Labels.getPopupLabels());
    },

    getIMAddressFieldTypeOptions: function (inSender, contact) {
        return this.addCaptionFromLabels(ContactsLib.IMAddress.Labels.getPopupLabels());
    },

    getAddressFieldTypeOptions: function (inSender, contact) {
        return this.addCaptionFromLabels(ContactsLib.Address.Labels.getPopupLabels());
    },

    getUrlFieldObject: function (inSender, contact) {
        return contact.getUrls() || {};
    },

    getAddressFieldValue: function (inSender, inField) {
        return inField.x_displayValue;
    },
    updateAddressField  : function (inSender, ioField, inValue) {
        ioField.x_displayValue = inValue;
        return ioField;
    },

    addCaptionFromLabels: function (items) {
        for (var i = 0; i < items.length; i += 1) {
            items[i].caption = items[i].label;
        }
        return items;
    },

    renderPhoto                 : function () {
        var future = ContactsLib.ContactPhoto.getPhotoPath(this.primaryContact, ContactsLib.PersonPhotos.TYPE.BIG);
        future.then(this, function () {
            var filePath;
            try {
                filePath = future.result;
            } catch (e) {
                filePath = "";
            }
            this.$.photoImage.applyStyle("background-image", "url(" + filePath + ");");
        });
    },
    // This is called when the user choose a new photo for a contact
    photoChosen                 : function (inSender, inImage) {
        if (inImage && inImage[0] && inImage[0].fullPath && inImage[0].cropInfo) {
            this.saveImage(inImage[0].fullPath, inImage[0].cropInfo);
        }
    },
    saveImage                   : function (filePath, cropInfo) {
        var future = new Future(),
            squarePath;

        future.now(this, function () {
            return this.primaryContact.setCroppedContactPhoto(filePath, cropInfo, ContactsLib.ContactPhoto.TYPE.BIG);
        });

        future.then(this, function () {
            return this.primaryContact.setCroppedContactPhoto(filePath, cropInfo, ContactsLib.ContactPhoto.TYPE.SQUARE);
        });

        future.then(this, function () {
            squarePath = future.result;
            this.renderPhoto();
            return squarePath;
        });

        return future;
    },
    maybeSetPalmProfileAccountId: function (c) {
        var accounts,
            accountId;

        if (!c.getAccountId().getValue()) {
            accounts = AccountsList.getAccountsByTemplateId("com.palm.palmprofile");
            if (accounts && accounts.length > 0) {
                accountId = accounts[0]._id;
                enyo.log("Setting accountId " + accountId + " for contact");
                c.getAccountId().setValue(accountId);
            }
        }
    },
    handleSave                  : function () {
        var that = this,
            future = new Future();

        if (this.newPerson !== true) {
            this.doneUpdateContact(undefined, undefined); // Exit this view right away so that the user doesn't have to wait.
        }

        future.now(this, function () {
            if (this.person instanceof ContactsLib.Person) {
                if (this.person.getId()) {
                    if (this.addingNewContactsToPerson) {
                        // If we are editing a readonly-contact and we need to attach the new contacts
                        // that are created as a result of modifying a readonly contact we need to call this method
                        return this.person._savePersonAttachingTheseContacts(this.linkedContacts).then(function (dummyFuture) {
                            return false;
                        });
                    } else {
                        // UI Hack - call fixup to update person before the linker gets to the changed contacts to process.
                        return this.person.fixupNoReloadContacts().then(this, function () {
                            return this.person.save();
                        });
                    }
                } else {
                    // We are dealing with a new contact so we need to check that it has an accountId set on it and
                    // need to attach the new contact to a person in case they set a reminder or some other person specific
                    // data point

                    this.linkedContacts = this.linkedContacts.map(function (contact) {
                        that.maybeSetPalmProfileAccountId(contact);
                        return contact.getDBObject();
                    });

                    return PalmCall.call("palm://com.palm.service.contacts.linker/", "saveNewPersonAndContacts", { person: this.person.getDBObject(), contacts: this.linkedContacts }).then(this, function (saveFuture) {
                        var result = saveFuture.result;

                        this.person = new ContactsLib.Person(result.person);
                        this.linkedContacts = result.contacts;

                        this.linkedContacts = this.linkedContacts.map(function (contact) {
                            return new ContactsLib.Contact(contact);
                        });

                        return false;
                    });
                }
            } else {
                return true;
            }

        });

        future.then(this, function () {
            var result = future.result;
            if (result) {
                this.saveNextLinkedContact(0, that.person);
            } else {
                if (this.newPerson === true) {
                    this.transactionMgr.EndTransaction();
                    this.doneUpdateContact(undefined, undefined);
                }
                return true;
            }
        });
    },
    saveNextLinkedContact       : function (inIndex, inPerson) {
        var future,
            c = this.linkedContacts[inIndex];
        if (inPerson instanceof ContactsLib.Person) {
            if (inPerson.getId()) {
                future = this.saveContact(c);
            } else {
                future = new Future(true);
            }
        }

        future.then(this, function () {
            if (inIndex === (this.linkedContacts.length - 1)) {
                this.transactionMgr.EndTransaction(0);
            } else {
                enyo.asyncMethod(this, "saveNextLinkedContact", (inIndex + 1), inPerson);
            }
        });
    },
    deletePerson                : function () {
        this.$.DeleteDialog.validateComponents();
        var hasReadOnlyContact = false,
            hasWritableContact = false,
            readOnlyType = "",
            deleteDialogTitleTemp = "",
            deleteName = this.person.getName().getFullName();

        this.person.getContacts().forEach(function (contact) {
            if (AccountsList.isContactReadOnly(contact)) {
                readOnlyType = AccountsList.getAccountName(contact.getAccountId().getValue());
                hasReadOnlyContact = true;
            } else {
                hasWritableContact = true;
            }
        });

        if (hasReadOnlyContact && hasWritableContact) {
            deleteDialogTitleTemp = new enyo.g11n.Template($L("#{type} profiles cannot be deleted.  Delete all other profiles?"));
            this.$.DeleteDialogTitle.setContent(deleteDialogTitleTemp.evaluate({type: readOnlyType}));
            this.$.deleteAllProfilesButton.setShowing(false);
            this.$.deleteOtherProfilesButton.setShowing(true);
        } else if (hasReadOnlyContact && !hasWritableContact) {
            deleteDialogTitleTemp = new enyo.g11n.Template($L("#{type} profiles can not be deleted"));
            this.$.DeleteDialogTitle.setContent(deleteDialogTitleTemp.evaluate({type: readOnlyType}));
            this.$.deleteAllProfilesButton.setShowing(false);
            this.$.deleteOtherProfilesButton.setShowing(false);
        } else {
            deleteDialogTitleTemp = new enyo.g11n.Template($L("Delete #{deleteName}?"));
            this.$.DeleteDialogTitle.setContent(deleteDialogTitleTemp.evaluate({'deleteName': deleteName}));
            this.$.deleteAllProfilesButton.setShowing(true);
            this.$.deleteOtherProfilesButton.setShowing(false);
        }

        this.$.DeleteDialog.openAtCenter();
    },
    cancelAction                : function (inSender) {
        this.$.DeleteDialog.close();
    },
    deleteAllProfiles           : function (inSender) {
        var i,
        //request,
            c;

        //this.transactionMgr.BeginTransaction("deleteAllProfiles"); // TODO...Nothing is ending the transaction so remove this for now
        if (this.hasNoLinkedContacts === true) {
            //this.person.deletePerson(); // permissions don't allow for this, we must call the linker to do this for us
            PalmCall.call("palm://com.palm.service.contacts.linker/", "deleteOrphanedPerson", { "personId": this.person.getId() });
        } else {
            for (i = 0; i < this.linkedContacts.length; i += 1) {
                c = this.linkedContacts[i];
                if (!AccountsList.isContactReadOnly(c)) {
                    c.deleteContact();
                }
            }
        }

        /*
         if (this.person.getLauncherId().getValue()) {
         request = new Mojo.Service.Request("palm://com.palm.applicationManager/removeLaunchPoint", {
         parameters: {
         launchPointId: this.person.getLauncherId().getValue(),
         id: "com.palm.app.contacts"
         }
         });
         }
         */

        this.$.DeleteDialog.close();
        this.destroyGroupsAndExit({action: Edit.Action.DELETED});
    },
    destroyGroupsAndExit        : function (inAction) {
        this.doExit(inAction);
        enyo.asyncMethod(this, "_destroyGroupsAndExit");
    },
    _destroyGroupsAndExit       : function () {
        this.$.phoneGroup.destroyControls();
        this.$.emailGroup.destroyControls();
        this.$.imGroup.destroyControls();
        this.$.addressGroup.destroyControls();
        this.$.urlGroup.destroyControls();
        this.$.EditDetails.scrollIntoView(0, 0); // Always scroll back to the top
    },
    deleteOtherProfiles         : function (inSender) {
        var i,
            c;

        //this.transactionMgr.BeginTransaction("deleteOtherProfiles"); // TODO...Nothing is ending the transaction so remove this for now
        for (i = 0; i < this.linkedContacts.length; i += 1) {
            c = this.linkedContacts[i];
            if (!AccountsList.isContactReadOnly(c)) {
                c.deleteContact();
            }
        }

        this.$.DeleteDialog.close();
        this.doneUpdateContact();
    },
    cancelEditContact           : function () {
        this.destroyGroupsAndExit({action: Edit.Action.CANCELLED, personId: this.person.getId()});
    },
    doneEditContact             : function () {
        var isDirty = this.newPersonIsDirty;

        // If this is an orphaned person without any linked contacts then do not allow the user to save any changes (1 Known case for this is: DFISH-25142)
        if (this.hasNoLinkedContacts === true) {
            this.cancelEditContact();
            return;
        }

        this.transactionMgr.BeginTransaction("editContact");

        if (this.personShouldBeFavorite === true) {
            this.person.makeFavorite();
        } else if (this.personShouldBeFavorite === false) {
            this.person.unfavorite();
        }

        this.linkedContacts.forEach(function (c) {
            if (c.isDirty()) {
                isDirty = true;
            }
        });

        if (isDirty || this.person.isDirty()) {
            this.handleSave();
        } else {
            this.doneUpdateContact(undefined, undefined);
        }
    },
    doneUpdateContact           : function (inSender, inResponse) {
        if (this.newPerson === true) {
            this.destroyGroupsAndExit({action: Edit.Action.INSERTED, personId: this.person.getId()});
        } else {
            this.destroyGroupsAndExit({action: Edit.Action.UPDATED, personId: this.person.getId()});
        }
    },
    ringtoneClick               : function () {
        var ringtone = this.person.getRingtone().getLocation();
        this.doShowRingtones(ringtone);
    },
    photoTap                    : function (inSender) {
        if (AccountsList.isContactReadOnly(this.primaryContact)) {
            enyo.log("Contact is read only - can't modify photo");
            return;
        }

        var popupItems = [
            {caption: $L("Change Photo"), value: "CHANGE"},
            {caption: $L("Delete Photo"), value: "DELETE"}
        ];

        if ((this.primaryContact.getPhotos().getArray().length > 0) || this.primaryContact.imAvatarLoc) {
            // Note that if we don't call "setItems" then the "onSelect" handler is never called
            // Otherwise these items could just be static
            this.$.photoMenu.setItems(popupItems);

            this.$.photoMenu.openAtControl(this.$.changeButton);
        } else {
            this.$.imagePicker.pickFile();
        }

    },
    onPhotoMenuSelect           : function (inSender, inSelected) {
        if (inSelected.getValue() === "CHANGE") {
            this.$.imagePicker.pickFile();
        }
        else if (inSelected.getValue() === "DELETE") {
            this.primaryContact.clearPhotos();
            this.renderPhoto();
        }
    },
    closeNameDetails            : function (inSender, inEvent) {
        if (this.$.namePrefixField.hasFocus()) {
            this.updateNamePrefixField(inSender, this.$.namePrefixField.getValue());
        }
        if (this.$.nameFirstNameField.hasFocus()) {
            this.updateNameFirstNameField(inSender, this.$.nameFirstNameField.getValue());
        }
        if (this.$.nameMiddleNameField.hasFocus()) {
            this.updateNameMiddleNameField(inSender, this.$.nameMiddleNameField.getValue());
        }
        if (this.$.nameLastNameField.hasFocus()) {
            this.updateNameLastNameField(inSender, this.$.nameLastNameField.getValue());
        }
        if (this.$.nameSuffixField.hasFocus()) {
            this.updateNameSuffixField(inSender, this.$.nameSuffixField.getValue());
        }

        // the following will cause the data to be updated using the new primaryContact
        this.$.nameField.setPerson(this.person);

        this.$.groupContainingName.showRow(0);
        this.$.groupContainingName.hideRow(1);
        this.$.groupContainingName.hideRow(2);
        this.$.groupContainingName.hideRow(3);
        this.$.groupContainingName.hideRow(4);
        this.$.groupContainingName.hideRow(5);
    },


    namePrefixFieldButtonOnMouseDown: function (inSender, inEvent) {
        inEvent.preventDefault();
    },
    nameFieldButtonOnMouseDown      : function (inSender, inEvent) {
        inEvent.preventDefault();
    },

    openNameDetails       : function (inSender, inEvent) {
        if (this.$.nameField.hasFocus()) {
            // This can't be done because it forces the name to be re-parsed (see DFISH-9321)
            this.updateNameField(inSender, this.$.nameField.getValue());
        }

        // This is so that any modification to the name get updated on the contact before the name fields display
        this.$.namePrefixField.setPerson(this.person);
        this.$.nameFirstNameField.setPerson(this.person);
        this.$.nameMiddleNameField.setPerson(this.person);
        this.$.nameLastNameField.setPerson(this.person);
        this.$.nameSuffixField.setPerson(this.person);

        this.$.groupContainingName.hideRow(0);
        this.$.groupContainingName.showRow(1);
        this.$.groupContainingName.showRow(2);
        this.$.groupContainingName.showRow(3);
        this.$.groupContainingName.showRow(4);
        this.$.groupContainingName.showRow(5);
    },
    saveContact           : function (c) {
        enyo.log("New save contact method: " + c);

        if (!AccountsList.isContactReadOnly(c)) {
            return c.save();
        } else {
            return new Future(true);
        }
    },
    saveMoreDetails       : function (property, value) {
        if (property === "birthday") {
            this.primaryContact.getBirthday().setValue(value);
        } else if (property === "children") {
            this.handleUpdateOfRelation(this.primaryContact, ContactsLib.Relation.TYPE.CHILD, value);
        } else if (property === "spouse") {
            this.handleUpdateOfRelation(this.primaryContact, ContactsLib.Relation.TYPE.SPOUSE, value);
        }
    },
    handleUpdateOfRelation: function (contact, type, value) {
        var relation = this.findFirstRelationForType(type, contact);
        if (value !== "") {
            if (relation) {
                relation.setValue(value);
            } else {
                relation = new ContactsLib.Relation();
                relation.setValue(value);
                relation.setType(type);
                contact.getRelations().add(relation);
            }
        } else {
            if (relation) {
                contact.getRelations().remove(relation);
            }
        }
    },

    findFirstRelationForType: function (type, contact) {
        var i,
            tempRelationArray = contact.getRelations().getArray(),
            tempRelation,
            tempRelationType;

        for (i = 0; i < tempRelationArray.length; i += 1) {
            tempRelation = tempRelationArray[i];
            tempRelationType = tempRelation.getType();

            if (tempRelationType === type) {
                return tempRelation;
            }
        }

        return null;
    }
});
