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

enyo.kind({
    name: "DarkSwipeable",
    kind: enyo.SwipeableItem,

    className: "enyo-item enyo-swipeableitem enyo-confirmprompt-scrim dark-swipeable",

    chrome: [
        {name: "client", className: "dark-swipeable-client", domStyles: {position: "relative", "background-color": "#E6E6E6"}},
        {name: "confirm"/*, domStyles: {"margin":"-20px 0px;"}*/, canGenerate: false, showing: false, kind: "ScrimmedConfirmPrompt", className: "enyo-fit", onConfirm: "confirmSwipe", onCancel: "cancelSwipe"}
    ],

    dragHandler: function (inSender, inEvent) {
        var dx = this.getDx(inEvent);

        if (this.handlingDrag) {
            if (this.hasNode()) {
                this.$.client.hasNode().style.webkitTransform = "translate3d(" + dx + "px, 0, 0)";
                this.doDrag(dx);
            } else {
                // FIXME: This can occur if a RowServer generates a row node (therefore disabling node access)
                console.log("drag with no node!");
            }
            return true;
        }
    },

    resetPosition: function () {
        if (this.$.client.hasNode()) {
            this.$.client.hasNode().style.webkitTransform = "";
            this.doDrag(0);
        }
    }

});
