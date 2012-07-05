// LICENSE@@@
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
// @@@LICENSE

console.log("||||||||>> Browser mode detected. Importing Contacts mock data & mock libs <<||||||||");
console.log("||||||||>> Browser mode is for production design purposes only. <<|||||||||");
console.log("||||||||>> The app will (most likely) not have full functionality. <<|||||||||");
console.log("||||||||>> There are no current plans to support functionality in browser<<|||||||||");

//----FUTURE
future = function () {
};

future.prototype.now = function (scope, funcName) {
    if (!funcName) {
        funcName = scope;
        scope = this;
    }
    return funcName.apply(scope, [this]);
};

future.prototype.then = future.prototype.now;
//----END FUTURE


AccountsList = {
    getAccountIcon   : function () {
        return ContactsLib._accountImages[Math.floor(Math.random() * ContactsLib._accountImages.length)]; //random account image from ContactsLib._accountImages array
    },
    getAccount       : function () {
        return {
            templateId: "UROD"
        }
    },
    isContactReadOnly: function (contact) {
        return false;
    }
};

_ = {
    detect: function (contacts, func) {
        return contacts[0];
    }
};

//----CONTACTS LIB with PERSON static defn

ContactsLib = (function CreateContactsLib() {
    _accountImages = [
        "mock/gmail-32x32.png",
        "mock/eas-32x32.png",
        "mock/yahoo-32x32.png",
        "mock/mypalm-32x32.png"
    ];
    var Relation = {
        getType        : function () {
            return ContactsLib.Relation.TYPE.SPOUSE;
        },
        getDisplayValue: function () {
            return this.value;
        },
        getValue       : function () {
            return this.value;
        },
        TYPE           : {
            SPOUSE: "spouse",
            CHILD : "child"
        }
    };

    var Person = {
        generateDisplayNameFromRawPerson   : function (inPerson) {
            return inPerson.name.givenName + " " + inPerson.name.familyName;
        },
        getDisplayablePersonAndContactsById: function (personId) {
            var myFuture = new future();
            myFuture.result = ObjectUtils.clone(GetDisplayablePersonAndContactsByIdMockData [personId]);
            myFuture.result = ObjectUtils.extend(myFuture.result, ContactsLib.Person);
            myFuture.result = ObjectUtils.extend(myFuture.result, MockPersonMap[personId]);
            this._id = myFuture.result._id;
            return myFuture;
        },
        getId                              : function () {
            return this._id;
        },
        getContacts                        : function () {
            var contacts = [];
            for (var i = 0; i < this.contactCount; i++) {
                contacts.push({
                    displayName : (this.name.familyName || this.name.givenName) ? this.name.givenName + " " + this.name.familyName : "==NOFIRSTNAME, NOLASTNAME==",
                    fullName    : (this.name.familyName || this.name.givenName) ? this.name.givenName + " " + this.name.familyName : "==NOFIRSTNAME, NOLASTNAME==",
                    organization: this.organization,
                    emails      : this.emails,
                    birthday    : this.birthday,
                    phoneNumbers: this.phoneNumbers,
                    ims         : this.ims,
                    addresses   : this.addresses,
                    urls        : this.urls,
                    note        : (this.notes && this.notes[0]) || "",
                    nickname    : this.nickname,
                    relations   : this.relations,
                    photoPath   : this.photos.squarePhotoPath
                });
                contacts[i] = ObjectUtils.extend(contacts[i], ContactsLib.Contact);
            };

            return contacts;
        },
        getContactIds                      : function () {
            return {
                getArray: function () {
                    var id = {value: "CONTACT-ID"};

                    return [
                        ObjectUtils.extend(id, Email)
                    ];
                }
            };

        },
        getNickname                        : function () {
            var that = this;
            return {
                getDisplayValue: function () {
                    if (that.names) {
                        return (that.names[0] && that.names[0].nickname || "");
                    } else {
                        return that.nickname;
                    }
                }
            };
        },
        getBirthday                        : function () {
            var that = this;
            return {
                getDisplayValue: function () {
                    return that.birthday;
                }
            };
        },
        getRelations                       : function () {
            var that = this;
            return {
                getArray: function () {
                    if (that.relations) {
                        var relations = [];
                        for (var i = 0; i < that.relations.length; i++) {
                            relations.push(ObjectUtils.extend(relations[i], ContactsLib.Relation));
                        }
                        return relations;
                    } else {
                        return [];
                    }
                }
            };
        },
        getEmails                          : function () {
            var that = this;
            return {
                getArray: function () {
                    var emails = [];
                    for (var i = 0; i < that.emails.length; i++) {
                        emails.push(ObjectUtils.extend(that.emails[i], ContactsLib.Email));
                    }
                    return emails;
                }
            };
        },
        getPhoneNumbers                    : function () {
            var that = this;
            return {
                getArray: function () {
                    return that.phoneNumbers;
                }
            };
        },
        getIms                             : function () {
            var that = this;
            return {
                getArray: function () {
                    var ims = [];
                    for (var i = 0; i < that.ims.length; i++) {
                        ims.push(ObjectUtils.extend(that.ims[i], ContactsLib.IMAddress));
                    }
                    return ims;
                }
            };
        },
        getAddresses                       : function () {
            var that = this;
            return {
                getArray: function () {
                    return that.addresses;
                }
            };
        },
        getUrls                            : function () {
            var that = this;
            return {
                getArray: function () {
                    return that.urls;
                }
            };
        },
        getNotes                           : function () {
            var that = this;
            return {
                getArray: function () {
                    return that.notes ? that.notes : [];
                }
            };
        },
        getPhotos                          : function () {
            var that = this;
            return {
                getPhotoPath: function () {
                    var myFuture = new future();
                    myFuture.result = that.photos.listPhotoPath;
                    return myFuture;
                }
            };
        },
        isFavorite                         : function () {
            return this.favorite;
        }
    };

    var Contact = {
        getName         : function () {
            var that = this;
            return {
                x_fullName : that.fullName,
                getFullName: function () {
                    return that.fullName;
                }
            };
        },
        getAccountId    : function () {
            return {
                getValue: function () {
                    return "ACCOUNT-ID";
                }
            };
        },
        getBirthday     : function () {
            var that = this;
            return {
                getValue       : function () {
                    return that.birthday;
                },
                getDisplayValue: function () {
                    return that.birthday;
                }
            };
        },
        getNickname     : function () {
            var that = this;
            return {
                getValue       : function () {
                    return that.nickname;
                },
                getDisplayValue: function () {
                    return that.nickname;
                }
            };
        },
        getNote         : function () {
            var that = this;
            return {
                getValue       : function () {
                    return that.note;
                },
                getDisplayValue: function () {
                    return that.note;
                }
            };
        },
        getKindName     : function () {
            return "com.palm.contact.google:1"; //tie this into readonly, accounttype
        },
        getId           : function () {
            return "CONTACT-ID";
        },
        getAddresses    : function () {
            var that = this;
            return {
                getArray: function () {
                    var addresses = [];
                    for (var i = 0; i < that.addresses.length; i++) {
                        addresses.push(ObjectUtils.extend(that.addresses[i], ContactsLib.Address));
                    }
                    return addresses;
                }
            };
        },
        getRelations    : function () {
            var that = this;
            return {
                getArray: function () {
                    var relations = [];
                    for (var i = 0; i < that.relations.length; i++) {
                        relations.push(ObjectUtils.extend(that.relations[i], ContactsLib.Relation));
                    }
                    return relations;
                }
            };
        },
        getOrganizations: function () {
            var that = this;
            return {
                getArray: function () {
                    return [
                        {
                            getTitle: function () {
                                return that.organization.title;
                            },
                            getName : function () {
                                return that.organization.name;
                            }
                        }
                    ];
                }
            };
        },
        getEmails       : function () {
            var that = this;
            return {
                getArray: function () {
                    var emails = [];
                    for (var i = 0; i < that.emails.length; i++) {
                        emails.push(ObjectUtils.extend(that.emails[i], ContactsLib.Email));
                    }
                    return emails;
                }
            };
        },
        getPhoneNumbers : function () {
            var that = this;
            return {
                getArray: function () {
                    var phoneNumbers = [];
                    for (var i = 0; i < that.phoneNumbers.length; i++) {
                        phoneNumbers.push(ObjectUtils.extend(that.phoneNumbers[i], ContactsLib.PhoneNumber));
                    }
                    return phoneNumbers;
                }
            };
        },
        getIms          : function () {
            var that = this;
            return {
                getArray: function () {
                    var ims = [];
                    for (var i = 0; i < that.ims.length; i++) {
                        ims.push(ObjectUtils.extend(that.ims[i], ContactsLib.Im));
                    }
                    return ims;
                }
            };
        },
        getUrls         : function () {
            var that = this;
            return {
                getArray: function () {
                    var urls = [];
                    for (var i = 0; i < that.urls.length; i++) {
                        urls.push(ObjectUtils.extend(that.urls[i], ContactsLib.Url));
                    }
                    return urls;
                }
            };
        }
    };

    var IMAddress = {
        getType: function () {
            return this.type;
        },
        TYPE   : {
            SKYPE: "type_skype"
        },
        Labels : {
            getPopupLabels: function () {
                return [
                    {
                        "value"  : "type_mobile",
                        "label"  : "Mobile",
                        "caption": "Mobile"
                    },
                    {
                        "value"  : "type_home",
                        "label"  : "Home",
                        "caption": "Home"
                    },
                    {
                        "value"  : "type_other",
                        "label"  : "Other",
                        "caption": "Other"
                    },
                    {
                        "value"  : "type_skype",
                        "label"  : "Skype",
                        "caption": "Skype"
                    }
                ];
            }
        }
    };

    var EmailAddress = {
        Labels: {
            getPopupLabels: function () {
                return [
                    {
                        "value"  : "type_mobile",
                        "label"  : "Mobile",
                        "caption": "Mobile"
                    },
                    {
                        "value"  : "type_home",
                        "label"  : "Home",
                        "caption": "Home"
                    },
                    {
                        "value"  : "type_other",
                        "label"  : "Other",
                        "caption": "Other"
                    }
                ];
            }
        }
    };

    var PersonPhotos = {
        getPhotoPath: function (personPhotosObject, photoType, somethingElse) {
            var myFuture = new future();
            myFuture.result = personPhotosObject.listPhotoPath;
            return myFuture;
        },
        TYPE        : {
            BIG   : "type_big",
            SQUARE: "type_square",
            LIST  : "type_list"
        }
    };

    var ContactPhoto = {
        TYPE                      : {
            LIST: {}
        },
        attachPhotoPathsToContacts: function (contactsArray, type, path) {
            var myFuture = new future();
            myFuture.result = [];
            return myFuture;
        },
        getPhotoPath              : function (contact) {
            var myFuture = new future();
            myFuture.result = contact.photoPath;
            return myFuture;
        }

    };

    var PhoneNumber = {
        getValue: function () {
            return this.value;
        },
        Labels  : {
            getPopupLabels: function () {
                return [
                    {
                        "value"  : "type_mobile",
                        "label"  : "Mobile",
                        "caption": "Mobile"
                    },
                    {
                        "value"  : "type_home",
                        "label"  : "Home",
                        "caption": "Home"
                    },
                    {
                        "value"  : "type_other",
                        "label"  : "Other",
                        "caption": "Other"
                    }
                ];
            }
        }
    };

    var Im = {
        getValue: function () {
            return this.value;
        }
    };

    var Email = {
        getValue       : function () {
            return this.value;
        },
        getDisplayValue: function () {
            return this.value;
        }
    };

    var Address = {
        getValue: function () {
            var address = "";
            if (this.streetAddress) {
                address += this.streetAddress;
            }
            if (this.locality) {
                address += (address ? ", " : "") + this.locality;
            }
            if (this.region) {
                address += (address ? ", " : "") + this.region;
            }
            if (this.postalCode) {
                address += (address ? ", " : "") + this.postalCode;
            }
            return address;
        },
        Labels  : {
            getPopupLabels: function () {
                return [
                    {
                        "value"  : "type_mobile",
                        "label"  : "Mobile",
                        "caption": "Mobile"
                    },
                    {
                        "value"  : "type_home",
                        "label"  : "Home",
                        "caption": "Home"
                    },
                    {
                        "value"  : "type_other",
                        "label"  : "Other",
                        "caption": "Other"
                    }
                ];
            }
        }

    };

    var Url = {
        getValue: function () {
            return this.value;
        }
    };
    return {
        Person        : Person,
        Contact       : Contact,
        PersonPhotos  : PersonPhotos,
        ContactPhoto  : ContactPhoto,
        EmailAddress  : EmailAddress,
        IMAddress     : IMAddress,
        _accountImages: _accountImages,
        PhoneNumber   : PhoneNumber,
        Email         : Email,
        Address       : Address,
        Relation      : Relation,
        Url           : Url,
        Im            : Im
    };
})();

