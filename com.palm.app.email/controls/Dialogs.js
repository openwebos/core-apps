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

enyo.kind({
    name: "MailDialog",
    kind: "enyo.ModalDialog",

    published: {
        destroyOnClose: false
    },

    statics: {
        _displayMailDialog: function (owner, kind, params) {
            var props = { kind: kind, owner: owner, destroyOnClose: true };
            var params = enyo.mixin(props, params);

            var dialog = owner.createComponent(props);
            dialog.openAtCenter();
        },

        displayDialog: function (owner, params) {
            this._displayMailDialog(owner, this, params);
        }
    },

    doClose: function () {
        this.inherited(arguments);

        if (this.destroyOnClose && !this.destroyed) {
            this.destroy();
        }
    },
});

enyo.kind({
    name: "MailChoicesDialog",
    kind: "MailDialog",

    published: {
        buttonLayoutKind: "VFlexLayout",
        choices: [
            {caption: $L("OK"), onclick: ""}
        ]
    },

    create: function () {
        this.inherited(arguments);
    },

    componentsReady: function () {
        this.updateButtons();
    },

    buttonsChanged: function () {
        if (!this.lazy) {
            this.updateButtons();
        }
    },

    updateButtons: function () {
        var choiceButtons = [];
        for (var c = 0; c < this.choices.length; c++) {
            var button = enyo.mixin({kind: "Button"}, this.choices[c]);

            button._onclick = button.onclick;

            button.onclick = "handleChoice";
            button.owner = this;

            choiceButtons.push(button);
        }

        // Clear old buttons
        if (this.$.buttons) {
            this.$.buttons.destroy();
        }

        // Make sure there's at least an OK button
        if (choiceButtons.length === 0) {
            choiceButtons = [
                {caption: $L("OK"), onclick: ""}
            ];
        }

        // Create buttons
        this.createComponent({name: "buttons", layoutKind: this.buttonLayoutKind, components: choiceButtons, owner: this});
    },

    handleChoice: function (inSender) {
        if (inSender._onclick) {
            if (this.owner[inSender._onclick]) {
                this.owner[inSender._onclick](inSender);
            }
        }

        this.close();
    },
});

enyo.kind({
    name: "MailDialogPrompt",
    kind: "MailDialog",

    events: {
        onCancel: "",
        onAccept: ""
    },

    published: {
        message: "",
        cancelButtonCaption: $L("Cancel"),
        acceptButtonCaption: $L("OK")
    },

    statics: {
        displayPrompt: function (owner, params) {
            MailDialog._displayMailDialog(owner, this, params);
        }
    },

    components: [
        {name: "message", content: "", className: "palm-subtext palm-paragraph"},
        {kind: "HFlexBox", components: [
            {name: "cancelButton", kind: "Button", flex: 1, onclick: "cancelClick"},
            {name: "acceptButton", kind: "Button", flex: 1, onclick: "acceptClick", className: "enyo-button-negative"}
        ]}
    ],

    create: function () {
        this.inherited(arguments);
    },

    componentsReady: function () {
        this.inherited(arguments);

        this.$.message.setContent(this.message);

        if (this.cancelButtonCaption) {
            this.$.cancelButton.setCaption(this.cancelButtonCaption);
        } else {
            this.$.cancelButton.hide();
        }

        if (this.acceptButtonCaption) {
            this.$.acceptButton.setCaption(this.acceptButtonCaption);
        } else {
            this.$.acceptButton.hide();
        }
    },

    acceptClick: function () {
        this.doAccept();
        this.close();
    },

    cancelClick: function () {
        this.doCancel();
        this.close();
    },
});

enyo.kind({
    name: "ErrorDetails",
    kind: "Control",

    published: {
        error: null,
        details: null
    },

    components: [
        {name: "detailsExpander", className: "error-details-toggle", content: $L("Show error details"), onclick: "detailsClick", showing: false},
        {name: "detailsDrawer", kind: "Drawer", open: false, components: [
            {name: "details", className: "error-details-text", content: ""},
            {name: "rawError", className: "error-details-raw", content: ""},
        ]}
    ],

    create: function () {
        this.inherited(arguments);

        this.updateDetails();
    },

    errorChanged: function () {
        this.updateDetails();
    },

    detailsChanged: function () {
        this.updateDetails();
    },

    updateDetails: function () {
        if (this.error && this.error.errorCode) {
            var errorDesc = "";

            if (this.error.errorText) {
                var template = new enyo.g11n.Template($L("Error code #{errorCode}: #{errorText}"));
                errorDesc = template.evaluate({errorCode: this.error.errorCode || "", errorText: this.error.errorText || ""});
            } else {
                var template = new enyo.g11n.Template($L("Error code #{errorCode}"));
                errorDesc = template.evaluate({errorCode: this.error.errorCode || "", errorText: this.error.errorText || ""});
            }

            this.$.rawError.setContent(errorDesc);
        }

        if (this.details || (this.error && this.error.errorCode)) {
            this.$.details.setContent(this.details || "");
            this.$.detailsExpander.show();
        } else {
            this.$.detailsDrawer.setOpen(false);
            this.$.detailsExpander.hide();
        }
    },

    detailsClick: function () {
        this.$.detailsExpander.setContent(this.$.detailsDrawer.open ? $L("Show error details") : $L("Error details"));

        this.$.detailsDrawer.setOpen(!this.$.detailsDrawer.getOpen());
    }
});

