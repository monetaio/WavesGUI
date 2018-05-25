(function () {
    'use strict';

    function AccountListController($scope, $window, constants, accountService, dialogService, loginContext) {
        var list = this;
        list.accounts = [];
        list.removeCandidate = {};

        list.removeAccount = removeAccount;
        list.createAccount = createAccount;
        list.importAccount = importAccount;
        list.signIn = signIn;
        list.showRemoveWarning = showRemoveWarning;
        list.showExportDialog = showExportDialog;
        list.cleanupExportUrl = cleanupExportUrl;

        accountService.getAccounts().then(function (accounts) {
            list.accounts = accounts;
        });

        function showRemoveWarning(index) {
            list.removeIndex = index;
            list.removeCandidate = list.accounts[index];
            dialogService.open('#account-remove-popup');
        }

        function removeAccount() {
            if (list.removeCandidate) {
                accountService.removeAccountByIndex(list.removeIndex).then(function () {
                    list.removeCandidate = undefined;
                    list.removeIndex = undefined;
                });
            }
        }

        function createAccount() {
            loginContext.notifyGenerateSeed($scope);
        }

        function importAccount() {
            loginContext.showInputSeedScreen($scope);
        }

        function signIn(account) {
            loginContext.showLoginScreen($scope, account);
        }

        function showExportDialog() {
            var dump = {
                version: constants.CLIENT_VERSION,
                storage: {
                    accounts: list.accounts
                }
            };

            var content = JSON.stringify(dump);
            var blob = new Blob([ content ], { type: "text/plain" });
            list.exportUrl = URL().createObjectURL(blob);

            dialogService.open('#export-accounts-popup');
        }

        function URL() {
            return ($window.URL || $window.webkitURL);
        }

        function cleanupExportUrl() {
            if (list.exportUrl) {
                URL().revokeObjectURL(list.exportUrl);
                list.exportUrl = null;
            }
        }

        function exportAccounts() {
            var dump = {
                version: constants.CLIENT_VERSION,
                storage: {
                    accounts: list.accounts
                }
            };

            console.log(dump);
        }
    }

    AccountListController.$inject = ['$scope', '$window', 'constants.application',
        'accountService', 'dialogService', 'loginContext'];

    angular
        .module('app.login')
        .controller('accountListController', AccountListController);
})();
