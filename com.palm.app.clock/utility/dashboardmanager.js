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
	name: "DashboardManager",
	kind: "Component",
	events: {},
	components: [

		{kind: "AlarmDbManager", onGotAlarms: "gotAlarms"},
		{kind:"Dashboard", onMessageTap: "messageTap", onTap: "onTap_Dashboard", onLayerSwipe: "layerSwiped"}
		
	],
	
	
	create: function ()
	{
		
		this.inherited(arguments);
		this.getAlarms();
		
	},
	
	
	getAlarms: function ()
	{
		this.log();
		this.$.alarmDbManager.getAlarms({where: [{"prop": "enabled", "op": "=", "val": true}]});
	},
	
	
	gotAlarms: function (sender, results)
	{
		this.log(results);
		enyo.application.arAlarms = results;
		
	},
	
	showDashboards: function (boolShowDashboards)
	{
		this.log(boolShowDashboards);
		
		if(boolShowDashboards)
		{
			this.addDashboards();
		}
		else
		{
			this.clearDashboards();
		}
		
	},	
	
	
	addDashboards: function ()
	{
		this.log();
		
		var dateAlarm;
		
		if(enyo.application.arAlarms.length > 0)
		{
			enyo.application.utilities.sortAlarmsByNextDate(enyo.application.arAlarms);
			
			for (var intAlarmIndex = 0; intAlarmIndex < enyo.application.arAlarms.length; intAlarmIndex++)
			{
				if(enyo.application.arAlarms[intAlarmIndex].enabled)
				{
					//this.log(enyo.application.arAlarms[intAlarmIndex]);
					//this.log("Next date: ", enyo.application.utilities.dateGetNext(enyo.application.arAlarms[intAlarmIndex].hour, enyo.application.arAlarms[intAlarmIndex].minute,enyo.application.arAlarms[intAlarmIndex].occurs));
					
					dateAlarm = new Date();
					dateAlarm.setHours(enyo.application.arAlarms[intAlarmIndex].hour);
					dateAlarm.setMinutes(enyo.application.arAlarms[intAlarmIndex].minute);
					
					enyo.application.arAlarms[intAlarmIndex].niceDay = enyo.application.utilities.nextAlarmDayText(dateAlarm,enyo.application.arAlarms[intAlarmIndex].occurs);
					
					this.pushDashboard(enyo.application.arAlarms[intAlarmIndex]);
				}
			}
		}
	},
	
	
	pushDashboard: function(objAlarmRecord)
	{

		this.log(objAlarmRecord.niceTime + " " + objAlarmRecord.niceDay);
		this.$.dashboard.push({icon:"images/notification-alarm-small.png", title: objAlarmRecord.title, text: objAlarmRecord.niceTime + " " + objAlarmRecord.niceDay, alarmkey: objAlarmRecord.key});
	},
	
	
	clearDashboards: function ()
	{
		this.log();
		this.$.dashboard.setLayers([]);
		
	},
	
	
	popDashboard: function()
	{
		this.$.dashboard.pop();
	},
	
	
	sendCommand: function (cmdType, strKey)
	{
		this.log();
		var winRoot = enyo.windows.getRootWindow();
		//var winRoot = enyo.windows.fetchWindow("com.palm.app.clock");
		if(winRoot)
		{
			this.log("setting windows params");
			enyo.windows.setWindowParams(winRoot, {action: cmdType, key:  strKey });
		}
		else
		{
			this.log("root window not found");
			
		}
	},
	
	onTap_Dashboard: function (sender, event)
	{
		
		this.log(event);
		
		this.sendCommand("edit", event.alarmkey)
	},
	
	
	layerSwiped: function(inSender, layer)
	{
		//this.$.status.setContent("Swiped layer: "+layer.text);
	}	
	
	
	
});