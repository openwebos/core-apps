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
    name: "EmailViewerWindow",
    kind: "Control",
    className: "enyo-bg",

    components: [
        {kind: "ApplicationEvents", onResize: "resizeHandler", onUnload: "unloadHandler", onWindowActivated: "windowActivatedHandler"},
        {kind: "MessagePane", name: "messageView", className: "enyo-fit", standalone: true,
            onComposeMessage: "composeMessage", onMessageDeleted: "messageDeleted"
        },

        {name: "appMenu", kind: "AppMenu", components: [
            {name: "printMenuItem", caption: $L("Print"), onclick: "printClick"},
            {name: "help", caption: $L("Help")}
        ]}
    ],

    create: function () {
        this.inherited(arguments);

        console.log("created new EmailViewerWindow");

        this.$.messageView.showLoadingPane();

        if (enyo.windowParams.target) {
            console.log("opening uri " + enyo.windowParams.target);

            // Load URI
            // FIXME validate account id?
            this.$.messageView.setDefaultAccountId(enyo.windowParams.accountId);
            this.$.messageView.setUri(enyo.windowParams.target);
        } else if (enyo.windowParams.message) {
            console.log("opening message " + enyo.windowParams.message);
            this.$.messageView.setMessage(enyo.windowParams.message);
        }
    },

    unloadHandler: function () {
        // Destroy component tree on window unload, so we can rely on destructors for cleanup.
        this.destroy();
    },

    rendered: function () {
        this.inherited(arguments);
        console.log("rendered!");

        setTimeout(enyo.hitch(this, "resizeHandler"), 1);
    },

    windowActivatedHandler: function () {
        this.$.messageView.activate();
        this.$.messageView.currentMessage().hookupSenderPhoto();
    },

    resizeHandler: function () {
        this.$.messageView.currentMessage().resize();
        this.inherited(arguments);
    },

    messageDeleted: function () {
        window.close();
    },

    composeMessage: function (inSender, params) {
        enyo.application.launcher.launchCompose(params);
    },

    printClick: function (inSender) {
        // FIXME use configurable menu
        this.$.messageView.printClick(inSender);
    }
});
