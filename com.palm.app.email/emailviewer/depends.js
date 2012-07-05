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
        "../controls/",
        "../util/CachedFile.js",
        "$enyo-lib/printdialog/",
        "$enyo-lib/contactsui/",
        "../util/util.js",
        "../facades/Email.js",
        "../facades/Folder.js", /* FIXME move to Controls depends for move to folder dialog */
        "../mail/source/MessagePane.js",
        "../mail/source/MessageDisplay.js",
        "../mail/source/MessageLoader.js",
        "source/EmailViewerWindow.js",
        "../css/mail.css",
        "../css/overrides.css"
    );
