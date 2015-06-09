/* eslint no-trailing-spaces:0 */ // fix later, most of the errors in commented out spacing

/**
    @license
    Copyright (C) 2015 Dave Lesage
    License: MIT
    See license.txt for full license text.
*/
"use strict";

// let generatorProto = function*(){}().constructor;





let toString = Object.prototype.toString;


/**
    Class for containing a max reference counter
    as well as two stacks of references to objects.
    To be used with deepCopy and equals.

    @class Contains two reference stacks as well as a defined max stack depth.
*/
class RecursiveCounter {
    constructor(maxStackDepth) {
        this.xStack = [];
        this.yStack = [];
        this.count = 0;
        this.maxStackDepth = maxStackDepth;
    }

    push(x, y) {
        this.xStack.push(x);
        this.yStack.push(y);
        this.count++;
    }

    pop() {
        this.xStack.pop();
        this.yStack.pop();
        this.count--;
    }
}

export default class Zana {
    constructor() {

        // todo
        this.functions = {
              'identity' : x => x
            , 'true'     : () => true
            , 'false'    : () => false
            , 'empty'    : () => {}
        };
        this.types = {
              'arguments'         : this.getType(arguments)
            , 'array'             : this.getType([])
            , 'boolean'           : this.getType(true)
            , 'date'              : this.getType(new Date())
            , 'generator'         : this.getType(function*(){}())
            , 'generatorFunction' : this.getType(function*(){})
            , 'function'          : this.getType(function(){})
            , 'map'               : this.getType(new Map())
            , 'null'              : this.getType(null)
            , 'number'            : this.getType(0)
            , 'object'            : this.getType({})
            , 'regexp'            : this.getType(new RegExp())
            , 'string'            : this.getType('')
            , 'set'               : this.getType(new Set())
            , 'undefined'         : this.getType(undefined)
            , 'weakmap'           : this.getType(new WeakMap())
            , 'weakset'           : this.getType(new WeakSet())
            , 'iterable'          : 'Iterable' // CHEATING! SO MUCH CHEATING! might get better when we can use class Iterable() construct.
        };
        this.generators = {
            'empty': function*() { }
        };
    }

    /**
        Executes setup methods based on the provided settings object.

        @param {object} settings The settings object.
        @param {boolean} [settings.useArrayExtensions]  A boolean flag used to determine whether or not to extend Array.prototype.
        @param {boolean} [settings.useNumberExtensions] A boolean flag used to determine whether or not to extend Number.prototype.
        @param {boolean} [settings.useObjectExtensions] A boolean flag used to determine whether or not to extend Object.prototype.
        @param {object} [settings.defaultLogger] The default logger interface to apply to the default zUtil.log class.
    */
    setup(settings = {}) {
        // needs a rework for es6
        if (this.setup.initArrays)
            this.setup.initArrays(settings.useArrayExtensions);
        if (this.setup.initFunctions)
            this.setup.initFunctions(settings.useFunctionExtensions);
        if (this.setup.initGenerators)
            this.setup.initGenerators(settings.useGeneratorExtensions);
        if (this.setup.initNumbers)
            this.setup.initNumbers(settings.useNumberExtensions);
        if (this.setup.initObjects)
            this.setup.initObjects(settings.useObjectExtensions);
        if (this.setup.initLogger)
            this.setup.initLogger(settings.defaultLogger);
    }

    getType(value) {
        // ditch the regexp for performance
        // this will use @@toStringTag in the future
        return toString.call(value); // just use this.types['type'] for readability.

        //// this is more efficient (by a lot), but less extendable. boo.
        // if (value === null)
        //     return 'null';
        // let t = typeof value;
        // if (t !== 'object')
        //     return t;
        // switch(value.constructor) {
        //     case Array          : return 'array';
        //     case String         : return 'string';
        //     case Number         : return 'number';
        //     case Boolean        : return 'boolean';
        //     case RegExp         : return 'regexp';
        //     case Date           : return 'date';
        //     case Set            : return 'set';
        //     case Map            : return 'map';
        //     case WeakSet        : return 'weakset';
        //     case WeakMap        : return 'weakmap';
        //     case generatorProto : return 'generator';
        // }
        // if (value && value.getType)
        //     return value.getType();
        // // if (this.classes && this.classes.Iterable && value.constructor === this.classes.Iterable)
        //     // return 'iterable'; // haaaaaacky. this works, though. take the performance hit for now?

        // // what about iterables?
        // return 'object';
    }

