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

/*** Email constants ***/

if (!window.Email) {
    Email = {};
}

Email.KIND = "com.palm.email:1";

Email.LOW_PRIORITY = "low";
Email.MED_PRIORITY = "normal";
Email.HIGH_PRIORITY = "high";
Email.kForwardDraftDelimeter = "<span id='FORWARD_DRAFT_TEXT' class='display:none'></span>";

EmailPartType = {};
EmailPartType.BODY = "body";
EmailPartType.ATTACHMENT = "attachment";
EmailPartType.INLINE = "inline";
EmailPartType.SMART_TEXT = "smartText";
EmailPartType.ALT_TEXT = "altText";

Email.kMeetingRequest = "request";
Email.kMeetingCancellation = "cancellation";

Email.kDeclineResponse = 'decline';
Email.kTentativeResponse = 'tentative';
Email.kAcceptResponse = 'accept';
Email.kRemoveResponse = 'remove';

Email.kBusyStatusBusy = 'busy';

Email.kInviteSubjectAcceptedFormat = $L("Accepted: #{subject}");
Email.kInviteSubjectTentativeFormat = $L("Tentative: #{subject}");
Email.kInviteSubjectDeclinedFormat = $L("Declined: #{subject}");

/*** Lightweight operations on email ids from the local database ***/


/**
 * Core method for querying MojoDb for next/previous messages
 * @param {Object} email reference email object
 * @param {Object} isNext boolean denoting next or previous email
 * @param {Object} isDescending boolean indicating timestamp sorting for emails. true indicates most recent emails are listed first
 * @param {Object} whereClause -- array containing supplemental where clause. Can be used for special case folders like all inboxes, all flagged, etc. If this field is not provided, the folder id from the email will be used
 * @param {Object} callback function to handle results
 */
Email._getAdjacentMessage = function (email, isNext, isDescending, baseQuery, callback) {

    var whereClause = baseQuery && baseQuery.where || [
        {prop: "flags.visible", op: "=", val: true},
        {prop: "folderId", op: "=", val: email.folderId}
    ];

    if (!isDescending) {
        // invert next and isDescending flags for ascending case
        // next message should be a key with a higher value, previous should be a key with lower
        // this flip ensures that's the case
        // standard logic follows an ordering of descending timestamps (most recent, highest number first)
        // subject and sender logic follows alphabetical orderings (lower letters first)
        isNext = !isNext;
        isDescending = !isDescending;
    }

    var orderBy = baseQuery && baseQuery.orderBy || "timestamp";

    // need to order result set so that next/prev message is first in list
    var resultSetOrdering = isDescending && isNext;

    // assemble local where from received whereclause. Received whereclause will be reused,
    // so we should work from a local copy instead. Otherwise next/previous criterias can
    // conflict and generate empty result sets.
    var ineq = isNext ? "<" : ">";
    var locWhere = [
        {prop: orderBy, op: ineq, val: Email._lookupProperty(email, orderBy), collate: "primary"}
    ];
    for (var i = 0; i < whereClause.length; ++i) {
        locWhere.push(whereClause[i]);
    }

    var request = EmailApp.Util.callService('palm://com.palm.db/find', {
            query: {
                from: "com.palm.email:1",
                where: locWhere,
                limit: 1,
                "orderBy": orderBy,
                desc: resultSetOrdering
            }
        },
        callback
    );
    return request;
};


//Function which follows a series of '.' separated property names to look up a potentially deeply nested property.
Email._lookupProperty = function (obj, prop) {
    var props = prop.split('.');

    while (obj && props.length > 1) {
        obj = obj[props.shift()];
    }

    if (obj) {
        return obj[props[0]];
    }

    return undefined;
};


/**
 * Core method for querying MojoDb for next/previous messages
 * @param {Object} email reference email object
 * @param {Object} isDescending boolean indicating timestamp sorting for emails. true indicates most recent emails are listed first
 * @param {Object} callback function to handle results
 */
