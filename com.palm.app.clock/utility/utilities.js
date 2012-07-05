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
	name: "Utilities",
	kind: "Component",
	events: {},
	published: {},
	
	
	now: function ()
	{
		return new Date();
	},

	
	getCurrentTime: function ()
	{
		
	},
	
	getCurrentTimeFormatted: function ()
	{
		
	},
	
	getCurrentHourPartial: function (bool24)
	{
		return this.getCurrentHour(bool24) + (this.getCurrentMinute()/60);
		
	},
	
	getCurrentHour: function (bool24)
	{
		
		var intHour;
		
		if(bool24 === undefined)
		{
			bool24 = false;
		}
		
		intHour = this.now().getHours();
		
		if(!bool24)
		{
			if(intHour > 11)
			{
				intHour = intHour - 12;
			}
		}
		
		if(intHour >= 0)
		{
			return intHour;
		}
		
		return -1;
		
	},
	
	getCurrentMinutePartial: function ()
	{
		return this.getCurrentMinute() + (this.getCurrentSecond()/60);	
	},
	
	getCurrentMinute: function ()
	{
		return this.now().getMinutes();
	},
	
	getCurrentSecond: function ()
	{
		return this.now().getSeconds();
	},
	
	dateDiff: function (date1, date2, strSpanType)
	{
		this.log("date1", date1);
		this.log("date2", date2)
		var intDiff = date1.getTime() - date2.getTime();
		
		
		switch (strSpanType)
		{
			
			case "s":
				this.log("returning secs");
				return intDiff /1000;
				break;
			
			default:
				this.log("returning ticks");
				return intDiff;
				break;
			
			
		}
		
		
	},
	
	
	dateGetNext: function(h, m, occurs) {
		
		this.log("h: ", h);
		this.log("m: ", m);
		this.log("occurs: ", occurs);

		var now = new Date();

		switch (occurs) {
			case ('daily'):
				now = this.nextDay(h, m, now);
				break;
			case ('weekdays'):
				now = this.nextWeekday(h, m, now);
				break;
			case ('weekends'):
				now = this.nextWeekend(h, m, now);
				break;
			default:
				now = this.nextDay(h, m, now);
				break;
		}
		
		this.log("now: ", now);
		return now;
		
	},
	
	nextDay: function(h, m, now){
		this.log();
		if (now.getHours() > h || (now.getHours() == h && now.getMinutes() >= m)) {
				now.setDate(now.getDate()+1);
		}
		now.setHours(h);
		now.setMinutes(m);
		now.setSeconds(0);
		return now;
	},
	
	nextWeekday: function(h, m, now){
		this.log();
		var timePassed = false;
		if (now.getHours() >  h || (now.getHours() == h && now.getMinutes() >= m)) {
			timePassed = true;
		}
		
		var day = now.getDay();
		if(day == this.kSunday) {
			now.setDate(now.getDate() + 1);
		} else if (day == this.kFriday && timePassed) {
			now.setDate(now.getDate() + 3);
		} else if (day == this.kSaturday) {
			now.setDate(now.getDate() + 2);
		} else if (timePassed) {
			now.setDate(now.getDate() + 1);
		}
		
		now.setHours(h);
		now.setMinutes(m);
		now.setSeconds(0);
		return now;
	},

	nextWeekend: function(h, m, now){
		this.log();
		var timePassed = false;
		if (now.getHours() > h || (now.getHours() == h && now.getMinutes() >= m)) {
			timePassed = true;
		}
		var day = now.getDay();
		
		if (day == this.kSunday){
			if (timePassed) {
				now.setDate(now.getDate() + 6);
			}	
		} else if (day == this.kSaturday && timePassed){
			now.setDate(now.getDate() + 1);
		} else {
			now.setDate(now.getDate() + (6 - day));
		}
		now.setHours(h);
		now.setMinutes(m);
		now.setSeconds(0);
		
		return now;
	},
	
	dateFormatForScheduler: function(d) {
		this.log();
		function twoChars(x) { return ((x>9)?"":"0")+x; }
		
		
		return twoChars(d.getUTCMonth()+1) + "/" + twoChars(d.getUTCDate()) + "/" + twoChars(d.getUTCFullYear()) 
					+ " " + twoChars(d.getUTCHours()) + ":" + twoChars(d.getUTCMinutes()) + ":00" 
	},
	
	nextAlarmDayText: function(dateAlarm, occurs) {
		this.log("dateAlarm: ", dateAlarm);
		var today = new Date().getDay();
		switch (occurs) {
			case 'weekdays':
				if (today == this.kSaturday 
					|| (today == this.kFriday && !(this.isLaterToday(dateAlarm)))) {
					return $L("Monday");
				} else if (today == this.kSunday || !(this.isLaterToday(dateAlarm))) {
					return $L("Tomorrow")
				} else {
					return "";
				}
			case 'weekends':
				if ((today >= this.kMonday && today <= this.kThursday)
					|| (today == this.kSunday && !(this.isLaterToday(dateAlarm)))) {
					return $L("Saturday");
				} else if (today == this.kFriday || today == this.kSaturday && !(this.isLaterToday(dateAlarm))) {
					return $L("Tomorrow")
				} else {
					return "";
				}
			case 'daily':
			case 'once':
				if (this.isLaterToday(dateAlarm)) {
					return ""
				} else {
					return $L("Tomorrow");
				}
		}
	},
	
	isLaterToday: function(dateAlarm)
	{
		var now = new Date();
		return (dateAlarm.getHours() > now.getHours() 
			|| (dateAlarm.getHours() == now.getHours() 
					&& dateAlarm.getMinutes() > now.getMinutes()))
	},
	
	isWeekday: function()
	{
		var now = new Date();
		var day = now.getDay();
		return (day !== this.kSunday && day !== 6);
	},
	
	isWeekend: function()
	{
		return !(this.isWeekday());
	},
	
	
	sortAlarmsByNextDate: function (arAlarmsToSort)
	{
		
		var sortFunc = function ()
		{
			return function (a,b)
			{
				return a.datenext < b.datenext;
			}
		}
		
		if(arAlarmsToSort && arAlarmsToSort.length > 0)
		{
			for(var intIndex = 0; intIndex < arAlarmsToSort.length; intIndex += 1)
			{
				arAlarmsToSort[intIndex].datenext = this.dateGetNext(arAlarmsToSort[intIndex].hour, arAlarmsToSort[intIndex].minute, arAlarmsToSort[intIndex].occurs);
			}
			
			arAlarmsToSort.sort(sortFunc());
				
		}
		
		//return arAlarmsToSort;
	},
	
	
	getActivityDateString: function (timestamp)
	{
		this.log();
	
		//UTC time format
		var date = new Date(timestamp);
		var year = date.getFullYear();
		var month = date.getMonth()+1;
		var day = date.getDate();
		var hour= date.getHours();
		var minute=date.getMinutes();
		var second =date.getSeconds();
	
		month	= (month > 9)	? month		: "0"+month;
		day		= (day > 9)		? day		: "0"+day;
		hour	= (hour > 9)	? hour		: "0"+hour;
		minute	= (minute > 9)	? minute	: "0"+minute;
		second	= (second > 9)	? second	: "0"+second;
	
		/*YYYY-MM-DD HH:MM:SS*/
	//return (""+year+"-"+month+"-"+day+" "+hour+":"+minute+":"+second+"Z");
		return (""+year+"-"+month+"-"+day+" "+hour+":"+minute+":"+second);
	},
	
	kSunday: 0,
	kMonday: 1,
	kTuesday: 2,
	kWednesday: 3,
	kThursday: 4,
	kFriday: 5,
	kSaturday: 6,
	
});
