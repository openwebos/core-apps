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
    name: "MyApps.PalmID.PasswordRecoverDialog",
    kind: "ModalDialog", lazy: false, 
	caption: $L("Recover Password"),
    scrim: true,
    dismissWithClick: false,
    modal: true,
    components: [{
        kind: "PalmService",
        name: "checkSecurityQuestionAnswer",
        service: "palm://com.palm.accountservices/",
        method: "authenticateAccountFromSecurityQuestion",
        onSuccess: "setSuccess",
        onFailure: "setFailure"
    }, {
        kind: "PalmService",
        name: "sendRecoverEmail",
        service: "palm://com.palm.accountservices/",
        method: "requestPasswordResetEmail",
        onSuccess: "setSendRecoverEmailSuccess",
        onFailure: "setSendRecoverEmailFailure"
    }, {
        name: "secDialogText",
		className:"enyo-paragraph",
        content: $L("Answer your security question to reset your password.")
    }, {
        name: "questionText",
        content: ""
    }, {
        kind: "RowGroup",
        caption: $L("ANSWER"),
        components: [{
            name: "answer",
            kind: "Input",
			onfocus: "SetKeyboard", 
			autoCapitalize: "lowercase", autocorrect: false, spellcheck: false
        }, ],
    }, {
        name: "error",
        content: "", 
		className: "enyo-paragraph enyo-text-error", 
		showing: false
    }, {
        kind: "Button",
        caption: $L("Next"),
        className: "enyo-button-dark",
        onclick: "update"
    }, {
        kind: "Button",
        caption: $L("Forgot Answer"),
        onclick: "callRecoverEmail"
    },
	{
        kind: "Button",
        caption: $L("Cancel"),
        onclick: "cancel"
    }, 
	{
        kind: "ModalDialog", lazy: false, 
        name: "recoverDialog",
		caption: $L("Recover Password"),
        dismissWithClick: false,
        modal: true,
        components: [{
			className: "enyo-paragraph",
            name: "recoverText",
			allowHtml: true,
            content: ""
        }, {
            kind: "Button",
            caption: $L("Close"),
            onclick: "closeRecoverDialog"
        }, ],
        scrim: true,
    }, {
        kind: "MyApps.PalmID.CommErrorDialog",
        name: "errorDialog"
    }, 
	{kind: "MyApps.PalmID.SpinnerOverlayPopup", name: "spinnerOverlay"},
	],

	SetKeyboard: function() {
		enyo.keyboard.show(1);
	},
	    
    initAndOpen: function(challengeQuestion, email, loginSuccess, loginCancel, loginDone){
        this.loginSuccess = loginSuccess;
        this.loginCancel = loginCancel;
        this.loginDone = loginDone;
		
        this.email = email;
        this.$.error.setShowing(false);
        this.$.questionText.setContent(enyo.string.escapeHtml(challengeQuestion.question));
        this.questionId = challengeQuestion.id;
        this.$.answer.setValue("");
		this.autoRecover = false;
        
        this.openAtCenter();
        
        this.$.answer.forceFocus();
        
    },
    
    update: function(inSender){
        var util = new PalmIdUtilities();
        
        var answer = util.trim(this.$.answer.getValue());
        this.answer = answer;
        
        if (answer.length == 0) {
            this.$.answer.setValue("");
            this.$.answer.forceFocus("");
        } else {
 		   this.$.spinnerOverlay.openAtCenter();
           this.$.checkSecurityQuestionAnswer.call({
                "email": this.email,
                "questionId": this.questionId,
                "response": this.$.answer.getValue()
            });
        }
    },
    
    setSuccess: function(inSender, inResponse){
		this.$.spinnerOverlay.close();
        this.close();
        this.owner.$.passwdDialog.openThisDialog(true, this.loginSuccess, this.loginCancel);
    },
    setFailure: function(inSender, inResponse){
		this.$.spinnerOverlay.close();
		var errorText = (inResponse.errorText) ? inResponse.errorText : undefined;
		errorText = (inResponse.errorCode) ? PALMIDUTILS_ERROR_CODES[inResponse.errorCode] : errorText;

		if(inResponse.errorCode == "PAMS1101"){
			console.info("Account locked, send email and finish");
			this.$.error.setShowing(false);
			this.callRecoverEmail();
		} else if (errorText && inResponse.errorCode != "-9999"){
			this.$.error.setContent(enyo.string.escapeHtml(errorText));
			this.$.error.setShowing(true);
			this.$.answer.forceSelect();
		} else {
			this.$.error.setShowing(false);
			this.$.errorDialog.openAtCenter(inResponse);
		}
    },
    
    callRecoverEmail: function(){
 		this.$.spinnerOverlay.openAtCenter();
        this.$.sendRecoverEmail.call({
            email: this.email
        });
    },
    
    setSendRecoverEmailSuccess: function(inSender, inResponse){
		this.$.spinnerOverlay.close();
        this.close();
        var template = new enyo.g11n.Template($L("We sent an email to #{email}. If you don't receive the email shortly check your junk email folder.<P>Follow the link in that email to reset your password.<P>If you are unable to reset your password, visit http://hpwebos.com/support for more help."));
        this.$.recoverText.setContent(template.evaluate({
            email: enyo.string.escapeHtml(this.email)
        }));
        this.$.recoverDialog.openAtCenter();
    },
    
    closeRecoverDialog: function(){
        this.$.recoverDialog.close();
        if (this.loginDone) {
			this.loginDone();
		} else {
				this.loginCancel()
		};
    },
    
    setSendRecoverEmailFailure: function(inSender, inResponse){
		this.$.spinnerOverlay.close();
        this.$.errorDialog.openAtCenter(inResponse);
    },
    
    cancel: function(){
        this.close();
        this.loginCancel();
    }
    
});
