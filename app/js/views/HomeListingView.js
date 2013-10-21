/**
 * HomeView (首頁) 中，條列顯示所有員工的 table，
 * 每列點下會開啟 detail 頁面顯示詳細資訊
 */
define( ['text!tpl/HomeListingView.html'], function( tpl ){

    var HomeListingView = Backbone.View.extend({

        // js classname
        CLASS_NAME: "HomeListingView",

        // base element
        tagName:"div",

        // <div id="">
        id: "homeListingTable",

        /**
         * 
         */
        initialize: function( options ){
            
            // [inject HomeListingItemView]
            this.HomeListingItemView = null;

            // [inject AppModel]
            this.appModel = null;
        }, 

        // 將 tpl 字串轉成 template function 並存起來
        template: _.template( tpl ),

        /**
         * 
         */
        render:function () {

            var self = this;

            // 準備 i18n 字串
            var poly = this.appModel.polyglot;
            var o = {};
            o._i18n = {
                "name": poly.t('common.name')
                , "title": poly.t('common.title')
                , "phone": poly.t('common.phone')
                , "email": poly.t('common.email')
            };

            // 先鋪自身的 ui - 通常這事應該在 redraw() 裏做，但因為這個 template 正好只是個 <table> 外框，不會變動
            // 因此只需鋪一次，故移到 render() 來，算是省掉一些 repaint 的時間
            this.$el.html( this.template( o ) );

            this.redraw();

            return this;
        },

        /**
         * note: 頁面啟動時，會觸發2次 reset，那是因為 backbone.clientPager 造成的，將來改用 requestPager 看能否解決
         */
        redraw: function(){

            // console.log( '\t\thomeListing > redraw' );

            var self = this;


            var $table = this.$('table tbody');

            // table 外框不變，只把 tbody 內容清空，繪新資料
            $table.empty();

            // 開始一條條畫出 tr
            this.collection.each( function( employee ){
                $table.append( new self.HomeListingItemView( {model: employee} ).render().el );
            });
        },


        // ==========================================================================
        // view events and handler
        // ==========================================================================

        /**
         * 
         */
        events: {

            // table 中某個 item 被按下時的處理
            "click table tbody tr" : "handleItemClick",

            // 希望 table 整列都能有按下反應
            "mousedown table tbody tr" : "handleItemClick",
        },

        /**
         * table 中某筆資料被點選了
         */
        handleItemClick: function( evt ){
            
            // console.log( 'item 被點了: ', evt.type, evt );

            // 重要：因為 html 裏是寫 <li href="#/employee/2"> 它沒有帶語系，因此會符合 router 內的 #notFound 而導回首頁
            // 這裏我接手處理，因此停掉它的預設行為
            var $target = $(evt.currentTarget);
    
            if( evt.type === 'mousedown' ){
                // 讓 row 變色，製造一個視覺回饋
                $target.addClass('row-mousedown');
            }
            else if( evt.type === 'click' ){
                // console.log( '點選資料: ', evt.currentTarget.dataset.uid );

                evt.preventDefault();
                
                // 跳轉路徑
                var path = '/employees/' + evt.currentTarget.dataset.uid;
                var options = {trigger: true, replace: false};
                this.appModel.goto( path, options );

                // 等100ms 再還原，製造出 row click 的按下效果
                setTimeout( function(){
                    $target.removeClass('row-mousedown');
                }, 100 );
            }
        },



        // ==========================================================================
        // model events and handler
        // ==========================================================================
        
        /**
         * 
         */
        modelEvents: {
            "change collection" : "changeHandler",
            "reset collection" : "resetHandler",
            "destroy collection" : "dispose"
        }, 

        changeHandler: function(){
            console.log( '-change-' );
            this.redraw();
        },

        resetHandler: function(){
            // console.log( '-reset-', arguments );
            this.redraw();
        },


    });

    return HomeListingView;
});