//----END CONTACTS LIB WITH PERSON STATIC defn

//map that will contain raw db person objects. these will be attached on list decoration

MockPersonMap = {};


////MOCK DATA FOR GET DISPLAYABLE PERSON AND CONTACTS BY ID REQUEST-----

GetDisplayablePersonAndContactsByIdMockData = [];

(function () {
    GetDisplayablePersonAndContactsByIdMockData["2+4F"] = {
        _id                  : "2+4F",
        name                 : { familyName: "Allen", givenName: "Mitch" },
        photos               : {squarePhotoPath: "mock/mitch.jpg"},
        organization         : {title: "Engineer", name: "Palm"},
        displayName          : "Mitch Allen",
        birthday             : "Mar 21, 2011",
        fullName             : "Mitch Allen",
        nickName             : "",
        workInfoLine         : "",
        contactCount         : 1,
        isFavoriteClass      : "",
        headerPhotoPath      : "mock/mitch.jpg",
        imageId              : "",
        favoritesHeaderClass : "favorites-header",
        favoritesIcon        : "<img class=\"list-favorite\" src=\"/usr/palm/frameworks/contacts/version/1.0/images/favorites-star-blue.png\" height=\"24\" width=\"24\" alt=\"\" />",
        favoriteClass        : "favorite",
        hideContactCountClass: "count-hidden",
        emails               : [
            {value: "mitch.allen@palm.com"}
        ],
        ims                  : []
    };
    GetDisplayablePersonAndContactsByIdMockData["2+4S"] = {
        _id                  : "2+4S",
        name                 : { familyName: "Lam", givenName: "Mark" },
        photos               : {squarePhotoPath: "mock/snowboarder.jpg"},
        organization         : {title: "Engineer", name: "Palm"},
        displayName          : "Mark Lam",
        birthday             : "Mar 21, 2011",
        fullName             : "Mark Lam",
        nickName             : "",
        workInfoLine         : "",
        contactCount         : 1,
        isFavoriteClass      : "",
        headerPhotoPath      : "mock/snowboarder.jpg",
        imageId              : "",
        favoritesHeaderClass : "favorites-header",
        favoritesIcon        : "<img class=\"list-favorite\" src=\"/usr/palm/frameworks/contacts/version/1.0/images/favorites-star-blue.png\" height=\"24\" width=\"24\" alt=\"\" />",
        favoriteClass        : "favorite",
        hideContactCountClass: "count-hidden",
        emails               : [
            {value: "mark.lam@palm.com"}
        ],
        ims                  : []
    };
    GetDisplayablePersonAndContactsByIdMockData["++HLXrxSWCRov5zi"] = {
        _id                  : "++HLXrxSWCRov5zi",
        name                 : { familyName: "Long", givenName: "Andrew" },
        photos               : {squarePhotoPath: "mock/monkey.jpg"},
        organization         : {title: "Engineer", name: "Palm"},
        displayName          : "Andrew Long",
        birthday             : "Mar 21, 2011",
        fullName             : "Andrew Long",
        nickName             : "",
        workInfoLine         : "",
        contactCount         : 2,
        isFavoriteClass      : "",
        headerPhotoPath      : "mock/monkey.jpg",
        imageId              : "",
        favoritesHeaderClass : "favorites-header",
        favoritesIcon        : "<img class=\"list-favorite\" src=\"/usr/palm/frameworks/contacts/version/1.0/images/favorites-star-blue.png\" height=\"24\" width=\"24\" alt=\"\" />",
        favoriteClass        : "favorite",
        hideContactCountClass: "count-hidden",
        emails               : [
            {value: "andrewlong@google.com"}
        ],
        ims                  : []
    };
    GetDisplayablePersonAndContactsByIdMockData["++HLXrxU1MwHq_mE"] = {
        _id                  : "++HLXrxU1MwHq_mE",
        name                 : { familyName: "Palm", givenName: "Richard" },
        photos               : {squarePhotoPath: "mock/hamster.jpg"},
        organization         : {title: "Engineer", name: "Palm"},
        displayName          : "Richard Palm",
        birthday             : "Mar 21, 2011",
        fullName             : "Richard Palm",
        nickName             : "",
        workInfoLine         : "",
        contactCount         : 1,
        isFavoriteClass      : "",
        headerPhotoPath      : "mock/hamster.jpg",
        imageId              : "",
        favoritesHeaderClass : "favorites-header",
        favoritesIcon        : "<img class=\"list-favorite\" src=\"/usr/palm/frameworks/contacts/version/1.0/images/favorites-star-blue.png\" height=\"24\" width=\"24\" alt=\"\" />",
        favoriteClass        : "favorite",
        hideContactCountClass: "count-hidden",
        emails               : [
            {value: "richard_palm@google.com"}
        ],
        ims                  : []
    };
    GetDisplayablePersonAndContactsByIdMockData["++HLXsObAuSDzwO3"] = {
        _id                  : "++HLXsObAuSDzwO3",
        name                 : { familyName: "Blow", givenName: "Joe" },
        photos               : {squarePhotoPath: "mock/rabbit.jpg"},
        organization         : {title: "Engineer", name: "Palm"},
        displayName          : "Joe Blow",
        fullName             : "Joe Blow",
        birthday             : "Mar 21, 2011",
        nickName             : "",
        workInfoLine         : "",
        contactCount         : 1,
        isFavoriteClass      : "",
        headerPhotoPath      : "mock/rabbit.jpg",
        imageId              : "",
        favoritesHeaderClass : "favorites-header",
        favoritesIcon        : "<img class=\"list-favorite\" src=\"/usr/palm/frameworks/contacts/version/1.0/images/favorites-star-blue.png\" height=\"24\" width=\"24\" alt=\"\" />",
        favoriteClass        : "favorite",
        emails               : [
            {value: "joe_blow@google.com"}
        ],
        ims                  : [],
        hideContactCountClass: "count-hidden"
    };
    GetDisplayablePersonAndContactsByIdMockData["++HLXsP32Yhxy7au"] = {
        _id                  : "++HLXsP32Yhxy7au",
        name                 : { familyName: "Testerson", givenName: "Test" },
        photos               : {squarePhotoPath: "mock/rabbit.jpg"},
        organization         : {title: "Engineer", name: "Palm"},
        displayName          : "Test Testerson",
        fullName             : "Test Testerson",
        nickName             : "",
        workInfoLine         : "",
        contactCount         : 1,
        isFavoriteClass      : "",
        headerPhotoPath      : "mock/rabbit.jpg",
        imageId              : "",
        birthday             : "Mar 21, 2011",
        favoritesHeaderClass : "favorites-header",
        favoritesIcon        : "<img class=\"list-favorite\" src=\"/usr/palm/frameworks/contacts/version/1.0/images/favorites-star-blue.png\" height=\"24\" width=\"24\" alt=\"\" />",
        emails               : [
            {value: "test_t35t3r50n@google.com"}
        ],
        ims                  : [],
        favoriteClass        : "favorite",
        hideContactCountClass: "count-hidden"
    };
    GetDisplayablePersonAndContactsByIdMockData["++HLXsjI6hw0gHm7"] = {
        _id                  : "++HLXsjI6hw0gHm7",
        name                 : { familyName: "Lovett", givenName: "Eric" },
        photos               : {squarePhotoPath: "mock/sheep.jpg"},
        organization         : {title: "Engineer", name: "Palm"},
        displayName          : "Eric Lovett",
        fullName             : "Eric Lovett",
        nickname             : "Erik",
        workInfoLine         : "",
        contactCount         : 1,
        isFavoriteClass      : "",
        birthday             : "Mar 21, 2011",
        headerPhotoPath      : "mock/sheep.jpg",
        emails               : [
            {value: "eric.lovett@palm.com"}
        ],
        ims                  : [],
        imageId              : "",
        favoritesHeaderClass : "favorites-header",
        favoritesIcon        : "<img class=\"list-favorite\" src=\"/usr/palm/frameworks/contacts/version/1.0/images/favorites-star-blue.png\" height=\"24\" width=\"24\" alt=\"\" />",
        favoriteClass        : "favorite",
        hideContactCountClass: "count-hidden"
    };
})();

//----END MOCK DATA FOR GET DISPLAYABLE PERSON AND CONTACTS BY ID REQUEST
