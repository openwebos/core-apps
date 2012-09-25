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
    "$enyo/g11n/name/",
    "$base/util/stringify.js",
    "$base/data/mail.js",
    "$base/app/shared/",
    "$base/data/AttachmentManager.js",
    "$base/data/Transports.js",
    "$base/data/AccountPreferences.js",
    "$base/data/EmailKinds.js",
    "$base/util/util.js",
    "$base/util/urlparser.js",
    "$base/util/CachedFile.js",
    "$base/data/facades/ContactCache.js",
    "$base/data/facades/Folder.js",
    "$base/data/VirtualConversation.js",
    "$base/data/ConversationLoader.js",
    "$base/data/NextPrevLoader.js",
    "$base/data/FolderStateWatcher.js",
    "panes/folders/",
    "panes/list/",
    "settings/MasterSettings.js",
    "settings/Preferences.js",
    "settings/AccountSettings.js",
    "panes/messageview/",
    "$base/accounts/",
    "MailApp.js",
    "$base/data/facades/Email.js",
    "$base/data/facades/Attachment.js",
    "$css/mail.css",
    "$css/main/email-list.css",
    "$enyo-lib/accounts/",
    "$enyo-lib/contactsui/",
    "$css/overrides.css"
);