enyo.kind({
    name: "MailErrorDialog",
    kind: "MailDialog",

    published: {
        caption: $L("Error"),
        message: "",
        details: "", /* plain text technical error description */
        error: null        /* error object, e.g. {errorCode: -1, errorText: "Some error text"} */
    },

    statics: {
        displayError: function (owner, params) {
            MailDialog._displayMailDialog(owner, this, params);
        }
    },

    components: [
        {className: "enyo-paragraph", components: [
            {name: "errorMessage", className: "enyo-text-body", content: ""},
            {name: "detailsExpander", className: "error-details-toggle", content: $L("Show error details"), onclick: "detailsClick", showing: false},
            {name: "detailsDrawer", kind: "Drawer", open: false, components: [
                {name: "details", className: "error-details-text", content: ""},
                {name: "rawError", className: "error-details-raw", content: ""},
            ]},
        ]},
        {name: "confirmButton", kind: "Button", caption: $L("OK"), onclick: "okClick"}
    ],

    create: function () {
        this.inherited(arguments);
    },

    componentsReady: function () {
        this.inherited(arguments);

        if (!this.caption && this.title) {
            this.setCaption(this.title);
        }

        this.$.errorMessage.setContent(this.message || "");

        if (this.error && this.error.errorCode) {
            var errorDesc = "";

            if (this.error.errorText) {
                var template = new enyo.g11n.Template($L("Error code #{errorCode}: #{errorText}"));
                errorDesc = template.evaluate({errorCode: this.error.errorCode || "", errorText: this.error.errorText || ""});
            } else {
                var template = new enyo.g11n.Template($L("Error code #{errorCode}"));
                errorDesc = template.evaluate({errorCode: this.error.errorCode || "", errorText: this.error.errorText || ""});
            }

            this.$.rawError.setContent(errorDesc);
        }

        if (this.details || (this.error && this.error.errorCode)) {
            this.$.details.setContent(this.details || "");
            this.$.detailsExpander.show();
        } else {
            this.$.detailsDrawer.setOpen(false);
            this.$.detailsExpander.hide();
        }
    },

    okClick: function () {
        this.close();
    },

    detailsClick: function () {
        this.$.detailsExpander.setContent(this.$.detailsDrawer.open ? $L("Show error details") : $L("Error details"));

        this.$.detailsDrawer.setOpen(!this.$.detailsDrawer.getOpen());
    }
});

/* Display an error dialog for reporting an account setup error.
 *
 * messageParams contains the following values:
 *
 * introMessage: "", // intro to the situation, e.g. "We were unable to validate the SMTP settings due to the following error:"
 * errorMessage: "", // user-friendly description of error, e.g. "The server's security certificate is invalid."
 * serverMessage: "", // non-localized error from server
 * followupHtml: "", // HTML content with suggested followup, e.g. "<a href="url">Unlock account</a>" or "Contact your IT department"
 * error: null, // internal error object used for detailed diagnostics
 */
enyo.kind({
    name: "MailSetupFailureDialog",
    kind: "MailChoicesDialog",

    published: {
        messageParams: {}
    },

    statics: {
        displaySetupFailure: function (owner, params) {
            MailDialog._displayMailDialog(owner, this, params);
        }
    },

    components: [
        {name: "introMessage", className: "enyo-paragraph"},
        {name: "errorMessage", className: "enyo-paragraph", style: "color: red"},
        {name: "serverMessageBlock", className: "enyo-paragraph", components: [
            {content: $L("The mail server responded:")},
            {name: "serverMessage", className: "server-message"},
        ]},
        {name: "followupHtml", allowHtml: true, className: "enyo-paragraph"},
        {name: "errorDetails", "kind": "ErrorDetails", className: "enyo-paragraph"}
    ],

    create: function () {
        this.inherited(arguments);
    },

    componentsReady: function () {
        this.inherited(arguments);
        this.update();
    },

    messageParamsChanged: function () {
        if (!this.lazy) {
            this.update();
        }
    },

    update: function () {
        this.setCaption(this.messageParams.title || "");

        this.$.introMessage.setContent(this.messageParams.introMessage || "");
        this.$.errorMessage.setContent(this.messageParams.errorMessage || "");

        this.$.serverMessage.setContent(this.messageParams.serverMessage || "");
        this.$.serverMessageBlock.setShowing(this.messageParams.serverMessage);

        // NOTE: This allows HTML! This should ONLY contain static/hardcoded text
        this.$.followupHtml.setContent(this.messageParams.followupHtml || "");

        this.$.errorDetails.setError(this.messageParams.error || null);
        this.$.errorDetails.setShowing(this.messageParams.error);
    }
});