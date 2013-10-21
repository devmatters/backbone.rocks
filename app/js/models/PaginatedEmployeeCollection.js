/**
 * 第一次採用 paginator 做成的 collection
 */
define( [/*'js/models/EmployeeModel'*/], function( /*EmployeeModel*/ ){
    
    /**
     * paginator 有兩個模組，requestPager 與 clientPager，
     * 這裏因為所有資料都是 in-memory 了，因此採用 clientPager，
     * 但將來換成 requestPager 也不難
     */
    var PaginatedEmployeeCollection = Backbone.Paginator.clientPager.extend({

        CLASS_NAME: 'PaginatedEmployeeCollection',

        /**
         * 
         * 指定此 collection 內容物的 class type 為 Employee
         * 由於 injector 是認 'model' 字串做 mapping，但每個 Collection 裏都有 model 這屬性，因此無法用注射
         * 只好乖乖用 require 載入 Class definition，這是目前唯一無法注射的情況
         * 
         */
        // model: EmployeeModel,


        /**
         * 
         */
        initialize: function(options){
            // console.log( 'initi' );

            this.memoryStore = null;

            // 重要：使用 backbone.paginator 建立的 collection，一定要在 constructor 傳入一個 server_api obj 
            // 不然就會使用 root class 定義的版本，那會造成多個 collection instance 共用，下場是像 $name 變數會彼此覆蓋
            
            // 基於安全，這裏先拋 Error
            if( !options.server_api )
              throw new Error("server_api config obj not found");

            this.server_api = options.server_api;

            // 為了解決 circular reference 採取的手段
            var Clazz = require('js/models/EmployeeModel');
            this.__proto__.model = Clazz;

        },

        /**
         * 由於我的 collection 要提供自已的 sync method 去操作自製的 MemoryStore，
         * 因此固定宣告為 sync2()，也已改在 backbone.paginatior lib 裏
         */
        sync2: function( queryOptions ) {

            // HomeView 有將要查詢的名稱放入 collection.server_api.$name 裏面
            // backbone.paginator 會讀取此值成為送回 server 的參數，
            // 下面就是讀出這個值，做為查詢條件
            var params = $.getQueryString( queryOptions.data );

            // console.log( 'params = ', params );

            var name = params.$name;

            if (queryOptions.type === "GET") {

                // console.log( '跑我的 sync' );

                var self = this;

                // 這裏的 directory.store 就是在操作他自已寫的 MemoryStore 物件
                // 應該所有 CRUD 都會轉手交給它處理
                this.memoryStore.findByName( {name: name}, function (data) {
                    
                    // 如果當初外界有傳入 callback()，先執行它們
                    queryOptions.success(data);

                    // 重要：因為我接手了 sync() 的處理，因此當資料回來時，要通知 backbone.paginator 內部去重新計算分頁資料，並且更新 info{} 物件
                    // 也才會廣播 'info' 事件出去
                    // 注意要先跑這個內部處理，才能跑下面 success()
                    // self.pager();
                    // update: 後來發現更根本的指令是跑 bootstrap() 才會一路執行 pager(), info() 等工作
                    // self.bootstrap();



                    // console.log( '取得資料: ', data );
                });
            }
        },

        // ==========================================================================
        // paginator config
        // ==========================================================================
        
        paginator_core: {
          // the type of the request (GET by default)
          type: 'GET',

          // the type of reply (jsonp by default)
          dataType: 'jsonp',

          // the URL (or base URL) for the service
          // if you want to have a more dynamic URL, you can make this a function
          // that returns a string
          url: 'http://odata.netflix.com/Catalog/People(49446)/TitlesActedIn?'
        }, 

        paginator_ui: {
          // the lowest page index your API allows to be accessed
          firstPage: 1,

          // which page should the paginator start from
          // (also, the actual page the paginator is on)
          currentPage: 1,

          // how many items per page should be shown
          perPage: 3,

          // a default number of total pages to query in case the API or
          // service you are using does not support providing the total
          // number of pages for us.
          // 10 as a default in case your service doesn't return the total
          // totalPages: 10, 

          // The total number of pages to be shown as a pagination
          // list is calculated by (pagesInRange * 2) + 1.
          pagesInRange: 4

        },

        /**
         * 注意：定義在這裏會成為最上層 root class 的 default 值
         * 每前建立 PaginatedEmployeeCollection instance 時都應該要傳入自製的 server_api{}
         */
        server_api: {
          
          $OVERRIDE_ME: 'YOU SHOULD PASS IN NEW CONFIG OBJECT IN COLLECTION\'S CONSTRUCTOR',

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

        },





    });

    return PaginatedEmployeeCollection;
    
});