    deepCopy(origSource) {
        let origIndex = -1;
        let rc = new RecursiveCounter(1000);

        function _deepCopy(source) {
            if (rc.count > rc.maxStackDepth) throw new Error("Stack depth exceeded: " + rc.stackMaxDepth + "!");
            switch (this.getType(source)) {
                case this.types.object:
                    return _singleCopy(source, Object.create(Object.getPrototypeOf(source)));
                case this.types.array:
                    return _singleCopy(source, []);
                case this.types.regexp:
                    return _singleCopy(source, new RegExp(source));
                case this.types.date:
                    return _singleCopy(source, new Date(source.toString()));
                case this.types.set:
                    return _singleCopy(source, new Set());
                case this.types.map:
                    return _singleCopy(source, new Map()); // might not work / need a _mapCopy?

                // case this.types.function:
                    // return _funcCopy(source);
                // generator functions? just use pointers? or do we want to iterate and replace?
                default: // need to handle functions differently?
                    return source;
            }
        }

        // move function external for performance? really should.
        function _singleCopy(sourceRef, copyRef) {
            origIndex = rc.xStack.indexOf(sourceRef);
            if (origIndex === -1) {
                rc.push(sourceRef, copyRef);
                this.forEach(sourceRef, function(value, key) {
                    copyRef[key] = _deepCopy(value);
                });
                rc.pop();
                return copyRef;
            }
            else {
                // source item has already been copied
                // return the reference to the copied item
                return rc.yStack[origIndex];
            }
        }

        // function _funcCopy(source) {
        //     let temp = function() { return source.apply(source, arguments); };
        //     this.forEach(source, function(x, key) {
        //         temp[key] = _deepCopy(x);
        //     });
        //     return _singleCopy(source, temp);
        // }
        return _deepCopy(origSource);
    }

    equals(item1, item2) {
        let rc = new RecursiveCounter(1000);

        function _equals(x, y) {
            if (rc.count > rc.maxStackDepth) throw new Error("Stack depth exceeded: " + rc.maxStackDepth + "!");
            // check for reference and primitive equality
            if (x === y)
                return true;
            // check for type equality
            let xType = this.getType(x);
            let yType = this.getType(y);
            if (xType !== yType)
                return false;
            // check for circular references
            let xIndex = rc.xStack.lastIndexOf(x);
            let yIndex = rc.yStack.lastIndexOf(y);
            if (xIndex !== -1) {
                if (yIndex !== -1) {
                    // don't care about object reference equality
                    // when checking for object equality
                    return true;
                    // if we do care about object reference equality,
                    // then a strict comparison of stack location of objects
                    // needs to be executed and returned
                }
            }
            // check for inequalities
            switch(xType) {
                case this.types.date:
                    if (x.getTime() !== y.getTime())
                        return false;
                    // check for extra properties stored on the Date object
                    if (!_compareObject(x, y))
                        return false;
                    break;
                case this.types.array:
                    if (x.length !== y.length)
                        return false;
                    rc.push(x, y);
                    for (let i = 0; i < x.length; i++) {
                        if (!_equals(x[i], y[i]))
                            return false;
                    }
                    rc.pop();
                    break;
                case this.types.generator:
                case this.types.generatorFunction:
                    // do we really want to check generator equality other than reference equality?
                    // this could accidentally execute some lazy-loading stuff.

                    // leaning towards no. considering.
                    rc.push(x, y);
                    let a, b;
                    let tempX = x[this.symbols.iterator](); // these point to the same object, after the Symbol.iterator get override
                    let tempY = y[this.symbols.iterator]();
                    do {
                        a = tempX.next();
                        b = tempY.next();
                        if (!_equals(a.value, b.value))
                            return false;
                    } while (!(a.done || b.done));
                    if (a.done !== b.done)
                        return false;
                    rc.pop();
                    break;
                case this.types.function: // check for properties set on the function
                case this.types.object:
                case this.types.regexp:
                    if (!_compareObject(x, y))
                        return false;
                    break;
                default:
                    if (x !== y)
                        return false;
                    break;
            }
            return true;
        }

        function _compareObject(x, y) {
            // check for reference equality
            if (x === y)
                return true;
            let xKeys = Object.keys(x);
            let yKeys = Object.keys(y);
            this.arrays.quicksort(xKeys);
            this.arrays.quicksort(yKeys);
            // xKeys.quicksort(); // use javascript implementation, or arrays implementation?
            // yKeys.quicksort();
            if (!_equals(xKeys, yKeys))
                return false;
            rc.push(x, y);
            for (let k in x) {
                if (!_equals(x[k], y[k]))
                    return false;
            }
            rc.pop();
            return true;
        }

        return _equals(item1, item2);
    }

