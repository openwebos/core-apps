// @@@LICENSE
//
//      Copyright (c) 2010-2013 LG Electronics, Inc.
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
	name: "MyApps.PalmID.DeviceInfoDialog",
	kind: "ModalDialog", lazy: false, 
	caption: $L("Device Info"),
	scrim: true,
	dismissWithClick: true,
	modal: true,
	components: [
		{
			name: "mainAlert",
			kind: "Control",
			components: [
				{kind: "RowGroup",
				 name: "deviceInfoRowGroup",
				 caption: "DEVICE INFO", // this will never show...hence not localized.
				 components: [
					{
					kind: "enyo.HFlexBox", 
					components: [ 
						{ 
							content: $L("Name"), 
							className:"enyo-label",
							style: "padding-right:30px"
						},
						{
							name: "deviceName",
							className:"enyo-text-ellipsis",
							style:"text-align:right",
							flex: 1,
						  	components: []
						}
						]
					},
					{
					kind: "enyo.HFlexBox", 
					components: [ 
							{ 
								content: $L("Model"), 
								className:"enyo-label",
								style: "padding-right:30px"
							},
							{
								name: "deviceModel",
								className:"enyo-text-ellipsis",
								style:"text-align:right",
								flex: 1,
							  	components: []
							}
						]
					},
					{
					kind: "enyo.HFlexBox", 
					components: [ 
							{ 
								content: $L("Version"),
								className:"enyo-label",
								style: "padding-right:30px"
							},
							{
								name: "deviceSoftware",
								className:"enyo-text-ellipsis",
								style:"text-align:right",
								flex: 1,
							  	components: []
							}
						]
					},
					]
				},	
		 		{ name: "eraseOption", style: "display: none", kind: "Button", caption: $L("Erase Device"), onclick: "doubleConfirm" },
				{ kind: "Button", caption: $L("Done"), onclick: "close" },
				
				
				{
					name: "deviceEraseConfirmDialog",
					kind: "MyApps.PalmID.DeviceEraseConfirmDialog",
				}

			]
		}
	],
	
	setDevice: function(settings) {
		this.deviceID = settings.device.nudid;
		
		/*
		if (!settings.thisDevice) {
			this.$.eraseOption.applyStyle("display","none");	
		} else {
			this.$.eraseOption.applyStyle("display","block");	
		}
		*/
		
		this.$.deviceInfoRowGroup.setCaption(enyo.string.escapeHtml(settings.device.deviceType));
		this.$.deviceName.setContent(enyo.string.escapeHtml(settings.device.deviceName));
		this.$.deviceModel.setContent(enyo.string.escapeHtml(settings.device.deviceModel));
		this.$.deviceSoftware.setContent(enyo.string.escapeHtml(settings.device.webOSDisplayName));
	},
	
	doubleConfirm: function()
	{
		this.$.deviceEraseConfirmDialog.setDevice(this.deviceId);
		this.$.deviceEraseConfirmDialog.openAtCenter();
    	this.close();
	}

});
