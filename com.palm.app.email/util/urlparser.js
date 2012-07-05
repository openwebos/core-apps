/**
 * @projectDescription     Poly9's polyvalent URLParser class
 *
 * @author    Denis Laprise - denis@poly9.com - http://poly9.com
 * @version    0.1
 * @namespace    Poly9
 *
 * Usage: var p = new Poly9.URLParser('http://user:password@poly9.com/pathname?arguments=1#fragment');
 * p.getHost() == 'poly9.com';
 * p.getProtocol() == 'http';
 * p.getPathname() == '/pathname';
 * p.getQuerystring() == 'arguments=1';
 * p.getFragment() == 'fragment';
 * p.getUsername() == 'user';
 * p.getPassword() == 'password';
 *
 * See the unit test file for more examples.
 * URLParser is freely distributable under the terms of an MIT-style license.
 */

if (typeof Poly9 == 'undefined') {
    var Poly9 = {};
}

/**
 * Creates an URLParser instance
 *
 * @classDescription    Creates an URLParser instance
 * @return {Object}    return an URLParser object
 * @param {String} url    The url to parse
 * @constructor
 * @exception {String}  Throws an exception if the specified url is invalid
 */
Poly9.URLParser = function (url) {
    this._fields = {'Username': 5, 'Password': 6, 'Port': 7, 'Protocol': 2, 'Host': 7, 'Pathname': 9, 'URL': 0, 'Querystring': 10, 'Fragment': 11};
    this._values = {};
    this._regex = null;
    this.version = 0.1;
    this._regex = /^((\w+):(\/\/)?)?((\w+):?(\w+)?@)?([^\/\?:]+):?(\d+)?(\/?[^\?#]+)?\??([^#]+)?#?(\w*)/;
    for (var f in this._fields) {
        this['get' + f] = this._makeGetter(f);
    }
    if (typeof url != 'undefined') {
        this._parse(url);
    }
}

/**
 * @method
 * @param {String} url    The url to parse
 * @exception {String}     Throws an exception if the specified url is invalid
 */
Poly9.URLParser.prototype.setURL = function (url) {
    this._parse(url);
}

Poly9.URLParser.prototype._initValues = function () {
    for (var f in this._fields) {
        this._values[f] = '';
    }
}

Poly9.URLParser.prototype._parse = function (url) {
    this._initValues();
    var r = this._regex.exec(url);
    if (!r) {
        throw "DPURLParser::_parse -> Invalid URL"
    }
    for (var f in this._fields) {
        if (typeof r[this._fields[f]] != 'undefined') {
            this._values[f] = r[this._fields[f]];
        }
    }
}

Poly9.URLParser.prototype._makeGetter = function (field) {
    return function () {
        return this._values[field];
    }
}

