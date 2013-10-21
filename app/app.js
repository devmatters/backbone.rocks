
/**
 * requirejs 的 基礎設定
 */
requirejs.config({
    
    baseUrl: 'libs', 

    //except, if the module ID starts with "app",
    //load it from the js/app directory. paths
    //config is relative to the baseUrl, and
    //never includes a ".js" extension since
    //the paths config could be for a directory.
    paths: {

        js: '../js'

        , $: 'jquery-1.9.1'  //由於 jquery 太常用，直接定義在 path 裏將來在所有 module 裏調用最省力
        ,tpl: '../tpl'
        
        ,i18n: '../assets/i18n'

        ,editable: 'bootstrap-editable'
        
        ,datetime: 'bootstrap-datetimepicker'
    }, 

    // The shim config allows us to configure dependencies for
    // scripts that do not call define() to register a module
    shim: {
        
        'underscore': {     /* 這個是實體檔名，在所有 require module 中要調用 underscore 時，都要寫這個名稱 */
            exports: '_'    /* 由於 underscore 載入後不會 return ref 給 require 保存，但它會在 window. 下註冊自已的名稱，
                                ，將來其它 module 要存取這個物件時，require 就會依此名稱去跟 window 取得並返還，
                                因此不能亂寫，要看它原本訂義輸出的名稱，    例如 backbone 輸出後一定要叫 Backbone, jquery 一定要叫 $  */
        }

        // jquery 我用省力寫法，因此不要列在 shim 裏
        // '$' :{
        //     exports: '$'  只要能透過 window.jQuery 取得 ref，都可以 
        // },
        
        , 'backbone': {
            deps: [
                'underscore',
                '$'
            ],
            exports: 'Backbone'
        }

        , 'bootstrap/js/bootstrap': {
            deps: [ '$' ]
        }

        , 'editable/bootstrap-editable/js/bootstrap-editable': [ '$', 'bootstrap/js/bootstrap' ]

        // , 'datetime/bootstrap-datetimepicker': [ '$', 'bootstrap/js/bootstrap' ]
        
        , 'backbone.paginator': [ 'backbone' ]

        // , 'jqPagination/jquery.jqpagination': [ '$' ]
        
        , 'jquery.bootpag': [ '$' ]

        , 'select2/select2': [ '$' ]

        , 'polyglot': {
            exports: 'Polyglot'
        }
        // , 'jquery.browserLanguage': [ '$' ]
    }


});

/**
 * global requirejs error handler 
 */
requirejs.onError = function( err ){
    console.log( '載入錯誤: ', err.requireModules, "\n\tsrc= ", err.originalError.target.src, "\n\terr=", err );
}



//========================================================================
//
// app config

// TODO: 這包變數將來應該在 server 上返還 index.html 前偷塞入
// 因為它的內容可能隨時變化，只有 server 端才會知道答案
window.appConfig = {

    // 是否使用多語系功能
    useLocale: true

    , langMap: {
        "en" : "English"
        , "zh-tw" : "正體中文"
        , "zh-cn" : "简体中文"
        , "jp" : "日本語"
        // , "de" : "Germany"
        // , "fr" : "French"
    } 

    // 是否要執行客戶端的語系偵測，不然就由 server 判斷並指定
    , detect_os: false

    // 如果 url 裏沒指定語系，就用這裏指定的值，這個值是最終的 fallback 設定
    , default: "en"

    //
    , detected_locale: null

    , DEBUG: true
}

/**
 * deploy 版不顯示任何 console 訊息，除了 error 以外
 */
if( window.appConfig.DEBUG === false ){
    if(!window.console) window.console = {};
    var methods = ["log", "debug", "warn", "info"];
    for(var i=0;i<methods.length;i++){
        console[methods[i]] = function(){};
    }
}

//========================================================================
//
// App 正式啟動

/**
 * App 啟動點
 * 1、建立 router
 * 2、操作 Backbone.history.start()
 */
