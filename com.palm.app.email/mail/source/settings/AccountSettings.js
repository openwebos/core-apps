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

/*global enyo,$L,AccountPreferences */
enyo.kind({
    name: "AccountSettings",
    width: "100%",
    kind: "VFlexBox",
    className: "basic-back enyo-bg",
    events: {
        onPreferenceChanged: ""
    },
    components: [
        {
            name: "header",
            kind: "Toolbar",
            pack: "center",
            className: "enyo-toolbar-light accounts-header",
            components: [
                {
                    name: "accountIcon",
                    kind: "Image",
                    className: "headerImage"
                },
                {
                    kind: "Control",
                    name: "headerLabel",
                    className: "header-welcome-text vertical-center",
                    content: $L("Account Settings")
                }
            ]
        },
        {className: "accounts-header-shadow"},
        {kind: "Scroller", flex: 1, components: [
            {kind: "VFlexBox", className: "box-center", components: [
                {
                    kind: "RowGroup",
                    caption: $L("ACCOUNT NAME"),
                    components: [
                        {
                            name: "accountName",
                            kind: "Input",
                            value: "",
                            style: "font-size: 0.8rem;",
                            oninput: "valueChanged"
                        },
                    ]
                },
                {
                    kind: "RowGroup",
                    name: "realNameGroup",
                    caption: $L("FULL NAME"),
                    components: [
                        {
                            name: "realName",
                            kind: "Input",
                            value: "",
                            oninput: "valueChanged"
                        },
                    ]
                },
                {
                    name: "newMessageNotifications",
                    kind: "RowGroup",
                    caption: $L("NEW MESSAGE"),
                    components: [
                        {
                            kind: "LabeledContainer",
                            caption: $L("Show Icon"),
                            style: "font-size: 0.8rem;",
                            components: [
                                {
                                    kind: "ToggleButton",
                                    state: true,
                                    name: "showNotification",
                                    onChange: "valueChanged"
                                }
                            ]
                        },
                        // idx 1
                        {
                            name: "notificationType",
                            kind: "ListSelector",
                            label: $L("Alert"),
                            value: AccountPreferences.NOTIFICATION_SYSTEM,
                            onChange: "toggleRingtonePicker",

                            items: [
                                {caption: $L("Vibrate"), value: AccountPreferences.NOTIFICATION_VIBRATE},
                                {caption: $L("System Sound"), value: AccountPreferences.NOTIFICATION_SYSTEM},
                                {caption: $L("Ringtone"), value: AccountPreferences.NOTIFICATION_RINGTONE},
                                {caption: $L("Mute"), value: AccountPreferences.NOTIFICATION_MUTE}
                            ]
                        },
                        // idx: 2
                        {name: "ringyRingy", kind: "HFlexBox", height: "32px", components: [
                            {
                                name: "ringtoneSelector",
                                onclick: "selectRingtone",
                                style: "font-size:0.8rem;",
                                content: $L("Select Ringtone")
                            },
                            {flex: 1},
                            {
                                name: "ringtoneName",
                                style: "width: 2.1em; padding-top: 5px;",
                                className: "ringtoneSelected enyo-text-ellipsis"
                            }
                        ]}
                    ]
                },
                {
                    kind: "RowGroup",
                    caption: $L("SIGNATURE"),
                    components: [
                        {
                            name: "signature",
                            kind: "RichText",
                            onkeypress: "valueChanged",
                            onfocus: "checkNoSigPlaceholder"
                        },
                    ]
                },
                {
                    kind: "RowGroup",
                    name: "replyToGroup",
                    caption: $L("REPLY-TO ADDRESS"),
                    components: [
                        {name: "replyTo", kind: "Input", inputType: "email", value: "", oninput: "valueChanged"}
                    ]
                },
                {
                    kind: "RowGroup",
                    caption: $L("SYNC CRITERIA"),
                    components: [
                        {
                            name: "lookback",
                            kind: "ListSelector",
                            label: $L("Show Email"),
                            value: AccountPreferences.LOOKBACK_3_DAYS,
                            items: [
                                {caption: $L("1 day"), value: AccountPreferences.LOOKBACK_1_DAY},
                                {caption: $L("3 days"), value: AccountPreferences.LOOKBACK_3_DAYS},
                                {caption: $L("7 days"), value: AccountPreferences.LOOKBACK_7_DAYS},
                                {caption: $L("2 weeks"), value: AccountPreferences.LOOKBACK_2_WEEKS},
                                {caption: $L("1 month"), value: AccountPreferences.LOOKBACK_1_MONTH},
                                {caption: $L("All"), value: AccountPreferences.LOOKBACK_FOREVER}
                            ],
                            onChange: "valueChanged"
                        },
                        {
                            name: "syncFreq",
                            kind: "ListSelector",
                            label: $L("Get Email"),
                            value: AccountPreferences.SYNC_PUSH,
                            items: [
                                {caption: $L("As Items Arrive"), value: AccountPreferences.SYNC_PUSH},
                                {caption: $L("5 minutes"), value: AccountPreferences.SYNC_5_MINS},
                                {caption: $L("10 minutes"), value: AccountPreferences.SYNC_10_MINS},
                                {caption: $L("15 minutes"), value: AccountPreferences.SYNC_15_MINS},
                                {caption: $L("30 minutes"), value: AccountPreferences.SYNC_30_MINS},
                                {caption: $L("1 Hour"), value: AccountPreferences.SYNC_1_HR},
                                {caption: $L("6 Hours"), value: AccountPreferences.SYNC_6_HRS},
                                {caption: $L("12 Hours"), value: AccountPreferences.SYNC_12_HRS},
                                {caption: $L("24 Hours"), value: AccountPreferences.SYNC_24_HRS},
                                {caption: $L("Manual"), value: AccountPreferences.SYNC_MANUAL}
                            ],
                            onChange: "valueChanged"
                        }
                    ]
                },
                {
                    name: "popDeleteSync",
                    kind: "enyo.Control",
                    components: [
                        {
                            kind: "RowGroup",
                            components: [
                                {
                                    kind: "LabeledContainer",
                                    caption: $L("Sync deleted emails"),
                                    components: [
                                        {
                                            kind: "ToggleButton",
                                            state: true,
                                            name: "syncDeleteToServer",
                                            onChange: "valueChanged"
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            nodeTag: "div",
                            content: $L("Delete email from server when deleted on device.")
                        },
                        {
                            kind: "RowGroup",
                            components: [
                                {
                                    kind: "LabeledContainer",
                                    caption: $L("Sync server to device"),
                                    components: [
                                        {
                                            kind: "ToggleButton",
                                            state: true,
                                            name: "syncServerDelete",
                                            onChange: "valueChanged"
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            nodeTag: "div",
                            content: $L("Delete email on device when deleted from server.")
                        }
                    ]
                },
                {
                    kind: "RowGroup",
                    caption: $L("DEFAULT FOLDERS"),
                    name: "folderGroup",
                    components: [
                        {kind: "ListSelector", name: "defSent", label: $L("Sent"), onChange: "valueChanged"},
                        {kind: "ListSelector", name: "defDraft", label: $L("Drafts"), onChange: "valueChanged"},
                        {kind: "ListSelector", name: "defTrash", label: $L("Trash"), onChange: "valueChanged"},
                        {name: "foldersNotAvailable", content: $L("Not yet available")}
                    ]
                },
                {kind: "ActivityButton", caption: $L("Change login settings"), onclick: "editLogin", className: "enyo-button-light"},
                {kind: "Accounts.RemoveAccount", name: "removeButton", onAccountsRemove_Done: "doAccountsModify_Done", style: "padding: 1px 0;"}
            ]}
        ]},
        {kind: "Toolbar", className: "enyo-toolbar-light", components: [
            {kind: "Button", caption: $L("Done"), className: "enyo-button-dark", width: "300px", onclick: "doBack"}
        ]},
        {name: "ringtonePicker", kind: "FilePicker", fileType: "ringtone", onPickFile: "setRingtone"},
        // services
        {name: "modifyAccount", kind: "PalmService", service: enyo.palmServices.accounts, method: "modifyAccount", onResponse: "doAccountsModify_Done"},
        {name: "deleteAccount", kind: "PalmService", service: enyo.palmServices.accounts, method: "deleteAccount", onResponse: "doAccountsModify_Done"}
    ],
    /** end ui components */
    pushFreq: {caption: $L("As Items Arrive"), value: AccountPreferences.SYNC_PUSH},
    wasEdited: false,
    create: function () {
        this.inherited(arguments);
    },

    checkNoSigPlaceholder: function () {
        // this is a bit of a hack, but fixes functionality for friday
        var siggy = this.$.signature;
        if (siggy.getHtml() === AccountPreferences.NO_SIGNATURE_BY_USER) {
            siggy.setValue("");
        }
    },

    _loadFolders: function (account) {
        var accountId = account.getId();
        var defSent = this.$.defSent, defDraft = this.$.defDraft, defTrash = this.$.defTrash, folderGroup = this.$.folderGroup;
        [defSent, defDraft, defTrash].forEach(function (row) {
            row.setShowing(false)
        });

        var noFolderDiv = this.$.foldersNotAvailable;
        noFolderDiv.setShowing(true);

        var onComplete = function (toShow) {
            noFolderDiv.setShowing(false);
        }
        // TODO: refactor this sig
        // Note, even though second param is technically used in callback,
        // it is not the desired behavior for every case the referenced load fn handles.
        // Not a bug, so don't refactor.
        Folder.loadIndentedFolderItems(accountId, defSent, account.getSentFolderId(), undefined, function () {
            defSent.setShowing(true);
            onComplete()
        });
        Folder.loadIndentedFolderItems(accountId, defDraft, account.getDraftsFolderId(), undefined, function () {
            defDraft.setShowing(true);
            onComplete()
        });
        Folder.loadIndentedFolderItems(accountId, defTrash, account.getTrashFolderId(), undefined, function () {
            defTrash.setShowing(true);
            onComplete()
        });

        // gmail doesn't allow you to change the sent folder
        this.$.defSent.setDisabled(account.getTemplateId() === "com.palm.google");
    },

    doBack: function () {
        if (this.wasEdited) {
            // save account
            this.saveAccount();
        }
        this.owner.showPreferences();
    },

    doAccountsModify_Done: function () {
        this.owner.showPreferences();
    },

    toggleRingtonePicker: function (sender, event) {
        //EmailApp.Util.printObj("### this is our drawer component ", this.$.drawer);
        var notificationType = this.$.notificationType.getValue();

        var notifBlock = this.$.newMessageNotifications;
        var elemIdx = notifBlock.indexOfControl(this.$.ringyRingy);

        if (notificationType === AccountPreferences.NOTIFICATION_RINGTONE) {
            if (this.ringtone) {
                this.$.ringtoneName.setContent(this.ringtone.name);
            }
            notifBlock.showRow(elemIdx);
        } else {
            notifBlock.hideRow(elemIdx);
        }
        this.valueChanged();
    },

    saveAccountName: function () {
        // account name needs to be saved through accounts service
        var name = this.$.accountName.getValue();
        if (name !== this.account.getAlias()) {
            this.$.modifyAccount.call({
                "accountId": this.account.getId(),
                "object": {
                    "alias": name
                }
            })
        }
        ;
    },

    saveAccount: function () {

        var ringtoneName = "";
        var ringtonePath = "";
        var notificationType = this.$.notificationType.getValue();
        if (notificationType === AccountPreferences.NOTIFICATION_RINGTONE) {
            if (this.ringtone.path) {
                ringtoneName = this.ringtone.name;
                ringtonePath = this.ringtone.path;
            } else {
                var prefs = AccountPreferences.getPrefsByAccountId(this.currentAccountId);
                notificationType = prefs.notifications.type || AccountPreferences.NOTIFICATION_SYSTEM;
            }
        }


        var toSave = {
            _id: this.currentAccountId,
            syncFrequencyMins: this.$.syncFreq.value,
            syncWindowDays: this.$.lookback.value,
            realName: this.$.realName.getValue(),
            replyTo: this.$.replyTo.value,
            signature: this.$.signature.getHtml(),
            notifications: {
                "enabled": this.$.showNotification.getState(),
                "ringtoneName": ringtoneName,
                "ringtonePath": ringtonePath,
                "type": notificationType
            },
            deleteFromServer: this.$.syncDeleteToServer.getState(),
            deleteOnDevice: this.$.syncServerDelete.getState(),
            sentFolderId: this.$.defSent.getValue(),
            trashFolderId: this.$.defTrash.getValue(),
            draftsFolderId: this.$.defDraft.getValue()
        };

        AccountPreferences.saveAccountPreferences(toSave);
        this.saveAccountName(); // save account name second
    },

    removeAccount: function () {

        // Start the spinner on the button
        this.$.removeAccount.setActive(true);
        this.$.removeAccount.activeChanged();

        // Remove the capability from the array of capabilities.  This will disable it
        var acct = this.account;
        var caps = acct.getCapabilityProviders();
        for (var i = 0, l = caps.length; i < l; i++) {
            if (caps[i].capability === "MAIL") {
                caps.splice(i, 1);
                break;
            }
        }

        if (!caps.length) {
            // no capabilities left. Just delete the account
            this.$.deleteAccount.call({accountId: acct.getId()});
            return;
        }


        var param = {
            "accountId": acct.getId(),
            "object": {
                capabilityProviders: caps
            }
        }
        // Remove this capability from the account
        this.$.modifyAccount.call(param);
    },

    editLogin: function () {
        this.owner.showEditMode(this.currentAccountId);
    },

    loadAccount: function (accountId) {
        this.currentAccountId = accountId;

        console.log("### received the following account ID: " + accountId);
        // take provided accountId and set up in scene

        var accts = enyo.application.accounts;
        if (!accts || !accts.getDefaultAccountId) {
            return;
        }
        var account = this.account = accts.getAccount(accountId);

        // accounts UI's remove button needs the raw com.palm.account entry
        this.$.removeButton.init(account.getAccountData(), "MAIL");

        this._loadFolders(account);
        this.$.accountIcon.setSrc(accts.getIconById(accountId, true)); // this may be handled by the new class
        this.$.accountName.setValue(account.getAlias());
        this.$.realName.setValue(account.getRealName() || "");
        this.$.replyTo.setValue(account.getReplyTo() || "");

        // adjust sync option dropdowns
        if (account.getTemplateId() !== "com.palm.pop") {
            if (this.$.syncFreq.items[0].value !== this.pushFreq.value) {
                this.$.syncFreq.items.unshift(this.pushFreq);
            }
        } else if (this.$.syncFreq.items[0].value === this.pushFreq.value) {
            // pop should not have push
            this.$.syncFreq.items.shift();
        }
        this.$.syncFreq.setItems(this.$.syncFreq.items);

        // Set sync values in scene
        this.$.lookback.setValue(account.getSyncLookback());
        this.$.syncFreq.setValue(account.getSyncFrequency());
        this.$.signature.setValue(account.getSignature() || AccountPreferences.addStylingToSig(AccountPreferences.DEFAULT_SIG));
        this.$.notificationType.setValue(account.getNotificationType() || AccountPreferences.NOTIFICATION_SYSTEM);
        this.$.showNotification.setState(account.getNotificationsEnabled());
        this.$.syncDeleteToServer.setState(account.isDeviceDeleteSynced());
        this.$.syncServerDelete.setState(account.isServerDeleteSynced());

        this.ringtone = {};
        this.ringtone.name = account.getRingtoneName();
        this.ringtone.path = account.getRingtonePath();
        this.toggleRingtonePicker();

        // TODO: break out into a switch statement
        var isEAS = account.getType() === "EAS",
            isPop = account.getType() === "POP";
        this.$.folderGroup.setShowing(!isEAS && !isPop); // hide for right now. Show once moveToFolder is implemented(?????)
        this.$.popDeleteSync.setShowing(isPop);
        this.$.realNameGroup.setShowing(!isEAS);
        this.$.replyToGroup.setShowing(!isEAS);
        this.wasEdited = false;
    },
    getIconPath: function (acctId) {
        return enyo.application.accounts.getIconById(acctId, false);
    },

    selectRingtone: function () {
        this.$.ringtonePicker.pickFile();
    },

    setRingtone: function (sender, ringtone) {
        if (!ringtone.length) {
            return;
        }
        var toSet = ringtone[0];
        this.$.ringtoneName.setContent(toSet.name);
        var ring = this.ringtone = {};
        ring.name = toSet.name;
        ring.path = toSet.fullPath;
        this.valueChanged();
    },

    saveTrash: function (folderId) {
        console.log("### saving trash");
        this._saveDefFolder(folderId, "trash");
    },

    saveSent: function (folderId) {
        console.log("### saving sent");
        this._saveDefFolder(folderId, "sent");
        var div = this.$.defSent;
        this._setdefSelection(div, text);
    },

    _setDivSelection: function (div, text) {
        div.setContent(div.defStem + " -- " + enyo.application.folderProcessor.folders[folderId].displayName);
    },
    valueChanged: function (inSender, inEvent) {
        this.wasEdited = true;
    }
});
