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

﻿enyo.kind({
	name: "MyApps.PalmID",
	kind: enyo.Pane,
	published : {
		palmProfileAccount: {},
		initialize: function(parms) {
			this.backToViewCallback = enyo.bind(this, 
				function() {
					//parms.backToView();
					this.doAccountsModify_Done();
		    		this.selectView(this.$.dummy);
					this.render();
					this.$.initialize.destroy()
					this.$.accounts.destroy()
					this.$.fullProfile.destroy()
				});
				
				
			this.createComponents(
				[
					{name: "initialize", kind: "MyApps.PalmID.Initialize"},
					{name: "accounts", kind: "MyApps.PalmID.Accounts"},
					{name: "fullProfile", kind: "MyApps.PalmID.Profile"}
				]			
			);		
			this.render();
		    this.selectView(this.$.initialize);
			this.$.initialize.initialize({backToViewCallback: this.backToViewCallback, palmProfileAccount: parms.palmProfileAccount});			
			
			this.nameChangeCallback = function(){}; // not passed in anymore.
			this.palmProfileAccount = parms.palmProfileAccount;
		},	
	},
	events: {
		onAccountsModify_Done: "",
	},
	components: [
		{name: "dummy", kind: enyo.VFlexBox, content:" "}
	]
	
});

console.log("palm.js");


