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

/*global enyo, console, EmailApp
 */
/*
 Attachments list that can display download progress, etc.

 Attachments can optionally be in a drawer, if there is >1.
 In that case, they're summarized when the drawer is closed.
 A tap replaces the summary with an open drawer, showing all attachments.
 The drawer closes automatically on any mousedown outside its content.

 Tapping an individual attachment will open it or download it (showing an inline progress bar with cancel button).

 */

/*********************
 * Attachments Block *
 *********************/
enyo.kind({
    name: "AttachmentsDrawer",
    kind: "Control",
    published: {
        attachments: null,
        collapsible: false,
        composeMode: false
    },

    events: {
        onAttachmentsRemoved: "",
        onInlineDownloaded: "",
        onOpenAnimationComplete: ""
    },

    components: [
        {name: "summaryBlock", className: "mail-attachment", onclick: "triggerDrawer", components: [
            {className: "attachment-icon", components: [
                {className: "attachment-count", showing: true, components: [
                    {name: "count", nodeTag: "span", className: "attachment-count-label"}
                ]}
            ]},

            {name: "summary", content: $L("summary"), className: "attachment-icon-label"}
        ]},
        {name: "drawer", kind: "Drawer", onOpenAnimationComplete: "kickAttachmentsScroll", components: [
            {name: "attachmentsScroll", kind: "BasicFadeScroller", autoVertical: true, vertical: false, style: "max-height:300px;", components: [
                {name: "list", kind: "Repeater", onSetupRow: "getAttachmentItem"}
            ]}
        ]},
        {name: "getResourceInfo", kind: "enyo.PalmService", service: enyo.palmServices.application,
            onSuccess: "openAttachment",
            onFailure: "cantFindAppError"
        },
        {name: "appOpen", method: "open", kind: "enyo.PalmService", service: enyo.palmServices.application,
            onFailure: "cantFindAppError"
        },

        {name: "attachmentMenu", kind: "enyo.PopupList", onSelect: "handleContextItem", items: [
            {caption: $L("Open"), action: "OPEN"},
            {caption: $L("Save Attachment"), action: "SAVE"},
            {caption: $L("Save All Attachments"), action: "SAVE ALL"}
        ]},
        {name: "preview", className: "attachment-preview", layoutKind: "VFlexLayout", kind: "Popup", components: [
            {name: "imageView", flex: 1, kind: "ImageView"},
            {kind: "HFlexBox", components: [
                {name: "closeButton", flex: 1, kind: "Button", caption: $L("Close"), onclick: "closePreview"},
                {name: "copyButton", flex: 1, kind: "Button", caption: $L("Copy To Photos"), onclick: "copyToPhotos"}
            ]}
        ]}
    ],

    create: function () {
        this.inherited(arguments);
        this.attachments = [];
    },

    inlineDownloadComplete: function () {
        this.doInlineDownloaded();
    },

    destroy: function () {
        // just in case
        this.email = null;
        this.message = null;
        this.attachments = [];

        this.inherited(arguments);
    },

    // Add attachments. toAdd is a list of part objects.
    addAttachments: function (toAdd) {
        for (var i = 0; i < toAdd.length; i++) {
            this.attachments.push(toAdd[i]);
        }

        this._attachmentsListChanged();
    },

    kickAttachmentsScroll: function (sender, event) {
        this.$.attachmentsScroll.resized();
        this.doOpenAnimationComplete();
    },

    handleSwipeDelete: function (inSender) {
        // FIXME index is stuffed on inSender.attachmentIndex since Repeaters don't pass the index
        var index = inSender.attachmentIndex;
        var part = this.attachments[index];

        this.attachments.splice(index, 1);

        this.doAttachmentsRemoved([part]);

        this._attachmentsListChanged();
    },

    handleContextItem: function (target) {
        var selectedItem = target.items[target.selected];
        var action = selectedItem && selectedItem.action;

        switch (action) {
        case "OPEN":
            this.doOpen();
            break;
        case "SAVE":
            this.doSaveSingle();
            break;
        case "SAVE ALL":
            this.doSaveAll();
            break;
        default:
            console.error("unknown attachment menu action");
        }
    },

    doSaveAll: function () {
        var attachments = this.attachments, Attachment = EmailApp.Facades.Attachment, message = this.message;
        attachments.forEach(function (attch) {
            // Try to generate a filename if the file is unnamed

            if (attch.path) {
                var fileName = EmailApp.Facades.Attachment.getAttachmentName(attch);

                Attachment.saveAttachment(attch.path, fileName, function () {
                    console.log("### Saved attachment.");
                });
            } else {
                Attachment.downloadAndSaveAttachment(message, attch);
            }
        });
        this.closeAttachmentMenu();
    },

    doSaveSingle: function () {
        var Attachment = EmailApp.Facades.Attachment;
        if (this.targetPart.path) {
            var fileName = EmailApp.Facades.Attachment.getAttachmentName(this.targetPart);

            Attachment.saveAttachment(this.targetPart.path, fileName, function () {
                console.log("### Saved attachment.");
            });
        } else {
            Attachment.downloadAndSaveAttachment(this.message, this.targetPart);
        }
        this.closeAttachmentMenu();
    },

    doOpen: function () {
        this.closeAttachmentMenu();

        var path = this.targetPart && this.targetPart.path;
        var that = this;
        EmailApp.Util.checkFilePath(path, function (path) {
            that.showAttachment(that.targetPart);
        }, function (path) {
            // Not downloaded yet. Start download.
            var item = that.getItemForPart(that.targetPart);

            if (item) {
                item.download();
            }
        });
    },

    getItemForIndex: function (index) {
        return this.$["attachmentItem_" + index];
    },

    getItemForPart: function (part) {
        for (var i = 0; i < this.attachments.length; i++) {
            var item = this.getItemForIndex(i);

            if (part && item.part && (item.part._id === part._id || item.part === part)) {
                return item;
            }
        }

        return undefined;
    },

    showAttachment: function (part, targetRow) {
        this.log();

        // need to hold onto the part becase getResourceInfo won't supply the
        // trimmed fileName to openAttachment
        this.targetPart = part;
        var path = part.path;
        var name = part.name;
        var mimeType = part.mimeType;

        mimeType = EmailApp.Util.finagleMimeType(path, mimeType) || "application/octet-stream";

        if (mimeType.indexOf("audio") === 0) {
            if (targetRow && !targetRow.isAudioControl()) {
                targetRow.showAudioControls(path);
                targetRow.render();
            }
            // Do nothing because the AudioTag widget handles taps for audio files?
        } else if (mimeType.indexOf("image") === 0) {
            // FIXME: Hack to get images displaying. We will be using a full featured
            // image viewer later. Remove this whole block when that happens.
            var newPath;

            // Extractfs and photos app don't support gif
            var isSupported = (mimeType.toLowerCase() !== "image/gif")

            if (isSupported) {
                newPath = "file:///var/luna/data/extractfs/" + path + ":0:0:600:600:3";
            } else {
                newPath = path;
            }

            this.$.preview.validateComponents();
            this.$.imageView.setCenterSrc(newPath);
            this.$.preview.setModal(false);

            var inFilecacheFilePath = "/var/file-cache";
            if (path.substring(0, inFilecacheFilePath.length) === inFilecacheFilePath) {
                this.$.copyButton.setDisabled(false);
            } else {
                this.$.copyButton.setDisabled(true);
            }

            this.$.copyButton.setShowing(isSupported);

            this.$.preview.openAtCenter();
        } else {
            if (path[0] === "/") {
                path = "file://" + path;
            }
            // check if this path works
            var request = this.$.getResourceInfo.call({
                uri: path,
                mime: mimeType,
                fileName: name
            });

            request.fileName = name;
            request.mimeType = mimeType;
        }
    },

    /** different than show. Used to open attachment in a corresponding application */
    openAttachment: function (target, resourceInfo) {
        console.log("### time to open the attachment");
        if (resourceInfo.returnValue && resourceInfo.appIdByExtension) {
            var params = {
                'target': resourceInfo.uri,
                'mimeType': resourceInfo.mimeByExtension,
                'fileName': this.targetPart && this.targetPart.name || resourceInfo.fileName
            };

            // Try to generate a filename if the file is unnamed
            if (!params.fileName) {
                params.fileName = EmailApp.Facades.Attachment.generateAttachmentName(params.mimeType);
            }

            /*
             var crossAppScene = {
             'com.palm.app.videoplayer': 'nowplaying',
             'com.palm.app.streamingmusicplayer': 'nowplaying'
             };


             //If an App doesn't support cross-app launch then open it in a separate window.
             if (crossAppScene[appid]) {
             var args = { appId: appid, name: crossAppScene[appid] };
             controller.stageController.pushScene(args, params);
             return;
             }
             */

            // Special handling for .EML attachments. Include the accountId of the original email.
            if (params.mimeType === "message/rfc822") {
                params.accountId = this.email.getAccountId() || null;
            }

            this.$.appOpen.call({
                'id': resourceInfo.appIdByExtension,
                'params': params
            });

            console.log("### opening attachment with app " + resourceInfo.appIdByExtension);
        } else {
            this.doError();
        }
    },

    showAttachmentMenu: function (part, event) {
        this.targetPart = part;
        if (!this.composeMode) {
            this.$.attachmentMenu.validateComponents();
            this.$.attachmentMenu.setModal(false);
            this.$.attachmentMenu.openAtEvent(event);
        }
    },

    closeAttachmentMenu: function () {
        if (this.$.attachmentMenu) {
            this.$.attachmentMenu.close();
        }
    },

    /* end attachment methods */


    mousedownHandler: function (inSender, inEvent) {
        // If mousedown occurred outside me...
        if (!inEvent.dispatchTarget.isDescendantOf(this)) {

            // Release the event capture.
            enyo.dispatcher.release(this);

            // Make sure drawer is collapsed.
            if (this.$.drawer.open) {
                this.triggerDrawer();
            }
        }
    },

    openDrawer: function () {
        if (!this.$.drawer.open) {
            this.triggerDrawer();
        }
    },

    triggerDrawer: function () {
        var open;

        if (this.collapsible && this.attachments.length > 1) {
            open = this.$.drawer.open;

            this.$.drawer.setAnimate(true);
            this.$.drawer.setOpen(!open);
            this.$.summaryBlock.setShowing(open);

            if (!open) {
                enyo.dispatcher.capture(this, true);
            }
        }
    },

    setEmail: function (email) {
        this.email = email;
        this.message = email && email.data;

        if (!email) {
            this.attachments = [];
            this.$.list.destroyControls();
            return;
        }

        var attachments = email.getAttachments();

        // Hack to fake out some attachments:
        if (window.fauxMail || !window.PalmSystem) {
            attachments = (function () {
                var result = [
                    {
                        _id: "1",
                        name: "image.jpg",
                        path: "/media/internal/image.jpg",
                        type: "attachment",
                        estimatedSize: 321
                    },
                    {
                        _id: "2",
                        name: "image2.png",
                        path: "",
                        type: "inline",
                        estimatedSize: 4321
                    },
                    {
                        _id: "3",
                        name: "image3.gif",
                        path: "",
                        type: "attachment",
                        estimatedSize: 654321
                    },
                    {
                        _id: "4",
                        name: "my.mimeImage",
                        mimeType: "image/jpeg",
                        path: "",
                        type: "attachment",
                        estimatedSize: 7654321
                    },
                    {
                        _id: "5",
                        name: "pathImage",
                        path: "/var/foo/image.jpg",
                        type: "attachment"
                    },
                    {
                        _id: "6",
                        name: "mime.Audio.mpeg",
                        mimeType: "audio/whatever",
                        path: "",
                        type: "attachment"
                    },
                    {
                        _id: "7",
                        name: "mimeVideo.ogg",
                        mimeType: "video/foo",
                        path: "",
                        type: "attachment"
                    },
                    {
                        _id: "8",
                        name: "mimePlainTxt.txt",
                        mimeType: "text/plain",
                        path: "",
                        type: "attachment"
                    },
                    {
                        _id: "9",
                        name: "mimeVCard.vcard",
                        mimeType: "text/x-vcard",
                        path: "",
                        type: "attachment"
                    },
                    {
                        _id: "10",
                        name: "mimeDOC.doc",
                        mimeType: "application/msword",
                        path: "",
                        type: "attachment"
                    },
                    {
                        _id: "11",
                        name: "mimeXLS.xls",
                        mimeType: "application/excel",
                        path: "",
                        type: "attachment"
                    },
                    {
                        _id: "12",
                        name: "mimePPT.ppt",
                        mimeType: "application/powerpoint",
                        path: "",
                        type: "attachment"
                    },
                    {
                        _id: "13",
                        name: "mimePDF.pdf",
                        mimeType: "application/pdf",
                        path: "",
                        type: "attachment"
                    }
                ];
                result.length = Math.round(Math.random() * result.length);
                result.forEach(function (a) {
                    email.data.parts.push(a);
                });

                return result;
            })();
        }

        this.attachments = attachments;
        this._attachmentsListChanged();
    },

    _attachmentsListChanged: function () {
        // Show attachments list at all?
        if (this.attachments.length < 1) {
            this.setShowing(false);
        } else {
            // trigger is visible only if >1 attachment
            if (this.attachments.length > 1 && this.collapsible) {
                this.$.summaryBlock.setShowing(true);
                this.$.summary.setContent(this.generateSummary(this.attachments));
                this.$.drawer.setAnimate(false);
                this.$.drawer.setOpen(false);
            } else {
                this.$.summaryBlock.setShowing(false);
                this.$.drawer.setAnimate(false);
                this.$.drawer.setOpen(true);
            }

            this.setShowing(true);
        }

        // Set count
        this.$.count.setContent(this.attachments.length > 1 ? this.attachments.length : "");

        this.$.list.render();
    },

    getAttachmentItem: function (inSender, inIndex) {
        var attachmentPart = this.attachments[inIndex];
        if (attachmentPart) {
            var attachmentItem = {
                kind: "AttachmentItem",
                name: "attachmentItem_" + inIndex,
                message: this.message,
                part: attachmentPart,
                composeMode: this.composeMode,
                onInlineDownloaded: "inlineDownloadComplete"
            };

            if (this.composeMode) {
                // FIXME: we could always wrap it with SwipeableItem and set swipeable to false, but
                // right now the styling doesn't show up properly so only enabling it for compose mode.
                return [
                    {kind: "SwipeableItem", className: "compose-attachment-overide", onConfirm: "handleSwipeDelete", attachmentIndex: inIndex, components: [attachmentItem]}
                ];
            } else {
                return [attachmentItem];
            }
        }
        return undefined;
    },

    generateSummary: function (attachments) {
        var filenames = [];
        var i;

        for (i = 0; i < attachments.length; i++) {
            filenames.push(attachments[i].name || EmailApp.Facades.Attachment.generateAttachmentName(attachments[i].name));
        }

        return filenames.join(", ");
    },

    attachmentDownloadError: function (error) {
        var message = EmailAccount.getErrorString(error.errorCode) || $L("An error occurred while downloading the attachment.");

        MailErrorDialog.displayError(this,
            {
                caption: $L("Unable to Download Attachment"),
                message: message,
                error: error
            }
        );
    },

    cantFindAppError: function (inSender, response, request) {
        var details;

        // Provide technical details for support/debugging
        if (request && (request.fileName || request.mimeType)) {
            details = "fileName = " + JSON.stringify(request.fileName) + "; mimeType = " + JSON.stringify(request.mimeType);
        }

        MailErrorDialog.displayError(this,
            {message: $L("This file format is not supported."),
                details: details}
        );
    },

    closePreview: function () {
        this.$.preview.close();
    },

    copyToPhotos: function () {
        var fileName = EmailApp.Facades.Attachment.getAttachmentName(this.targetPart);

        EmailApp.Facades.Attachment.saveAttachment(this.targetPart.path, fileName, this.copyResponse.bind(this));
    },

    // Copy To Photos succeeded
    copyResponse: function (response) {
        if (this.$.preview) {
            this.$.preview.close();
        }

        if (response.returnValue) {
            enyo.application.dashboardManager.generalNotification($L("Image was copied to Photos"));
        } else {
            MailErrorDialog.displayError(this,
                {message: $L("Unable to copy to photos. Try deleting some photos to free up space."),
                    error: response}
            );
        }
    }
});


