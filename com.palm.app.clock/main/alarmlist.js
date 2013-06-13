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
	name: "AlarmList",
	kind: "Control",
	width: "100%",
	height: "100%",
	events: {onAlarmsUpdated: ""},
	components: [
		{kind: "AlarmDbManager", onGotAlarms: "gotAlarms", onAlarmDeleted: "onSuccess_deleteAlarm", onAlarmUpdated: "onSuccess_updateAlarm"},
		{kind: "ActivityManager", onSetAlarmTimeOut: "", onFailure:"" },
		{kind: "PageHeader", className:"enyo-header", style:'height:50px', pack:"center", components: [
			{kind: enyo.Image, src: "images/menu-icon-alarm.png", style: "margin-top: -3px;"},
			{content: $L("Alarms")}
		]},
			{kind: "Control", width: "500px", height: "70%", className: "alarms", components: [
				{name: "lblEmpty", showing: "false", content: $L("No Alarms"), style:''},
				{name: "listAlarms", kind: "VirtualList", height: "100%", className: 'enyo-group enyo-roundy', onSetupRow: "listSetupRow", components: [
					{name: "itemAlarm", kind: "SwipeableItem", onConfirm: "onConfirmDelete_itemAlarm", components: [
						{kind: "HFlexBox", className:'enyo-group-inner', align:'center', components: [
							{kind: "Control", onclick: "onclick_listAlarms", flex:1, style:'padding-left:10px', components: [
								{name: "lblAlarmName", content: $L("Alarm"), className: 'enyo-text-ellipsis'},
								{name: "lblAlarmTime", content: ""}
							]},
							{name: "togAlarmOn",  kind: "ToggleButton", onLabel: $L("On"), offLabel: $L("Off"), onChange: "onchange_togEnabled"}
						]}
					]} 
				]},
				{name: "lblWarning", content: $L("Test version: Alarms are not enabled at system level."), style: "color: red;", showing: false},
				{name: "btnNewAlarm", kind: "Button", caption: $L("New Alarm"), style: "width:320px;margin: 20px auto 0 auto", onclick: "onclick_btnNewAlarm"}
			]},
		{name: "diagAlarmEdit", kind: "ModalDialog", caption: $L("Alarm Preferences"), components: [
			{name: "alarmEdit", kind: "AlarmEdit", onCancel:"onCancel_alarmEdit", onDone: "onDone_alarmEdit"}
												 
		]}

	],
	
	arAlarms: [],
	
	
	create: function ()
	{
		this.inherited(arguments);
		
	},


	ready: function ()
	{
		//this.$.alarmDbManager.insertAlarm();
	},
	
	
	getAlarms: function ()
	{
		//this.$.lblWarning.setShowing(false);
		
		this.$.alarmDbManager.getAlarms({});
		
	},
	
	gotAlarms: function (sender, results)
	{
		
		this.log(results);
		
		this.arAlarms = results;
		enyo.application.arAlarms = enyo.cloneArray(this.arAlarms);
		//enyo.application.utilities.sortAlarmsByNextDate(enyo.application.arAlarms);		

		this.$.lblEmpty.setShowing(this.arAlarms.length <= 0);
		
		this.$.listAlarms.punt();
		
	},
	
	listSetupRow: function (sender, intIndex)
	{
		
		this.log(intIndex);
		if(this.arAlarms[intIndex])
		{
			
			this.$.lblAlarmName.setContent(this.arAlarms[intIndex].title);
			this.$.lblAlarmTime.setContent($L(this.arAlarms[intIndex].occurs) + " " + this.arAlarms[intIndex].niceTime);
			
			this.$.togAlarmOn.setState(this.arAlarms[intIndex].enabled);
			return true;
			
		}
		return false;
		
	},
	
	
	onclick_listAlarms: function (sender, event)
	{
		this.log(sender);
		this.log(event.rowIndex);
		if(this.arAlarms[event.rowIndex])
		{
			this.log(this.arAlarms[event.rowIndex]);
			this.$.diagAlarmEdit.openAtCenter();
			this.editAlarm(this.arAlarms[event.rowIndex].key);
		}
	},
	
	editAlarm: function (strKeyAlarm)
	{
		this.log("key:", strKeyAlarm);
		this.$.diagAlarmEdit.openAtCenter();
		this.$.alarmEdit.editAlarm(strKeyAlarm);
		
	},
	
	
	onclick_btnNewAlarm: function ()
	{
		this.$.diagAlarmEdit.openAtCenter();
		this.$.alarmEdit.newAlarm();
	},
	
	
	
	onCancel_alarmEdit:  function ()
	{
		this.$.diagAlarmEdit.close();
		
	},
	
	
	onDone_alarmEdit:  function ()
	{
		this.$.diagAlarmEdit.close();
		this.getAlarms();
		this.doAlarmsUpdated();
		//this.$.lblWarning.setShowing(true);
	},
	
	
	onConfirmDelete_itemAlarm: function (sender, intDeleteIndex)
	{
		this.log(sender);
		this.log(intDeleteIndex);
		
		this.log(sender);
		if(this.arAlarms[event.rowIndex])
		{
			this.log(this.arAlarms[event.rowIndex]);
			this.$.alarmDbManager.deleteAlarm(this.arAlarms[event.rowIndex]._id);
			
			this.$.activityManager.clearAlarmTimeout(this.arAlarms[event.rowIndex]);				

		}
		return true;
		
	},

	
	onSuccess_deleteAlarm: function ()
	{
		this.log();
		this.getAlarms();
	},
	
	
	onchange_togEnabled: function (sender, state)
	{
		this.log(sender);
		this.log(state);
		
		var intToggleIndex = this.$.listAlarms.fetchRowIndex();
		
		if(this.arAlarms[intToggleIndex])
		{
			var objMergeAlarm = this.arAlarms[intToggleIndex];
			objMergeAlarm.enabled = state;
	
			var dateAlarm = new Date(1990,1,1, objMergeAlarm.hour, objMergeAlarm.minute,0,0);
			
			objMergeAlarm.niceDay = enyo.application.utilities.nextAlarmDayText(dateAlarm, objMergeAlarm);

			this.$.alarmDbManager.updateAlarm(objMergeAlarm);
			
			if(state)
			{
				this.$.activityManager.setAlarmTimeout(objMergeAlarm, enyo.application.utilities.dateGetNext(objMergeAlarm.hour, objMergeAlarm.minute, objMergeAlarm.occurs));				
					this.doAlarmsUpdated();
			}
			else
			{
				this.$.activityManager.clearAlarmTimeout(objMergeAlarm);				
			}

			
		}
		
		return true;
	},
	
	
	onSuccess_updateAlarm: function ()
	{
		
		this.log();
		this.getAlarms();
		
	}
	
	
});
