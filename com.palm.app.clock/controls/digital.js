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


/*
var day = "01";
var month = "JAN';
var year = "2011";
var hour = "12";
var min = "00";


if(parseInt(hour) < 10) {
	hour = " " + hour
}
*/

enyo.kind({
	name: "Digital",
	width:"745px",
	className: "digitalClock digital",
	kind: "VFlexBox",
	pack: 'center',
	align: 'center',
	published: {boolShowSeconds: false},
	components: [
		{flex:1},
		{kind: "HFlexBox", components: [
			{name: "", className: "time digital-hour",  pack: "center", align: "center", components:[
				{name: "lblHour0", className:"digit"},
				{name: "lblAMPM", className:"time-meridian"},
				{kind: "Image", src: "images/digital_landscape_time_bg.png", className: "digit-hour-overlay"}
			]},
			{name: "", className: "time digital-hour",  pack: "center", align: "center", components:[
				{name: "lblHour1", className:"digit"},
				{kind: "Image", src: "images/digital_landscape_time_bg.png", className: "digit-hour-overlay"}
			]},
			{layoutKind:"VFlexLayout", pack:"center", align: "center", height: "220px", components: [
				{content: ":", className:"clock-separator"}
			]},
			{name: "", className: "time digital-min", pack: "center", align: "center", components:[
				{name: "lblMinute0", className:"digit"},
				{kind: "Image", src: "images/digital_landscape_time_bg.png", className: "digit-hour-overlay"}
			]},
			{name: "", className: "time digital-min", pack: "center", align: "center", components:[
				{name: "lblMinute1", className:"digit"},
				{kind: "Image", src: "images/digital_landscape_time_bg.png", className: "digit-hour-overlay"}
			]},
		]},
		{kind: "HFlexBox", name: "", components: [
			{kind:"HFlexBox", name: "",  pack: 'center', align: 'center',  components: [
				{name: "lblMonth0", className: "date digital-month"},
				{kind: 'Image', src: 'images/digital_landscape_date_bg.png', className: 'digit-date-overlay'},
				{name: "lblMonth1",  className: "date digital-month"},
				{kind: 'Image', src: 'images/digital_landscape_date_bg.png', className: 'digit-date-overlay'},
				{name: "lblMonth2",  className: "date digital-month"},
				{kind: 'Image', src: 'images/digital_landscape_date_bg.png', className: 'digit-date-overlay'},
			]},
			{kind: 'HFlexBox', pack: 'center', align: 'center',  components:[
				{className: 'date',content: '&nbsp;'},
				{kind: 'Image', src: 'images/digital_landscape_date_bg.png', className: 'digit-date-overlay'},
			]},
			{kind:"HFlexBox", name: "", pack: 'center', align: 'center',  components: [
				{name: "lblDay0", className: "date digital-day"},
				{kind: 'Image', src: 'images/digital_landscape_date_bg.png', className: 'digit-date-overlay'},
				{name: "lblDay1", className: "date digital-day"},
				{kind: 'Image', src: 'images/digital_landscape_date_bg.png', className: 'digit-date-overlay'},
			]},
			{kind: 'HFlexBox', pack: 'center', align: 'center',  components:[
				{className: 'date',content: '&nbsp;'},
				{kind: 'Image', src: 'images/digital_landscape_date_bg.png', className: 'digit-date-overlay'},
			]},
			{kind: "HFlexBox", pack: 'center', align: 'center', components:[
				{name: "lblYear0", className: "date digital-year"},
				{kind: 'Image', src: 'images/digital_landscape_date_bg.png', className: 'digit-date-overlay'},
				{name: "lblYear1", className: "date digital-year"},
				{kind: 'Image', src: 'images/digital_landscape_date_bg.png', className: 'digit-date-overlay'},
				{name: "lblYear2", className: "date digital-year"},
				{kind: 'Image', src: 'images/digital_landscape_date_bg.png', className: 'digit-date-overlay'},
				{name: "lblYear3", className: "date digital-year"},
				{kind: 'Image', src: 'images/digital_landscape_date_bg.png', className: 'digit-date-overlay'},
			]},
		]},
		{flex:1}
	],
	
	
	day: "01",
	month: "JAN",
	year:"2011",
	hour: "12",
	min : "00",
	
		
	create: function ()
	{
		this.inherited(arguments);
		this.log();
		
		this.setupFormat();
		
	},
	
	setupFormat: function ()
	{
		
		this.log();
		
		this.local_weekday_formatter = new enyo.g11n.DateFmt({format: "EEE"});	
	
		var formats = new enyo.g11n.Fmts(); 
		this.local_twelvehour = formats.isAmPm() ;  

		this.local_hour_formatter = new enyo.g11n.DateFmt({format: this.local_twelvehour ? "hh":"HH"});

		this.local_minute_formatter = new enyo.g11n.DateFmt({format: "mm"});
		this.local_ampm_formatter = new enyo.g11n.DateFmt({format: "a"});
	
		this.local_month_formatter = new enyo.g11n.DateFmt({format: "MMM"});
		this.local_day_formatter = new enyo.g11n.DateFmt({format: "dd"});
		this.local_year_formatter = new enyo.g11n.DateFmt({format: "yyyy"});		
	},
	
	tock: function ()
	{
		
		var now = new Date();
		var objDateStrings = {};
		
		
		objDateStrings.strMonth = this.local_month_formatter.format(now)
		objDateStrings.strDay = this.local_day_formatter.format(now)
		objDateStrings.strYear = this.local_year_formatter.format(now)

		objDateStrings.strHour = this.local_hour_formatter.format(now)
		objDateStrings.strMinute = this.local_minute_formatter.format(now)
		objDateStrings.strAMPM = this.local_ampm_formatter.format(now)
		
		this.log(objDateStrings);
		
		this.$.lblHour0.setContent(objDateStrings.strHour[0]);
		this.$.lblHour1.setContent(objDateStrings.strHour[1]);
		
		this.$.lblMinute0.setContent(objDateStrings.strMinute[0]);
		this.$.lblMinute1.setContent(objDateStrings.strMinute[1]);
		
		this.$.lblAMPM.setShowing(this.local_twelvehour);
		this.$.lblAMPM.setContent(objDateStrings.strAMPM);
		
		
		this.$.lblMonth0.setContent(objDateStrings.strMonth[0]);
		this.$.lblMonth1.setContent(objDateStrings.strMonth[1]);
		this.$.lblMonth2.setContent(objDateStrings.strMonth[2]);
	
		this.$.lblDay0.setContent(objDateStrings.strDay[0]);
		this.$.lblDay1.setContent(objDateStrings.strDay[1]);

		this.$.lblYear0.setContent(objDateStrings.strYear[0]);
		this.$.lblYear1.setContent(objDateStrings.strYear[1]);
		this.$.lblYear2.setContent(objDateStrings.strYear[2]);
		this.$.lblYear3.setContent(objDateStrings.strYear[3]);
		
	},
	
	
	setDateDisplay: function ()
	{
		//this.log(this.local_weekday_formatter.format(enyo.application.utilities.now()));
		
		
		/*
		 this.$.lblWeekday.setContent(this.local_weekday_formatter.format(enyo.application.utilities.now()));
		this.$.l/blDay.setContent(this.local_day_formatter.format(enyo.application.utilities.now()));
		*/
	}
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
});
