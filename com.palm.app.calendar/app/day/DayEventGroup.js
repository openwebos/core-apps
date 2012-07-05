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
 NOTE: The DayEventGroup is a very customized Enyo control
 - It is mandatory to pass in an array of events that have gone through layoutmanager.positionEvents
 - Once an array of positioned events is passed to it, DayEventGroup generate custom HTML into itself that will render as defined by layoutManager
 - DayEventGroup is one big clickHandler, when tapped, it will determine if an empty hour was clicked or one of its events, and share the data accordingly
 **/

enyo.kind({
    name                   : "calendar.day.DayEventGroup",
    className              : "eventGroup",
    kind                   : "Control",
    defaultKind            : "calendar.day.DayEvent",
    timeMachine            : new Date(),
    hourHeight             : 59,
    minWidthToShowText     : 30,
    minHeightToShowLocation: 38,
    minHeightToShowNote    : 58,
    published              : {
        events: null, // Object	: For setting this group's events.
        date  : null,
        edge  : "none"
    },
    edges                  : {
        "default": {width: 12, borderWidth: 2, spacing: 2, className: " edge"}, // edge's width and total border width (left+right) and spacing (left+right)
        none     : {width: 0, borderWidth: 0, spacing: 0, className: ""}
    },
    G11N                   : {
        defaults: {
            subject: $L("No Subject")
        }
    },
    components             : [
        {kind: "ApplicationEvents", onWindowRotated: "windowRotatedHandler"}
    ],

    create: function create() {
        this.inherited(arguments);
        this.performResize = enyo.bind(this, this.performResize);
        this.changeEventColor = enyo.bind(this, this.changeEventColor);
        this.resetEventColor = enyo.bind(this, this.resetEventColor);
        this.eventsChanged();
    },

    destroy: function destroy() {
        this.watched && window.removeEventListener('resize', this.performResize, true) && (this.watched = false);
        this.inherited(arguments);
    },

    rendered: function () {
        this.getDimensions();
        this.inherited(arguments);
    },

// BEGIN :-------: Framework Handlers :-----------------------------------------------------------------------------------------------------------------------//

    clickHandler: function (inSender, domEvent) {
        if (inSender.id == domEvent.target.id) {
            this.createTimedEvent(domEvent);
            return true;
        } else {
            var domSubstr = domEvent.target.id.split(inSender.id)[1];
            var numEvents = this.events.length;
            var event;
            for (var i = 0; i < numEvents; i++) {
                event = this.events[i];
                if (domSubstr.indexOf(event._id) >= 0) {
                    DEBUG && this.log("You clicked on: " + event.subject);
                    var eventToShow = JSON.parse(JSON.stringify(event));
                    enyo.application.share({showEvent: eventToShow});
                    return true;
                }
            }
            this.log(domEvent.target.id);
            this.log(inSender.id);
            return false;
        }
    },

    mousedownHandler: function (inSender, inEvent) {
        this.timerOn = false;
        if (inSender.id !== inEvent.target.id) {        //an event was clicked
            this.mouseDownTimeOut = setTimeout(this.changeEventColor, 150, inSender, inEvent);
            this.timerOn = true;
        }
    },

    mouseupHandler: function (inSender, inEvent) {
        if (this.timerOn) {
            this.changeEventColor(inSender, inEvent);
            this.mouseUpTimeOut = setTimeout(this.resetEventColor, 250, inSender, inEvent);
        } else {
            this.resetEventColor(inSender, inEvent);
        }
    },

    dragstartHandler: function (inSender, inEvent) {
        if (this.timerOn) {
            clearTimeout(this.mouseDownTimeOut);
            this.timerOn = false;
        } else {
            this.resetEventColor(inSender, inEvent);
            clearTimeout(this.mouseDownTimeOut);
        }
    },

    windowRotatedHandler: function windowRotatedHandler(from, event) {
        if (!this.isVisible()) {
            this.rotatedWhileHidden = true;
        }
    },

// BEGIN :-------: Custom Handlers :--------------------------------------------------------------------------------------------------------------------------//

    childNeedsResizeHandler: function childNeedsResizeHandler(resizeNeeded) {
        this.becameCurrentPaneHandler(resizeNeeded);
    },

    becameCurrentPaneHandler: function becameCurrentPaneHandler(isCurrentPane) {
        if (isCurrentPane && this.rotatedWhileHidden) {
            this.rotatedWhileHidden = false;
            this.isCurrentPane = true;
            this.performResize();
        }
        else {
            this.isCurrentPane = false;
        }
    },

// BEGIN :-------: Published Property Handlers :--------------------------------------------------------------------------------------------------------------//

    eventsChanged: function eventsChanged(inOldEvents) {
        if (!this.events) {
            return;
        }

        //if(this.events == inOldEvents) {
        //	return;
        //}
        this.calcEventPositions();
        this.render();
    },

    edgeChanged: function edgeChanged(oldEdge) {
        var edge = this.edge;

        // Sanitize the new edge settings
        if (!edge || !this.edges[edge]) {
            edge = "none";
        }

        // If there is a edge and was a old edge, drop out if it hasn't changed.
        if (edge && edge === oldEdge) {
            return;
        }

        this.eventsChanged();
    },

// BEGIN :-------: Custom Methods :---------------------------------------------------------------------------------------------------------------------------//

    changeEventColor: function changeEventColor(inSender, inEvent) {
        this.timerOn = false;
        var domSubstr = inEvent.target.id.split(inSender.id)[1];
        var numEvents = this.events.length;
        var innerElements = this.node.children;
        var event;
        for (var i = 0; i < numEvents; i++) {
            event = this.events[i];
            if (domSubstr.indexOf(event._id) >= 0) {    //clicked event
                this.clickedElement = i;
                innerElements[i].className += ' held';
                break;
            }
        }
    },

    resetEventColor: function resetEventColor(inSender, inEvent) {
        this.timerOn = false;
        clearTimeout(this.mouseDownTimeOut);
        if (inSender.id !== inEvent.target.id) {
            var innerElements = this.node.children;
            for (var i = 0; i < innerElements.length; i++) {
                if (i == this.clickedElement) {
                    var edge = this.edge || "none";
                    edge = edge && this.edges[edge] || this.edges.none;
                    innerElements[i].className = 'event theme-' + this.events[i].color + edge.className;
                    break;
                }
            }
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
            this.eventsChanged(/*this.events*/);
        }
    },

    getDimensions: function () {
        /* Calculate the height and width of the current container, using cached values if available (prevents DOM layouts) */
        var width, height;
        if (this.calcWidth || this.calcHeight) {
            // console.log("Cached size");
            return {width: this.calcWidth, height: this.calcHeight};
        } else {
            var node = this.hasNode();
            this.calcWidth = width = node.offsetWidth;
            this.calcHeight = height = node.offsetHeight;
            if (!this.watched) {
                var self = this;
                // console.log("Adding watcher");
                window.addEventListener('resize', this.performResize, true);
                this.watched = true;
            }
            return {width: this.calcWidth, height: this.calcHeight};
        }
    },

    calcEventPositions: function () {
        /* Go through all events and figure out their top, left, height, and width with respect to the current container */
        var width = this.getDimensions().width;
        var hourHeight = this.hourHeight;
        for (var i = 0; this.events && i < this.events.length; i++) {
            var event = this.events[i],
                end = event.renderEndTime || event.dtend,
                start = event.renderStartTime || event.dtstart,
                minutes = ((end - start) / 60000),
                height = (minutes < 30 ? 30 : minutes * hourHeight / 60) - 1,
                top = this.timeMachine.setTime(start) && this.timeMachine.getMinutes(),
                thisHour = Math.floor(event.start_decimal / 100);

            top = top + thisHour * hourHeight;

            event.top = top;
            event.height = height;
            event.width = width / event.overlap_count;
            event.left = event.overlap_index * width / event.overlap_count;
        }
    },

    createTimedEvent: function createTimedEvent(domEvent) {
        this.timeMachine.setTime(this.date || Date.now())
        var date = this.timeMachine;

        var hour = Math.floor(domEvent.offsetY / 59), // Store the current hour.
            minute = 0;    //Math.ceil (date.getMinutes() / 15) * 15	// Calculate the closest 15 minute interval after the current time.
        date.clearTime();												// Set the event's time to midnight.
        date.set({hour: hour, minute: minute});							// Set the event's hour and minute.

        var createEvent = {
            event: {dtstart: +date},
            then : enyo.bind(this, this.createEventThen, hour, true)
        };
        enyo.application.share({createEvent: createEvent});					// Request event creation.
        return true;
    },


    createEventThen: function createEventThen(hour, show, event) {
        if (!event) {
            this.error("\tFailed to create event GUI using event [", event, "] and hour [", hour, "].\t");
            return;
        }

        show && event && enyo.application.share({showEvent: event});		// Request showing the event.
    },

    getInnerHtml: function () {
        /* This control exists to encapsulate all would-be children, as such we don't actually create real enyo children, instead we generate the visual components ourselves, as done by the getInnerHtml routine */
        var events = this.events;
        if (!events) {
            return '';
        }

        var event,
            id,
            htmlString = '',
            idPrefix = this.id,
            numEvents = events && events.length,
            edge = this.edges[this.edge] || this.edges.none,
            edgeWidth = edge.width + edge.borderWidth + edge.spacing,
            widthDiff = edgeWidth + 2, // 2 accounts for the event's border
            minWidthToShowText = this.minWidthToShowText + widthDiff,
            minHeightToShowLocation = this.minHeightToShowLocation,
            minHeightToShowNote = this.minHeightToShowNote;

        for (var i = 0; i < numEvents; i++) {
            event = events[i];
            id = idPrefix + '_' + event._id;
            htmlString += '<div id="' + id + '" class="event theme-' + event.color + edge.className + '" style="'
                + 'top:' + (event.top) + 'px;'
                + 'left:' + (event.left + edgeWidth) + 'px;'
                + 'width:' + (event.width - widthDiff) + 'px;'
                + 'height:' + (event.height) + 'px;">'
            ;

            if (event.width > minWidthToShowText) {
                htmlString += '<div id="' + id + '_subject" class="ellipsis subject">' + enyo.string.escapeHtml(event.subject || this.G11N.defaults.subject) + '</div>';
                /* Don't display location or note if we're too small */
                if (event.height > minHeightToShowLocation) {
                    htmlString += '<div id="' + id + '_location" class="ellipsis location">' + enyo.string.escapeHtml(event.location || '') + '</div>';
                    /* Don't display note if we're too small */
                    if (event.height > minHeightToShowNote) {
                        htmlString += '<div id="' + id + '_note" class="ellipsis note">' + enyo.string.escapeHtml(event.note || '') + '</div>';
                    }
                }
            }
            htmlString += '</div> ';
        }
        return htmlString;
    }
});
