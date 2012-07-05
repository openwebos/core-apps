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
/*global _, document, enyo, console, $L, ContactsLib */

enyo.kind({
    name                        : "VCardHelper",
    kind                        : enyo.Component,
    events                      : {
        onGotVCardContact: ""
    },
    components                  : [
        {name: "vCardService", kind: "PalmService", service: "palm://com.palm.service.contacts/"},
        {name: "importVCardDialog", kind: "OKCancelDialog", caption: $L("Import VCard"), onBeforeOpen: "onBeforeOpenVCardDialog", modal: false, dismissWithClick: true, onOK: "onImportVCardDialogOK"},
        {name: "importVCardErrorDialog", kind: "OKCancelDialog", caption: $L("Import VCard Error"), onBeforeOpen: "onBeforeOpenVCardErrorDialog", showOkBtn: false, modal: false, dismissWithClick: true, onOK: "onImportVCardDialogOK"}
    ],
    constructor                 : function () {
        this.inherited(arguments);
    },
    handleVCardLaunch           : function (launchParams) {
        this.curLaunchParams = launchParams;
        this.vCardCount = undefined;
        this.vCardTarget = undefined;

        this.$.vCardService.call(
            {filePath: launchParams.target},
            {method: "countVCardContacts", onSuccess: "countVCardContactsSuccess", onFailure: "countVCardContactsFailure"}
        );
    },
    importVCard                 : function (inTarget) {
        this.$.vCardService.call(
            {filePath: inTarget},
            {method: "importVCard", onSuccess: "importVCardSuccess", onFailure: "importVCardFailure"}
        );
    },
    countVCardContactsSuccess   : function (inSender, resp) {
        this.$.vCardService.cancelCall();
        enyo.log("VCard Response is: " + JSON.stringify(resp));
        var delay = function () {
            if (resp.count === 1) {
                this.$.vCardService.call(
                    {filePath: this.curLaunchParams.target},
                    {method: "readVCard", onSuccess: "readVCardSuccess", onFailure: "readVCardFaiure"}
                );
            } else {
                var message = $L("Would you like to import #{count} contacts?  This could take a few minutes."),
                    template = new enyo.g11n.Template(message);
                message = template.evaluate({
                    count: resp.count
                });

                this.vCardCount = resp.count;
                this.vCardTarget = this.curLaunchParams.target;
                this.$.importVCardDialog.openDialog(message);
            }
        }.bind(this);
        _.defer(delay);
    },
    countVCardContactsFailure   : function () {
        enyo.log("Count VCard Failed!");
        this.$.vCardService.cancelCall();
        this.$.importVCardErrorDialog.openDialog($L("There was a problem reading this vcard."));
    },
    readVCardSuccess            : function (inSender, vcardInfo) {
        this.$.vCardService.cancelCall();
        if (vcardInfo && vcardInfo.contacts && vcardInfo.contacts.length > 0) {
            this.doGotVCardContact(vcardInfo.contacts[0]);
        }
    },
    readVCardFaiure             : function () {
        this.$.vCardService.cancelCall();
        enyo.log("Read VCard Failed!");
    },
    importVCardSuccess          : function (inSender, inResponse) {
        this.$.vCardService.cancelCall();
        if (this.vCardCount) {
            var message = $L("#{successes} contacts imported"),
                template = new enyo.g11n.Template(message);

            message = template.evaluate({
                successes: this.vCardCount
            });
            enyo.windows.addBannerMessage(message, "{}");
            enyo.log("Import VCard Success = ");
        }
    },
    importVCardFailure          : function (inSender, inResponse) {
        this.$.vCardService.cancelCall();
        // Note: This is being called even though the VCard has imported contacts
        //enyo.log("Import VCard Failed!");
    },
    onImportVCardDialogOK       : function () {
        enyo.windows.addBannerMessage($L("Importing VCard..."), "{}");
        this.importVCard(this.vCardTarget);
    },
    onBeforeOpenVCardDialog     : function () {
        this.$.importVCardDialog.renderMessage();
    },
    onBeforeOpenVCardErrorDialog: function () {
        this.$.importVCardErrorDialog.renderMessage();
    }
});
