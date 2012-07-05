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

/*jslint white: true, onevar: true, undef: true, eqeqeq: true, plusplus: true, bitwise: true,
 regexp: true, newcap: true, immed: true, nomen: false, maxerr: 500 */
/*global MojoLoader */


//a much better stringify than JSON.stringify, since it doesn't die when given a circular structure.
//however, it's not guaranteed to produce valid JSON (namely, not when given a circular structure or a structure containing functions)
function stringify(root, printFunctionCode, indentSize, maxDepth) {
    var keysFn = Object.keys || function (obj) {
        var keys = [],
            key;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                keys.push(key);
            }
        }
        return keys;
    },
        newline = "",
        indentToken = "",
        gap = "",
        isArray = Array.isArray || function (obj) {
            return !!(obj && obj.concat && obj.unshift);
        },
        extend = function (destination, source) {
            for (var property in source) {
                destination[property] = source[property];
            }
            return destination;
        },
        clone = function (obj) {
            if (isArray(obj)) {
                return obj.slice(0);
            }
            return extend({}, obj);
        };

    //if the caller doesn't pass an indentSize, default to 4.  but let them pass 0
    if (!indentSize && indentSize !== 0) {
        indentSize = 4;
    }

    //if the caller doesn't pass a max depth, default to 5.  but let them pass 0
    if (!maxDepth && maxDepth !== 0) {
        maxDepth = 5;
    }

    if (indentSize) {
        indentSize = (indentSize > 10) ? 10 : indentSize;
        newline = "\n";
        indentToken = "          ".substring(0, indentSize);
        gap = " ";
    }

    //return whether the given node has been visited already, and if not mark it as visited
    function visitNode(visitedNodes, node) {
        var visited = false,
            i;

        for (i = 0; i < visitedNodes.length; i += 1) {
            if (visitedNodes[i] === node) {
                visited = true;
                break;
            }
        }

        if (!visited) {
            visitedNodes.push(node);
        }

        return visited;
    }

    //copied from Foundations.ObjectUtils
    function type(model) {
        if (model === null) {
            return "null";
        } else if (model === undefined) {
            return "undefined";
        } else if (typeof model === "number") {
            return "number";
        } else if (typeof model === "string") {
            return "string";
        } else if (model === true || model === false) {
            return "boolean";
        } else if (Object.prototype.toString.call(model) === "[object Array]") {
            return "array";
        } else if (typeof model === "function") {
            return "function";
        } else {
            return "object";
        }
    }

    function stringifyHelper(curDepth, curNodeName, curNode, visitedNodes, curIndent) {
        var curNodeType = type(curNode),
            name = curIndent + ((curNodeName) ? "\"" + curNodeName + "\":" + gap : ""),
            innerVisitedNodes,
            visited,
            i,
            keys,
            retVal;

        curDepth += 1;

        if (curDepth > maxDepth) {
            return name + "<Truncated: Max Depth Reached>";
        }

        switch (curNodeType) {
        case "null":
            return name + "null";

        case "undefined":
            return name + "undefined";

        case "number":
            return name + curNode;

        case "string":
            return name + JSON.stringify(curNode);

        case "boolean":
            return name + curNode;

        case "array":
            innerVisitedNodes = clone(visitedNodes);
            visited = visitNode(innerVisitedNodes, curNode);
            if (visited) {
                return name + "<Already Visited Array>";
            } else {
                retVal = name + "[";

                for (i = 0; i < curNode.length; i += 1) {
                    retVal += (i === 0) ? newline : "";
                    retVal += stringifyHelper(curDepth, "", curNode[i], innerVisitedNodes, curIndent + indentToken);
                    retVal += (i < curNode.length - 1) ? "," : "";
                    retVal += newline;
                }

                retVal += (i > 0) ? curIndent : "";
                retVal += "]";
                return retVal;
            }
            //this isn't necessary, except that jslint doesn't do path analysis - both paths of the if return
            break;

        case "function":
            if (printFunctionCode) {
                return name + curNode.toString();
            } else {
                return name + "<Function>";
            }
            //this isn't necessary, except that jslint doesn't do path analysis - both paths of the if return
            break;

        case "object":
            innerVisitedNodes = clone(visitedNodes);
            visited = visitNode(innerVisitedNodes, curNode);
            if (visited) {
                return name + "<Already Visited Object>";
            } else {
                retVal = name + "{";
                keys = keysFn(curNode);

                for (i = 0; i < keys.length; i += 1) {
                    retVal += (i === 0) ? newline : "";
                    retVal += stringifyHelper(curDepth, keys[i], curNode[keys[i]], innerVisitedNodes, curIndent + indentToken);
                    retVal += (i < keys.length - 1) ? "," : "";
                    retVal += newline;
                }

                retVal += (i > 0) ? curIndent : "";
                retVal += "}";
                return retVal;
            }
        }
    }

    return stringifyHelper(0, "", root, [], "");
}
