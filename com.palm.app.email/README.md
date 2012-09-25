Email application
=================

Summary
-------

Email application for webOS. Written using enyo 1.0.

Unstable branch
------------------

NOTE: This branch is experimental and may have bugs, missing features,
and performance regressions not present in the mainline source code.
Key changes from master branch:

* Refactored app structure and cleaner separation of components/views.

* Experimental support for displaying emails in threaded view. Emails are
  processed in the EmailProcessor and assigned to threads based on (in order
  of preference): server thread id, message-id/in-reply-to, similar subjects.
  
  An updated version of the sync transports may be needed for these fields,
  and for staged deletion/purge of emails so that the processor is notified
  of the deletion (typically in the case of mass-deletes such as account/folder
  deletion). NOTE: Server thread id is not implemented yet.
  
* There are new as well as updated db kinds which must be installed. Make sure
  to install and register the latest db kind/permission configs from the
  configuration directory and reboot the system.

* If the thread index is in a bad state, rebuild it by going to
  Preferences & Accounts -> (menu) -> Debug: Rebuild thread index
  
Known issues
============

* Limited design/styling aka "programmer art".
* No printing support.
* Reply collapsing needs to handle more common reply formats.
* Thread grouping by subject needs logic to avoid merging unrelated emails.
* No support for cross-folder (sent emails, etc) threading.
* Need to add more options to the message footer "more" menu.
* Automatic email account setup may not work for some accounts.
  
How to Run on Ubuntu Linux
==========================

1. Clone https://github.com/openwebos/core-apps.git
2. cd core-apps; git checkout unstable
3. Copy com.palm.app.email into ${LUNA\_STAGING}/rootfs/usr/palm/applications/
4. Copy ${LUNA\_STAGING}/rootfs/usr/palm/applications/com.palm.app.email/db/kinds/* ${LUNA\_STAGING}/rootfs/etc/palm/db/kinds/
5. Copy ${LUNA\_STAGING}/rootfs/usr/palm/applications/com.palm.app.email/db/permissions/* ${LUNA\_STAGING}/rootfs/etc/palm/db/permissions/
6. Stop LunaSysMgr and all services (./service-bus.sh stop)
7. Re-run service setup described in https://github.com/openwebos/build-desktop including ./service-bus.sh init

App launch lifecycle
====================

The email app is launched automatically at boot. There is a headless window,
index.html, which handles background tasks like triggering notifications for
new emails. When the email app is "relaunched", it opens a new window depending
on the launch parameters.

Windows (cards) include:

* Headless window (always hidden): Run from the top-level index.html. Handles
  basic initialization, relaunch, and runs the email processor and dashboard
  manager.

  See app/nowindow/Launch.js.

* Main window: Run from mail/index.html. There is only one of these windows
  open at any given time. On webOS 3.x, after launching the main window it is
  always kept open and only hidden/shown when the card is dismissed unless the
  window is forcibly closed using the "slingshot" (pull down and release)
  gesture.
  
  Can be launched with folderId or emailId to open a specific folder or email.
  
  See app/main/MailApp.js.
  
* Compose window: Run from compose/index.html. Opened by passing either
  the newEmail: {...} parameter or one of the legacy parameters.
  
  See app/compose/ComposeWindow.js.
  
* Email Viewer window: Opened if the email app is launched using a target/uri
  parameter. This is used to display RFC 822 (.eml) files. It can also be used
  to display emails in a separate window.
  
  See app/emailviewer/EmailViewerWindow.js.
  
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
