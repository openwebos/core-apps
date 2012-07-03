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
	name: "AudioManager",
	kind: "Component",
	
	
	//boolAudioSetup: false, May not end up using
	
	published: {boolAudioPaused: true, boolAudioPlaying: false, boolLoop: true},
	
	events: {onPlaying: "", onEnded: "", onPausePlay: "", onSrcChanged: "", onAudioError: "", onAudioStall: "", onAudioConnected:""},
	
	create: function ()
	{
		this.inherited(arguments);

		this.setupAudio();
		
		
	
	},
	
	_boolAudioLoaded: false,
	
	
	setupAudio: function ()
	{
		this.log();			
		if (this.objAudio === undefined)
		{
			this.objAudio = new Audio();
			//this.objAudio.loop = "loop";
			this.objAudio.setAttribute("x-palm-media-audio-class", "alarm");
			
			this.objAudio.addEventListener('load', enyo.bind(this, this.onAudioLoaded), false);
			this.objAudio.addEventListener('play', enyo.bind(this, this.onAudioPlayed), false);
			this.objAudio.addEventListener('playing', enyo.bind(this, this.onAudioPlaying), false);
			this.objAudio.addEventListener('ended', enyo.bind(this, this.onAudioEnded), false);
			this.objAudio.addEventListener('pause', enyo.bind(this, this.onAudioPaused), false);
			this.objAudio.addEventListener('connected', enyo.bind(this, this.doAudioConnect), false);
			
			this.objAudio.addEventListener('error', enyo.bind(this, this.onError_Play), false);
			this.objAudio.addEventListener('stalled', enyo.bind(this, this.onError_Stall), false);
			
		}		
		
	},
	
	resetAudio: function ()
	{
		
	},
	
		

	
	playAudio: function (strAudioFile, intStartTime, boolForced)
	{
		try
		{
			this.log("playing: ", strAudioFile);
			this.objAudio.src = strAudioFile;
			
			this.doSrcChanged(boolForced);
			
			//this.log("raised doSrcChanged");
			
			
			this.objAudio.load();
			this.objAudio.play();			
		}
		catch (err)
		{
			this.log("playAudio error: ", err);
		}
		
		
	},

	pauseAudio: function (boolPlayPause)
	{
		
		if(boolPlayPause === undefined)
		{
			boolPlayPause = !this.boolAudioPlaying;
		}

		this.log(boolPlayPause);

		if (!boolPlayPause)
		{
			this.objAudio.pause();
			this.boolAudioPlaying = false;
		}
		else
		{
			this.objAudio.play();
			this.boolAudioPlaying = true;
		}
		
		return this.boolAudioPlaying;
		

		
	},
	
	onAudioConnected: function (event)
	{
		
	},
	
	onAudioLoaded: function (event)
	{
		this.log();	
	},
	
	onAudioPlayed: function (event)
	{
		this.log();
	},
	
	onAudioPlaying: function (event)
	{
		this.log();
		this.boolAudioPlaying = true;
		this.boolAudioPaused = false;
		this.doPausePlay(this.boolAudioPlaying);
		this.doPlaying();
		//this.doSrcChanged(); //moved back to playAudio as a test. May move it back
		
	},
	
	onAudioPaused: function (event)
	{
		this.log();
		this.boolAudioPlaying = false;
		this.boolAudioPaused = true;		
		this.doPausePlay(this.boolAudioPlaying);
	},
	
	onAudioEnded: function (event)
	{
		this.log();
		this.doEnded();
		
		if (this.boolLoop)
		{
			this.log("looping");
			this.objAudio.load();
			this.objAudio.play();
		}
	
	},
	
	setAudioTime: function(intPos)
	{
		this.log("intPos: ", intPos);
		this.log("src: ", this.objAudio.src);
		
		if (this.objAudio.src)
		{
			this.objAudio.currentTime = this.getAudioDuration() * (intPos / 100);
		}
		
	},
	
	setAudioVolume: function(intPos)
	{
		this.objAudio.volume = intPos/100;
	},
	
	getAudioVolume: function()
	{
		return this.objAudio.volume;
	},		
	
	/*
	onAudioSrcChanged: function (event)
	{
		
		
	},
	*/
	
	
	onError_Play: function (event)
	{
		this.log(event);
		this.doAudioError(event);
	},
	
	onError_Stall: function (event)
	{
		this.log();
		//this.log(Object.keys(event));
		this.doAudioError(event);
	},
	
	onError_Disconnect: function (event)
	{
		this.doAudioError(event);
	},
	
	onError_Watchdog: function (event)
	{
		this.doAudioError(event);		
	},
	
	getAudioCurrentTime: function ()
	{
		return this.objAudio.currentTime;
	},
	
	getAudioDuration: function()
	{
		
		return this.objAudio.duration;
	}
	
	
	
});