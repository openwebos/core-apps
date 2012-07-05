// @@@LICENSE
//
//      Copyright (c) 2010-2012 Hewlett-Packard Development Company, L.P.
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
	name: "MyApps.PalmID.DeviceEraseConfirmDialog",
	kind: "ModalDialog",
	lazy: false,
	caption: $L("Erase Device"),
	scrim: true,
	components: [
		{
			kind: "PalmService",
			name: "eraseDevice",
			service: "palm://com.palm.storage/erase/",
			method: "EraseAll", 
            parameters: {},
			onSuccess: "setSuccess",
			onFailure: "setFailure"
		},

		{
			name: "alert_double_conf",
			kind: "Control",
			components: [
				{ content: $L("Erasing this device wipes out all data and it is a permanent action that cannot be reversed. Once the device is erased it will no longer be usable until..."), className:"enyo-paragraph"},
		 		{ kind:"HFlexBox", components:[
					{ kind: "Button", caption: $L("Cancel"), flex:1, onclick: "close" },
					{ kind: "Button", caption: $L("Erase Device"), flex:1, onclick: "eraseDeviceDoubleConf" }
				]},
			]
		},
		
		{
			name: "alert_erase",
			kind: "ModalDialog", 
			caption: $L("Erase Device"),
			scrim: true,
			
			components: [
				{ content: $L("Are you really sure? You cannot undo this operation."), className:"enyo-paragraph"},
				{ kind:"HFlexBox", components:[
					{ kind: "Button", caption: $L("Cancel"), flex:1, onclick: "close_alert_erase" },
		 			{ kind: "Button", caption: $L("Erase Device"), flex:1, onclick: "eraseDevice" }
				]},
			]

		},
		
		{kind: "MyApps.PalmID.CommErrorDialog", name: "errorDialog"},
		{kind: "MyApps.PalmID.SpinnerOverlayPopup", name: "spinnerOverlay"},
	],
	
	setDevice: function(deviceId) {
		this.deviceID = deviceId;
	},
	
	eraseDeviceDoubleConf: function() {
		this.close();
		this.$.alert_erase.openAtCenter();
		
	},
	
	eraseDevice: function()
	{
		console.log('**************** ERASE ALL ***************');
		this.$.spinnerOverlay.openAtCenter();
		this.$.eraseDevice.call();
	},
	
	close_alert_erase: function() {
   		this.$.alert_erase.close();
	},
	
	setSuccess: function(result) {
		console.log("**************** DEVICE ERASE SUCCESS *************************")
  		this.$.spinnerOverlay.close();
   		this.$.alert_erase.close();
	},
	
	setFailure: function(result){
		console.log("**************** DEVICE ERASE FAILURE *************************")
 		this.$.spinnerOverlay.close();
		this.$.errorDialog.openAtCenter(inResponse);
	},
});


