// @@@LICENSE
//
//      Copyright (c) 2010-2013 LG Electronics, Inc.
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

/*global util, enyo */

function Memo(seed) {
  var self = this;
  var data = util.extend({color: 'yellow', _kind: 'com.palm.note:1', text: '', title: ''}, seed);

  function sanitizeInputText(str) {
    return str.replace(/<\/?(a)[^>]*>/ig, '')
        .replace(/<div>/ig, "\n")
        .replace(/<\/div>/ig, '')
        .replace(/<br\s*\/?>/ig, "\n")
        .replace(/&nbsp;/ig, ' ');
  }

  self.serialize = function() {
    return data;
  };

  self.isNew = function() {
    return !!!data._id;
  };

  self.updateRev = function(rev) {
    data._rev = rev;
  };

  self.clear = function() {
    delete data._id;
    delete data._rev;
  };

  self.__defineGetter__('id', function() {
    return data._id;
  });

  self.__defineSetter__('id', function(id) {
    data._id = id;
  });

  self.__defineGetter__('rev', function() {
    return data._rev;
  });

  self.__defineGetter__('text', function() {
    return data.text;
  });

  self.__defineGetter__('displayText', function() {
    if (data.text.length > Memo.MAX_LENGTH_FOR_RUN_TEXT_INDEXER) {
      return data.text.replace(/\n/g, "<br/>");
    } else {
      return enyo.string.runTextIndexer(data.text).replace(/\n/g, "<br/>");
    }
  });

  self.__defineSetter__('text', function(text) {
    data.text = sanitizeInputText(text);
    data.title = data.text.substring(0, 50);
  });

  self.__defineGetter__('color', function() {
    return data.color;
  });

  self.__defineSetter__('color', function(color) {
    data.color = color;
  });

  self.__defineGetter__('position', function() {
    return data.position;
  });

  self.__defineSetter__('position', function(position) {
    data.position = position;
  });

  return self;
}

Memo.getNextMemoColor = function(memo) {
  if (!memo) {
    return Memo.defaultColor;
  }

  var nextColorIndex = (Memo.colors.indexOf(memo.color) + 1) % Memo.colors.length;
  return Memo.colors[nextColorIndex];
};

Memo.defaultColor = 'yellow';
Memo.colors = ['blue', Memo.defaultColor, 'green', 'pink', 'salmon'];
Memo.MAX_LENGTH_FOR_RUN_TEXT_INDEXER = 512;

Memo.getMemoPosition = function(left, right) {
  var distance, leftCharCode, firstMismatchIndex;

  function findFirstMismatchIndex() {
    for (var index = 0;
         index < left.length &&
             index < right.length &&
             left.charAt(index) === right.charAt(index);
         index++) {
    }

    return index;
  }

  function middleChar(leftCharCode, rightCharCode) {
    return String.fromCharCode(leftCharCode + (rightCharCode - leftCharCode) / 2);
  }

  firstMismatchIndex = findFirstMismatchIndex();

  // same length, chars mismatch & are adjacent
  if (right.length === left.length && right.length === firstMismatchIndex) {
    return left + 'm';
  }

  // ran out of chars on right before a match
  if (right.length === firstMismatchIndex) {
    var charCodeOf_z = 'z'.charCodeAt(0);
    leftCharCode = left.charCodeAt(firstMismatchIndex);
    distance = charCodeOf_z - leftCharCode;

    // characters are not adjacent, split the difference
    if (distance > 1) {
      return left.substring(0, firstMismatchIndex) + middleChar(leftCharCode, charCodeOf_z);
    }

    // chars are adjacent, recurse
    return left.substring(0, firstMismatchIndex + 1) + Memo.getMemoPosition(left.substring(firstMismatchIndex + 1), '');
  }

  // ran out of chars on the left
  if (left.length === firstMismatchIndex) {
    var charCodeOf_a = 'a'.charCodeAt(0);
    var rightCharCode = right.charCodeAt(firstMismatchIndex);
    distance = rightCharCode - charCodeOf_a;

    // characters are not adjacent, split the difference    
    if (distance > 1) {
      return left + middleChar(charCodeOf_a, rightCharCode);
    }

    // chars are adjacent, recurse 
    return left + 'a' + Memo.getMemoPosition('', right.substring(firstMismatchIndex + 1));
  }

  // same length, no match
  leftCharCode = left.charCodeAt(firstMismatchIndex);
  distance = right.charCodeAt(firstMismatchIndex) - leftCharCode;

  // characters are not adjacent, split the difference
  if (distance > 1) {
    return left.substring(0, firstMismatchIndex) + middleChar(leftCharCode, right.charCodeAt(firstMismatchIndex));
  }

  // chars are adjacent, recurse
  return left.substring(0, firstMismatchIndex + 1) + Memo.getMemoPosition(left.substring(firstMismatchIndex + 1), right.substring(firstMismatchIndex + 1));
};
