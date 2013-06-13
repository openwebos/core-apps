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

enyo.kind({
	name: "Prefs",
	kind: "Control",

	events: {onCancel: "", onDone: "", onChangeTheme: ""},
	components: [
		{kind: "PrefsManager", onGotPrefs: "gotPrefs", onPrefUpdated: "onSuccess_updatePref", onPrefInserted: "onSuccess_insertPref"},
		{kind:enyo.PageHeader, className:"enyo-toolbar-light prefs-header", pack:"center", components:[
			{kind: enyo.Image, src: "../images/header-icon-calendar48x48.png", className: "prefsIcon"},
			{content: $L("Preferences"), className:""}
		]},
		{className:"accounts-header-shadow"},
		{style: "width: 480px; margin: 0 auto 0 auto;", components: [

			{name:"contentScroller", kind: "Scroller", flex: 1, components: [
			]},
			{kind:"RowGroup", caption: $L("Alarm Sound"), components:[
				{kind: "Item", tapHighlight: false, layoutKind: "HFlexLayout", components: [
					{flex:1, content:$L("When Sounds is Muted")},
					{name:"lselRingerSwitch", kind: "ListSelector", value: "play", onChange:"onchange_lselRingerSwitch", hideArrow: false, items: [
						{caption: $L("Play Alarm Sound"), value:"play"},
						{caption: $L("Mute Alarm Sound"), value:"mute"},
					]}
				]},
				/*
				{kind: "Item", tapHighlight: false, layoutKind: "HFlexLayout", components: [
					{flex:1, content: $L("Ascending Volume")},
					{name: "togAscending",  kind: "ToggleButton", caption: "", onLabel: "Yes", offLabel: "No", onChange: "onchange_togAscending"}		
				]}
				*/
			]},
			{kind:"RowGroup", caption: $L("Snooze"), components:[
				{kind: "Item", tapHighlight: false, layoutKind: "HFlexLayout", components: [
					{flex:1, content:$L("Occurs")},
					{name:"lselSnoozeDuration", kind: "ListSelector", value: 10, onChange:"onchange_lselSnoozeDuration", hideArrow: false, items: [
						{caption: $L("5 Min"), value:5},
						{caption: $L("10 Min"), value:10},
						{caption: $L("15 Min"), value:15},
						{caption: $L("20 Min"), value:20},
					]}
				]}
			]},
			{kind:"RowGroup", caption: $L("Theme"), components:[
					{name:"lselClockTheme", kind: "ListSelector", value: "default", onChange:"onchange_lselClockTheme", hideArrow: false, items: [
						{caption: $L("Analog 1"), value: "default"},
						{caption: $L("Analog 2"), value: "glass"},
						{caption: $L("Digital"), value: "digital"},
					]}
				
			]}
		]},
		{kind:"Toolbar", className:"", components: [
			{kind: enyo.Button, name: "btnDone", 	caption: $L("Done"), 	onclick: "onclick_btnDone", className: "enyo-button-affirmative btn-done"}
		]},	



	],
	
	
	strOrigTheme: "",
	
	
	create: function ()
	{
		this.inherited(arguments);

	},


	ready: function ()
	{

	},
	
	
	getPrefs: function ()
	{
		this.$.prefsManager.getPrefs();
	},
	
	gotPrefs: function (sender, results)
	{
		this.drawPrefs();
		
	},
	
	drawPrefs: function ()
	{
		//this.$.togAscending.setState(enyo.application.prefs.AscendingVolume);
		this.$.lselRingerSwitch.setValue(enyo.application.prefs.RingerSwitchOff);
		this.$.lselSnoozeDuration.setValue(enyo.application.prefs.SnoozeDuration);
		this.$.lselClockTheme.setValue(enyo.application.prefs.ClockTheme);
		this.strOrigTheme = enyo.application.prefs.ClockTheme;
				
		
		
	},
	
		
	onchange_togAscending: function ()
	{
		this.log(this.$.togAscending.getState());
		enyo.application.prefs.AscendingVolume = this.$.togAscending.getState();
	},
	

	onchange_lselRingerSwitch: function ()
	{
		this.log(this.$.lselRingerSwitch.getValue());
		enyo.application.prefs.RingerSwitchOff = this.$.lselRingerSwitch.getValue();
	},


	onchange_lselSnoozeDuration: function ()
	{
		this.log(this.$.lselSnoozeDuration.getValue());
		enyo.application.prefs.SnoozeDuration = this.$.lselSnoozeDuration.getValue();
	},
	
	
	onchange_lselClockTheme: function ()
	{
		this.log(this.$.lselClockTheme.getValue());
		enyo.application.prefs.ClockTheme = this.$.lselClockTheme.getValue();
	},
		

	
	
	onclick_btnDone: function ()
	{
		this.updatePref();
		
		//this.doDone();
	},
	
	
	updatePref: function ()
	{
		
		this.log(enyo.application.prefs);
		
		this.$.prefsManager.updatePref();


	},
	
	onSuccess_updatePref: function ()
	{
		this.log();
		if(this.strOrigTheme !== enyo.application.prefs.ClockTheme)
		{
			this.doChangeTheme();
		}
		this.doDone();
		
	},
	
	
	onFailure_updatePref: function ()
	{
		this.log();
	
		
	},
	
	insertPref: function()
	{
		this.log();
		this.$.prefsManager.insertPref(this.objPrefRecord);
		
		
		if(this.objPrefRecord.enabled)
		{
			this.$.activityManager.setPrefTimeout(this.objPrefRecord, enyo.application.utilities.dateGetNext(this.objPrefRecord.hour, this.objPrefRecord.minute, this.objPrefRecord.occurs));
		}
	},
	
	onSuccess_insertPref: function (sender, response)
	{
		this.log("response:", response);
		this.doDone();
		
	},
	
	
	onFailure_UpdatePref: function ()
	{
		this.log();
	
		
	},
	
	
	
	
});
