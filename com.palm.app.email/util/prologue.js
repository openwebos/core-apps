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

// Stuff that needs to be loaded before everything else

(function () {
    if (window._prologueLoaded) {
        return;
    }

    // If there's a getMailAppRoot() function, we need to load resources from an alternate location
    if (!window.rb && window.getMailAppRoot) {
        var appPath = window.getMailAppRoot();

        window.rb = new enyo.g11n.Resources({root: appPath});
        window.$L = function (s) {
            return (rb.$L)(s);
        }
    }

    window._prologueLoaded = true;
})();
