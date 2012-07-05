// @@@LICENSE
//
//      Copyright (c) 2011-2012 Hewlett-Packard Development Company, L.P.
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

enyo.kind({
        name: "Calc.Small",  // A simple full screen layout
        className: "calc-desktop",
        kind: "enyo.VFlexBox", pack: "center", align: "center", 
        displayLength: 12,    // Max digits displayable, including sign, leading zero, and exponent. Don't overflow this.
        components: [
                     {kind: enyo.VFlexBox, className: "calc-small-body", components: [
                {kind: "HFlexBox", flex: 1, className: "calc-display", components: [
                        {name: "display", content: $L("0"),  flex: 5 },
                                                {kind: "HFlexBox", flex:1, align:"center", pack:"center", components: [ 
                        {name: "b", kind: "Calc.bsp"} ]}
                ]},
                {kind: "HFlexBox", defaultKind: "Calc.Button", flex: 1, components: [
                        {name: "M", caption: $L("MC"), operation: "memoryClear"},
                        {name: "a", caption: $L("M+"), operation: "memoryAdd"},
                        {name: "A", caption: $L("M\u2013"), operation: "memorySubt"},
                        {name: "m", caption: $L("MR"), operation: "memoryRecall"}
                ]},
                {kind: "HFlexBox", flex: 1, components: [
                        {kind: "Calc.%", name: "%"},
                        {kind: "Calc.q", name: "q"},
                        // {kind: "Calc.Button", caption: $L("AC"), operation: "ac"}, //Not needed with double-ce behavior.
                        {kind: "Calc.g", name: "g"},
                        {kind: "Calc.BinaryOp", name: "/", caption: $L("\u00F7")}
                ]},
                {kind: "HFlexBox", defaultKind: "Calc.Digit", flex: 1, components: [
                        {caption: $L("7")},
                        {caption: $L("8")},
                        {caption: $L("9")},
                        {kind: "Calc.BinaryOp", name: "*", caption: $L("\u00D7")}
                ]},
                {kind: "HFlexBox", defaultKind: "Calc.Digit", flex: 1, components: [
                        {caption: $L("4")},
                        {caption: $L("5")},
                        {caption: $L("6")},
                        {kind: "Calc.BinaryOp", name: "-", caption: $L("\u2013")}
                ]},
                {kind: "HFlexBox", defaultKind: "Calc.Digit", flex: 1, components: [
                        {caption: $L("1")},
                        {caption: $L("2")},
                        {caption: $L("3")},
                        {kind: "Calc.BinaryOp", caption: $L("+")}
                ]},
                {kind: "HFlexBox", flex: 1, components: [
                        {kind: "Calc.c", name: "c"},
                        {kind: "Calc.Digit", caption: $L("0")},
                        {kind: "Calc.Digit", name: ".", caption: "."},     
                        {kind: "Calc.Button", caption: $L("="), operation: "totalOp"} 
                ]}
           ]}
        ],
        
        create: function () {
                        this.inherited(arguments);
                        var fmts = new enyo.g11n.Fmts();
                        this.$["."].setCaption(fmts.dateTimeFormatHash.numberDecimal);
                }
});