    isSmashable(...args) {
        if (args.length < 1)
            return false;

        let baseType = this.getType(args[0]);
        if (!(baseType === this.types.array || baseType === this.types.object || baseType === this.types.function))
            return false;

        if (baseType === this.types.function)
            baseType = this.types.object; // allow functions to be smashed onto objects, and vice versa

        for (let i = 1; i < args.length; i++) {
            let targetType = this.getType(args[i]);
            if (targetType === this.types.function)
                targetType = this.types.object; // allow functions to be smashed onto objects, and vice versa

            if (targetType !== baseType)
                return false;
        }
        return true;
    }

    /**
        Internal extend call.
        Performance abstraction to bypass all the argument shenanigans,
        as we know we will only be extending two items at a time internally.

        @param {any} a The item on which to extend the second.
        @param {any} b The item to extend onto the first.
        @returns {any} The reference to the first item.
    */
    // consider moving to static zana
    _extend(a, b) {
        this.forEach(b, function(val, key) {
            if (a[key] !== null && a[key] !== undefined)
                a[key] = b[key];
            else if (this.isSmashable(a[key], b[key])) // find a way to move isSmashable internal
                this._extend(a[key], b[key]);
        });
        return a;
    }

    /**
        Extends the properties on the provided arguments into the original item.
        Any properties on the tail arguments will not overwrite
        any properties on the first argument, and any references will be shallow.
        
        @param {any} a The target to be extended.
        @param {...any} rest The tail items to extend onto the target.
        @returns {any} A reference to the extended target.
    */
    extend(a, ...rest) {
        rest.forEach(b => {
            if (this.isSmashable(a, b))
                this._extend(a, b);
        });
        return a;
    }

    forEach(item, method, context) {
        let itemType = this.getType(item);
        switch(itemType) {
            case this.types.date:
            case this.types.function:
            case this.types.object:
            case this.types.regexp:
                // for (let [key, value] of item) { // this doesn't work quite yet, but is the eventual goal. (2015-01-31)
                for (let [key, value] of Object.entries(item)) {
                    if (item.hasOwnProperty(key))
                        method.call(context, value, key, item);
                }
                break;
            case this.types.arguments:
            case this.types.array: // let [key, value] of arr doesn't quite work yet (2015-01-31)
                for (let i = 0; i < item.length; i++)
                    method.call(context, item[i], i, item);
                break;
            case this.types.map: // weakmap is not iterable (?)
                for (let [key, value] of item)
                    method.call(context, value, key, item);
                break;
            case this.types.set: // weakset is not iterable (?)
                for(let value of item) // treat keys and values as equivalent for sets
                    method.call(context, value, value, item);
                break;
            case this.types.iterable: // still need to find a way to handle this
                for(let value of item) // this.. doesnt work.
                    method.call(context, value, undefined, item);
                break;
        }
        return item;
    }

    /**
        Internal smash call.
        Performance abstraction to bypass all the argument shenanigans,
        as we know we will only be smashing two items at a time internally.

        @param {any} a The item on which to smash the second.
        @param {any} b The item to smash onto the first.
        @returns {any} The reference to the first item.
    */
    _smash(a, b) {
        this.forEach(b, (val, key) => {
            if (this.isSmashable(a[key], b[key])) // find a way to move isSmashable internal
                this._smash(a[key], b[key]);
            else
                a[key] = this.deepCopy(b[key]);
        });
        return a;
    };

