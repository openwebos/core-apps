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

var INITIALIZE_ERRORTEXT = $L("Must be connected to a network to communicate with HP's Cloud Services. Check your network connection, or try again later.")

enyo.kind({
	name: "MyApps.PalmID.Initialize",
	kind: enyo.VFlexBox,
	scrim: true,
	style: "margin: 30px",
	published : {
		initialize: function(parms) {
			this.$.spinner.show();
			this.$.getDeviceInfo.call({});
			
			enyo.keyboard.setResizesWindow(false);
			this.backToViewCallback = function(){
				if (enyo.keyboard.isManualMode()) {
					enyo.keyboard.hide();
					enyo.keyboard.setManualMode(false);
				}

				parms.backToViewCallback();
				};
			this.palmProfileAccount = parms.palmProfileAccount;
		},	
	},
	components: [
		{
			kind: "PalmService",
			name: "getAccountInfo",
			service: "palm://com.palm.accountservices/",
			method: "getAggregatedAccountInfo",
			onSuccess: "gotAccount",
			onFailure: "accountFailure"
		},
		{
			kind: "PalmService",
			name: "getDeviceInfo",
			service: "palm://com.palm.deviceprofile/",
			method: "getDeviceProfile",
			onSuccess: "gotDeviceProfile",
			onFailure: "deviceInfoFailure" 
		},
		
		
		{flex: 1, content:""},
		{layoutKind: "HFlexLayout",
			components: [
				{flex: 1, content:""},
				{name: "spinner", style: "text-align: center", kind: "enyo.SpinnerLarge"},
				{flex: 1, content:""},
				]
		},
		{flex: 1, content:""},

		{
			name: "errorPopup", 
			kind: "ModalDialog", lazy: false, 
			caption: $L("Error"), 
			scrim: true,
			dismissWithClick: false,
			modal: true,
			components: [
				{name: "serverIssue", className: "enyo-paragraph", content: INITIALIZE_ERRORTEXT},
				{kind:"HFlexBox", components:[
					{kind: "Button", caption: $L("Close"), flex:1, onclick: "back"},
					{kind: "Button", caption: $L("Try Again"), flex:1, onclick: "retry"}
				]},
			],
		},		
	],

	
	create: function()
	{
		this.inherited(arguments);
	},
	
	//rendered: function () {
	//},
	
	
	
	gotDeviceProfile: function(inSender, inResponse) {
		var accounts = this.owner.$.accounts;
		accounts.setDeviceProfile(inResponse);
		accounts.backToViewCallback = this.backToViewCallback;
		accounts.palmProfileAccount = this.palmProfileAccount;
		this.$.spinner.show();
		this.$.getAccountInfo.call({locale: enyo.g11n.currentLocale().locale});
	},
	retry: function()
	{
		this.$.errorPopup.close();
		this.$.spinner.show();
		this.$.getAccountInfo.call({});
	},
	
	gotAccount: function(inSender, inResponse)
	{	
		var accounts = this.owner.$.accounts;
		accounts.setAccountInfo(inResponse);
		this.$.spinner.hide();
		this.owner.selectViewByName("accounts");
		this.owner.$.accounts.login();
	},
	
	
	setErrorMessage: function(inResponse) {
		//var msg = INITIALIZE_ERRORTEXT;						
		console.log("error:" + enyo.json.stringify(inResponse));
		
		var errorText = (inResponse.errorCode) ? PALMIDUTILS_ERROR_CODES[inResponse.errorCode] : undefined;
		if (errorText == undefined) errorText = INITIALIZE_ERRORTEXT;

		this.$.serverIssue.setContent(errorText);
	},

	
	accountFailure: function(inSource, inResponse)
	{
		this.$.spinner.hide();
		this.setErrorMessage(inResponse);
		this.$.errorPopup.openAtCenter();
	},
	deviceInfoFailure: function(inSource, inResponse) {
		this.$.spinner.hide();
		this.setErrorMessage(inResponse);
		this.$.errorPopup.openAtCenter();
	},
	
	back: function(inSource, inResponse) {
		this.$.spinner.show();
		this.$.errorPopup.close();
		this.backToViewCallback();
	}

})
