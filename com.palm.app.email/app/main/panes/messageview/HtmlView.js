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

enyo.kind({
    name: "AbstractHtmlView",
    kind: "Control",

    events: {
        onViewReady: "",
        onViewSizeChange: "",
        onLoadFailed: "",
        onLinkClick: "",
        onInspectElement: ""
    },

    published: {
        cidMap: {},
        allowRemoteContent: true
    },

    create: function () {
        this.inherited(arguments);
    },

    // Returns true if the HtmlView is more or less ready and has content displayed
    // The accuracy of this method may depend on the implementation.
    isReady: function () {
        return false;
    },

    activate: function () {
    },
    
    deactivate: function () {
    }
});

enyo.kind({
    name: "WebviewHtmlView",
    kind: "AbstractHtmlView",

    create: function () {
        this.inherited(arguments);

        this.webviewBodyLoaded = false;
    },

    destroy: function () {
        // FIXME workaround for bug in webview
        try {
            this.inherited(arguments);
        } catch (e) {
            this.error(e);
        }
    },

    createWebview: function () {
        this.createComponent({
            name: "webview",
            kind: "WebView",
            fitRender: false,
            acceptCookies: false,
            enableJavascript: false,
            ignoreMetaTags: true,
            onSingleTap: "webviewTap",
            onUrlRedirected: "doLinkClick",
            onLoadStarted: "webviewLoadStarted",
            onLoadComplete: "webviewLoadComplete",
            onLoadStopped: "webviewLoadStopped"
        });
        this.$.webview.render();
    },

    initWebview: function () {
        if (!this.$.webview) {
            this.createWebview();
            this.setupWebview();
        }
    },

    setupWebview: function () {
        if (this._webviewReady) {
            return;
        }

        this.$.webview.setRedirects([
            {regex: "^file:.*", cookie: "", enable: false},
            {regex: ".*", cookie: "", enable: true}
        ]);

        // Hack to prevent double url loads
        var origUrlChanged = viewControl.urlChanged.bind(viewControl);
        viewControl.urlChanged = function (old) {
            if (viewControl.url !== viewControl._pendingUrl) {
                console.log("calling orig");
                viewControl._pendingUrl = viewControl.url;
                origUrlChanged(old);
            }
        };

        var origLoadStarted = viewControl.loadStarted.bind(viewControl);
        viewControl.loadStarted = function () {
            viewControl._pendingUrl = undefined;
            origLoadStarted();
        };

        this._webviewReady = true;
    },

    // [public]
    loadUrl: function (url) {
        this.initWebview();
        this.$.webview.setUrl(url);
    },

    // [public]
    activate: function () {
        this.initWebview();

        this.log("activating webview");
        this.$.webview.activate();
    },

    // [public]
    deactivate: function () {
        if (this.$.webview) {
            this.$.webview.activate();
        }
    },

    webviewLoadStarted: function () {
        console.log("load started");
        this.webviewBodyLoaded = false;
    },

    webviewLoadComplete: function () {
        this.loadTimer = window.setTimeout(this.webviewReady.bind(this), 1000);
    },

    webviewLoadStopped: function () {
        console.log("load stopped");
        this.webviewBodyLoaded = true;

        this.webviewReady();
    },

    webviewReady: function () {
        if (this.loadTimer) {
            window.clearTimeout(this.loadTimer);
        }

        this.doViewReady();
    },

    webviewTap: function () {
        // TODO
        return true;
    }
});

