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
	kind: "ModalDialog", lazy: false, name: "MyApps.PalmID.CommErrorDialog", 
	scrim: true,
	components: [
		{ name: "errorDialogText", className: "enyo-paragraph", content: "dummydummydummydummy"},
		{kind:"HFlexBox", components:[
			{ kind: "Button", caption: $L("Done"), flex:1, onclick: "close"},
			{ name: "helpButton", kind: "Button", caption: $L("Help"), flex:1, onclick: "help",  style: "display: none"}
		]},
		],
		

	openAtCenter: function(error, helpCallback) {
		var heading = $L("Error");
		var msg = PALMIDUTILS_ERROR_CODES["-9999"]; // the default if it is unknown
		if (error && error.errorCode) {
			var errorText = PALMIDUTILS_ERROR_CODES[error.errorCode];
			if (errorText) {
				msg  = enyo.string.escapeHtml(errorText);	
			} else {
			    heading = $L("Network Error");
			}
		}
		
		if (error && error.errorCode) {
			var errorHeadingText = PALMIDUTILS_ERROR_HEADING_CODES[error.errorCode]
			if (errorHeadingText) {
				heading  = enyo.string.escapeHtml(errorHeadingText);	
			}
		}
		
		if (helpCallback) {
			this.$.helpButton.applyStyle("display", "block");	
			this.helpCallback = helpCallback;
		} else {
			this.$.helpButton.applyStyle("display", "none");	
		}
		
		console.log("error:" + enyo.json.stringify(error));
		this.$.errorDialogText.setContent(msg);
		this.setCaption(heading);
		this.inherited(arguments);
	},
	
	help: function() {
		this.helpCallback();	
	}

});


	
