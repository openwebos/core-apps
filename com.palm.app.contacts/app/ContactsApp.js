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
/*global ContactsLib, document, Foundations, enyo, console, AccountsList:true, AppPrefs:true, com, $L, DefaultAccountId:true, window, runningInBrowser, Edit, launchParams:true */
enyo.VirtualList.prototype.accelerated = true;

enyo.kind({
    name                   : "ContactsApp",
    kind                   : enyo.HFlexBox,
    wideWidth              : 600,
    editClosedCallback     : undefined,
    components             : [
        {name: "PersonLinkList", kind: "com.palm.library.contactsui.personListDialog", onContactClick: "linkPersonTap", onListUpdated: enyo.nop, mode: "noFilter", showFavStars: true, showSearchBar: true, showAddButton: false, showIMStatuses: false, onCancelClick: "closePersonLinkList"},
        {name: "AddToExistingPersonSelector", kind: "com.palm.library.contactsui.personListDialog", onContactClick: "existingPersonSelected", onListUpdated: enyo.nop, mode: "noFilter", showFavStars: true, showSearchBar: true, showAddButton: false, showIMStatuses: false, onCancelClick: "closeAddToExistingList"},
        {name: "AddFavoriteList", kind: "com.palm.library.contactsui.personListDialog", onContactClick: "favoriteSelected", onListUpdated: enyo.nop, mode: "noFavoritesOnly", showFavStars: false, showSearchBar: true, showAddButton: false, showIMStatuses: false, onCancelClick: "closeFavoriteList"},
        {kind: "DbService", dbKind: "com.palm.contact:1", onFailure: "gotNumContactsFailure", components: [
            {name: "getAccountNumContacts", method: "find", onResponse: "gotNumContactsResults"}
        ]},
        {kind: "Accounts.getAccounts", name: "getAccounts", onGetAccounts_AccountsAvailable: "onAccountsAvailable"},
        {kind: "TransactionManager", name: "transactionMgr", onBeginTransaction: "onBeginTransaction", onEndTransaction: "onEndTransaction"},
        {name: "vCardHelper", kind: "VCardHelper", onGotVCardContact: "onGotVCardContact"},
        {name: "pane", kind: "Pane", flex: 1, transitionKind: "enyo.transitions.Simple", onCreateView: "paneAddView", components: [
            {name: "splitPane", kind: "SplitPane", flex: 1, onListAddClick: "addClick", onDetailsEdit: "editClick",
                onDetailsLinkProfilesTap: "linkProfilesTap", onDetailsDoneCreatingPersonObject: "continueCrossLaunch", onAddFavoriteClick: "showFavoriteList"},
            //{name: "details", kind: "Details", flex: 1, onEdit: "editClick", onLinkProfilesTap: "linkProfilesTap", onDoneCreatingPersonObject: "continueCrossLaunch", lazy: true},
            //{name: "edit", kind: "Edit"}, // Created in paneAddView
            {name: "prefs", kind: "Prefs", flex: 1, onDone: "editClose", onEditAccount: "prefsEditAccount", onAddAccount: "prefsAddAccount"},
            {name: "AccountsModify", kind: "AccountsModify", capability: "CONTACTS", onAccountsModify_Done: "preferencesClick", lazy: true, components: [
                {kind: "RowGroup", name: "numContactsGroup", style: "min-height: 75px;", caption: $L("Number of contacts"), components: [
                    {kind: "Item", name: "numContactsItem", content: "" }
                ]}
            ]},
            {name: "AccountsView", kind: "AccountsUI", capability: "CONTACTS", onAccountsUI_Done: "preferencesClick", lazy: true}
        ]},
        {name: "appMenu", kind: "AppMenu", components: [
            {caption: $L("Preferences & Accounts"), onclick: "preferencesClick"},
            {kind: enyo.HelpMenu, target: 'http://help.palm.com/contacts/index.json'}
        ]},
        {kind: "ApplicationEvents", onUnload: "unloadHandler"},
        {name: "AddToContactsDialog", kind: "AddToContactsDialog"},
        {name: "contactCountDialog", kind: "ContactCountDialog"}
    ],
    ready                  : function () {
    },
    create                 : function () {
        this.inherited(arguments);

        this.$.getAccounts.getAccounts({capability: "CONTACTS"});

        this.addRemoveClass("portrait", (window.innerWidth < window.innerHeight));

        if (!runningInBrowser) {
            this.$.splitPane.enableListButtons(false); // Prevent the user from adding an account until AccountList has loaded
            AppPrefs = new ContactsLib.AppPrefs(function () {
                enyo.log("CONTACTS: Done loading AppPrefs");
                DefaultAccountId = AppPrefs ? (AppPrefs._prefs.defaultAccountId) : null;

                AccountsList = new com.palm.library.contactsui.AccountList(function () {
                    this.$.splitPane.enableListButtons(true);

                    var result = null;
                    if (!(AppPrefs._prefs.defaultAccountId)) { // If there is no default account defined use the palmprofile acount
                        result = AccountsList.getAccountsByTemplateId("com.palm.palmprofile");
                        if (result && result.length === 1) {
                            AppPrefs.set(ContactsLib.AppPrefs.Pref.defaultAccountId, result[0]._id);
                            DefaultAccountId = result[0]._id;
                        }
                    }

                    this.handleLaunchParams(enyo.windowParams); // Handle any pending launchParams
                }.bind(this));

            }.bind(this));
        }
    },
    handleLaunchParams     : function (launchParams) {
        if (!launchParams) {
            return;
        }

        if (launchParams.launchType === "editContact") {
            // TEST: luna-send -n 1 palm://com.palm.applicationManager/launch '{"id":"com.palm.app.contacts","params":{"launchType":"editContact", "contact":{"_id":"++HXSI6OVw3gz0O+"}}}'
            this.handleEditContact((launchParams.contact && launchParams.contact._id) || (launchParams.person && launchParams.person._id), true);

        } else if (launchParams.launchType === "newContact" || launchParams.launchType === "pseudo-card") {
            // TEST: luna-send -n 1 palm://com.palm.applicationManager/launch '{"id":"com.palm.app.contacts","params":{"launchType": "pseudo-card", "contact":{"phoneNumbers":[{"value":"4151234567"}]}}}'
            // TEST: luna-send -n 1 palm://com.palm.applicationManager/launch '{"id":"com.palm.app.contacts","params":{"launchType": "pseudo-card", "contact":{"ims":[{"value":"john.doe"}]}}}'
            this.addNewContact(launchParams.contact, (launchParams.skipPrompt === true ? false : true));

        } else if (launchParams.launchType === "addToExisting") {
            // TEST: luna-send -n 1 palm://com.palm.applicationManager/launch '{"id":"com.palm.app.contacts","params":{"launchType": "addToExisting", "contact":{"ims":[{"value":"john.doe"}]}}}'
            this.addToExistingContact(launchParams.contact || launchParams.person);

        } else if ((launchParams.launchType === "showPerson" && launchParams.id) || launchParams.id) { // Some apps only pass the id.
            // TEST: luna-send -n 1 palm://com.palm.applicationManager/launch '{"id":"com.palm.app.contacts","params":{"id":"++HWHktVsLRWcXxZ"}}'
            this.$.splitPane.showPerson(null, launchParams.id);

        } else if (launchParams.target) {
            // TEST: luna-send -n 1 palm://com.palm.applicationManager/launch '{"id":"com.palm.app.contacts","params":{"target":"file:///vCardData/3vCardsInOne.vcf"}}'
            this.$.vCardHelper.handleVCardLaunch(launchParams);

        }
    },
    showFavoriteList       : function () {
        this.$.AddFavoriteList.validateComponents();
        this.$.AddFavoriteList.openAtCenter();
    },
    // TODO: Re-name this fn to something that is more clear, or better yet consolidate this with the editPerson fn
    handleEditContact      : function (inPersonId, inShowPerson) {
        if (inPersonId) {
            if (inShowPerson === true) {
                this.$.splitPane.showPerson(null, inPersonId);
            }

            var personFuture = ContactsLib.Person.getDisplayablePersonAndContactsById(inPersonId);
            personFuture.then(this, function () {
                try {
                    if (personFuture.result) {
                        this.editPerson(personFuture.result);
                    }
                } catch (e) {
                    enyo.log("person failed: " + e);
                    return;
                }
            });
        }
    },
    onAccountsAvailable    : function (inSender, inResponse) {
        this.templates = inResponse.templates;

        var isGalCapable = false;
        if (runningInBrowser) {
            isGalCapable = true;
        } else {
            inResponse.accounts.forEach(function (account) {
                for (var i = 0; i < account.capabilityProviders.length; i += 1) {
                    if (account.capabilityProviders[i].capability === "REMOTECONTACTS") {
                        isGalCapable = true;
                        break;
                    }
                }
            }, this);
        }

        this.$.splitPane.$.contacts.setEnableGAL(isGalCapable);
    },
    favoriteSelected       : function (inSender, inParams) {
        ContactsLib.PersonFactory.createPersonDisplay(inParams).makeFavorite(); //TODO: REMOVE THIS LINE in favor of enableFavoriting: true on AddFavoriteList kind.
        this.$.AddFavoriteList.clearSearchField();
        this.$.AddFavoriteList.close();
    },
    existingPersonSelected : function (inSender, inParams) {
        var rawExistingPerson = inParams,
            rawPersonToLink = this.personToLink,
            personToLink = null,
            existingPerson = null;

        personToLink = ContactsLib.PersonFactory.createPersonDisplay(rawPersonToLink);
        existingPerson = ContactsLib.PersonFactory.createPersonLinkable(rawExistingPerson);
        existingPerson.reloadContacts().then(this, function (reloadContactsFuture) {
            // Decorated contact objects
            var linkedContacts = reloadContactsFuture.result,
                contactToAddTo = null,
                i,
                linkedContact,
                newContact,
                personFullName,
                accountId,
                newContactAccountId,
                account,
                newContactKind;

            // Find a contact to attach the new data to.
            for (i = 0; i < linkedContacts.length; i += 1) {
                linkedContact = linkedContacts[i];

                accountId = linkedContact.getAccountId().getValue();
                account = AccountsList.getAccount(accountId);
                if (!(AccountsList.isContactReadOnly(linkedContact)) && account && account.templateId !== "com.palm.sim") {
                    if (!contactToAddTo) {
                        contactToAddTo = linkedContact;
                    }
                    if (linkedContact.accountId === AppPrefs.get(ContactsLib.AppPrefs.Pref.defaultAccountId)) {
                        contactToAddTo = linkedContact;
                        break;
                    }
                }
            }

            // We did not find a contact to add to, create a new one
            if (!contactToAddTo) {
                // create a new contact based on the person

                newContact = ContactsLib.ContactFactory.createContactEditable(personToLink);
                newContactAccountId = AppPrefs.get(ContactsLib.AppPrefs.Pref.defaultAccountId);
                newContact.getAccountId().setValue(newContactAccountId);

                try {
                    newContactKind = AccountsList.getProvider(newContactAccountId).dbkinds.contact;
                } catch (e) {
                    enyo.error("Contacts addToExisting cross launch - AccountsList.getProvider error");
                }
                if (!newContactKind) {
                    newContactKind = "com.palm.contact.palmprofile:1";
                }
                newContact.setKind(newContactKind);

                personFullName = personToLink.getName().getFullName();
                if (!personFullName || Foundations.StringUtils.isBlank(personFullName)) {
                    // pull the name from the existingPerson that was tapped on in the people picker
                    newContact.getName().set(existingPerson.getName());
                }

                existingPerson._savePersonAttachingTheseContacts(linkedContacts.concat(newContact)).then(this, function (saveNewContactFuture) {
                    if (saveNewContactFuture.exception) {
                        this.addingExistingFailed(saveNewContactFuture.exception);
                        return;
                    }
                    this.addingExistingSucceeded(existingPerson);
                });
            } else {
                // Copy the person data to the contact that we are going to add to
                contactToAddTo.addContactDataFromPerson(personToLink);
                existingPerson.fixupNoReloadContacts().then(this, function () {
                    contactToAddTo.save().then(this, function (updateExistingContactFuture) {
                        if (updateExistingContactFuture.exception) {
                            this.addingExistingFailed(updateExistingContactFuture.exception);
                            return;
                        }

                        this.addingExistingSucceeded(existingPerson);
                    });
                });
            }
        });
    },
    closePersonLinkList    : function () {
        this.$.PersonLinkList.clearSearchField();
        this.$.PersonLinkList.close();
    },
    closeAddToExistingList : function () {
        this.$.AddToExistingPersonSelector.close();
    },
    closeFavoriteList      : function () {
        this.$.AddFavoriteList.clearSearchField();
        this.$.AddFavoriteList.close();
    },
    addingExistingFailed   : function (exception) {
        if (exception) {
            enyo.error("Contacts app - EXCEPTION adding existing : " + exception);
        }
        this.personToLink = null; //this was a global from the crosslaunch that needs to be cleared
        this.$.AddToExistingPersonSelector.close();
    },
    addingExistingSucceeded: function (existingPerson) {
        this.personToLink = null; //this was a global from the crosslaunch that needs to be cleared
        this.$.AddToExistingPersonSelector.close();
        this.$.splitPane.showPerson(null, existingPerson.getId());

    },
    transformContact       : function (contact) {
        //TODO: the old schema needs to be mapped to the new schema
        //	 * old schema: http://developer.palm.com/index.php?option=com_content&view=article&id=1701
        //	 * new schema: https://wiki.palm.com/display/Bedlam/Contacts+Schema

        //TODO: we might need to do more here

        //move email addresses
        if (Array.isArray(contact.emailAddresses) && !contact.emails) {
            contact.emails = contact.emailAddresses;
            contact.emailAddresses = undefined;
        }

        //move im addresses
        if (Array.isArray(contact.imNames) && !contact.ims) {
            contact.ims = contact.imNames;
            contact.imNames = undefined;
        }

        return contact;
    },

    unloadHandler        : function (e) {
        // Destroy component tree on window unload, so we can rely on destructors for cleanup.
        this.destroy();
    },
    editClose            : function (inSender, inEditData) {
        if (!inEditData) {
            inEditData = {};
        }

        // Notes: Please see the notes in editClick for the reasons of why we need this.lastEditData
        if (inEditData.action === Edit.Action.CANCELLED || inEditData.action === Edit.Action.UPDATED) {
            // It is possible for a user to edit a contact, cancel, click 'Add Contact', cancel, then go click edit of the same contact,
            // therefore don't clear the personId
            if (inEditData.personId) {
                this.lastEditData = {'action': inEditData.action, 'personId': inEditData.personId};
            }
        } else {
            this.lastEditData = undefined;
        }

        if (inEditData.action === Edit.Action.DELETED) {
            this.$.splitPane.showPerson(null, null);
        } else if (inEditData.action === Edit.Action.INSERTED) {
            this.$.splitPane.showPerson(null, inEditData.personId);
        }

        this.$.pane.selectViewByName("splitPane");

        if (this.editClosedCallback) {
            this.editClosedCallback(inSender, inEditData);
        }
    },
    preferencesClick     : function () {
        this.$.pane.selectViewByName("prefs");
        this.$.prefs.setupGlobals(AccountsList, AppPrefs);
    },
    searchCriteriaUpdated: function (inSender) {
        this.$.splitPane.setPersonId("");
    },
    openAppMenuHandler   : function () {
        this.$.appMenu.open();
    },
    closeAppMenuHandler  : function () {
        this.$.appMenu.close();
    },
    isWide               : function () {
        return (document.body.offsetWidth > this.wideWidth);
    },
    linkProfilesTap      : function () {
        this.$.PersonLinkList.validateComponents();
        this.$.PersonLinkList.setExclusions([this.$.splitPane.getDetailsViewPersonId()]);
        this.$.PersonLinkList.openAtCenter();
    },
    continueCrossLaunch  : function () {
        this.$.splitPane.editPerson();
        this.$.pane.selectViewByName("edit");
    },
    editClick            : function (inSender, inPerson) {
        // Notes: this.lastEditData is needed since when in the Edit view the blur events save changes to the person obj.  Therefore if
        //        the user has cancelled out of the edit view then go back and edit the same person, it needs to be reloaded again.
        //		  Another reason is if the user edits the same person again too quickly,we need to reload that person from the
        //		  the database again since the linked contacts don't seem to be fully updated.
        if (this.lastEditData &&
            (this.lastEditData.action === Edit.Action.CANCELLED || this.lastEditData.action === Edit.Action.UPDATED) &&
            this.lastEditData.personId === inPerson.getId()) {
            this.handleEditContact(this.lastEditData.personId);
        } else {
            this.editPerson(inPerson);
        }
    },
    addClick             : function (inSender) {
        this.editPerson();
    },
    editPerson           : function (inPerson) {
        this.$.pane.selectViewByName("edit");
        this.$.edit.setPerson(inPerson);
    },
    linkPersonTap        : function (inSender, inPerson) {
        this.$.splitPane.linkContact(inPerson);
        this.$.pane.selectViewByName("splitPane");
        this.$.PersonLinkList.clearSearchField();
        this.$.PersonLinkList.close();
    },
    prefsEditAccount     : function (inSender, inResults, inIsPalmprofile) {
        this.isPalmprofile = inIsPalmprofile;
        if (!this.isPalmprofile) {
            this.$.pane.selectViewByName("AccountsModify");
            this.$.AccountsModify.ModifyAccount(inResults.account, inResults.template, "CONTACTS");
        }
        this.$.getAccountNumContacts.call({query: {from: "com.palm.contact:1", where: [
            {prop: "accountId", op: "=", val: inResults.account._id}
        ], limit: 0}, count: true}); //query for the number of contacts in this account
    },
    prefsAddAccount      : function () {
        this.$.pane.selectViewByName("AccountsView");
        this.$.AccountsView.AddAccount(this.templates);
    },
    gotNumContactsFailure: function () {
        enyo.warn("Contacts failed to get the number of contacts account");
    },
    gotNumContactsResults: function (inSender, inResults) {
        if (inResults && "count" in inResults && typeof(inResults.count) === "number") {
            if (this.isPalmprofile === true) {
                this.$.contactCountDialog.validateComponents();
                this.$.contactCountDialog.setCount(inResults.count);
                this.$.contactCountDialog.openAtCenter();
            } else {
                this.$.numContactsItem.setContent(inResults.count);
                enyo.asyncMethod(this.$.numContactsGroup, "show");
            }
        } else {
            this.gotNumContactsFailure();
        }
    },
    showRingtones        : function (inSender, ringtone) {
        this.$.ringtones.setRingtone(ringtone);
        this.$.pane.selectViewByName("ringtones");
    },
    ringtoneChange       : function (inSender, inRingtone) {
        this.$.edit.saveRingtone(inRingtone);
    },
    onBeginTransaction   : function () {
        this.$.splitPane.setEditButtonDisabled(true);
    },
    onEndTransaction     : function () {
        this.$.splitPane.setEditButtonDisabled(false);
    },
    onGotVCardContact    : function (inSender, inRawContact) {
        this.addNewContact(inRawContact);
    },
    paneAddView          : function (inSender, inName) {
        if (inName === "edit") {
            // Dynamically create the edit view so that we can attach the transactionMgr
            return {name      : "edit", kind: "Edit", flex: 1,
                onShowPerson  : "showPerson", onShowRingtones: "showRingtones", onExit: "editClose",
                transactionMgr: this.$.transactionMgr};
        }
    },
    resizeHandler        : function () { // oksana's doing here
        this.inherited(arguments);
        this.addRemoveClass("portrait", (window.innerWidth < window.innerHeight));
    },
    addNewContact        : function (inRawContact, inShowPrompt) {
        if (inShowPrompt === true) {
            this.$.AddToContactsDialog.showPrompt(inRawContact);
            return;
        }

        if (this.$.pane.getViewName() === "splitPane") {
            if (!this.$.edit) {
                this.$.pane.selectViewByName("edit", true);
            }
            this.$.edit.newContact(inRawContact);
            this.$.pane.selectViewByName("edit");
        } else {
            enyo.log("Can't add a new contact while in view: " + this.$.pane.getViewName());
        }
    },
    addToExistingContact : function (inRawContact) {
        this.personToLink = inRawContact;
        if (this.personToLink) {
            this.$.AddToExistingPersonSelector.openAtCenter();
        }
    },
    backHandler          : function (inSender, inEvent) {
        var n = this.$.pane.getViewName();
        if (n !== "contacts" && (!this._wide || n !== "details")) {
            if (n === "details") {
                this.$.pane.selectViewByName("splitPane");
            } else {
                this.$.pane.back();
            }
            inEvent.preventDefault();
        }
    }
});
