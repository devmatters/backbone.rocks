/*
 * This file is part of the Medic-Injector library.
 *
 * (c) Olivier Philippon <https://github.com/DrBenton>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * Strongly inspired by the SwiftSuspenders (https://github.com/tschneidereit/SwiftSuspenders)
 * ActionScript 3 library.
 */

(function(context) {

    var myDebug = false;

    /**
     * @class InjectionMapping
     */

    var FORBIDDEN_INJECTIONS_NAMES = [
        'injectionValue'
    ];

    /**
     * You cant' use this constructor directly. Use Injector.addMapping to create a new "synchronous operations only"
     * Injection Mapping.
     *
     * @class sync.InjectionMapping
     * @constructor
     * @param {sync.Injector} injectorInstance
     * @param {String} injectionName
     * @return {sync.InjectionMapping}
     */
    var InjectionMapping = function (injectorInstance, injectionName)
    {
        if (! (injectorInstance instanceof Injector)) {
            throw new Error('Don\'t instantiate InjectionMapping directly ; use Injector#addMapping to create InjectionMappings!');
        }
        if (-1 < FORBIDDEN_INJECTIONS_NAMES.indexOf(injectionName)) {
            throw new Error('Injection name "'+injectionName+'" is forbidden');
        }
        this._injector = injectorInstance;
        /**
         *
         * @type {String}
         */
        this.injectionName = injectionName;
    };

    /**
     * The simplest Injection Mapping type : each time a component will request this Injection Mapping injection, the
     * target value will be injected.
     * Since this value is a plain Javascript scalar, Array or Object, it's shared in all the application and calling
     * #asSingleton on such an Injection Mapping is useless.
     *
     * @param value
     * @return {sync.InjectionMapping} The <code>InjectionMapping</code> the method is invoked on
     * @throws {Error}
     */
    InjectionMapping.prototype.toValue = function (value)
    {
        this._sealed && this._throwSealedException();
        this._toValue = value;
        return this;
    };

    /**
     * The Injection Mapping value will be resolved through a Provider function.
     *
     * @param {Function} injectionValueProviderFunction
     * @return {sync.InjectionMapping} The <code>InjectionMapping</code> the method is invoked on
     * @throws {Error}
     */
    InjectionMapping.prototype.toProvider = function (injectionValueProviderFunction)
    {
        this._sealed && this._throwSealedException();
        this._toProvider = injectionValueProviderFunction;
        return this;
    };

    /**
     * Each time this Injection Mapping value will be requested, a new instance of the target Javascript type will
     * be created.
     * Use it with #asSingleton() to map a lazy-loaded shared instance to this Injection Mapping.
     *
     * @param {Function} javascriptType
     * @return {sync.InjectionMapping} The <code>InjectionMapping</code> the method is invoked on
     * @throws {Error}
     */
    InjectionMapping.prototype.toType = function (javascriptType)
    {
        this._sealed && this._throwSealedException();
        if (!(javascriptType instanceof Function))
        {
            throw new Error('InjectionMapping.toType() argument must be a Javascript type (i.e. a function instantiable with "new")')
        }
        this._toType = javascriptType;
        return this;
    };

    /**
     * When this method is called on an Injection Mapping, its resolution will be triggered the first time it is
     * requested, but any subsequent call will use this first-time resolved value.
     *
     * @return {sync.InjectionMapping} The <code>InjectionMapping</code> the method is invoked on
     * @throws {Error}
     */
    InjectionMapping.prototype.asSingleton = function ()
    {
        this._sealed && this._throwSealedException();
        this._asSingleton = true;
        return this;
    };

    /**
     * Resolves the injection mapping.
     *
     * @return the Injection Mapping resolved value
     */
    InjectionMapping.prototype.resolveInjection = function ()
    {
        var returnedValue = null;

        if (this._singletonValue) {

            returnedValue = this._singletonValue;

        } else if (this._toValue) {

            returnedValue = this._toValue;

        } else if (this._toType) {

            returnedValue = new this._toType();

        } else if (this._toProvider) {

            // The Provider function may itself ask for other injections.
            returnedValue = this._injector.triggerFunctionWithInjectedParams(this._toProvider);

        }

        if (this._asSingleton) {
            this._singletonValue = returnedValue;//we won't ask for resolution again
        }

        return returnedValue;
    };

    /**
     * Seal this Injection mapping. Any subsequent call to any of the
     * #toValue, "toProvider()" or "asSingleton()" methods will throw
     * an Error.
     *
     * @return {Object} returns a "unseal" key ; the only way to unseal this InjectionMapping it to call its "unseal()" method with this key
     * @throws {Error}
     * @see #unseal()
     */
    InjectionMapping.prototype.seal = function ()
    {
        this._sealed && this._throwSealedException();
        this._sealed = true;
        this._sealKey = {};
        return this._sealKey;
    };

    /**
     * Reverts the effect of <code>seal</code>, makes the mapping changeable again.
     *
     * @param {Object} key The key to unseal the mapping. Has to be the instance returned by
     * <code>seal()</code>
     * @return {sync.InjectionMapping} The <code>InjectionMapping</code> the method is invoked on
     * @throws {Error} Has to be invoked with the unique key object returned by an earlier call to <code>seal</code>
     * @throws {Error} Can't unseal a mapping that's not sealed
     * @see #seal()
     */
    InjectionMapping.prototype.unseal = function (key)
    {
        if (!this._sealed) {
            throw new Error('Can\'t unseal a non-sealed mapping.');
        }
        if (key !== this._sealKey)
        {
            throw new InjectorError('Can\'t unseal mapping without the correct key.');
        }
        this._sealed = false;
        this._sealKey = null;
        return this;
    };

    /**
     * If the #seal method has been called on this InjectionMapping, returns `true`
     * @return {Boolean}
     */
    InjectionMapping.prototype.isSealed = function ()
    {
        return this._sealed;
    };

    /**
     *
     * @private
     */
    InjectionMapping.prototype._throwSealedException = function ()
    {
        throw new Error('Modifications on a sealed InjectionMapping is forbidden!');
    };

    // Injector
    /**
     * Creates a new "synchronous operations only" Injector instance.
     *
     * Access this class with
     * <code>var Injector = require('medic-injector').InjectorSync;</code>
     *
     * @class sync.Injector
     * @constructor
     * @return {sync.Injector}
     */
    var Injector = function ()
    {
        this._mappings = {};
        return this;
    };

    /**
     * The name of the function to trigger in a custom JS type instance after the resolution of all its Injections Points.
     * @property {String}
     */
    Injector.prototype.instancePostInjectionsCallbackName = 'postInjections';

    /**
     * Adds a new InjectionMapping to the Injector.
     *
     * @param {String} injectionName
     * @return {sync.InjectionMapping}
     */
    Injector.prototype.addMapping = function (injectionName)
    {
        if (!!this._mappings[injectionName]) {
            throw new Error('Injection name "'+injectionName+'" is already used!');
        }
        var newInjectionMapping = new InjectionMapping(this, injectionName);
        this._mappings[injectionName] = newInjectionMapping;
        return newInjectionMapping;
    };

    /**
     * Removes an existing InjectionMapping.
     *
     * @param {String} injectionName
     * @return {sync.Injector}
     * @throws {Error} An Error is thrown if the target InjectionMapping has been sealed
     */
    Injector.prototype.removeMapping = function (injectionName)
    {
        if (!!this._mappings[injectionName] && this._mappings[injectionName].isSealed()) {
            throw new Error('Injection name "'+injectionName+'" is sealed and cannot be removed!');
        }
        delete this._mappings[injectionName];
        return this;
    };

    /**
     *
     * @param {String} injectionName
     * @return {Boolean}
     */
    Injector.prototype.hasMapping = function (injectionName)
    {
        return !!this._mappings[injectionName];
    };

    /**
     *
     * @param {String} injectionName
     * @return {sync.InjectionMapping}
     */
    Injector.prototype.getMapping = function (injectionName)
    {
        return this._mappings[injectionName] || null;
    };

    /**
     * Triggers the target function with the supplied context.
     * The function args are parsed, and for each of these args whose name equals a registered InjectionMapping name
     * the injection will be resolved and its value will fill the matching function arg value.
     *
     * @param {Function} func
     * @param {Object} [context=null]
     * @return the function returned value
     */
    Injector.prototype.triggerFunctionWithInjectedParams = function (func, context)
    {
        myDebug && console && console.log('triggerFunctionWithInjectedParams() ; func=', func);
        var functionArgsNames = getArgumentNames(func);
        var resolvedInjectionsValues = this.resolveInjections(functionArgsNames);
        return func.apply(context, resolvedInjectionsValues);
    };


    /**
     *
     * @param {Object} jsTypeInstance
     * @param {Boolean} [proceedToInjectionsInPostInjectionsMethodToo=false]
     */
    Injector.prototype.injectInto = function (jsTypeInstance, proceedToInjectionsInPostInjectionsMethodToo)
    {
        // Let's scan this JS object instance for injection points...
        var propsToInject = [];
        for (var propName in jsTypeInstance) {
            if (null === jsTypeInstance[propName] && !!this._mappings[propName]) {
                // This instance property is null and its name matches a registered injection name
                // --> let's handle it as an injection point!
                propsToInject.push(propName);
            }
        }

        var resolvedInjectionsValues = this.resolveInjections(propsToInject);

        for (var i = 0; i < resolvedInjectionsValues.length; i++) {
            var propName = propsToInject[i]
              , propValue = resolvedInjectionsValues[i];
            jsTypeInstance[propName] = propValue;//property injection!
        }

        // Okay, now we may trigger the JS object instance "postInjection" method if it has one...
        if (!!jsTypeInstance[this.instancePostInjectionsCallbackName] && (jsTypeInstance[this.instancePostInjectionsCallbackName] instanceof Function)) {
            if (!proceedToInjectionsInPostInjectionsMethodToo) {
                // Simple "postInjection" trigger
                jsTypeInstance[this.instancePostInjectionsCallbackName].apply(jsTypeInstance);
            } else {
                // We will look for injections in the "postInjection" method too!
                this.triggerFunctionWithInjectedParams(jsTypeInstance[this.instancePostInjectionsCallbackName], jsTypeInstance);
            }
        }
    };

    /**
     *
     * @param {Function} jsType
     * @param {Boolean} [proceedToInjectionsInPostInjectionsMethodToo=false]
     * @return a new instance of the given type, with its Injection Points resolved and its "post injections" callback triggered
     */
    Injector.prototype.createInjectedInstance = function (jsType, proceedToInjectionsInPostInjectionsMethodToo)
    {
        var newInstance = new jsType();
        this.injectInto(newInstance, proceedToInjectionsInPostInjectionsMethodToo);
        return newInstance;
    };

    /**
     * Replaces all "${injectionName}" patterns in the given String with the values of the matching Injections Mappings.
     * For each `null` injection mapping value, an empty string is used instead of 'null'.
     *
     * @param {String} str
     * @return {String}
     */
    Injector.prototype.parseStr = function (str)
    {
        var requestedInjectionsNames = [];
        str.replace(/\$\{([a-z0-9_]+)\}/ig, bind(function (fullStr, injectionName) {
            if (!!this._mappings[injectionName]) {
                requestedInjectionsNames.push(injectionName);
            }
            return fullStr;//don't replace anything for the moment...
        }, this));


        var resolvedInjectionsValues = this.resolveInjections(requestedInjectionsNames);
        for (var i = 0; i < requestedInjectionsNames.length; i++) {
            var injectionName = requestedInjectionsNames[i]
              , injectionValue = (null === resolvedInjectionsValues[i]) ? '' : resolvedInjectionsValues[i] ;
            str = str.replace('${' + injectionName + '}', injectionValue);
        }

        return str;
    };

    /**
     * Set the value of all public properties of the target JS object whose name is an injection mapping to "null".
     * This lets you cancel the effect of #injectInto for clean garbage collection.
     *
     * @param {Object} jsTypeInstance
     */
    Injector.prototype.cancelInjectionsInto = function (jsTypeInstance)
    {
        // Let's scan this JS object instance for injection points...
        for (var propName in jsTypeInstance) {
            if (!!this._mappings[propName]) {
                // This instance property's name matches a registered injection name
                // --> let's cancel this injection point
                jsTypeInstance[propName] = null;
            }
        }
    };

    /**
     *
     * @param {Array} injectionsNamesArray an Array of Strings
     * @return {Array} an Array of resolved Injections Mappings values
     */
    Injector.prototype.resolveInjections = function (injectionsNamesArray)
    {
        myDebug && console && console.log('resolveInjections() ; injectionsNamesArray=', injectionsNamesArray);
        var resolvedInjectionPoints = [];

        for (var i = 0; i < injectionsNamesArray.length; i++ ) {

            var currentInjectionName = injectionsNamesArray[i];

            if (!this._mappings[currentInjectionName]) {
                // We have no mapping for this arg : we'll send `null` to the function for this arg
                resolvedInjectionPoints.push(null);
            } else {
                // We resolve the mapping
                resolvedInjectionPoints.push(this._mappings[currentInjectionName].resolveInjection());
            }

        }

        return resolvedInjectionPoints;
    };


    // Library export

    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = Injector;
        }
        exports.MedicInjector = Injector;
    } else if (typeof define === "function" && define.amd) {
        define('medic-injector-sync', [], function () { return Injector; } );
    } else {
        context['MedicInjectorSync'] = Injector;
    }


    // Utils
    // Function reflection
    /**
     * From Prototype library
     * @see https://github.com/sstephenson/prototype/blob/master/src/prototype/lang/function.js
     *
     * Prototype JavaScript framework
     * (c) 2005-2010 Sam Stephenson
     *
     * Prototype is freely distributable under the terms of an MIT-style license.
     * For details, see the Prototype web site: http://www.prototypejs.org/
     *
     * @param {Function} fun
     * @return {Array}
     * @private
     */
    var getArgumentNames = function (fun)
    {
        var names = fun.toString().match(/^[\s\(]*function[^(]*\(([^)]*)\)/)[1]
            .replace(/\/\/.*?[\r\n]|\/\*(?:.|[\r\n])*?\*\//g, '')
            .replace(/\s+/g, '').split(',');
        return names.length == 1 && !names[0] ? [] : names;
    };

    // Functions scope binding
    /**
     *
     * @param {Function} func
     * @param {Object} context
     * @return {Function}
     * @private
     */
    var bind = function (func, context)
    {
        var args = Array.prototype.slice.call(arguments, 2);
        return function(){
            return func.apply(context, args.concat(Array.prototype.slice.call(arguments)));
        };
    };


})(this);