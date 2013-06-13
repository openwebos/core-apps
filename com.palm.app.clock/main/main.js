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
	name: "ClockMain",
	kind: "Control",
	className: "mainContainer",
	width: "100%",
	height: "100%",
	components: [
		{ name: "appEvent", kind: "ApplicationEvents", onWindowActivated: "windowActivatedHandler", onWindowDeactivated: "windowDeactivatedHandler", onWindowParamsChange: "windowParamsChangeHandler", onUnload: "unloadHandler"},
		{kind: "DashboardManager"},
		{name: "paneApp", kind: "Pane", height: "100%", width: "100%", components: [
			{name: "main", kind: "VFlexBox", height: "100%", width: "100%",  components:[
				{name: "paneMainView", kind: "Pane", transitionKind: "enyo.transitions.Simple", flex : 1, components: [
						{name: "clockContainer", kind: "Control", className: "clockContainer", components: [
							//{name: "clockDefault", kind: "Analog", className: "analog"},
						]},
		
					{kind: "AlarmList", onAlarmsUpdated: "onAlarmsUpdated"}
				]},
				{kind: "Toolbar", components: [
					{kind: "Spacer"},
					{name: "radSelectView", kind: "RadioGroup", onChange: "onChange_radSelectView", components: [
						 {icon: "images/menu-icon-clock.png", style:"width:100%;"},
						 {icon: "images/menu-icon-alarm.png", style:"width:100%;"}
					]},
					{kind: "Spacer"}
			  ]}
			]},
			{kind: "Prefs", onDone: "onDone_prefs", onChangeTheme: "onChangeTheme"}
		]},
		{kind: "AppMenu", components: [
			{caption: $L("Preferences"), onclick: "onclick_prefs"},
			{kind: "HelpMenu", target: "http://help.palm.com/clock/index.html"}
		]}
	],
	
	
	//boolAlarmsUpdated: false,
	
	
	create: function ()
	{
		
		this.inherited(arguments);
		
	},


	ready: function ()
	{
		//this.tick();
		
		this.createClock();
		this.tick();
		this.intervalTick = setInterval(enyo.bind(this, "tick"), 1000);			

	},
	
	
	
	applicationLaunchHandler: function (launchParams)
	{
		this.log();
		this.log("launchParams: ", launchParams);
		
		this.log("enyo.windowParams: ", enyo.windowParams);
		
	},
		
	
	applicationRelaunchHandler: function (launchParams)
	{
		this.log();
		this.log("launchParams: ", launchParams);
		
		this.log("enyo.windowParams: ", enyo.windowParams);
				
	},
	

	
	windowActivatedHandler: function (launchParams)
	{
		this.log();
		try
		{
		
		/*
		this.log("launchParams: ", launchParams);
		
		this.log("enyo.windowParams: " ,enyo.windowParams);
		*/
		
		if(this.clock)
		{
			if(this.clock.setupFormat)
			{
				this.clock.setupFormat();
			}
			
		}
		
		//this.tick();
		
		/*
		if(this.clock)
		{
			this.clock.setBoolShowSeconds(true);
		}
		*/
		/*	

			this.log("setting interval to 1000");
			clearInterval(this.intervalTick);
			this.intervalTick = setInterval(enyo.bind(this, "tick"), 1000);			

		*/
	
		
		enyo.application.showDashboardMethod(false);
		}
		catch(err)
		{
			this.log("error:", err)
		}
		
	},
	
	
	windowDeactivatedHandler: function ()
	{
		this.log();
		//this.$.dashboardManager.getAlarms();
		
		enyo.application.showDashboardMethod(true);

		
		/*
		if(this.clock)
		{
			this.clock.setBoolShowSeconds(false);
		}
		*/
		/*
		try
		{
			this.log("setting interval to 60000");
			clearInterval(this.intervalTick);
			this.intervalTick = setInterval(enyo.bind(this, "tick"), 60000);			
		}
		catch(err)
		{
			this.log("interval error:", err)
		}
		*/
	},

	
	unloadHandler: function ()
	{
	

	},


	
	windowParamsChangeHandler: function()
	{

		this.log("enyo.windowParams: ", enyo.windowParams);
		
		if(enyo.windowParams.action)
		{
			if(enyo.windowParams.action === "edit")
			{
				this.$.radSelectView.setValue(1);
				this.$.paneMainView.selectViewByName("alarmList");
				this.$.alarmList.getAlarms();	
				this.$.alarmList.editAlarm(enyo.windowParams.key)
				enyo.windowParams = {};
			}
			
		}
		
		
	},
	
	
	
	createClock: function ()
	{
		
		this.log(enyo.application.prefs.ClockTheme);
	
		var strClockKind = "Analog";
		
		switch (enyo.application.prefs.ClockTheme)
		{
			
			case "default": case "glass":
				strClockKind = "Analog";
				break;
			
			case "digital":
				strClockKind = "Digital";
				break
			
		}
		
		this.clock = this.$.clockContainer.createComponent({name: "clock", kind: strClockKind, className: enyo.application.prefs.ClockTheme});
		
		this.$.clockContainer.contentChanged();

	},
	
	destroyClock: function ()
	{
		
		this.$.clockContainer.destroyControls();
		//this.clock.destroy();
		
	},
	
	
	tick: function ()
	{
		//this.log("tick baby, tick!");
		if(this.clock && this.clock.tock)
		{
			this.clock.tock();
		}
		/*
		var dateNow = new Date();
		
		if(this.dateLastTick)
		{
			//this.log(( dateNow - this.dateLastTick )/1000," secs since last tick" )
		}
		
		this.dateLastTick = dateNow
		*/
		
	},
	
	onChange_radSelectView: function ()
	{
		
		var intViewIndex = this.$.radSelectView.getValue();
		
		this.log(intViewIndex);
		
		this.$.paneMainView.selectViewByIndex(this.$.radSelectView.getValue());

		if(intViewIndex === 1)
		{
			this.$.alarmList.getAlarms();
		}
	},
	
	onAlarmsUpdated: function ()
	{
		this.log();
		//this.boolAlarmsUpdated = true;
		
	},
	
	
	onclick_prefs: function ()
	{
		this.$.paneApp.selectViewByName("prefs");
		this.$.prefs.getPrefs();
	},
	
	onDone_prefs: function ()
	{
		this.$.paneApp.selectViewByName("main");
		
	},
	
	
	onChangeTheme: function ()
	{
		
		this.destroyClock();
		this.createClock();
		this.tick();

		
	}
	
	
	
});