Email.getPreviousMessage = function (email, isDescending, baseQuery, callback) {
    return Email._getAdjacentMessage(email, false, isDescending, baseQuery, callback);
};

/**
 * Core method for querying MojoDb for next/previous messages
 * @param {Object} email reference email object
 * @param {Object} isDescending boolean indicating timestamp sorting for emails. true indicates most recent emails are listed first
 * @param {Object} callback function to handle results
 */
Email.getNextMessage = function (email, isDescending, baseQuery, callback) {
    return Email._getAdjacentMessage(email, true, isDescending, baseQuery, callback);
};


/*
 * Update email properties.
 *
 * The targetParams parameter is an object with ONE of the following properties:
 *   id: a single email id
 *   ids: an array of email ids
 *   query: a database query specifying the emails that should be updated
 */
Email.updateEmailProps = function (targetParams, props, callback) {
    var mergeQuery;

    if (targetParams.query) {
        mergeQuery = targetParams.query;
    } else {
        var ids = targetParams._id || targetParams.id || targetParams.ids;

        if (!ids) {
            console.error("no id, ids, or query specified for Email.updateEmailProps");
            ids = undefined; // mojodb will generate an error, and callback will be invoked with appropriate response if needed.
        }

        mergeQuery = {
            "from": Email.KIND,
            "where": [
                {prop: "_id", op: "=", val: ids}
            ]
        };
    }

    EmailApp.Util.callService('palm://com.palm.db/merge',
        {
            props: props,
            query: mergeQuery
        },
        callback
    );
};

/*
 * Retrieve email properties.
 *
 * The targetParams parameter is an object with ONE of the following properties:
 *   id: a single email id
 *   ids: an array of email ids
 *   query: a database query specifying the emails that should be retrieved
 * The props parameter is an array specifying the names of the properties to return
 */
Email.getEmailProps = function (targetParams, props, callback) {
    var mergeQuery;

    if (targetParams.query) {
        mergeQuery = targetParams.query;
    } else {
        var ids = targetParams.id || targetParams.ids;

        if (!ids) {
            throw "no id, ids, or query specified for Email.getEmailProps";
        }

        mergeQuery = {
            "from": Email.KIND,
            "where": [
                {prop: "_id", op: "=", val: ids}
            ]
        };
        if (props) {
            mergeQuery.select = props;
        }
    }

    EmailApp.Util.callService('palm://com.palm.db/find',
        {
            query: mergeQuery
        },
        callback
    );
};

Email.setEmailFlags = function (targetParams, flags, callback) {
    Email.updateEmailProps(targetParams, {flags: flags}, callback);
};

Email.getEmailFlags = function (targetParams, callback) {
    Email.getEmailProps(targetParams, ["flags"], callback);
};

Email.moveEmailsToFolder = function (targetParams, destFolderId, callback) {
    var props = {
        destFolderId: destFolderId,
        flags: { visible: false }
    };
    Email.updateEmailProps(targetParams, props, callback);
};

// Delete emails
Email.deleteEmails = function (targetParams, callback) {
    if (targetParams.query) {
        EmailApp.Util.callService('palm://com.palm.db/del',
            {
                query: targetParams.query
            },
            callback
        );
    } else {
        var ids;

        if (targetParams.id) {
            ids = [targetParams.id];
        } else if (targetParams.ids) {
            ids = targetParams.ids;
        } else {
            throw "Email.deleteEmails targetParams needs id, ids, or query";
        }

        EmailApp.Util.callService('palm://com.palm.db/del',
            {
                ids: ids
            },
            callback
        );
    }
};

/*** Email kinds. These are only intended for single emails; bulk operations should use the lightweight methods above. ***/

