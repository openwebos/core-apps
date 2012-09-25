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

EmailProcessorUtils = {
    stripSubject : function (subject) {
        if (!subject) {
            return;
        }
    
        var parts = subject.split(" ");
        var newParts = [];
        var prefixesDone = false;
    
        for (var i = 0; i < parts.length; i++) {
            var word = parts[i];
    
            if (!prefixesDone && word.length > 0 && word[word.length - 1] === ':') {
                // ignore
            } else if (word.length > 0 && word !== " ") {
                newParts.push(word);
                prefixesDone = true;
            }
        }
    
        return newParts.join(" ");
    }
};