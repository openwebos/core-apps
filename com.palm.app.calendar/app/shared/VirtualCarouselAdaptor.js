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


/*global enyo */

// TODO: DOC: Needs documentation
enyo.kind({
    name            : "calendar.VirtualCarouselAdaptor",
    kind            : enyo.VirtualCarousel,
    constructor     : function () {
        this.inherited(arguments);

        this._oldDoSetupView = this.doSetupView;
        this.doSetupView = this.adaptedSetupView;
    },

    // Overloading the event sending method
    adaptedSetupView: function (inViewHolder, inViewIndex) {
        var signaledIndex;
        switch (this.getIndex()) {
        case 2:
            signaledIndex = 2;
            break;
        case 1:
            signaledIndex = inViewIndex;
            break;
        case 0:
            signaledIndex = -2;
            break;
        }
        DEBUG && this.log("#### doSetupView(): viewIndex: " + this.viewIndex + ", inViewIndex: " + inViewIndex + ", signaledIndex: " + signaledIndex + ", index: " + this.getIndex());

        var show = this._oldDoSetupView(inViewHolder, signaledIndex);
        return show;
    }
});

