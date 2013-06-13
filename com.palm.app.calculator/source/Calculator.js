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
/*global enyo $L console  */ 
/*jslint evil: true */

enyo.kind({
        name: "Calc.App",// A desktop calculator.
        published: {        // Operating registers, independent of display:
                result: 0,              // Current display, as a number rather than a string.
                pending: null,  // Curent display.content is saved in pending when an operator is entered.
                op: "",         // The operator that will be applied when we total things up. 
                pending2: null, // For algebraic precedence. FIXME? Consider using a stack for multiple precedences.
                op2: "",        
                memory: null,    // For m+, m-, mc, mr operators.
                entryCleared: false
        },
        clearDisplayOnEntry: false,
        memoryRecalled: false,
        precision: 15,          // Max precision that is meaningful. Don't allow input or display to imply more.
        displayLength: null,    // Max digits displayable, including sign, leading zero, and exponent. Don't overflow this.
        buttons: null,   // We expect buttons.display and buttons.c (clear button) to be defined. buttons.{pending | operator | memory}Display are optional.
        parsableEnglishDisplayString: "0",
        
        kind: "enyo.Pane",
        components: [
                     {name: "small", kind: "Calc.Small"},
                     {name: "big", kind: "Calc.Simple"},
                     {kind: "AppMenu",
                      style: "width: 210px; height: 160px",  //height needs 200 w/toggle. 210 is the min-width specified in the inherited styling
                      components: [
                                   // {caption: $L("Toggle Size"), onclick: "toggleSize"}, 
                                   {caption: $L("Copy"), onclick: "copyFromDisplay"},
                                   {caption: $L("Paste"), onclick: "pasteToDisplay"},
                                   {kind: "HelpMenu", target: "http://help.palm.com/calculator/index.html"}
                                  ]}
                     ],
        statics: {
                MEMORY_VALUE: new enyo.g11n.Template($L("M: #{value}"))
        },
        toggleSize: function() {
            var v = this.getView() === this.$.big ? this.$.small : this.$.big;
            this.setResult(this.getCurrentEntry());  // Cache result before the change, so we don't lose displayed value.
            this.selectView(v);
            this.viewSelected(this, v);
        },
        viewSelected: function (inSender, inView) {
            this.buttons = inView.$;
            this.displayLength = inView.displayLength;
            enyo.asyncMethod(this, "adjustHeightsAndUpdateDisplays");
        },
        copyFromDisplay: function() {
            var txt = this.buttons.display.getContent();
            enyo.dom.setClipboard(txt);
        },
        pasteToDisplay: function() { 
                var that = this;
                enyo.dom.getClipboard(function(txt) {
                        that.textEntry(txt);
                    });
        },
        textEntry: function(text) { // Enter the given text as instructions.
            // Finds the button named for that character and fires it.
            // Stop if no such button.
            var len = text.length;
            for (var index=0; index<len; index++) {
                var name = text.charAt(index);
                if (name === this._decimal) {name = ".";}
                var aButton = this.findButtonByNameOrCaption(name);
                if (!aButton) {return;}
                this.clickHandler(aButton);  
            }
        },
        findButtonByNameOrCaption: function(aString) {
            // The app owns Calc.Buttons that are named using their caption. e.g, this.buttons['button name']
            var aButton = this.buttons[aString];
            if (aButton) {return aButton;}
            // Try looking it up by caption, in case the text was internationalized.
            for (var bi in this.buttons) {
                if (this.buttons.hasOwnProperty(bi)) {
                    aButton = this.buttons[bi];
		    // aButton.getCaption() is (unecessary?) defensive programming.
		    // But if used, it must be garded by aButton.caption (buttons has layout objects).
                    if (aButton.caption && aButton.getCaption() === aString) {return aButton;} 
                }
            }
            return undefined; //Just to make it clear that it was not found.
        },

        create: function() {
                this.inherited(arguments);
                this.viewSelected(this, this.getView());
                this.ac();  // Comment out this line to make any dummy display values visible on launch.
                var fmts = new enyo.g11n.Fmts();
                this._decimal = fmts.dateTimeFormatHash.numberDecimal;
                this.memoryClear();
        },
        trim: function(n, size) { // Prepares a number for textual display, limiting displayLength and internationalizing.
                size = size || this.displayLength;
                if (typeof(n) === 'string') {
                        console.log('Attempt to trim a string.');
                        n = parseFloat(n);
                }
                if (isNaN(n)) {return $L("Error");}
                // the infinity symbol is already international, so it doesn't need localization
                if (n === Infinity) {return "\u221E";} 
                if (n === -Infinity) {return "-\u221E";} 

                // First try to display with the given precision, as a floating point number:
                if (n < 0) {size--;} // A space for the sign.
                var size2 = this.precision < size ? this.precision : size;
                // For fixed precision numbers with leading zeros, toPrecision() would not count the zeros
                // and so would imply more precision than we really have. (e.g., 10-9.9) Use toFixed() in that case.
                var trimmed = Math.abs(n) < 1 ? n.toFixed(size2) : n.toPrecision(size2);

                // Get rid of any trailing zeros:
                trimmed = parseFloat(trimmed).toString();

                // In general, if trimmed.length > this.displayLength, then use scientific notation with toExponential()
                // and trim off trailing decimals in order to make the whole string fit. e.g.:
                //  12345678901234567       => 1.234568e+16
                // -12345678901234567       => -1.23457e+16
                //  0.000000123456789012345 => 1.2345679e-7
                // However, what should we do about numbers like:
                // 0.3333333333333333
                // 3.3333333333333333
                // 333.33333333333333
                // 0.0003333333333333
                // People tend to prefer trimming these floating point numbers, even with loss of precision, 
                // rather than switching to scientific notation.
                // The heuristic we use is such that if the number can be printed in floating point such that 
                // after trimming to length, there are still SEVEN significant digits remaining after the decimal, 
                // then don't go to scientific notation. e.g.:
                // 3333.3333333
                // -333.3333333
                // 0.0003333333
                // The number seven is not arbitrary. In addition to generally being considered "enough" precision,
                // it is the most that can be shown to the right of the decimal while still fitting in
                // a 12-digit scientific notation display. 12 digits is our minimum goal, so keeping that
                // same precision in fixed point will avoid awkward jumps from one format to the other.
                if (trimmed.length > this.displayLength) {
                    var leadingParts =  !trimmed.match('e') && // i.e., not scientific notation
						(/^\-?0\.0*/.exec(trimmed) || // Leading zeros 0.000..., -0.00...
                         /^\-?\d+\./.exec(trimmed)); // Leading whole numbers and decimal
                    if (leadingParts && (leadingParts[0].length + 7 <= this.displayLength)) {
                        trimmed = trimmed.slice(0, this.displayLength);
                    } else { // Now go to scientific notation. Alternative is to answer Error, but that's not very helpful.
                        size -= 5; // e, + or -, at least one exponent digit, the leading digit and decimal point
                        trimmed = n.toExponential(size);
                        var exponentLength = trimmed.length - trimmed.indexOf('e') - 2; // -2 for e+ or e-
                        if (exponentLength > 1) { // Gotta trim some more.
                            trimmed = n.toExponential(size + 1 - exponentLength);
                        }
                    }
                }
                return trimmed.replace(".", this._decimal);
        },
        // Change methods, keeping aux displays (if any) consistent with registers.
        resultChanged: function(old) {
                // We keep results as full precision floats to reduce roundoff accumulation, 
                //     (e.g., so that 1 / 9 * 9 is as close to 1 as we can keep)
                // but display is trimmed 
                //     (e.g., so that 0.1 + 0.2 displays a 0.3)
                var disp = this.buttons.display;
                this.parsableEnglishDisplayString = ""+this.result;
                disp.setContent(this.trim(this.result));
        },
        pendingChanged: function(old) {
                var disp = this.buttons.pendingDisplay;
                disp && disp.setContent(this.pending!==null ? this.trim(this.pending) : '');
        },
        pending2Changed: function(old) {
                var disp = this.buttons.pendingDisplay2;
                disp && disp.setContent(this.pending2!==null ? this.trim(this.pending2) : '');
        },
        setOpDisplay: function(disp, op) {
            if (!disp) {return;}
            if (!op) {return disp.setContent("");}
            disp.setContent(op.smallCaption || op.getCaption());
        },
        opChanged: function(oldOp) {
            if (oldOp !== "") {oldOp.setState("active", false);}
            if (this.op !== "") {this.op.setState("active", true);}
            this.setOpDisplay(this.buttons.operatorDisplay, this.op);
        },
        op2Changed: function() {
            this.setOpDisplay(this.buttons.operatorDisplay2, this.op2);
        },
        memoryChanged: function() {
                var disp = this.buttons.memoryDisplay;
                var mem = this.memory;
                var m = this.buttons.m;
                m.setState("active", mem !== null);
                if (!disp) {return;}
                if (mem !== null) {mem = Calc.App.MEMORY_VALUE.evaluate({value: this.trim(mem)}); }
                disp.setContent(mem);
        },
       entryClearedChanged: function() {
            this.buttons.c.setState("active", this.entryCleared && (this.pending!==null));
        },
        adjustHeightsAndUpdateDisplays: function() {
            this.adjustHeights();
            this.setResult(this.getCurrentEntry());
            this.setPending(this.getPending());
            this.setOp(this.getOp());
            this.setPending2(this.getPending2());
            this.setOp2(this.getOp2());     
            this.setMemory(this.getMemory());
        },
        adjustHeights: function() {
                // It would be cool if we could style fontSize and lineHeight as a percentage of the container.
                // Alas, we have to set that up manually.
                var container = this.hasNode();
                var keynode =  this.buttons.c.hasNode();
                if (!keynode) {return;} // e.g., in jasmine test harness
                var displaynode = this.buttons.display.hasNode();
                var aux = this.buttons.auxDisplay;
                var h = keynode.clientHeight;
                var w = keynode.clientWidth;
                var v = this.getView();
                
                // yeah in the odd case where we have tall buttons, best keep them contained
                var s = (h < w) ? h : w;
                
                container.style.fontSize = Math.floor(s * 0.9) + "px";
                if (aux) {aux.hasNode().style.fontSize = Math.floor(s * 0.5) + "px";}
                
                displaynode.style.fontSize = Math.floor(s * 0.9) + "px";
                displaynode.style.lineHeight = displaynode.clientHeight + "px"; // Why doesn't a static relative style (e.g., 1 or 100%) work?

                if (v.name === "small") {return;} // This layout is independent of width. There could be other such layouts.
                this.displayLength = v.displayLength;  // A chance to get wide on rotation/resize. Otherwise just set on view selection.
                if (container.clientWidth < 1024) { 
                    this.displayLength = Math.min(12, this.displayLength); // best we can do in portrait mode or on smaller devices. 
                }
        },
        // The next two cause us to adjust heights on resize and when first rendered.
        resizeHandler: function() {
                this.adjustHeightsAndUpdateDisplays();
        },
        rendered: function() {
                this.inherited(arguments);
                enyo.asyncMethod(this, "adjustHeightsAndUpdateDisplays");
        },
        clickHandler: function(inSender, inEvent) { // Trampoline to invoke the operation defined by the inSender (button), in our context
            var op = this[inSender.operation];
            if (!op) {return;} // e.g., a click that is not on a button.
            op.call(this, inSender, inEvent);   // ... as if the button were defined here instead of some layout kind.
        },


        // Editing events.
        // The display is maintained as a string, not a number. It is never empty, but
        // rather always has 0 or the previous results (if any since All Clear).
        bsp: function() {
                // Remove last digit from current display entry, but leave a 0 rather than empty or -.
                var d = this.buttons.display;
                var c = this.parsableEnglishDisplayString;
                c = c.substring(0, c.length-1);
                if (c==="" || c==="-" || this.clearDisplayOnEntry) {c = "0";}
                this.clearDisplayOnEntry = false;
                this.memoryRecalled = false;
                this.parsableEnglishDisplayString = c;
                d.setContent(c.replace(".", this._decimal));
        },
        ce: function() {
                // clear the current display entry, but not pending results, ops, or memory
                // Two ce's in a row do ac.
                if (this.getEntryCleared()) {this.ac(); return;}
                this.setEntryCleared(true);
                this.setResult(0); // which changes display and parsableEnglishDisplayString
        },
        ac: function() {
                // reset everything, i.e., All Clear
                this.setResult(0);   // which changes display
                this.setPending(null);
                this.setOp("");
                this.setPending2(null);
                this.setOp2("");
                this.clearDisplayOnEntry = false;
                this.setEntryCleared(false);
        },
        
        getCurrentEntry: function() {
                // Answer the value to use as the current entry.
                // Might be from a register or from the display itself.
                // try to be good about preserving precision
                var stale = this.clearDisplayOnEntry;
                var fromMemory = this.memoryRecalled;
                this.clearDisplayOnEntry = true;
                this.setEntryCleared(false);
                this.memoryRecalled = false;
                if (fromMemory) {return this.getMemory();}
                if (stale) {
                    return this.getResult();
                }
                return parseFloat(this.parsableEnglishDisplayString); 
        },      // Generic entry and operators, independently of how things are displayed.
        entry: function(inSender) {
                // Append sender's caption to the display. But:
                // No leading zeros (unless fractional);
                // No additional decimal points after the first;
                // When an operator is entered, the old value is left in the display
                // until a new digit is entered. 
                var d = this.buttons.display;
                var c = this.parsableEnglishDisplayString;
                var adding = inSender.getCaption();
                var allowedDigits = this.precision;
                this.memoryRecalled = false;
                if (adding === this._decimal) {
                        // do everything in scientific format, then convert back to locale-specific formatting again later
                        adding = ".";
                }
                this.setEntryCleared(false);
                // Defensive programming against potential future use with keyboard input:
                if (!/\.|\d/.test(adding)) {return;}  // See use of eval() in totalOp.
                
                if (this.clearDisplayOnEntry) {
                        c=""; 
                        this.clearDisplayOnEntry = false;
                }
                if (adding === ".") {
                        if (-1 !== c.indexOf(".")) {} // Do nothing, so that we don't have multiple decimals
                        else if (c === "") {c = "0.";}
                        else {c += adding;}
                } else {
                        if (c === "0") {c="";}
                        c += adding;
                }
                if (c.length > this.displayLength) {return;}
                // Don't add/show precision we can't use.
                if (c.indexOf("-0.") === 0) {allowedDigits += 3;}
                else if (c.indexOf("0.") === 0) {allowedDigits += 2;}
                else {
                        if (c.charAt(0) === '-') {allowedDigits += 1;}
                        if (c.indexOf(".") !== -1) {allowedDigits += 1;}
                }
                if (c.length <= allowedDigits) {
                        this.parsableEnglishDisplayString = c;
                        d.setContent(c.replace(".", this._decimal));
                }
        },
        unaryOp: function(inSender) {
                // Replace the result with the result of applying sender's operator to display.
                var c = this.getCurrentEntry();
                // There are two ways for the op to be specified in the components configuration:
                // either as a function literal, or as a string. In the later case, function is defined in app.
                c = typeof inSender.op === 'function' ? inSender.op(c) : this[inSender.op](c);
                this.setResult(c);
        },
        binaryOp: function(inSender) {
                var opOld = this.getOp();
                var opNew = inSender;
                // Set op and capture display in pending -- leaving display alone as stale data.
                //  This allows the usage: entry, op, = (meaning entry op entry =)
                // If there's already pending data, total it.

                // It is not clear if user expect entry, op1, op2, =  to be:
                //    entry op2 entry
                // or
                //    entry op1 entry op2 entry
                // Here we implement the first behavior. The second can be achieved by removing
                //    && !this.clearDisplayOnEntry
                // and adjusting the 'replaces operator with new' test spec.
                if (this.getPending() !== null && !this.clearDisplayOnEntry) {
                    // If we were just left to right, we would always totalOp() here.
                    var isNewHigh = (opNew.getName()==="*") || (opNew.getName()==="/");
                    if (isNewHigh && ((opOld.getName()==="+") || (opOld.getName()==="-"))) {
                        this.setOp2(opOld);
                        this.setPending2(this.getPending());
                    } else {
                        this.totalOp(null, null, isNewHigh);
                    }
                }
                this.setOp(opNew);
                this.setPending(this.getCurrentEntry());
                this.setResult(this.getPending());
        },
        totalOp: function(ignoredSender, ignoredEvent, isSubTotal) {
                // result = pending op display.content, and update display/op/pending
                var op = this.getOp();
                var p = this.getPending();
                var c = this.getCurrentEntry();
                if (!op) {p=c;}
                else {
                        // N.B.: entry only allows c to contain digits and decimal.
                        p = eval(p + " " + op.getName() + " " + c); // spaces necessary, eg., -1 - -1
                }
                // And then take care of any stacked up addition or substraction.
                op = this.getOp2();
                if (!isSubTotal && op) {
                    p = eval(this.getPending2() + " " + op.getName() + " " + p);
                    this.setOp2("");
                    this.setPending2(null);
                }
                this.setResult(p);
                this.setOp("");
                this.setPending(null);
        },
        
        // Other operations. These cannot be in the components configuration literals
        // if they are to make use of 'this'.
        changeSign: function (v) {
                var d = this.buttons.display;
                var dString = d.getContent();
                var c = this.getCurrentEntry();
                c = 0 - c;
                this.setResult(c);  // Right value, but possibly wrong precision.
                this.clearDisplayOnEntry = false; 
                // Now fix precision display. (Does not effect registers.)
                if (!c) {return d.setContent(dString);} // restore trailing decimals
                if (dString.charAt(0) === '-') {return d.setContent(dString.substring(1));}
                dString = "-" + dString;
                if (dString.length > this.displayLength) {return;} // display will already be in scientific notation
                d.setContent(dString);            
        },
        
        // Memory operations
        memoryClear: function () {
                this.setMemory(null);
                this.memoryRecalled = false;
        },
        memoryAdd: function () {
                var m = this.getMemory();
                if (m===null) {m=0;}
                // Should we refuse to store NaN into memory? For now we allow it, on the grounds that if
                // someone isn't paying attention and memorizes a bad intermediate result, we want them
                // to eventually see an error result when they finally look at the answer. (NaN is infectious.)
                // We don't want them to get a wrong answer by having the calculator silently use a previously
                // memorized number that doesn't have anything to do with the current computation.
                // Of course, infinity should unequivocally be allowed.
                // Same issue with memorySubt, below.
                m += this.getCurrentEntry();  
                this.setMemory(m);
        },
        memorySubt: function () {
                var m = this.getMemory();
                if (m===null) {m=0;}
                m -= this.getCurrentEntry();  // See comment about NaN in memoryAdd, above.
                this.setMemory(m);
        },
        memoryRecall: function () {
                var m = this.getMemory();
                if (m===null) {return;}   // Or we could do m += 0, but that's probably not the right DWIM
                this.clearDisplayOnEntry = true;       
                this.setResult(m);
                this.memoryRecalled = true;  // Prevents string roundoff
        },

        // Small unary ops. Not a button operation, but a function invoked by unaryOp.
        pendingDependentPercent: function (v) { 
            var op = this.getOp();
            switch (op && op.getName()) {
            case "+": // Either + or -
            case "-":  
                // Do the pending op, but not as a total -- keep the pending data around without clearing it.
                return this.getPending() * (v / 100);
            default:
                return v / 100;
            }
        } 
});
