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

// This represents a conversation used by the email app
function VirtualConversation(data) {
    this._data = data; // should not be used externally

    if (data._kind === "com.palm.email.conversation:1") {
        // wrap conversation
        this.convData = data;
        this.emails = data.emailIds;
    } else {
        // wrap email
        this.emailData = data;
        this.emails = [data._id];
    }
}

VirtualConversation.prototype = {
    isConversation: function () {
        return !!this.convData;
    },

    getId: function () {
        return this._data._id;
    },

    getEmailIds: function () {
        if (this.emailData) {
            return [this.emailData._id];
        } else {
            return this.convData.emailIds;
        }
    },
    
    getAccount: function () {
        var accountId = this.getAccountId();
        
        return accountId && enyo.application.accounts.getAccount(accountId);
    },

    getAccountId: function () {
        if (this.emailData) {
            return enyo.application.folderProcessor.getFolderAccount(this.emailData.folderId);
        } else {
            return this._data.accountId;
        }
    },
    
    getFolderKeys: function () {
        if (this.emailData) {
            return [this.emailData.folderId];
        } else {
            return this.convData.folderKeys;
        }
    },
    
    getFolderIds: function () {
        return enyo.filter(this.getFolderKeys(), function (key) {
            return key[0] !== '#' && key[1] !== '#';
        });
    },
    
    hasFolderKey: function (key) {
        if (this.emailData) {
            return key === this.emailData.folderId;
        } else {
            return enyo.indexOf(this.convData.folderKeys) !== -1;
        }
    },

    getFolderId: function () {
        return this._data.folderId;
    },

    getEmailCount: function () {
        if (this.emailData) {
            return 1;
        } else {
            return this.convData.count;
        }
    },

    getSenders: function () {
        if (this.emailData) {
            var account = this.getAccount();
            if (account && account.isOutgoingFolderId(this._data.folderId)) {
                return this.emailData.to || [];
            }
        
            return (this.emailData.from && [this.emailData.from]) || [];
        } else {
            return this.convData.senders || [];
        }
    },

    getSubject: function () {
        return this._data.subject || "";
    },

    getSummary: function () {
        return this._data.summary || "";
    },

    getTimestamp: function () {
        return this._data.timestamp;
    },

    getFlags: function () {
        return this._data.flags || {};
    },

    getAttributes: function () {
        return this._data.attributes || {};
    },

    hasAttachment: function () {
        if (this.emailData) {
            var parts = this.emailData.parts || [];
            for (var i = 0; i < parts.length; i++) {
                if (parts[i].type === "attachment") {
                    return true;
                }
            }
            return false;
        } else {
            // FIXME
            return !!this.getAttributes().hasAttachment;
        }
    },

    hasMeetingInfo: function () {
        if (this.emailData) {
            return !!this.emailData.meetingInfo;
        } else {
            return !!this.getAttributes().hasMeetingInfo;
        }
    },

    hasError: function () {
        if (this.emailData) {
            return this.emailData.sendStatus && this.emailData.sendStatus.error && this.emailData.sendStatus.errorCode;
        } else {
            return !!this.getAttributes().hasError;
        }
    },

    getPriority: function () {
        if (this.emailData) {
            return this.emailData.priority;
        } else {
            return this.convData.priority;
        }
    }
};