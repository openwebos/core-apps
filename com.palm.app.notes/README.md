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

Quick Info
-----------
Memo Application for webOS. It was built using Enyo 1.0. 

Core
-------
This repository contains Memo Application for webOS. This App was designed based on MVC pattern. 

index.html - This is the main html file which creates the main JS object for the App.

app / - App Source Code folder. It contains the following sub-folders

	agents/ - It contains all the App controller JS files.
	lib / - Library and Utility JS files.
	models - App Models.
	views - App UI views. 
 

css/ - This folder contains the CSS stylesheets used by APP UI.

images/ - This folder contains all the UI images.

appinfo.json - App description file. 

depends.js - Required by Enyo 1.0. This file contains the list of all Javascript and CSS files that are used by the App. 

configuration - This folder contains webOS db8 (MojoDB) schema definitions and DB permissions. 

mock - This folder contains the db8 service responses. This mock data is used by the App when it's running on the browser. Please note that the launch=nobridge parameter 
has to be set in the index.html in order to use the mock responses.

