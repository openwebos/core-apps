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
	name: "MyApps.PalmID.Accounts",
	kind: enyo.VFlexBox,
	published : {
		accountAggregate : {},
		deviceProfile: {},
		backToViewCallback: {},
		palmProfileAccount: {}
	},
	className:"enyo-bg",
	components: [
		{
			name: "loginDialog",
			kind: "MyApps.PalmID.ProfileLoginPasswordDialog",
		},
		{
	        name: "passwdDialog",
	        kind: "MyApps.PalmID.PasswdDialog",
    	},
		{
			name: "recoverDialog",
			kind: "MyApps.PalmID.PasswordRecoverDialog",
		},

		
		{
			kind: "enyo.Scroller",
			name: "accountsContent",
			flex: 1,
			components: [
				{kind:"Toolbar", className:"enyo-toolbar-light accounts-header", pack:"center", components:[
					{kind: "Image", src: "images/acounts-48x48.png"},
					{kind: "Control", content: $L("HP webOS Account")}
				]},
				{className:"accounts-header-shadow"},
				{kind:"Control", className:"box-center", components: [
					{
						name: "profileList",
						kind: "RowGroup",
						className:"accounts-group",
						caption: $L("NAME"),
						components: [],
						owner: this.owner
					},
					{
						kind: "Button", 
						caption: $L("Login"),
						className:"accounts-btn", 
						onclick: "login"
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
				caption :  $L("Back"),
			},
		]},
	],
	
	done: function()
	{
		this.backToViewCallback();
	},
	
	addAccount: function()
	{
		this.owner.next();
	},
	create: function()
	{
		this.inherited(arguments);
	},
	
	login: function() {
		enyo.keyboard.setManualMode(true);
		enyo.keyboard.show(1);
		
		setTimeout(enyo.bind(this, function() { // delay for keyboard to show.
			this.$.loginDialog.openThisDialog(
				this.accountAggregate.accountInfo.email, 
				this.accountAggregate, 
				enyo.bind(this, this.loginSuccess), 
				enyo.bind(this, this.loginCancel), 
				enyo.bind(this, this.done));
			}), 500)
	},	
	
	loginSuccess: function(password) {
		enyo.keyboard.hide();
		enyo.keyboard.setManualMode(false);
		this.accountAggregate.accountInfo.password = password; 
		this.loadAccount();
	},
	
	loginCancel: function() {
		this.login();
	},
	
	setAccountInfo: function(accountAggregate)
	{
		this.accountAggregate = accountAggregate;
		var account = accountAggregate.accountInfo;
		var acctname = account.firstName + $L(" ") + account.lastName;

		//this.$.profileList.build();
		var list = this.$.profileList;
		list.destroyControls();
		
		list.createComponent({name: "account", kind: "MyApps.PalmID.ProfileItem", content: enyo.string.escapeHtml(acctname), className:"enyo-text-ellipsis", flex:1, owner: this, onclick: "login"});

		this.render();
	},

	loadAccount: function()
	{
		console.log(enyo.json.stringify(this.accountAggregate));

		var profile = this.owner.$.fullProfile;
		profile.populateName(this.accountAggregate.accountInfo);
		profile.populateLoginInfo(this.accountAggregate);
		profile.populateDeviceList(this.accountAggregate.accountDevices);
		
		this.applications = this.palmProfileAccount.capabilityProviders
		/*
			this.applications = [
				{"name": $L("Contacts"), "id": 1, "state": true},
				{"name": $L("Messaging"), "id": 2, "state": false},
				{"name": $L("Calendar"), "id": 3, "state": true},
				{"name": $L("Tasks"), "id": 4, "state": true},
				{"name": $L("Memos"), "id": 5, "state": false}
				//{"name": $L("Mail"), "id": 6, "state": false}
				],
		*/
		profile.populateAppList(this.applications);
		this.owner.next();
	}
});

enyo.kind({
	name: "MyApps.PalmID.ProfileItem",
	kind: enyo.Item,
	tapHighlight: false
});



