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

/* Provides a subscribe/broadcast event framework */

// Mixin class that adds non-owner-based subscription capabilities
if (!window.EmailApp) {
    window.EmailApp = {};
}

EmailApp.Broadcaster = {
    _broadcasterEventListeners: null,

    /* Add a callback for an event.
     * event: a string with the name of the event (or "all" to receive all events)
     * cb: function which will be called with (broadcaster, args1, arg2, ...)
     * context: context that will be used to apply the function
     */
    addListener: function (event, cb, context) {
        if (!this._broadcasterEventListeners) {
            this._broadcasterEventListeners = [];
        }
        if (!this._broadcasterEventListeners[event]) {
            this._broadcasterEventListeners[event] = [];
        }

        this._broadcasterEventListeners[event].push({callback: cb, context: context || null});
    },

    /* Remove a callback
     */
    removeListener: function (event, listener, context) {
        if (!this._broadcastEventListeners) {
            return;
        }
        
        context = context || null;
    
        function removeEventListeners (event, listener, context) {
            this._broadcasterEventListeners[event] = this._broadcasterEventListeners[event].filter(function (l) {
                return (listener && l.callback !== listener) || (context && l.context !== context);
            });
        }
    
        if (event) {
            removeEventListeners(event, listener, context);
        } else {
            for (var eventName in this._broadcasterEventListeners) {
                removeEventListeners(eventName, listener, context);
            }
        }
    },

    /* Broadcast to listeners */
    broadcast: function (event /*, arg1, arg2, etc */) {
        if (this._broadcasterEventListeners) {
            var listeners, args;

            listeners = this._broadcasterEventListeners[event];
            if (listeners) {
                args = [this].concat(Array.prototype.slice.call(arguments, 1));

                listeners.forEach(function (l) {
                    l.callback.apply(l.context, args);
                }, this);
            }

            /* broadcast to special "all" listener */
            listeners = this._broadcasterEventListeners.all;
            if (listeners) {
                //console.log("broadcasting " + event + " to all " + arguments.length);
                args = [this, event].concat(Array.prototype.slice.call(arguments, 1));

                listeners.forEach(function (l) {
                    l.callback.apply(l.context, args);
                }, this);
            }
        }
    },

    /* Returns list of listeners for event. For debugging only. */
    listeners: function (event) {
        return (this._broadcastEventListeners && this._broadcasterEventListeners[event]) || [];
    }
};

// Adapts EmailApp.Broadcaster events into the enyo component model which allows auto-unsubscribing
// when the component is destroyed. This should be created as a regular sub-component of your UI kind.
enyo.kind({
    name: "EmailApp.BroadcastSubscriber",
    kind: "Component",
    
    published: {
        // Name of an object to subscribe to by default.
        // Must be a global accessible at creation time
        target: null
    },

    create: function () {
        this.inherited(arguments);

        this.subscriptions = [];
        this.eventNames = [];

        // Record values of any properties starting with "on"
        Object.getOwnPropertyNames(this).forEach(function (prop) {
            if (prop.length > 2 && prop.indexOf("on") === 0) {
                if (this[prop]) {
                    this.eventNames.push(enyo.uncap(prop.slice(2)));
                }
            }
        }, this);
        
        if (this.target) {
            var obj = enyo.getObject(this.target);
            
            if (obj) {
                this.subscribe(obj);
            } else {
                console.error("unable to subscribe to missing target " + this.target);
            }
        }
    },

    destroy: function () {
        enyo.forEach(this.subscriptions, function (broadcaster) {
            broadcaster.removeListener(null, null, this);
        });
        
        this.subscriptions = [];

        this.inherited(arguments);
    },

    // [public]
    subscribe: function (broadcaster) {
        enyo.forEach(this.eventNames, function (eventName) {
            var callback = function (sender /* ... */) {
                var args = Array.prototype.slice.call(arguments, 0);
                this.dispatchIndirectly("on" + enyo.cap(eventName), args);
            };

            broadcaster.addListener(eventName, callback, this);
            this.subscriptions.push(broadcaster);
        }, this);
    },

    // [public]
    unsubscribe: function (broadcaster) {
        broadcaster.removeListener(null, null, this);
    
        this.subscriptions = enyo.filter(this.subscriptions, function (b) {
            return b !== broadcaster;
        });
    }
});