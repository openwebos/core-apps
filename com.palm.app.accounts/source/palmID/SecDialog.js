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
    name: "MyApps.PalmID.SecDialog",
    kind: "ModalDialog", lazy: false, 
	caption: $L("Security Question"),
	showKeyboardWhenOpening: true,
    components: [{
        kind: "PalmService",
        name: "setSecurityQuestion",
        service: "palm://com.palm.accountservices/",
        method: "updateChallengeQuestion",
        onSuccess: "setSuccess",
        onFailure: "setFailure"
    }, {
			className: "enyo-paragraph",
            content: $L("Choose a new security question")
    }, {
		kind: "RowGroup",
        caption: $L("SECURITY QUESTION"),
        components: [{
            name: "securityQuestionsSelect",
			id: "securityQuestionsSelect",
            kind: "ListSelector",
			className:"accountsListSelector",
            items: [],
            onChange: "listChange",
        }, ],
    }, {
        kind: "RowGroup",
        caption: $L("ANSWER"),
        components: [{
            name: "answer",
            kind: "Input",
            autoCapitalize: "lowercase", autocorrect: false, spellcheck: false
       }, ],
    }, {
        name: "error",
        content: "",
		className:"enyo-paragraph enyo-text-error"
    }, 
	{kind: "HFlexBox", components:[
		{kind: "Button", caption: $L("Cancel"), flex:1, onclick: "closeIt"},
		{kind: "Button", caption: $L("Update"), flex:1, onclick: "update"}
	]},
	{
        kind: "MyApps.PalmID.CommErrorDialog",
        name: "errorDialog"
    }, 
	{kind: "MyApps.PalmID.SpinnerOverlayPopup", name: "spinnerOverlay"},
	],
    
    initAndOpenAnswerChange: function(questionList, selectedItem, answer){
        this.initAndOpen(questionList, selectedItem, answer, true)
    },
    
    initAndOpen: function(questionList, acctChallengeQuestions){
        this.questionList = questionList;
        this.acctChallengeQuestions = acctChallengeQuestions;
        this.openAtCenter();
    },
	
	prepareOpen: function() {
		var r = this.inherited(arguments);
        this.$.error.setContent(" ");
        
        this.$.securityQuestionsSelect.setItems([]);
        var newItems = [];
        for (var i = 0; i < this.questionList.length; i++) {
            newItems[i] = {
                caption: this.questionList[i].question,
                value: this.questionList[i].id
            };
        }
        this.$.securityQuestionsSelect.setItems(newItems);
		return r;
	},
	afterOpen: function() {
		var r = this.inherited(arguments);
        
		this.initialID = this.acctChallengeQuestions.id;
        this.$.securityQuestionsSelect.setValue(this.acctChallengeQuestions.id);

		enyo.keyboard.show(enyo.keyboard.typeText); 
        //we can't get the answer to show. Differ's from spec.
        //this.$.answer.setValue(answer);
        this.$.answer.setValue("");
        this.$.answer.forceFocus();
		enyo.keyboard.setManualMode(false);
		return r;
	},
	
	closeIt: function(inSender) {
		this.$.securityQuestionsSelect.setValue(this.initialID);
		this.close();	
	}, 
    
    update: function(inSender){
        var util = new PalmIdUtilities();
        
        this.questionId = this.$.securityQuestionsSelect.getValue();
        this.answer = util.trim(this.$.answer.getValue());
        
        if (this.answer.length == 0) {
            this.$.error.setContent($L("Please enter an answer."));
            this.$.error.applyStyle("display", "block");
            this.$.answer.forceFocus();
        } else if (this.answer.length >= 50) {
            this.$.error.setContent($L("Answer must be < 50 characters."));
            this.$.error.applyStyle("display", "block");
            this.$.answer.forceFocus();
        } else {
            this.$.error.setContent(" ");
			this.$.spinnerOverlay.openAtCenter();
            this.$.setSecurityQuestion.call({
                "challengeQuestionId": this.questionId,
                "challengeQuestionAns": this.$.answer.getValue()
            });
        }
    },
    
    setSuccess: function(inSender, inResponse){
		this.$.spinnerOverlay.close();
        var profile = this.owner;
        var questionText = "";
        
        var selId = 0;
        for (var i = 0; i < this.questionList.length; i++) {
            if (this.questionList[i].id == this.questionId) {
                questionText = this.questionList[i].question;
                selId = this.questionList[i].id;
                break;
            }
        }
        
        //should use a callback to set this
        profile.$.secLabel.setContent(enyo.string.escapeHtml(questionText));
        profile.details.acctChallengeQuestions.id = selId;
        profile.details.acctChallengeQuestions.question = questionText;
        this.close();
        
    },
    setFailure: function(inSender, inResponse){
		this.$.spinnerOverlay.close();
        this.$.errorDialog.openAtCenter(inResponse);
    },
    
    
    listChange: function(inSender){
        this.$.answer.setValue("");
        this.$.answer.forceFocus();
        this.$.error.applyStyle("display", "none");
    },


});
