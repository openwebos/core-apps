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
 NOTE: This module runs a set of test cases allows creat

 TODO: Allow tests to run asynchronously.
 TODO: Add support for deferred test responses.
 */
function TestRunner(testCases) {
    var pass = true
        , results = []
        ;
    for (var component, method, methodName, testCase, tests, i = 0, j = testCases.length; i < j; ++i) {
        testCase = testCases [i];
        if (!testCase) {
            continue;
        }
        component = testCase.component;
        methodName = testCase.method;
        methodName && component && (method = component [methodName]);
        tests = testCase.tests;

        if (!component || !method || !tests) {
            console.error("Invalid test case: component: " + component + ", method: " + methodName + ", tests: " + tests);
            continue;
        }

        for (var result, k = 0, m = tests.length; k < m; ++k) {
            result = tests [k];
            result.name = methodName + " : " + result.name;
            result.pass = result.pass === method.apply(component, result.data);
            !result.pass && console.error([result.name, result]);
            results.push(result);
            pass = pass && result.pass;
        }
    }

    var testResults = {pass: pass, results: results};
    console.log(testResults);
    return testResults;
}
