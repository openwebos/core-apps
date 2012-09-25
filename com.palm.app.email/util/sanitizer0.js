/* @@@LICENSE
*
*      Copyright (c) 2012 Hewlett-Packard Development Company, L.P.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*
* LICENSE@@@ */

/*
 * This is a naive, non-conformant HTML parser/sanitizer.
 * Any "unusual" (even valid) HTML will probably get dropped on the floor,
 * dumped in the wrong div, or in the worst case the entire document might get
 * written out an unreadable mess of escaped content.
 *
 * The results may not be pretty but at least it should be somewhat secure
 * against Javascript injection attacks.
 *
 * Given the limitations, this should eventually be replaced with a more
 * mature/compliant sanitizer library for maximum compatibility.
 */
var SimpleHtmlParser = (function () {
    var tagWhitelist = {
        'a': {name: true, href: "uri"},
        'abbr': true,
        'acronym': true,
        'address': true,
        'b': true,
        'big': true,
        'blockquote': {cite: "uri"},
        'br': {clear: true},
        'caption': true,
        'center': true,
        'cite': true,
        'code': true,
        'col': {span: true},
        'colgroup': {span: true},
        'dd': true,
        'del': true,
        'dfn': true,
        'div': true,
        'dl': true,
        'dt': true,
        'em': true,
        'font': {face: true, size: true, color: true},
        'h1': true, 'h2': true, 'h3': true, 'h4': true, 'h5': true, 'h6': true,
        'hr': {noshade: true, size: true},
        'i': true,
        'img': {src: "uri", border: true},
        'ins': true,
        'label': {'for': true},
        'li': true,
        'ol': true,
        'p': true,
        'pre': true,
        'q': true,
        's': true,
        'samp': true,
        'small': true,
        'span': true,
        'strike': true,
        'strong': true,
        'sub': true,
        'sup': true,
        'table': {summary: true, border: true, frame: true, rules: true, cellspacing: true, cellpadding: true},
        'tbody': true,
        'td': {headers: true, scope: true, abbr: true, rowspan: true, colspan: true},
        'tfoot': true,
        'th': {headers: true, scope: true, abbr: true, rowspan: true, colspan: true},
        'thead': true,
        'tr': true,
        'tt': true,
        'u': true,
        'ul': true
    };
    
    // Generic attributes that we'll always allow by default
    var attributeWhitelist = {
        'class': true,
        'style': true,
        
        'alt': true,
        'align': true,
        'background': true,
        'bgcolor': true,
        'dir': true,
        'height': true,
        'lang': true,
        'title': true,
        'valign': true,
        'width': true
    };
    
    // These tags will be completely wiped, including any child nodes/text
    // NOTE:  Technically, these should only be scanned for the respective
    // end tags and not other stuff, but we'll just live with the mess.
    var tagBlacklist = {
        'script': true,
        'style': true,
        'head': true,
        'title': true
    };

    // Escape anything that could be interpreted as tags
    function escapeContent (text) {
        return text.replace(/</g, '&gt;').replace(/>/g, '&lt;');
    }
    
    // Return attribute in double-quoted form
    function quoteAttribute (text) {
        return '"' + escapeContent(text).replace(/"/g, '&quot;') + '"';
    }
    
    function defaultTagHandler (tag) {
        var tagInfo = tagWhitelist[tag.tagName];
    
        if (tagInfo) {
            var newTag = {
                tagName: tag.tagName,
                attributes: {},
                selfClosing: tag.selfClosing
            };
        
            for (var attrName in tag.attributes) {
                if (tagInfo[attrName] || attributeWhitelist[attrName]) {
                    newTag.attributes[attrName] = tag.attributes[attrName];
                }
            }
            
            return newTag;
        } else if (!tagBlacklist[tag.tagName]) {
            if (tagBlacklist[tag.tagName] || tag.selfClosing) {
                return null;
            } else {
                return {tagName: 'div'};
            }
        }
    }

    // Parse HTML text. A tag handler can be passed in to remove or modify
    // tags. If a falsy value is returned, the tag and all child elements will
    // be stripped.
    function parseHtml (rawText, tagHandler) {
        tagHandler = tagHandler || defaultTagHandler;
    
        // match against:
        //  comments
        //  doctypes
        //  close tags (1 = tag name)
        //  open or self-closing tags (2 = tag name, 3 = attributes, 4 = close tag)
        var tagRe = /<\!--[\s\S]*?-->|<\![\s\S]*?>|<\/([0-9a-zA-Z\-\:]+)\s*>|<([0-9a-zA-Z\-\:]+)(\s+[^>]*?)?\s*(\/)?\s*>/g;
        
        // match against:
        //  attribute name (match 1)
        //  single-quoted value (optional, match 2) or
        //  double-quoted value (optional, match 3) or
        //  unquoted value (optional, match 4)
        var attributeRe = /\s+([0-9a-zA-Z\-\:]+)\s*(?:=\s*(?:"([^"]*?)"|'([^']*?)'|(\S*)))?/g;
        
        // output text
        var output = "";
    
        var prevIndex = 0;
        var stack = [];
        var skipAll = false;
        
        var attrName, attrValue;
    
        while(true) {
            var match = tagRe.exec(rawText);
            
            if (match) {
                // write any preceding text
                if (!skipAll) {
                    output += escapeContent(rawText.slice(prevIndex, match.index));
                }
            
                if (match[1]) {
                    var closeTagName = match[1].toLowerCase();
                
                    // pop tags until we find a matching tag name
                    while (stack.length > 0) {
                        var currentTag = stack.pop();

                        if (currentTag.tagName === closeTagName) {
                            // write close tag (only if not ignored)
                            if (!currentTag.skip) {
                                output += '</' + closeTagName + '>';
                            }
                            break;
                        }
                    }
                    
                    // Update the skip state for the current tag
                    skipAll = stack.length > 0 ? stack[stack.length - 1].skip : false;
                } else if (match[2]) {
                    // open or self-closing tag
                    var tagName = match[2].toLowerCase();
                    var selfClose = !!match[4];
                    
                    if (!skipAll) {
                        var attributesStr = match[3];
                        
                        var attributes = {};
                        
                        if (attributesStr) {
                            while (true) {
                                var attrMatch = attributeRe.exec(attributesStr);
                                
                                if (attrMatch) {
                                    attrName = attrMatch[1];
                                    attrValue = attrMatch[2] || attrMatch[3] || attrMatch[4] || "";
                                    
                                    attributes[attrName.toLowerCase()] = attrValue;
                                } else {
                                    break;
                                }
                            }
                        }
                        
                        // Allow callback to manipulate tag
                        var tag = {
                            tagName: tagName,
                            attributes: attributes,
                            selfClosing: !!selfClose
                        };
                        
                        // Tag can be rewritten, e.g. to div if unknown
                        tag = tagHandler(tag);
                        
                        if (tag && tag.tagName) {
                            output += '<' + tag.tagName;
                            
                            for (attrName in (tag.attributes || [])) {
                                if (attrName) {
                                    output += ' ' + attrName;
                                    
                                    attrValue = tag.attributes[attrName];
                                    
                                    if (attrValue) {
                                        output += "=" + quoteAttribute(attrValue);
                                    }
                                }
                            }
                            
                            output += tag.selfClosing ? '/>' : '>';
                        }
                        
                        if (!tag) {
                            // skip contents entirely
                            skipAll = true;
                        }
                    }
                    
                    // Add original tag to stack for tracking
                    if (!selfClose) {
                        stack.push({tagName: tagName, skip: skipAll});
                    }
                }
                
                // record index of the end of the tag
                prevIndex = tagRe.lastIndex;
            } else {
                // escape any text at the end
                if (!skipAll) {
                    output += escapeContent(rawText.slice(prevIndex));
                }
                
                break;
            }
        }
        
        return output;
    }
    
    return {
        parseHtml: parseHtml,
        tagWhitelist: tagWhitelist,
        tagBlacklist: tagBlacklist,
        attributeWhitelist: attributeWhitelist,
        defaultTagHandler: defaultTagHandler
    };
})();
