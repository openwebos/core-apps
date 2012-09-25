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

/*global enyo, console, mail, EmailApp, EmailRecipient, $L
 */

EmailApp = EmailApp || {};

/*
 Represents a composed email, used by the compose window.
 Can be used to make a new empty email, a specially configured one, or be auto-configured as a fwd, reply, etc., of an existing email.
 Maintains the relevant data in mojodb com.palm.email format in this.email.


 options: {
 accountId: _id of account to send from. Optional.

 Specify 0 or 1 of the following:
 edit: com.palm.email object from mojodb, or similar structure.  Used to initialize the composition.
 replyTo: com.palm.email object from mojodb.  Composition will be set to a new email configured as a reply to this one.
 replyToAll: com.palm.email object from mojodb.  Composition will be set to a new email configured as a "reply all" to this one.
 forward: com.palm.email object from mojodb.  Composition will be set to a new email configured as a forward of this one.
 mailToURL: mailto URL string, used to populate the 'to' field of teh new composition.
 params: Params as defined in the public launch API, used to initialize the new composition.

 }

 */
EmailApp.Composition = function (options) {
    // Start with a new blank message.
    this.originalText = "";

    // Create a draft email object
    this.draftEmail = new DraftEmail();

    // Shortcut to the raw mojodb object.
    this.email = this.draftEmail.getData();

    // TODO: Refactor this. it's hella ugly.
    var targetAcctId = options && options.accountId || enyo.application.accounts.getDefaultAccountId();
    var signature = AccountPreferences.getSignature(targetAcctId);
    var defaultBodyText = "<span style='font-family:Prelude, Verdana, san-serif;'><br><br></span><span id='signature'>" + signature + "</span>";

    this.draftEmail.setBodyContent(defaultBodyText);

    // If options are specified, reconfigure the email:
    if (options) {

        if (options.edit) {
            // Edit an existing email (e.g. from drafts or outbox folder)
            this.draftEmail.setData(this._cloneEmail(options.edit));
            this.email = this.draftEmail.getData();

            body = this.draftEmail.getBodyPart();
            if (body && body.path) {
                this._setContent(palmGetResource(body.path));

                this.findDeletedAttachments(function (missing) {
                    var numDiscarded = missing.length;
                    if (numDiscarded > 0) {
                        var temp = new enyo.g11n.Template("1#1 attachment discarded|1>##{numDiscarded} attachments discarded");
                        var formatted = temp.formatChoice(numDiscarded, {numDiscarded: numDiscarded});
                        enyo.application.dashboardManager.generalNotification(formatted);
                    }
                });

            }

        } else if (options.action === "reply") {
            this._setReply(options);
        } else if (options.action === "replyall") {
            this._setReplyAll(options);
        } else if (options.action === "forward") {
            this._setForward(options);
        } else if (options.mailToURL) {
            this._setFromURL(options.mailToURL);
        } else if (options.externalLaunchParams) {
            this._setFromLaunchParams(options.externalLaunchParams);
        }
    }
    // do this last, to overide anything from other settings
    this._setSender(targetAcctId);
};

// Need to break this out of the regular prototype assignment, since it's used in the def'n of REPLY_FWD_HTML
EmailApp.Composition.prototype.SIGNATURE_PLACEHOLDER = "<span style='font-family:Prelude, Verdana, san-serif;'><br><br></span><span id='signature'></span>";

