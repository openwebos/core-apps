// Copyright Michael Anthony Puls II, http://shadow2531.com/
// Distributed under the Boost Software License, Version 1.0.
// See accompanying file LICENSE_1_0.txt or copy at
// http://boost.org/LICENSE_1_0.txt .

function MailtoURIParser(inuri) {
    var uri, nuri, to, dto, subject, dsubject, body, dbody, cc, dcc, bcc, dbcc;
    evalx(inuri);
    this.setURI = function (inuri) {
        evalx(inuri);
    };
    this.getURI = function () {
        return uri;
    };
    this.getNormalizedURI = function () {
        return nuri;
    }
    this.getEncodedTO = function () {
        return to;
    };
    this.getDecodedTO = function () {
        return dto;
    };
    this.getEncodedSubject = function () {
        return subject;
    };
    this.getDecodedSubject = function () {
        return dsubject;
    }
    this.getEncodedBody = function () {
        return body;
    };
    this.getDecodedBody = function () {
        return dbody;
    };
    this.getEncodedCC = function () {
        return cc;
    };
    this.getDecodedCC = function () {
        return dcc;
    };
    this.getEncodedBCC = function () {
        return bcc;
    };
    this.getDecodedBCC = function () {
        return dbcc;
    };

    // %w = original uri
    // %n = normalized uri (mailto URI with just the basic hnames with no duplicate hnames)
    // %t = decoded TO value
    // %T = encoded TO value
    // %s = decoded Subject value
    // %m = deocded Body value
    // %M = encoded Body value
    // %c = decoded CC value
    // %C = encoded CC value
    // %b = decoded BCC value
    // %B = encoded BCC value
    // %% = %
    // An invalid %key or a % at the end of the string is treated literally.

    // By example:
    // resolveCommandFormatString("%T") would return the value of the to string.
    // resolveCommandFormatString("%%") would return %.

    this.resolveCommandFormatString = function (s) {
        var ident = '%';
        var ret = "";
        for (var i = 0; i < s.length; ++i) {
            var c = s.charAt(i); // need to use charAt(i) instead of s[i] for IE's sake
            if (c == ident && i + 1 < s.length) {
                var next = s.charAt(i + 1);
                if (next == ident) {
                    ret += ident;
                } else if (next == 'w') {
                    ret += uri;
                } else if (next == 'n') {
                    ret += nuri;
                } else if (next == 'T') {
                    ret += to;
                } else if (next == 't') {
                    ret += dto;
                } else if (next == 'S') {
                    ret += subject;
                } else if (next == 's') {
                    ret += dsubject;
                } else if (next == 'M') {
                    ret += body;
                } else if (next == 'm') {
                    ret += dbody;
                } else if (next == 'C') {
                    ret += cc;
                } else if (next == 'c') {
                    ret += dcc;
                } else if (next == 'B') {
                    ret += bcc;
                } else if (next == 'b') {
                    ret += dbcc;
                } else {
                    ret += c;
                    ret += next;
                }
                ++i;
            } else {
                ret += c;
            }
        }
        return ret;
    };
    function decodex(s) {
        try {
            return decodeURIComponent(s).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        } catch (x) {
            return s;
        }
    }

    function encodex(s) {
        try {
            return encodeURIComponent(s.replace(/\n/g, "\r\n"));
        } catch (x) {
            return s;
        }
    }

    // Split the parsable data and store it. Rules are from http://shadow2531.com/opera/testcases/mailto/rfc2368-3.html
    // For to, cc and bcc: Join all non-empty hvalues by %2C%20 and decode
    // For body: Join the first non-empty hvalue and all hvalues (even if they're empty) after that with %0D%0A and decode
    // For subject: Use only the last subject hvalue (even if it's empty and even if a previous one is not) and decode

    function storeData(parseable) {
        to = subject = body = cc = bcc = "";
        var hlist = parseable.split('&');
        for (var i = 0; i < hlist.length; ++i) {
            var eq = hlist[i].indexOf("=");
            if (eq == -1) {
                continue;
            }
            var hname = hlist[i].substring(0, eq).toLowerCase();
            if (hname == "to") {
                var value = hlist[i].substr(eq + 1);
                if (value != "") {
                    if (to != "") {
                        to += "%2C%20";
                    }
                    to += value;
                }
            } else if (hname == "cc") {
                var value = hlist[i].substr(eq + 1);
                if (value != "") {
                    if (cc != "") {
                        cc += "%2C%20";
                    }
                    cc += value;
                }
            } else if (hname == "bcc") {
                var value = hlist[i].substr(eq + 1);
                if (value != "") {
                    if (bcc != "") {
                        bcc += "%2C%20";
                    }
                    bcc += value;
                }
            } else if (hname == "subject") {
                subject = hlist[i].substr(eq + 1);
            } else if (hname == "body") {
                var value = hlist[i].substr(eq + 1);
                if ((value == "" && body == "") == false) {
                    if (body != "") {
                        body += "%0D%0A";
                    }
                    body += value;
                }
            }
        }
        dto = decodex(to);
        dsubject = decodex(subject);
        dbody = decodex(body);
        dcc = decodex(cc);
        dbcc = decodex(bcc);

        // Recreate the encoded values from the decoded ones to fix any chars that should not be encoded and fix ones that should, but are not.
        to = encodex(dto);
        subject = encodex(dsubject);
        body = encodex(dbody);
        cc = encodex(dcc);
        bcc = encodex(dbcc);
    }

    // Whenever a URI is set, if it's a mailto URI, parse and store the data.
    // If it's not a mailto URI, reset the data.  setURI("") can be used to
    // clear the data.

    function evalx(inuri) {
        if (inuri.search(/mailto:/i) == 0) {
            // Create parseable data from the mailto URI.
            var parseable = inuri.substr(4);
            parseable = parseable.replace(/\:/, '=');
            parseable = parseable.replace(/\?/, '&');
            storeData(parseable);
            uri = inuri; // Store original uri as-is.
            // Create a normalized mailto URI with just the basic hnames and no duplicate hnames (for old clients).
            nuri = "mailto:";
            nuri += to;
            nuri += "?subject=";
            nuri += subject;
            nuri += "&body=";
            nuri += body;
            nuri += "&cc=";
            nuri += cc;
            nuri += "&bcc=";
            nuri += bcc;
        } else {
            uri = nuri = "mailto:";
            to = dto = subject = dsubject = body = dbody = cc = dcc = bcc = dbcc = "";
        }
    }
}