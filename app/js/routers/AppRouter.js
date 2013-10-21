
/**
 * 最先建立 router，因為它是程式主要進入點
 */

define( function(){

    var AppRouter = Backbone.Router.extend({

        /**
         * 他的手法是整個頁面有個「空的框」罩著，目地是建立一個 div 做為容器將來好不斷抽換 sub-view 進去
         * 因此才會在 Router.initialize 時就急著建立 appView 這個空盒子
         * 下一步就是 router 的 "" 會觸發 home() 去建立真正的內容 view
         */
        initialize: function ( options ) {

            // console.log( 'AppRouter init' );
            
            // [inject singleton]
            this.appView = null;

            // [inject singleton]
            this.appModel = null;

            // ☆要等所有待注射變數都宣告後才能跑
            injector.injectInto( this );

            // 建立基底 AppView (它內部會啟動相應的 AppModel)
            // this.start();

            //this.on('route', this.catchAll)
        },

        /**
         * router 要負責建立整支 app 的第一個基底 view，通常叫 AppView
         * 將來由 AppView 負責切換其上各種 sub-views
         *
         * 為何要由 router.initialize() 建立第一個 view ? 因為接下來任何 url 的改變，
         * 就會觸發 router 切換 view，那時就要轉手給 AppView 去處理了，因此這裏一定要先建立
         */
        start: function(){
            
            console.log( '>> router.start' );
            
            var self = this;


            // 切換到預設語系 - 這個語系在 app.js 一啟動時就先偵測過並已確保載入了
            if( appConfig.useLocale == true ){
                
                this.appModel.switchLang( appConfig.detected_locale , true).done( function(){

                    // 啟動第一個 view
                    $('body').html( self.appView.render().el );

                });
            }else{
                // 啟動第一個 view
                $('body').html( self.appView.render().el );
            }

        },

        /**
         * 透過監控 window.location 的 hashchange event 判斷是否 locale 有改變
         * update: 工作移到 checkLocale() 裏做，因為每次 url 改變時，會先進 backbone.router, 
         * 然後觸發 route callback，而我在每個 callback() 裏都加了 checkLocale() 當 pre-process
         */
        // hashChangeHandler: function(evt){

        //     // "http://localhost:8080/#en/employees/2"
        //     // "http://localhost:8080/#employees/2"
        //     var url = evt.originalEvent.newURL;
        //     var oldUrl = evt.originalEvent.oldURL;
        //     var newLocale = url.split('#')[1];
        //     newLocale = newLocale.substr( 0, newLocale.indexOf('/') );
        //     var map = this.appModel.get('langMap');


        //     var currentLocale = this.appModel.get('currentLang');
            
        //     // if( !map[newLocale])

        //     if( map[newLocale] && newLocale != currentLocale  ){
                
        //         console.log( '監測到 locale 改變了 > newLocale: ', newLocale );
        //         // this.appModel.switchLang( newLocale );

        //     }
        // },

        /**
         * 如果用戶輸入 localhost:8080/#asfdfads/employees/1 這種位址，也就是給定不支持的 locale
         * 這裏會攔擷下來，改回 /#en/employees/1 ← en 是當時使用的語系。
         *
         * 如果這裏返還 true，代表 url 真的需要 fix，後面就不應該再繼續跑下去
         *
         * 注意：原本想在 addon 裏用 monkey patch 方式固定跑這支，但考慮到 catchAll() 這種 method 不會拿到 locale 變數，
         * 並且有時 route callback() 裏的參數數量不一定，因此不宜放入 addon.
         */
        checkLocale: function( newLocale ){
            
            if( appConfig.useLocale == false ) 
                return false;

            // console.log( '\t>>checkLocale:', newLocale );
            
            var map = this.appModel.get('langMap');
            var currentLocale = this.appModel.get('currentLang');

            // 是合法的語系，並且與現行語系不同，代表用戶切換語系了
            if( map[newLocale] && newLocale !== currentLocale ){
                console.log( '\t 1 : 用戶切換語系' );
                this.appModel.switchLang( newLocale );
                return true;
            }

            // 如果用戶輸入一個不合法的 locale，將網址替換回當前的語系
            if( !map[ newLocale ] ){
                // console.log( '\t 2 : 輸入不合法 locale，跳轉回原先值' );
                newLocale = currentLocale;

                var k = location.hash.split('#')[1];
                k = currentLocale + k.substr(k.indexOf('/'))
                location.hash = "#"+k;
                
                // 以上可以寫成一行，但不好讀
                // '#'+(k = url.split('#')[1]).substr(k.indexOf('/'))
                
                return true;
            }

            return false;

        },


        // ==========================================================================
        // Route Event Handler
        // ==========================================================================
        
        routes: {
              ":locale/page/:id":         "gotoPage"
            , ":locale/contact":          "contact"
            , ":locale/employees/:id":    "employeeDetails"
            , "*notFound":        "catchAll"
        },

        /**
         * 攔擷所有未定義的路徑，通常這裏應該顯示 404 not found 頁面
         * 但目前是改成一律回到首頁
         */
        catchAll: function( url ){   

            if( appConfig.useLocale == false ){
                // 未知的路徑一律回到首頁，並且觸發原始設定的 handler
                this.navigate( locale + '/page/1', {trigger: true});
                return;
            }
            
            
            var locale = this.appModel.get('currentLang');

            // console.log( 'route :: catchAll', url, " >locale= ", locale );

            // 安全檢查
            if( url && url.indexOf(locale) == -1){
                // 先試試幫忙加上 locale 會否正確
                url = locale + '/' + url;
                this.navigate( url, {trigger: true});

            }else{

                // 未知的路徑一律回到首頁，並且觸發原始設定的 handler
                this.navigate( locale + '/page/1', {trigger: true});
            }

        },

        /**
         * 
         */
        gotoPage: function( locale, id){
            // console.log( 'route :: gotoPage > 跳去頁碼: ', id );

            // 檢查 url 中的 locale 是否合法，如果需要 fix 就不繼續跑下去
            if( this.checkLocale( locale ) ) return;

            // 目前想法是透過 appModel 設定屬性，讓 HomeView 聽到
            this.appModel.set('listing_page', id);

            // 由於可能是直接網址輸入 /#page/2 進來，此時 HomeView 根本還沒建立，因此要補送一個訊息過去
            this.appModel.setViewState( 'HomeView' );
        },

        /**
         * 注意：這裏是位於 Router 內，因此這支 method 是因為 browser location 改變而觸發的
         */
        contact: function ( locale ) {
            // console.log( 'routing > contact: ', arguments );

            // 檢查 url 中的 locale 是否合法，如果需要 fix 就不繼續跑下去
            if( this.checkLocale( locale ) ) return;
            
            this.appModel.setViewState( 'ContactView' );
        },

        /**
         * 在 search list 裏選取一人後，要顯示該人完整細節
         * 手法是透過 window.location 變換，觸發 router 接手處理
         *
         * 注意：輸入 /#en/employees/new 即會建立一個新的員工，資料都空白而已
         */
        employeeDetails: function ( locale, id ) {
            // console.log( 'routing > employee: ', arguments );

            // console.log( 'router::employeeDetails() > 此時 locale: ', this.appModel.get('currentLang') );

            // 檢查 url 中的 locale 是否合法，如果需要 fix 就不繼續跑下去
            if( this.checkLocale( locale ) ) return;
            
            if( id != 'new'){
                // 大部份情況下應該都是 /#employees/2 這種路徑
                this.appModel.setViewState( 'EmployeeView', {id:id} );
            }else{
                // 少部份情況會是 /#employees/new 新增一個員工資料
                this.appModel.setViewState( 'EmployeeView', {id:null} );
            }
        }

    });
    
    return AppRouter;

});