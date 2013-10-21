
/**
 * 這是宣告 class，將來要透過 new 建立 insatnce
 *
 * shell 裏面還有一個下拉選單，是 EmployeeListView，
 * 它裏面塞滿 EmployeeListItemView
 *
 * 在我的想法裏，sub-view 要用到的 model, collection，應該由 shell 建好，並在建立 sub-view 時通過 constructor 傳進去
 * 但結果不是...
 *
 * 
 */
define( ['text!tpl/TitleBarView.html'], function( tpl ){
    
    var TitleBarView = Backbone.View.extend({

        CLASS_NAME: "TitleBarView", 
        
        initialize: function ( options ) {

            // [inject AppModel]
            this.appModel = null;

            // [inject EmployeeListView]
            this.EmployeeListView = null;

            // [inject]
            this.PaginatedEmployeeCollection = null;

            // 示範：使用 controller
            // [inject]
            this.appController = null;

            
        },

        //
        template: _.template( tpl ), 

        /**
         * 示範：每次換語系後，會重刷所有頁面，系統會自動呼叫所有舊頁面做 dispose()，這裏幫忙做善後工作
         */
        beforeDispose: function(){
            this.animationStopped = true;
        },

        /**
         * 
         */
        render: function () {

            // console.log( 'titleBarView > renderer:', this.cid );
            
                
            /*console.log( '啟動 raf' );

            var self = this;
            window.requestAnimationFrame( run );

            var last = 0;
            function run( time ){
                if( self.animationStopped != true )
                    window.requestAnimationFrame( run );

                if( time - last > 500 ){
                    console.log( 'doo: ', self.cid);
                    last = time;
                }
            }*/

            // ↑ test
            //========================================================================


            var self = this;

            var poly = this.appModel.polyglot;
            this.poly = poly;

            // 先加 AppView 自已的 ui，基本上就是個空 shell，將來才要塞真正的內容進去
            // this.$el.html( this.template() );
            var o = {};
            o._i18n = {
                "app_title": poly.t('app.title')
                ,"ui_home": poly.t('ui.home')
                ,"ui_contact": poly.t('ui.contact')
            };
            
            // AppView 自已的 ui，也就是上方工具列
            // 注意用 setElement() 取代掉原本 bakcbone 自建的 div，這樣可少一個 tag
            //this.$el.html( this.template( o ) );
            this.setElement( this.template( o ) )


            //========================================================================
            //
            // 建立 paginating collection 
            
            // 由於 search menu 會因隨打即查而不斷改變其 collection 內容，因此建一個獨立的給它用
            // 並且注意這裏是傳一個空的進去，將來輸入查詢字後，才跟 server 抓取資料，因此下面沒跑 fetch()
                
            // 每次建立 PaginatedEmployeeCollection instance 時都應該要傳入自製的 server_api{}    
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

            // 務必給定一個假值，才能跟將來查詢的空白字串 '' 區隔
            this.colEmployees.server_api.$name = "-9999";

            //========================================================================
            //
            // select2 元件
            
            this.$searchBox = this.$('#searchBox');

            this.$searchBox.on('change', function( evt ){
                // console.log( '選一筆: ', arguments );
                
                // original good
                // self.appModel.goto('/employees/' + evt.val, {trigger: true, replace: false});
                
                // 示範：通過 controller 來操作指令，將來方便 undo，或多支程式共用這個 method
                self.appController.showEmployee( '/employees/' + evt.val, {trigger: true, replace: false} );
            })

            // 啟動 select2 元件在 search 框上
            this.$searchBox.select2({

                multiple: false

                // 算是 hack，因為埋太多層，到 ajax.transport() 時已無法取得 TitleBarView.js 的 ref 了，因此偷藏在這個變數裏
                , backbone_view: this
                           
               , placeholder: self.poly.t('ui.search_msg')

                , ajax: {
                    
                    url: "http://api.rottentomatoes.com/api/public/v1.0/movies.json"
                    
                    , dataType: 'jsonp'
                    
                    , quietMillis: 100

                    // 生成 ajax query string，我只需要它的 page number
                    // 像 page_limit 這種值都是給 server 程式看的
                    , data: function (term, page) { // page is the one-based page number tracked by Select2
                        
                        return {
                            q: term, //search term
                            page_limit: 3, // page size
                            page: page, // page number
                        };
                    }
                    
                    // jx: 模仿 $.ajax() 接口，轉為操作我提供的 paginated collection，而不是跟 server 請求資料
                    , transport: function( opt, options ){
                        
                        // console.log( '自製 ajax 接口: ', opt.data );

                        // 將早先偷埋的 view ref 取出來    
                        var view = this.data('select2').opts.backbone_view;

                        var key = opt.data.q;
                        var page = opt.data.page;
                        var page_limit = opt.data.page_limit;
                                    

                        // 第一次 fetch 過後，內部分成多頁，第二次就應該只是叫 collection 翻頁
                        if( key == view.colEmployees.server_api.$name ){
                            
                            view.colEmployees.goTo( opt.data.page );

                            // 將 models 轉成 select2 能吃的格式
                            var arr = [], i, model, len = view.colEmployees.length;
                            for( i=0; i<len; i++ ){
                                model = view.colEmployees.at(i);
                                arr.push({id: model.id, text: model.get('firstName') + ' ' + model.get('lastName') });
                            }

                            //
                            var result = {
                                data: arr, //[{id:'foo', text:'barr'}], //目前頁碼需要的資料 共10筆
                                total: view.colEmployees.origModels.length, //jx: 總共 n 筆資料
                                perPage: view.colEmployees.perPage
                            };

                            opt.success.call( self, result );

                        }else{

                            // 查詢不同字時，就要重新 fetch

                            // 將要查詢的字串放入 collection 中
                            // 將來 server 端程式要讀取 $name 就會知道想查哪個字
                            view.colEmployees.server_api.$name = key;
                            // console.log( '查不同字: ', key );

                            // 原本應該是 ajax call 連往 server 查詢資料，我攔擷下來改操作 paginated collection 取資料
                            view.colEmployees.fetch( {

                                reset: true, 
                                
                                success: function( collection, data, options ){

                                    // console.log( '模擬抓完資料', arguments );

                                    // 啟動內部分頁
                                    collection.bootstrap();

                                    // 將 models 轉成 select2 能吃的格式
                                    var arr = [], i, model, len = collection.length;
                                    for( i=0; i<len; i++ ){
                                        model = collection.at(i);
                                        arr.push({id: model.id, text: model.get('firstName') + ' ' + model.get('lastName') });
                                    }

                                    //
                                    var result = {
                                        data: arr, // 目前頁碼需要的資料 共10筆
                                        total: collection.origModels.length, // 總共 n 筆資料
                                        perPage: collection.perPage
                                    };

                                    opt.success.call( self, result );   //← 這裏要傳入收到的結果 json []
                                }

                            } );
                        }

                        // 看來根本不用是 promise 物件，只要身上有 abort function 就好
                        return {abort: function(){}};
                    }

                    // ajax 取回結果，這裏最重要目地只是判斷是否還有 more 頁面
                    , results: function (result, page) {

                        // console.log( 'results > data= ', result, page );

                        var more = (page * result.perPage ) < result.total; // whether or not there are more results available

                        // notice we return the value of more so Select2 knows if more results can be loaded
                        return {results: result.data, more: more};
                    }
                }

                , formatResult: self.format

            });
            
            // 示範 search dropdown 能 infinite scroll，但因為我資料太少，每頁只想顯示3筆，
            // 因此將 menu 高度限制為 120px，這樣至少可觸發抓取三次
            var s2instance = this.$searchBox.data('select2');
            s2instance.dropdown.find(".select2-results").css('maxHeight', 120);

            //========================================================================
            //
            // 切換語系
            
            this.$langSwitch = this.$('');
            this.$btnLang = this.$('#langSwitch .dropdown-toggle');
            this.$menu = this.$('#langSwitch .dropdown-menu');

            // 鋪語系選單內容
            this.langMapChangeHandler();
            
            this.$btnLang = this.$('#langSwitch .dropdown-toggle').dropdown();

            // currentLang 是寫 en，但顯示時，要對應成 English
            var map = this.appModel.get('langMap');
            this.$btnLang.text( map[ this.appModel.get('currentLang') ] );
            
            // 偵聽每個 menu item 被按下，要切換語系
            this.$menu.on('click', function(evt){
                
                var $target = $(evt.target);
                
                var lang = $target.data('target');
                var text = $target.text();

                console.log( '切換語系: ', text );

                // 通知 appModel 切換語系
                self.appModel.switchLang( lang );

                // 更新語系鈕的文字，反應目前被選取的項目
                // self.$btnLang.text( text );
            });

            return this;
        
        },//end render

        // no-op in this case
        redraw: function(){

        },

        /**
         * 讓 direct reports 編輯畫面內 select2 下拉選單也會顯示頭像
         */
        format: function( obj, container ){
            // console.log( 'format: ', arguments );
            // return "<img src='pics/Julie_Taylor.jpg' width='32' height='32'/>&nbsp;&nbsp;<span>Julie Taylor</span>";
            var str = "<img src='pics/" + obj.text.replace(' ', '_') + ".jpg'" + " width='32' height='32'/>&nbsp;&nbsp;<span>" + obj.text + "</span>";
            return str;
        },


        // ==========================================================================
        // view events and handler
        // ==========================================================================

        //偵聽使用者操作，返饋給 model
        events: {
            "keyup .search-query": "search",
            "keypress .search-query": "onkeypress"
        },

        //shell view 本身沒內容，唯二的功能就是
        //1. 提供容器將來放入不同 sub-views
        //2. 搜尋框的操作
        search: function (event) {

            // 取得查詢字串
            var key = $('#searchText').val();

            // 重要：searchResults collection 一開始時是空的，執行 fetch() 後才會跟 server/api 取回資料
            // 然後透過 success callback() 觸發後續處理，這例子因為用 in-memory store 因此改成下面 setTimeout() 模擬稍後 success callback
            // 它透過 options{} 偷傳了一組 data 參數，這是為了從 db 中查詢姓名包含用戶輸入的 Key
            // this.employeeCollection.fetch({ data: {name: key}, reset: false });
            this.searchResultsMenu.collection.fetch({ data: {name: key}, reset: true });

            // 原本執行 searchResults collection 的 fetch 動作後，應該傳入 success callback 等它通知取回資料了
            // 但因為用的是 memoryStore，因此自已用 setTimeout() 模擬拖延時間，再執行結果
            setTimeout(function () {

                //下面這段其實就是原本該有的 success callback
                //TODO: 我覺得存取 sub-view 應該透過先前保存的變數 - this.searchResultsMenu.$el.addClass() 比較好，而不是直接存取 dom
                this.$('.dropdown').addClass('open');
            });
        },

        // 擋掉 enter 事件而已，原因不明
        onkeypress: function (event) {
            if (event.keyCode === 13) { // enter key pressed
                event.preventDefault();
            }
        },



        // ==========================================================================
        // model events and handler
        // ==========================================================================
        
        // jxdebug: 用宣告的方式，偵聽 model 內事件
        // 這裏要小心曾將 appModel 寫成 AppModel，就偵聽不到了
        modelEvents: {
            "change:currentState appModel" : "selectMenuItem"
            , "change:langMap appModel" : "langMapChangeHandler"
        }, 

        /**
         * 最上方工具列有兩個鈕，要依目前顯示畫面 toggle 哪顆被按下
         *
         * 注意這裏手法很乾淨，不讓 AppView 直接與 TitleBarView 溝通，
         * 而是透過兩者共用的 AppModel 來設定屬性造成事件廣播
         */
        selectMenuItem: function( model, newState, options ) {
            
            // 先清掉所有選取按鈕
            $('.navbar .nav li').removeClass('active');

            var menuItem;

            switch( newState.state ){

                case "HomeView":
                    menuItem = '.home-menu';
                    break;
                
                case "ContactView":
                    menuItem = '.contact-menu';
                    break;
            }

            //        
            if (menuItem) {
                $(menuItem).addClass('active');
            }
        },

        /**
         * 如果 app 跑到一半，有新出現可用的語系，要更新下拉選單
         */
        langMapChangeHandler: function(){
            // 啟動語系切換鈕 - 使用 bootstrap dropdown js
            var map = this.appModel.get('langMap');

            // 鋪下拉選單的內容
            var key, elem, arr = [];
            

            // 方法1：不排序，直接依 server 回傳的順序列出
            for( key in map ){
                elem = '<li><a tabindex="-1" data-target="' + key + '" href="javascript: void(0)">' + map[key] + '</a></li>';
                this.$menu.append( $(elem) );
            }
            
            // 方法2：依國名排序
            // for( key in map ){
            //     arr.push( {key:key, value: map[key]} );
            // }

            // arr.sort( function(a,b){ 
            //     return a.value > b.value;
            // })

            // var i, len = arr.length;
            // for( i=0; i<len; i++ ){
            //     elem = '<li><a tabindex="-1" data-target="' + arr[i].key + '" href="javascript: void(0)">' + arr[i].value + '</a></li>';
            //     this.$menu.append( $(elem) );
            // }
        },


        // ==========================================================================
        // helpers
        // ==========================================================================


    });
    
    return TitleBarView;
    
});