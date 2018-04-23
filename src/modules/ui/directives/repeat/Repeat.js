(function () {
    'use strict';

    const directive = function (utils, decorators) {

        const reg = /^\s*([\s\S]+?)\s+in\s+([\s\S]+?)(?:\s+as\s+([\s\S]+?))?(?:\s+track\s+by\s+([\s\S]+?))?\s*$/;

        return {
            restrict: 'A',
            multiElement: true,
            transclude: 'element',
            priority: 1000,
            terminal: true,
            $$tlb: true,
            /**
             * @param {JQuery} $element
             * @param {object} $attr
             * @return {*}
             */
            compile: function ($element, $attr) {
                const expression = $attr.wRepeat;
                const tsUtisls = require('ts-utils');
                const match = expression.match(reg);

                if (!match || !(match[1] && match[2] && match[4])) {
                    throw Error(`Parse data-pattern error! ${expression}`);
                }

                /**
                 * @param {$rootScope.Scope} $scope
                 * @param {JQuery} $comment
                 * @param {object} $attr
                 * @param {*} ctrl
                 * @param {function} $transclude
                 */
                return function ($scope, $comment, $attr, ctrl, $transclude) {

                    class Repeat {

                        constructor() {
                            /**
                             * @type {Array}
                             * @private
                             */
                            this._list = [];
                            /**
                             * @type {Array}
                             * @private
                             */
                            this._visibleList = [];
                            /**
                             * @type {string}
                             * @private
                             */
                            this._itemDataKey = match[1];
                            /**
                             * @type {string}
                             * @private
                             */
                            this._listKey = match[2];
                            /**
                             * @type {string}
                             * @private
                             */
                            this._idKey = match[4].replace(`${match[1]}.`, '');
                            /**
                             * @type {string}
                             * @private
                             */
                            this._itemsHash = Object.create(null);
                            /**
                             * @type {HTMLElement}
                             * @private
                             */
                            this._node = $comment.get(0).parentNode;

                            $scope.$watchCollection(this._listKey, (collection) => {
                                this._updateList(collection);
                            });
                        }

                        /**
                         * @param collection
                         * @private
                         */
                        @decorators.async()
                        _updateList(collection) {
                            const hash = utils.toHash(collection || [], this._idKey);
                            const list = [];
                            const toRemove = [];
                            const toAdd = [];

                            this._list.forEach((item) => {
                                const id = tsUtisls.get(item, this._idKey);

                                if (hash[id]) {
                                    list.push(item);
                                } else {
                                    toRemove.push(id);
                                }
                            });

                            if (collection && collection.length) {
                                collection.forEach((item) => {
                                    const id = tsUtisls.get(item, this._idKey);

                                    if (!this._itemsHash[id]) {
                                        toAdd.push(item);
                                    }

                                    list.push(item);
                                });
                            }

                            this._list = list;

                            requestAnimationFrame(() => {
                                this._remove(toRemove);
                                this._add(toAdd);
                                this._draw();
                            });
                        }

                        /**
                         * @private
                         */
                        _draw() {
                            this._list.forEach((item) => {
                                const id = tsUtisls.get(item, this._idKey);
                                const itemData = this._itemsHash[id];

                                if (!itemData.isDrawn) {
                                    this._node.appendChild(itemData.node);
                                    itemData.isDrawn = true;
                                }
                            });
                        }

                        /**
                         * @param list
                         * @private
                         */
                        _add(list) {
                            list.forEach((item) => {
                                const id = tsUtisls.get(item, this._idKey);

                                $transclude(($clone, $scope) => {
                                    const node = $clone.get(0);
                                    $scope[this._itemDataKey] = item;
                                    this._itemsHash[id] = {
                                        id,
                                        node,
                                        $scope,
                                        isDrawn: false
                                    };
                                });
                            });
                        }

                        /**
                         * @param idList
                         * @private
                         */
                        _remove(idList) {
                            idList.forEach((id) => {
                                if (this._itemsHash[id]) {
                                    this._itemsHash[id].$scope.$destroy();
                                    this._node.removeChild(this._itemsHash[id].node);
                                    delete this._itemsHash[id];
                                }
                            });
                        }

                    }

                    return new Repeat();
                };
            }
        };
    };

    directive.$inject = ['utils', 'decoratros'];

    angular.module('app.ui').directive('wRepeat', directive);
})();
