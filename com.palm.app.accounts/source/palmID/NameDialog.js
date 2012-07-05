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
	name: "MyApps.PalmID.NameDialog",
	kind: "ModalDialog",  
	caption: $L("Name"),
	showKeyboardWhenOpening: true,
	components: [
		{
			kind: "PalmService",
			name: "setAccountName",
			service: "palm://com.palm.accountservices/",
			method: "updateAccountInfo", 
			onSuccess: "setSuccess",
			onFailure: "setFailure"
		},
		{name: "modifyAccount", kind: "PalmService", service: enyo.palmServices.accounts, method: "modifyAccount"},
		
		{
			className: "enyo-paragraph",
            content: $L("Enter a new name")
        },
		{
			kind: "RowGroup", 
			caption: $L("FULL NAME"),
			components: [
				{ kind: "Input", name: "fullName",
				  autocorrect: false, spellcheck: false,
				  onfocus: "setTextKeyboard"
				},
			],
		},
		{ name: "error", content: "", className: "enyo-paragraph enyo-text-error", showing: false}, 
		{kind:"HFlexBox", components:[
			{ kind: "Button", caption: $L("Cancel"), flex:1, onclick: "close" },
			{ kind: "Button",caption: $L("Update"), flex:1, onclick: "saveToServer" }
		]},
		{kind: "MyApps.PalmID.CommErrorDialog", name: "errorDialog"},
		{kind: "MyApps.PalmID.SpinnerOverlayPopup", name: "spinnerOverlay"},
	],
	
	openThisDialog: function(acctInfo, password) {
		this.acctInfo = acctInfo;
		this.password = password;
		this.openAtCenter();
	},
	prepareOpen: function() {
		var r = this.inherited(arguments);
		this.$.fullName.setValue(this.acctInfo.firstName + " " + this.acctInfo.lastName);
        this.$.error.setShowing(false);
		return r;
	},
	afterOpen: function() {
		var r = this.inherited(arguments);
		this.$.fullName.forceSelect();
		return r;
	},
	close: function() {
		var r = this.inherited(arguments);
		enyo.keyboard.hide();
		enyo.keyboard.setManualMode(false);
		return r;
	},
	
	setTextKeyboard: function() {
		enyo.keyboard.show(enyo.keyboard.typeText);
	},

	saveToServer: function() {
		var util = new PalmIdUtilities(); 

		var profile = this.owner;
		var fullName = util.trim(this.$.fullName.getValue());
		this.fullName = fullName;

        this.$.error.setShowing(false);
		if (fullName.length == 0) {
            this.$.error.setContent($L("Please enter an account name."));
            this.$.error.setShowing(true);
			this.$.fullName.forceFocus();
		} else if (fullName.length > 50) {
            this.$.error.setContent($L("Name must be less than 50 characters."));
            this.$.error.setShowing(true);
			this.$.fullName.forceFocus();
		} else {
			var firstName = util.getFirstName(this.$.fullName.getValue());
			var lastName = util.getLastName(this.$.fullName.getValue());
			this.firstName = firstName;
			this.lastName = lastName;

			this.$.spinnerOverlay.openAtCenter();
			this.$.setAccountName.call({
				firstName: firstName, 
				lastName: lastName, 
				email: this.acctInfo.email,
				languageCode: this.acctInfo.language,
				countryCode: this.acctInfo.country,
				password: this.password});
		};
	},
	
	setSuccess: function() {
		this.$.spinnerOverlay.close();
		var profile = this.owner;
		profile.populateName({firstName: this.firstName, lastName: this.lastName});
		var fullName = this.firstName + ((this.lastName && this.lastName.length > 0) ?  " " + this.lastName : "");
		profile.owner.nameChangeCallback(fullName);

		var param = {
			"accountId": profile.owner.palmProfileAccount._id,
			"object": {"username": fullName}
		}
		// Modify the account
		this.$.modifyAccount.call(param);

    	this.close();
	},
	
	setFailure: function(inSender, inResponse) {
		this.$.spinnerOverlay.close();
		this.$.errorDialog.openAtCenter(inResponse);
	},
	
});