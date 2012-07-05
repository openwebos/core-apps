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
    name: "MyApps.PalmID.EmailDialog",
    kind: "ModalDialog", lazy: false, 
	caption: $L("Email"),
	showKeyboardWhenOpening: true,
    components: [{
        kind: "PalmService",
        name: "setEmailAddress",
        service: "palm://com.palm.accountservices/",
        method: "changeEmail",
        onSuccess: "setSuccess",
        onFailure: "setFailure"
    }, {
			className: "enyo-paragraph",
            content: $L("Enter a new email address")
    }, {
        components: [{
            kind: "RowGroup",
            caption: $L("EMAIL"),
            components: [{
                name: "email",
                kind: "Input",
 				onfocus: "setEmailKeyboard",
               inputType: "email",
				autoCapitalize: "lowercase", autocorrect: false, autocomplete: false, spellcheck: false
            }, ],
        }],
    }, {
        name: "emailError1",
        content: "",
        className: "enyo-paragraph enyo-text-error",
        showing: false
    }, {
        kind: "RowGroup",
        caption: $L("VERIFY EMAIL"),
        components: [{
            name: "emailConfirm",
            kind: "Input",
			onfocus: "setEmailKeyboard",
            inputType: "email",
			autoCapitalize: "lowercase", autocorrect: false, autocomplete: false, spellcheck: false
			 }, ],
    }, {
        name: "emailError2",
        content: "",
        className: "enyo-paragraph enyo-text-error",
        showing: false
    },
	{ kind:"HFlexBox", components:[
		{kind: "Button", caption: $L("Cancel"), flex:1, onclick: "close" },
        {kind: "Button", caption: $L("Update"), flex:1, onclick: "update"}
	]},
    {
        kind: "ModalDialog", lazy: false, 
        name: "verifyEmailDialog",
		caption: $L("Verify Email"),
        dismissWithClick: false,
        modal: true,
        components: [{
            name: "verifyText",
			className: "enyo-paragraph text-breakword",
            content: "dummy"
        }, {
            kind: "Button",
            caption: $L("Done"),
            onclick: "closeVerifyEmailDialog"
        }, ],
        scrim: true,
    }, {
        kind: "MyApps.PalmID.CommErrorDialog",
        name: "errorDialog"
    }, 
	{kind: "MyApps.PalmID.SpinnerOverlayPopup", name: "spinnerOverlay"},

	],
    
    openThisDialog: function(parms){
		this.sentCallback = parms.sentCallback;
		this.defaultEmail = parms.defaultEmail;

        
        this.openAtCenter();
    },
 
 	prepareOpen: function() {
		var r = this.inherited(arguments);
        this.$.emailError1.setShowing(false);
        this.$.emailError2.setShowing(false);
        this.$.email.setValue(this.defaultEmail);
        this.$.emailConfirm.setValue("");
		return r;
	},
	afterOpen: function() {
		var r = this.inherited(arguments);
        this.$.email.forceSelect();
		return r;
	},
	close: function() {
		var r = this.inherited(arguments);
		enyo.keyboard.hide();
		enyo.keyboard.setManualMode(false);
		return r;
	},
	
	setEmailKeyboard: function() {
		enyo.keyboard.show(enyo.keyboard.typeEmail);
	},


   
    update: function(){
        var util = new PalmIdUtilities();
        
        var profile = this.owner;
        var email = util.trim(this.$.email.value.toLowerCase());
        var emailConfirm = util.trim(this.$.emailConfirm.value.toLowerCase());
        this.email = email;
        
        this.$.emailError1.setShowing(false);
        this.$.emailError2.setShowing(false);
        if (email.length == 0) {
            this.$.emailError1.setContent($L("Please enter an email address."));
            this.$.emailError1.setShowing(true);
            this.$.email.forceFocus();
        }
        else 
            if (!util.isValidEmail(email)) {
                this.$.emailError1.setContent($L("Please enter a valid email address."));
                this.$.emailError1.setShowing(true);
				if (this.$.email.value.length) {
                	this.$.email.forceSelect();
				} else {
                	this.$.email.forceFocus();
				}
            }
            else 
                if (emailConfirm.length == 0) {
                    this.$.emailError2.setContent($L("Please confirm your address."));
                    this.$.emailError2.setShowing(true);
                    this.$.emailConfirm.forceFocus();
                }
                else 
                    if (email != emailConfirm) {
                        this.$.emailError2.setContent($L("Email addresses do not match."));
                        this.$.emailError2.setShowing(true);
                    }
                    else 
                        if (email != profile.email) {
 							this.$.spinnerOverlay.openAtCenter();
                            this.$.setEmailAddress.call({
                                email: email
                            });
                        }
                        else {
                            this.close();
                        };
            },
    
    setSuccess: function(inSender, inResponse){
 		this.$.spinnerOverlay.close();
        this.close();
        
		this.sentCallback();

        var template = new enyo.g11n.Template($L("Please respond to the verification email sent to #{email} from Palm_Inc@email.palmnewsletters.com. The new email address will not be updated until it has been verified."));
        this.$.verifyText.setContent(template.evaluate({
            email: enyo.string.escapeHtml(this.email)
        }));
        this.$.verifyEmailDialog.openAtCenter();
        
        //should use a callback here()
        var profile = this.owner;
        profile.email = this.email;
        
    },
    
    setFailure: function(inSender, inResponse){
		this.$.spinnerOverlay.close();
		if (inResponse && inResponse.errorCode == "PAMS9998") {
        	this.$.errorDialog.openAtCenter(inResponse, enyo.bind(this, this.helpCallback));
		} else {
        	this.$.errorDialog.openAtCenter(inResponse);
		}
    },
    
    closeVerifyEmailDialog: function(){
        this.$.verifyEmailDialog.close();
    },
	
	helpCallback: function() {
        this.$.errorDialog.close();
        this.$.errorDialog.openAtCenter({errorCode: "ACCCOUNT_EXPANDED_INVALIDEMAIL"});
	}


});
