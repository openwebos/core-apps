// @@@LICENSE
//
//      Copyright (c) 2011-2012 Hewlett-Packard Development Company, L.P.
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

enyo.kind(
{
	name: "ActivityManager",
	kind: "Component",
	events: {onSetAlarmTimeOut: "", onClearAlarmTimeout: "", onFailure: ""},
	components: [
		
		{name: "psAlarmSet", kind: "PalmService", service: "palm://com.palm.activitymanager/", method: "create", onSuccess: "onSuccess_AlarmSet", onFailure: "onFailure_AlarmSet"},
		
		{name: "psAlarmClear", kind: "PalmService", service: "palm://com.palm.activitymanager/", method: "complete", onSuccess: "onSuccess_AlarmClear", onFailure: "onFailure_AlarmClear"},
	],
		
	create: function ()
	{
		this.inherited(arguments);
	},
	
	
	kStrSchedulerKeyBase: "",

	setAlarmTimeout: function (objAlarmRecord, dateTimeout)
	{
		this.log(objAlarmRecord);
		
		//var dateNext = enyo.application.utilities.dateGetNext(objAlarmRecord.hour, objAlarmRecord.minute);
		
		/*	
		var objSetAlarmPayload = {
			
			key: this.kStrSchedulerKeyBase + objAlarmRecord.key,
			at: enyo.application.utilities.dateFormatForScheduler( enyo.application.utilities.dateGetNext(objAlarmRecord.hour, objAlarmRecord.minute, objAlarmRecord.occurs)),
			uri: "luna://com.palm.applicationManager/launch",
			params: this.kObjAlarmLaunchParams,
			wakeup: true,
			keep_existing: true
			
		}
		*/
		
		var objSetAlarmPayload =
		{
			"activity" :
			{
				"name":  objAlarmRecord.key,
				"description": "com.palm.app.clock alarm: " + objAlarmRecord.title,
				"type": {"foreground": true, "persist": true},
				"callback":
				{
					"method" : "palm://com.palm.applicationManager/launch",
					"params" :
					{
						"id":"com.palm.app.clock",
						"params":
						{
							"action":"ring",
							"key": objAlarmRecord.key,
							"setTime" :  enyo.application.utilities.getActivityDateString(dateTimeout)
						}
					}
				},
				"schedule": {"start" :  enyo.application.utilities.getActivityDateString(dateTimeout), "local": true}
			},
			"start" : true,
			"replace": true
		}
		
		this.log("objSetAlarmPayload: ", objSetAlarmPayload);
		
		this.$.psAlarmSet.call(objSetAlarmPayload);
		
	},
	
	
	onSuccess_AlarmSet: function (sender, response)
	{
		this.log(response);
		this.doSetAlarmTimeOut();
	},
	
	
	onFailure_AlarmSet: function (sender, response)
	{
		this.log(response);		
		this.doSetAlarmTimeOut();
	},


	clearAlarmTimeout: function (objAlarmRecord)
	{
		this.log();
		this.$.psAlarmClear.call({"activityName" : objAlarmRecord.key});
		
	},


	onSuccess_AlarmClear: function (sender, response)
	{
		this.log(response);
		this.doClearAlarmTimeout();
	},
	
	
	onFailure_AlarmClear: function (sender, response)
	{
		this.log(response);
		
	},






//luna-send -n 1 palm://com.palm.activitymanager/create '{ "activity" : {"name":  "clockAlarm1309505492176", "description": "A Test Alarm", "type": {"foreground": true}, "callback":{"method" : "palm://com.palm.applicationManager/launch", "params" : {"id":"com.palm.app.clock","params":{}}}, "schedule": {"start" : "2011-07-05 12:52:00", "local": true} }, "start" : true, "replace": true}'




});
