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

/*global enyo, Memo */

var util = {};

util.wrap = function(innerFunc, outerFunc) {
  return function() {
    var args = [innerFunc];
    args.push.apply(args, arguments);
    outerFunc.apply(null, args);
  };
};

util.swapMemoColorClassName = function(node, newColor) {
  util.removeClassNames(node, Memo.colors);
  node.addClass(newColor);
};

util.removeClassNames = function(node, classNames) {
  var currentClasses = node.getClassName().split(' ');
  var classesToRemove;
  if (classNames.length && typeof classNames != 'string') {
    classesToRemove = classNames;
  } else {
    classesToRemove = classNames.split(' ');
  }

  classesToRemove.forEach(function(name) {
    var index = currentClasses.indexOf(name);
    if (index >= 0) {
      currentClasses.splice(index, 1);
    }
  });

  node.setClassName(currentClasses.join(' '));
};

util.highlightString = function highlightString(filterText, unformattedText) {
	var highlightSpan = '<span class="string-highlight">ZZZZ</span>';
	var patternStr = "\\b(" + filterText + ")";
	var beginPattern = new RegExp(patternStr, 'ig');

	var formatText = unformattedText.replace(beginPattern, function(whole, match) {
		return highlightSpan.replace('ZZZZ', match);
	});
	return formatText;
};

util.extend = enyo.mixin;
