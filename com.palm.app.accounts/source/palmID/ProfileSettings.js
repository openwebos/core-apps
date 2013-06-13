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
	name: "MyApps.PalmID.Profile",
	kind: enyo.VFlexBox,
	className:"enyo-bg",
	components: [
	/*
		{
			kind: "PalmService",
			name: "setApplication",
			service: "palm://com.palm.service.accounts/",
			method: "setApplication",
			onSuccess: "setApplicationSuccess",
			onFailure: "SetApplicationFailure"
		},
	*/	
		{
			kind: "PalmService",
			name: "resendVerificationEmail",
			service: "palm://com.palm.accountservices/",
			method: "requestResendVerificationEmail",
			onSuccess: "resendEmailSuccess",
			onFailure: "resendEmailFailure"
		},
		
    	{name: "modifyAccount", kind: "PalmService", service: enyo.palmServices.accounts, method: "modifyAccount"},

		{kind:"Toolbar", className:"enyo-toolbar-light accounts-header", pack:"center", components: [
			{kind: "Image", src: "images/acounts-48x48.png"},
			{kind: "Control", content: $L("HP webOS Account")}
		]},
		{className:"accounts-header-shadow"},
		{
			name: "profileContent",
			kind: enyo.Scroller,
			flex: 1,
			components: [
				{kind:"Control", className:"box-center", components: [
					{
						name: "nameInfo",
						kind: "RowGroup",
						className:"accounts-group",
						caption: $L("NAME"),
						components: [
						],
						owner: this.owner
					},
					{
						name:"resendVerification", kind: "Button", style:"display: none", className:"accounts-btn", caption: $L("Resend Verification Email"), onclick: "resendVerification"
					},
					{
						name: "loginInfo",
						kind: "RowGroup",
						className:"accounts-group",
						caption: $L("LOGIN INFORMATION"),
						components: [
						],
						owner: this.owner
					},
					{
						name: "deviceList",
				 		kind: "RowGroup",
						className:"accounts-group",
						caption: $L("DEVICES"),
						components: [
						],
						owner: this.owner
					}, 
					{
						name: "appList", 
						kind: "RowGroup",
						className:"accounts-group",
						caption: $L("USE ACCOUNT WITH"),
						components: [
						],
						owner: this.owner
					},
					{
						name: "nameDialog",
						kind: "MyApps.PalmID.NameDialog",
						owner: this.owner
					},
					{
						name: "secDialog",
						kind: "MyApps.PalmID.SecDialog",
						owner: this.owner	
					},
					{
						name: "secAnswerDialog",
						kind: "MyApps.PalmID.SecAnswerDialog",
						owner: this.owner	
					},
					{
						name: "emailDialog",
						kind: "MyApps.PalmID.EmailDialog",
						owner: this.owner
					},
					{
						name: "passwdDialog",
						kind: "MyApps.PalmID.PasswdDialog",
						owner: this.owner
					},
					{
						name: "deviceInfo",
						kind: "MyApps.PalmID.DeviceInfoDialog",
						owner: this.owner
					},
				]},
			]
		},
		{className:"accounts-footer-shadow"},
		{kind:"Toolbar", className:"enyo-toolbar-light", components:[
			{
				kind: "Button",
				name: "doneButton",
				className:"accounts-toolbar-btn",
				onclick: "done",
				caption : $L("Back")
			}
		]},
		
		
		{ kind: "ModalDialog", lazy: false, name: "verifyEmailDialog", caption: $L("Email Sent"),
          dismissWithClick: false,
          modal: true,

		  components: [
	        { name: "verifyText", className: "enyo-paragraph text-breakword", content: "dummy" },
            { kind: "Button", caption: $L("Done"), onclick: "closeVerifyEmailDialog"},
			],
			scrim: true,
		},

		{kind: "MyApps.PalmID.CommErrorDialog", name: "errorDialog"},
		{kind: "MyApps.PalmID.SpinnerOverlayPopup", name: "spinnerOverlay"},
	],
	populateName: function(accountInfo)
	{
		var fullName = accountInfo.firstName + " " + accountInfo.lastName;
		if (this.userName != fullName) {
			var name = fullName;
			this.userName = name;
			this.firstName = accountInfo.firstName;
			this.lastName = accountInfo.lastName;
			if (accountInfo.password) {
				this.password = accountInfo.password; 
			}
			this.$.nameInfo.destroyControls();
			this.$.nameInfo.createComponent({
				name: "nameItem",
				kind: "MyApps.PalmID.SimpleItem",
				components: [{
					content: enyo.string.escapeHtml(name),
					className: "enyo-text-ellipsis",
					flex: 1,
					owner: this,
					onclick: "changeName"
				}]
			});
			this.render();
		}
	},
	
	populateLoginInfo: function(details)
	{
			this.$.loginInfo.destroyControls();
			
			this.email = details.accountInfo.email;
			this.details = details;
			
			this.$.resendVerification.applyStyle("display", 
				(details.accountInfo.accountState=='A' || details.accountInfo.accountState=='C') ? "block" : "none");

			var desc = { name: "emailDesc", content: $L("Email"), style:"padding-right:30px"};
			var label = { name: "emailLabel", content: enyo.string.escapeHtml(details.accountInfo.email), flex: 1, className:"enyo-text-ellipsis", style:"text-align:right" };
			this.$.loginInfo.createComponent({ name: "emailItem", kind: "MyApps.PalmID.SimpleItem", components: [ desc, label ], onclick: "changeEmail", owner: this }); 
			
			desc = { name: "passDesc", content: $L("Password"), style:"padding-right:30px" };
			label = { name: "passLabel", content: "**************", flex: 1, className:"enyo-text-ellipsis", style:"text-align:right"};
			handler = this.changePassword;
			this.$.loginInfo.createComponent({ name: "passItem", kind: "MyApps.PalmID.SimpleItem", components: [ desc, label ], onclick: "changePassword", owner: this });       

			desc = { name: "secDesc", content: $L("Security Question"), style:"padding-right:30px" };
			label = { name: "secLabel", content: enyo.string.escapeHtml(this.details.acctChallengeQuestions.question), flex: 1, className:"enyo-text-ellipsis", style:"text-align:right"};
 			this.$.loginInfo.createComponent({ name: "secItem", kind: "MyApps.PalmID.SimpleItem", components: [ desc, label ], onclick: "changeSecQtn", owner: this });   		
			this.render();

			/*
			desc = { name: "secAnswerDesc", content: $L("Answer"), flex: 1 };
			label = { name: "secAnswerLabel", content: enyo.string.escapeHtml("**************")}; // can't get it as plain text although the UI spec had it like that
 			this.$.loginInfo.createComponent({ name: "secAnswerItem", kind: "MyApps.PalmID.SimpleItem", components: [ desc, label ], onclick: "changeSecAnswer", owner: this });   		
			this.render();
			*/
	},
	changeName: function()
	{
		
		this.$.nameDialog.openThisDialog(
			{firstName: this.firstName, 
			lastName: this.lastName, 
			email: this.email, 
			country : this.details.accountInfo.country,
			language: this.details.accountInfo.language}, this.password);
	},
	changeEmail: function()
	{ 
		this.$.emailDialog.openThisDialog({
			defaultEmail: this.email,
			sentCallback: enyo.bind(this, function(){
				this.details.accountInfo.accountState = 'A';
				//this.$.resendVerification.applyStyle("display", "block");
			})
		}); 
	},
	changePassword: function()
	{
		this.$.passwdDialog.openThisDialog(false);
	},
	changeSecQtn: function()
	{
		this.$.secDialog.initAndOpen(this.details.challengeQuestions, this.details.acctChallengeQuestions, this.details.securityQuestionSelectedAnswer);
	},
	changeSecAnswer: function()
	{
		this.$.secAnswerDialog.initAndOpen(this.details.acctChallengeQuestions, this.details.securityQuestionSelectedAnswer);
	},
	showDeviceInfo: function(inSender, inResponse, rowIndex)
	{
		this.gotDevice(this.deviceList[inSender.value]);
	},
	gotDevice: function(device)
	{
		this.$.deviceInfo.setDevice({device: device, thisDevice: (this.owner.$.accounts.deviceProfile.deviceInfo.deviceNduid == device.nduId)});
		this.$.deviceInfo.openAtCenter();
	},
	populateDeviceList: function(deviceList)
	{       
		deviceList =  (deviceList.length) ? deviceList : [deviceList]; 
		
		this.$.deviceList.destroyControls();
		this.deviceList = deviceList;
		for(var i = 0; i < deviceList.length; ++i)
		{
			this.$.deviceList.createComponent({ 
				name: "deviceItem_"+ i, kind: "MyApps.PalmID.SimpleItem", 
				components: [ {content: enyo.string.escapeHtml(deviceList[i].deviceType), style:"padding-right:30px" },
							  {content: enyo.string.escapeHtml(deviceList[i].deviceName), flex: 1, className:"enyo-text-ellipsis", style:"text-align:right"}
							],
				onclick: "showDeviceInfo", 
				value: i, 
				owner: this 
				});
		}
		this.$.deviceList.render();
		
	}, 
	generateItemForAppList: function(capability, appIndex, onChange)
	{
		
		var capName = capability.capability;
		if (capability.loc_name) {
			capName = capability.loc_name;	
		} 
		
		if (capability.state == undefined) {
			capability.state = (capability._id ? true : false);
		} 

		var item = {
			kind: "MyApps.PalmID.SimpleItem",
			components: [ 
				{ content: enyo.string.escapeHtml(AccountsUtil.getCapabilityText(capability.capability)), flex: 1},
				//{ name: "app_" + appIndex, kind: "ToggleButton", state: capability.state, onChange: onChange, value: appIndex, disabled: capability.alwaysOn}
				{ name: "app_" + appIndex, kind: "ToggleButton", state: capability.state, onChange: onChange, value: appIndex, disabled: true}
			],
			owner: this,
		};
		return item; 
	},
		
	populateAppList: function(capabilities)
	{
		this.$.appList.destroyControls();

		this.capabilities = capabilities;		
		for (var i = 0; i < capabilities.length; i++) {
			this.$.appList.createComponent(this.generateItemForAppList(capabilities[i], i, "setAppState"));
		};

		this.render();
	},
	
	setAppState: function(inSender, inState) {
		var param = {
			"accountId": this.owner.palmProfileAccount._id,
			"object": {}
		}
		
		this.capabilities[inSender.getName().split("_")[1] - 0].state = inState; //HACK: russ.
		
		// See which capabilities are enabled
		var enabledCapabilities = [];
		for (var i = 0, l = this.capabilities.length; i < l; i++) {
			if (this.capabilities[i].state) 
				enabledCapabilities.push({"id":this.capabilities[i].id});
		}
		param.object.capabilityProviders = enabledCapabilities;
		this.$.modifyAccount.call(param);
	},
	
	setApplicationSuccess: function() {
	},
	
	setAppFailure: function(inSender, inResponse) {
		this.$.errorDialog.openAtCenter(inResponse);
	},
	
	closeAppDialog: function() {
		this.$.errorAppDialog.close();
	},
	
	resendVerification: function() {
		this.$.spinnerOverlay.openAtCenter();
		this.$.resendVerificationEmail.call({});
	},
	
	resendEmailSuccess: function() {
		this.$.spinnerOverlay.close();
		var template = new enyo.g11n.Template($L("A verification email was sent to #{email}.")); 
		this.$.verifyText.setContent(template.evaluate({email: enyo.string.escapeHtml(this.email)}));
		this.$.verifyEmailDialog.openAtCenter();	
	},
	
	resendEmailFailure: function(inSender, inResponse) {
		this.$.spinnerOverlay.close();
		this.$.errorDialog.openAtCenter(inResponse);
	},

	closeVerifyEmailDialog: function() {
		this.$.verifyEmailDialog.close();	
	},
	
				
	create: function()
	{
		this.inherited(arguments);
	},
	done: function()
	{
		this.owner.backToViewCallback();
	}
});

enyo.kind({
	name: "MyApps.PalmID.SimpleItem",
	kind: enyo.Item,
	align: "center",
	tapHighlight: false,
	layoutKind: "HFlexLayout",
	components: [
	]
});
