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


//* @public
/**
 This transition performs as we would expect enyo's Simple transition to work with
 panes, an effectively serves as a drop-in replacement for the Fade transition.
 */

enyo.kind({
    name               : "calendar.SimpleTransition",
    //* @protected
    kind               : enyo.Component,
    viewChanged        : function (inFromView, inToView) {
        this.fromView = inFromView;
        this.toView = inToView;
        this.begin();
    },
    isTransitioningView: function (inView) {
        return (inView == this.fromView) || (inView == this.toView);
    },
    begin              : function () {
//		NOTE: This part from Simple transition is what causes the problem.
//		var t1 = this.pane.transitioneeForView(this.fromView);
//		if (t1) {
//			t1.hide();
//		}
//		var t2 = this.pane.transitioneeForView(this.toView);
//		if (t2) {
//			t2.show();
//		}
        this.done();
    },
    done               : function () {
        this.pane.transitionDone(this.fromView, this.toView);
    }
});