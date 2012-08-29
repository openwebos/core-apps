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
    },
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
        }

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
    },
});

enyo.kind({
    name: "InlineHtmlView",
    kind: "AbstractHtmlView",

    CID_REGEX: /^cid:/i,
    CSS_RULE_REGEX: /\s*([-\w]+)\s*:\s*([^:;]*)?(;|$)/g,
    CSS_UNSAFE_PROPERTY_REGEX: /(^-\w+)|behavior$/i,
    CSS_URL_NOTATION_REGEX: /url\s*\(((?:\\.|.)*?)\)/i,
    VALID_RESOURCE_URL_REGEX: /^https?:/i,
    VALID_LINK_URL_REGEX: /^(https?|mailto):/i,

    create: function () {
        this.inherited(arguments);
    },

    // TODO: make this take a callback since both loading and sanitizing may be asynchronous later
    loadAndSanitize: function (url, contentType) {
        url = url.replace("file://", "");
        
       var unsafeData = palmGetResource(url);
       return this.loadedAndSanitize(unsafeData, contentType);
        
    },
    
    loadedAndSanitize: function(unsafeData, contentType) {
    		
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

    /*sanitizeHtml: function (unsafeHtml) {
        var cidMap = this.cidMap;   
        return HtmlSanitizer.sanitize(unsafeHtml,
            this.mapUrl.bind(this),
            this.mapInlineStyle.bind(this)
        );
      
    },*/
    
    sanitizeHtml: function (unsafeHtml) {
    	   var rEx = new RegExp("<(script|object|embed|iframe)[^>]*>([\\S\\s]*?)<\/(script|object|embed|iframe)>", "gim");
    	   
    	   return unsafeHtml.replace(rEx,"");
    },

    sanitizeText: function (unsafeText) {
        var text = enyo.string.escapeHtml(unsafeText);
        text = text.replace(/\r\n|\n|\r/g, "<br>");

        // TODO: more sophisticated text formatting

        return text;
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
        url: null
    },

    create: function () {
        this.inherited(arguments);

        this.viewReady = false;
    },

    rendered: function () {
        this.inherited(arguments);

        this.clipboxNode = this.$.clipbox.hasNode();
        this.wrapperNode = this.$.wrapper.hasNode();
    },

    isReady: function () {
        return this.viewReady;
    },

    // [public]
    loadUrl: function (url, contentType) {
        if (!url) {
            this.log("no url provided");
            return;
        }
        this.url = url;
        this.contentType = contentType || "text/plain";
        if(window.PalmSystem) {
        	enyo.asyncMethod(this, enyo.bind(this, "loadPage"));
        }
        else {
	        enyo.xhr.request({
				url: url,
				method: "GET",
				callback: enyo.bind(this, "loadPage")
			});
        }
    },
    
    activate: function () {
    },

    deactivate: function () {
    },

    loadPage: function (inSender, inResponse) {
    	
        var cleanHtml;
        if(window.PalmSystem) {
        	cleanHtml = this.loadAndSanitize(this.url, this.contentType);
        }
        else {
        	if(!inResponse || inResponse.responseText === '') {
        		 cleanHtml =  $L("Error opening email.");
        	}
        	else {
        		cleanHtml = this.loadedAndSanitize(inResponse.responseText, this.contentType);
        	}
        }

        this.$.wrapper.setContent(cleanHtml);

        this.fitWidth();

        this.viewReady = true;
        this.doViewReady();
    },

    fitWidth: function () {
        var viewWidth = this.hasNode().clientWidth;
        var contentWidth = this.wrapperNode.scrollWidth;

        if (contentWidth > viewWidth) {
            this.setZoom(viewWidth / contentWidth);
        }
    },

    // start pinch zoom
    gesturestartHandler: function (sender, e) {
        this.centeredZoomStart(e);
    },

    // pinch zoom
    gesturechangeHandler: function (sender, e) {
        var gi = this.centeredZoomChange(e);

        // Change zoom if greater than some threshold to prevent jitter
        var delta = Math.abs(gi.zoom - this.zoom);

        if (delta >= 0.08) {
            this.setZoom(gi.zoom);
            //this.setScrollPositionDirect(gi.x, gi.y);
        }
    },

    // end pinch zoom
    gestureendHandler: function (sender, e) {
    },

    getMinZoom: function () {
        // calculate every time in case the size changes
        var viewWidth = this.hasNode().clientWidth;
        var contentWidth = this.wrapperNode.scrollWidth;

        return Math.max(0.3, viewWidth / contentWidth);
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

    zoomChanged: function () {
        var contentWidth = this.wrapperNode.scrollWidth;
        var contentHeight = this.wrapperNode.scrollHeight;

        this.zoom = Math.max(this.getMinZoom(), Math.min(this.zoom, this.getMaxZoom()));

        //console.log("setting zoom to " + this.zoom);

        this.$.wrapper.applyStyle("-webkit-transform", "scale(" + this.zoom + ")");
        this.$.wrapper.applyStyle("-webkit-transform-origin", "0 0");

        // Change the size of the container to match the scaled size
        this.$.clipbox.applyStyle("width", Math.ceil(this.zoom * contentWidth) + "px");
        this.$.clipbox.applyStyle("height", Math.ceil(this.zoom * contentHeight) + "px");
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
        var props = undefined;

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
