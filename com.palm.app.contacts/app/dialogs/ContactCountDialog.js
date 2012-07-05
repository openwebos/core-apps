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

/*jslint white: true, onevar: true, undef: true, eqeqeq: true, plusplus: true, bitwise: true,
 regexp: true, newcap: true, immed: true, nomen: false, maxerr: 500 */
/*global enyo, console, $L */

enyo.kind({
    name           : "ContactCountDialog",
    kind           : "ModalDialog",
    published      : {
        count: 0
    },
    components     : [
        {name: "messageLbl", className: "enyo-item enyo-first", style: "padding: 12px", content: $L("HP WebOS Account")},
        {name: "countLbl", style: "padding: 12px 0px;"},
        {name: "okBtn", kind: "Button", caption: $L("OK"), onclick: "onOKClick", flex: 1, className: "enyo-button-affirmative"}
    ],
    componentsReady: function () {
        this.inherited(arguments);
        this.countChanged();
    },
    countChanged   : function () {
        var template = new enyo.g11n.Template($L("1#1 Contact|##{count} Contacts"));
        this.$.countLbl.setContent(template.formatChoice(this.count, {'count': this.count}));
    },
    onOKClick      : function (inMessage) {
        this.close();
    }
});
