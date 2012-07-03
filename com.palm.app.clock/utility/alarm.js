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
	name: "Alarm",
	kind: "Component",
	events: {onKillMe: ""},
	published: {strKey: "", boolIsNew: false, strAction: "", dateSet: undefined},
	components: [

		{kind: "AlarmDbManager", onGotAlarms: "gotAlarm", onAlarmUpdated: "onAlarmUpdated"},
		{name: "appEvent", kind: "ApplicationEvents", onWindowParamsChange: "windowParamsChangeHandler"},
		{kind: "AudioManager", onPlaying: "onAudioPlaying", onEnded: "onAudioEnded", onSrcChanged: "onAudioSrcChanged", onPausePlay: "doTrackPausePlay", onAudioError: "onAudioError"},
		{kind: "ActivityManager", onSetAlarmTimeOut: "onSetAlarmTimeOut", onClearAlarmTimeout: "onClearAlarmTimeout", onFailure:"" },
		{kind: "KeyManager", onPowerKey: "onHardwareKey", onVolumeKey: "onHardwareKey",  onGotRingerSwitch: "gotRingerSwitch"},
		{kind: "DisplayManager"}

	],
	
	
	create: function ()
	{
			
		this.inherited(arguments);

		this.log("this.strKey:" + this.strKey);
		this.log("this.strAction:" + this.strAction);
		this.log("this.dateSet:" + this.dateSet);
		
		
		if(this.strKey !== undefined && this.strKey !== "")
		{
			
			this.getAlarm();
			
			this.$.keyManager.subscribe_psPowerKeys();
			this.$.keyManager.subscribe_psVolumeKeys();

			
		}
		
	},
	
	
	windowParamsChangeHandler: function ()
	{
		
		this.log(enyo.windowParams);
		
		
		if(enyo.windowParams.action)
		{
			
			switch (enyo.windowParams.action)
			{
				
				case "dismiss":
					this.alarmAction = enyo.bind(this, "dismissAlarm");
					break;
				
				case "snooze":
					this.alarmAction = enyo.bind(this, "snoozeAlarm");
					break;
				
			}
			
			if(enyo.application.prefs && this.alarmAction)
			{
				this.alarmAction();
			}
			else
			{
				this.log("prefs not loaded");

			}
			
			
		}

	},
	
	
	getRingerSwitch: function (callback)
	{
		
		this.$.keyManager.getRingerSwitch(callback)
		
	},
	
	
	gotRingerSwitch: function (sender, boolRingerSwitch, callback)
	{
	
		this.log(boolRingerSwitch);
		this.boolRingerSwitch = boolRingerSwitch;
		
		if(callback)
		{
			callback();
		}
	},
	
	
	getAlarm: function ()
	{
		this.log();
		this.log(this.strKey);
		this.$.alarmDbManager.getAlarms({where: [{"prop": "key", "op": "=", "val": this.strKey}]});
		
	},
	
	
	gotAlarm: function (sender, results)
	{
		
		this.log(results);
		
		if(results.length > 0)
		{
			this.objAlarmRecord = results[0];
			this.log(this.objAlarmRecord);
			this.log(this.strAction);
			
			switch (this.strAction)
			{
				
				case "ring":
					
					this.getRingerSwitch(enyo.bind(this, "ringAlarm"));
					break;
				
			}
			
		}
		
	},
	
	
	initAlarm: function ()
	{
		
		
		
	},
	
	
	
	
	ringAlarm: function ()
	{
		
		try
		{

			this.log("dateDiff: ", enyo.application.utilities.dateDiff(new Date(), this.dateSet, "s" ));
			
			if(this.dateSet === undefined || Math.abs(enyo.application.utilities.dateDiff(new Date(), this.dateSet, "s" )) <= 120)
			{
				
				this.log("enyo.application.prefs.RingerSwitchOff: ", enyo.application.prefs.RingerSwitchOff);
				
				if(this.boolRingerSwitch || enyo.application.prefs.RingerSwitchOff === "play")
				{
					this.playRingtone();
				}
				
				this.showAlarmDash();
				
			}
			else
			{
				//Alarm went off at the wrong time. It is ignored and a timeout is set for the next alarm occurence, if any.
				this.log("Activity being launched at wrong time. Cancelling and setNextAlarm()");
				this.setNextAlarm();
				
			}
		}
		catch(err)
		{
			this.log("error: ", err);
		}
		
	},
	
	
	showAlarmDash: function ()
	{
		this.log();
	
		this.dashControls = enyo.windows.openPopup("dashAlarm.html", "com.palm.app.clock.alarm." + this.objAlarmRecord.key , {objAlarmRecord: this.objAlarmRecord, callbackDismiss: enyo.bind(this, "dismissAlarm"), callbackSnooze: enyo.bind(this, "snoozeAlarm")}, {clickableWhenLocked: true}, 110, true);
		
		this.$.displayManager.lockDisplay(true);
		
	},
	
	closeAlarmDash: function ()
	{
		this.log();
		
		if(this.dashControls)
		{
			this.dashControls.close();
			this.dashControls = null;
		}				
		this.$.displayManager.lockDisplay(false);
		
	},
	
	playRingtone: function ()
	{
		this.log();
		this.$.audioManager.playAudio(this.objAlarmRecord.alarmSoundFile);
		
	},
	
	stopRingtone: function ()
	{
		this.log();
		this.$.audioManager.pauseAudio(false);		
		
	},
	
	
	dismissAlarm: function ()
	{
		
		this.log();
		
		this.stopRingtone();
		this.setNextAlarm();
		
		
	},
	
	
	setNextAlarm: function()
	{
	
		//var dateNext = enyo.application.utilities.dateGetNext(this.objAlarmRecord.hour, this.objAlarmRecord.minute,this.objAlarmRecord.occurs);
		this.log();
		if(this.objAlarmRecord)
		{
			
			if(this.objAlarmRecord.occurs !== "once")
			{
				this.$.activityManager.setAlarmTimeout(this.objAlarmRecord, enyo.application.utilities.dateGetNext(this.objAlarmRecord.hour, this.objAlarmRecord.minute, this.objAlarmRecord.occurs));
			}
			else
			{
				this.objAlarmRecord.enabled = false;
				this.$.activityManager.clearAlarmTimeout(this.objAlarmRecord);				
			}
		}
	},
	
	onSetAlarmTimeOut: function ()
	{
		this.log();
		this.doneSetAlarm();
	},

	
	onClearAlarmTimeout: function ()
	{
		this.log();
		this.$.alarmDbManager.updateAlarm(this.objAlarmRecord);		
	},


	onAlarmUpdated: function ()
	{
		this.log();
		this.doneSetAlarm();
	},
	
	
	
	doneSetAlarm: function ()
	{
		this.log();
		this.closeAlarmDash();
		
		this.log("Goodbye cruel world");
		this.destroy();
	},
	
	
	onHardwareKey: function ()
	{
		this.log();
		this.snoozeAlarm();
	},
	
	
	snoozeAlarm: function ()
	{
		this.log();

		this.stopRingtone();
		this.closeAlarmDash();
		
		this.setNextSnooze();
		
	},	
	
	setNextSnooze: function()
	{
	
	
		var now = new Date();
		
		var intSnoozeDuration = 10;
		if(enyo.application.prefs.SnoozeDuration)
		{
			intSnoozeDuration =enyo.application.prefs.SnoozeDuration;
		}
		
		now.setMinutes(now.getMinutes() + intSnoozeDuration);
		
		this.log(now);
		
		this.$.activityManager.setAlarmTimeout(this.objAlarmRecord, now);

	},
	

	
	kAlarmCookie: "alarmcookie",
	
	kSunday: 0,
	kMonday: 1,
	kTuesday: 2,
	kWednesday: 3,
	kThursday: 4,
	kFriday: 5,
	kSaturday: 6,
	
	kAlarmSchedulerKey: "timequake", // "You were sick, but now you're well again, and there's work to do"
	kAlarmSchedulerKeySnooze: "timequakeSnooze",
	kAlarmCookieTime: "alarmTime",
	kAlarmCookieEnabled: "alarmEnabled",
	kAlarmSchedulerUri: "luna://com.palm.power/timeout/",
	kAlarmLaunchUri: "luna://com.palm.applicationManager/launch",
	kAlarmLaunchParams: '{"id":"com.palm.app.clock","params":{"action":"ring"}}',	//?? Can I just make this an object?
	kAlarmSnoozeLongDuration: "00:20:00",
	kAlarmSnoozeDuration: "00:10:00",
	// kAlarmSnoozeInterruptedDuration: "00:00:45", service does not allow alarms less than 5 min.
	kAlarmSnoozeInterruptedDuration: "00:05:00",
	kCookieAlarmSoundFile: "alarmsoundfile",
	kCookieAlarmSoundTitle: "alarmsoundtitle",
	// TODO ALWAYS MAKE SURE THIS IS VALID
	kAlarmSoundDefaultFile: "/media/internal/ringtones/Flurry.mp3",
	kAlarmSoundDefaultTitle: "Flurry",

});
