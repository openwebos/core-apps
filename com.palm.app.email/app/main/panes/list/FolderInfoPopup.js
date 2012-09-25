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
    name: "FolderInfoPopup",
    kind: "enyo.ModalDialog",

    dismissWithClick: true,

    published: {
        items: [] // array of { account: account, components: UI components for folder }
    },

    components: [
        {name: "scroller", kind: "BasicScroller", autoVertical: true, vertical: false, style: "max-height: 300px;", components: [
            {name: "repeater", kind: "Repeater", onSetupRow: "getItem"}
        ]},
        {kind: "Button", caption: $L("Close"), onclick: "closeClick"}
    ],

    create: function () {
        this.inherited(arguments);

        if (!this.folders) {
            this.folders = [];
        }
    },

    componentsReady: function () {
        this.inherited(arguments);

        this.itemsChanged();
    },

    itemsChanged: function () {
        if (this.$.repeater) {
            this.$.repeater.render();
        }
    },

    getItem: function (inSender, index) {
        if (index < this.items.length) {
            var details = this.items[index];
            var acct = details.account;
            var accountIconPath = enyo.application.accounts.getIconById(acct.getId());


            return [
                {kind: "HFlexBox", className: "folder-info-item", components: [
                    {kind: "Image", style: "padding-right:4px", className: "account-icon", src: accountIconPath},
                    {kind: "Control", flex: 1, components: [
                        {className: "account-name", content: enyo.string.escapeHtml(acct.getAlias() || "")},
                        {className: "account-email", content: enyo.string.escapeHtml(acct.getEmailAddress())},
                        {kind: "Control", components: details.components, owner: details.owner}
                    ]}
                ]}
            ];
        }
    },

    closeClick: function () {
        this.close();
    }
});