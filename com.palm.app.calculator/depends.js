// @@@LICENSE
//
//      Copyright (c) 2011-2012 Hewlett-Packard Development Company, L.P.
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
/*global enyo */ 
enyo.depends(
	// The "depends.js" at top level in the app directory is ready when enyo is sourced.
	// We list here the .js and .css files used by the app.
	"source/Buttons.js",		// Contains some simple button classes for reuse.
	"source/Simple.js",             // A simple full screen layout.
	"source/Small.js",              // Small, but all the basic buttons.
	"source/Tiny.js",               // Trivial four-function layout.
	"source/TinyAlt.js",               // Trivial four-function alternatelayout.
	"source/Calculator.js",		// The top level calculating machinery (and button layout for now).
	"css/Calculator.css"
);