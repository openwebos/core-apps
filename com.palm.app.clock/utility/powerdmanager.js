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
	name: "PowerDManager",
	kind: "Component",
	events: {onSetAlarmTimeOut: "", onFailure: ""},
	components: [
		
		{name: "psAlarmSet", kind: "PalmService", service: "palm://com.palm.power/", method: "timeout/set", onSuccess: "onSuccess_AlarmSet", onFailure: "onFailure_AlarmSet"},
		
		{name: "psAlarmClear", kind: "PalmService", service: "palm://com.palm.power/", method: "timeout/clear", onSuccess: "onSuccess_AlarmClear", onFailure: "onFailure_AlarmClear"},
	],
		
	create: function ()
	{
		this.inherited(arguments);
	},
	
	
	kStrSchedulerKeyBase: "clockAlarm",

	
	setAlarmTimeout: function (objAlarmRecord, dateTimeout)
	{
		this.log(objAlarmRecord);
		
		//var dateNext = enyo.application.utilities.dateGetNext(objAlarmRecord.hour, objAlarmRecord.minute);
		
			
		var objSetAlarmPayload = {
			
			key: objAlarmRecord.key,
			at: enyo.application.utilities.dateFormatForScheduler(dateTimeout),
			uri: "luna://com.palm.applicationManager/launch",
			params: {"id":"com.palm.app.clock","params":{"action":"ring", "key": objAlarmRecord.key}},
			wakeup: true,
			keep_existing: false
			
		}
		
		this.log("objSetAlarmPayload: ", objSetAlarmPayload);
		
		this.$.psAlarmSet.call(objSetAlarmPayload);
		
	},
	
	
	onSuccess_AlarmSet: function (sender, response)
	{
		this.log(response);
	},
	
	
	onFailure_AlarmSet: function (sender, response)
	{
		this.log(response);		
	},



	clearAlarmTimeout: function (objAlarmRecord)
	{
				
		this.$.psAlarmClear.call({key: objAlarmRecord.key});
		
	},


	onSuccess_AlarmClear: function (sender, response)
	{
		this.log(response);
	},
	
	
	onFailure_AlarmClear: function (sender, response)
	{
		this.log(response);		
	},






});
