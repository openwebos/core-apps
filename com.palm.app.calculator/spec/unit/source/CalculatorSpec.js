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
/* Unit tests for Calculator:
 * After the code at the top, there are a series of "specs" like this:
 *         it('works in some way' function () {
 *              expect('0.1+0.2=').evalsAs('0.3');
 *         });
 * The text string is a description, the expect()part is the input
 * buttons, and the evalsAs() part is what we expect to see in the
 * display. The format uses one character per button, and there are
 * some odd choices for button names, e.g.:
 *   b = backspace
 *   c = clear
 *   g = sign
 *   q = square root
 *   m = memory recall
 *   M = memory clear
 *   a = memory add (M+)
 *   A = memory subtract (M-)
 */
/*global describe, beforeEach, expect, it, Calc */
/*jslint forin: true */

describe('Calculator', function () {
  // We use one instance of the app for all tests, because we want to see
  // if there are problems that only show up when a lot of stuff is done one after another.
  var app = new Calc.App();
  app.displayLength = 18; // For now, to match the landscape big layout (Calc.Simple).
  
  var buttons = function () {
        // Utility fires a sequence of buttons on our calculator (any number of args), specified by name.
        // E.g., buttons('1', '+', '2', '=');
      var theButton;
        // Note that unlike 'enter', below, a button name here can be more than one char long.
        for (var argKey in arguments) {
                // The app owns Calc.Buttons that are named using their caption. e.g, this.buttons['button name']
            theButton = app.buttons[arguments[argKey]];
            //theButton.fire("onclick");  // Use this if the impelementation of Calc.Button uses enyo onclick handlers (aka "custom events").
            app.clickHandler(theButton);  // Use this if the app defines a clickHandler -- i.e., if it uses DOM events.
        }
  };
  var enter = function (digits) {
        // Compact form of buttons functions above. Takes a string.
        // E.g., enter('1+2=');
        // Requires that each character be a full button name. If want to use a button that 
        // has a multi-character name, you need to use the 'buttons' function directly.
        buttons.apply(this, digits.split(''));
  };

  // Arrange for each test (defined below with it(),) to have some common starting behavior.
  beforeEach(function () {
        app.ac();       // Reset ('all clear') the calculator before each test.
        
        // Create Jasmine matchers in the test harness. Jasmine requires this to be within beforeEach.
        this.addMatchers({
        toShow: function (expected) { 
                        // E.g., expect().toShow('42'); is true if the display is showing '42'.
                var display = app.buttons.display.getContent();
                this.actual = display; // Side-effect harness so it can show us the display string.
                return display === expected; 
        },
        evalsAs: function(expected) {
                // E.g., expect('1+2=').evalsAs('3');
                // Note the restrictions that 'enter' places on button names.
                // If you have multi-char button names, use 'buttons' and 'toShow' directly.
                enter(this.actual); // Jasmine arranges for arg to expected to be in this.actual
                return app.buttons.display.getContent() === expected;
        }
        });
  });

  // N.B.:
  // Keyboard operations are not currently tested (e.g., just buttons). Test Case ID 132969, 132994
  // Help is not currently tested. Test Case ID 132972
  // No automation for Test Case ID 132973 (compare with Windows/Mac/Linux/etc.)
  // Card view testing is not automated. Test Case ID 132974
  // No automation for Test Case ID 132988 (regress severity 1 and 2 bugs)
  // No automation for Test Case ID 132989

  it('starts with zero', function () {
        expect().toShow('0');
  });

  it('enters data', function () {
          var digits = '1234567890';//Test Case ID 132962
          enter(digits);            // An example of enter/toShow, 
          expect().toShow(digits);  // but it's really same as expect(digits).evalsAs(digits)
  });
  
  it('totals', function () {
        expect('1+2=').evalsAs('3');  // An example of evalsAs.
  });
  
  it('starts new calc after =', function () {
        expect('123+32=').evalsAs('155'); // no all clear yet
        expect('12+43=').evalsAs('55');
  });
   
  it('makes negative', function () {
        expect('123g').evalsAs('-123');  // g is one-letter name for sign, leaving s for sin
        app.ac();
        expect('97g3').evalsAs('-973'); // Test Case ID 132987
        app.ac();
        expect('g').evalsAs('0'); // NOT -0 as in Test Case ID 132993. That case is wrong because the calc should never display a nonsense value such as -0.
  });
  
  it('makes positive', function () {
        expect('0-123=g').evalsAs('123');       
  });

  it('does not lose decimal when changing sign', function () {
        expect('0.0g').evalsAs('0.0');
        app.ac();
        expect('0.g').evalsAs('0.');    
        app.ac();
        expect('1.0g').evalsAs('-1.0'); // Test Case ID 132993 additional
        app.ac();
        expect('1.g').evalsAs('-1.');   
  });
  it('does not add extra digits when entering operator', function () {
        expect('7.5+').evalsAs('7.5'); // not 7.500000.. Test Case ID 132980
  });
  
  // The next four specs cover Test Case ID 132961.
  it('adds', function () {
        expect('2+1=').evalsAs('3');
        expect('20+100=').evalsAs('120');
        expect('123g+23=').evalsAs('-100');
        expect('5g+3g=').evalsAs('-8');  // Test Case ID 132967
  });

  it('subtracts', function () {
        expect('4-3=').evalsAs('1');
        expect('3-4=').evalsAs('-1');
        expect('123-23=').evalsAs('100');
        expect('123-23g=').evalsAs('146');
        expect('123g-23=').evalsAs('-146');
        expect('123g-23g=').evalsAs('-100');
        expect('9-6g=').evalsAs('15'); // Test Case ID 132971
        expect('9g-6g=').evalsAs('-3'); // Test Case ID 132971 additional
        expect('168740-19.95=').evalsAs('168720.05'); // Test Case ID 132983
   });

  it('multiplies', function () {
        expect('2*3=').evalsAs('6');
        expect('2*3g=').evalsAs('-6');
        expect('2g*3=').evalsAs('-6');
        expect('2g*3g=').evalsAs('6');
  });
  
  it('divides', function () {
        expect('6/3=').evalsAs('2');
        expect('6/3g=').evalsAs('-2');
        expect('6g/3=').evalsAs('-2');
        expect('6g/3g=').evalsAs('2');
        expect('9/6g=').evalsAs('-1.5'); // Test Case ID 132971 additional
        expect('9g/6g=').evalsAs('1.5'); // Test Case ID 132971 additional
        expect('2704/52=').evalsAs('52'); // Test Case ID 132983
   });
  
  it('allows decimals', function () {
        expect('1.2/2=').evalsAs('0.6');
        expect('1.2g/2=').evalsAs('-0.6');
        expect('1.2/2g=').evalsAs('-0.6');
        expect('1.2g/2g=').evalsAs('0.6');
        expect('1.2*0.25=').evalsAs('0.3');
        expect('1.2g*0.25=').evalsAs('-0.3');
        expect('1.2*0.25g=').evalsAs('-0.3');
        expect('1.2g*0.25g=').evalsAs('0.3');
   });  

  it('shows 15 digits of precision', function () {
                // First test entry: that we can handle 15, and that we don't accept more.
        var digits = '123456789012345';
        var     d2 = '1234567890123456';
        expect(digits).evalsAs(digits);
        app.ac();
        expect(d2).evalsAs(digits);
        app.ac();
        expect('1234567890123456789').evalsAs('123456789012345'); // Test Case ID 132981
        app.ac();
        // Now same for decimal.
        digits = '1.23456789012345';
        d2 =     '1.234567890123456';  
        expect(digits).evalsAs(digits);
        app.ac();
        expect(d2).evalsAs(digits);
        app.ac();
        // Leading 0 doesn't count.
        digits = '0.123456789012345';
        d2 =     '0.1234567890123456';  
        expect(digits).evalsAs(digits);
        app.ac();
        expect(d2).evalsAs(digits);
        app.ac();
        // And now all the above for negative numbers
        digits = '123456789012345';
        d2 = '1g234567890123456';
        expect(digits+'g').evalsAs('-' + digits);
        app.ac();
        expect(d2).evalsAs('-' + digits);
        app.ac();
        // Now same for decimal.
        digits = '1.23456789012345';
        d2 =     '1g.234567890123456';  
        expect(digits+'g').evalsAs('-' + digits);
        app.ac();
        expect(d2).evalsAs('-' + digits);
        app.ac();
        // Leading 0 doesn't count.
        digits = '0.123456789012345';
        d2 =     '.1g234567890123456';  
        expect(digits+'g').evalsAs('-' + digits);
        app.ac();
        expect(d2).evalsAs('-' + digits);
                
                // Now check some computation results display
        expect('*10=').evalsAs('-1.23456789012345');
        expect('*9999999=').evalsAs('-12345677.6666666'); // we don't want ...6661 because that implies more precision than we have
        expect('*9999999999=').evalsAs('-1.23456776654e+17');
        expect('9876543*=').evalsAs('97546101630849'); // Test Case ID 132975, 132984 (when using 18 digit displayLength as above)
        expect('987395589*100000000000=').evalsAs('9.873955890000e+19'); // Test Case ID 132976
  });
	
	it('shows 12 digits of precision', function () {

	  // Some issues only show up with lesser digits.
	  app.displayLength = 12;
	  expect('999999999999*=').evalsAs('1.000000e+24'); //Ugh. 12 digits of precision isn't really good enough.
	  expect('999999999999*9g9999999999=').evalsAs('-1.00000e+23');
	  app.displayLength = 18;
	  
 });
  
  it('never shows . without a leading zero', function () {
        expect('.').evalsAs('0.');
        app.ac();
        expect('4g.').evalsAs('-4.');
        expect('9=.').evalsAs('0.'); // i.e., after totalling, any entry starts fresh, even a decimal.
        expect('c9-6=').evalsAs('3'); expect('c9-.6=').evalsAs('8.4'); // Test Case ID 132978
        expect('%5').evalsAs('5');  // Test Case ID 132991
  });
  
  it('only allows one decimal point', function () {
        expect('.12.34.5..........................................................6').evalsAs('0.123456');
        app.ac();
        expect('9g8.7.65.4....................3').evalsAs('-98.76543');
  });
  
  it('does not show floating point drift', function () {
        expect('0.1+0.2=').evalsAs('0.3');
        expect('0.1g+0.2g=').evalsAs('-0.3');
        expect('1/9*9=').evalsAs('1');
        // Same for pending:
        expect('0.1+0.2=*10=').evalsAs('3');
        expect('0.1g+0.2g=*10=').evalsAs('-3');
        expect('1/9*9=*10=').evalsAs('10');
        //
        expect('10-9.9=').evalsAs('0.1');
  });
  
  it('can total with no pending op', function () {
        expect('123b4bb56=').evalsAs('156');  // b is one-letter name for backspace
  });
   
  it('can delete one char at a time from entry', function () {
        expect('123b99b8').evalsAs('1298'); 
        app.ac();
        expect('12g3b99b8').evalsAs('-1298');
        app.ac();
        expect('1g2.34b5').evalsAs('-12.35');
        app.ac();
        expect('100*b=').evalsAs('0'); // i.e., backspace clears display after operator
        expect('9*6=c9*55bb66=').evalsAs('594'); // Test Case ID 132985
  });
  
  it('deletes back to zero', function () {
        expect('1234bbbb').evalsAs('0');
        app.ac();
        expect('1234bbbbbbb').evalsAs('0');
        app.ac();
        expect('1g234bbbb').evalsAs('0');
        app.ac();
        expect('123g4bbbbbbb').evalsAs('0');  // Test Case ID 132990
        app.ac();
        expect('123g4bbbbbbb98').evalsAs('98');
        app.ac();
        expect('123g4bbbbbbb.98').evalsAs('0.98');
  });
  
  it('chains operations', function () {
        expect('1+2-3+5+5-1=').evalsAs('9');
        expect('2*3/6*5*4/2=').evalsAs('10');
	  /* My IDE's syntax colorer gets very very confused by the next three lines,
		 so I'm including the comments here. They correspond to Test Case IDs:
		 132968 132976
		 132979
		 132976
		 respectively. */
	  expect('1+1=+4=*3=-9=/3=').evalsAs('3');
      expect('25*4=g*').evalsAs('-100'); expect('=').evalsAs('10000'); 
	  expect('98/68*37820-543+77=').evalsAs('54039.2941176471');
  });

  /* (not sure why my syntax colorer wants a block comment delimiter here, but it does)
  // We only want of the following two, not both. 
  // A computation such as a calculator can use different precedence rules for how operations chain.
  // Historically, only cheap physical calculators did strict left-to-right precedence, such 
  //    that +,-,*,/ can be mixed in any order and each operation works with only one pair at a time,
  //    working from left to right. (This is simpler programming logic and used fewer transistors.)
  // More expensive physical calculators, and all the computer and smart phone based calculators that
  //    I have tried use the algebraic precedence that we all learned in school:
  //    * and / have higher precedence and bind more tightly than + and -.
  //    Otherwise, left-to-right is used between * and /, and between + and -.
  // Note that Test Cases developed to date are not consistent on this:
  //    Test Case IDs 132983 and 132976 require left-to-right, while 132995 requires algebraic.
  */

  it('does algebraic precedence', function () {
          //expect('1+2/3-2=').evalsAs('-0.33333333333333333333');
        expect('2+3*4=').evalsAs('14');
        expect('2+3*4/6=').evalsAs('4');
        expect('2+3*4/6-2*3=').evalsAs('-2');
        expect('2+2/4=').evalsAs('2.5');  // See Test Case ID 132983, below
        expect('9*5-6*4=').evalsAs('21'); // Test Case ID 132995
        // These are is subtle, making sure that fancy '% depends on pending op' doesn't interact badly with precedence.
        //expect('12-25%*4=').evalsAs('0');
        //expect('12*25%*4=').evalsAs('12');
        //expect('12*25%-4=').evalsAs('-1');
        });
  /*
  it('does left-to-right precedence like a cheapo calculator', function () {
        expect('1+5-10*8/6=').evalsAs('-5.33333333333333'); // Test Case ID 132976
        expect('2+2/4=').evalsAs('1'); // Test Case ID 132983.
  });
  */  

  it('defaults second operand to first', function () {
        expect('3-=').evalsAs('0');
        expect('3/=').evalsAs('1');
        expect('3+=').evalsAs('6');
        expect('3*=').evalsAs('9');
  });
  
  it('replaces operator with new', function () {
        // This behavior is debatable. Here we assume that the second binary operator
        // cancels the first. One might alternatively expect the second to apply the first
        // as though chaining, with the second operand defaulting to a copy of the first operand.
        // If we decide we want that alternative behavior, 
        expect('3--=').evalsAs('0');
        expect('3-+2=').evalsAs('5');
        expect('3/*=').evalsAs('9');
        expect('3/+2=').evalsAs('5'); 
        expect('3-+=').evalsAs('6');
        expect('3/*=').evalsAs('9');
  });
  
  it('has clear-entry (c) and clear-all (cc)', function () {
          expect('123c').evalsAs('0'); // Test Case ID 132963
          expect('1+2=+4=').evalsAs('7');
          expect('1+2=+4c5=').evalsAs('8');
          expect('1+2=+4cc5=').evalsAs('5');
  });
   
  it('has memory operations', function () {
        // m+ and m- start with zero, even if nothing assigned.
        expect('5acm').evalsAs('5'); // Test Case ID 132964
        app.ac(); app.memoryClear();
        expect('5Acm').evalsAs('-5');  // Test Case ID 132966
        app.ac(); app.memoryClear();
        expect('5acMm').evalsAs('0');
        app.ac(); app.memoryClear();
        expect('5aMm').evalsAs('5'); // MC does not clear display, nor does MR
        app.ac(); app.memoryClear();
        expect('5ac5Am').evalsAs('0'); // Test Case ID 132960
        app.ac(); app.memoryClear();
        expect('5Acm').evalsAs('-5'); // Test Case ID 132965
        app.ac(); app.memoryClear();
        expect('2ac1+m=').evalsAs('3');
        expect('M1/9=a9*m=').evalsAs('1'); // No drift in memory. e.g., not strings
        expect('M1/9=acm*9=').evalsAs('1'); 
        expect('M0.1+0.2=a.7+m=').evalsAs('1');
        app.ac(); app.memoryClear();
        expect('10ac1/m=').evalsAs('0.1'); // This and the next line together are
        expect('15-m=').evalsAs('5');      // ... Test Case ID 132970
        // Test Case ID 132978
        expect('M9*6=').evalsAs('54'); expect('ac').evalsAs('0'); expect('m').evalsAs('54'); expect('g').evalsAs('-54');
  });
  
  it('has square root and %', function () {
        expect('9q').evalsAs('3');
        // In current implementation, = does not repeat unary operators
        expect('9q===').evalsAs('3');
        expect('3.000q').evalsAs('1.73205080756888'); // i.e., don't do anything fancy with trailing decimals
        expect('9.000q').evalsAs('3'); // current design does not try to preserve trailing zeros as change sign does.
        expect('10%*99=').evalsAs('9.9');
        expect('100*25%=').evalsAs('25');
        expect('25%*100=').evalsAs('25');
        expect('10*9q=').evalsAs('30');
        expect('9q*10=').evalsAs('30');
        expect('9876543210q*=').evalsAs('9876543210'); // Test Case ID 132986
        // The next four are Test Case ID 132992, with the effect of % depends on pending operators.
        expect('12+25%=').evalsAs('15');
        expect('12-25%=').evalsAs('9');
        expect('12*25%=').evalsAs('3');
        expect('12/25%=').evalsAs('48');
  });
  
  it('displays errors', function () {
        expect('1gq').evalsAs('Error');
        expect('cc1gq=+2=').evalsAs('Error'); // i.e., carries Error through chaining
        expect('cc1gqc+2=').evalsAs('2'); // but clear entry does clear Error
        expect('0/0=').evalsAs('Error');  // Test Case ID 132982 
        expect('5/0=').evalsAs("\u221E"); //... also from 132982, but with Infinity rather than Error
        expect('5g/0=').evalsAs("-\u221E"); 
        // Backspace after error or infinity should do the right thing.
        expect('1/0=b').evalsAs('0');
        expect('1g/0=b').evalsAs('0');
        expect('1gqb').evalsAs('0');    
        // Should it store error in memory? If yes, these two should answer 'Error'. If no, they should answer '5'.
        expect('ccM5a1gqam').evalsAs('Error'); 
        expect('ccM5A1gqam').evalsAs('Error'); 
  });
});
