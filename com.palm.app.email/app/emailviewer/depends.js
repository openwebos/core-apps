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

enyo.depends
    (
        "$base/app/shared/",
        "$base/util/CachedFile.js",
        "$enyo-lib/printdialog/",
        "$enyo-lib/contactsui/",
        "$base/util/util.js",
        "$base/data/facades/ContactCache.js",
        "$base/data/facades/Email.js",
        "$base/data/EmailKinds.js",
        "$base/data/AccountPreferences.js",
        "$base/data/facades/Folder.js", /* FIXME move to Controls depends for move to folder dialog */
        "$base/app/main/panes/messageview/",
        "EmailViewerWindow.js",
        "$css/mail.css",
        "$css/overrides.css"
    );