    /**
        Smashes the properties on the provided arguments into the first argument.
        Any properties on the tail arguments will overwrite
        any existing properties on the first argument.
        
        @param {any} a The target to be smashed.
        @param {...any} rest The tail items to smash onto the target.
        @returns {any} A reference to the smashed target.
    */
    smash(a, ...rest) {
        rest.forEach(b => {
            if (this.isSmashable(a, b)) // find a way to move isSmashable internal
                this._smash(a, b);
        });
        return a;
    };


    // coalesce() {
    //     let args = [...arguments];
    //     for (let i = 0; i < args.length; i++) {
    //         if (this.check.exists(args[i]))
    //             return args[i];
    //     }
    //     return null;
    // };
}


// ;(function(undefined) {
//     "use strict";
    /**
        The main container for all zUtil items.

        @param [object] settings An optional set of settings to define items.
        @param [boolean] settings.useArrayExtensions A boolean flag to determine whether or not to extend Array.prototype.
        @param [boolean] settings.useObjectExtensions A boolean flag to determine whether or not to extend Object.prototype.
        @param [object] settings.defaultLogger An object which defines all of the required logger fields to be used by zUtil.log.
    */
    // function Zana(/* settings */) {
    //     // this.setup(settings);
    // }
    // let z = new Zana();

    /**
        Collects the type for a given value.
        
        @param {any} value The value from which to collect the type.
        @returns {string} The type of the value.
    */

    // let generatorFunctionProto = function*(){}.constructor; // not helpful, these are considered "functions".
    // let generatorProto = function*(){}().constructor;
    // this.getType = function(value) {
    //     // this is bad, but I don't think we have any other options yet.
    //     // see: https://mail.mozilla.org/pipermail/es-discuss/2015-January/041149.html
    //     // if (value && value.getType)
    //         // return value.getType();

    //     // lets ditch the regexp for performance
    //     return Object.prototype.toString.call(value); // just use this.types['type'] for readability.

    //     // this is more efficient (by a lot), but less extendable
    //     let t = typeof value;
    //     if (t !== 'object')
    //         return t;
    //     if (value === null)
    //         return 'null';
    //     switch(value.constructor) {
    //         case Array:             return 'array';
    //         case String:            return 'string';
    //         case Number:            return 'number';
    //         case Boolean:           return 'boolean';
    //         case RegExp:            return 'regexp';
    //         case Date:              return 'date';
    //         case Set:               return 'set';
    //         case Map:               return 'map';
    //         case WeakSet:           return 'weakset';
    //         case WeakMap:           return 'weakmap';
    //         case generatorProto:    return 'generator';
    //     }
    //     if (value && value.getType)
    //         return value.getType();
    //     // if (this.classes && this.classes.Iterable && value.constructor === this.classes.Iterable)
    //         // return 'iterable'; // haaaaaacky. this works, though. take the performance hit for now?

    //     // what about iterables?
    //     return 'object';
    // };

    // *
    //     Returns the first non-null or non-undefined argument.

    //     @param {...any} var_args The list of arguments to check for existence.
    //     @returns {any} If no arguments exist then null, else the existing argument.
    
    // this.coalesce = function(/* arguments */) {
    //     let args = [...arguments];
    //     for (let i = 0; i < args.length; i++) {
    //         if (this.check.exists(args[i]))
    //             return args[i];
    //     }
    //     return null;
    // };

    /**
        Builds a deep copy of the provided source.
        
        @param {any} origSource The item from which to build the deep copy.
        @returns {any} The copy of the provided source.
        @throws {error} An error is thrown if the recursive object stack grows greater than 1000.
    */
    // this.deepCopy = function(origSource) {
    //     let origIndex = -1;
    //     let rc = new RecursiveCounter(1000);

    //     function _singleCopy(sourceRef, copyRef) {
    //         origIndex = rc.xStack.indexOf(sourceRef);
    //         if (origIndex === -1) {
    //             rc.push(sourceRef, copyRef);
    //             this.forEach(sourceRef, function(value, key) {
    //                 copyRef[key] = _deepCopy(value);
    //             });
    //             rc.pop();
    //             return copyRef;
    //         }
    //         else {
    //             // source item has already been copied
    //             // return the reference to the copied item
    //             return rc.yStack[origIndex];
    //         }
    //     }

    //     function _funcCopy(source) {
    //         let temp = function() { return source.apply(source, arguments); };
    //         this.forEach(source, function(x, key) {
    //             temp[key] = _deepCopy(x);
    //         });
    //         return _singleCopy(source, temp);
    //     }

    //     function _deepCopy(source) {
    //         if (rc.count > rc.maxStackDepth) throw new Error("Stack depth exceeded: " + rc.stackMaxDepth + "!");
    //         switch (this.getType(source)) {
    //             case this.types.object:
    //                 return _singleCopy(source, Object.create(Object.getPrototypeOf(source)));
    //             case this.types.array:
    //                 return _singleCopy(source, []);
    //             case this.types.regexp:
    //                 return _singleCopy(source, new RegExp(source));
    //             case this.types.date:
    //                 return _singleCopy(source, new Date(source.toString()));
    //             case this.types.set:
    //                 return _singleCopy(source, new Set());
    //             case this.types.map:
    //                 return _singleCopy(source, new Map()); // might not work / need a _mapCopy?

    //             // case this.types.function:
    //                 // return _funcCopy(source);
    //             // generator functions? just use pointers? or do we want to iterate and replace?
    //             default: // need to handle functions differently?
    //                 return source;
    //         }
    //     }
    //     return _deepCopy(origSource);
    // };

    /**
        Defines a property on this provided item.
        
        @this {object}
        @param {any} obj The item to which to add the property.
        @param {string} name The name of the property.
        @param {any} prop The property to add.
        @returns {void}
    */
    // this.defineProperty = function(obj, name, prop) {
    //     if (obj[name] == null)
    //         Object.defineProperty(obj, name, prop); 
    //     else {
    //         console.error(
    //             "Error: the method " 
    //             + name
    //             + " has already been defined on the following object: " 
    //             + obj
    //         );
    //     }
    // };

    /**
        Compares the equality of two provided items.
        
        @param {any} x The first item to compare.
        @param {any} y The second item to compare.
        @returns {boolean} True if the provided values are equal, false if not.
        @throws {error} An error is thrown if the recursive function stack grows greater than 1000.
    */
    // this.equals = function(x, y) {
    //     let rc = new RecursiveCounter(1000);

    //     function _compareObject(x, y) {
    //         // check for reference equality
    //         if (x === y)
    //             return true;
    //         let xKeys = Object.keys(x);
    //         let yKeys = Object.keys(y);
    //         xKeys.quicksort();
    //         yKeys.quicksort();
    //         if (!_equals(xKeys, yKeys))
    //             return false;
    //         rc.push(x, y);
    //         for (let k in x) {
    //             if (!_equals(x[k], y[k]))
    //                 return false;
    //         }
    //         rc.pop();
    //         return true;
    //     }

    //     function _equals(x, y) {
    //         if (rc.count > rc.maxStackDepth) throw new Error("Stack depth exceeded: " + rc.maxStackDepth + "!");
    //         // check for reference and primitive equality
    //         if (x === y)
    //             return true;
    //         // check for type equality
    //         let xType = this.getType(x);
    //         let yType = this.getType(y);
    //         if (xType !== yType)
    //             return false;
    //         // check for circular references
    //         let xIndex = rc.xStack.lastIndexOf(x);
    //         let yIndex = rc.yStack.lastIndexOf(y);
    //         if (xIndex !== -1) {
    //             if (yIndex !== -1) {
    //                 // don't care about object reference equality
    //                 // when checking for object equality
    //                 return true;
    //                 // if we do care about object reference equality,
    //                 // then a strict comparison of stack location of objects
    //                 // needs to be executed and returned
    //             }
    //         }
    //         // check for inequalities
    //         switch(xType) {
    //             case this.types.date:
    //                 if (x.getTime() !== y.getTime()) {
    //                     return false;
    //                 }
    //                 // check for extra properties stored on the Date object
    //                 if (!_compareObject(x, y)) {
    //                     return false;
    //                 }
    //                 break;
    //             case this.types.function:
    //                 // if (!this.equals(this.functions.getBody(x), this.functions.getBody(y))) {
    //                 //     // function body mismatch
    //                 //     return false;
    //                 // }
    //                 // if (!this.equals(this.functions.getArgumentNames(x), this.functions.getArgumentNames(y))) {
    //                 //     // function arguments mismatch
    //                 //     return false;
    //                 // }
    //                 if (!_compareObject(x, y)) // check for properties set on the function
    //                     return false;
    //                 break;
    //             case this.types.array:
    //                 if (x.length !== y.length) {
    //                     return false;
    //                 }
    //                 rc.push(x, y);
    //                 for (let i = 0; i < x.length; i++) {
    //                     if (!_equals(x[i], y[i])) {
    //                         return false;
    //                     }
    //                 }
    //                 rc.pop();
    //                 break;
    //             case this.types.generator:
    //             case this.types.generatorFunction:
    //                 // do we really want to check generator equality other than reference equality?
    //                 // this could accidentally execute some lazy-loading stuff.
    //                 rc.push(x, y);
    //                 let a, b;
    //                 let tempX = x[this.symbols.iterator](); // these point to the same object, after the Symbol.iterator get override
    //                 let tempY = y[this.symbols.iterator]();
    //                 do {
    //                     a = tempX.next();
    //                     b = tempY.next();
    //                     if (!_equals(a.value, b.value)) {
    //                         return false;
    //                     }
    //                 } while (!(a.done || b.done));
    //                 if (a.done !== b.done)
    //                     return false;
    //                 rc.pop();
    //                 break;
    //             case this.types.function: // check for properties set on the function
    //             case this.types.object:
    //             case this.types.regexp:
    //                 if (!_compareObject(x, y))
    //                     return false;
    //                 break;
    //             default:
    //                 if (x !== y)
    //                     return false;
    //                 break;
    //         }
    //         return true;
    //     }
    //     return _equals(x, y);
    // };

    

    /**
        Iterates over an iterable object or array,
        calling the provided method with the provided optional context,
        as well as the value and the key for the current item.

        @param {object|array|date|regexp} item The item over which to iterate.
        @param {function} method The method to call for each iterated item.
        @param {object} context The context to set to "this" for the method.
        @returns {object|array|date|regexp} The reference to the original item.
    */
    

    

    

    /**
        Define constants for the library.
     */
    // this.functions = {
    //     'identity': function(x) { return x; }
    //     , 'true': function() { return true; }
    //     , 'false': function() { return false; }
    //     , 'empty': function() { }
    //     , 'matcher': /^(?:[(\s*]*)?(\w+(?:,\s*\w+)*)?(?:[)\s*]*)?=>(?:\s*)?(.*)$/
    // };
    // this.types = {
    //       'arguments':          this.getType(arguments) 
    //     , 'array':              this.getType([])
    //     , 'boolean':            this.getType(true)
    //     , 'date':               this.getType(new Date())
    //     , 'generator':          this.getType(function*(){}())
    //     , 'generatorFunction':  this.getType(function*(){})
    //     , 'function':           this.getType(function(){})
    //     , 'map':                this.getType(new Map())
    //     , 'null':               this.getType(null)
    //     , 'number':             this.getType(0)
    //     , 'object':             this.getType({})
    //     , 'regexp':             this.getType(new RegExp())
    //     , 'string':             this.getType('')
    //     , 'set':                this.getType(new Set())
    //     , 'undefined':          this.getType(undefined)
    //     , 'weakmap':            this.getType(new WeakMap())
    //     , 'weakset':            this.getType(new WeakSet())
    //     , 'iterable':           'Iterable' // CHEATING! SO MUCH CHEATING! might get better when we can use class Iterable() construct.
    // };
    // this.generators = {
    //     'empty': function*() { }
    // };
    // this.symbols = {
    //     "iterator": "@@iterator" // should be Symbols.iterator eventually -- probably dont need to maintain this list once Symbols exists
    // };

//     return (function() {
//         let root = (
//             typeof window !== 'undefined' ?
//                 window
//                 : typeof global !== 'undefined' ?
//                     global 
//                     : this
//         );
//         if (typeof define !== 'undefined' && typeof define.amd !== 'undefined') {
//             root.z = z;
//             define(function() {
//                 return z;
//             });
//         }
//         else if (typeof module !== 'undefined') {
//             if (typeof module.exports !== 'undefined') {
//                 module.exports = z;
//             }
//         }
//         else {
//             // assume browser, expose to root
//             root.z = z;
//         }
//         return z;
//     })();
// })();