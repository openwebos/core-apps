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


// TODO: move mojodb (db8) stuff into a separate file
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
