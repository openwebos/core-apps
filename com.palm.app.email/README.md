# Email application

Email application for webOS. Written using enyo 1.0.

# Limitations and Known Issues

## User Credentials will be stored in clear format in the db8. Secure storing support will be added later.

## HTML Sanitizer function used in the Email display message view, is limited to remove only certain tags such as Script, iframe, object, embed. More generic solution is planned for post beta release.


# App launch lifecycle

The email app is launched automatically at boot. There is a headless window,
index.html, which handles background tasks like triggering notifications for
new emails. When the email app is "relaunched", it opens a new window depending
on the launch parameters.

Windows (cards) include:

* Headless window (always hidden): Run from the top-level index.html. Handles
  basic initialization, relaunch, and runs the email processor and dashboard
  manager.

  See nowindow/source/Launch.js.

* Main window: Run from mail/index.html. There is only one of these windows
  open at any given time. On webOS 3.x, after launching the main window it is
  always kept open and only hidden/shown when the card is dismissed unless the
  window is forcibly closed using the "slingshot" (pull down and release)
  gesture.
  
  Can be launched with folderId or emailId to open a specific folder or email.
  
  See mail/source/MailApp.js.
  
* Compose window: Run from compose/index.html. Opened by passing either
  the newEmail: {...} parameter or one of the legacy parameters.
  
  See compose/source/Compose.js.
  
* Email Viewer window: Opened if the email app is launched using a target/uri
  parameter. This is used to display RFC 822 (.eml) files. It can also be used
  to display emails in a separate window.
  
  See emailviewer/source/EmailViewerWindow.js.
  
* Accounts iframe: Special window used to provide a custom validator and
  login settings UI for email accounts. The Accounts app uses cross-app launch
  to open this page within an iframe via accounts/wizard.html. It handles
  auto-determining account settings for new accounts, as well as a manual input
  form to enter specific server settings for new/existing accounts.

  See accounts/source/CRUDAccounts.js.

# Copyright and License Information

All content, including all source code files and documentation files in this repository except otherwise noted are: 

 Copyright (c) 2010-2012 Hewlett-Packard Development Company, L.P.

All content, including all source code files and documentation files in this repository except otherwise noted are:
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this content except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

# Thanks

Includes MAILTO parser library for Javascript by Michael Anthony Puls II.

Cow image by lemmling. Moo.
Farm image by Marcus Cruz.
Toaster image by rg1024.

See NOTICE file for copyright and license details.