EmailApp.Composition.prototype = {

    SIGNATURE_PLACEHOLDER: EmailApp.Composition.prototype.SIGNATURE_PLACEHOLDER,
    REPLY_FWD_HTML: "<br><br>" + EmailApp.Composition.prototype.SIGNATURE_PLACEHOLDER + "<br><span style='color:navy; font-family:Prelude, Verdana, san-serif; '><hr align='left' style='width:75%'/>",

    SUBJECT_PREFIX_RE: $L("Re: "),
    SUBJECT_PREFIX_FW: $L("Fw: "),

    isForward: function () {
        return (this.action === "forward");
    },
    isReply: function () {
        return (this.action === "reply" || this.action === "replyAll");
    },
    isReplyForward: function () {
        return (this.action === "forward" || this.action === "reply" || this.action === "replyAll");
    },

    getDraftEmail: function () {
        return this.draftEmail;
    },

    getBodyText: function () {
        return this.draftEmail.getBodyPart().content;
    },

    setAccountId: function (accountId) {
        this.accountId = accountId;
    },

    getAccountId: function () {
        return this.accountId;
    },

    // Cleans up the email data before sending to SMTP
    _prepareOutgoingEmail: function (outgoingData) {
        delete outgoingData._rev;

        // Remove missing attachments
        outgoingData.parts = this.filterMissingAttachments(outgoingData.parts);

        var badUtfReg = /\uffff/g; // pattern to match bad unicode character 0xffff

        outgoingData.parts.forEach(function (elem) {
            if (elem.mimeType === "text/html" && elem.content && elem.content.match(badUtfReg)) {
                elem.content = elem.content.replace(badUtfReg, " ");
            }
        });

    },

    // Send the email.  Saves it into the account's outbox, where it's picked up by the transport.
    send: function (onSuccess) {
        console.log("Sending email");

        var acct = enyo.application.accounts.getAccount(this.accountId);

        var from = this.email.from;

        // FIXME should do this for saving drafts, too
        if (acct.getReplyTo()) {
            this.email.replyTo = {
                addr: acct.getReplyTo(),
                name: from.name !== from.addr ? from.name : "",
                type: EmailRecipient.typeReplyTo
            };
        }

        // Clean up attachments, etc.
        this._prepareOutgoingEmail(this.email);

        // Set editedDraft to false
        this.email.flags.editedDraft = false;

        console.log("Sending mail - _id: %s, editedOriginal: %s, contentLen: %d, originalMsgId: %s, subjectLen: %s",
            this.email._id, this.email.flags.editedOriginal, this.getContentLen(), this.email.originalMsgId, this.email.subject.length);

        // TODO: we should really make a copy of the object, pulling only the properties we need to write to the database
        // this will prevent dbrev mismatch errors and the like
        mail.sendMail(this.email, acct, this._handleSuccess.bind(this, onSuccess));

        return true;
    },

    // Save the email as a draft.  It goes into the drafts folder for the account.
    saveDraft: function (onSuccess, stripAttachments) {

        console.log("Saving draft email");
        //EmailApp.Util.printObj("Saving draft", this.email);

        // Create a copy of the email so we don't mess with the current email being composed
        var outgoingData = enyo.mixin({}, this.email);
        if (stripAttachments) {
            // Remove all attachments
            outgoingData.parts = this.filterAllAttachments(outgoingData.parts);
        }

        // Cleanup missing attachments, etc
        this._prepareOutgoingEmail(outgoingData);

        // Set editedDraft so the transport can decide to upload it to the server
        outgoingData.flags.editedDraft = true;

        var account = enyo.application.accounts.getAccount(this.accountId);
        mail.saveDraft(outgoingData, account, this._handleSuccess.bind(this, onSuccess));
    },

    replaceURIs: function (originalText) {
        var resultingText = originalText;

        if (this.email.inlineAttachments) {
            this.email.inlineAttachments.forEach(function replaceURIFunc(inlineAttachment) {
                var path = inlineAttachment.path;
                var cid = 'cid:' + inlineAttachment.contentId;
                resultingText = resultingText.replace(new RegExp(path, 'gi'), cid);
            });
        }
        return resultingText;
    },

    getContentLen: function () {
        var i, parts;
        parts = this.email.parts;

        for (i = 0; i < parts.length; i++) {
            if (parts[i].type === 'body') {
                return parts[i].content && parts[i].content.length;
            }
        }

        return undefined;
    },

    // Returns a 2-level deep copy of an email, so we don't modify the original.
    _cloneEmail: function (email) {
        var prop, val, i;

        // Copy properties into a new object.
        email = enyo.mixin({}, email);

        // Replace object & array valued properties with copies.
        for (prop in email) {
            if (email.hasOwnProperty(prop)) {
                val = email[prop];

                if (Array.isArray(val)) {
                    email[prop] = val.slice(0);
                } else if (typeof val === 'object') {
                    email[prop] = enyo.mixin({}, val);
                }
            }
        }

        // Replace the parts array elements with clones too.
        if (email.parts) {
            for (i = 0; i < email.parts.length; i++) {
                email.parts[i] = enyo.mixin({}, email.parts[i]);
            }
        }

        return email;
    },

    // Send/save was successful.
    _handleSuccess: function (clientOnSuccess, response) {
        // If the transport response includes an _id, then we copy it into the email object.
        // This ensures that any further saves, etc., will be applied to the correct object.
        //console.log("Composition._handleSuccess: " + enyo.json.stringify(response));
        if (response._id) {
            this.email._id = response._id;
        }

        return clientOnSuccess(response);
    },

    // Configure this email as a reply to 'original'.
    _setReply: function (options) {
        var original = enyo.mixin({}, options.originalMessage);
        original.text = options.bodyHTML;
        original.accountId = original.accountId || options.accountId;

        this.action = "reply";

        this._createCommon(original, this.SUBJECT_PREFIX_RE);
        this.email.to = [this._convertSenderToRecipient(original)];
        this._commonReplyPrep(original);
    },


    // Configure this email as a reply-all to 'original'.
    _setReplyAll: function (options) {
        var original = enyo.mixin({}, options.originalMessage);
        original.text = options.bodyHTML;
        original.accountId = original.accountId || options.accountId;

        this.action = "replyAll";
        this._createCommon(original, this.SUBJECT_PREFIX_RE);
        this._addReplyAll(original);
        this._commonReplyPrep(original);
    },


    // Configure this email as a forward of 'original'.
    _setForward: function (options) {
        var original = enyo.mixin({}, options.originalMessage);
        original.text = options.bodyHTML;
        original.accountId = original.accountId || options.accountId;

        this.action = "forward";

        this._createCommon(original, this.SUBJECT_PREFIX_FW);

        // Copy attachments when forwarding
        // Include the original part id so we can download if necessary

        var newAttachments = [];

        for (var i = 0; i < original.parts.length; i++) {
            var originalPart = original.parts[i];

            if (this._isAttachment(originalPart)) {
                // FIXME: should only copy over properties that are safe to copy
                var newPart = enyo.mixin({}, originalPart);

                // Set originalPartId so we know this part was copied
                newPart.originalPartId = originalPart._id;

                // FIXME a few places need to have a part id to identify the part
                //delete newPart._id;

                newAttachments.push(newPart);
            }
        }

        this._setAttachments(newAttachments);

        this.email.draftType = "forward";
    },

    // Configure this email using info from a mailto URL.
    _setFromURL: function (url) {
        var recipients;
        var parser = new MailtoURIParser(url);
        this._setSubject(parser.getDecodedSubject());
        this._setContent(parser.getDecodedBody() + this.SIGNATURE_PLACEHOLDER);

        var convertAddress = function (addr) {
            return {addr: addr, name: addr};
        };

        recipients = parser.getDecodedTO().split(/[,;]/);
        this._addRecipients(recipients.map(convertAddress), EmailRecipient.typeTo);

        recipients = parser.getDecodedCC().split(/[,;]/);
        this._addRecipients(recipients.map(convertAddress), EmailRecipient.typeCc);

        recipients = parser.getDecodedBCC().split(/[,;]/);
        this._addRecipients(recipients.map(convertAddress), EmailRecipient.typeBcc);

    },


    // Post-construction reconfiguration to set various bits of data from the compose scene.
    // Usually called before saving as a draft, or sending.
    setSerializedParams: function (params) {

        if (params.timestamp !== undefined) {
            this.email.timestamp = params.timestamp;
        }

        this._setSender(params.account || params.accountId);
        this.email.to = [];
        this._addRecipients(params.to$A, EmailRecipient.typeTo);
        this._addRecipients(params.cc$A, EmailRecipient.typeCc);
        this._addRecipients(params.bcc$A, EmailRecipient.typeBcc);
        this._setSubject(params.subject);
        this._setContent(params.msg);

        // By default, no smart fwd/reply
        if (params.editedOriginal !== undefined) {
            this.email.flags.editedOriginal = params.editedOriginal;
        }

        // Attachments should always be up-to-date in this object now -- no need to copy them to the DOM just to
        // include them in the serialized params and put them back into our array.
        //this._setAttachments(params.attachments);

    },

    _cleanAttachments: function (attachmentList, partType, attachmentsOut) {
        if (!attachmentList) {
            return;
        }

        if (!Array.isArray(attachmentList)) {
            console.log("ERROR: Composition.setFromLaunchParams ignoring badly formed attachments");
            return;
        }

        for (var i = 0; i < attachmentList.length; i++) {
            var attachment = attachmentList[i];

            if (attachment.path || attachment.fullPath) {
                var a = { type: partType, path: attachment.path || attachment.fullPath };

                var name = attachment.displayName || attachment.name;

                if (name) {
                    a.name = name;
                } else {
                    // generate filename from path
                    var slashIndex = a.path.lastIndexOf('/');
                    a.name = a.path.substring(slashIndex + 1);
                }

                if (attachment.mimeType) {
                    a.mimeType = attachment.mimeType;
                }

                attachmentsOut.push(a);
            }
        }
    },

    // Configure based on the exposed launch arguments API
    _setFromLaunchParams: function (params) {

        if (params.accountId) {
            this.accountId = params.accountId;
        }

        var subject = params.summary || params.subject;

        if (subject) {
            // backward compatible with the subject's old property name so that
            // we won't break the external app's send mail capability.
            this._setSubject(subject);
        }

        if (params.text) {
            var text = params.text;

            if (params.isHtml === false) {
                // Rudimentary formatting for plain text
                text = text.escapeHTML().replace(/\n/g, "<br>");
            }

            this._setContent(text + this.SIGNATURE_PLACEHOLDER);
        }

        // TODO: this should perform validation/fixup on the recipients
        if (params.recipients) {
            if (Array.isArray(params.recipients)) {
                var recips = this.email.to;
                params.recipients.forEach(function (r) {

                    // convert the SDK email API's recipient data structure to the
                    // structure that email app uses.

                    // convert 'role' property from recipient parameter in SDK
                    // email API's
                    if (r.role === undefined) {
                        console.log("WARNING: email recipient has no 'role', using roleTo");
                        r.type = EmailRecipient.typeTo;
                    } else {
                        if (r.role === EmailRecipient.externalAppRoleFrom) {
                            r.type = EmailRecipient.typeFrom;
                        } else if (r.role === EmailRecipient.externalAppRoleTo) {
                            r.type = EmailRecipient.typeTo;
                        } else if (r.role === EmailRecipient.externalAppRoleCc) {
                            r.type = EmailRecipient.typeCc;
                        } else if (r.role === EmailRecipient.externalAppRoleBcc) {
                            r.type = EmailRecipient.typeBcc;
                        } else if (r.role === EmailRecipient.externalAppRoleReplyTo) {
                            // FIXME not supported, but not publicly documented either
                            console.log("WARNING: unsupported email role replyTo");
                            return;
                        } else {
                            console.log("WARNING: email recipient has invalid 'role' %s, using typeTo", r.role);
                            r.type = EmailRecipient.typeTo;
                        }
                    }
                    // clean up any external api name mismatches
                    r.displayName = r.displayName || r.contactDisplay;

                    recips.push({addr: r.value, name: r.displayName, type: r.type});
                });
            } else {
                console.log("ERROR: Composition.setFromLaunchParams ignoring badly formed recipients");
            }
        }

        // Copy any specified attachments:
        var cleanAttachments = [];

        this._cleanAttachments(params.attachments, "attachment", cleanAttachments);
        this._cleanAttachments(params.inlineAttachments, "inline", cleanAttachments);

        // clean up external api names. Match to internal names
        this._setAttachments(cleanAttachments);

        // FIXME check number
        if (params.timestamp) {
            this.email.timestamp = params.timestamp;
        }

        // FIXME document
        if (params.priority) {
            this.email.priority = params.priority;
        }
    },

    // Generates a recipient from the original sender for Reply, and ReplyAll.
    // Takes optional replyTo field into account.
    _convertSenderToRecipient: function (original) {
        var replyTo;

        // obey the replyTo field if set.
        if (original.replyTo && original.replyTo.addr) {
            replyTo = enyo.mixin({}, original.replyTo);
        } else {
            replyTo = enyo.mixin({}, original.from);
        }

        replyTo.name = replyTo.name || replyTo.addr;
        replyTo.type = EmailRecipient.typeTo;

        return replyTo;
    },

    /** method to convert an existing reply email into a replyAll email
     *  takes an existing data object and pulls all the recipients into
     *  the correct destination fields. Note that this method should only be
     *  called after a reply email has been created, or by the _setReplyAll
     *  method.
     * @param {Object} original -- email object from which to base replyAll
     */
    _addReplyAll: function (original) {
        if (!original || !original.to) {
            return;
        }

        var accts = enyo.application.accounts;
        // Get the email address for the current account.
        var account = accts.getAccount(original.accountId);
        if (!account) {
            account = accts.getAccount(accts.getDefaultAccountId());
        }
        var addy = account.getEmailAddress().toLowerCase();

        var recips = [];

        // convert the original sender's type to 'TO'
        var originalSender = this._convertSenderToRecipient(original);
        original.to.forEach(function (r) {
            r.name = r.name || r.addr;
            // Add all recipients except our account's address
            if (r.addr.toLowerCase() !== addy) {
                recips.push(r);
            }
        });

        // Filter out sender from the all recipient lists to avoid duplicates.
        var originalSenderAddress = originalSender.addr.toLowerCase();
        recips = recips.filter(function (r) {
            return (r.addr.toLowerCase() !== originalSenderAddress);
        });

        // Put the sender of the original email at the beginning of the To list.
        if (originalSender.addr.toLowerCase() !== addy) {
            recips.unshift(originalSender);
        }

        // overwrite existing recipients
        this.email.to = recips;
    },


    // Common setup code used for all replies & forwards.
    _createCommon: function (original, subjectPrefix) {
        var email = this.email;
        var text, originalText;

        email.folderId = original.folderId;
        email.originalMsgId = original._id;
        this.replyMessage = original._id;

        // Check if 're:' or 'fw:' needs to be added to subject
        var subjectStartsWith = original.subject.substring(0, subjectPrefix.length).toLowerCase();
        if (subjectStartsWith === subjectPrefix.toLowerCase()) {
            email.subject = original.subject;
        } else {
            email.subject = subjectPrefix + original.subject;
        }

        // Handle body text in original email.
        // Here we rely on the message scene having added a 'text' property at the top level of the object.
        // It would be more robust to read the message body ourselves, and modify the message scene not to modify the object.
        // So let's change this at some point.
        if (original.text && original.text.length > 0) {
            text = this.REPLY_FWD_HTML;
            var fromObj = original.from;
            var dateFormatter = new enyo.g11n.DateFmt({
                date: 'medium',
                time: 'short'
            });


            if (this.action === "forward") {
                var toAddressList = [];
                var ccAddressList = [];
                if (original.to) { // sometimes to is null. ie: in case of all bcc recips
                    original.to.forEach(function (r) {
                        if (r.type === EmailRecipient.typeTo) {
                            if (r.name) {
                                var toStr;
                                if (r.name === r.addr) {
                                    toStr = r.name;
                                }
                                else {
                                    toStr = EmailApp.Util.interpolate("#{name} <#{addr}>", r);
                                }
                                toAddressList.push(toStr);
                            }
                        }
                        else
                        if (r.type === EmailRecipient.typeCc) {
                            if (r.name) {
                                var ccStr;
                                if (r.name === r.addr) {
                                    ccStr = r.name;
                                }
                                else {
                                    ccStr = EmailApp.Util.interpolate("#{name} <#{addr}>", r);
                                }
                                ccAddressList.push(ccStr);
                            }
                        }
                    });
                }

                if (fromObj.name === fromObj.addr) {
                    text += $L("<b>From:</b> ") + (fromObj.name || '').escapeHTML() + "<br/>";
                }
                else {
                    text += $L("<b>From:</b> ") + (EmailApp.Util.interpolate("#{name} <#{addr}>", fromObj)).escapeHTML() + "<br/>";
                }
                var d = parseInt(original.timestamp, 10);
                text += $L("<b>Date:</b> ") + dateFormatter.format(new Date(d)) + "<br/>";
                text += $L("<b>Subject:</b> ") + original.subject.escapeHTML() + "<br/>";
                if (toAddressList.length > 0) {
                    text += $L("<b>To:</b> ") + (toAddressList.join("; ") || '').escapeHTML() + "<br/>";
                }
                if (ccAddressList.length > 0) {
                    text += $L("<b>CC:</b> ") + (ccAddressList.join("; ") || '').escapeHTML() + "<br/>";
                }

            } else {

                // reply case. Integrate header info with sentence
                var strArgs = {
                    "monthDate": "",
                    "name": fromObj.name,
                    "addr": fromObj.addr
                };
                if (original.timestamp) {
                    //<Month (short version)> <Day>,<Year> at <time>
                    var d = parseInt(original.timestamp, 10);
                    strArgs.monthDate = dateFormatter.format(new Date(d));
                    text += EmailApp.Util.interpolate($L("On #{monthDate}, #{name} <#{addr}> wrote: "), strArgs).escapeHTML();
                } else {
                    text += EmailApp.Util.interpolate($L("#{name} <#{addr}> wrote: "), strArgs).escapeHTML();
                }
            }

            // Add a newline after header info
            text += "<br/>";

            originalText = original.text;
        } else {
            console.log("ERROR: Composition._createCommon: couldn't find original message text.");
            text = this.SIGNATURE_PLACEHOLDER;
            originalText = "";
        }

        this.originalText = originalText;

        if (text !== undefined) {
            this._setContent(text);
        }
    },

    // Common setup code used by replies, but not forwards.
    _commonReplyPrep: function (original) {

        // Copy (only!) inline attachments from the original email, so they appear properly in the reply.
        this._setAttachments(original.parts.filter(this._isInlineAttachment, this));

        this.email.draftType = "reply";

        // Copy messageId to inReplyTo and references (used by other email clients for proper threading)
        if (original.messageId) {
            this.email.inReplyTo = original.messageId;

            // Append to existing references (parent messageId goes last in the list)
            this.email.references = this.email.references || [];
            this.email.references.push(this.email.messageId);

            // Trim the number of references
            this.email.references = this.email.references.slice(-5);
        }
    },

    // used to clean forward/reply text for compose view
    // REFAC this method only truncates reply text. No sanitization.
    sanitizeOriginalText: function () {
        if (this.cleanOriginalText) {
            return this.cleanOriginalText;
        }

        var originalText = this.originalText;

        if (originalText) {
            // Truncate to 100K if the message is too long.
            // cutting it off conservatively).
            var maxBodyLength = 100000;
            if (originalText.length > maxBodyLength) {
                console.log("WARNING: original email body is too long, size=", originalText.length);
                originalText = originalText.substring(0, maxBodyLength);
            }
        }

        this.cleanOriginalText = originalText;
        return originalText;
    },


    // Configure/change the sender account for this email.
    _setSender: function (senderAccountId) {

        if (senderAccountId === undefined) {
            return;
        }

        var accts = enyo.application.accounts;
        var account = accts.getAccount(senderAccountId) || accts.getAccount(accts.getDefaultAccountId());
        // senderAccountId can resulve to a synthetic folder. Make sure to save actual account id
        this.accountId = account.getId();

        var fromObj = {
            addr: account.getEmailAddress(),
            name: account.getFromName(),
            type: EmailRecipient.typeFrom
        };

        this.draftEmail.setFrom(fromObj);
    },

    // Adds the given list of recipients to this email.
    _addRecipients: function (list, recpType) {
        if (!list) {
            console.log("No recipients found for type: %s", recpType);
            return;
        }

        for (var i = 0; i < list.length; i++) {
            var elem = list[i];

            // copy props and assign to email
            var recipient = {
                type: recpType,
                // TODO: Find a better way to resolve this higher up in the pipeline
                // need to resolve params here. Code used by both input fields and launch params
                addr: elem.value || elem.addr,
                name: elem.displayName || elem.name || ""
            };

            if (!recipient.addr) {
                console.log("ERROR: recipient %j is missing an email address");
                continue;
            }

            this.email.to.push(recipient);
        }
    },

    // Set email's subject, trimming whitespace
    _setSubject: function (subj) {
        if (subj !== undefined) {
            // The goal here is apparently to remove linefeeds, though trim() will only affect the beginning & end.
            this.draftEmail.setSubject(subj.trim());
        }
    },


    // Set the body content into email's part list.
    _setContent: function (msg) {
        var body;

        if (msg === undefined) {
            return;
        }

        this.draftEmail.setBodyContent(msg);
    },


    // Replace all current attachments with the given list.
    _setAttachments: function (attchs) {
        if (!attchs) {
            return;
        }

        // Sanitize the attachments:
        attchs = attchs.map(this._sanitizeAttachment, this);

        // Remove all existing attachments, then add the specified ones back in.
        this.email.parts = this.email.parts.filter(this._isNotAttachment, this).concat(attchs);

    },

    // Small helper for manipulating the parts array.
    _isAttachment: function (a) {
        return a.type === "attachment" || a.type === "inline";
    },

    _isNotAttachment: function (a) {
        return !(this._isAttachment(a));
    },

    // Small helper for manipulating the parts array.
    _isInlineAttachment: function (a) {
        return a.type === "inline";
    },

    _isNotInlineAttachment: function (a) {
        return !(this._isInlineAttachment(a));
    },

    _isMissingAttachment: function (a) {
        return !a.path && this._isAttachment(a);
    },

    // Fix up an attachment part to only include relevant fields.
    // Notably, this will strip out any transport-specific info.
    _sanitizeAttachment: function (part) {
        // NOTE: must not contain any "undefined" fields
        var newPart = {
            type: part.type || "attachment",
            name: part.name || "",
        };

        // Copy _id
        if (part._id) {
            newPart._id = part._id;
        }

        var path = part.path;

        // Populate path if available, otherwise leave it undefined
        if (path) {
            newPart.path = path;
        }

        // Fix up missing/generic mime type
        var mimeType = EmailApp.Util.finagleMimeType(path, part.mimeType);
        if (mimeType) {
            newPart.mimeType = mimeType;
        }

        // Generate a name if necessary
        if (!newPart.name && newPart.type === "attachment") {
            newPart.name = EmailApp.Facades.Attachment.getAttachmentName(newPart);
        }

        // Include originalPartId, if any
        if (part.originalPartId) {
            newPart.originalPartId = part.originalPartId;
        }

        // Include contentId, if any
        if (part.contentId) {
            newPart.contentId = part.contentId;
        }

        // Include estimatedSize, if available
        if (part.estimatedSize || part.estimatedSize === 0) {
            newPart.estimatedSize = part.estimatedSize;
        }

        return newPart;
    },


    // Returns a list of attachments which optionally includes inline attachments, non-inline attachments, or both.
    getAttachments: function (regular, inline) {
        var attachments;

        if (!regular) {
            // No regular attachments? All that's left is the inline ones, so just select those.
            attachments = this.email.parts.filter(this._isInlineAttachment, this);
        } else {
            // Otherwise, get inline & regulars...
            attachments = this.email.parts.filter(this._isAttachment, this);
        }

        if (!inline) {
            // ... then omit the inline attachments if needed.
            attachments = attachments.filter(this._isNotInlineAttachment, this);
        }

        return attachments;
    },

    // Returns attachment list with non-downloaded attachments removed
    filterMissingAttachments: function (parts) {
        return parts.filter(function (part) {
            return !this._isMissingAttachment(part);
        }, this);
    },

    // Returns attachment list with all attachments removed
    filterAllAttachments: function (parts) {
        return parts.filter(function (part) {
            return this._isNotAttachment(part);
        }, this);
    },

    // Find deleted attachments (by checking the filesystem). Has a callback
    // for completion, which gives the attachments that went missing.
    findDeletedAttachments: function (inCallback) {
        var toCheck = this.email.parts.filter(function (item) {
            return this._isAttachment(item) && item.path;
        }, this);

        var checked = 0;
        var missing = [];
        toCheck.forEach(function (a) {
            EmailApp.Util.callService(
                "palm://com.palm.filenotifyd.js/fileExists", {"path": a.path},
                function (result) {
                    if (result.returnValue && !result.exists) {
                        missing.push(a);
                    }
                    if (++checked === toCheck.length) {
                        inCallback(missing);
                    }
                }
            );
        });
    },

    countMissingAttachments: function (smartForward) {
        var missing = 0;
        var parts = this.email.parts;

        for (var i = 0; i < parts.length; i++) {
            var part = parts[i];
            if (this._isMissingAttachment(part) && !(part.originalPartId && smartForward)) {
                missing++;
            }
        }

        return missing;
    },

    // Remove attachments with no path. Returns the number of parts removed.
    removeMissingAttachments: function () {
        var numParts = this.email.parts.length;

        this.email.parts = this.filterMissingAttachments(this.email.parts);

        return numParts - this.email.parts.length;
    },

    // Simple accessor to count the attachments.
    countAttachments: function () {
        return this.email.parts.reduce(this._attachmentCounter, 0);
    },

    // Small helper for working with the parts array.
    _attachmentCounter: function (total, part) {
        if (part.type === "attachment" || part.type === "inline") {
            return total + 1;
        }
        return total;
    }
};




