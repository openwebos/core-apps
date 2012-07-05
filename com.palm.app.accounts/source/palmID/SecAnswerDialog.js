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
	name: "MyApps.PalmID.SecAnswerDialog",
	kind: "ModalDialog", lazy: false, 
	caption: $L("Answer"),
	scrim: true,
	dismissWithClick: false,
	modal: true,
	components: [
		{
			kind: "PalmService",
			name: "setSecurityQuestion",
			service: "palm://com.palm.accountservices/",
			method: "updateChallengeQuestion", 
			onSuccess: "setSuccess",
			onFailure: "setFailure"
		},
		
		{ name: "secDialogText"},
		{
			kind: "RowGroup", 
			caption: $L("ANSWER"),
			components: [
				{ name: "answer", kind: "Input" },
			],
		},

		{ name: "error", style:"display: none;", className:"enyo-paragraph enyo-text-error"},
		{kind:"HFlexBox", components:[
			{ kind: "Button", caption: $L("Cancel"), flex:1, onclick: "close" },
			{ kind: "Button", caption: $L("Update"), flex:1, onclick: "update" }
		]},
		{kind: "MyApps.PalmID.CommErrorDialog", name: "errorDialog"},
		{kind: "MyApps.PalmID.SpinnerOverlayPopup", name: "spinnerOverlay"},
	],

	initAndOpen: function(acctChallengeQuestions, answer) {
		this.acctChallengeQuestions = acctChallengeQuestions;
		
		this.$.error.applyStyle("display", "none");
		this.$.secDialogText.setContent($L("Choose a new answer to your security question:\n") + enyo.string.escapeHtml(this.acctChallengeQuestions.question));
		//this.$.answer.setValue(answer); -- currently we can't show the existing answer.
		
		this.openAtCenter();
		
		this.$.answer.forceFocus();

	},
	update: function(inSender) {
		var util = new PalmIdUtilities(); 

		var question = this.acctChallengeQuestions.question;
		var answer = util.trim(this.$.answer.getValue());
		this.answer = answer;
		
		if (answer.length == 0) {
			this.$.error.setContent($L("Please enter an answer."));
			this.$.error.applyStyle("display", "block");
			this.$.answer.forceFocus();
		} else {
			this.$.spinnerOverlay.openAtCenter();
			this.$.setSecurityQuestion.call(
				{"challengeQuestionId": this.acctChallengeQuestions.id, "challengeQuestionAns": this.$.answer.getValue()}
			);
		}
		
	},
	
	setSuccess: function() {
		this.$.spinnerOverlay.close();
    	this.close();
		
	},
	setFailure: function(inSender, inResponse){
		this.$.spinnerOverlay.close();
		this.$.errorDialog.openAtCenter(inResponse);
	},

	listChange : function(inSender) {
		this.$.answer.setValue("");
		this.$.answer.forceFocus();
		this.$.error.applyStyle("display", "none");
	},


});
