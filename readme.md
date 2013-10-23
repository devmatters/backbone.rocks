Update
======

The [slide deck](http://goo.gl/LlqlFa) from my #html5devconf session "Backbone.rocks - Large scale single page app done right" is up.

Walkthrough
===========

This document will walk you through the application from a 50,000 feet bird's-eye view, showing the overall methodologies and philosophy on how the application is constructed and why we do it that way.

We have also provided literate documentations for each class, see the [**toc**](#) here.

This tutorial is not meant to be a Backbone 101, it will not teach you the basics of Backbone, that's a prerequisites you should already have, if you need help please consult [suggested readings](#suggested_reading) at the end of the article.


Introduction
------------

### How to run ?

The application is self-contained and backbend-less, it does **not** rely on any server logic to work with, just launch a local web server (we use node.js with connect module for the job) and load index.html in browser and you are good to go.

For example, assuming you have node.js on the system and [connect](http://www.senchalabs.org/connect/) module installed, just run following command from terminal in the root directory of the application:

```javascript
node server
```

It will start a local web server running at port 8080, then point your browser to `http://localhost:8080` and start poking around.


### Code Structure 

The application is structured as below:

```
sample-application/
	
	app/
		app.js
		assets/
		css/
		index.html
		js/
		libs/
		pics/
		tpl/
	
	node_modules/
	server.js
```

`node_modules` and `server.js` is used by node.js to run a tiny local web server which is convenient during development, because we use a lot of AJAX calls to fetch javascript files, there will be a lot of cross-domain errors if you don't do this through a web server.



### MVC or MV* ?

So first thing first, you might be wondering are we dealing with MVC or MV* pattern here ? A short answer is that by design, there's no concept of `Controller`, at least not in a traditional server-originated MVC sense, so we gonna say we are using MV* here, meaning most business logics reside in `View` classes.

However, in a real world case when developing large scale web application you might actually need `Controller`, for example:

- Some core operations might be invoked by multiple modules, these kind of logics are generally better off being aggregated in a centralized`Controller` class

- Your are building a WYSIWYG graphic editor which definitely gonna need undo and redo features, these can be easily handled using [Command](http://gamedev.tutsplus.com/tutorials/implementation/let-your-players-undo-their-in-game-mistakes-with-the-command-pattern/) or [Memento](http://www.developer.com/design/article.php/3720566/Working-With-Design-Patterns-Memento.htm) pattern, commands in this case, is the `Controller`.

In this sample application we didn't make much use of `controllers` but does provide preliminary samples on how it could be implemented, just have a look at [js/controllers/AppController.js](#)


### Application Life Cycle

Before we dive into the details let's have a quick look on the application life cycle.

Below is roughly the bootstrapping sequence after the application started running in browser:

1. `app.js` this is main entry point, index.html will point to this file to kick start the application

2. `LangManager` this is run first to load default language files so that UI can be drawn

3. `AppContext` this is where Dependency Injections were setup

4. `AppRouter` handles browser's location change and triggers the first view - 'AppView'

5. `AppModel` this is the central model of the application, needs to be initialized ASAP

6. `AppView` the base view of the application, works with `AppRouter` and `AppModel` to show or hide different child views

After these steps, the first view of the application, by default it should be `HomeView`, will be displayed and you will see the employee listing on the page. 

Aside from having a big picture of the application, you should also understand two fundamental building blocks of the application, which are **[Modular Design](#modular_design)** and **[Dependency Injection](#di)**, we will explain 'Modular Design' first, and 'Dependency Injection' later in the article.

<a id="modular_design"></a>Modular Design
-----------------------------------------

From wiki, `Modular Design` is:

```
... an approach that subdivides a system into smaller parts (modules) that can be independently created and used ...
```

This is *exactly* what we need in a large development environment where works are normally split into smaller chunks and everyone can just focus on building those pieces knowing they won't interfere with other's work, to achieve this kind of separation of responsibility, we need modular design. 

### Why Use Module ?

Does the code below looks familiar to you ?

```javascript
var MyApp = {};
MyApp.views = {};
MyApp.models = {};
MyApp.collections = {};
```
That's a popular way to create namespace under `window` scope and store variables inside, having namespaces is great but by doing it that way you are risk polluting the global variable space and having those variables overwritten accidentally by other programs, hence not such a trustworthy approach and may even be rather error prone. 

When building large applications we tends to have more robust and clean approach of isolating modules, in javascript world the solution to our rescue is called [Asynchronous Module Definition (AMD)](http://en.wikipedia.org/wiki/Asynchronous_module_definition).

There are three major benefits of using AMD:

1. Encapsulate code in a self-contained unit

	The idea here is instead of registering your class/functions under global scope (like `window` or `document`), we want the code to be totally isolated in it's own scope, and only be available to the system via a unique key, also at the same time, making each module as decoupled to each other as possible.
	

2. Ensure dependency files are readily loaded in correct sequence

	In almost any language there are ways for one file to use other files, for example: `#include`, `import`, `require` and `use` are the usual suspects, however, in javascript this is a feature yet to exist, instead, most of the time people just add `<script>` tags in html `<header>` to load whatever is needed, this works but it will soon become tedious and very error prone, have you ever had headaches dealing with correct loading sequence of files ? then you know the nightmare.

3. Load multiple files simultaneously 

	Most AMD implementations have the ability to dynamically load multiple files according to predefined sequence, and better yet they can do this in wholesale, like 'simultaneously firing up 5 ajax calls to the server and fetch all classes'.


Those are the primary reasons that we use AMD. 

To sum it up, when working on large project that last through many years in a big development team, jobs are most likely split into many smaller parts and developers each work on some of them at a time, we wanted each module to be completely encapsulated and decoupled from the system, and modules should never know each other, by doing so, we achieve maximum flexibility and controllability of the program, by adopting modular design we have all these freedom at disposal.


### RequireJS for the job

There are many AMD implementations out there and the one we picked for the job is `RequireJS` because of it's:

- Ability to create discrete JS files/modules
- Provided some sort of #include/import/require functionality
- Ability to load nested dependencies
- Ease of use for both development and Production
- Produce optimized code in just one or a few HTTP calls which helps deployment
- Easily integration with build workflow using gruntjs.
- Very robust

Through out the application you will find most javascript files are nicely wrapped in a RequireJS style module, their syntax looks like this: 

```javascript

// module wrapper
define( [], function(){
    
    // delcare the module we are creating
    var EmployeeModel = Backbone.Model.extend({
		//contents
	});
	
	// return the module to outside world
    return EmployeeModel;
});

``` 

Later when you need one of the modules, just write something like this:

```javascript
// second argument, a function, is the callback
require( [ 'js/models/EmployeeModel' ], function( aModel ){
	var eModel = new aModel();
	eModel.fetch();
})
```

Above code will automatically start downloading `EmployeeModel.js` and when done, execute the callback, this way you don't have to worry about the file downloading and sequence at all.

RequireJS is a very powerful tool but does need some getting used to, but once you get the hang out of it you won't ever want to live without it, so it might be worth the time to have a good read on the [manual](http://requirejs.org/docs/api.html)



Bootstrapping
-------------

### Entry point

Normally people will enter the site by visiting `index.html`, that's where we will hook the page up with our application code by adding one line like this:

```html
<script data-main="app" src="js/require.js"></script>
``` 

Pay attention to the `data-main` property where it points to `app` which will translate to `app/app.js`, it's the entry point of the application, all configurations and bootstrapping process are done there.

There are a couple important things need to be done within `app.js`, let's have a look.



### Requirejs Configuration

At the top of `app.js` is the configuration for RequireJS, where we tell it the location of files to be loaded, like this:

```javascript
requirejs.config({
    
    baseUrl: 'libs', 

    paths: {
    	js: '../js'
    }, 

    shim: {
    	'underscore': {
            exports: '_'
        }
    }
});
```

There are three parts in the configuration that's worth understanding.

1. `baseUrl` This is the searching *root* for all other files, normally it will be where `app.js` is located.

2. `paths` Because searching root is appointed to `libs`, anything outside that folder needs to be redirected, that's done here

3. `shim` when working with some 3rd party libraries like jQuery, Underscore and Bacbkone, they do not support [AMD style](http://requirejs.org/docs/whyamd.html) module definition which means it won't return anything for the module loader to reference later, in this case, we have to manually configure those here. For example, when 'underscore' is loaded, it can be accessed undder 'window._', we tell RequireJS this so it knows how to fetch the reference later.

By correctly configuring this part you will never have to worry about file loading and sequencing problems.


### Application Configurations

In this section we define certain application default settings, mainly locale settings and available languages.

The settings here are normally set on the server before returning `index.html` to client because that's where these information are stored, be sure to consult your backend technology for how to do this right.

```javascript
window.appConfig = {
	
	// is this an multi-lingual application
    useLocale: true
	
	// languages available for the app
    , langMap: {
        "en" : "English"
        , "zh-tw" : "正體中文"
        , "zh-cn" : "简体中文"
        , "jp" : "日本語"
    } 
	
    , detect_os: false
	
	// default language to use
    , default: "en"

    , detectedLocale: null

    , DEBUG: true
}

```

### Application Initialization

```javascript
// app.js
function init(){
        require( [ 'js/AppContext' ], function( injector ){

            var obj = {};
            obj.appModel = null;
            
            obj.appRouter = null;

            injector.injectInto( obj );

            obj.appModel.appRouter = obj.appRouter;

            obj.appRouter.start();

            Backbone.history.start();
        })
}
```

Once basic configurations are done we continue the bootstrapping process, first we need to detect which *UI* language to use and download that language file (more details on [this](#lang_manager) in next section), once that's done we continue to create the `AppContext` where `Dependency Injection` happens, we will explain [this in detail later](#di), then we created `appModel` and `appRouter` which are the two most important elements for the applications. 

Pay attention to the last two lines it's where the application really gets kicked off.


<a id="lang_manager"></a>Internationalization (i18n)
------------------------------------

Internationalization is one of the most important feature for modern web applications, and since it's most certainly one of the first things to be handled when application starts to run, we will have a look at first.

If your application needs to support multiple languages (internationalization, aka. i18n), good news is we understand this is such a common use case that we've implemented an url-friendly approach for it, through out the application you will see the content of browser location like this:

```
http://localhsot:8080/#en/page/1
```

The `#en/` part of url means it's currently using English as the UI language, you can change it to other language, for example, Japanese, by entering:

```
http://localhsot:8080/#jp/page/1
```

This will trigger a route change event and eventually bubbles to `AppModel` and `AppView` to have the application refreshed and displayed in Japanese.

Of course this is under the assumption that your application **do** support Japanese, otherwise, it will fall back to default language, which in our case it would be English.

We encapsulate all locale-related functionalities in `AppModel` and `LangManager`, whenever you need to switch languages, a simple call to `AppModel.swtichLang()` will do the trick.

All hard works inside `swtichLang()` are actually delegated to `LangManager`, which is an all static class with methods like `getLang()` and `hasLang()`, notice most of the methods are *async* enabled, meaning they come with `promise` support, for example when invoking `getLang()` it returns a `promise` object immediately while the underlying transmission work are still in progress, this let you instead of writing callbacks you could pass in a handler to `done()`. 

See the example:

```javascript
LangManager.getLang( appConfig.default ).done( init )
```

Also note if you let users change UI languages via the UI, say you have a dropdown menu with different languages, when user picked a new language from the dropdown menu, your code should invoke `AppModel.switchLang()` because it will not only delegate works to `LangManager` but also update browser's location accordingly.


<a id="di"></a>DI and IoC
------------------------------------------------------------

Dependency Injection (DI) and Inversion of Control (IoC) are two important approaches used through out the application which makes our app ultra flexible.

### Dependency Injection Basics 

From wiki [Dependency Injection](http://en.wikipedia.org/wiki/Dependency_Injection) is: 

```
a software design pattern that allows removing hard-coded dependencies and making it possible to change them, whether at run-time or compile-time.
```

Consider following code, normally you will hardcode `Foo` class directly in the code and create an `foo` instance from of it, but what if later for some reasons we need to swap `Foo` for `Bar` (maybe an alternative module with different implementation), you will have to revise the code every time this happens, this doesn't sound very flexible. 

```javascript

(function(){
	// Order class has hard-coded reference to Foo class inside
	function Order(){
		var foo = new Foo();
	}
})()

```

A more flexible way to do this would be abstracting out the `Foo` class, and only pass in the `Clazz` needed from outside, on the fly, like this: 

```javascript

(function(){
	
	// Clazz will be passed in during runtime from the main program
	// it could be Foo or Bar depending on your needs
	function Order( Clazz ){
		var instance = new Clazz();
	}	
	
	// pass the class, Foo, into Order class when creating instance out of it
	var order1 = new Order( Foo );

	// later in the program we might pass 'Bar' to create another instance
	var order2 = new Order( Bar );
})()
```

Notice that `Order` class takes one argument, which is the concrete class to be used, `Clazz` could be `Foo` or `Bar`, by doing so you are seeing **Dependency Injection** at work, some practical use cases include (from wiki):

```
be used as a simple way to load plugins dynamically or to choose stubs or mock objects in test environments vs. real objects in production environments. 
```



### Inversion of Control 

We could take above sample to a better level by *not* specifying `Foo` and `Bar` at compile time at all, instead, we will use a configuration file to dynamically decide whether to pass `Foo` or `Bar` into `Order` class based on different conditions at *run time*, this is an advanced technique called `Inversion of Control`(IoC), definition from wiki: 

```
With IoC, object coupling is bound at run time by an assembler object and is typically not known at compile time using static analysis.
```

Hava a look at the revised example:

```javascript
(function(){
	
	function Order(){
		// Clazz will be injected during run time
		// it could be Foo or Bar depending on the configuration
		var Clazz = null;
		var instance = new Clazz();
	}	

})()
```

Notice `Order` class doesn't accept any argument, instead `Clazz` was **automagically** injected during runtime based on a configuration file.

The main difference between DI and IoC is:

- With DI, dependency are hard coded (or to say it's decided at compile time), remember `Clazz` argument for `Order` class in our first example ? That's the hardcoded part.

- With IoC, dependency are *injected* during run time directly into calling class based on configuration settings.

So what's the relationship between the two ? according to wiki: 

```
Inversion of control relies on dependency injection because a mechanism is needed in order to activate the components providing the specific functionality. The two concepts work together in this way to allow for much more flexible, reusable, and encapsulated code to be written.
```



### Working with DI, IOC and RequireJS

Remember earlier we were using RequireJS to manage sequential loading of application dependencies (ie: a bunch of javascript files) ? That's all good and well, but with RequireJS you still have to hard-code needed classes in the class definition, which makes the code a little bit smelly.

Originally with RequireJS we would write:

```javascript
require( [ 'js/models/EmployeeModel' ], function( EmployeeModel ){
	var instance = new EmployeeModel();
	instance.fetch();
})
```
Notice `js/models/EmployeeModel` is the dependency and you have to hard code it in require() statement, along with `EmployeeModel` as the argument to callback.

Now With DI/IOC in place, we could revise it to:

```javascript
require( [], function(){
	
	// EmployeeModel class will be injected on the fly
	var EmployeeModel = null;
	
	var instance = new EmployeeModel();
	instance.fetch();
})
```

Notice there is no arguments in `require( [], function(){` at all, because needed class will be injected during run time, and better yet, we uses a separate configuration file to define 'what goes into which class' so it's super flexible to have multiple copy of `context` files and use accordingly, say one of production and one for testing, will elaborate on this later.


### The DI/IOC tool behind

There are a bunch of DI/IOC utilities out there and after carefully survey we picked [Medic-injector](https://github.com/DrBenton/Medic-Injector-JS) for the job, because: 

- It's simple and beautiful API design
- It's small and lightweight, providing stuff just needed
- It's modeled after SwiftSuspenders and Robotlegs which had been battle-tested for years
- It works particularly well with RequireJS

#### Four ways to inject objects

Medic-injector provided four ways to configure how objects can be injected into classes, as shown below: 

```javascript

// 1. to inject an instance
.toType( AppView );

// 2. to inject a singleton 
.toType( AppRouter ).asSingleton();

// 3. to inject a Class definition or Static Class
.toValue( Utils );

// 4. to inject raw Javascript value (String, Number, Object, Array...anything)
.toValue( ['foo', 'bar']);

```

You will see how to use each of these methods in `AppContext` as below.


#### AppContext

Here is an excerpt from `AppContext.js`, this is the place where we *wire* the application together, telling the program 'what to feed into which' class during runtime, you can see the combined usage of RequireJS and Medic-injector, they played pretty well with each other.

```javascript

// AppContext itself is a RequireJS module
define( 

  // specifying the classes needed
  [ 'medic-injector-sync'
  , 'backbone'
  , 'js/routers/AppRouter'
  , 'js/models/EmployeeCollection'
  ], 

  // required class reference listed here
  function( Injector
    , Backbone
    , AppRouter
    , EmployeeCollection
  ){
	
	// create the IoC container/assembler
    var injector = new Injector();
	
	// whenever someone says it needs 'appRouter', feed it with a singleton insatnce of 'AppRouter'
    injector.addMapping('appRouter').toType( AppRouter ).asSingleton();
	
	// another injection, but this time we are feeding it with a Class definition, not instance
    injector.addMapping('EmployeeCollection').toValue( EmployeeCollection );
	
	// return the IoC container to outside world
    return injector;

});
```

As you might have figured, you could have multiple context files for different purposes, say your application needs to run on deskptop, browser and mobile devices, each of these targets might require slightly different implementations, you can create multiple context files and specify different wiring logics then switch between them. 

Now think what if all these sits niecly with your existing build process, continous integration system and deployment workflow ? It's quite powerful right ? *That's why we use it.*

### When and where to hook all this up ?

Normally you need to do something like this to have the injection complete:

```javascript
var instance = new Clazz();
injector.injectInto( instance );
```
By doing so everything listed inside Clazz that's requiring injection will be handled by injector.

We know this is a drill to do this every time when you write a new class, so we provided `backbone.addon.js` to do this automatically for you, more details on 'addon' [here](#).


### Example Usage from the application

Through out the application you will see a lot of combined usage of RequireJS, DI and IoC, for example, in a typical View class it will look like this: 

```javascript

// EmployeeView.js
define( [], function(){

    var EmployeeView = Backbone.View.extend({
	
		// all of the variables listed below will be injected during runtime, which is configured in 'AppContext.js'
        initialize: function( options ){

            //[inject EmployeeSummaryView] <- this is not required, just info for human
            this.EmployeeSummaryView = null;

            //[inject EmployeeListView]
            this.EmployeeListView = null;

            //[inject ReportCollection]
            this.ReportCollection = null;

            //[inject HomeListingItemView]
            this.HomeListingItemView = null;

            //[inject]
            this.EmployeeCollection = null;

            //[inject]
            this.appModel = null;
        }, 
	
	// ommitted 
```

All these may seem a bit tedious and extra works at first, 

but once you get a hang of it, you will realize how valuable it is to have such deciplines in place for a big team environment with dozens of developers coworking at the same time, these will prevent errors and help to gain producibility, we want everyone to work with-in their own scope, writing fully encapsulate modules, and later assemble those units togehter in a managed manner.

Plus, this application already provides sample files that could be used as template to build upon, so most of the time it's just copy and paste then revise accordingly.



Routing
-------

Once our application is kickstarted, the first thing we will deal with is the routing, that's the url you see in browser like this:

```
http://localhost:8080/#en/page/1
```

This simple url conveys a couple of important informations:

- `http://localhost:8080/` the protocol, host and port that page is serving from
- `#en/` the locale we need to serve, there's a complete locale-related utils baked in to handle this
- `page/1` this RESTful path tells us to display page one of a list

All these infromation from url will be recieved by Router and trigger different handlers.


### AppRouter

This class does following things: 

1. Declare routing rules and handlers
2. Setting up the first view

This is like the central hub of the application, handles the location change, browser history and locale switching, let's have a detailed look.


#### 1. Declare routings and handlers

```javascript

routes: {
      ":locale/page/:id":         "gotoPage"
    , ":locale/contact":          "contact"
    , ":locale/employees/:id":    "employeeDetails"
    , "*notFound":        		  "catchAll"

},
```

This part is pretty straight forward, just declare all routing rules needed here and assign it's handler, one thing to note though is `*notFound`, this acts as a 'catch-all' handler, all unrecongnized url patterns will fall into this part and handled by `catchAll()`, in that function we might just re-direct user back to the homepage.

Also note in most of the routing handlers the first thing to run is often `checkLocale()`, this function handles two important things:

1. It checks if user entered a new url to change locale, say from `/#en/page/1` to `/#jp/page/1`, this means we need to switch to Japanese internally.

2. Check if url is legal, user might enter something like `/#foobar/page/1` where `foobar` is not among supported locales, under this situation we will fallback to English (or whatever you set in `window.appConfig` object)



#### 2. Setting up the first view

In `app.js` after all initializations were done, we invoked `obj.appRouter.start();`, which looks like:

```javascript
start: function(){
            
    var self = this;
	
	// check if this is a multi-lingual all, and switch to assigned locale
    if( appConfig.useLocale == true ){
        this.appModel.switchLang( appConfig.detected_locale , true).done( function(){
            $('body').html( self.appView.render().el );
        });
    }else{
        $('body').html( self.appView.render().el );
    }
},

```

In above code we switch the locale to designated one, notice all locale switching are done via `appModel.switchLang()`, and because it might take some time for new language file to be downloaded, `appModel.switchLang()` returns a `promise` object for us to chain done() handler, inside the handler we added the first view of the application, named `AppView`, more details [here](# "連往 AppView.js 一節").




View
----

View is composed of two parts:

1. javascript: the controlling part of a view, handles view logics and related works.

2. html: the ui part of a view, displaying ui elements like `<input type='button'>`, most of the time it comes in the form of template

The naming convetion here is:

- `HomeView.js` this is the javascript that controlls the view
- `HomeView.html` this is the ui part contains in template

These two comes in pair, and we **never** put any business logics in the html part, letting it be a simple dummy ui elements holder, and write all logics in the javascript part, this way we can easily switch between different view implementations(templates) and re-use javascript class across the application.

Now let's have a detailed look at these two parts.

### 1. View - Javascript part

Below is a typical `View` js file, this is where we write all the logics to control ui elements, listening to ui and model events and send messages to other part of the application.


```javascript
define( ['text!tpl/HomeView.html'], function( tpl ){

    var HomeView = Backbone.View.extend({

        CLASS_NAME: "HomeView",

        initialize: function( options ){
			// content...
        }, 

        template: _.template( tpl ),

        render:function () {
            this.redraw();
            return this;
        },

        redraw: function(){
        	// content...
        },
		
		// ==========================================================================
        // view events and handler
        // ==========================================================================
        
        events:{
            "click #btnSearch" :        "handleSearchClick"
            , "input #inputSearch" :    "handleInputText"
        },

        handleInputText: function( evt ){
        	// content...
        }, 


        // ==========================================================================
        // model events and handler
        // ==========================================================================

        modelEvents: {
            "change:listing_page appModel" : "gotoPage",
            "change:currentLang appModel" : "currentLangChangeHandler"
        },

        currentLangChangeHandler: function(){
            this.render();
        },

		// omitted

    });

    return HomeView;

});

```

As you can see there's a certain life cycle for every view, and certain routines to be executed, let's have a look at the breakdown of a view life cycle.


#### View life cycle


When a new instance of view is created, the life cycle for a view is:

- `constructor` It's handeld by backbone automatially, mostly handling any options passed in, you shoudn't touch this.

- `initialize` Here we declare all injectable variables (which will be handled by `injector` mentioned before, and post-process any options passed to constructor, some key arguments from options include model, collection must be persisted here. *Generally* speaking we want to keep this area as lightweight as possible for view initialization speed consideration.

- `render` This is the main point to have a view really 'drawn', most of the time it will execute a template function and have all html elements created and attached to view's root element (by default in backbone it's a `<div>` element).

- `redraw` This is the sub-routine that handles update of view, it's separated from `redraw()` because some parts of the view need **not** be updated everytime when data(model) changes, so it's lightweighter to have it isolated and called repeatedly.

- `disposs` When a view is about to be removed from the DOM, this will properly clean after itself, dis-engage any event listeners and handlers, the main purpose here is to prevent memory leakage. Note this function is provided by `backbone.addon.js` and runs automagically in the background, will cover this part later in [AppView](#app_view)


### 2. View - Html/Template part

Most of the time a view in the application is composed of templates, something looks like this: 

<pre>
```html
<ul class="nav">
    <li class="home-menu active"><a href="#"><%= _i18n.ui_home %></a></li>
    <li class="contact-menu"><a href="#contact"><%= _i18n.ui_contact %></a></li>
</ul>
```
</pre>

The above code is created with Underscore's built-in templating system, but it can easily be switched to other template systems like [Handlebar](handlebarsjs.com/‎) or [Mustache](mustache.github.io/‎), whatever fits your needs best. 

One rigid rule here is we **never** put any business logic inside the template, it's main purpose is to take in a couple of data objects (model/collections) and render those data into view by creating html elements like `<li>`, what's allowed here is to use templating system's built-in logic functions like `if/else` and `for/while` to help renderering, say look through an array to build a html table. 

Also note if your application is multi-lingual enabled, like this sample application, locale stirngs will be passed in too, in above example, the `_i18n` is a special property attached to data object, which provide translations to all labels, just be advised this may not be the same for other templating systems, but the core idea is the same. 


### Main functionalities of a View

View is mainly responsible for two things:

1. Listening to model events and update view accordingly
2. Accept user inputs from UI and modify models/collections accordingly


#### 1. Listening to model events and update view accordingly

One very important concept in any MV* application is "view conforms to model faithfully", which means the primal goal of any view is to reflect the states of the model, whenever the model changes, view changes too, also, when there's need to change view, you should change the model and let the "reflecting" flow works it's way to trigger view redraw, we will show this in detail.

Because `model` is the cornerstone for a view, often times when creating a view class, we will pass in models and collections in the constructor like this:

```javascript
var view = new View({ model: userModel, collection: memebersCollection });
```

Notice we passed in `userModel` and `membersCollection` in view's constructor, these two will be persisted inside View for later referencing.

Then we hook up event listeners to those model and collection like this:

```javascript
modelEvents: {
	// this means we listen to 'model' and whenever the property 'listing_page' changes, trigger 'gotoPage' handler
    "change:listing_page model" : "gotoPage",
},

// model event handler
gotoPage: function( model, page, options ){
	// contents
},
```

Backbone by default didn't provide a declarative way of doing this, hence we created `backbone.addon.js` to provide that.

In this example, whenever the `listing_page` property in `model` changes, it will dispatch `change:listing_page` event and trigger our `gotoPage()` method.

As you can see, all you need to do is to list every model event that you want to monitor then write event handlers accordingly, this way it's very verbose and easy to understand what's being monitored and reacted upon to the model.

For a quick reminder, when working in a large project with big teams, we favor clarity over brevity, by writing declarative and verbose code we help other developers on the team to better and faster understand our logic and what the code does, which helps produtivity in the long run and eliminate errors.


#### 2. Accept user inputs from UI and modify models/collections accordingly

View is normally composed of a bunch of ui controls that user can interact with, like a button and when clicked will trigger searching, we usually handle it like this:

```javascript
events:{
    "click #btnSearch" :        "handleSearchClick"
},

handleSearchClick: function( evt ){
	// content...
}, 
```
As seen above, Backbone has a nice declarative way to specify view events and it's handlers, in this case, it's basically saying "whenever `#btnSearch` element on the page is `clicked`, trigger `handleSearchClick()`"

This is the same declarative approach we used above for handling model events.

＊＊＊

So far you had seen what `view` does and how it does it, after understanding those basic concepts, it's time to look at some real world samples from the application. 

The first `view` we will be looking at is `AppView`. 



### <a id="app_view"></a>AppView as the base view

`AppView` is some sort of a 'special' view in the application, because it's the base of all views, and it's responsible for some key view-related operations in the entire application.

Here is a break down of it's main functionailities:

- **Hosting sub-views:** 

`AppView` is the first view created when app was bootstrapped, we did this in `AppRouer.start()` where `$('body').html( self.appView.render().el );` is run. As a base view, `AppView` normally don't have any ui elements in itself but hosts other sub-views that will be created later.

- **Switching sub-views:** 

One very important task for `AppView` is to handle sub-view switching, that is, whenever there's a need to change one view to another, it will be done here via `switchSubview()`, we intentionally aggregated the work here in one place so that the responsibility is isolated and easier to maintain, read more about [view switching workflow here.](#view_switching_flow) 

- **Refreshing the whole application:**

There may come times that we need to redraw the whole app, for example, when user switches language from Japanese to German, `AppView` will catch this change event and triggers a series of sub-views changing process and eventually have all pages in the application refreshed and presented in Germany.

- **Hosting static parts:**

One thing to note though, if there are static parts like header and footer that will never change, it would be a good idea to just place them inside `AppView`, it's also a good candidate to hook up any tracking/analytics tools you might be using, like Google Analytics.

Here's how `AppView` looks like:

<pre>
<div id="AppView" class="container">
    <div class="row-fluid">
        <div id="content" class="span12" ></div>
    </div>

    <hr>

    <footer>
        <p><%= _i18n.app_name %> <%= _i18n.app_copyright_year %> <a href="https://twitter.com/thebackbonrocks"><%= _i18n.app_twitter %></a></p>
    </footer>

</div>
</pre>



#### <a id="view_switching_flow"></a>View Switching Workflow

Here we will dig into more details on how the view switching works because it's one of the core funcionalities that drive's the application.

A rough workflow looks like this:

1. changes in browser location.
2. AppRouter catches the change and trigger a routing handler
3. AppRouter handler sets new view state via AppModel
4. AppModel triggers event and catched by AppView
5. AppView triggers switchSubView to ends the job

In short, it's: `appRourter > appModel > appView > child views`

As in a server-oriented application, all view changes start with the modification of location, say from `/#en/page/1` to `/#en/employees/2`, in a backbone application, this kind of changes will trigger a routing event, which we handles in `AppRouter` like this:

```javascript
routes: {
      ":locale/page/:id":         "gotoPage"
    , ":locale/employees/:id":    "employeeDetails"
},
```

`appRouter.employeeDetils` content:

```javascript
this.appModel.setViewState( 'EmployeeView', {id:id} );
```

`appModel.setViewState` content: 

```javascript
this.set( 'currentState', { state:state, params:params } );
```

Whenever we set something on model, it will trigger a change event, in this case it would be `change:currentState` event, it will be catched by `AppView` and eventually handled by `appView.switchSubView` have a look:

```javascript
switchSubview: function( model, newStateObj, options ){
            
    this.newStateObj = newStateObj;

    if( this.currentView ){
        this.currentView.dispose();
    }

    switch( newStateObj.state ){

        case "HomeView":
        case "EmployeeView":
        case "ContactView":

        // ommitted
```

Notice `switchSubview` will dispose current view (if there is any) so that we don't have to worry about memory leakage or any event listeners hanging around and lurking in the background, `View.dispose()` is provided by `backbone.addon.js`.

Here's what `dispose()` did:

```javascript
Backbone.View.prototype.dispose = function () {
    
    if (this.beforeDispose) {
        this.beforeDispose();
    }

    if( this.subViews ){
        var i;
        for( i=0; i< this.subViews.length; i++ ){
            this.subViews[i].dispose();
        }
    }

    this.subViews = [];

    this.remove();  

    this.off();
};
```

Overall speaking, by aggregating view switching logics in one place, it will be more clear for other developers to understand how the flow works, and easier to maintain when the codebase grows.


### <a id="generic_view"></a>Other view samples

The `AppView` we just went through is somewhat special because it handles a bunch of stuff that *normal* views don't have to, so we highly encourage you to read the sources to following classes:

- HomeView.js
- EmployeeView.js
- EmployeeSummaryView.js

Pay special attention to how those views handles ui components like `Select2` and `X-editables` for better user experience, like search as you type and easier form editing, also the interaction between view and models. 







Model
-----

By design the basic functionalities of a model in Backbone are: 

1. Data storage: a UserModel might stores name, email, phone, address properties

2. Event channel: whenever a property was changed it will dispatch event

3. CRUD handling: persist any changes made to the model back to server

We further extended it with: 

1. Public API provider
2. Declarative one-to-many property handling with lazy-loading trigger
3. Declarative defaults{} value for each property
4. Declarative model validations with auto triggering
5. Orphan model without collection handling

Let's have a look on each of them. 

#### Public API provider

Sometimes before setting a value into model, we need to do some preprocess, for example, checking if the value is correct, or transform it to other format, hence it's easier for a model to provide public API to the rest of the application, something like this:

```javascript
//from AppModel.js
goto: function( url, options ){

    if( appConfig.useLocale == true ){
      url = this.get('currentLang') + url;
    }

    this.appRouter.navigate( url, options );
 },
```

Through out the application whenever we need to trigger a view change, normally we will do it this way:

```
this.appRouter.navigate( '/#en/page/2' );
```

but by doing so, you are hard-coding the locale `en` in the argument, what if later user switch language to `jp` ? a better way to do this is **not** to include locale as part of the argument, and call the API provided by model like this:

```
this.appModel.goto( 'page/2' );
```

As you can see from above code, `goto()` will prepend current locale to the argument, then trigger `appRouter.navigate()` for you, it's obviously more flexible and less error-prone this way. 


**2. declarative one-to-many property handling with lazy-loading trigger**

There are times we need to handle 'one-to-many' case in the model, ie: a property in the model contains an array of other models, take `EmployeeModel` for example, it has a property called `reports` which contains all team members belongs to the leader, literally it stores an array of EmployeeModels.

It looks something like this:

```javascript
//EmployeeModel.js
reports: null   // ReportCollection[ EmployeeModel ]
```

In above sample we take it a bit further by storing a `ReportCollection` in `reports`, and `ReportCollection` itself contains a bunch of EmployeModels, we did it that way so that later in the view it can register event listeners to model/collection as usuall.

Because this is such a common use case, we designed a declarative way to handle it:

```javascript
//EmployeeModel.js
oneToMany: {
    reports: {type: 'js/models/ReportCollection', lazy: true}
},
```

By adding above code to a model, it knows how to correctly handle one-to-many property `reports`, we tell the model there will be a `ReportCollection` stored in `reports`, and `lazy: true` means don't fetch the contents of `ReportCollection` immediately, instead only do it until the last minute when data are needed, by default it's set to `true`.

All these magics happen in `backbone.addon.js`, have a look if you are interested.

**One thing to note though**, when dealing with one-to-many relationship, chances are you might run into 'circular reference' issue, that is A needs B, and B needs A, in our example, that would be `EmployeeModel` depends on `ReportCollection`, and `ReportCollection` also depends on `EmployeeModel`.

This is an issue because when using AMD-style module loader (like RequireJS in our case), the race condition caused it fails to handle this situation automatically, hence needs some work-arounds, the solution is rather simple:

```javascript
// EmployeeModel.js
var Clazz = require('js/models/EmployeeModel');
this.__proto__.model = Clazz;
```

By calling `require()` with one argument, it will fetch the loaded module `EmployeeModel` and avoid circular reference, the 2nd line assign the Clazz to `model` property using `__proto__` because it was defined there.

Keep this trick in mind for that it mind comes in handy someday to solve cases like this.



**3. declarative defaults{} value for each property in the model**

It's a good habit to *always* list all properties in a model so that other developers knows what goes in here, the sample below did just that in a declarative way:

```javascript
defaults:{
    blog: "",
    cellPhone: "",
    city: "",
    department: "",
    email: "",
    firstName: "",
    id: null,
    lastName: "",
    managerId: -9999,
    managerName: "",
    officePhone: "",
    pic: "",
    title: "",
    twitterId: "",
    reports: null   // ReportCollection[ EmployeeModel ]
}, 
```

Note all properties have default values, if time permits, you should add type information too, for example, `city` is of type `String`.

Backbone model comes with a `clear()` function which conveniently removes all attributes from the model, including `id` attribute, so that you can cost-efficiently reuse a model (remember, creating and destroying objects is very expensive, memory-wise), but since we want the model to always have default values, it would be perfect if after each `clear()` call, it will restore `defaults` value to the model.

We added this in `backbone.addon.js`, so everytime when you invoke `clear()`, it will automatically restore all attributes and their values for you.


**4. declarative model validations and triggering**

One of the most important things for a model is data validation. Think in a typical CRUD style application, whenever user entered a new value, you will have to validate it against some rules.

We added a nice declarative way to do this in `backbone.addon.js`, which looks like this:

```javascript
//EmployeeModel.js
validators: {
    firstName: 'validateName',
    lastName: 'validateName',
    title: 'validateTitle',
    managerId: 'validateManager',
    officePhone: 'validatePhone',
    cellPhone: 'validatePhone',
    email: 'validateEmail',
    twitterId: 'validateTwitter',
    reports: 'validateReports'
}, 
```

In above sample, `firstName` is one property of `EmployeeMdoel`, and it's paired with a validator function called `validateName`, which looks like this:

```javascript
validateName: function( value, field, options ){
    if( value === '' )
        return {field: field, msg: 'can not be empty'};
}, 
```

A simple rule for every validator is: *if the value passes the validation, return nothing, otherwise return error message.*

With above settings in place, whenever `firstName`'s value changed, it will trigger `validateName()` function and if new value failed the validating process, model will trigger an `invalid model` event and you can catch this in the view class like this:

```javascript
//EmployeeSummary.js
modelEvents: {
    "invalid model" : "invalidationHandler"
},
```

The signature of `invalidationHandler` is: 

```javascrit
invalidationHandler: function( model, errors, options ){
	// contents
}
```

Inside `invalidationHandler()` you can update the view with error messages or marking form fields with red lines...etc, you can try the edit function in employee page and enter invalid values to see how this works, trace the code in both `EmployeeSummaryView.js` and `EmployeeView.js`.


**4.1 Four ways to declare validators**

There are four ways to declare validator functions, as listed below:

**A. Declare validator method inside the model class**

```javascrit
validators: {
    firstName: 'validateName',
}, 
```

**B. Invoke validator methods from an obj**

You can aggregate all validation methods in a class called `ValidatorManager`, and inject it as `validatorManager` inside `EmployeeModel`, then you can declare the validation method this way:

```javascrit
validators: {
	email: 'validatorManager validateEmail'
}, 
```

**C. Invoke validator methods from a **nested** obj**

This is a more advanced use case, say because you have so many validators in `ValidatorManager`, you decided to partion them with namespaces, so it becomes:

```javascript
ValidaorManager.accounting.validateCurrency();
ValidaorManager.accounting.validateNumbers();
ValidaorManager.invoice.validateAddress();
ValidaorManager.invoice.validateZIPCode();
```

In this case, you can delcare the validations this way:

```javascrit
validators: {
	address: 'validatorManager.invoice validateAddress'
}, 
```

`Backbone.addon` will figure out the `validatorManager.invoice` part and correctly invoke `validateAddress()` for you. This is most useful for a big dev team that many people might be writing validators at the same time, so they can each work inside their own namespace without interferring wtih others.


**D. Invoke function directly**

The last way to declare a validator is by assigning a function directly, for example: 

```javascrit
validators: {
	phone: function( attrs, options ){console.log('phone validator');}
}, 
```

This is the simplest form of writing a validator.



**5. Handling oraphan model without collection**

Normally in backbone, model belongs to collection, so whenever you invoke `model.save()`, model will delegate the task to collection and let collection handles the talk with server and have the data persisted.

But sometimes you might create a model without saving it to a collection, hence it become an orphan, what happens if you then invoke `model.save()` ? 

One real world case is in `AppView.switchSubView()`, if user entered `#en/employees/8` in browser and hit enter, we will create a new model and tries to fetch it's content, here how it looks like:

```javascript
employeeModel = new this.EmployeeModel({ id:employeeId }, {url:'user/get/'})
```
Notice the second argument where we passed in an `url` path, this value will be saved by `backbone.addon` internally and later when you invoke `model.save()`, that orphan model will use this `url` value to talk to server and have data persisted.

**You can refer to** `EmployeeModel` for implementation details.


### More on AppModel

In our application, `AppModel` is some sort of special model, because:

1. It's the central storage for the whole application, all system-wide variables should be stored here
2. It doubles as a global event bus, whenever you invoke `model.set('key', 'value')`, it will dispatch event
3. Providing some important APIs like `switchLang()`, `goto()`

Let's walk them through.

**1. Central storage**

It's a good habit to store application states in a central place, for example: which view are currently in display, paging number of the main listing table, and which locale are we in ?

Look at this example, they are all storing system wide data in `AppModel` so that every class in the application could access those data any time:

```javascript
this.appModel.set('listing_page', id);
this.set( 'currentState', { state:state, params:params } );
this.set('currentLang', lang, {silent: !!silent});
```

**2. Global event bus**

In the past people tends to create an obj acting as 'event bus' so they can dispatch and catch events from everywhere in the application, in our experience this approach does look very convenient at beginning but as the codebase grows, eventually you gonna lose control to the event bus, not knowing what's passing through the events and who are listening to which events, it became a giant dumpsite.

This is why in the sample application, we eliminated this kind of event bus at all, instead, everything must go through `AppModel` and the standard way of doing it is `AppModel.set('key', 'value')`, because by invoking `set()` you are guaranteed to trigger an event (unless the value didn't change), so whoever needs to know that change can just listen to `AppModel` for it, for example:

```javascript
// AppView.js
modelEvents: {
    "change:currentState appModel" : "switchSubview",
    "change:currentLang appModel" : "currentLangChangeHandler"
}, 
```
In above code, `AppView` listens to `appModel` on two events, `change:currentState` and `change:currentLang`, those events are triggered by `this.set( 'currentState', { state:state, params:params } )` and `this.set('currentLang', lang, {silent: !!silent})`.

So you can see the pattern here:

- Wanna store something ? use `AppModel.set('key', 'value')

- Wanna know if anything has changed ? add a declarative instruction to modelEvents object like `"change:currentState appModel" : "switchSubview"`



**3. Providing important APIs**

`AppModel` as a central hub stands a unique position to host some frequently used APIs, those are most likely to be invoked everywhere from the application, lets have a look at some of them.

- **setViewState()**

Remember in `Routing` section, we explained what happens when user changes the url location of the browser ? eventually that change will lead to `AppModel.setViewState()`, this is the central place to set current state of the application, and trigger a view change.

By providing this method it's guaranteed that the application state is persisted at all times, and can be access from anywhere within the application.

```javascript
setViewState: function( state, params ){
	// contents...
}
```

- **switchLang()**

As you might already figured, changing the locale of an application is such a high level operation, it deserves to be elevated to `AppModel` so it can be invoked from anywhere.

```javascript
// AppModel.js
switchLang: function( lang, silent ){
	// contents..
}
```

Above examples should give you a feel on what should become a API in `AppModel`, just remember, less is more, don't add unnecessary methods to it just because you can.




Collection
----------

Collection is the place where we store a bunch of models, by default Backbone provided collections with following: 

- `models` to access all model objects stored inside
- 28 mix-in methods from underscore lib 
- `sync` method to talk to server for fetching and persisting data
- CRUD of models and trigger events accordingly

Most of the time using `collection` is rather straight forward, let's have a look at the standard backbone collection class. 

### EmployeeCollection

`EmployeeCollection` is the most basic collection class used in the sample application, as you see it's implementation is pretty simple, just pay attention to two things:

1. We fixed the circular reference issue between `EmployeeModel` and `EmployeeCollection` using the `require()` command.

2. We provided customized `sync()` method to talk to our home made `MemoryStore`, which is a in-memory storage to make the example a bit easier to run without needing a server counter part, more on both these in later secionts.


```javascript

define( [], function(){
    
    var EmployeeCollection = Backbone.Collection.extend({

        CLASS_NAME: "EmployeeCollection",

        initialize: function(options){
            this.memoryStore = null;

            // fix circular reference issue
            var Clazz = require('js/models/EmployeeModel');
            this.__proto__.model = Clazz;
        },
	
		// customized sync method to interact with MemoryStore instead of server
        sync: function(method, model, options) {
            if (method === "read") {
                this.memoryStore.findByName( options.data, function (data) {
                    options.success(data);
                });
            }
        }
    });

    return EmployeeCollection;
});


```










### PaginatedEmployeeCollection

In real world case most of the times you might be dealing with large amount of data, say 100,000 records in the database, which is impractical to download them all to the client, instead, we will use some sort of pagination tricks to fetch those data in multiple batch.

There are a couple of pagination solutions for backbone out there and after careful investigation, we picked **[Backbone.Paginator](https://github.com/addyosmani/backbone.paginator)** for the job for following reasons:

1. It's clean and robust API designs
2. It support two modes: clientPager and requestPager which fit the need for both mobile application and web requirement
3. It works nicely with many paginating ui controls

Below is the code sample for typical use of `backbone.paginator`:

```javascript
// HomeView.js
// configurations for paginated collection
var config ={

    server_api: {
      // the query field in the request
      '$filter': '',

      // number of items to return per request/page
      '$top': function() { return this.perPage },

      // how many results the request should skip ahead to
      // customize as needed. For the Netflix API, skipping ahead based on
      // page * number of results per page was necessary.
      '$skip': function() { return this.currentPage * this.perPage },

      // field to sort by
      '$orderby': 'firstName',

      // what format would you like to request results in?
      '$format': 'json',

      // custom parameters
      '$inlinecount': 'allpages',
      '$callback': 'callback',
    }
};

this.colEmployees = new this.PaginatedEmployeeCollection( config );

```

Once a paginated collection instance is created, we invoke it this way:

```javascript

// setting query string in $name property
this.colEmployees.server_api.$name = "";

// fetch the data
this.colEmployees.fetch( {reset: true
    , success: _.bind( this.updatePagination, this )
} );

// callback for collection
updatePagination: function(){

    // trigger pagination logics for the collection
    this.colEmployees.bootstrap();
	
	// updating ui control
    this.$bootpag.bootpag({ total: Math.max( 1, this.colEmployees.information.totalPages), page: 1 } );

    // updating browser's location value
    this.appModel.goto('/page/1', {trigger: false, replace: true});
},

```

The code above tells the collection to fetch a pack of data, say 60 `EmployeeModel`s, and pages it into 6 pages with 10 records each page, then update the view, in this case, it involves one `bootpag` ui control and the browser's location.

Although in the sample we are using `clientPager` mode because all our data are already in memory, but the API for `requestPager` is pretty much the same and should be equal straightforward to invoke.


**The pagination ui control** we used in the sample is [**bootpag**](http://botmonster.com/jquery-bootpag/), it provides all common features needed for a pagination control, and it works nicely with Twitter Bootstrap, better yet, it comes with clean and simple API like this:

```javascript

this.$bootpag = this.$('#bootpag');

// configuatrion
this.$bootpag.bootpag({
    total: 1    
    , page: 1
    , maxVisible: 5
    , leaps: false                  
    , next: this.poly.t('ui.next')	//prev/next page button label are i18n'd
    , prev: this.poly.t('ui.prev')
});

```
Once the collection and ui control are in place, it's a snap to hook them together and you've got a nicely paginated listing table (or shall we say pseudo-datagrid ?)

**Another ui control** we highly recommend is [**jqPagination**](http://beneverard.github.io/jqPagination/), it's particularly useful when there are hundred of pages in the collection, it will be too troublesome to keep click on the next button, in this case, `jqPagination` provided a more user-friendly way to jump between pages. 

Refer to `HomeView.js` for sample usage, it's commented out but left there for you reference per the needs arise. 



**There are three places where we used paginated collection,** which is listed below, each of them demonstrate a different use case, feel free to trace the code.




1. **The employee listing table on main page**

This shows how to use `backbone.paginator` with `bootpaq` to display large set of data in pages and switch between theme, as already illustrated above.

2 **The serach box on main page**

This show how to implement "search as you type" kind of querying operation, using code like this:

```javascript

// HomeView.js
events:{
    "click #btnSearch" :        "handleSearchClick"
},

//
handleSearchClick:function ( evt ) {
            
    var key = this.$inputSearch.val();
    
    this.colEmployees.server_api.$name = key;

    this.colEmployees.fetch( {reset: true, 
        success: _.bind( this.updatePagination, this )
    } );

},

```


3. **The search box on header**

This one used quite different techniques then previous ones because it: 

1. Shows how to integrate the great [Select2](http://ivaynberg.github.io/select2/) ui component.

2. Implemented 'infinite scroll' using paginated collection.
	
Implementation details are in `TitleBarView.js`, here's a quick exerpt to give you a rough idea:

```javascript

// TitleBarView.js
this.$searchBox.select2({

    multiple: false

    , backbone_view: this
               
   , placeholder: self.poly.t('ui.search_msg')	// i18n'd label

    , ajax: {
	
	// ommitted
```

Basically speaking, `select2` provided a nice set of APIs to work with data, in this case we hook it up with paginated collection and asking it to display 3 items at a time, when each page reaches the end it will automatically load next page, hence provided 'infinite scrolling' style of pagination.


**One last thing about collection** is the timing to invoke `fetch()`.

Normally the workflow is to create collection instance first, then pass it into view instance as arguments to the constructor, so that when view is initialized and ready to be rendered, it has the data needed to draw upon.

There are basically two opportunity to invoke `fetch()`.

1. Once the collection instance is created, invoke `fetch()` immediately and wait for the `success` callback to be triggered then continue to create view instance.

By doing so, when view is about to be rendered, it's guaranteed to have all data needed, the drawback is we will have to wait for a few seconds before the data gets fetched from server, hence risk blocking the UI and letting user wait longer.

2. The other way is to invoke `fetch()` on collection then pass it into view without waiting for the `success` callback to trigger, this way we won't block the UI, and we rely on the view to monitor it's given model's `change` or `reset` evnet to correctly redraw it self. 

In our experience the 2nd workflow works better than the first one, hence we make it a rule to always invoke `fetch()` beforehand, rule of thumb is: **the calling view is responsible for invoking `fetch()`**, for example, `ViewFoo` creates `collection` and `ViewBar`, then it's `ViewFoo`'s responsibility to invoke `fetch()` and it's `ViewBar`'s job to catch `reset` or `change` event from `collection` then redraw it self. 

You can see this pratice in work through out the whole application in every views, pay special attention to how each view monitors it's model changing event, like this:

```javascript

// EmployeeSummaryView.js
modelEvents: {
    
    "change appModel" : "toggleEditHandler",

    "reset model" : "resetHandler",
    "change model" : "changeHandler",
    "remove model" : "removeHandler",
    "merge model" : "mergeHandler",
    "add model" : "addHandler", 

    "invalid model" : "invalidationHandler"
},

resetHandler: function(){
    this.redraw();
},
```

You should also note the difference between `redraw()` and `render()`. 




Sync
----

So far we have looked at the core areas of a backbone applicaiton, which are `view`, `model`, `collection`, `router` and `app initialization`, what remains unclear is how the data flow acutally worked between client and server.

That is, whenever you invoked `model.save()`, what happened behind the scene to have data transmitted back to the server and persisted there ? This takes us to a less touched part of the backbone frameowk, which is `Backbone.Sync`.

`Backbone.Sync` is basically a gateway to the backend, in good old java days we call it `Data Access Object (DAO)`[ref](http://en.wikipedia.org/wiki/Data_access_object) or simply a `Service`, the gist of `Sync`'s work is to communicate with backend via ajax calls and JSON, translating CRUD operation into http request like this:

```
create 	→ POST   	/collection
read 	→ GET   	/collection[/id]
update 	→ PUT   	/collection/id
delete 	→ DELETE   	/collection/id
```

But there are times that our backend isn't RESTful or not even using JSON, or for example, in our case, we want to use in-memory storage to avoid depending on server at all, under this situation, we will have to override some of the `Sync` functionalities to achieve that.

There are 3 places to override and implement your own logic for data accessing, which are:

1. **Model.fetch()** and methods

If you just need to change the functionalities of 'fetch()', for example, maybe original data source is in XML format and needed to be fetched from two different locations then pre-processed and combined, you could overwrite the `fetch()` method for that model, this way you are making minimal impact to the whole backbone framework, limiting the affected area to just this one model.

This is a rare use case but might comes in handy some day.

2. **Model.sync** 

Each model provided `fetch()`, `save()`, `destroy()` for standard CURD operations, under the hood they all delegate to `Model.sync()`, for example:

```javascript

// fetch()
this.sync('read', this, options);

// destroy()
this.sync('delete', this, options);

```

So `model.sync()` is like the meta gateway to data access, if you need to change how `fetch`, `save` and `destroy` works all at once, this is the best place to get your hands dirty. Refer to `EmployeeModel` for a good example:

```javascript
// EmployeeModel.js
sync: function(method, model, options) {
            
    if (method === "read") {

        //
        this.memoryStore.findById( parseInt(this.id), function (data) {
            options.success(data);
        });
    }

    if( method === "update"){
        this.memoryStore.updateEmployee( model.attributes, function(data){
            options.success(data);
        } );
    }
    
    if( method === "create"){
        this.memoryStore.addEmployee( model.attributes, function(data){
            options.success(data);
        } );
    }
    if( method === "delete"){
        this.memoryStore.removeEmployee( model.attributes, function(data){
            options.success(data);
        } );
    }
}, 


```

In the code above we are overwriting the whole `model.sync()` to use our own `MemoryStore` object for CRUD operations, but that just affect `EmployeeModel`, other models in the system will continue their own way to rely on `Backbone.Sync` for the communication job.

This is the approach used in the sample application.

3. **Backbone.Sync** 

This is the *ultimate* place to change how backbone communicate with backend, anything changed here will affect **all** models and collections in the system.

In fact, aforementioned CRUD methods of model like `fetch` and `destroy`, although they internally delegate to `model.sync()`, but what `model.sync()` really does is again, deleagte to `Backbone.sync`, like this:

```javascript

sync: function() {
  return Backbone.sync.apply(this, arguments);
},

```

Here's a example of rewiring `Backbone.sync` to use browser's `localStorage` for data storage:

```javascript
// https://gist.github.com/jamescharlesworth/1075210
// A simple module to replace `Backbone.sync` with *localStorage*-based
// persistence. Models are given GUIDS, and saved into a JSON object. Simple
// as that.

// Override `Backbone.sync` to use delegate to the model or collection's
// *localStorage* property, which should be an instance of `Store`.
Backbone.sync = function(method, model, options) {

  var resp;
  var store = model.localStorage || model.collection.localStorage;

  switch (method) {
    case "read":    resp = model.id ? store.find(model) : store.findAll(); break;
    case "create":  resp = store.create(model);                            break;
    case "update":  resp = store.update(model);                            break;
    case "delete":  resp = store.destroy(model);                           break;
  }

  if (resp) {
    options.success(resp);
  } else {
    options.error("Record not found");
  }
};

```




Customized Storage
------------------

Once we learned how to change the way backbone sends and receives data from server, it's natural to learn how to write your own data storage.

We provide two example here, one is the `MemoryStore` used in the sample application, the other is `localStorage` which utilizes browser's localStorgae capability.

### Example - MemoryStore

MemoryStore is purely created for the purpose of running the application without any server dependency, you can think of it as a replacement for 'server-based backend', it might *not* be of much practical use in a real-world case, but does make a good example to learn how custom storage should be implemented, so here we go:

```javascript
// MemoryStore.js
define( function(){

    var MemoryStore = function (successCallback, errorCallback) {

        this.findByName = function ( queryObj, callback) {
            var employees, searchKey, notKey, id;
            
            if( queryObj.hasOwnProperty('name') ){
                searchKey = queryObj.name;
                employees = this.employees.filter( function (element) {
                    var fullName = element.firstName + " " + element.lastName;
                    return fullName.toLowerCase().indexOf(searchKey.toLowerCase()) > -1;
                });
                
            }else if( queryObj.hasOwnProperty('managerId') ){
                
                searchKey = queryObj.managerId;
                notKey = queryObj.notInclude;

                employees = this.employees.filter( function (element) {
                    // console.log( 'elem: ', element.managerId, element.id );
                    
                    var match = 
                        (searchKey.indexOf( element['managerId'].toString() ) > -1   
                        &&
                        notKey.indexOf( element['id'].toString() ) == -1);
                    
                    // console.log( '\tmatch = ', match );
                    return match;
                });
            }

            callLater(callback, employees, 'findByName');
        }

        //mock data
        this.employees = [
            {"id": 1, "firstName": "James", "lastName": "King", "managerId": 0, managerName: "", "title": "President and CEO", "department": "Corporate", "cellPhone": "617-000-0001", "officePhone": "781-000-0001", "email": "jking@fakemail.com", "city": "Boston, MA", "pic": "james_king.jpg", "twitterId": "@fakejking", "blog": "http://coenraets.org", "reports": null},
            {"id": 2, "firstName": "Julie", "lastName": "Taylor", "managerId": 1, managerName: "James King", "title": "VP of Marketing", "department": "Marketing", "cellPhone": "617-000-0002", "officePhone": "781-000-0002", "email": "jtaylor@fakemail.com", "city": "Boston, MA", "pic": "julie_taylor.jpg", "twitterId": "@fakejtaylor", "blog": "http://coenraets.org", "reports": null},
            {"id": 3, "firstName": "Eugene", "lastName": "Lee", "managerId": 1, managerName: "James King", "title": "CFO", "department": "Accounting", "cellPhone": "617-000-0003", "officePhone": "781-000-0003", "email": "elee@fakemail.com", "city": "Boston, MA", "pic": "eugene_lee.jpg", "twitterId": "@fakeelee", "blog": "http://coenraets.org", "reports": null}
        ];

        // ommitted

```

As you can see, all employee data are hardcoded in the `MemoryStore` and stored in memory, so whenever you refresh the browser all modifications (newly created or delete employee) will be gone, be aware if you have [livereload](#) plugin for Sublime Text Editor installed, each time you save the file will trigger a page refresh.


### Example - LocalStorage

`LocalStorage` is a much pratical example for that it utilizes browser's built-in 'Local Storage' capability to store data, which means after each refresh, data will still be persisted and you can keep on querying and modifying them. Let's have a look: 

```javascript

// A simple module to replace `Backbone.sync` with *localStorage*-based
// persistence. Models are given GUIDS, and saved into a JSON object. Simple
// as that.

// Generate four random hex digits.
function S4() {
   return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
};

// Generate a pseudo-GUID by concatenating random hexadecimal.
function guid() {
   return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
};

// Our Store is represented by a single JS object in *localStorage*. Create it
// with a meaningful name, like the name you'd give a table.
var Store = function(name) {
  this.name = name;
  var store = localStorage.getItem(this.name);
  this.data = (store && JSON.parse(store)) || {};
};

_.extend(Store.prototype, {

  // Save the current state of the **Store** to *localStorage*.
  save: function() {
    localStorage.setItem(this.name, JSON.stringify(this.data));
  },

  // Add a model, giving it a (hopefully)-unique GUID, if it doesn't already
  // have an id of it's own.
  create: function(model) {
    if (!model.id) model.id = model.attributes.id = guid();
    this.data[model.id] = model;
    this.save();
    return model;
  },

  // Update a model by replacing its copy in `this.data`.
  update: function(model) {
    this.data[model.id] = model;
    this.save();
    return model;
  },

  // Retrieve a model from `this.data` by id.
  find: function(model) {
    return this.data[model.id];
  },

  // Return the array of all models currently in storage.
  findAll: function() {
    return _.values(this.data);
  },

  // Delete a model from `this.data`, returning it.
  destroy: function(model) {
    delete this.data[model.id];
    this.save();
    return model;
  }

});

// Override `Backbone.sync` to use delegate to the model or collection's
// *localStorage* property, which should be an instance of `Store`.
Backbone.sync = function(method, model, options) {

  var resp;
  var store = model.localStorage || model.collection.localStorage;

  switch (method) {
    case "read":    resp = model.id ? store.find(model) : store.findAll(); break;
    case "create":  resp = store.create(model);                            break;
    case "update":  resp = store.update(model);                            break;
    case "delete":  resp = store.destroy(model);                           break;
  }

  if (resp) {
    options.success(resp);
  } else {
    options.error("Record not found");
  }
};

```

Just be advised that overriding `Backbone.sync` affects the whole system, so do pay special attention when going down this route.

As a side note, due to the popularity of backbone framework, nowadays you can pretty much find all sorts of custom storages ready to use, like persisting to MongoDB, CouchDB and S3 to name a few.



Backbone.addon
--------------

Some of the development approaches mentioned in this tutorial requires special modifications and additions to the orginal backbone framework, we collect them all in `backbone.addon.js`, which provides following features:

- View: declarative model event handlers, sub-views management and auto disposal
- Model: declarative one-to-many properties and validators, clear and reset default attributes
- Generic: Adding `CLASS_NAME` to each class, 

The core philosophy when designing `backbone.addon.js` is to be unobstrusive as possible, meaning it's built *around* original backbone framework instead of monkeypatching the source code, this way we don't have to worry about the changes in backbone itself, and it's easier for us to continue improving the `addon` as seen needed. 

You can see the full source with comments in `backbone.addon.js`.




Coding style and team development
-----------------------------------------------

Aside from following generic coding style guides from [js idiomatic](https://github.com/rwldrn/idiomatic.js/) and [google](http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml), we would like to emphasize again on the pricipal of "favor clarity over brevity".

We draw this principal based on our 10+ years experience working with large team (normally 20+ developers spreading across multiple time zones) to build large scale web/desktop applications (more than 100k lines of code), in other words, we got burned multiple times and learned it the hard way, we hope following suggestions will save you some pains.

1. We don't need no "heroes" writing cryptic one piece of code that does everything but is hard to understand and maintain for other developers, in the long run it will cost the team big time.

2. Instead, we want everyone to write clear and easily understandable code, with equal amount of comments explaining the logic flow and deatils, even if that means there will be double amount lines of code.



Where to go from here ?
-----------------------

Congratulations on finish reading the whole guide (you did read it cover to cover, didn't you ?), so what to go from here ? Here are some suggestions.

1. As a mature developer, once you leanred the core concepts, approaches and best practices illustrated in this guide, you should be able to apply the same methodology to other languages or frameworks, like Angularjs or Ember. 

2. You can replace the UI layer with ExtJS, Sencha, Jquery Mobile, Rachet or any other UI components that fits your needs.

3. Extend the application with more advanced functionality like adding datagrid component, charting components or hook the application up with a backend (rails, node.js, python, what ever is your cup of tea)

4. Try to wrap the application in a mobile application wrapper, say PhoneGap, Titanium and others then submit it to Google Play Market and application store (don't forget to send the link our way if you did so).

5. Have a look on [Rendr](https://github.com/airbnb/rendr) project which provides tools to render pages on both server and client, so it's much more friendly to search engines and helps SEO greatly, this tool works with backbone application pretty well so it's worth a shot.



<a id="suggested_reading"></a>Suggested reading
-----------------------------------------------

Below are some recommended readings on learning backbone framework to get you started.

- [Developing Backbone.js Applications](http://addyosmani.github.io/backbone-fundamentals/) by Addy Osmani (Google).

- [Misc. Training Resources](http://backbonetraining.net/resources)



Attributions
------------

This sample application is based on [Christophe Coenraets](http://coenraets.org/blog/)' excellent ["Employee Directory"](http://coenraets.org/blog/2013/04/sample-application-with-backbone-js-and-twitter-bootstrap-updated-and-improved/) project, most mock data, css and images are from that project, but the source code is totally rewrite from ground up to demonstrate advanced features and development tips.


Questions, feedbacks and ideas ?
--------------------------------

If you have got any questions, feedbacks or ideas, please feel free create new issues. 

Aside from that, all source code are available on [github](https://github.com/devmatters/backbone.rocks), feel free to fork and send over pull requests.


