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

if (!window.EmailApp) {
    EmailApp = {};
}

EmailApp.Facades = EmailApp.Facades || {};

EmailApp.Facades.Attachment = {
    /*** Constants ***/
    kUnnamedAttachmentName: $L("Unnamed Attachment"), // FIXME localize this

    // Used to generate a reasonable file name or extension for unnamed files. Common types only.
    kUnnamedByMimeType: {
        "image/jpg": ".jpg",
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "message/rfc822": ".eml",
        "text/calendar": ".ics",
        "application/calendar": ".ics",
        "text/plain": ".txt"
    },

    // Lookup table for use with getIconFromMimeType().
    // Two level lookup table for 1st & second parts of mime types.
    // Maps to icon class defined in mail.css.
    // When an entry doesn't exist, the class is that mime type part.
    kIconsByMimeType: {
        //		audio: "audio",
        //		image: "image",
        //		video: "video",
        text: {
            plain: "txt",
            html: "txt",
            "x-vcard": "vcard"
        },
        message: {
            rfc822: "txt" // TODO get a dedicated icon
        },
        application: {
            //			msword: "msword",
            //			'pdf': "pdf",
            'vnd.openxmlformats-officedocument.wordprocessingml.document': "msword",

            'excel': "xls",
            'x-excel': "xls",
            'x-msexcel': "xls",
            'vnd.ms-excel': "xls",
            'vnd.openxmlformats-officedocument.spreadsheetml.sheet': "xls",

            'powerpoint': "ppt",
            'mspowerpoint': "ppt",
            'x-mspowerpoint': "ppt",
            'vnd.ms-powerpoint': "ppt",
            'vnd.openxmlformats-officedocument.presentationml.presentation': "ppt"
        }
    },

    /*** Functions ***/

    /**
     * Save the attachment to /media/internal/downloads
     */
    saveAttachment: function (filePath, fileName, callback) {
        //CopyCacheObject {pathName: string, destination: string, fileName: string}
        return EmailApp.Util.callService('palm://com.palm.filecache/CopyCacheObject',
            {"pathName": filePath, fileName: fileName},
            callback);
    },

    /**
     * Like the name says. Provide an email and an attachment/part id. Will check the UniqueAttachment
     * cache, and provide a new/existing handle for use in download.
     * @param {Object} message
     * @param {Object} partId
     */
    downloadAttachment: function (message, part) {
        var uniqueAttachment = enyo.application._uniqueAttachmentCache.getUniqueAttachment(message, part);
        if (uniqueAttachment) {
            uniqueAttachment.download();
        } else {
            console.error("## something's wrong with the attachment manager");
        }
    },

    /**
     * Kick off an attachment download, using the attachment manager. Once the download has completed,
     * save to the filesystem.
     * @param {Object} message
     * @param {Object} targetAttch
     */
    downloadAndSaveAttachment: function (message, targetAttch) {
        this.downloadAttachment(message, targetAttch);
        var intervalId,
            attempts = 0,
            downloader = function () {
                ++attempts;
                if (!targetAttch.path) {
                    // let this go for about 15 minutes
                    if (attempts >= 300) {
                        // forget about it
                        console.log("unable to save attachment " + targetAttch._id);
                        clearInterval(intervalId);
                    }
                    return;
                }
                clearInterval(intervalId);

                var fileName = EmailApp.Facades.Attachment.getAttachmentName(targetAttch);

                EmailApp.Facades.Attachment.saveAttachment(targetAttch.path, function () {
                    console.log("### Saved delayed attachment.");
                });
            };
        // don't worry. Closure will pick up the id properly. So fresh and so clean.
        intervalId = setInterval(downloader, 3000);
    },

    getNameAndExtension: function (name) {
        var extensionIndex = name ? name.lastIndexOf('.') : -1;

        if (extensionIndex >= 0 && name.length - extensionIndex < 7) {
            return { name: name.slice(0, extensionIndex), extension: name.slice(extensionIndex) }
        } else {
            return { name: name, extension: "" }
        }
    },

    generateAttachmentName: function (mimeType) {
        var genericName = (mimeType && EmailApp.Facades.Attachment.kUnnamedByMimeType[mimeType.toLowerCase()]) || "";

        if (genericName && genericName[0] === '.') {
            return EmailApp.Facades.Attachment.kUnnamedAttachmentName + genericName; // add extension
        } else {
            return genericName || EmailApp.Facades.Attachment.kUnnamedAttachmentName;
        }
    },

    getAttachmentName: function (part) {
        return part.name || EmailApp.Facades.Attachment.generateAttachmentName(part.mimeType);
    },

    getIconFromMimeType: function (mimeType) {
        var mimePieces, result;

        if (mimeType) {
            mimePieces = mimeType.split("/", 2);
            result = EmailApp.Facades.Attachment.kIconsByMimeType[mimePieces[0]] || mimePieces[0];

            if (result && typeof result !== "string") {
                result = result[mimePieces[1]] || mimePieces[1];
            }
        }

        return result;
    }
};