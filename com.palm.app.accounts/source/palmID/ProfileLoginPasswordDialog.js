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

enyo.kind({
	name: "MyApps.PalmID.ProfileLoginPasswordDialog",
	kind: "ModalDialog", lazy: false, 
	caption: $L("Enter Account Password"),
	scrim: true,
	dismissWithClick: false,
	modal: true,
	components: [
		{
			kind: "PalmService",
			name: "validateLogin",
			service: "palm://com.palm.accountservices/",
			method: "isUserValid", 
			onSuccess: "setSuccess",
			onFailure: "setFailure"
		},
		{ name: "passwdDialogText", content: "", className:"text-breakword"},
		{ components: [{
				kind: "RowGroup", 
				caption: $L("PASSWORD"),
				components: [{ name: "passwd", kind: "PasswordInput", onfocus: "SetKeyboard" },],
				}],				
		},
		{ name: "passwdError", content: "", className: "enyo-paragraph enyo-text-error", showing: false}, 
		{ kind: "Button", caption: $L("Sign In"), onclick: "signIn", className: "enyo-button-dark" },
		{ kind: "Button", caption: $L("Forgot Password"), onclick: "forgot" },
		{ kind: "Button", caption: $L("Back"), onclick: "cancel" },

		{kind: "MyApps.PalmID.CommErrorDialog", name: "errorDialog"},
		{kind: "MyApps.PalmID.SpinnerOverlayPopup", name: "spinnerOverlay"},

	],
	
	SetKeyboard: function() {
		enyo.keyboard.show(1);
	},
	
	openThisDialog: function(accountName, accountAggregate, loginSuccess, loginCancel, loginDone) {
		this.numTries = 0;
		
		this.loginSuccess = loginSuccess;
		this.loginCancel = loginCancel;
		this.loginDone = loginDone;
		
		this.accountAggregate = accountAggregate;
		
		this.$.passwdError.setShowing(false);
		this.$.passwdDialogText.setContent(accountName);
		this.$.passwd.setValue("");		
		
		this.openAtCenter();
		this.$.passwd.forceFocus();
	},
	
	signIn: function() {
		var util = new PalmIdUtilities(); 

		var profile = this.owner;
		var passwd = util.trim(this.$.passwd.value);
		this.passwd = passwd;
						
		if (passwd.length == 0) {
			this.$.passwd.setValue("");
			this.$.passwd.forceFocus();
		} else {
			this.$.passwdError.setShowing(false);
			this.$.spinnerOverlay.openAtCenter();
			this.$.validateLogin.call({email:this.owner.accountAggregate.accountInfo.email, deviceId: this.owner.deviceProfile.deviceInfo.nduId ,password: passwd});
		}

	},
	
	forgot: function () {
		//TODO: 
		//Need to get the question from the server and then call this.
		this.close();
		this.owner.$.recoverDialog.initAndOpen(
			this.accountAggregate.acctChallengeQuestions, 
			this.accountAggregate.accountInfo.email, 
			this.loginSuccess, 
			this.loginCancel, 
			this.loginDone 
			);
	},
	
	
	cancel: function () {
		this.close();
		//this.loginCancel();
		this.owner.backToViewCallback();
	},
	
	
	setSuccess: function(inSender, inResponse) {
		this.numTries++;
		this.$.spinnerOverlay.close();
		if(inResponse.isValid){
	    	this.close();
			this.loginSuccess(this.passwd);
		} else  if (this.numTries >= 3) {
			this.numTries = 0;
	    	this.forgot();
		} else {
			if (this.passwd.length < 6 || this.passwd.length > 20) {
				this.$.passwdError.setContent($L("Password must be between 6 and 20 characters."));
			} else {
				this.$.passwdError.setContent($L("The password you entered is incorrect. Try again."));
			}
			this.$.passwdError.setShowing(true);
			this.$.passwd.forceFocus();
			this.$.passwd.forceSelect();
		}
	},
	
	setFailure: function(inSender, inResponse){
		this.$.spinnerOverlay.close();
		var errorText = (inResponse.errorText) ? inResponse.errorText : undefined;
		errorText = (inResponse.errorCode) ? PALMIDUTILS_ERROR_CODES[inResponse.errorCode] : errorText;
		if (errorText && inResponse.errorCode != "-9999"){
			this.$.passwdError.setContent(enyo.string.escapeHtml(errorText));
			this.$.passwdError.setShowing(true);
		} else {
			this.$.passwdError.setShowing(false);
			this.$.errorDialog.openAtCenter(inResponse);
		}
	},
		
});
