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

/* Standalone email viewer window used for displaying message/rfc822 (.eml) files */
enyo.kind({
    name: "EmailViewerWindow",
    kind: "enyo.Control",
    className: "enyo-bg",

    components: [
        {kind: "ApplicationEvents", onResize: "resizeHandler", onUnload: "unloadHandler"},
        {name: "emailLoader", kind: "DbService", method: "get", dbKind: "com.palm.email:1", onResponse: "handleGetEmailResponse"},
        
        {name: "loadingPane", className: "enyo-fit", components: [
            {name: "loadingSpinner", kind: "enyo.SpinnerLarge"},
            {name: "loadError", content: $L("Error loading email"), showing: false}
        ]},
        
        {kind: "enyo.Scroller", className: "enyo-fit", components: [
            {kind: "MessageView", name: "messageView", standalone: true, showing: false, collapsible: false,
                onComposeMessage: "composeMessage"
            }
        ]},

        {name: "appMenu", kind: "AppMenu", components: [
            {name: "printMenuItem", caption: $L("Print"), onclick: "printClick"},
            {name: "help", caption: $L("Help")}
        ]}
    ],

    create: function () {
        this.inherited(arguments);

        console.log("created new EmailViewerWindow");
        
        // FIXME HACK this doesn't really belong here
        if (!enyo.application.contactCache) {
            enyo.application.contactCache = new ContactCache(300);
        }

        if (enyo.windowParams.target) {
            var uri = enyo.windowParams.target;
            
            uri = uri.replace("file://", "");
        
            this.log("opening uri " + uri);

            // Load URI
            this.email = this.createComponent({kind: "LocalFileEmail",
                uri: enyo.windowParams.target,
                onEmailLoaded: "emailLoaded",
                onLoadFailed: "loadFailed"
            });
        } else if (enyo.windowParams.emailId) {
            this.log("loading email id");
            this.$.emailLoader.call({ids: [enyo.windowParams.emailId]});
        }
    },
    
    handleGetEmailResponse: function (sender, response) {
        if (response && response.results && response.results.length > 0) {
            this.email = this.createComponent({kind: "DatabaseEmail", data: response.results[0]});
            this.emailLoaded();
        } else {
            this.loadFailed(this, response);
        }
    },
    
    emailLoaded: function () {
        console.log("email loaded");
    
        this.$.loadingPane.hide();
        this.$.loadingSpinner.hide();
    
        this.$.messageView.setEmail(this.email);
        this.$.messageView.show();
        this.$.messageView.setExpanded(true);
    },
    
    loadFailed: function (sender, response) {
        console.log("failed to load email: " + JSON.stringify(response));
        this.$.loadingSpinner.hide();
        this.$.loadError.show();
    },

    unloadHandler: function () {
        // Destroy component tree on window unload, so we can rely on destructors for cleanup.
        this.destroy();
    },

    composeMessage: function (inSender, params) {
        // Set default accountId if provided
        // TODO validate accountId
        if (!params.accountId && enyo.windowParams.accountId) {
            params.accountId = enyo.windowParams.accountId;
        }
    
        // FIXME refactor
        // Note for security the body path shouldn't be loaded from the compose window side,
        // so we still need to get it ourselves before launchCompose
        if (params.originalMessage) {
            // Load body text from original email
            var body = params.originalMessage.parts.filter(function (part) {
                return part.type === 'body';
            })[0];
            
            if (body) {
                var data = window.palmGetResource(body.path);
                
                if (!body.mimeType || body.mimeType !== "text/html") {
                    data = EmailApp.Util.convertTextToHtml(data);
                }
                
                params.bodyHTML = data;
            }
        }
    
        enyo.application.launcher.launchCompose(params);
    },

    printClick: function (inSender) {
        // FIXME use configurable menu
        this.$.messageView.printClick(inSender);
    }
});
