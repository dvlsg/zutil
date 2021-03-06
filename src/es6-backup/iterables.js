/*
    @license
    Copyright (C) 2014 Dave Lesage
    License: MIT
    See license.txt for full license text.
*/
(function(z, undefined) {

    z.iterables = {};

    var _expand = function(iter) {
        if (iter && iter.isGenerator != null && iter.isGenerator()) {
            return iter();
        }
        if (z.getType(iter) === z.types.array) {
            return iter[z.symbols.iterator]();
        }
        return iter;
    };

    z.iterables.aggregate = function(iter, func, seed) {
        z.assert.isIterable(iter);
        z.assert.isFunction(func);
        var result,
            expandedIter = _expand(iter);
        if (seed == null) {
            result = expandedIter.next().value;
        }
        else {
            result = func(seed, expandedIter.next().value);
        }
        for (var v of expandedIter) {
            result = func(result, v)
        }
        return result;
    };

    z.iterables.any = function(iter, predicate) {
        z.assert.isIterable(iter);
        if (z.check.isFunction(predicate)) {
            for (var v of iter) {
                if (predicate(v)) {
                    return true;
                }
            }
        }
        else {
            for (var v of iter) {
                if (v != null) {
                    return true;
                }
            }
        }
        return false;
    };

    z.iterables.concat = function(/* ... iter */) {
        var args = Array.prototype.slice.call(arguments);
        return function*() {
            for (var arg of args) {
                for (var v of arg) {
                    yield v;
                }
            }
        }
    };

    z.iterables.distinct = function(iter, selector) {
        z.assert.isIterable(iter);
        var seen = [];
        if (z.check.isFunction(selector)) {
            return function*() {
                var seen = [];
                for (var v of iter) {
                    var key = selector(v);
                    if (!seen.contains(key)) {
                        seen.push(key);
                        yield v;
                    }
                }
            };
        }
        else {
            return function*() {
                var seen = [];
                for (var v of iter) {
                    if (!seen.contains(v)) {
                        seen.push(v);
                        // yield v; // this works too. may be more efficient?
                    }
                }
                yield* z.arrays.asEnumerable(seen);
            };
        }
    };

    z.iterables.first = function(iter, predicate) {
        z.assert.isIterable(iter);
        if (z.check.isFunction(predicate)) {
            for (var v of iter) {
                if (predicate(v)) {
                    return v;
                }
            }
        }
        else {
            for (var v of iter) {
                if (z.check.exists(v)) {
                    return v;
                }
            }
        }
        return null;
    };

    z.iterables.innerJoin = function(iter1, iter2) {
        z.assert.isIterable(iter1);
        z.assert.isIterable(iter2);
        return {
            on: function(predicate) {
                z.assert.isFunction(predicate);
                return function*() {
                    for (var item1 of iter1) {
                        for (var item2 of iter2) {
                            if (predicate(item1, item2)) {
                                yield z.smash(item1, item2);
                            }
                        }
                    }
                }
            }
        };
    };

    z.iterables.last = function(iter, predicate) {
        z.assert.isIterable(iter);
        // we will have to iterate over the entire iterable in the generic case
        // array has its own specific implementation for last, since we know the end
        var a,
            b,
            result = null,
            expandedIter = _expand(iter);

        if (z.getType(iter) === z.types.array) {
            // if the type is actually an array,
            // then make sure we use the more efficient
            // array specific implementation
            return z.arrays.last(iter, predicate);
        }
        if (z.check.isFunction(predicate)) {
            while (!(a = expandedIter.next()).done) {
                if (predicate(a.value)) {
                    result = a.value;
                }
            }
        }
        else {
            while (!(a = expandedIter.next()).done) {
                b = a;
                // result = a.value; // better way to step? the final "done" object does not contain a value, and no way to step backwards at the end
            }
            result = b.value;
        }
        return result;
    };

    z.iterables.max = function(iter, selector) {
        z.assert.isIterable(iter);
        var maxValue = Number.MIN_VALUE;
        if (z.check.isFunction(selector)) {
            for (var v of iter) {
                var selected = selector(v);
                if (z.check.isNumber(selected) && maxValue < selected) {
                    maxValue = selected;
                }
            }
        }
        else {
            for (var v of iter) {
                if (z.check.isNumber(v) && maxValue < v) {
                    maxValue = v;
                }
            }
        }
        return maxValue;
    };

    z.iterables.min = function(iter, selector) {
        z.assert.isIterable(iter);
        var minValue = Number.MAX_VALUE;
        if (z.check.isFunction(selector)) {
            for (var v of iter) {
                var selected = selector(v);
                if (z.check.isNumber(selected) && selected < minValue) {
                    minValue = selected;
                }
            }
        }
        else {
            for (var v of iter) {
                if (z.check.isNumber(v) && v < minValue) {
                    minValue = v;
                }
            }
        }
        return minValue;
    };

    var buildMapArray = function(count) {
        var mapArray = new Array(count);
        for (var i = 0; i < count; i++) {
            mapArray[i] = i;
        }
        return mapArray;
    };
    var buildKeyArray = function(elements, selector, count) {
        var keyArray = new Array(count);
        for (var i = 0; i < count; i++) {
            keyArray[i] = selector(elements[i]);
        };
        return keyArray;
    };
    var quicksort3 = function(keyArray, mapArray, comparer, left, right) {
        var indexForLessThan = left;
        var indexForGreaterThan = right;
        var pivotIndex = mapArray[left];
        var indexForIterator = left+1;
        while (indexForIterator <= indexForGreaterThan) {
            var cmp = comparer(keyArray[mapArray[indexForIterator]], keyArray[pivotIndex]);
            if (cmp < 0) {
                z.arrays.swap(mapArray, indexForLessThan++, indexForIterator++);
            }
            else if (0 < cmp) {
                z.arrays.swap(mapArray, indexForIterator, indexForGreaterThan--);
            }
            else {
                indexForIterator++;
            }
        }
        if (left < indexForLessThan-1) {
            quicksort3(keyArray, mapArray, comparer, left, indexForLessThan-1);
        }
        if (indexForGreaterThan+1 < right) {
            quicksort3(keyArray, mapArray, comparer, indexForGreaterThan+1, right);
        }
    };
    z.iterables.orderBy = function(iter, selector, comparer) {
        var self = this;
        z.assert.isIterable(iter);
        if (!z.check.isFunction(selector))
            selector = z.functions.identity;
        if (!z.check.exists(comparer))
            comparer = ((x,y) => x > y ? 1 : x < y ? -1 : 0);

        var elements = (z.getType(iter) === z.types.generator ? iter.toArray() : iter);
        var yielder = function*() {
            // only execute the sort on iteration
            // this is due to the possibly orderBy().thenBy().thenBy() chained calls
            var unsortedElements = z.iterables.where(yielder.elements, x => yielder.selector(x) == null).toArray();
            var unsortedCount = unsortedElements.length;
            var sortedElements = z.iterables.where(yielder.elements, x => yielder.selector(x) != null).toArray();
            var sortedCount = sortedElements.length;
            var sortedKeys = buildKeyArray(sortedElements, yielder.selector, sortedCount);
            var sortedMap = buildMapArray(sortedCount);
            quicksort3(sortedKeys, sortedMap, yielder.comparer, 0, sortedCount-1);
            for (var i = 0; i < sortedCount; i++) {
                yield sortedElements[sortedMap[i]];
            }
            for (var v of unsortedElements) {
                yield v;
            }
        };

        z.defineProperty(yielder, "thenBy", { enumerable: false, writable: true, configurable: true, value: thenBy.bind(yielder) });
        z.defineProperty(yielder, "selector", { enumerable: false, writable: true, configurable: true, value: selector });
        z.defineProperty(yielder, "comparer", { enumerable: false, writable: true, configurable: true, value: comparer });
        z.defineProperty(yielder, "elements", { enumerable: false, writeable: false, configurable: false, value: elements });
        return yielder;
    };

    var thenBy = function(newSelector, newComparer) {
        var self = this;
        z.assert.isFunction(self.comparer);
        z.assert.isFunction(self.selector);
        if (!z.check.exists(newComparer))
            newComparer = ((x,y) => x > y ? 1 : x < y ? -1 : 0);
        z.assert.isFunction(newComparer);

        // wrap the old selector in a new selector function
        // which will build all keys into a primary/secondary structure,
        // allowing the primary key selector to grow recursively
        // by appending new selectors on to the original selectors
        var oldSelector = self.selector; // store pointer to avoid accidental recursion
        self.selector = function(item) {
            return {
                primary: oldSelector(item),
                secondary: newSelector(item)
            }
        };

        // wrap the old comparer in a new comparer function
        // which will carry on down the line of comparers
        // in order until a non-zero is found, or until
        // we reach the new comparer
        var oldComparer = self.comparer; // store pointer to avoid accidental recursion
        self.comparer = function(compoundKeyA, compoundKeyB) {
            var primaryResult = oldComparer(compoundKeyA.primary, compoundKeyB.primary);
            if (primaryResult === 0) {
                return newComparer(compoundKeyA.secondary, compoundKeyB.secondary);
            }
            return primaryResult;
        };

        return self;
    };

    var _reverse = function*(iter, a) {
        if (!a.done) {
            yield* _reverse(iter, iter.next());
            yield a.value;
        }
    };
    z.iterables.reverse = function(iter) {
        z.assert.isIterable(iter);
        return function*() {
            var expandedIter = _expand(iter);
            yield* _reverse(expandedIter, expandedIter.next());
        };
    };

    z.iterables.select = function(iter, selector) {
        z.assert.isIterable(iter);
        z.assert.isFunction(selector);
        return function*() {
            for (var v of iter) {
                yield selector(v);
            }
        };
    };

    z.iterables.skip = function(iter, count) {
        z.assert.isIterable(iter);
        return function*() {
            var a,
                i = 0,
                expandedIter = _expand(iter);
            while (!(a = expandedIter.next()).done && i < count) {
                i++;
            }
            if (!a.done) {
                yield a.value; // yield the value at the starting point
                while(!(a = expandedIter.next()).done) {
                    yield a.value; // yield remaining values
                }
            }
        }
    };

    z.iterables.sum = function(iter, selector) {
        z.assert.isIterable(iter);
        var sum = 0;
        if (z.check.isFunction(selector)) {
            for (var v of iter) {
                var num = selector(v);
                if (z.check.isNumber(num)) {
                    sum += num;
                }
            }
        }
        else {
            for (var v of iter) {
                if (z.check.isNumber(v)) {
                    sum += v;
                }
            }
        }
        return sum;
    };

    z.iterables.take = function(iter, count) {
        z.assert.isIterable(iter);
        return function*() {
            var i = 0;
            for (var v of iter) {
                if (count <= i++) {
                    break;
                }
                yield v;
            }
        };
    };

    z.iterables.toArray = function(iter) {
        var result = [];
        for (var v of iter) {
            result.push(v);
        }
        return result;
    };

    z.iterables.where = function(iter, predicate) {
        z.assert.isIterable(iter);
        z.assert.isFunction(predicate);
        return function*() {
            for (var v of iter) {
                if (predicate(v)) {
                    yield v;
                }
            }
        };
    };

    z.iterables.zip = function(iter1, iter2, method) {
        z.assert.isIterable(iter1);
        z.assert.isIterable(iter2);
        return function*() {
            var a, b;
            var expandedIter1 = _expand(iter1);
            var expandedIter2 = _expand(iter2);
            while (!(a = expandedIter1.next()).done && !(b = expandedIter2.next()).done) {
                yield method(a.value, b.value);
            }
        };
    };

}(zUtil.prototype));