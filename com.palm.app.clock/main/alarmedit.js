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
	name: "AlarmEdit",
	kind: "Control",
	events: {onCancel: "", onDone: ""},
	components: [
		{kind: "AlarmDbManager", onGotAlarms: "gotAlarm", onAlarmUpdated: "onSuccess_updateAlarm", onAlarmInserted: "onSuccess_insertAlarm"},
		{kind: "ActivityManager", onSetAlarmTimeOut: "", onFailure:"" },
		
		{kind:"RowGroup", components:[
	      {kind: "Item", tapHighlight: false, layoutKind: "HFlexLayout", components: [
				{flex:1, content: $L("Enabled")},
				{name: "togEnabled",  kind: "ToggleButton", caption: $L("Enabled"), onLabel: $L("On"), offLabel: $L("Off"), onChange: "onchange_togEnabled"}		
			]},
			{name:"txtTitle", kind: enyo.Input, hint: $L("Alarm Name"), className: 'enyo-text-ellipsis', onchange: "onchange_txtTitle", style: "padding-left: 3px;"},
	      {kind: "Item", tapHighlight: false, pack:"center", align:"center", layoutKind: "HFlexLayout", components: [
				{flex:1, content:$L("Occurs")},
				{name:"lselOccurs", kind: "ListSelector", value: "once", onChange:"onchange_lselOccurs", hideArrow: false, items: [
					{caption: $L("Once"), value:"once"},
					{caption: $L("Daily"), value:"daily"},
					{caption: $L("Weekdays"), value:"weekdays"},
					{caption: $L("Weekends"), value:"weekends"},
				]}
			]},
	      {kind: "Item", tapHighlight: false, pack:"center", align: "center", layoutKind: "HFlexLayout", components: [
				{flex:1, content:$L("Time")},
				{name: "tmpickAlarm", kind: "TimePicker", label: " ", minuteInterval: 1, onChange:"onchange_tmpickAlarm"}
			]},
		   {name: "itemSound", kind: "Item", tapHighlight: false, layoutKind: "HFlexLayout", onclick: "onclick_itemSound", components: [
				{flex:1, content:$L("Sound")},
				{name: "lblSound", content:"Flurry", style: "min-width: 3em; max-width: 7em;", className: "enyo-text-ellipsis"}
				
			]}
		]},
		{kind:"Toolbar", className:"", components: [
			{kind: "Button", name: "btnCancel", caption: $L("Cancel"), 	onclick: "doCancel", className: "enyo-button-light btn-cancel", flex: 1},
			{kind: enyo.Button, name: "btnDone", 	caption: $L("Done"), 	onclick: "onclick_btnDone", className: "enyo-button-dark btn-done", flex: 1}
		]},
		{name: "filepicker", kind:"FilePicker", fileType: ["ringtone"], currentRingtonePath: "/media/internal/ringtones/", onPickFile:"onPickFile_filepicker", onClose: "onClose_filepicker"}




	],
	
	arAlarms: [],
	
	boolEditMode: false,
	
	
	create: function ()
	{
		this.inherited(arguments);

		this.local_nicetime_formatter = new enyo.g11n.DateFmt({time: "short"});	
		
	},


	ready: function ()
	{

	},
	
	newAlarm: function()
	{
		this.boolEditMode = false;
		this.objAlarmRecord = this.$.alarmDbManager.createBlankAlarm();
		this.log("this.objAlarmRecord: ",this.objAlarmRecord);
		this.drawAlarm();
		
	},
	
	editAlarm: function (strKeyAlarm)
	{
		this.log("key: ", strKeyAlarm);
		this.boolEditMode = true;
		this.strKeyAlarm = strKeyAlarm;
		this.getAlarm()
		
	},
	
	
	getAlarm: function ()
	{
		
		this.$.alarmDbManager.getAlarms({where: [{"prop": "key", "op": "=", "val": this.strKeyAlarm}]});
		
	},
	
	gotAlarm: function (sender, results)
	{
		
		//this.log(results);
		
		if(results.length > 0)
		{
			this.objAlarmRecord = results[0];
			this.log(this.objAlarmRecord);
			
			this.drawAlarm();
		}
		
		
	},
	
	drawAlarm: function ()
	{
		this.$.togEnabled.setState(this.objAlarmRecord.enabled);
		this.$.txtTitle.setValue(this.objAlarmRecord.title);
		this.$.lselOccurs.setValue(this.objAlarmRecord.occurs);
		
		this.log(this.objAlarmRecord.hour);
		this.log(this.objAlarmRecord.minute);

		
		var dateSet = new Date(1990,1,1, this.objAlarmRecord.hour, this.objAlarmRecord.minute,0,0);
		this.log(dateSet);
		this.$.tmpickAlarm.setValue(dateSet);
		
		
		this.$.lblSound.setContent(this.objAlarmRecord.alarmSoundTitle);
	
		
	},
	
		
	onchange_togEnabled: function ()
	{
		this.log(this.$.togEnabled.getState());
		this.objAlarmRecord.enabled = this.$.togEnabled.getState();
	},
	
	
	onchange_txtTitle: function ()
	{
		this.log(this.$.txtTitle.getValue());
		this.objAlarmRecord.title = this.$.txtTitle.getValue();
	},

	onchange_lselOccurs: function ()
	{
		this.log(this.$.lselOccurs.getValue());
		this.objAlarmRecord.occurs = this.$.lselOccurs.getValue();
	},
	
	
		
	onchange_tmpickAlarm: function ()
	{
		this.log(this.$.tmpickAlarm.getValue());
		
		var dateAlarm = this.$.tmpickAlarm.getValue()
		
		this.objAlarmRecord.hour = dateAlarm.getHours();
		this.objAlarmRecord.minute = dateAlarm.getMinutes();
		this.objAlarmRecord.niceTime = this.local_nicetime_formatter.format(dateAlarm);
		this.log("niceTime: ",enyo.application.utilities.nextAlarmDayText(dateAlarm, this.objAlarmRecord.occurs));
		this.objAlarmRecord.niceDay = enyo.application.utilities.nextAlarmDayText(dateAlarm, this.objAlarmRecord.occurs);
		
	},
	
	
	onclick_itemSound: function ()
	{
		this.$.filepicker.pickFile();
	},
	
	
	onPickFile_filepicker: function (sender, files)
	{
		
		if(files.length > 0)
		{
			this.log(files[0].name);
			this.objAlarmRecord.alarmSoundTitle = files[0].name;
			this.objAlarmRecord.alarmSoundFile = files[0].fullPath;	
			this.$.lblSound.setContent(files[0].name);
		}
		
	},
	
	onClose_filepicker: function (sender, event)
	{
		
		this.log(event);
		
	},
	
	onclick_btnDone: function ()
	{
		if(this.boolEditMode)
		{
			this.updateAlarm();
		}
		else
		{
			this.insertAlarm();
		}
		
		//this.doDone();
	},
	
	
	updateAlarm: function ()
	{
		
		this.onchange_txtTitle();		
		this.onchange_tmpickAlarm();
		
		this.log(this.objAlarmRecord);

		this.$.alarmDbManager.updateAlarm(this.objAlarmRecord);

		if(this.objAlarmRecord.enabled)
		{
			this.$.activityManager.setAlarmTimeout(this.objAlarmRecord, enyo.application.utilities.dateGetNext(this.objAlarmRecord.hour, this.objAlarmRecord.minute, this.objAlarmRecord.occurs));
		}
		else
		{
			this.$.activityManager.clearAlarmTimeout(this.objAlarmRecord);
		}	
		
	},
	
	onSuccess_updateAlarm: function ()
	{
		this.log();
		this.doDone();
		
	},
	
	
	onFailure_updateAlarm: function ()
	{
		this.log();
	
		
	},
	
	insertAlarm: function()
	{
		
		this.onchange_txtTitle();		
		this.onchange_tmpickAlarm();

		this.log(this.objAlarmRecord);
		
		this.$.alarmDbManager.insertAlarm(this.objAlarmRecord);
		
		
		if(this.objAlarmRecord.enabled)
		{
			this.$.activityManager.setAlarmTimeout(this.objAlarmRecord, enyo.application.utilities.dateGetNext(this.objAlarmRecord.hour, this.objAlarmRecord.minute, this.objAlarmRecord.occurs));
		}
	},
	
	onSuccess_insertAlarm: function (sender, response)
	{
		this.log("response:", response);
		this.doDone();
		
		
		
		
	},
	
	
	onFailure_insertAlarm: function ()
	{
		this.log();
	
		
	},
	
	
	
	
});
