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
	name: "PrefsManager",
	kind: "Component",
	events: {onPrefInserted: "", onPrefUpdated: "", onPrefDeleted: "", onGotPrefs: ""},
	components: [

		{kind: "DbService", dbKind: "com.palm.clock.prefs:1" , onFailure: "onFailure_dbsPrefs", components: [
			{ name: "dbsGetPrefs", method: "find", onSuccess: "gotPrefs"},
			{ name: "dbsPutPrefs", method: "put", onSuccess: "onSuccess_PutPrefs"},
			{ name: "dbsUpdatePrefs", method: "merge", onSuccess: "onSuccess_updatePref"},
			{ name: "dbsDelPrefs", method: "del", onSuccess: "onSuccess_deletePref"}
		]}
		
	],
		
	create: function ()
	{
		this.inherited(arguments);
	},	
	
	requestPrefs: function (objGetPrefsRequest)
	{
		this.log();

		this.getPrefs(objGetPrefsRequest);
		
	},
	
  getPrefs: function (objGetPrefsRequest)
    {
		this.log("****");

		try
		{

			var req = this.$.dbsGetPrefs.call({watch: false, query: {}, subscribe: false},{});
			
			this.log("**** called Prefs query");
		}
		catch(err)
		{
			this.log(err);
		}
    },
	 
	 
	gotPrefs: function (inSender, inResponse, inRequest)
	{
		this.log();
				
		if(inResponse.results)
		{
			if(inResponse.results.length > 0)
			{	
				this.log(inResponse.results.length);
				enyo.application.prefs = inResponse.results[0];
				this.doGotPrefs();
				return true;
			}	
		}
		
		enyo.application.prefs = this.createBlankPref();
		this.insertPref();
		return true;
	},
	
	
	objBlankPref: {
		_kind:"com.palm.clock.prefs:1",
		RingerSwitchOff: "play",
		AscendingVolume: false,
		SnoozeDuration: 10,
		ClockTheme: "default"	
	},
	
	
	createBlankPref: function ()
	{
		var objNewPref = enyo.clone(this.objBlankPref);
		objNewPref.key = this.kStrKeyBase + (new Date().valueOf());
		return objNewPref;
		
	},
	
	
	insertPref: function ()
	{
		this.log();
		if(enyo.application.prefs)
		{
			this.$.dbsPutPrefs.call({objects: [enyo.application.prefs]});
		}
	},
	
	
	onSuccess_PutPrefs: function (sender, response)
	{
		this.log(response);
		this.doPrefInserted();
		this.doGotPrefs();
	},
	
	
	updatePref: function ()
	{
		this.log();
		if(enyo.application.prefs)
		{
			this.$.dbsUpdatePrefs.call({objects: [enyo.application.prefs]});
		}		
	
	},
	
	onSuccess_updatePref: function (sender, response)
	{
		this.log(response);
		this.doPrefUpdated();
	},
	
	/*
	deletePref: function (idDeletePref)
	{
		if(idDeletePref !== undefined)
		{
					
			var req = this.$.dbsDelPrefs.call({ids: [idDeletePref]});
		}		
		
	},
	
	onSuccess_deletePref: function (sender, response)
	{
		this.log(response);
		this.doPrefDeleted();
	},	
	*/	
	onFailure_dbsPrefs: function (sender, response)
	{
		
		this.log("****");
		this.log(sender);
		this.log(response);
		
	},
	

}
);
