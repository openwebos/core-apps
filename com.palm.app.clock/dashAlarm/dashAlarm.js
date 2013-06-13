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
	name: "DashAlarmApp",
	kind: "Control",
	align:"center",
	pack: 'center',
	className: "dashAlarm",
	components: [
		{name: "appEvent", kind: "ApplicationEvents", onWindowParamsChange: "windowParamsChangeHandler", onUnload: "onUnload"},
		{kind: "VFlexBox", domAttributes:{"x-palm-popup-content": "01"}, components: [
			{name : "lblAlarmName", content: 'Alarm', pack: 'center', align:'center', className:'alarm-text alarm-title enyo-text-ellipsis truncating-text'},
			{name : "lblAlarmTime", content: '12:00pm Alarm', pack: 'center', align:'center', className:'alarm-text alarm-time'},
			{kind:'HFlexBox', width: '100%', flex:1, pack:'justify',className:'alarmButtonContainer', components:[
				{name: "btnSnooze",kind: "Button", flex:1, className:'Snooze-btn',width: '100%', height:'18px', caption: $L("Snooze"), onclick: "onclick_snooze"},
				{name: "btnDismiss", kind: "Button", flex:1,className:'enyo-button-affirmative Dismiss-btn', width: '100%', height:'18px', caption: $L("Dismiss"), onclick: "onclick_dismiss"}
			]}		
		
		]}

	],
	
	boolClosed: false,
	
	create: function ()
	{
		this.inherited(arguments);
		this.log();
		
		
	
	},
	
	
	windowParamsChangeHandler: function()
	{
		this.log(enyo.windowParams);
		
		if(enyo.windowParams.objAlarmRecord)
		{
			this.objAlarmRecord = enyo.windowParams.objAlarmRecord;
			
			this.drawDash();
		}
		
		if(enyo.windowParams.callbackDismiss !== undefined)
		{
			this.callbackDismiss = enyo.windowParams.callbackDismiss;
		}		
		
		if(enyo.windowParams.callbackSnooze !== undefined)
		{
			this.callbackSnooze = enyo.windowParams.callbackSnooze;
		}				
		
	},
	

	drawDash: function ()
	{
		this.$.lblAlarmName.setContent(this.objAlarmRecord.title);
		this.$.lblAlarmTime.setContent(this.objAlarmRecord.niceTime);
	},
	
	onclick_dismiss: function (sender, event)
	{
		this.log();
		
		this.lockButtons();
		
		this.sendCommand("dismiss");
		this.boolClosed = true;
		if(this.callbackDismiss)
		{
			this.callbackDismiss
		}
		//enyo.application.dismissMethod();

	},
	
	
	onclick_snooze: function (sender, event)
	{
		this.log();
		this.lockButtons();
		this.sendCommand("snooze");
		this.boolClosed = true;
	},
	
	
	lockButtons: function ()
	{
		this.$.btnDismiss.setDisabled(true);
		this.$.btnSnooze.setDisabled(true);
		
	},
	
	
	sendCommand: function (cmdType)
	{
		this.log();
		var winRoot = enyo.windows.getRootWindow();
		//var winRoot = enyo.windows.fetchWindow("com.palm.app.clock");
		if(winRoot)
		{
			enyo.windows.setWindowParams(winRoot, {action: cmdType, key:  this.objAlarmRecord.key });
		}
	},
	
	onUnload: function ()
	{
		this.log();
		if(!this.boolClosed)
		{
			this.callbackSnooze();
		}
		
	}
	
	
});
