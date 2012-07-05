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


/**
 NOTE: This file is meant to hold all hacks used to make the app operational.

 TODO: File enyo Framework bug for HACK_ENYO_DEFAULT_TARGET_EVENT_HANDLER.
 **/
(function defineHACKS(global, window, top, undefined) {

    global.HACKS = {
        HACK_ENYO_DEFAULT_TARGET_EVENT_HANDLER: function HACK_ENYO_DEFAULT_TARGET_EVENT_HANDLER(handler) {
            /*
             NOTE: This HACK ensures that enyo will use the specified handler as
             its default event handler by modifying the enyo.master components
             list so that the specified handler is first.

             This is necessary because as of version 0.8 enyo still defaults
             to the first created component to handle "back" and "appMenu"
             events and it's unreasonable to expect app authors to
             continuously reorder/defer component instantiation to guarantee
             that the intended component will be used.

             Problematic code exists in enyo.Dispatcher:

             findDefaultTarget: function(e) {
             return enyo.master.getComponents()[0];
             },
             */
            if (!window.PalmSystem) {                                                // If not in a Palm environment (i.e. in browser)
                top && top != window && top.enyo.master.addComponent(handler);		//		normalize for multi-window enyo environment.
            }
            var m = (top || window).enyo.master,
                mcs = handler && m.getComponents(),
                end = mcs ? mcs.length : 0,
                nxt = -1;
            while ((++nxt < end) && (mcs [nxt] != handler)) {   // While the list isn't empty and handler hasn't been found
                m.removeComponent(mcs [nxt]);				        // move the next component
                m.addComponent(mcs [nxt]);                          // to the back of the list.
            }
        }

    };

})(this, this.window, this.top);