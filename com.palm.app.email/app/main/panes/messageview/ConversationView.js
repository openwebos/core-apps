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
    name: "ConversationView",
    kind: "enyo.Control",

    layoutKind: "VFlexLayout",

    published: {
        emails: [],
        exclusive: false // whether only one email can be expanded at at time
    },
    
    events: {
        onComposeMessage: ""
    },

    components: [
        {name: "scroller", flex: 1, kind: "enyo.Scroller", onScrollStop: "handleScrollStop", components: [
            {name: "messages", kind: "SlottedList"}
        ]}
    ],

    create: function () {
        this.inherited(arguments);

        this.messageViewsById = {};
    },
    
    destroy: function() {
        Object.keys(this.messageViewsById).forEach(function (id) {
            this.messageViewsById[id].destroy();
        }, this);
        
        this.messageViewsById = {};
        
        this.inherited(arguments);
    },

    emailsChanged: function (old) {
        var i;
        var id;

        var oldMessageViews = this.messageViewsById;
        var updatedMessageViews = {};

        this.$.messages.setSize(this.emails.length);

        for (i = 0; i < this.emails.length; i += 1) {
            var data = this.emails[i];
            id = data._id;

            var control = oldMessageViews[id];

            if (control) {
                control.updateEmailData(data);

                updatedMessageViews[id] = control;
                delete oldMessageViews[id];
                
                this.$.messages.setItem(i, control);
            } else {
                // Create new control
                var dbEmail = this.createComponent({
                    kind: "DatabaseEmail",
                    data: data
                });

                control = this.createComponent({
                    kind: "MessageView",
                    visibleOnScreen: false,
                    enableFooter: EmailApp.Util.isThreadingEnabled(),
                    onComposeMessage: "doComposeMessage",
                    onExpandedChanged: "messageExpandedChanged"
                });
                control.setEmail(dbEmail); // this passes ownership of dbEmail to the MessageView

                updatedMessageViews[id] = control;
                
                this.$.messages.setItem(i, control);
                control.render();
                
                // TODO animate?
            }
        }

        // Clean up old controls
        Object.keys(this.messageViewsById).forEach(function (id) {
            if (!updatedMessageViews[id]) {
                // no longer exists
                oldMessageViews[id].destroy();
            }
        }, self);

        this.messageViewsById = updatedMessageViews;
    },

    forEachMessageView: function (callback, context) {
        var i;

        for (i = 0; i < this.emails.length; i += 1) {
            callback.call(context, this.$.messages.getItem(i), i);
        }
    },

    scrollToTop: function (immediate) {
        //this.log("scrolling to top " + immediate);
    
        if (immediate) {
            this.$.scroller.setScrollTop(0);
            this.$.scroller.setScrollLeft(0);
        } else {
            this.$.scroller.scrollTo(0, 0);
        }
    },
    
    scrollToMessageIndex: function (index, immediate) {
        var control = this.$.messages.getItem(index);
        
        if (!control) {
            return;
        }
        
        var top = control.getBounds().top;
        
        if (index > 0) {
            top -= 15; // adjust slightly so you can see previous message border
        }
        
        //this.log("scrolling to index " + index + " at " + top + " " + immediate);
        
        if (immediate) {
            //this.$.scroller.setScrollTop(top);
            //this.$.scroller.setScrollLeft(0);
            
            // FIXME private APIs -- workaround scroller bug (still glitchy)
            this.$.scroller.setScrollPositionDirect(0, top);
        } else {
            this.$.scroller.scrollTo(top, 0);
        }
    },

    handleScrollStop: function (sender, event) {
        // Handle marking read, etc.
        // TODO: Move to scroll instead of scroll stop, due to enyo not reporting
        // the scroll stop until a second or two after it stops.
        this.updateVisibleOnScreen();
    },

    // Update controls when scrolling
    updateVisibleOnScreen: function () {
        var scrollVisTop = this.$.scroller.getScrollTop();
        var scrollVisBottom = scrollVisTop + this.$.scroller.getBounds().height;

        //console.log("scroll top " + scrollVisTop + " bottom " + scrollVisBottom);

        this.forEachMessageView(function (control, i) {
            var cb = control.getBounds();

            if (!cb) {
                return;
            }

            var controlTop = cb.top, controlBottom = controlTop + cb.height;

            var fuzzTop = 150; // minimum header pixels that must be visible
            var fuzzBottom = 50; // pixels past end that are still considered having viewed message
            var isVisibleOnScreen = !(controlTop + fuzzTop > scrollVisBottom || controlBottom + fuzzBottom < scrollVisTop);

            if (isVisibleOnScreen) {
                control.autoMarkRead(false); // false = don't force
            }

            //console.log("control " + i + " top " + controlTop + " bottom " + controlBottom + " visible = " + isVisibleOnScreen);
        }, this);
    },

    messageExpandedChanged: function (sender) {
        // If we're in exclusive mode, then expanding one message should collapse all others
        if (this.exclusive && sender.getExpanded()) {
            // collapse other messages
            this.forEachMessageView(function (control, i) {
                if (control != sender) {
                    control.setExpanded(false);
                }
            }, this);

            // scroll to message
            var bounds = sender.getBounds();
            this.$.scroller.scrollIntoView(bounds.top, 0);
        }
    }
});

/*
 * A container that displays a list of controls.
 * Controls are contained but not owned by the SlottedList, and can be
 * accessed from or moved to specific indexes with getItem() and setItem().
 */
enyo.kind({
    name: "SlottedList",
    kind: "enyo.Control",

    published: {
        size: 0,
        accelerated: true
    },

    create: function () {
        this.inherited(arguments);
    },

    sizeChanged: function (oldSize) {
        /*jshint loopfunc:true */
        var control;
    
        while (this.size > oldSize) {
            control = this.createComponent({kind: enyo.Control, className: this.accelerated ? "enyo-virtual-repeater-strip" : ""});
            control.render();
            oldSize += 1;
        }

        var controls = this.getControls();
        while (this.size < oldSize && oldSize > 0) {
            // remove children
            control = controls[oldSize - 1];
            control.children.forEach(function (child) {
                child.setParent(null);
            });

            // destroy control
            controls[oldSize - 1].destroy();
            oldSize -= 1;
        }
    },

    getItem: function (index) {
        return this.controls[index].children[0];
    },

    setItem: function (index, control) {
        var existing = this.getItem(index);

        if (existing === control) {
            return;
        } else if (existing) {
            existing.setParent(null);
        }

        if (control) {
            control.setParent(this.controls[index]);
        }
    }
});