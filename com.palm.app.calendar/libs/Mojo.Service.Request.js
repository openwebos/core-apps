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
/*
 * This file has functions related to documenting the Mojo Services.
 * Note this supports both the older deprecated interface (palmService()) and the
 * new interface (PalmServiceBridge object).
 *
 * Copyright 2009 Palm, Inc.  All rights reserved.
 */



/*globals PalmServiceBridge _ */

// Define Mojo namespace if it doesn't exist:
!this.Mojo && (Mojo = {});

/**
 * Mojo.Service
 * API to interact with webOS device services.
 *
 * A service is an on-device "server" for any resource, data, or configuration
 * that can be exposed for developers to use with their applications.
 * They are called "services" instead of servers so that it was clear that
 * they were on the device rather than "in the cloud".
 *
 * The Web is built on Uniform Resource Identifiers (URIs), so Palm uses
 * this scheme for identifying resources. Here is an example:
 *
 *      palm://com.palm.contacts/
 *
 * This is the name of the Contacts service in the system. Each service is
 * then able to provide methods, with an optional category, for clients to
 * invoke.
 *
 * It becomes the responsibility of the service to provide both service names
 * to the service and maintain backwards compatibility. Helpers in the APIs
 * aid this process.
 **/
Mojo.Service = {};

/**
 * class Mojo.Service.Request
 *
 * All data passed in a request to a service, and all data returned
 * from a service is encoded as a JSON object.
 * The exact names and values passed in and out are service-dependent,
 * but some conventions must be followed for a service to be considered correct and conforming.
 *
 *
 * If a client wants to get the system time of the device, they would make a
 * request to
 *
 *      palm://com.palm.systemservice/getSystemTime
 *
 * with the optional JSON argument `{subscribe: true}` if they wish to
 * subscribe for updates. "Subscribing" means that the request will return to the `onSuccess`, `onFailure`, and `onComplete` calls
 * specified in the initial request each time. Subscribed requests will return with a subscriber id.
 *
 * If the request is successful, the returned result of this request would be:
 *
 *      {
 *          "localtime": localTimeInSecs,
 *          "offset", offsetFromUTCInMins,
 *          "timezone": timeZone
 *      }
 *
 * The `onSuccess` callback is called back during a successful request,
 * `onFailure` is called for a failed request (either a failure at the dbus or the service side will cause this),
 * and `onComplete`, if specified, is always called last after a request returns.
 *
 *
 * Or for the request in code (this would be placed in an application scene assistant):
 *
 *         this.controller.serviceRequest('palm://com.palm.systemservice', {
 *             method: 'getSystemTime',
 *             parameters: { subscribe: true },
 *             onSuccess: this.handleResponse // this is a callback function
 *                                            // you would declare in the scene assistant
 *         });
 *
 * When creating a [[Mojo.Service.Request]] in the manner above, request references are managed by the scene
 * and are removed on completion of the request, unless the request has `subscribe: true`,
 * in which case the requests are cleaned up when the scene is popped.
 *
 * If the request needs to be retained beyond the lifetime of the scene, create a new [[Mojo.Service.Request]]
 * and manage the request object yourself.
 **/

/**
 * new Mojo.Service.Request(url, options, requestOptions)
 * - url (String): URL of the service request as defined in the developer guide
 * - options (Object): hash value containing the options for the specific service request call
 * - requestOptions (boolean | Object): either true, meaning to resubscribe automatically on error,
 *   or an object with a resubscribe property of true or false
 *
 * It's advisable to explicitly cancel a service request that you have created this way to ensure that it is removed.
 *
 * JS Example
 * ----------
 *
 *         var myServiceObject = new Mojo.Service.Request('palm://com.palm.systemservice', {
 *             method: 'getSystemTime',
 *             parameters: { subscribe: true },
 *             onSuccess: this.handleSystemServiceResponse
 *         }, {
 *            resubscribe: true
 *         });
 *
 *         //----- handle systemservice and once complete -----
 *
 *         myServiceObject.cancel();
 **/

Mojo.Service.Request = function Request(url, options, requestOptions) {
    this.options = {};
    enyo.mixin(this.options, options);
    this.success = this.options.onSuccess || Mojo.doNothing;
    this.complete = this.options.onComplete || Mojo.doNothing;
    this.loggingEnabled = this.options.requestLoggingEnabled;
    if (requestOptions !== undefined) {
        if (typeof requestOptions !== "object") {
            requestOptions = {
                resubscribe: !!requestOptions
            };
        }
    } else {
        requestOptions = {};
    }
    this.requestOptions = requestOptions;
    this.onFailure = this.options.onFailure;
    delete this.options.requestLoggingEnabled;
    this.request(url);
    this.cancelled = false;
};


Mojo.Service.Request.prototype.log = function log() {
    if (this.loggingEnabled) {
        Mojo.Log.info.apply(Mojo, arguments);
    }
};

Mojo.Service.Request.prototype.failed = function failed(data) {
    if (this.onFailure) {
        this.onFailure(data, this);
    }
    if (this.requestOptions.resubscribe && !this.cancelled) {
        enyo.bind(this, function () {
            this.requestObject = Mojo.Core.Service.createRequest(
                this.fullUrl, this.parameters, this.response);
        });
        // delay resubscribe a random amount more than 10 seconds
        setTimeout(f, (this.kResubscribeDelayMin + Math.random() *
            this.kResubscribeDelayRandom) * 1000);
    }
};

Mojo.Service.Request.prototype.request = function request(url) {
    var options = this.options;
    //take the identifier and the method and call them
    var fullUrl = url;
    //if there is a method in options, append it, because it
    //means it wasn't specified in the url
    if (options.method) {
        if (url.charAt(url.length - 1) != "/") {
            fullUrl += "/";
        }
        fullUrl += options.method;
    }
    //pull out the parameters
    this.parameters = options.parameters || {};
    this.response = enyo.bind(this, this.response);
    this.fullUrl = fullUrl;
    this.requestObject = Mojo.Core.Service.createRequest(
        fullUrl, this.parameters, this.response);
};

/**
 * Mojo.Service.Request#cancel() -> undefined
 *
 * Method to cancel a service request. When creating a service request object, use this
 * method to cancel the request, or prior to deleting the object associated with the request.
 **/
Mojo.Service.Request.prototype.cancel = function cancel() {
    if (this.requestObject) {
        this.log("Canceling a request.");
        this.cancelled = true;
        this.log("was this cancelled " + this.cancelled);
        this.requestObject.cancel();
        this.requestObject = undefined;
    } else {
        this.log("Canceling a request a second time.");
    }
};

Mojo.Service.Request.prototype.response = function response(respObject) {
    this.log("was this cancelled " + this.cancelled);
    if (this.cancelled) {
        this.log("WARNING: this request was cancelled, so no data is returned.");
        return;
    }

    //determine if the response was success or failure, always call onComplete
    if (respObject.errorCode || respObject.returnValue === false) { /*TODO: remove this second check; only there until media fixes their services */
        this.failed(respObject);
    } else {
        this.success(respObject, this); //pass this in so we can cancel it if need be
    }
    this.complete && this.complete(respObject, this); //pass this in so we can cancel it if need be
};

Mojo.Service.Request.prototype.kResubscribeDelayMin = 10;
Mojo.Service.Request.prototype.kResubscribeDelayRandom = 10;
