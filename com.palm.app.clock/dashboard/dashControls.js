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
	name: "DashControlsApp",
	kind: "HFlexBox",
	align:"center",
	className: "music-notification",
	components: [
		{ name: "appEvent", kind: "ApplicationEvents", onWindowParamsChange: "windowParamsChangeHandler"},
		{kind: "Control", flex:1, className: "info", components: [
			{name: "lblSongTitle", content: $L("Song"), className: "title"},
			{name: "lblArtistName", content: $L("Artist"), className: "artist"}
		]},
		{kind: "Control", className: "playback-controls", layoutKind: "HFlexLayout", pack: "start", align: "center", components: [
			{name: "btnPrev", kind: "IconButton", className: "prev", icon:"images/btn_dashboard_prev.png", onclick: "onclick_prev"}, // This needs to be changed to switch icons like btnPlay
			{name: "btnPlay", kind: "IconButton", className: "play paused", icon:"images/btn_dashboard_play.png", label: " ", onclick: "onclick_playpause"},
			{name: "btnNext", kind: "IconButton", className: "next", icon:"images/btn_dashboard_next.png", onclick: "onclick_next"} // This needs to be changed to switch icons like btnPlay
		]}
			
	],
	
	create: function ()
	{
		this.inherited(arguments);
		this.log();
	
	},
	
	windowParamsChangeHandler: function()
	{
		this.log(enyo.windowParams.objTrackInfo);
		if(enyo.windowParams.objTrackInfo)
		{
			this.updateTrackInfoDisplay(enyo.windowParams.objTrackInfo)
		}
		
		if(enyo.windowParams.boolAudioPlaying !== undefined)
		{
			this.setPlayPause(enyo.windowParams.boolAudioPlaying);
		}		
		
		
	},
	
	updateTrackInfoDisplay: function(objTrackInfo)
	{
			
			this.log();
			this.$.lblSongTitle.setContent(objTrackInfo.strTrackTitle);
			this.$.lblArtistName.setContent(objTrackInfo.strTrackArtist);
	
		
	},
	
	
	setPlayPause: function (boolAudioPlaying)
	{
		
		this.log(boolAudioPlaying);
		
		this.$.btnPlay.addRemoveClass("paused", !boolAudioPlaying);
		//this.$.btnPlay.srcChanged();
		
	},
	
	
	
	onclick_prev: function (sender, event)
	{
		this.log();
		this.sendCommand("prev");
		
		
	},
	
	
	onclick_playpause: function (sender, event)
	{
		this.log();
		this.sendCommand("playpause");
	},
	
	
	onclick_next: function (sender, event)
	{
		this.log();
		this.sendCommand("next");
	},
	
	
	sendCommand: function (cmdType)
	{
		this.log();
		//var winRoot = enyo.windows.getRootWindow();
		var winRoot = enyo.windows.fetchWindow("com.palm.app.musicplayer");
		if(winRoot)
		{
			enyo.windows.setWindowParams(winRoot, {cmdType: cmdType });
		}
	}
	
	
	
});