// Abstract email. Only basic getter functions are available; others are no-ops.
enyo.kind({
    name: "AbstractEmail",
    kind: enyo.Component,

    create: function () {
        this.inherited(arguments);
    },

    // Whether the email can be modified (marked read, deleted, etc)
    canModifyEmail: function () {
        return false;
    },

    getAccountId: function () {
        return undefined;
    },

    getFolderId: function () {
        return this.data.folderId;
    },

    // Get flags
    getFlags: function () {
        return this.data.flags || {};
    },

    getSubject: function () {
        return this.data.subject;
    },

    getFrom: function () {
        return this.data.from;
    },

    getRecipients: function () {
        return this.data.to || [];
    },

    // Get parts
    getParts: function () {
        return this.data.parts || [];
    },

    // Returns the first body part
    getBodyPart: function () {
        var parts = this.data.parts || [];

        for (var i = 0; i < parts.length; i++) {
            if (parts[i].type === EmailPartType.BODY) {
                return parts[i];
            }
        }

        return null;
    },

    // Get attachments
    getAttachments: function (excludeInline) {
        var attachments = [];

        var parts = this.data.parts || [];

        for (var i = 0; i < parts.length; i++) {
            if (parts[i].type == EmailPartType.ATTACHMENT || (!excludeInline && parts[i].type == EmailPartType.INLINE)) {
                attachments.push(parts[i]);
            }
        }

        return attachments;
    }
});

// This is the main email kind, representing emails stored locally on the device.
// It supports most standard operations, and has a database id.
enyo.kind({
    name: "DatabaseEmail",
    kind: "AbstractEmail",

    published: {
        data: null,
        subscribe: false
    },

    events: {
        onEmailUpdated: ""
    },

    create: function () {
        this.inherited(arguments);

        if (this.subscribe) {
            this._getUpdates();
        }
    },

    /*** Get latest data from database ***/
    _getUpdates: function () {
        this._subscription = EmailApp.Util.callService('palm://com.palm.db/find',
            {
                query: {from: Email.KIND, where: [
                    {prop: "_id", op: "=", val: this.data._id}
                ]},
                watch: true,
                subscribe: true
            },
            enyo.hitch(this, "_handleGetResponse")
        );
    },

    _handleGetResponse: function (response) {
        // Make sure not to overwrite any important data that hasn't been committed yet
        if (response.fired) {
            // Get the latest version of the email
            this._getUpdates();
        } else if (response.results) {
            // Should contain the payload
            var updatedData = response.results[0];

            //console.log("got updated email");

            // TODO: in the future, we may want to inspect what changed
            this.data = updatedData;

            // Post event indicating that the email has changed
            this.doEmailUpdated();
        } else {
            console.error("error updating email " + this.data._id + ":" + response);
        }
    },

    dataChanged: function () {
        // Make sure certain properties exist
        if (!this.data.flags) {
            this.data.flags = {};
        }
    },

    /*** Basic info ***/
    canModifyEmail: function () {
        return true;
    },

    getId: function () {
        return this.data._id;
    },

    getFolderId: function () {
        return this.data.folderId;
    },

    getAccountId: function () {
        this.folder = this.folder || enyo.application.folderProcessor.getFolder(this.getFolderId());
        return this.folder ? this.folder.accountId : undefined;
    },

    getSenderAddress: function () {
        return this.data.from.addr;
    },

    /*** User operations ***/

    deleteEmail: function () {
        Email.deleteEmails({id: this.data._id}, null);
    },

    setRead: function (read) {
        this.setFlags({read: read });
    },

    setFlagged: function (flagged) {
        this.setFlags({flagged: flagged});
    },

    setFlags: function (flags) {
        // Update local copy of flags
        enyo.mixin(this.data.flags, flags);

        // Apply to database
        Email.setEmailFlags({id: this.data._id}, flags, null);
    },

    moveToFolder: function (destFolderId, callback) {
        Email.moveEmailsToFolder({id: this.data._id}, destFolderId, callback);
    },

    destroy: function () {
        if (this._subscription) {
            this._subscription.cancel();
            this._subscription = undefined;
        }
        this.inherited(arguments);
    }
});

