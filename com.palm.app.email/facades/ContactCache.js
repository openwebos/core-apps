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

if (!window.ContactCache) {
    ContactCache = function (size) {
        var contactInfoMap = {};
        var fill = 0;
        var lastClean = Date.now();

        function queryContactsService(emailAddress, callback) {
            ContactsLib.Person.findByEmail(emailAddress, {personType: "rawObject"}).then(
                function (fut) {
                    var toRet = contactInfoMap[emailAddress] = new ContactResult(fut.result); // can be undefined if no records
                    fill++;
                    callback(toRet);
                });
        }

        function cleanCache() {
            console.log("### clean the machine");
            var now = Date.now();
            var threshold = now - ((now - lastClean) / 2);
            var map = contactInfoMap;
            Object.keys(map).forEach(function (key) {
                var entry = map[key];
                if (!entry.hasResult() || entry.getLastAccess() < threshold || entry.getAccessCount < 7) {
                    delete map[key];
                    --fill;
                }
            });
            lastClean = Date.now();
        }

        function getContactInfo(emailAddress, callback) {
            if (fill > size) {
                cleanCache();
            }
            var entry = contactInfoMap[emailAddress];
            if (entry) {
                entry.bumpAccess();
                callback(entry);
                return;
            }
            queryContactsService(emailAddress, callback);
        }

        function clearCache() {
            var map = contactInfoMap;
            Object.keys(map).forEach(function (key) {
                delete map[key];
            });
            fill = 0;
        }

        return {
            lookupContact: getContactInfo,
            clearCache: clearCache
        }
    };
}


if (!window.ContactResult) {
    ContactResult = function (contact) {
        var DEFAULT_SENDER_IMAGE = '../images/detail_avatar.png';

        var STATUS_OFFLINE = "offline";
        var STATUS_ONLINE = "online";
        var STATUS_NO_IM_ACCOUNT = "noimaccount";
        var accessCount = 1;
        var lastAccess = Date.now();

        var contactName = "";
        var photoPath = "";
        var imStatus = "";

        function getName() {
            if (!contact) {
                return undefined;
            }
            // cache our work
            if (contactName !== null) {
                contactName = contactName || contact.displayName || (contactRecordHasNames() ? formatContactName() : null);
            }
            return contactName || undefined;
        }

        function hasResult() {
            return !!contact;
        }

        function contactRecordHasNames() {
            return (contact && contact.name && (contact.name.getGivenName() || contact.name.getFamilyName() || contact.name.getHonorificSuffix() || contact.name.getHonorificPrefix()));
        }

        function formatContactName() {
            var personAtts = {};
            var name = contact.name;
            // use spaces for missing values in order to properly collapse in regex
            // also use personAtts obj so that we don't modify original record
            personAtts.prefix = name.getHonorificPrefix() || " ";
            personAtts.firstName = name.getGivenName() || " ";
            personAtts.lastName = name.getFamilyName() || " ";
            personAtts.suffix = name.getHonorificSuffix() || " ";
            return EmailApp.Util.interpolate($L("#{prefix} #{firstName} #{lastName} #{suffix}"), personAtts).trim().replace(/\s+/g, " ");
        }

        function lookupOnlineStatus(callback) {
            if (!contact) {
                callback(STATUS_NO_IM_ACCOUNT);
                return;
            }
            _checkLoginState(callback);
        }

        function lookupPhoto(callback) {
            if (photoPath) {
                callback(photoPath);
                return;
            }

            var photos = contact && contact.getPhotos();
            if (photos) {
                // PersonPhotos.TYPE.BIG // "type_big"
                // PersonPhotos.TYPE.SQUARE // "type_square"
                photos.getPhotoPath("type_square").then(function (futo) {
                    photoPath = futo.result || DEFAULT_SENDER_IMAGE;
                    callback(photoPath);
                });
            } else {
                photoPath = DEFAULT_SENDER_IMAGE;
                callback(photoPath);
            }
        }


        function bumpAccess() {
            accessCount++;
            lastAccess = Date.now();
        }

        function _checkLoginState(callback) {
            var request = EmailApp.Util.callService("palm://com.palm.tempdb/find", {
                    query: {from: "com.palm.imbuddystatus:1", "where": [
                        {prop: "personId", "op": "=", "val": contact.getId()}
                    ]}
                },
                function (results) {
                    _determineImStatus(results, callback);
                });
        }

        /**
         * Determines online/offline/noaccount status for set of contact list results.
         * note that an account needs to be logged in for proper online/offline status
         * if an contact is found for an account that is currently signed out, noimaccount
         * will be the determined status.
         * Handler for _checkLoginState method.
         * Currently does not handle display of recipient statuses
         */
        function _determineImStatus(imAccountList, callback) {
            if (!imAccountList || !imAccountList.results || !imAccountList.results.length) {
                // user doesn't have any corresponding IM accounts
                // TODO: refac once real assets are here
                callback(STATUS_NO_IM_ACCOUNT);
                return;
            }

            var index = 0,
                acct = null;
            results = imAccountList.results;

            var isOnline = false;
            for (index = 0, len = results.length; index < len; ++index) {
                acct = results[index];
                /*
                 * MESSAGING_IMBUDDYSTATUS_AVAILABLE: 0,
                 * MESSAGING_IMBUDDYSTATUS_AWAY: 2,
                 * MESSAGING_IMBUDDYSTATUS_INVISIBLE: 3,
                 * MESSAGING_IMBUDDYSTATUS_OFFLINE: 4
                 */
                if (!acct.offline && acct.availability < 4) { //TODO : make this a messaging-side constant)
                    isOnline = true;
                    break;
                }
            }
            callback(isOnline ? STATUS_ONLINE : STATUS_OFFLINE);
        }

        function getLastAccess() {
            return lastAccess;
        }

        function getAccessCount() {
            return accessCount;
        }

        return {
            getName: getName,
            hasResult: hasResult,
            lookupPhoto: lookupPhoto,
            lookupOnlineStatus: lookupOnlineStatus,
            bumpAccess: bumpAccess,
            getLastAccess: getLastAccess,
            getAccessCount: getAccessCount
        }
    };
}