/******************
 * AttachmentItem *
 ******************/
enyo.kind({
    name: "AttachmentItem",
    kind: "Control",
    published: {
        message: null,
        part: null,
        composeMode: false
    },

    events: {
        onError: "",
        onInlineDownloaded: ""
    },

    className: "mail-attachment",

    components: [
        {name: "outerControls", className: "outer-controls", height: "48px", style: "overflow: hidden;", components: [
            {name: "progress", kind: "enyo.ProgressBar", showing: false, className: "attachment-progress"},
            {name: "progressCancel", className: "download-cancel", onclick: "cancelDownload"},
            {name: 'sizeLabel', className: "attachment-icon-label grayed-out", style: "float:right; margin-right:14px; padding-left: 14px;"},
            {name: 'itemIcon', className: "attachment-icon", components: [
                {name: 'itemThumbnail', kind: "Image", className: "attachment-icon-thumbnail", showing: false}
            ]},
            {name: 'downloadIcon', className: "attachment-icon download-icon"},
            {name: 'itemLabel', className: "attachment-icon-label", height: "48px", style: "overflow:hidden;", components: [
                {name: 'itemName', nodeTag: "span"},
                {name: 'itemExtension', nodeTag: "span", className: "grayed-out"}
            ]},
        ]}
    ],

    showAudioControls: function (path) {
        var audio = this.createComponent({kind: "MegaAudio", src: path, displayName: this.$.itemName.content, extension: this.$.itemExtension.content});
        this.$.outerControls.setShowing(false);
        this.musicTime = true;
    },

    isAudioControl: function () {
        return !!this.musicTime;
    },

    create: function () {
        this.inherited(arguments);

        if (this.part) {
            this.setAttachment(this.part);
        }

        //this.log("item created");

        this.createComponent({
            kind: "SharedAttachment",
            message: this.message,
            part: this.part,
            onChange: "_progressUpdate",
            onError: "_downloadError"
        });
        this._progressUpdate(this, this.$.sharedAttachment.getProgress(), this.$.sharedAttachment.getPath());

    },

    _progressUpdate: function (inSender, progress, path) {
        //this.log("part " + JSON.stringify(this.part) + " progress " + progress + " path " + path);

        if (progress > 0 && progress < 100) {
            this.$.progress.setShowing(true);
            this.$.progressCancel.setShowing(true);
            this.$.sizeLabel.setShowing(false);
            this.$.progress.setPosition(progress);
        } else {
            this.$.progress.setShowing(false);
            this.$.progressCancel.setShowing(false);
            this.$.sizeLabel.setShowing(true);
        }

        this.$.downloadIcon.setShowing(!path);

        // If it's done downloading, update the path
        if (path) {
            this.part.path = path;

            // Update icon for images
            this.updateIconAndLabel(this.part, true);

            if (this.showAttachmentRequested) {
                if (enyo.windows.getActiveWindow() === window) {
                    setTimeout(enyo.hitch(this, "showAttachment"), 100);
                } else {
                    this.showAttachmentRequested = false;
                }
            }
        }
    },

    _downloadError: function (inSender, result) {
        this.owner.attachmentDownloadError(result);
    },

    showAttachment: function () {
        this.showAttachmentRequested = false;

        this.owner.showAttachment(this.part);
    },

    mouseholdHandler: function (target, event) {
        this.holding = true;
        this._updatePath();
        this.owner.showAttachmentMenu(this.part, event);
    },

    _updatePath: function () {
        // Make sure this.part.path is up-to-date
        // NOTE: Not flyweight, so this.part is what you expect
        this.part.path = this.$.sharedAttachment.getPath();
    },

    clickHandler: function (target, event) {
        if (this.holding) {
            // click will fire as soon as use lifts finger from hold
            this.holding = false;
            return;
        }
        this._updatePath();

        // Download if needed.
        var that = this;
        EmailApp.Util.checkFilePath(this.part.path, function (path) {
            if (!that.showAttachmentRequested) {
                that.owner.showAttachment(that.part, that);
            }
        }, function (path) {
            that.download();
        });
    },

    download: function () {
        if (!this.composeMode) {
            this.showAttachmentRequested = true;
        }

        this.$.sharedAttachment.download();
    },

    cancelDownload: function () {
        console.log("download cancel button clicked");

        this.$.sharedAttachment.cancel();
        return true;
    },

    setAttachment: function (part) {
        this.updateIconAndLabel(part);
    },

    updateIconAndLabel: function (part, isDownloaded) {
        var nameAndExt = EmailApp.Facades.Attachment.getNameAndExtension(part.name);

        var name = nameAndExt.name || EmailApp.Facades.Attachment.generateAttachmentName(part.mimeType);
        var extension = nameAndExt.extension && nameAndExt.extension.toLowerCase();

        if (extension) {
            this.$.itemName.setContent(name);
            this.$.itemExtension.setContent(extension);
            this.$.itemExtension.show();
        } else {
            this.$.itemName.setContent(name);
        }

        if (part.estimatedSize) {
            this.$.sizeLabel.setContent(this.calcSizeDisplay(part.estimatedSize));
        }

        if (this.composeMode && part.path) {
            var sizeLabel = this.$.sizeLabel;
            EmailApp.Util.callService(
                "palm://com.palm.filenotifyd.js/fileExists", {"path": part.path},
                function (result) {
                    if (result.returnValue && !result.exists) {
                        sizeLabel.setContent($L("File Missing"));
                    }
                }
            );
        }

        var mimeType = EmailApp.Util.finagleMimeType(part.path || part.name, part.mimeType);
        var iconClass = EmailApp.Facades.Attachment.getIconFromMimeType(mimeType);

        if (window.PalmSystem && part.path && (extension === '.jpg' || extension === '.png' || extension === '.jpeg')) {
            this.$.itemIcon.setClassName("attachment-icon");

            // FIXME validate path
            var thumbnailUrl = "file:///var/luna/data/extractfs/" + encodeURI(part.path) + ":0:0:41:41:4)";
            this.$.itemIcon.setClassName("attachment-icon attachment-thumbnail");
            //this.$.itemIcon.applyStyle("background", "url(" + thumbnailUrl ")");
            this.$.itemThumbnail.setSrc(thumbnailUrl);
            this.$.itemThumbnail.show();
        } else {
            this.$.itemIcon.setClassName("attachment-icon " + iconClass);
        }

        if (isDownloaded && part.type === 'inline') {
            this.doInlineDownloaded();
        }
    },

    _sizeDisplayExtensions: [' bytes', 'k', 'mb', 'gb', 'tb'],
    calcSizeDisplay: function (bytes) {
        var i = 0;

        while (bytes > 1024) {
            bytes /= 1024;
            i++;
        }

        // keep 1 decimal place if it's < 10 whatevers.
        if (bytes < 10) {
            bytes = Math.round(bytes * 10) / 10;
        } else {
            bytes = Math.round(bytes);
        }

        return bytes + this._sizeDisplayExtensions[i];
    }
});

