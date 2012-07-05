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
    name                : "OKCancelDialog",
    kind                : "ModalDialog",
    published           : {
        message      : "",
        showOkBtn    : true,
        showCancelBtn: true
    },
    events              : {
        onOK    : "",
        onCancel: ""
    },
    components          : [
        {name: "messageLbl"},
        {kind: "Control", layoutKind: "HFlexLayout", pack: "justify", components: [
            {name: "cancelBtn", kind: "Button", caption: $L("Cancel"), onclick: "onCancelClick", flex: 1},
            {name: "okBtn", kind: "Button", caption: $L("OK"), onclick: "onOKClick", flex: 1, className: "enyo-button-affirmative"}
        ]}
    ],
    componentsReady     : function () {
        this.inherited(arguments);
        this.showCancelBtnChanged();
        this.showOkBtnChanged();
    },
    openDialog          : function (inMessage) {
        this.message = inMessage;
        this.openAtCenter();
    },
    renderMessage       : function () {
        this.$.messageLbl.setContent(this.message);
    },
    showCancelBtnChanged: function () {
        this.$.cancelBtn.setShowing(this.showCancelBtn);
    },
    showOkBtnChanged    : function () {
        this.$.okBtn.setShowing(this.showOkBtn);
    },
    onOKClick           : function () {
        this.doOK();
        this.close();
    },
    onCancelClick       : function () {
        this.doCancel();
        this.close();
    }
});
