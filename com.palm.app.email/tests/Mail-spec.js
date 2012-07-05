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

/*global describe, it, expect, waits, waitsFor, runs, spyOn, enyo, cacheMail */

//FIXME TODO:
// asynchronous service calls comming back in odd orders
// asynchronous service calls timing out

describe('Mail', function () {

    beforeEach(function () {
        mockServices();
    });

    // test of the test framework: is enyo application the same namespace in this spec as in the EmailAppLaunch executed before this.
    it('still has launcher', function () {
        expect(enyo.application.launcher).toBeDefined();
        expect(enyo.application.mailApp).toBeDefined();
    });
    it('handles account data', function () {
        var app = enyo.application;
        var mailWindow = enyo.windows.fetchWindow("mail");  // Is there a way to use this to get mailApp, instead of through a global? Not otherwise used yet.
        var mailApp = app.mailApp;
        // FIXME: here we would reach in to try various permutations of accounts, folders, and emails.
        // How? Probably some spy manipulation of app.accounts, app.folderProcessor, and app.emailProcessor TBD.
        // FIXME: exercise change machinery slightly upstream of this.
        // FIXME: make downstream stuff update accordingly, and check the results. (Untangle the early bail in refresh?)
        waitsFor(function () {
            var folders = enyo.application.mailApp.$.accounts.getFoldersObjByIndex(0);
            // FIXME: what a horrible test for "ready"! But without this, the code below will accomplish nothing.
            return folders && folders._allFolders.length;
        }, "folder initialization", 2000);

        runs(function () {
            // It is not clear to me how this is supposed to be done. Reaching into an underscore function doesn't feel healthy.
            app.accounts._accountsChanged([
                // FIXME: having zero accounts spins.
                {_id: "fake-account-1", alias: "Palm", username: "fakeuser@fakedomain.com", templateId: "com.palm.imap"},
                {_id: "fake-account-2", alias: "Palm 2", username: "otherfakeuser@fakedomain.com", templateId: "com.palm.imap"},
                {_id: "fake-account-3", alias: "Palm 3", username: "fakeuser3@fakedomain.com", templateId: "com.palm.imap"}
            ]);
            // Old mailAcccounts are retained, so the major side effects seems to be to undefined accounts._onReady. Maybe it needs a deleted:true flag?
            // Furthermore, including this does not make Palm 3 folders show up in Favorites. FIXME
            // app.accounts._mailAccountsChanged ([
            //     {accountId: "fake-account-1", inboxFolderId: "++HFcNuUiAGz9mIS", outboxFolderId: "++HFcNuUiAGz9mIS"},
            //     {accountId: "fake-account-2", inboxFolderId: "++HFcNuUiAGz9mIS", outboxFolderId: "++HFcNuUiAGz9mIS"},
            //     {accountId: "fake-account-3", inboxFolderId: "++HFcNuUiAGz9mIS", outboxFolderId: "++HFcNuUiAGz9mIS"}
            // ]);
        });
        // The above accountsChanged causes lots of asynchronous stuff to happen. Wait for it to settle.
        waitsFor(function () {
            var folders = enyo.application.mailApp.$.accounts.getFoldersObjByIndex(0);
            // FIXME: what a horrible test for "ready"! But without this, the code below will accomplish nothing.
            return folders && folders._allFolders.length;
        }, "folder initialization", 2000);
        // FIXME: There's something involving folders that doesn't happen when running !onDevice or !PalmSystem, regardless of hasServiceCallbacks.
        // Alas, I forgot to document it, and now I can't remember where it was.
        // As a result, we have to select a folder manually. This picks the first one, doing the same thing as clicking it would.
        runs(function () {
            mailApp.displayFirstFolder(); // FIXME: Why is this needed? It seems it often happens as a result of the accountsChanged, but not reliably.
            expect(undefined).toBe(undefined); //FIXME: check something real
        });
    });
    it('always has the "all inboxes" favorite', function () {
        var favoritesAccount = enyo.application.mailApp.$.accounts.getFoldersObjByIndex(0);
        expect(favoritesAccount.account.isFavoritesAccount).toBe(true); // sanity check

        // clear out the folders
        favoritesAccount.gotFavoriteFolders([]);
        var items = favoritesAccount._allFolders;
        items.forEach(function (folder) {
            // only applies to user-added folders
            //expect(folder.favorite).toBe(true);
            // only applies to system-added folders
            expect(folder.favoriteFoldersType).toBeDefined();
        });
    });
    it('accepts a favorite folder', function () {
        var favoritesAccount = enyo.application.mailApp.$.accounts.getFoldersObjByIndex(0);
        expect(favoritesAccount.account.isFavoritesAccount).toBe(true); // sanity check

        // clear out the folders
        favoritesAccount.gotFavoriteFolders([
            {_id: "fake-account-1-fake-folder-id", displayName: "Inbox", accountId: "fake-account-1", favorite: true}
        ]);
        var items = favoritesAccount._allFolders;

        var foundFolder = false;
        items.forEach(function (folder) {
            if (folder.favorite) {
                // only applies to user-added folders
                expect(folder._id).toBe("fake-account-1-fake-folder-id");
                foundFolder = true;
            } else {
                // only applies to system-added folders
                expect(folder.favoriteFoldersType).toBeDefined();
            }
        });

        expect(foundFolder).toBe(true);
    });
    it('resets to initial folders', function () {
        var favoritesAccount = enyo.application.mailApp.$.accounts.getFoldersObjByIndex(0);
        // this is mostly to put the app back in its initial state
        // trust that cacheMail.getFavoriteFolders is that state
        cacheMail.getFavoriteFolders(function (folders) {
            favoritesAccount.gotFavoriteFolders(folders);
        });

        var items = favoritesAccount._allFolders;
        expect(items.length).toBeGreaterThan(0); // expect something
    });
    it('is not initially in multiselect mode', function () {
        var mailControls = enyo.application.mailApp.$.mail.controls;
        var multiselectHeader = mailControls.filter(
            function (e) {
                return e.name === "multiselectHeader";
            })[0];
        expect(multiselectHeader.showing).toBe(false);
    });
    it('can enter multiselect mode', function () {
        var mailApp = enyo.application.mailApp;
        mailApp.$.mail.editClick();
        var mailControls = mailApp.$.mail.controls;
        var multiselectHeader = mailControls.filter(
            function (e) {
                return e.name === "multiselectHeader";
            })[0];
        var searchHeader = mailControls.filter(
            function (e) {
                return e.name === "searchHeader";
            })[0];
        expect(multiselectHeader.showing).toBe(true);
        expect(searchHeader.showing).toBe(false);
    });
    it('has proper selection text', function () {
        var mailApp = enyo.application.mailApp;
        var text = mailApp.$.mail.$.multiselectHeaderText.getContent();
        expect(text).toBe("Select Items...");
    });
    it('can select a single item', function () {
        var index = 0;
        var mailApp = enyo.application.mailApp;

        waitsFor(function () {
            return mailApp.$.mail.$.mailList.fetch(index) !== undefined;
        }, 1000, "item to be loaded");

        runs(function () {
            mailApp.$.mail.itemClick(null, {rowIndex: index});

            var text = mailApp.$.mail.$.multiselectHeaderText.getContent();
            expect(text).toBe("1 item selected...");
        });
    });
    it('can exit multiselect mode', function () {
        var mailApp = enyo.application.mailApp;
        mailApp.$.mail.multiselectDone();
        var mailControls = mailApp.$.mail.controls;
        var multiselectHeader = mailControls.filter(
            function (e) {
                return e.name === "multiselectHeader";
            })[0];
        var searchHeader = mailControls.filter(
            function (e) {
                return e.name === "searchHeader";
            })[0];
        expect(multiselectHeader.showing).toBe(false);
        expect(searchHeader.showing).toBe(true);
    });
    it('can select two items', function () {
        var mailApp = enyo.application.mailApp;
        var mailControls = mailApp.$.mail.controls;
        mailApp.$.mail.editClick();

        var index = 0;
        waitsFor(function () {
            var multiselectHeader = mailControls.filter(
                function (e) {
                    return e.name === "multiselectHeader";
                })[0];
            return multiselectHeader.showing;
        }, 1000, "multiselect header to be loaded");

        waitsFor(function () {
            var mailList = mailApp.$.mail.$.mailList;
            return mailList.fetch(index) !== undefined;
        }, 1000, "item " + index + " to be loaded");

        runs(function () {
            mailApp.$.mail.itemClick(null, {rowIndex: index});
        });

        waitsFor(function () {
            var text = mailApp.$.mail.$.multiselectHeaderText.getContent();
            return text === "1 item selected...";
        }, 1000, "selection header update");

        runs(function () {
            index++; // select the next mail too
            mailApp.$.mail.itemClick(null, {rowIndex: index});

            var text = mailApp.$.mail.$.multiselectHeaderText.getContent();
            expect(text).toBe("2 items selected...");

            mailApp.$.mail.multiselectDone();
        });
    });
    it('displays transport errors', function () {
        var mail = enyo.application.mailApp.$.mail;
        var errText = "Isn't this fun?";
        // First change the mockDb to have an account error, and wait for it to take effect.
        var done;
        runs(function () {
            EmailApp.Util.callService('palm://com.palm.db/merge',
                {query: {from: "com.palm.mail.account:1",
                    where: [
                        {prop: "accountId", op: "=", val: "fake-account-2"}
                    ]},
                    props: {error: {errorCode: 43000, errorText: errText}}},
                function (result) {
                    done = true;
                });
        });
        waitsFor(function () {
            return done;
        }, "db callback", 500);
        // Now do the popup and make sure it includes the error text.
        runs(function () {

            mail.errorClick();
            expect(mail.$.folderErrorPopup.caption).toBe("Error");
            expect(mail.$.folderErrorPopup.items[0].components[0].content).toMatch(errText); // FIXME: provide a better test hook.
            mail.$.folderErrorPopup.closeClick();
        });
        waitsFor(function () {
            return !(mail.$.folderErrorPopup.getShowing());
        });
    });
});