enyo.kind({
    name: "InlineHtmlView",
    kind: "AbstractHtmlView",

    CID_REGEX: /^cid:/i,
    CSS_RULE_REGEX: /\s*([\-\w]+)\s*:\s*([^:;]*)?(;|$)/g,
    CSS_UNSAFE_PROPERTY_REGEX: /(^-\w+)|behavior$/i,
    CSS_URL_NOTATION_REGEX: /url\s*\(((?:\\.|.)*?)\)/i,
    VALID_RESOURCE_URL_REGEX: /^https?:/i,
    VALID_LINK_URL_REGEX: /^(https?|mailto):/i,

    create: function () {
        this.inherited(arguments);
    },
    
    destroy: function () {
        this.inherited(arguments);
    },
    
    // [public]
    loadUrl: function (url, contentType) {
        if (!url) {
            this.log("no url provided");
            return;
        }

        this.url = url;
        this.contentType = contentType || "text/plain";

        if (window.palmGetResource) {
            enyo.asyncMethod(this, enyo.bind(this, "loadDirect"));
        } else {
            enyo.xhrGet({
                url: url,
                load: enyo.bind(this, "handleXhrResponse")
            });
        }
    },
    
    // load using webOS's fast built-in file loader
    loadDirect: function () {
        var url = this.url.replace("file://", "");
    
        var data = palmGetResource(url);
        
        if (data) {
            this.loadDone(this.sanitizeResponse(data, this.contentType));
        } else {
            this.doLoadFailed();
        }
    },
    
    loadXhr: function () {
        enyo.xhrGet({
            url: this.url,
            load: enyo.bind(this, "handleXhrResponse")
        });
    },
    
    handleXhrResponse: function (responseText, xhrObject) {
        if(xhrObject.status == 200 || xhrObject.status == 304) {
            this.loadDone(this.sanitizeResponse(data, this.contentType));
        } else {
            this.doLoadFailed();
        }
    },

    // TODO: make this take a callback since both loading and sanitizing may be asynchronous later
    sanitizeResponse: function (unsafeData, contentType) {
        // This will get set to true if checkAllowExternalResource blocks a url
        this.remoteContentWasBlocked = false;

        var isHtml = (contentType.toLowerCase() == "text/html");

        // FIXME currently very slow for some emails
        var cleanHtml = isHtml ? this.sanitizeHtml(unsafeData) : this.sanitizeText(unsafeData);

        return cleanHtml;
    },

    // Returns true if a remote content url (e.g. external image) was blocked from being displayed
    wasRemoteContentBlocked: function () {
        return this.remoteContentWasBlocked;
    },

    // Check whether a url can be loaded in an image tag or css style
    checkAllowExternalResource: function (url) {
        if (!this.allowRemoteContent) {
            this.remoteContentWasBlocked = true;
            return false;
        }

        return this.VALID_RESOURCE_URL_REGEX.test(url);
    },

    // Check whether a link can be referenced
    checkAllowLink: function (url) {
        return this.VALID_LINK_URL_REGEX.test(url);
    },

    // Check if this external url is allowed
    mapUrl: function (url, tagName, attribName) {
        if (this.CID_REGEX.test(url)) {
            // replace cid: reference with local file path
            return this.cidMap[url.substr(4)] || "";
        }

        if (tagName === "a" && attribName === "href") {
            return this.checkAllowLink(url) ? url : null;
        } else if (tagName === "img" && attribName === "src") {
            return this.checkAllowExternalResource(url) ? url : null;
        } else {
            return null;
        }
    },

    // Checks and possibly removes external urls in inline css styles
    // TODO: TEST
    mapInlineStyle: function (style) {
        /*jshint loopfunc:true */
    
        var self = this;

        var cleanStyle = "";

        // Extract css rules one-by-one to make sure there's nothing tricky
        var rule = new RegExp(this.CSS_RULE_REGEX); // copy for repeated matches
        var m;
        while (!!(m = rule.exec(style))) {
            var name = m[1];
            var value = m[2];

            if (!name || !value || this.CSS_UNSAFE_PROPERTY_REGEX.exec(name)) {
                // unsafe css property
                continue;
            }

            // Cleanup urls
            value = value.replace(self.CSS_URL_NOTATION_REGEX, function (s, match1) {
                return self.checkAllowExternalResource(match1) ? s : "url()";
            });

            // Append normalized css
            cleanStyle += name + ":" + value + ";";
        }

        return cleanStyle;
    },
    
    mapClasses: function(classes) {
        if (classes === "gmail_quote" || classes === "webos_quote") {
            return classes;
        } else {
            return null;
        }
    },

    sanitizeHtml: function (unsafeHtml) {
        var self = this;

        return SimpleHtmlParser.parseHtml(unsafeHtml, function (tag) {
            var tagInfo = SimpleHtmlParser.tagWhitelist[tag.tagName];
        
            if (tagInfo) {
                var newTag = {
                    tagName: tag.tagName,
                    attributes: {},
                    selfClosing: tag.selfClosing
                };
            
                for (var attrName in tag.attributes) {
                    var attribInfo = tagInfo[attrName] || SimpleHtmlParser.attributeWhitelist[attrName];
                    if (attribInfo) {
                        var value = tag.attributes[attrName];
                        
                        if (attribInfo === "uri") {
                            value = self.mapUrl(value, tag.tagName, attrName);
                        } else if (attrName === "style") {
                            value = self.mapInlineStyle(value);
                        } else if (attrName === "class") {
                            value = self.mapClasses(value);
                        }
                        
                        newTag.attributes[attrName] = value;
                    } else {
                        //console.log("stripping attribute " + tag.tagName + "." + attrName);
                    }
                }
                
                return newTag;
            } else {
                //console.log("stripping tag " + tag.tagName);
                if (SimpleHtmlParser.tagBlacklist[tag.tagName] || tag.selfClosing) {
                    return null;
                } else {
                    return {tagName: "div"};
                }
            }
        });
    },

    sanitizeText: function (unsafeText) {
        return EmailApp.Util.convertTextToHtml(unsafeText);
    },
    
    makeExpander: function (quoteDiv, onContentChange) {
        var expander = document.createElement("div");
        expander.textContent = "[show quoted text]";
        expander.className = "quote-expander";
        quoteDiv.style.display = "none";
        quoteDiv.className += " -palm-quoted-text";
        
        expander.onclick = function() {
            if (quoteDiv.style.display === "none") {
                quoteDiv.style.display = "block";
                expander.textContent = "[hide quoted text]";
            } else {
                quoteDiv.style.display = "none";
                expander.textContent = "[show quoted text]";
            }
            
            onContentChange();
        };
        
        quoteDiv.parentNode.insertBefore(expander, quoteDiv);
    },
    
    // check if the given node is inside of a quoted text block
    isWithinQuote: function (node, rootNode) {
        while (node !== rootNode) {
            if (node.className && node.className.indexOf("-palm-quoted-text") >= 0) {
                return true;
            }
            node = node.parentNode;
        }
        
        return false;
    },
    
    collapseQuotes: function (rootNode, nodes, onContentChange) {
        for (var i = 0; i < nodes.length; i += 1) {
            var quoteDiv = nodes.item(i);
            
            // only block off large-ish quotes
            if (quoteDiv.offsetHeight < 100) {
                continue;
            }
            
            // make sure we're not nested
            if (!this.isWithinQuote(quoteDiv, rootNode)) {
                this.makeExpander(quoteDiv, onContentChange);
            }
        }
    },
    
    quoteTextNodes: function (rootNode, textNodes, onContentChange) {
        // don't bother with short quotes
        if (textNodes.length < 4) {
            return;
        }
        
        var element = textNodes[0].parentNode;
        
        // make sure we're not nested
        if (this.isWithinQuote(element, rootNode)) {
            return;
        }
        
        //console.log("quote candidates: " + enyo.map(textNodes, function (n) {return n.data;}).join(""));
        
        var node = textNodes[0];
        var index = 0;
        
        var nodesToExtract = [];
        
        // Walk through the nodes and confirm that there's only text/br nodes
        do {
            if (node.nodeType === 1) {
                // element node
                if (node.localName.toLowerCase() === "br") {
                    nodesToExtract.push(node);
                } else {
                    console.log("non-br element" + node.localName);
                    return;
                }
            } else if (node.nodeType === 3) {
                // text node
                if (textNodes[index] === node) {
                    // matched up node
                    nodesToExtract.push(node);
                } else {
                    console.log("unexpected text node: " + node.data);
                    return;
                }
                
                index += 1;
                
                if (index === textNodes.length) {
                    // done
                    break;
                }
            } else {
                console.log("node is not text/br: " + node.nodeType);
                return;
            }
        
            node = node.nextSibling;
        } while (node);
        
        //console.log("got " + nodesToExtract.length + " nodes to extract");
        
        // Move nodes to new div
        var quoteDiv = document.createElement("div");
        element.insertBefore(quoteDiv, textNodes[0]);
        
        for (var i = 0; i < nodesToExtract.length; i += 1) {
            node = nodesToExtract[i];
            quoteDiv.appendChild(node);
        }
        
        this.makeExpander(quoteDiv, onContentChange);
    },
    
    /*
     * Scan for <hr> followed by "Sent" or "wrote:" and collapse the rest of
     *the div/email. Note that simply having "wrote:" is not sufficient
     * since the sender might be only quoting part of the email or might have
     * a reply below it.
     *
     * We assume that most clients that use <hr> stick exclusively to
     * top-posting style (no blockquotes or > quoting).
     */
    scanForAppendedEmail: function (rootNode, onContentChange) {
        var rules = rootNode.getElementsByTagName("hr");
        
        if (rules && rules.length > 0) {
            var hrNode = rules[0];
        
            var walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, null, false);
            walker.currentNode = hrNode; // jump to hr
            
            var blankRe = /^\s*$/;
            var headerRe = /(?:^[\r\n]{0,4}From:)|(?:wrote:\s{0,4}$)/;
            
            var found = false;
            var node;
            
            // Look for stuff that looks like a header
            while ( (node = walker.nextNode()) ) {
                var text = node.data;
                
                if (!text || blankRe.test(text)) {
                    continue;
                }
                
                if (headerRe.test(text)) {
                    found = true;
                    break;
                }
            }
            
            if (found) {
                // stuff everything after the hr into the new div
                var quoteDiv = document.createElement("div");
                hrNode.parentNode.insertBefore(quoteDiv, hrNode);
                
                node = hrNode;
                
                var hrParent = hrNode.parentNode;
                
                do {
                    // Save next sibling, because it'll be moved shortly
                    var next = node.nextSibling;
                    
                    if (!next && node.parentNode === hrParent && hrParent.localName.toLowerCase() === "span") {
                        // Special case for webOS, where the hr is inside a span
                        next = node.parentNode.nextSibling;
                    }
                    
                    // Move node into quoteDiv
                    quoteDiv.appendChild(node);
                
                    node = next;
                } while(node);
                
                this.makeExpander(quoteDiv, onContentChange);
            }
        }
    },
    
    scanForQuotedText: function (rootNode, onContentChange) {
        var walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, null, false);
        
        var quoteRe = /^[\n\r]{0,2}>/;
        var blankRe = /^\s*$/;
        
        var node;
        var plainQuoteElement = null;
        var plainQuoteNodes = [];
        
        while ( (node = walker.nextNode()) ) {
            var text = node.data;
            
            var plainQuoteEnd = false;
            
            // If text starts with >, or is after a line with >
            if ((text && quoteRe.test(text)) || (plainQuoteElement && blankRe.test(text))) {
                var element = node.parentNode;
                
                // Check if it's all under the same element
                if (element && element.nodeType === 1 &&
                    (!plainQuoteElement || element.parentNode === plainQuoteElement)) {
                    
                    plainQuoteElement = element.parentNode;
                    plainQuoteNodes.push(node);
                } else {
                    plainQuoteEnd = true;
                }
            } else if (plainQuoteElement) {
                plainQuoteEnd = true;
            }
            
            if (plainQuoteEnd) {
                this.quoteTextNodes(rootNode, plainQuoteNodes, onContentChange);
                
                plainQuoteNodes = [];
                plainQuoteElement = null;
            }
        }
    },
    
    // [public]
    collapseQuotedText: function() {
        var rootNode = this.hasNode();

        var self = this;
        var onContentChange = function () {
            self.handleContentChange();
        };
        
        var startTime = new Date().getTime();
        
        try {
            // Collapse everything after a <hr> tag that looks like it's followed by an email
            this.scanForAppendedEmail(rootNode, onContentChange);
        
            // Collapse Gmail quotes
            this.collapseQuotes(rootNode, rootNode.getElementsByClassName("gmail_quote"), onContentChange);
            
            // Collapse webOS quotes (only when created with the threaded version of the email app)
            this.collapseQuotes(rootNode, rootNode.getElementsByClassName("webos_quote"), onContentChange);
            
            // Collapse blockquotes
            this.collapseQuotes(rootNode, rootNode.getElementsByTagName("blockquote"), onContentChange);
            
            // Scan through text (expensive)
            this.scanForQuotedText(rootNode, onContentChange);
        } catch (e) {
            console.log("error scanning for quoted text: " + e);
        }
        
        var endTime = new Date().getTime();
        
        this.log("Time scanning for quoted text: " + (endTime - startTime) + " ms");
        
        this.handleContentChange();
        //enyo.asyncMethod(this, enyo.bind(this, "handleContentChange"));
    },
    
    // This gets called when we think the HTML contents changed
    handleContentChange: function() {
        this.doViewContentUpdate();
    }
});

