/*

# 實驗 controller class

- 它的角色就是 command

- 將 biz logic  從 mediator 裏完整抽出來，集中一處

- 最重要的是讓 mediator 單純，separation of concerns

- 好處是可重覆使用

- 例子：假設開書有兩個進入點
    1、在書架中點一本書
    2、在我的最愛裏點一本書

    - 如果原本將開書 logic 寫在 ShelfMediator 裏，則 FavoriteMediator 要開書時，又要重新寫一遍

    - 但如果「開書logic」抽出來放在 BookController.openBook()，就可以兩個 mediator 共用

- 進階流程：BookController 依 book.id 取得一本書後，建立好 BookModel/Collection，接著要如何顯示書？

    - 應該有個 AppModel 負責管理所有的 view，並且由 MainAppMediator 偵聽它
    - BookController 開完書，設定 AppModel.currentState = "Book_Reader"，這個屬性改變，會觸發 MainAppMediator
    - MainAppMediator 聽到事件，就會建立 BookReader view 出來，放到 DOM 去

這樣做的好處是，可通過 AppModel 集中保管與切換目前狀態

 */
define( function(){

    function AppController(){

        // console.log( 'AppController 物件建立', this );

        // [inject EmployeeCollection]
        this.employeeCollection = null;

        // [inject]
        this.appModel = null;

        // [inject]
        this.EmployeeCollection = null;

        // 非 backbone 的 class 要記得人工觸發 injection
        injector.injectInto( this );
    }

    // public methods
    AppController.prototype = {
        
        /**
         * 示範：可供多支程式共用的指令，這樣就不用重覆寫 appRouter.navigate() 語法
         * 並且因為統一透過 controller 執行，也方便 log 或將來 undo
         */        
        showEmployee: function( target, options ){
            console.log( 'controller > showEmployee', arguments );            
            this.appModel.goto( target, options );
        },
        
        /**
         * 由於 collection.fetch() 是非同步操作，因此會先返還 promise 物件
         */
         getManagers: function( arrExcludes ){

            // 範例：透過 controller 取回 collection
            // this.appController.getManangers( [ this.model.id ? this.model.id.toString() : -9999 ] );
            

            var $response = new $.Deferred();

            // manager 一欄要取回所有主管名單
            var managers = new this.EmployeeCollection();

            // console.log( '\nmanager.fetch() 跑' );
            managers.fetch({
                
                //找出 managerId 是 0 或 1 的員工，這些人就是最高階主管，我設計成可傳 2 個 managerId 一次查找
                //並且為了避開 julie 的 manager 也是 julie，因此加了 notInclude 功能，排除掉自已
                //注意 data: 裏傳的參數一律用 String 格式，不然很容易因為給入 Number 而比對失敗
                data:{managerId: ['0', '1'], notInclude:arrExcludes },  
                
                success: function(){
                    // managers 是取回的 collection，在 resolve() 一併傳出去
                    $response.resolve( managers );
                }
            });

            return $response.promise();
         },

        /**
         * 系統中負責跟 server 取回資料的進入點
         */
        getEmployess: function(){
            this.employeeCollection.fetch( { reset: true, 
                                                data:{name:""}, 
                                                success: function(){console.log( '拿到資料了: ', arguments );} } );
        },


    }

    return AppController;


});