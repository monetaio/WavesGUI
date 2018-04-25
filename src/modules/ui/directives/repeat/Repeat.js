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
                             * @type {Array<Repeat.IListItem>}
                             * @private
                             */
                            this._list = [];
                            /**
                             * @type {Array<Repeat.IListItem>}
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
                             * @type {Object.<string, Repeat.IHashItem>}
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
                            /**
                             * @type {Array<Repeat.IListItem>}
                             */
                            const list = [];
                            const toRemove = [];
                            /**
                             * @type {Array<Repeat.IListItem>}
                             */
                            const toAdd = [];

                            this._list.forEach(({ id }) => {
                                if (!hash[id]) {
                                    toRemove.push(id);
                                }
                            });

                            if (collection && collection.length) {
                                collection.forEach((data) => {
                                    const id = tsUtisls.get(data, this._idKey);

                                    if (!this._itemsHash[id]) {
                                        toAdd.push({ id, data });
                                    }

                                    list.push({ id, data });
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
                            if (!this._list.length) {
                                return null;
                            }

                            const node = this._node;
                            const minHeight = innerHeight;
                            const height = this._getHeight();
                            const count = Math.min(Math.round(minHeight / height), this._list.length);

                            if (!this._visibleList.length) {
                                const fragment = document.createDocumentFragment();

                                for (let i = 0; i < count; i++) {
                                    fragment.appendChild(this._itemsHash[this._list[i].id].node);
                                    this._visibleList.push(this._list[i]);
                                }

                                node.appendChild(fragment);
                                return null;
                            }

                            for (let i = 0; i < count; i++) {
                                const item = this._list[i];
                                if (item.id === this._visibleList[i].id) {
                                    continue;
                                }
                                this._addByIndex(this._itemsHash[item.id].node, i);
                                this._visibleList.splice(i, 0, item);
                            }

                            for (let i = count; i < this._visibleList.length; i++) {
                                node.removeChild(this._itemsHash[this._visibleList[i].id].node);
                            }
                        }

                        /**
                         * @param {HTMLElement} node
                         * @param {number} index
                         * @private
                         */
                        _addByIndex(node, index) {
                            const childrenCount = this._node.childNodes.length;
                            if (index < childrenCount) {
                                this._node.insertBefore(node, this._node.childNodes[index]);
                            } else {
                                this._node.appendChild(node);
                            }
                        }

                        _getHeight() {
                            if (!this._list[0]) {
                                return 0;
                            }
                            const id = this._list[0].id;
                            const child = this._itemsHash[id].node;
                            this._node.appendChild(child);
                            const height = child.clientHeight;
                            this._node.removeChild(child);
                            return height;
                        }

                        /**
                         * @param {Repeat.IListItem[]} list
                         * @private
                         */
                        _add(list) {
                            list.forEach(({ id, data }) => {

                                $transclude(($clone, $scope) => {
                                    const node = $clone.get(0);
                                    $scope[this._itemDataKey] = data;
                                    this._itemsHash[id] = {
                                        id,
                                        node,
                                        $scope,
                                        data
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
                                    if (this._itemsHash[id].node.parentNode) {
                                        this._node.removeChild(this._itemsHash[id].node);
                                    }
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

    directive.$inject = ['utils', 'decorators'];

    angular.module('app.ui').directive('wRepeat', directive);
})();

/**
 * @name Repeat
 */

/**
 * @typedef {object} Repeat#IListItem
 * @property {string|number} id
 * @property {object} data
 */

/**
 * @typedef {object} Repeat#IHashItem
 * @property {string} id
 * @property {HTMLElement} node
 * @property {$rootScope.Scope} $scope
 * @property {object} data
 */