enyo.kind({
    name: "DivHtmlView",
    kind: "InlineHtmlView",

    className: "divhtmlview",

    components: [
        /* clipbox lets us explicitly size the content (based on scaling calculations) */
        {name: "clipbox", className: "divhtmlview-clipbox", components: [
            /* contents of the HTML area */
            {name: "wrapper", allowHtml: true /* must sanitize */, onclick: "wrapperClick", onmouseup: "wrapperMouseup", requiresDomClick: true, className: "divhtmlview-wrapper selectable"}
        ]}
    ],

    mixins: [
        enyo.sizeableMixin
    ],

    published: {
        zoom: 1.0,
        url: null,
        allowZoom: true
    },

    create: function () {
        this.inherited(arguments);

        this.viewReady = false;
    },
    
    destroy: function () {
        if (this.frameRequest) {
            enyo.cancelRequestAnimationFrame(this.frameRequest);
            delete this.frameRequest;
        }
        
        this.inherited(arguments);
    },

    rendered: function () {
        this.inherited(arguments);

        this.clipboxNode = this.$.clipbox.hasNode();
        this.wrapperNode = this.$.wrapper.hasNode();
    },

    isReady: function () {
        return this.viewReady;
    },

    activate: function () {
    },

    deactivate: function () {
    },
    
    loadDone: function (cleanHtml) {
        this.$.wrapper.setContent(cleanHtml);
        
        // TODO: add onload handlers to images so we can resize the div
        // Resize should be debounced so we don't resize too often though

        this.fitWidth();

        this.viewReady = true;
        this.doViewReady();
    },

    fitWidth: function (force) {
        var viewWidth = this.hasNode().clientWidth;
        var contentWidth = this.wrapperNode.scrollWidth;

        if (contentWidth > 0 && (contentWidth > viewWidth || force)) {
            this.setZoom(viewWidth / contentWidth);
        } else {
            // force recalc
            this.zoomChanged();
        }
    },

    // start pinch zoom
    gesturestartHandler: function (sender, e) {
        this.centeredZoomStart(e);
        return true;
    },

    // pinch zoom
    gesturechangeHandler: function (sender, e) {
        var gi = this.centeredZoomChange(e);

        // Change zoom if greater than some threshold to prevent jitter
        var delta = Math.abs(gi.zoom - this.zoom);

        if (delta >= 0.01 || gi.zoom >= 1.0) {
            this.setZoom(gi.zoom);
            //this.setScrollPositionDirect(gi.x, gi.y);
        }
        
        return true;
    },

    // end pinch zoom
    gestureendHandler: function (sender, e) {
        return true;
    },
    
    /* this is not really working reliably */
    /*
    dblclickHandler: function () {
        if (this.zoom < 1.0) {
            this.setZoom(1.0);
        } else {
            this.setZoom(this.getMinZoom());
        }
        
        return true;
    },*/

    getMinZoom: function () {
        // calculate every time in case the size changes
        var viewWidth = this.hasNode().clientWidth;
        var contentWidth = this.wrapperNode.scrollWidth;

        if (contentWidth > 0) {
            return Math.min(1.0, Math.max(0.3, viewWidth / contentWidth));
        } else {
            return 1.0;
        }
    },

    getMaxZoom: function () {
        return 1.0;
    },
    
    // hacky support for old versions of enyo
    calcZoomOffset: function() {
        return {left: 0, top: 0};
    },

    getZoomRect: function () {
        var contentHeight = this.wrapperNode.scrollHeight;
        var contentWidth = this.wrapperNode.scrollWidth;

        return {
            left: 0,
            top: 0,
            width: contentHeight * this.zoom,
            height: contentWidth * this.zoom
        };
    },

    zoomChanged: function (oldZoom) {
        var contentWidth = this.wrapperNode.scrollWidth;
        var contentHeight = this.wrapperNode.scrollHeight;

        if (this.allowZoom) {
            this.zoom = Math.max(this.getMinZoom(), Math.min(this.zoom, this.getMaxZoom()));
            
            // Round zoom to an integer pixel length
            if (contentWidth > 0) {
                this.zoom = Math.ceil(contentWidth * this.zoom)/contentWidth;
            }
        } else {
            this.zoom = 1;
        }
        
        if (!this.frameRequest) {
            var callback = this.renderZoom.bind(this);
        
            this.frameRequest = enyo.requestAnimationFrame(callback);
        }
    },
    
    renderZoom: function () {
        if (this.frameRequest) {
            delete this.frameRequest;
        }
    
        this.scaleDiv(this.zoom);
    },
    
    scaleDiv: function (zoom) {
        var contentWidth = this.wrapperNode.scrollWidth;
        var contentHeight = this.wrapperNode.scrollHeight;
    
        if (zoom !== 1.0) {
            this.log("setting zoom to " + this.zoom);
    
            this.$.wrapper.applyStyle("-webkit-transform", "scale(" + zoom + ")");
            this.$.wrapper.applyStyle("-webkit-transform-origin", "0 0");
        } else {
            this.log("setting zoom to 1.0");
        
            this.$.wrapper.applyStyle("-webkit-transform", "none");
            this.$.wrapper.applyStyle("-webkit-transform-origin", "none");
        }

        // Change the size of the container to match the scaled size
        this.$.clipbox.applyStyle("width", Math.ceil(zoom * contentWidth) + "px");
        this.$.clipbox.applyStyle("height", Math.ceil(zoom * contentHeight) + "px");
        
        //console.log("content width: " + contentWidth + ", clip width: " + this.clipboxNode.clientWidth);
        //console.log("content height: " + contentHeight + ", clip height: " + this.clipboxNode.clientHeight);
        
        this.doViewSizeChange();
    },
    
    handleContentChange: function() {
        // recalculate size
        this.zoomChanged();
    },

    mouseholdHandler: function (sender, event) {
        var props = this.findLinkOrImageProperties(event.target, this.hasNode());

        if (props) {
            //console.log("mouse hold on link or image: " + JSON.stringify(props));
            
            this.doInspectElement(event, props);
            return true;
        }
    },
    
    wrapperMouseup: function(sender, event) {
        // Need to record if there was a drag
        this.didDrag = event.didDrag;
    },
    
    wrapperClick: function(sender, event) {
        // Check if there was a drag
        // NOTE: Can't use event.didDrag because it gets cleared during the mouseup
        if (this.didDrag) {
            this.didDrag = false;
            
            // Don't click if there was a drag
            event.preventDefault();
            return true;
        }
    
        var props = this.findLinkOrImageProperties(event.target, this.wrapperNode);
        var url = props && props.linkUrl;
        
        if (url) {
            this.doLinkClick(url, event);
            event.preventDefault();
            return true;
        }
    },

    // find link and/or image (may be both)
    findLinkOrImageProperties: function (inNode, inAncestor) {
        var props; // undefined

        var n = inNode;
        while (n && n != inAncestor) {
            var tagLower = n.tagName.toLowerCase();

            if (tagLower === "a" && n.href) {
                props = props || {};
                props.linkUrl = n.href;

                // exit when we see an anchor tag
                break;
            } else if (tagLower === "img" && n.src) {
                props = props || {};
                props.imageSrc = n.src;

                // keep searching for an anchor tag
            }
            n = n.parentNode;
        }

        return props;
    }
});