require( [ '$'
            , 'underscore'
            , 'backbone'
            , 'bootstrap/js/bootstrap'
            , 'js/utils/LangManager'
            , 'js/backbone.addon'
            , 'polyglot'
            , 'editable/bootstrap-editable/js/bootstrap-editable'
            // , 'datetime/bootstrap-datetimepicker'
            , 'backbone.paginator'
            , 'jquery.bootpag'
            , 'select2/select2'
            // , 'jquery.browserLanguage'
         ], 

    function( dummy, _, Backbone, bootstrap, LangManager ){

        // console.log( '啟動: ', arguments );

        //========================================================================
        //
        // 一啟動先載入預設語系，才能啟動 app 其它部份，例如 router, model

        
        
        // 最終決定的 locale，先預設為 appConfig.default 值
        // 然後下面跑幾個偵測 steps 看是否有更適合的語系
        if( appConfig.useLocale == true ){

            var detected_locale = appConfig.default;    

            var map = appConfig.langMap;
            var url = location.href;
            
            if( location.hash == "" ) 
                url = url + "#";
            
            // 提防 url 可能是 http://localhost:8080/，沒有 #
            var newLocale = url.split('#')[1];

            newLocale = newLocale.substr( 0, newLocale.indexOf('/') );

            // url 裏有指定語系，並且是支持的語系之一
            if( newLocale && map[newLocale] ){
                detected_locale = newLocale;
            
            // 不然就偵測 os string 決定語系
            }else if( appConfig.detect_os ){
                // TODO: 偵測 user string ← 將來由 server 偵測比較準，並且偷塞變變在 index.html 文件裏
            }

            // console.log( '最終決定用語系: ', detected_locale );

            // 將最終判斷出來的語系存回 appConfig
            window.appConfig.detected_locale = detected_locale;

            // ↑ 至此已判斷出預設語系
            //========================================================================

            // 程式一啟動，最優先抓回語系檔，因為之後的 ui 都需要
            LangManager.getLang( detected_locale ).done( init ).

            fail( function(err){
               console.log( '載入語系失敗，將 fallback 回英文: ', arguments );

               // 如果偵測到該用 de，但不幸載入德文失敗，就 fallback 到預設的語系，例如英文
               window.appConfig.detected_locale = appConfig.default; // 也要記得正確設定最終使用的語系，將來在 appRouter.start()也會讀
               LangManager.getLang( appConfig.default ).done( init )
            });
        
        }else{
            init();
        }


        //========================================================================
        //
        // 預設語系載完，繼續跑 app 啟動流程

        function init(){
                // console.log( '啟動所需語系載入: ', arguments );

                require( [ 'js/AppContext' ], function( injector ){

                    // 建一個假物件方便進行注射
                    var obj = {};
                    obj.appModel = null;
                    
                    // 由於 AppRouter 與 AppModel 有 circular dep 問題
                    // 因此分開注射，但最後將 appRouter 掛回 appModel 內保存，方便日後存取
                    obj.appRouter = null;

                    // 進行注射 appModel 與 appRouter
                    injector.injectInto( obj );

                    // 將 appRouter 掛回 appModel 保存
                    obj.appModel.appRouter = obj.appRouter;

                    // 啟動 router，建立基底 view
                    obj.appRouter.start();

                    // 最後一步一定是啟動 history
                    // console.log( '>>history.start()' );
                    Backbone.history.start();

                })
        }

        // 前面先確定已載入最重要的幾支基底系統 lib，
        // 這裏再接著啟動 app 階段最重要的兩個元件：router 與 injector
        // 其中 injector 會註冊到全域 window 變數中，方便之後取用，因此要盡快引入
        /*require( [ 'js/AppContext' ], function( injector ){

            // 建一個假物件方便進行注射
            var obj = {};
            obj.appModel = null;
            
            // 由於 AppRouter 與 AppModel 有 circular dep 問題
            // 因此分開注射，但最後將 appRouter 掛回 appModel 內保存，方便日後存取
            obj.appRouter = null;

            // 進行注射 appModel 與 appRouter
            injector.injectInto( obj );

            // 將 appRouter 掛回 appModel 保存
            obj.appModel.appRouter = obj.appRouter;

            // 啟動 router，建立基底 view
            obj.appRouter.start();

            // 最後一步一定是啟動 history
            Backbone.history.start();

        })*/

})