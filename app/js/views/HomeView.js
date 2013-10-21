
/**
 * 快速複習
 * - backbone 的 view 就是 mediator
 * - 負責兩組工作
 * - a. 偵聽 model 的事件，並且更新畫面狀態
 * - b. 偵聽 view 用戶觸發的事件，執行 event handler，將訊息反饋入 model
 *
 * - a 一般是在放 initialize:function() 內執行，這裏正好沒用到
 * - b 的工作在 backbone 裏統一放在 events{} 裏宣告
 */

define( ['text!tpl/HomeView.html'], function( tpl ){

    var HomeView = Backbone.View.extend({

        CLASS_NAME: "HomeView",

        /**
         * 
         */
        initialize: function( options ){

            // [inject HomeListingView]
            this.HomeListingView = null;

            // [inject class]
            this.TitleBarView = null;

            // [inject EmployeeCollection]
            // this.EmployeeCollection = null;


            this.PaginatedEmployeeCollection = null;

            this.appModel = null;
        }, 


        // 將 tpl 字串轉成 template function 並存起來
        template: _.template( tpl ),

        /**
         * 
         */
        render:function () {
        
            // console.log( 'homeview.render()' );
            
            //
            var self = this;
            
            this.poly = this.appModel.polyglot;
            
            // 鋪基本 ui
            this.redraw();



            //========================================================================
            //
            // 建立 paginating collection 
            
            // 每次建立 PaginatedEmployeeCollection instance 時都應該要傳入自製的 server_api{}    
            // 不然多個 collection instance 會共用最上層定義的 default server_api{} 將來就會互相覆寫 $name 的值，很慘
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

            // 改用 pagination collection
            this.colEmployees = new this.PaginatedEmployeeCollection( config );

            // 每次 collection 內部資料有變動時，會廣播 info event，聽到再更新 ui 即可
            // update: 結果失敗，因為 bootpag 與 paginator 兩都造成循環事件
            /*
            this.colEmployees.on('info', 
                function(data){
                    console.log( 'collection :: info 事件', data );
                    // self.updatePagination( data );
                }
            );
            */


            // 將建立的 coll 保留一份在 appModel 方便其它人用
            // 目前是用 coll.id 做為 key
            // this.appModel.collections[ this.colEmployees.id ] = this.colEmployees;
            this.appModel.add( 'collections', 'colEmployees', this.colEmployees );
            

            //========================================================================
            //
            // 分頁元件

            // 方案 1: 使用 jqPagination 分頁元件
            /*
            this.$paginator = this.$('#paginator');

            // 
            this.$paginator.jqPagination({
                link_string : '/?page={page_number}',
                max_page    : 40,
                paged       : function(page) {
                    console.log( 'paged 發生' );
                    // $('.log').prepend('<li>Requested page ' + page + '</li>');
                }
            });
            */
           
            // 方案 2: 使用 bootpag 翻頁元件
            this.$bootpag = this.$('#bootpag');

            /* 特別注意這裏給的 {} 參數物件不可以有額外資料，不然會導致整個元件不運行 */
            this.$bootpag.bootpag({
                total: 1    
                , page: 1
                , maxVisible: 5
                //, href: "#page/{{number}}"    /* 注意我刻意不用它內建的切換 location 功能，因為會造成事件循環又觸發一次 bootpag 操作 */
                , leaps: false                  /* 例如一次五頁，true = 按 next 是跳顯示 6-10 頁；false = 一頁頁翻 */
                , next: this.poly.t('ui.next')
                , prev: this.poly.t('ui.prev')
            });

            // 分頁元件按鈕被操作後，轉手操作 collection 去換頁
            this.$bootpag.on('page', function(evt, num){
                
                // console.log( '分頁bar 按鈕換頁: ', num );
                
                // 重要：擋掉循環事件發生
                if( self.colEmployees.information.currentPage == num )
                    return;

                // 按鈕後，操作 collection 翻頁    
                self.colEmployees.goTo( num );

                // 也要更新 location bar 上的路徑，讓兩者一致
                self.appModel.goto('/page/'+num, {trigger: false});
            });

            // ↑ 分頁元件
            //========================================================================

            
            // ← 等上面將所有 ui 元件(例如 bootpag) 都建好，才能啟動 collection.fetch() 抓資料
            // 不然如果資料太快回來，可能因為 bootpag 還不存在而炸掉



            // 第一次跑都是撈所有人，因此 $name 給空值
            this.colEmployees.server_api.$name = "";

            // 觸發 collection 抓取初始資料
            this.colEmployees.fetch( {reset: true

                //觸發 collection 取回所有20筆資料後，人工跑 bootstrap 去計算分頁
                //也因此顯示 clientPager 其實用途不大
                , success: _.bind( this.updatePagination, this )
            } );

            // 將 view 加到畫面上
            var view = new this.HomeListingView( {collection:this.colEmployees} ); 
            this.$('#mainListing').replaceWith( view.render().el );
            this.subViews.push( view );

            // add button
            this.$btnAdd = this.$('#btnAdd');

            // 小玩一下將 event handler 拉出去寫
            this.$btnAdd.on( 'click', $.proxy(addEmployeeHandler, this) );

            /**
             * 重要：注意新增一個員工，也是依循原本頁面切換原則，一律透過 appModel.setViewState() 操作
             * update: 後來改成更輕鬆的，直接切換 routing，讓 AppRouter 去接手處理
             */
            function addEmployeeHandler(evt){
                this.appModel.goto('/employees/new', {trigger:true});
            }

            // delete button
            this.$btnRemove = this.$('#btnRemove');
            this.$btnRemove.on( 'click', $.proxy( removeEmployeeHandler, this) );

            function removeEmployeeHandler(evt){
                //this.appModel.goto('/employees/new', {trigger:true});
                console.log( '確定要刪除員工: ', this.model.id );
            }

            return this;
        },

        /**
         * 
         */
        redraw: function(){

            var self = this;

            var o = {}
            o._i18n = {
                "btn_create": this.poly.t('ui.btn_create')
                , "btn_search": this.poly.t('ui.btn_search')
                , "msg_enter_keyword": this.poly.t('ui.msg_enter_keyword')
            };


            this.$el.html(this.template( o ));


            this.$inputSearch = this.$('#inputSearch');
        },


        /**
         * paginated collection 有操作 fetch() 後，一律透過此 method 處理後續更新事項
         * 它要跑 collection.bootstrap(), 
         * 也要更新 bootpag ui
         */
        updatePagination: function(){

            // 新建立的 paginated collection 至少要跑一次 bootstrap() 才能啟動內部機制
            this.colEmployees.bootstrap();
            // console.log( '資料抓回來了 > 頁數 = ', this.colEmployees, arguments );

            // test: 拿回資料後才知道正確總頁數
            // self.$paginator.jqPagination('option', 'max_page', 999);
            this.$bootpag.bootpag({ total: Math.max( 1, this.colEmployees.information.totalPages), page: 1 } );

            // 也要記得更新 location bar 的路徑
            this.appModel.goto('/page/1', {trigger: false, replace: true});
        },



        
        // ==========================================================================
        // view events and handler
        // ==========================================================================
        
        /**
         * 第一頁主畫面只有一個 show me 按鈕會被操作，這裏就偵聽這個 view event
         */
        events:{
            "click #btnSearch" :        "handleSearchClick"
            , "input #inputSearch" :    "handleInputText"
        },

        handleInputText: function( evt ){
            
            // console.log( 'input>', evt.target.value, evt );

            this.handleSearchClick();

            // if( evt.keyCode == 13 ){
            //     //enter key
            // }else{
            //     console.log( 'input>', evt.target.value, evt );
            // }
        }, 

        /**
         * 
         */
        handleSearchClick:function ( evt ) {
            
            var key = this.$inputSearch.val();
            
            // console.log("search = ", key );

            // 將要查詢的字串放入 collection 中
            // 將來 server 端程式要讀取 $name 就會知道想查哪個字
            this.colEmployees.server_api.$name = key;

            this.colEmployees.fetch( {reset: true, 
                success: _.bind( this.updatePagination, this )
            } );

        },

        // ==========================================================================
        // model events and handler
        // ==========================================================================

        modelEvents: {
            //router 接到 /#page/3 時，會設定 appModel.listing_page，進而廣播觸發這裏    
            "change:listing_page appModel" : "gotoPage",
            // "change:currentLang appModel" : "currentLangChangeHandler"
        },

        // currentLangChangeHandler: function(){
        //     this.render();
        // },

        /**
         * 這裏是處理當用戶在 location bar 直接輸入 http://localhost:8080/#page/4
         * 要讓 datagrid 顯示第 4 頁資料
         * 也就是 由外而內 的操作
         */
        gotoPage: function( model, page, options ){
            console.log( 'homeView::gotoPage(): ', page );
            
            //操作 collection 取回該頁資料
            this.colEmployees.goTo( page );

            // 也操作分頁列切換到正確頁碼
            this.$bootpag.bootpag({ page: page} );
        },

        // ==========================================================================
        // helpers
        // ==========================================================================
                
        


    });

    return HomeView;

});