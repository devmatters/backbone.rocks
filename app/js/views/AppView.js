
/**
 * 這是宣告 class，將來要透過 new 建立 insatnce
 *
 * 在我的想法裏，sub-view 要用到的 model, collection，應該由 shell 建好，並在建立 sub-view 時通過 constructor 傳進去
 * 但結果不是...
 *
 * 
 */
define( ['text!tpl/AppView.html' ], function( tpl ){
    
    var AppView = Backbone.View.extend({

        initialize: function ( options ) {

            // [inject AppModel]
            this.appModel = null;
            
            // [inject EmployeeCollection]
            // this.EmployeeCollection = null;

            //[inject class]
            this.EmployeeModel = null;

            // [inject class]
            this.TitleBarView = null;

            // [inject HomeView]
            this.HomeView = null;

            // [inject ContactView]
            this.ContactView = null;

            // [inject EmployeeView Class]
            this.EmployeeView = null;

            // AppView 是個 shell 而已，它裏面會切換多個 sub-views，這個變數記錄目前顯示中的 sub-view
            this.currentView = "";

        },

        // 將 tpl 字串轉成 template function 並存起來
        // template: _.template( tpl ), 
        template: _.template( tpl ), 

        /**
         * 這裏只負責自身最基底 view，其它 sub-view 重繪要等 switchSubview() 執行
         */
        render: function () {

            var self = this;

            console.log( '\tAppView :: render ← 它只負責自身最基底 view' );

            var poly = this.appModel.polyglot;

            // 先加 AppView 自已的 ui，基本上就是個空 shell，將來才要塞真正的內容進去
            // this.$el.html( this.template() );
            var o = {};
            o._i18n = {
                "app_name": poly.t('app.name')
                , "app_copyright_year": poly.t('app.copyright.year')
                , "app_twitter": poly.t('app.twitter')
            };

            this.$el.empty();
            this.$el.html( this.template( o ) );

            // 保存一個 ref 方便日後往裏面塞東西
            this.$content = this.$('#content');

            // 再將 titlebar 加到畫面
            
            // 由於 AppView 是 singleton，它永遠不會 dispose()，因此它的child views 就要人工做
            if( this.titleBarView )
                this.titleBarView.dispose();

            this.titleBarView = new this.TitleBarView();
            this.$content.before( this.titleBarView.render().el );

            // 存到 childView 裏，將來 dispose() 會自動清掉
            this.subViews.push( this.titleBarView );


            // index.html 裏的 <title> 文字也要多語化
            document.title = poly.t('app.name');

            return this;
        },

        /**
         * 由於這個 view 所有元素都是建完一次就不需重繪，因此全放在 render() 內做完了
         */
        redraw: function(){

        },


        // ==========================================================================
        // view events and handler
        // ==========================================================================

        //偵聽使用者操作，返饋給 model
        events: {
            // "keyup .search-query": "search",
            // "keypress .search-query": "onkeypress",
            // "click" : "closeMenu"
        },



        // ==========================================================================
        // model events and handler
        // ==========================================================================
        

        // jxdebug: 用宣告的方式，偵聽 model 內事件
        // 這裏要小心曾將 appModel 寫成 AppModel，就偵聽不到了
        modelEvents: {
            //function(a){ console.log( 'model > foo:bar 觸發了', a, "<<" ); } 直接寫 function 也可以
            //"foo:bar UserModel" : "updateListing", 
            // "change appModel" : "updateSubview"
            "change:currentState appModel" : "switchSubview",
            
            "change:currentLang appModel" : "currentLangChangeHandler"
        }, 

        /**
         * 
         */
        currentLangChangeHandler: function(){
            
            console.log( '\n\nAppView > current lang change - 所有 view 重繪' );
            // return;

            // 觸發 AppView 本身 ui 重繪就好
            this.render();

            // 也觸發所有 sub-views 重繪
            this.switchSubview( null, this.newStateObj, null );
        },

        /**
         * 
         * - 如果是聽 {change:currentState appModel}，會傳來三個參數
         * model, newStateObj, options
         *
         * - 如果聽 {change appModel}，會傳回 2 個物件
         * model, options 
         *
         * - 但真正重要的都是第一個參數，model，裏面可存取
         *
         *  - model.changed{} 找到所有改變的 attributes
         *
         *  - model._previouseAttributes 可看出舊版的資料，方便比對
         *
         * @param newStateObj 是外界 setViewState() 時會傳入的一包參數{}，內有 obj.state = "" 與 obj.id
         */
        switchSubview: function( model, newStateObj, options ){
            
            console.log( '\tAppView switchSubView = ', newStateObj.state );

            //重要：保存 stateObj，將來切換語系時，才能正確重繪子畫面(看 currentLangChangeHandler() 寫法)
            this.newStateObj = newStateObj;
            
            var self = this;

            // 重要：這裏執行 舊的基底view 內 dispose()，就會引發連串 sub-views dispose() 工作，清掉所有舊東西
            // 因此每個 view 正確將自已的 sub-views 放入 this.subViews[] 裏是很重要的，有助 GC 正確執行
            if( this.currentView ){
                this.currentView.dispose();

                // update: 後來因為考慮多語系，幾乎所有頁面都會重刷，因此根本不用 cache 頁面，故拿掉
                // 要 re-use 的 view 都會存在 this.appModel.views{} 裏，因此如果這裏為 false，代表可安心 dispose()
                // if( !this.appModel.has('views', this.currentView.cid ) )  //update: 新版裏 model 提供 has() 指令供查詢
                //     this.currentView.dispose();
            }

            //newStateObj = {state:state, params:{...}}
            switch( newStateObj.state ){

                case "HomeView":
                    
                    // console.log( '重建 homeview' );
                    var homeView = new this.HomeView();
             
                    // 注意子畫面要加到 $content 下，不然直接加到 body 下就會取代掉 AppView 本身
                    this.$content.html(  homeView.render().el );

                    this.currentView = homeView;
                    

                    break;

                case "ContactView":
                    
                    // 重要：如果一個 view 可能被重覆使用，就要判斷它的 isReady() 狀態，決定是否該重新掛回事件
                    /*if( !this.appModel.has('views', 'contactView' ){
                        this.contactView = new this.ContactView();
                        this.contactView.render();

                        //可 cache 的頁面(例如靜態頁，但小心如果有多語系，就不算靜態頁面)，塞入 appModel 保存
                        this.appModel.add( 'views', 'contactView'，this.contactView );  
                    }else{
                        this.contactView = this.appModel.views.contactView;
                        this.contactView.delegateEvents();
                    }*/

                    this.contactView = new this.ContactView();

                    // 注意子畫面要加到 $content 下，不然直接加到 body 下就會取代掉 AppView 本身
                    this.$content.html( this.contactView.render().el );

                    this.currentView = this.contactView;    

                    break;

                case "EmployeeView":
                    
                    // console.log( '要顯示員工= ', newStateObj.params );

                    var employeeModel, employeeView, employeeId;

                    employeeId = newStateObj.params.id;

                    if( this.appModel.collections.allEmployees ){
                        //如果 allEmployees 已存在，就先跟 in-memory collection 拿
                        employeeModel = this.appModel.collections.allEmployees.get( employeeId );
                    }

                    // 如果沒貨，就建新 model 直接跟 server 拿
                    if( !employeeModel ){

                        employeeModel = new this.EmployeeModel({ id:employeeId }, {url:'user/get/'})
                        
                        // 如果 Id 是 null 代表新增員工，就不需要檢查 fetch 後的是值是否為空，剩下的事交給 EmployeeView 內部去處理
                        if( employeeId != null ){


                            // 後來改用手法二：先傳 dummy model 進去，因為 view 可以正確處理 redraw 機制了
                            // 注意下面這段只是透過 success callback 判斷取回的資料是否為 null, 那代表無資料，要退回 HomeView
                            employeeModel.fetch( {success: function( model, resp, options ){
                                // console.log( '取完: ', arguments );
                                if( resp == null ){
                                    console.log( '查找的員工: ' + employeeId + ' > 不存在，退回首頁' );
                                    self.appModel.goto( '/page/1', {trigger: true, replace: false});
                                }
                            }});

                        }else{

                            //
                            employeeModel.fetch();
                            
                            // 如果是新增員工，location 也要改。路徑寫成 /new 是仿 rails 傳統
                            self.appModel.goto('/employees/new', {trigger: false, replace: false});
                        }

                        //
                        employeeView = new this.EmployeeView( {model:employeeModel} );

                        // 注意子畫面要加到 $content 下，不然直接加到 body 下就會取代掉 AppView 本身
                        this.$content.html( employeeView.render().el );
                        
                        this.currentView = employeeView;

                        
                        // original backup
                        // 手法一： model.fetch() 成功後才建 view，以避免不必要的二次重繪(及後續問題)
                        /*
                        employeeModel.fetch( {success: 
                            function(){
                                employeeView = new self.EmployeeView( {model:employeeModel} );

                                // 注意子畫面要加到 $content 下，不然直接加到 body 下就會取代掉 AppView 本身
                                self.$content.html( employeeView.render().el );
                                
                                self.currentView = employeeView;
                            }
                        });
                        */
                    }

                

                    break;


            }
        }, 


        // ==========================================================================
        // helpers
        // ==========================================================================
        

        /**
         * 
         */
        selectMenuItem: function( name ){
            //
        }


    });
    
    return AppView;
    
});