// Represents an email stored on the filesystem (such as a .eml attachment)
enyo.kind({
    name: "LocalFileEmail",
    kind: "AbstractEmail",

    published: {
        uri: null,
        data: null
    },

    events: {
        onEmailLoaded: "",
        onLoadFailed: ""
    },

    create: function () {
        this.inherited(arguments);

        var path = this.uri.replace("file://", "");

        this._request = EmailApp.Util.callService('palm://com.palm.pop/parseEmlMessage', {
            filePath: path
        }, enyo.hitch(this, "gotResponse"));
    },

    destroy: function () {
        // TODO
        this.inherited(arguments);
    },

    gotResponse: function (response) {
        // console.log("parseEmlMessage response: " + JSON.stringify(response)); // FIXME remove logging

        if (response.returnValue) {
            this.data = response.email;
            this.doEmailLoaded();
        } else {
            this.doLoadFailed(response);
        }
    },

    /*** Basic info ***/
    canModifyEmail: function () {
        return false;
    }
});

// Represents an email being composed
enyo.kind({
    name: "DraftEmail",
    kind: "AbstractEmail",

    published: {
        data: null,
        originalEmail: null // email being replied to or forwarded
    },

    create: function () {
        this.inherited(arguments);
        this._initData();
    },

    dataChanged: function () {
        this._initData();
    },

    _initData: function () {
        this.log();

        if (!this.data) {
            this.data = {subject: "", parts: [], to: [], timestamp: Date.now()};
        }

        // Initialize body if it doesn't exist
        this._getOrCreateBodyPart();

        // Initialize draft type
        this.data.draftType = this.data.draftType || "new";

        // Initialize flags
        this.data.flags = this.data.flags || { read: false };
    },

    _getOrCreateBodyPart: function () {
        var bodyPart = this.getBodyPart();
        if (!bodyPart) {
            bodyPart = {"type": EmailPartType.BODY, "mimeType": "text/html"};
            this.data.parts.push(bodyPart);
        }

        return bodyPart;
    },

    setSubject: function (subject) {
        this.data.subject = subject;
    },

    setFrom: function (recipient) {
        this.data.from = recipient;
    },

    setRecipients: function (recipients) {
        this.data.to = recipients;
    },

    // Sets the "content" field (used by SMTP to write to the FileCache) for the first part of a given type.
    // If content is null or undefined, delete the part (necessary to make sure there's no stale data.)
    _setPartContent: function (type, content, mimeType) {
        if (content || content === "") {
            var parts = this.data.parts || [];

            for (var i = 0; i < parts.length; i++) {
                var part = parts[i];

                if (part.type === type) {
                    part.content = content;
                    part.mimeType = mimeType;

                    // SMTP service doesn't allow both "content" and "path"
                    delete part.path;
                    return;
                }
            }

            // Couldn't find one; add a new one to the beginning of the array
            this.data.parts.unshift({type: type, content: content, mimeType: mimeType});
        } else {
            // Delete part
            this.data.parts = this.data.parts.filter(function (part) {
                return part.type !== type;
            });
        }
    },

    setBodyContent: function (text, plainText, smartText) {
        // Update body text
        this._setPartContent(EmailPartType.BODY, text || "", "text/html");

        // Update or delete plain text
        this._setPartContent(EmailPartType.ALT_TEXT, plainText, "text/plain");

        // Update or delete smart text (used for EAS SmartReply/SmartForward)
        this._setPartContent(EmailPartType.SMART_TEXT, smartText, "text/html");
    },

    addAttachment: function (partToAdd) {
        this.data.parts.push(partToAdd);
    },

    // Remove a part with a matching _id or path
    _removePart: function (partToRemove) {
        this.data.parts = this.data.parts.filter(function (part) {
            return !((part.path && part.path === partToRemove.path) || (part._id && part._id === partToRemove._id));
        });
    },

    // Remove an attachment with a patching _id or path
    // FIXME handle duplicates?
    removeAttachment: function (partToRemove) {
        this._removePart(partToRemove);
    }
});
