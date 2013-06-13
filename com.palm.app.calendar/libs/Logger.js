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
/*
 * Author	: Michael Lee
 * Created	: 2010.08.03
 * Modified	: 2010.12.18
 *
 * Description:
 *
 *		Simple console wrapper that supports prepending and appending messages
 *		with static text.
 *
 *		TODO: Accept either string or function, if function execute for result.
 *
 */



/*jslint devel:true, laxbreak:true */
/*global error:true, info:true, log:true, Logger:true, LoggerConfig, warn:true */

(function (scope) {

    function logger(config, msg) {
        // config = { level:string, prepend:string, msg:string, append:string }

        (console [ config.level || "log" ]([
            config.prepend || "\n\t",
            msg,
            config.append || "\n\n"
        ].join("")
        ));
    }

    function makeLogger(config) {
        var thi$ = this,
            unshift = Array.prototype.unshift;
        return function () {
            logger.apply(thi$, unshift.apply(arguments, config));
        };
        // return logger.bind (this, config);
    }

    function makeLogs(logger) {
        if (!logger) {
            return;
        }

        var config = logger.config,
            host = logger.host || scope,
            Logger = scope.Logger;

        host.error = Logger((config.level = "error"    ) && config);
        host.info = Logger((config.level = "info"    ) && config);
        host.log = Logger(config);
        host.warn = Logger((config.level = "warn"    ) && config);
    }

    //	Define the public Logger type that wraps console or a place-holder
    //	function that does nothing:
    scope.Logger = typeof console != "undefined" ? makeLogger : function () {
        return function () {
        };
    };

    if (!!scope.LogsConfig && (Array == scope.LogsConfig.constructor)) {
        for (var loggers = scope.LogsConfig, i = loggers.length; i--;) {
            makeLogs(loggers[i]);
        }
    }
})(this);
