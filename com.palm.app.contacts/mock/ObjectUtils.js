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

ObjectUtils =
{
    type: function (model) {
        if (model === null) {
            return "null";
        } else if (model === undefined) {
            return "undefined";
        } else if (typeof model == "number") {
            return "number";
        } else if (typeof model == "string") {
            return "string";
        } else if (model === true || model === false) {
            return "boolean";
        } else if (Object.prototype.toString.call(model) == "[object Array]") {
            return "array";
        } else if (typeof model == "function") {
            return "function";
        } else {
            return "object";
        }
    },

    extend: function (destination, source) {
        for (var property in source) {
            destination[property] = source[property];
        }
        return destination;
    },

    clone: function (model, options, onnode) {
        return this._clone(model, options || {}, "$", onnode || function (v, p) {
            return v;
        });
    },

    _clone: function (model, options, path, onnode) {
        switch (this.type(model)) {
        case "null":
            return onnode(null, path);
        case "undefined":
            return onnode(undefined, path);
        case "number":
        case "boolean":
        case "string":
            return onnode(model, path);
        case "array":
            return onnode(this._cloneArray(model, options, path, onnode), path);
        case "function":
            return onnode(options.ignoreFunctions ? undefined : model, path);
        case "object":
        default:
            return onnode(this._cloneObject(model, options, path, onnode), path);
        }
    },

    _cloneObject: function (model, options, path, onnode) {
        //Mojo.Log.info("clean object");
        var nmodel = {};
        var count = 0;
        var total = 0;
        for (var key in model) {
            if (!options.ignoreUnderscoreProperties || key.charAt(0) != "_") {
                var val = this._clone(model[key], options, path + "." + key, onnode);
                if (val !== undefined) {
                    nmodel[key] = val;
                    valid = 1;
                    count++;
                }
                total++;
            }
        }
        // If total property count in the new object isnt the same as the old, then we
        // have a partial object.  If we're ignoring them (and this one isnt explicity marked true) we
        // dont include it.
        if ("__partial" in model) {
            count++;
        }
        if (total != count && options.ignorePartialObjects && model.__partial !== true) {
            count = 0;
        }
        return !options.ignoreEmptyObjects || count > 0 ? nmodel : undefined;
    },

    _cloneArray: function (array, options, path, onnode) {
        //Mojo.Log.info("clean array");
        var narray = [];
        var len = array.length;
        for (var i = 0; i < len; i++) {
            var val = this._clone(array[i], options, path + "[" + i + "]", onnode);
            if (val !== undefined || !options.ignoreEmptyArrays) {
                narray.push(val);
            }
        }
        return narray.length > 0 || !options.ignoreEmptyArrays ? narray : undefined;
    },

    /** section: Foundations
     * ObjectUtils.toQueryString(obj) -> String
     * - obj (Object): An object containing key/value pairs.
     *
     * toQueryString takes an object like `{'key1': 'value one', 'key2': 'val2' }`
     * and turns it into a string like `key1=value%20one&key2=val2`.  It replaces
     * the Prototype function Object.toQueryString.
     **/
    toQueryString: function toQueryString(obj) {
        var str = "";

        var key;
        var pairs = [];
        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                var val = obj[key];
                var type = ObjectUtils.type(val);
                var encKey = encodeURIComponent(key);

                switch (type) {
                case "function":
                    // We don't really care about functions.
                    break;

                case "null":
                case "undefined":
                    // { a: undefined, b: 'c' } -> "a&b=c"
                    pairs.push(encKey);
                    break;

                case "number":
                case "string":
                case "boolean":
                    pairs.push(encKey + "=" + encodeURIComponent(val));
                    break;

                case "array":
                    var len = val.length;
                    for (var i = 0; i < len; ++i) {
                        pairs.push(encKey + "=" + encodeURIComponent(val[i]));
                    }
                    break;

                case "object":
                    // Prototype ignores nested objects, so I guess we can, too.
                    break;

                default:
                    throw new Error("Can't convert unknown object type \"" + type + "\" to a query string");
                }
            }
        }

        return pairs.join('&');
    }
};
