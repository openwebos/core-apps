// LICENSE@@@
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
// @@@LICENSE

enyo.kind({
    name          : "TransactionManager",
    kind          : enyo.Component,
    events        : {
        onBeginTransaction: "",
        onEndTransaction  : ""
    },
    curTransaction: undefined,

    constructor: function () {
        this.inherited(arguments);
    },

    BeginTransaction: function (inName, timeOutInMs) {
        if (this.curTransaction) {
            throw ("Sorry, transaction: '" + this.curTransaction + "' is still in progress");
        }

        enyo.require(inName && inName.length > 0, "BeginTransaction requires name");

        this.curTransaction = inName;
        this.doBeginTransaction();
        enyo.job("job.TransactionManager.Timeout", enyo.bind(this, "_EndTransactionTimeout"), timeOutInMs ? timeOutInMs : 10000);
        enyo.log("Transaction '" + this.curTransaction + "' Started");
    },

    EndTransaction: function (inDelay) {
        enyo.job.stop("job.TransactionManager.Timeout");

        if (this.curTransaction) {
            if (inDelay) {
                setTimeout(function () {
                    enyo.log("Transaction '" + this.curTransaction + "' Complete");
                    this.curTransaction = undefined;
                    this.doEndTransaction();
                }.bind(this), inDelay);
            }
            else {
                enyo.log("Transaction '" + this.curTransaction + "' Complete");
                this.curTransaction = undefined;
                this.doEndTransaction();
            }
        }
    },

    _EndTransactionTimeout: function () {
        enyo.job.stop("job.TransactionManager.Timeout");
        enyo.log("Warning, Transaction '" + this.curTransaction + "' Timed Out");
        this.EndTransaction();
    }
});
