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

 var PALMIDUTILS_ERROR_CODES = {
	"PAMS1001": $L("Please enter a password."),
	"PAMS1002": $L("Password length should be between 6 and 20 characters and should not contain white spaces."),
	"PAMS1003": $L("Your email address and password are too similar, please select a new password."),
	"PAMS1005": $L("Please enter a valid email address."),
	"PAMS1006": $L("Please select a security question."),
	"PAMS1007": $L("Please provide answers to the security question."),
	"PAMS1008": $L("Email address is already in use."),
	"PAMS1018": $L("Answer is incorrect. Try again."),
	"PAMS1033": $L("Unable to update user's password. Visit http://hpwebos.com/support for more information."),
	
	"PAMS1100": $L("The password you entered is incorrect."),
	"PAMS1101": $L("Account locked, Please try again in 15 min. Visit http://hpwebos.com/support for more information."),
	"PAMS1106": $L("We couldn't find a webOS account. Visit http://hpwebos.com/support for more information."), 
	"PAMS1108": $L("Could not sign in to your account. Visit http://hpwebos.com/support for more information."),
	"PAMS1123": $L("Cannot change to the same email address."),
	
	"PAMS1201": $L("Account protected from password change. Visit http://hpwebos.com/support for more information."),
	"PAMS1202": $L("Account protected from email change. Visit http://hpwebos.com/support for more information."),
	"PAMS1203": $L("This email address is alreday in use by another account. Visit http://hpwebos.com/support for more information."),
	
	"PAMS1114": $L("Account is already verified."),

	"PAMS9998": $L("The United States Government prohibits HP from allowing you to use this email address to set up a webOS account."),
	"ACCCOUNT_EXPANDED_INVALIDEMAIL": $L("The United States Government restricts exports to certain countries, including the country where your email address domain is issued. You can visit www.palm.com/us/company/legal for additional information."),
	"ACCOUNT_NOT_DEFINED_ERROR" : $L("We were unable to locate your account information. Visit http://hpwebos.com/support for more information."),

	"-9999": $L("Must be connected to a network to communicate with HP's Cloud Services. Check your network connection, or try again."),

};

 var PALMIDUTILS_ERROR_HEADING_CODES = {
	"-9999": $L("Network Error"),

	"PAMS1008": $L("Invalid Email Address"),
	"PAMS9998": $L("Invalid Email Address"),
 	"ACCCOUNT_EXPANDED_INVALIDEMAIL": $L("Invalid Email Address"),
}
 
 function PalmIdUtilities() {
	this.trim =  function (string) {
		return string.replace(/^\s+|\s+$/g,"");
	};
	
	this.isValidEmail = function(emailAddress) {
	//	return (/^\w+([\.\-]?\w+)*@\w+([\.\-]?\w+)*(\.\w{2,3})+$/.test(emailAddress));
		emailAddress = this.trim(emailAddress);
		var emailRegEx = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i;
		return !(emailAddress.search(emailRegEx) == -1);
	};
	
	//this is currently compatible with first use.
	this.getFirstName = function(fullName){
		fullName = this.trim(fullName);
		var splitName = fullName.split(" ");
		return this.trim(splitName[0]);
	};
	
	this.getLastName = function(fullName){
		fullName = this.trim(fullName);
		var splitName = fullName.split(" ");
		var lastName = "";
		for(i = 1; i < splitName.length; i++)
			lastName = lastName + " " + splitName[i];
		return this.trim(lastName);
	};

	/* Uhmm... how do we handle middle names?
	this.getFirstName = function(fullName){
		var splitName = new enyo.g11n.Name(this.trim(fullName));
		var result = "";
		if (splitName) {
			if (splitName.prefix ||splitName.givenName) {
				if (splitName.prefix) {
					result = splitName.prefix;
				}
				if (splitName.givenName) {
					result = (result.length) ? (result + " " +  splitName.givenName) : splitName.givenName;
				}
			}
			
		}
		return result;
	};
	
	this.getLastName = function(fullName) {
		var splitName = new enyo.g11n.Name(this.trim(fullName));
		var result = "";
		if (splitName) {
			if (splitName.suffix ||splitName.familyName) {
				if (splitName.familyName) {
					result = splitName.familyName;
				}
				if (splitName.suffix) {
					result = (result.length) ? (result + " " +  splitName.suffix) : splitName.suffix;
				}
			}
		} 
		return result;
	};
	*/
}

	
	
