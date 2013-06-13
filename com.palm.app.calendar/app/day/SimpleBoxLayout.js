// @@@LICENSE
//
//      Copyright (c) 2010-2013 LG Electronics, Inc.
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


// TODO: Refactor common code in HJSFlex and VJSFlex into base, mixin, or delegate

enyo.kind({
    name      : "HJSFlex",
    kind      : "Control",
    layoutKind: "HJSFlexLayout",
    components: [
        {kind: "ApplicationEvents", onWindowRotated: "windowRotatedHandler"}
    ],

    create: function create() {
        this.inherited(arguments);
        this.performResize = enyo.bind(this, this.performResize);
    },

    destroy: function destroy() {
        this.watched && window.removeEventListener('resize', this.performResize) && (this.watched = false);
        this.inherited(arguments);
    },

    windowRotatedHandler: function windowRotatedHandler(from, event) {
        if (!this.isVisible()) {
            this.rotatedWhileHidden = true;
        }
    },

    becameCurrentPaneHandler: function becameCurrentPaneHandler(isCurrentPane) {
        if (isCurrentPane && this.rotatedWhileHidden) {
            this.rotatedWhileHidden = false;
            this.isCurrentPane = true;
            this.performResize();
            this.broadcastMessage("childrenNeedResize", [true]);
        }
        else {
            this.isCurrentPane = false;
        }
    },

    isVisible: function isVisible() {
        var obj = this;
        if (!obj.parent) {
            return false;
        }
        while (obj.parent) {
            if (obj.parent.showing == false) {
                return false;
            }
            obj = obj.parent;
        }
        return true;
    },

    performResize: function performResize() {
        if (this.isCurrentPane || this.isVisible()) {
            this.calcWidth = undefined;
            this.calcHeight = undefined;
            this.rendered();
        }
    },

    resized: function () {
        // console.log("H-resized", this, arguments);
    },

    rendered: function () {
        // console.log("H-rendered", this, arguments);
        var width, height;
        if (this.calcWidth || this.calcHeight) {
            // console.log("Cached size");
            width = this.calcWidth;
            height = this.calcHeight;
        }
        else {
            var node = this.hasNode();
            width = node.offsetWidth;
            height = node.offsetHeight;
            if (!this.watched) {
                // console.log("Adding watcher");
                window.addEventListener('resize', this.performResize);
                this.watched = true;
            }
        }
        if (!(this.children && this.children.length)) {
            return;
        }
        // Find out how much space we have that is flexible and how many shares to
        // split it between.
        var remaining = width, flex = 0;
        var numChildren = this.children.length;
        for (var i = 0; i < numChildren; i++) {
            var child = this.children[i];
            child.size && (remaining -= child.size);
            child.flex && (flex += child.flex);
        }
        if (flex) {
            var unit = remaining / flex;
            var remainder = 0;
        }
        var offset = 0;
        for (i = 0; i < numChildren; i++) {
            var child = this.children[i];
            var childNode = child.hasNode();
            if (!childNode) {
                return;
            }
            var calcWidth;
            if (child.flex) {
                var size = unit * child.flex;
                // Share spare pixels to those that want them most
                remainder += size % 1;
                size = Math.floor(size);
                if (remainder > 0.5) {
                    remainder -= 1;
                    size++;
                }
                calcWidth = size;
            }
            else {
                calcWidth = child.size;
            }
            if (offset) {
                childNode.style.left = offset + "px";
            }
            childNode.style.width = calcWidth + "px";
            childNode.style.height = height + "px";
            offset += calcWidth;
            child.calcHeight = height;
            child.calcWidth = calcWidth;
        }
        this.inherited(arguments);
    }
});


enyo.kind({
    name      : "VJSFlex",
    kind      : "Control",
    layoutKind: "VJSFlexLayout",
    destroy   : function () {
        this.watched && window.removeEventListener('resize', this.resizedEvent, true) && (this.watched = false);
        this.inherited(arguments);
    },
    resized   : function () {
        // console.log("V-resized", this, arguments);
    },
    rendered  : function () {
        // console.log("V-rendered", this, arguments);
        if (this.calcWidth || this.calcHeight) {
            // console.log("Cached size");
            width = this.calcWidth;
            height = this.calcHeight;
        }
        else {
            var node = this.hasNode();
            width = node.offsetWidth;
            height = node.offsetHeight;
            if (!this.watched) {
                var self = this;
                // console.log("Adding watcher");
                this.resizedEvent = function () {
                    self.rendered();
                };
                window.addEventListener('resize', this.resizedEvent, true);
                this.watched = true;
            }
        }
        if (!(this.children && this.children.length)) {
            return;
        }
        // Find out how much space we have that is flexible and how many shares to
        // split it between.
        var remaining = height, flex = 0;
        var numChildren = this.children.length;
        for (var i = 0; i < numChildren; i++) {
            var child = this.children[i];
            child.size && (remaining -= child.size);
            child.flex && (flex += child.flex);
        }
        if (flex) {
            var unit = remaining / flex;
            var remainder = 0;
        }
        var offset = 0;
        for (i = 0; i < numChildren; i++) {
            var child = this.children[i];
            var childNode = child.hasNode();
            if (!childNode) {
                return;
            }
            var calcHeight;
            if (child.flex) {
                var size = unit * child.flex;
                // Share spare pixels to those that want them most
                remainder += size % 1;
                size = Math.floor(size);
                if (remainder > 0.5) {
                    remainder -= 1;
                    size++;
                }
                calcHeight = size;
            }
            else {
                calcHeight = child.size;
            }
            if (offset) {
                childNode.style.top = offset + "px";
            }
            childNode.style.height = calcHeight + "px";
            childNode.style.width = width + "px";
            offset += calcHeight;
            child.calcHeight = calcHeight;
            child.calcWidth = width;
            child.offsetTop = offset;
            child.offsetLeft = 0;
        }
        this.inherited(arguments);
    }
});

enyo.kind({
    name: "VJSFlexLayout",
    flow: function (inContainer) {
        // console.log("V-flow", this, arguments);
        var s = inContainer.domStyles;
        s.position = "absolute";
        inContainer.children.forEach(function (child) {
            var s = child.domStyles;
            s["-webkit-box-sizing"] = "border-box";
            s.margin = 0;
            s.position = "absolute";
            if (child.size !== undefined) {
                s.height = child.size + "px";
            }
        });
    }
});

enyo.kind({
    name: "HJSFlexLayout",
    flow: function (inContainer) {
        // console.log("H-flow", this, arguments);
        var s = inContainer.domStyles;
        s.position = "absolute";
        inContainer.children.forEach(function (child) {
            var s = child.domStyles;
            s["-webkit-box-sizing"] = "border-box";
            s.position = "absolute";
            s.margin = 0;
            if (child.size !== undefined) {
                s.width = child.size + "px";
            }
        });
    }
});
