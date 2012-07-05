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

var PowerUser = function (name) {
    enyo.application.powerSeq = (enyo.application.powerSeq || 0) + 1;
    this.id = "com.palm.app.email." + name + "-" + enyo.application.powerSeq;
    this.started = false;

    return this;
};

PowerUser.prototype = {
    start: function (durationMs) {
        this.started = true;

        this._startRequest = EmailApp.Util.callService("palm://com.palm.power/com/palm/power/activityStart",
            {id: this.id, duration_ms: durationMs}
        );
    },

    stop: function () {
        if (this.started) {
            this._stopRequest = EmailApp.Util.callService("palm://com.palm.power/com/palm/power/activityEnd",
                {id: this.id}
            );
            this.started = false;
        }
    }
};
