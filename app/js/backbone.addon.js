/**
 *
 * backbone.addon.js
 *
 * @author Jeremy
 *
 * 
 */

define( ['backbone'], function(){

    // console.log( 'backbone.addon 跑了' );

    // ==========================================================================
    // mixins
    // ==========================================================================

    /**
     * guid() 這比 underscore 內建的 _.uniqueId() 強度來的高
     */
     _.mixin({
        guid : function( prefix ){
          if( !prefix ) prefix = '';
          return prefix + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
          });
        }
      });

     /**
      * 這是 jquery plugin
      *
      * 語法：$.getQueryString( str, key )
      *
      * str: 是一個 &foo=bar&coo=doo 這樣的 url 參數字串
      *
      * key: 解碼回 obj 後，可只拿某個 key，例如 foo 的值
      *
      * @return 一個 javascript object
      */
     $.extend({
        getQueryString: function ( urlString, key) {           
            function parseParams() {
                var params = {},
                    e,
                    a = /\+/g,  // Regex for replacing addition symbol with a space
                    r = /([^&=]+)=?([^&]*)/g,
                    d = function (s) { return decodeURIComponent(s.replace(a, " ")); },
                    q = urlString;

                while (e = r.exec(q))
                    params[d(e[1])] = d(e[2]);

                return params;
            }

            // if (!this.queryStringParams)
            this.queryStringParams = parseParams(); 

            return key ? this.queryStringParams[key] : this.queryStringParams;
        }
    });

    // ==========================================================================
    // View
    // ==========================================================================

    // 是否為 debug 狀態，會顯示一些訊息
    Backbone.debug = false;

    var _View = Backbone.View;

    // 建立我自製的 ViewEx class

    Backbone.View = _View.extend({
    	
        CLASS_NAME: 'DEFAULT_VIEW_NAME',

        //
        constructor: function( options ){
    		
            if( Backbone.debug ){
                console.log( 'backbone.addon :: View :: constructor run' );
            }
            //console.log( 'ViewEx Constructed', options.foo, options.coo, ' >model: ', options.model );
    		
            //等於呼叫 super()  
    		// Backbone.View.prototype.constructor.apply(this, arguments); //Stackoverflow 上有人這樣寫，也會過
            _View.apply( this, arguments );

            // 存放 sub-views
            this.subViews = [];

            // 方便識別這個物件的 type
            // this.GUID = _.uniqueId('View_');

            // super() 跑完時，已執行過 initialize()，需要注射的變數都宣告好了，
            // 接著就可以跑注射，並且只能在注射完成後，才能跑 delegateModelEvents() 掛偵聽
            if( injector ) 
                injector.injectInto( this );

            this.delegateModelEvents();

        },

        // Cached regex to split keys for `delegate`.
        delegateEventSplitter : /^(\S+)\s*(.*)$/
    })


    /*

    modelEvents{
    	"change:email UserModel" : "updateListing"
    }

     */
    Backbone.View.prototype.delegateModelEvents = function () {
    	  
          if( Backbone.debug ){
                console.log( 'backbone.addon :: View :: delegateModelEvents run' );
            }

          this.undelegateModelEvents();

          var key, events = this.modelEvents;

          //跑 loop 將 events{} 每個 item 掛上偵聽
          for ( key in events) {
     		
     		//取得 updateListing()       
            var method = events[key];

            if (!_.isFunction(method)) method = this[events[key]];
            if (!method) continue;

            var match = key.match( this.delegateEventSplitter );
            
            //[1] 是 'change:email'
            var eventName = match[1];

            //[2] 是 UserModel
            var target = match[2];  

            //重要：利用 underscore 設定 method 的作用 scope 
            method = _.bind(method, this );
            
            //如果找不到 model/collection，就不繼續
            if (target === '' || !this[target] ){
                console.error( 'Backebone :: Model: can not bind to target = ', target, ' > ', this.CLASS_NAME );
            	continue;
            }

            //
            this.listenTo( this[target], eventName, method );

            //original - 注意：這裏是操作 $.on() 掛偵聽，jquery 提供兩種 signature
            //this.$el.on(eventName, target, method);
            //on: function(name, callback, context) {

          }

          //
          return this;	
    }

    /**
     * 不需要這支，之所以需要 delegateEvents() 是因為 view.el 有可能被換掉，或是 view 要重覆使用
     * 但 model 不會換。
     *
     * 並且，view.stopListening() 時，會一併解掉 model 偵聽，因此大部份情況下不需要跑這支。
     */
    Backbone.View.prototype.undelegateModelEvents = function () {

        if( Backbone.debug ){
            console.log( 'backbone.addon :: View :: undelegateModelEvents run' );
        }

        // 因為前面 delegateModelEvents() 時是用 listenTo()，內部就會記錄掛過的偵聽對象
        // 因此這裏直接 stopListening() 即可，不用再 loop 每個事件對象
        // Update: 後來想到這樣做太爆力，會將掛在其它物件上的偵聽也解掉，影響範圍太大，因此改回下面 for loop 做法
        // this.stopListening();

        var key, target, events = this.modelEvents;
        for ( key in events) {
            target = key.match( this.delegateEventSplitter)[2];

            if( this[target] )
                this.stopListening( this[target] );
        }
        
    	return this;
    }


    /**
     * 移除 view 時要執行的 dispose() 
     *
     * 重點：如果 view 下面還有多個 child views，就應該在 beforeDispose() 裏先將 child views 也做 dispose()
     *
     * 注意：如果這個 view 稍候還要重覆使用，應該要用 view.remove() 就好；dispose() 會徹底清乾淨所有東西
     */
    Backbone.View.prototype.dispose = function () {
        
        if( Backbone.debug ){
            console.log( 'backbone.addon :: View :: dispose()' );
        }

        // 更細微的設計，如果在移除一個 view 之前要先善後(例如儲存資料)，就宣告這支 method
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

        // 解除這個 view 對外所掛上的偵聽 - kill outbound lisenters ← 這是 Backbone.View.remove()
        // backbone.view 提供的指令，內部會 view.stopListening([other], [event], [callback]) 所有事件
        // 意思是叫這個 view 解掉所有之前曾掛過的偵聽 - 已驗証這通用於 view 與 model
        // 也就是 delegateModelEvents() 掛上去的偵聽也會被解掉，不用自已跑 undelegateModelEvents()
        this.remove();  

        // 解除外界掛在這個 view 身上的偵聽 - kill inbound listeners
        this.off();

        // 注意：每個 view 在 initialize() 時，會執行 delegateEvents() 針對自已旗下 DOM child element 掛偵聽
        // 雖然這些在 dispose() 時並沒有移除，但 elem 從 DOM 移除時，vm 就會自動解除 elem 身上所有事件，因此等同於有全部解掉，
        // 也因此 view 重覆使用時，一定要再跑一次 delegateEvents()

    };

    /**
     * 讓 view 在聽到 change event 時，判斷此事件是否由 x-editable 編輯 > 存檔 而觸發
     * 如果它帶有 options.redraw = false，就代表 view 不該因此重繪
     */
    Backbone.View.prototype.preventRedraw = function ( options ) {
        if( Backbone.debug ){
            console.log( 'backbone.addon :: View :: preventRedraw()' );
        }
        // 務必要檢查兩個條件：第一是物件身上有 redraw 屬性；第二是該屬性性為 false
        return ( options.hasOwnProperty('redraw') && options.redraw === false ) 
    };


    // ==========================================================================
    // Model
    // ==========================================================================


    var _Model = Backbone.Model;

    /**
     * 自製 ModelEx class 方便改寫功能
     */
    Backbone.Model = _Model.extend({
        
        CLASS_NAME: 'DEFAULT_MODEL_NAME',

        constructor: function( attributes, options ){
            //console.log( 'Jx Model Constructed', options.foo, options.coo );
            if( Backbone.debug ){
                console.log( 'backbone.addon :: Model :: constructor()' );
            }
            
            _Model.apply(this, arguments);

            // this.GUID = _.uniqueId('Model_');

            //如果 model 是孤儿，要在 constructor 傳入 server url 供 fetch/save() 操作
            if( options && options['url'] ){
                this.url = options['url'];
            }

            // 儲存 eval() 過的 validator functions
            this.cacheObj = {};

            // 觸發 injection
            if( injector )
                injector.injectInto( this );
        }, 

        /**
         * 用於處理 一對多 的屬性，要自動建立 collection，它是依 oneToMany{} 內的設定來處理
         */
        parse: function( resp, options ){

            if( Backbone.debug ){
                console.log( 'backbone.addon :: Model :: parse()' );
            }

            // start = window.performance.now();

            if( _.size(this.oneToMany) > 0 ){
                var prop, obj, clazz;
                for( prop in resp ){
                    // console.log( 'prop = ', prop );
                    if( obj = this.oneToMany[ prop ] ){

                        // 用 require() 程式語法動態將需要的 class 引入
                        clazz = require( obj.type );

                        //
                        resp[prop] = new clazz( _.isArray(resp[prop]) ? resp[prop] : null );

                        // jxdebug
                        // if( resp.id == 2 )
                        //     console.log( 'parentId= ', resp.id );

                        //
                        resp[prop]['parentID'] = resp.id;

                        if( obj.lazy === false ){
                            console.log( '代抓一對多 col: ', resp.id );
                            resp[prop].fetch();                        
                        }
                    }
                    
                }
            }

            return resp;
        }, 

        /**
         * 寫出資料時的處理
         * 列在 oneToMany{} 內的 key 都是一對多屬性，不用再傳回 server保存，因此 toJSON() 直接將它濾掉
         */
        toJSON: function( options ){
            
            if( Backbone.debug ){
                console.log( 'backbone.addon :: Model :: toJSON()' );
            }

            var k = _.clone(this.attributes);

            //列在 oneToMany{} 內的 key 都是一對多屬性，不用再傳回 server保存，因此 toJSON() 直接將它濾掉
            for( key in k ){
                if( this.oneToMany[key] ){
                    k[key] = null;
                }
            }

            return k;
        }


    })

    /**
     * model/collection 的 clear() 執行後，要重新套用 defaults{} 內容
     */
    Backbone.Model.prototype.clear = function ( options ) {

        if( Backbone.debug ){
            console.log( 'backbone.addon :: Model :: clear()' );
        }

        //super
        Backbone.Model.prototype.clear.apply( this, arguments );

        //重新套用 defaults 值
        return this.set( this.defaults );
    }

    /**
     * TODO: 何時會跑這段？要嘛自已記得人工執行，不然就要想辦法偵聽 model 被催毀時的事件
     * update: 目前覺得沒需要跑，暫時不用
     */
    /*Backbone.Model.prototype.dispose = function ( options ) {
        
        if( Backbone.debug ){
            console.log( 'backbone.addon :: Model :: dispose()' );
        }

        //清掉 cacheObj
        var key;
        for( key in this.cacheObj ){
            this.cacheObj[key] = null;
            delete this.cacheObj[key];
        }

        this.cacheObj = null;
    }*/

    /**
     * Model.save() 時會自動呼叫，一般不用人工觸發
     */
    Backbone.Model.prototype.validate = function ( attrs, options ) {

        //console.log( 'validate: ', attrs, options );
        
        if( Backbone.debug ){
            console.log( 'backbone.addon :: Model :: validate()' );
        }

        // 如果沒提供 validators{} 就直接跳出
        // 已驗証過這裏跑 return 不會造成誤判，因為它沒有 return true|false，而是 undefine
        if( !this.validators ) return;

        var item, validMethod, arr, result, arrErrors = [], target, method, f;

        for( item in attrs ){
            
            validMethod = this.validators[ item ];

            if( validMethod ){
                
                //字串的情況
                if( _.isString( validMethod ) ){
                    
                    // 這是最常見的狀況，90% 都會直接在這解決
                    if( validMethod.indexOf(" ") == -1 ){
                    
                        validMethod = this[ validMethod ];  //this.validMethod()
                    
                    }else{
                        
                        //obj.validMethod() 或 obj.foo.bar.validMethod() 複合字串的情況
                        arr = validMethod.split(' ');
                        target = arr[0];
                        method = arr[1];

                        // note: 為何不一律寫 "obj.foo.bar.validMethod()" 再parse ? 
                        // ans: 因為 new Function() 比較慢，盡可能不要跑到裏面
                        if( this[target]){
                            
                            //obj.validMethod() 的情況
                            validMethod = this[target][method];

                        }else{
                            //obj.foo.bar.validMethod() 的情況
                            
                            //先檢查是否已建過，直接從 cache 裏拿
                            if( this.cacheObj[method] )
                                validMethod = this.cacheObj[method];
                            else{

                                //最後不後，才跑 eval() 建立 function 出來
                                validMethod = new Function( target + '.' + method + '.apply(this, arguments);');

                                // eval 過一次就 cache 起來，下次不會重建
                                this.cacheObj[method] = validMethod;
                            }            
                        }
                    }
                }

                // debug
                if( !_.isFunction(validMethod) )
                    throw new Error("validMethod 不是 function");

                // 到這裏已確定有 valid() 可用，執行它吧
                // 第一個參數：是傳欄位值
                // 第二：傳 欄位名稱
                // 第三：將原始的 options 傳過去
                result = validMethod( attrs[item], item, options );

                // 如果有任何 validator 出錯，就蒐集到 arr 裏，最後都跑完再一次返還    
                if( result ) 
                    arrErrors.push( result );
            }
        }

        //最後看是否全通過
        if( arrErrors.length > 0 ){

            // 將整包 error array 返還，供外界檢查處理
            return arrErrors;
        }

    }


    // ==========================================================================
    // collection
    // ==========================================================================


    var _Collection = Backbone.Collection;

    /**
     * 自製 ModelEx class 方便改寫功能
     */
    Backbone.Collection = _Collection.extend({
        
        CLASS_NAME: 'DEFAULT_COLLECTION_NAME',

        constructor: function( options ){
            //console.log( 'Jx Collection Constructed', options.foo, options.coo );
            
            if( Backbone.debug ){
                console.log( 'backbone.addon :: Collection :: constructor()' );
            }

            _Collection.apply(this, arguments);

            // this.GUID = _.uniqueId('Collection_');

            // 儲存 eval() 過的 validator functions
            // this.cacheObj = {};

            // 觸發 injection
            // try{
            if( injector )
                injector.injectInto( this );
            // }catch(err){}
        }

    })



})
