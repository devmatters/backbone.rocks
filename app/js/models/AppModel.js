/**
 * 整支 app 的 基底 view - AppView 對應的 AppModel
 * 
 */
define( function(){
    
    var AppModel = Backbone.Model.extend({

        /**
         * 
         */
        CLASS_NAME: "AppModel",

        // model 預設的屬性在這裏宣告
        defaults: {

            // router 通知 HomeView datagrid 換頁
            listing_page: 1
        },

        /**
         * 
         */
        initialize:function () {

            // 下面幾個 {} 內容發生變化時，不需廣播通知外界，因此直接宣告在 model 身上
            // 其它一律透過 model.set() 來存取
            this.collections = {};
            this.models = {};
            this.views = {};
            this.controllers = {};
            this.langs = {};

            // [inject]
            this.LangManager = null;

            // [inject]
            this.Polyglot = null;

            // note: appConfig 將來會由 server 設定好，偷塞在 index.html 頁面裏，appModel 只要負責讀取這個值即可
            var langMap = window.appConfig.langMap;

            // set 入 model 是為了觸發事件，讓 titleBar 下拉選單聽到而更新選項
            this.set('langMap', langMap);
        },    

        /**
         * 
         */
        sync: function(method, model, options) {
            throw new Error('AppModel 不用存')
        }, 


        // ==========================================================================
        // system land api
        // ==========================================================================

        // 這些是系統內建，專供操作 collections, models, views, controllers 四項的指令
        // 存取與更新，就直接操作 appModel.collections['name']

        types: ['collections', 'models', 'views', 'controllers'],

        /**
         * 
         * appModel.add('collections', 'colEmployees', this.colEmployees )
         *
         * @return obj newly added item
         */
        add: function( type, key, obj ){

            // 先檢查是否為合法的四個 types 之一
            // view 每次都重建，有時它會自建 collection 並存入 appModel，因此不要檢查，就讓新值覆寫舊值
            /*if( this.has( type, key ) === true ){
                console.error( 'AppModel::add() > key alrady exist: ', type, key );
                return obj;
            }*/

            // 都通過後，就存入
            this[type][key] = obj;

            // 這只是好玩順手返還一下物件
            return obj;
        },

        /**
         *
         * @return Boolean remove action succeeded or not
         */
        remove: function( type, key ){

            // 先檢查是否為合法的四個 types 之一
            if( this.has( type, key ) === false ){
                console.error( 'AppModel::remove > type or key doesn\'t exist: ', type, key );
                return false;
            }

            // 最後刪除
            this[type][key] = null;
            delete this[type][key];

            return true;
        },

        /**
         * @return Boolean
         */
        has: function( type, key ){

            // 先檢查是否為合法的四個 types 之一
            if( _.contains( this.types, type) === false ){
                console.error( 'AppModel::has() > type doesn\'t exist: ', type );
                return false;
            }

            // 再檢查 collections[] 內是否有該 name
            return !!( this[type][key] ); //轉成 boolean
        },



        // ==========================================================================
        // public api - user land
        // ==========================================================================

        // app 需要的 method 都寫這裏

        /**
         * 外界要切換 view，一律操作 appmodel 的這支 method
         *
         * @param state 要切換的 view 名稱
         *
         * @param params 如果要帶參數，透過這個送進來
         */
        setViewState: function( state, params ){

            // console.log( 'AppModel setState = ', state );

            var currentState = this.get('currentState') || { state: null };
            
            /*     
            // ★ AppModel.switchLang() 時，會人工重新設定一次 location，例如原本 /#en/page/1 ，切換後變成 /#zh/page/1
            // 因此這裏一定會抓到相同的 state，但我需要讓它繼續跑下去，所以關掉檢查
            if( state == currentState.state ){
                console.log( '切換相同 state, 不處理' );
                return;
            }
            */
           
            //
            this.set( 'currentState', { state:state, params:params } );

        },

        /**
         * 示範 public api 可做的事，但大部份時候我可能會直接 appModel.get('currentState') 就取值了
         */
        getCurrentViewState: function(){
            return this.get('currentState');
        },

        /**
         * app 要切換語系，一律操作這支 api 即可，它內部會操作 LangManager 去載入語系檔，
         * 然後更新 polyglot 物件
         *
         * @param silent 不廣播事件, 通常用於 app 啟動時，AppRouter 第一次切換語系時，節省一次重繪
         */
         switchLang: function( lang, silent ){
            
            if( this.attributes.currentLang == lang ){
                console.log( '相同 lang, 不相換' );
                return;
            }

            var self = this;
            
            // 由於 switchLang() 操作有「非同步」特性，因此最安全作法是先返還一個 promise 物件            
            var resp = $.Deferred();

            // getLang() 會返還 promise 物件，可直接掛 done() 與 fail() handler
            this.LangManager.getLang( lang ).done(

            // 語系載入成功，準備刷新頁面
            function(result){
                
                // 在 appModel 上建立 polyglot 物件，供整支 app 使用
                if( !self.polyglot )
                    self.polyglot = new Polyglot();

                self.polyglot.extend( result );
                self.polyglot.locale( lang );
                
                // 切換不同語系時，可能要用 replace ?
                //self.polyglot.replace( result );

                // 將 lang 保存入 model 中，同時觸發事件通知 app
                self.set('currentLang', lang, {silent: !!silent});  //!! 將 silent 值強迫轉為 boolean

                // 更新 location url 裏的 de, en 等語系值
                var location = window.location.hash;    //#en/page/1
                location = '#' + lang + location.substring( location.indexOf('/') );
                
                // update: 當網址列改變時，Backbone.history 已偵聽到 hashchange event 而改了內部的 this.fragment 為新值
                // 造成下面跑 navigate() 時因網值相同而不生效，因此透過 location bar 直接改語系就不會觸發頁面重繪                
                // 因此，最後改成 切換語系後的畫面重繪，一律委託 AppView.currentLangChangeHandler() 進行
                
                // self.appRouter.navigate( location, {trigger: true} );
                // fix: 如果最後才跑 Backbone.history.start()，則我的 appRouter.start() 切換 url 會失敗 ← 現在沒事是因為我後來人工又補改了一次 location
                // 因此想出的解決方法是：稍等一下再跑
                setTimeout(function(){
                  self.appRouter.navigate( location, {trigger: false} );  
                });
                
                resp.resolve();

            }).fail(

            // 切換語系失敗(可能是沒有該語系檔)，基本上不會怎樣，就是停留在原本的語系
            function( err, lang, request ){
                console.log( '載入: ', lang, ' 語系失敗:\n\t', request, '\n\t', err.stack );
                resp.reject( err, lang, request );
            })

            return resp.promise();
         },

         /**
          * @param url 類似 /page/1 的值，我會自動補上 locale, 變成 en/page/1
          *
          * @param options 類似 {trigger: true, replace: false} 
          */
         goto: function( url, options ){

            if( appConfig.useLocale == true ){
              url = this.get('currentLang') + url;
            }

            this.appRouter.navigate( url, options );
         }, 




    });
    
    return AppModel;
    
});