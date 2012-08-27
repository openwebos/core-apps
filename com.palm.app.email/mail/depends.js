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

enyo.depends(
    "$enyo-lib/printdialog/",
    "$enyo/g11n/name/",
    "../util/stringify.js",
    "../data/mail.js",
    "../data/AttachmentManager.js",
    "../data/AccountPreferences.js",
    "../util/util.js",
    "../util/urlparser.js",
    "../util/CachedFile.js",
    "../facades/ContactCache.js",
    "../facades/Folder.js",
    "source/MessageSelection.js",
    "source/Accounts.js",
    "source/Folders.js",
    "source/Mail.js",
    "source/MessagePane.js",
    "source/HtmlView.js",
    "source/MessageDisplay.js",
    "source/MessageLoader.js",
    "source/DarkSwipeable.js",
    "source/settings/MasterSettings.js",
    "source/settings/Preferences.js",
    "source/settings/AccountSettings.js",
    "../accounts/",
    "source/MailApp.js",
    "../controls/",
    "../facades/Email.js",
    "../facades/Folder.js",
    "../facades/Message.js",
    "../facades/Attachment.js",
    "../css/mail.css",
    "../css/overrides.css",
    "$enyo-lib/accounts/", // last, in case other stuff breaks for people
    "$enyo-lib/contactsui/"
);

