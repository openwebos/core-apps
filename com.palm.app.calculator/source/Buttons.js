// @@@LICENSE
//
//      Copyright (c) 2011-2013 LG Electronics, Inc.
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
/*global enyo, $L */ 

enyo.kind({  // Base kind for Calculator buttons.
        name: "Calc.Button",
        kind: "enyo.CustomButton",
        flex: 1,    // Fill available space with stretchiness of one unit.
        className: "calc-operator-key", 
        create: function() {
                // This is (mostly) not important for the functioning of the calculator, but it is 
                // very convenient in debugging and unit testing for each button to be named
                // the same as its caption.
                // For example, we specify the "3" button in the layout as:
                //     {kind: "Calc.Digit", caption: "3"}   // The configuration object literal.
                // and there is application event-handling code that refers to sender.caption 
                // (getting "3").  For testing, we would also like to arrange for the app to be able
                // to find the "3" button by saying this.$["3"]. That's what this statement does.
                //
                // The current implementation of binaryOp uses the name rather than the caption,
                // so that we can use ndash and divide and such as button captions.
                if (arguments.length && !arguments[0].name) {
                        arguments[0].name = arguments[0].caption;       // arguments[0] is a configuration object literal.
                }
                this.inherited(arguments);
        }
});

enyo.kind({
        name: "Calc.Digit", 
        kind: "Calc.Button", 
        className: "calc-key", 
        operation: "entry"  // Defined by our app.
});

enyo.kind({
        name: "Calc.BinaryOp",
        kind: "Calc.Button",
        operation: "binaryOp"  // Defined by our app.
});

enyo.kind({
        name: "Calc.UnaryOp",
        kind: "Calc.Button",
        operation: "unaryOp"    // Defined by our app.
});

// Some specific, reusable buttons
enyo.kind({name: "Calc.bsp", kind: "Calc.Button", 
            className: "calc-backspace-key", // Why doesn't calc-operator-key get picked up automatically from Calc.Button?
                                operation: "bsp"
            });
enyo.kind({name: "Calc.g", kind: "Calc.Button", caption: $L({key: "changeSignKey", value: "\u00B1"}), operation: "changeSign"});
enyo.kind({name: "Calc.q", kind: "Calc.UnaryOp", caption: $L({key: "squareRootKey", value: "\u221A"}), op: function (v) { return Math.sqrt(v); } });
enyo.kind({name: "Calc.%", kind: "Calc.UnaryOp", caption: $L("%"),  op: "pendingDependentPercent"});
enyo.kind({name: "Calc.c", kind: "Calc.Button", caption: $L({key: "clearKey", value: "C"}), operation: "ce", className: "calc-operator-key calc-command-key"});
