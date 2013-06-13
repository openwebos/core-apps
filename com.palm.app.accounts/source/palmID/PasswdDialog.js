// @@@LICENSE
//
//      Copyright (c) 2010-2013 LG Electronics, Inc.
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
	name: "MyApps.PalmID.PasswdDialog",
	kind: "ModalDialog", lazy: false, 
	scrim: true,
	dismissWithClick: false,
	modal: true,
	components: [
		{
			kind: "PalmService",
			name: "setPasswdAddress",
			service: "palm://com.palm.accountservices/",
			method: "changePassword", 
			onSuccess: "setSuccess",
			onFailure: "setFailure"
		},
		{
			kind: "PalmService",
			name: "getAccountToken",
			service: "palm://com.palm.accountservices/",
			method: "getAccountToken", 
			onSuccess: "getTokenSuccess",
			onFailure: "getTokenFailure"
		},
		{ name: "passwordResetText", content: $L("Create a new password for your webOS account."), className:"enyo-paragraph"},
		{
			kind: "RowGroup", 
			caption: $L("PASSWORD"),
			components: [
				{ name: "passwd", kind: "PasswordInput", onfocus: "SetKeyboard"  },
			],
		},
		{ name: "error1", content: "", className: "enyo-paragraph enyo-text-error", showing: false}, 
		{
			kind: "RowGroup", 
			caption: $L("VERIFY PASSWORD"),
			components: [
				{ name: "passwdConfirm", kind: "PasswordInput", onfocus: "SetKeyboard"  },
			],
		},
		{ name: "error2", content: "", className: "enyo-paragraph enyo-text-error", showing: false},
		{kind:"HFlexBox", components:[ 
			{ name: "button2", kind: "Button", caption: $L("Cancel"), flex:1, onclick: "cancel" },
			{ name: "button1", kind: "Button", caption: $L("Update"), flex:1, onclick: "update" }
		]},
		{kind: "MyApps.PalmID.CommErrorDialog", name: "errorDialog"},
		{kind: "MyApps.PalmID.SpinnerOverlayPopup", name: "spinnerOverlay"},
	],
	
	SetKeyboard: function() {
		enyo.keyboard.show(enyo.keyboard.show);
	},
	
	
	openThisDialog: function(useResetUI, loginSuccess, loginCancel) {
		this.$.error1.setShowing(false);
		this.$.error2.setShowing(false);
		this.$.passwd.setValue("");
		this.$.passwdConfirm.setValue("");
		this.setShowKeyboardWhenOpening(false);

		
		this.useResetUI = useResetUI;
		if (useResetUI) {
			this.setShowKeyboardWhenOpening(true);
			this.loginSuccess = loginSuccess; 
			this.loginCancel = loginCancel;
		}
		
		this.openAtCenter();
	},
	
	prepareOpen: function() {
		var r = this.inherited(arguments);
		if (this.useResetUI) {
			this.setCaption($L("New Password"));
			this.$.button1.setCaption($L("Sign In"));	
			this.$.button2.setShowing(true);	
			this.$.passwordResetText.setContent($L("Create a new password for your webOS account."));
		} else {
			this.setCaption($L("Password"));
			this.$.button1.setCaption($L("Update"));	
			this.$.button2.setShowing(true);	
			this.$.passwordResetText.setContent($L("Enter a new password"));
		}
		return r;
	},
	afterOpen: function() {
		var r = this.inherited(arguments);
		if (this.$.passwd.value.length) {
			this.$.passwd.forceSelect();
		} else {
			this.$.passwd.forceFocus();
		}
		return r;
	},
	close: function() {
		var r = this.inherited(arguments);
		enyo.keyboard.hide();
		enyo.keyboard.setManualMode(false);
		return r;
	},
		
	update: function() {
		var util = new PalmIdUtilities(); 

		var profile = this.owner;
		var passwd = util.trim(this.$.passwd.value);
		this.newPassword = passwd; 
		var confPasswd = util.trim(this.$.passwdConfirm.value);
		this.passwd = passwd;
						
		this.$.error1.setShowing(false);
		this.$.error2.setShowing(false);
		if (passwd.length == 0) {
			this.$.error1.setContent($L("Please enter a new password."));
			this.$.error1.setShowing(true);
			this.$.passwd.forceFocus();
		} else if (confPasswd.length == 0) {
			this.$.error2.setContent($L("Please re-enter your password."));
			this.$.error2.setShowing(true);
			this.$.passwdConfirm.forceFocus();
		} else if (passwd != confPasswd) {
			this.$.error2.setContent($L("Passwords do not match."));
			this.$.error2.setShowing(true);
		} else if (passwd.length < 6 || passwd.length > 20) {
			this.$.error1.setContent($L("Password must be 6-20 characters."));
			this.$.error1.setShowing(true);
			this.$.passwd.forceSelect();
		} else {
			this.$.error1.setShowing(false);
			this.$.error2.setShowing(false);
			if (passwd!=profile.email) {
				this.$.spinnerOverlay.openAtCenter();
				this.$.getAccountToken.call();
			} else {
	    		this.close();
			};
		}

	},
	
	getTokenSuccess: function(inSender, inResponse) {
		this.$.spinnerOverlay.close();
		if (!this.newPassword) {
			this.error("Could not change password, no new password provided");
			return;
		}
		if (inResponse && inResponse.token) {
			this.$.spinnerOverlay.openAtCenter();
			this.$.setPasswdAddress.call(
				{ isResetPassword: true, newPassword: this.newPassword, idToken:inResponse.token}
			);	
		} else {
			this.setFailure(inSender, {errorText: "Get Account Token failed: no token available "});
		}
	},
	
	getTokenFailure: function(inSender, inResponse) {
		this.$.spinnerOverlay.close();
		this.setFailure(inSender, inResponse);
	},

	setSuccess: function() {
		this.$.error1.setShowing(false);
		this.$.error2.setShowing(false);
		this.$.spinnerOverlay.close();
    	this.close();
		if (this.useResetUI) {
			this.loginSuccess(this.newPassword)
		} else {
			this.owner.password = this.newPassword; 
		}
	},
	
	setFailure: function(inSender, inResponse){
		this.$.error1.setShowing(false);
		this.$.error2.setShowing(false);
		this.$.spinnerOverlay.close();
		this.$.errorDialog.openAtCenter(inResponse);
	},
		
	cancel: function() {
		this.$.error1.setShowing(false);
		this.$.error2.setShowing(false);
   		this.close();
		if (this.useResetUI) {
			this.loginCancel()
		}
	},
	
});