/*******************
 * MegaAudio
 * Audio tag for use in attachments display
 ********************/
enyo.kind({
    name: "MegaAudio",
    kind: "Control",
    published: {
        src: null,
        name: null
    },

    components: [
        {kind: "ApplicationEvents", onWindowHidden: "stopAudio"},
        // audio component is hidden
        {kind: "Control", className: "playerControl", align: "left", height: "41px", pack: "justify", components: [
            //{name: "progresso", kind: "enyo.ProgressBar", className: "megaaudio-progress" },

            {name: "progresso", kind: "ProgressButton", onCancel: "playPause", className: "blue", style: "min-height:37px;",
                onclick: "playPause", cancelable: false, components: [
                {className: "audio-info-box", components: [
                    {name: "playButton", kind: "CustomButton", toggling: true, onclick: "playPause", className: "inline-megaaudio-playbutton" },
                    {name: 'sizeLabel', className: "attachment-icon-label", style: "float:right;margin-right:14px; padding-left: 14px;"},
                    {name: 'itemIcon', className: "attachment-icon audio", components: [
                        {name: 'itemThumbnail', kind: "Image", className: "attachment-icon-thumbnail", showing: false}
                    ]},
                    {name: 'itemLabel', className: "attachment-icon-label", style: "", components: [
                        {name: 'audioName', nodeTag: "span"},
                        {name: 'audioExtension', nodeTag: "span", className: ""}
                    ]},
                ]},
            ]},

            //{name: "PlayButton", onclick: "playPause", className: "inline-megaaudio-playbutton" },


            {name: "audio", nodeTag: "audio"},
        ]}
    ],

    audio: null,

    srcChanged: function (event, sender) {
        if (this.$.audio.hasNode() && this.$.progresso.hasNode()) {
            this._hookupAudio();
            this._hookupProgress();
            this.$.audio.node.play();
        } else {
            // enyo seems to have a bit of trouble setting this stuff up
            // we need to wait until the nodes are constructed or everything barfs all over itself.
            var that = this;
            window.setTimeout(function () {
                that.srcChanged();
            }, 200);
        }
    },

    stopAudio: function () {
        try {
            this.$.audio.node.pause();
            this.playing = false;
        } catch (e) {
            // nothing to see here. move along.
        }
    },

    playPause: function () {
        var isPauseButton = this.$.playButton.getDepressed();

        if (isPauseButton) {
            this.$.audio.node.pause();
            this.playing = false;
        } else {
            this.$.audio.node.play();
            this.playing = true;
        }

        this._updateIcons();
    },

    create: function () {
        this.inherited(arguments);
        this.$.audioName.setContent(this.displayName);
        this.$.audioExtension.setContent(this.extension);
        this.srcChanged();
        this.updateProgress = enyo.bind(this, this.updateProgress);
    },

    _hookupAudio: function () {
        var audioNode = this.$.audio.hasNode();
        audioNode.setAttribute("x-palm-media-audio-class", "media");
        audioNode.addEventListener('playing', enyo.bind(this, this.handlePlay), false);
        audioNode.addEventListener('ended', enyo.bind(this, this.handlePaused), false);
        audioNode.addEventListener('pause', enyo.bind(this, this.handlePaused), false);
        audioNode.addEventListener('timeupdate', this.updateProgress, false);
        audioNode.addEventListener('error', enyo.bind(this, this.handleError), false);
        audioNode.addEventListener('stalled', enyo.bind(this, this.handleStalled), false);
        audioNode.setAttribute('src', this.src);
        audioNode.load();
    },

    updateProgress: function () {
        var audioNode = this.$.audio && this.$.audio.hasNode();

        if (audioNode) {
            //console.log("play position: " + audioNode.currentTime + " / " + audioNode.duration);

            this.$.progresso.setPosition(audioNode.currentTime * 100);
            this.$.progresso.setMaximum(audioNode.duration * 100); // re-set to combat NaN
        } else {
            console.log("no audio node; might have been destroyed");
        }
    },

    handlePaused: function (sender, event) {
        console.log("### we're pausing now");

        this.playing = false;
        this._updateIcons();
    },

    handleError: function (sender, event) {
        console.log("### we have some audio error");
        this.logError(arguments);
    },

    handleStalled: function (sender, event) {
        console.log("### audio has stalled");
        this.logError(arguments);
    },

    logError: function (params) {
        for (var i = 0, len = params.length; i < len; ++i) {
            EmailApp.Util.printObj("### Error param " + i, params[i]);
        }
    },

    handlePlay: function (sender, event) {
        this.playing = true;
        this._updateIcons();
    },

    _updateIcons: function () {
        if (this.$.playButton) {
            this.$.playButton.setDepressed(this.playing);
        } else {
            // might have been destroyed
            console.log("no play button; might have been destroyed");
        }
    },

    _hookupProgress: function () {
        this.$.progresso.setMaximum(this.$.audio.node.duration); // seems this can be NaN on the first go 'round.
        this.$.progresso.setPosition(0); // not really needed, but for clarity
    }
});

