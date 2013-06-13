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
	name: "ClockApp",
	kind: "Component",
	faces:
	{
		winMain:
		{
			windowName: "com.palm.app.clock.main",
			path: "main.html",
			state: "unknown"
		},
		dashAlarm:
		{
			windowName: "com.palm.app.clock.alarmdash",
			path: "dashAlarm/dashAlarm.html",
			state: "unknown"			
		}
	},
	components: [
		
		{ name: "appEvent", kind: "ApplicationEvents", onWindowActivated: "windowActivatedHandler", onWindowDeactivated: "windowDeactivatedHandler", onWindowParamsChange: "windowParamsChangeHandler", onUnload: "unloadHandler"},
		{kind: "Utilities"},
		{kind: "PrefsManager", onGotPrefs: "gotPrefs"},
		{kind: "DashboardManager"}
	],
	
	alarms: {},
	
	/**
	* This method starts the app.
	*/
	
	
	startup: function()
	{
		this.log("3.0.2100");
		enyo.application.showDashboardMethod = enyo.bind(this, "showDashboards");
		
		if(!enyo.application.utilities)
		{
			enyo.application.utilities = this.createComponent({kind: "Utilities"});
		}
		this.log(window);
		var paramString = window.PalmSystem && PalmSystem.launchParams || "{}";
		this.log(paramString);
		this.startParams = JSON.parse(paramString);
	
		if(enyo.application.prefs)
		{
			this.selectLaunch();
		}
		{
			this.loadPrefs();
		}
		
	},
	
	/**
	* This is the callback handler responding to the enyo's application relaunch event.
	*/
	applicationRelaunchHandler: function (params)	
	{
		this.log("params: ", params);
		this.startParams = params;
		
		if(enyo.application.prefs)
		{
			this.selectLaunch();
		}
		{
			this.loadPrefs();
		}
		
	},
	
	
	selectLaunch: function ()
	{
		this.log(this.startParams);
		
		if(this.startParams)
		{
			if(this.startParams.action)
			{
				this.log("action", this.startParams.action);

				switch (this.startParams.action)
				{
					
					case "ring":
						this.activateDashAlarm(this.startParams);
						this.startParams = null;
						return true;						
						break;

					case "update":
						this.log("Ignoring update launch.");
						return false;
						break;
						
					
					
				}
				
			}
		}
		

		this.activateWinMain(this.faces.winMain, this.startParams);	// This handles cases with no launch action or with "edit" action.
		//this.startParams = null;
		return true;
		
	},
	
	
	windowParamsChangeHandler: function ()
	{
		
		this.log(enyo.windowParams);
		if(enyo.windowParams.action)
		{
			if(enyo.windowParams.action === "edit")
			{
				
				this.startParams = enyo.windowParams;
				
				if(enyo.application.prefs)
				{
					this.selectLaunch();
				}
				{
					this.loadPrefs();
				}			
				
				
			}
		}
		
	},
	
	loadPrefs: function ()
	{
		
		this.$.prefsManager.getPrefs();
		
	},
	
	
	gotPrefs: function ()
	{
		this.selectLaunch();
	},
	
	/**
	* Activate a window identified by name.  If the identified window already existed, then the enyo
	* window manager will bring it to focus, otherwise it will be created.
	*
	* @param app is an object containing the relevant parameters to activate a window.  This app
	*            is one of the parameters objects defined by the faces property of this kind.
	*/
	activateWinMain: function (app, startParams)
	{
		this.log("app:",app);
		this.log("startParams:",startParams);
	
		if (!app)
		{
			return;
		}
	
		if (!window.PalmSystem)
		{           // (desktop only): add this extra artifact so that
			window.name = app.windowName;   //          enyo.windows.browserAgent will not hide the window
		}                                   //          hosting our app  
		var allwindows = enyo.windows.getWindows();
		for (var wins in allwindows){
			this.log("Windows Before Activation, NAME: ", wins);
		}
		var path = 	enyo.fetchAppRootPath() + app.path;
	
		this.log("PATH IS ", path);
	
		enyo.windows.activate(app.path,app.windowName, startParams);
	
		allwindows = enyo.windows.getWindows();
		for (var win in allwindows)
		{
			this.log("Windows After Activation, NAME: ", win);
		}
	},
	
	activateDashAlarm: function (params)
	{
		this.log(params.action);
		this.log("key: ", params.key);
		this.log("setTime: ", params.setTime);
		
		
		var objAlarm = this.createComponent({kind: "Alarm", strKey: params.key, strAction: params.action, dateSet: new Date(params.setTime)});
		
	},
	
	showDashboards	: function (boolShowDashboards)
	{
		this.log();
		this.$.dashboardManager.showDashboards(boolShowDashboards);
		
	},
	
	/**
	* A debugging helper method.
	*
	* @return It returns a debugging message.
	*/
	verboseAppContext: function () {
		var desc = "no PalmSystem";
		if (window.PalmSystem) {
			if (window.PalmSystem.launchParams) {
				// available only at relaunch
				// expect { windowType: "dockModeWindow", dockMode: true }
				desc = "PalmSystem.launchParams = "+window.PalmSystem.launchParams;
			}
			else
			{
				desc = "no PalmSystem.launchParams";
			}
		}
		return desc;
	}
	
});
