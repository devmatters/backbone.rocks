/**
 *
 * 這是一個 List 元件，
 * 其實就是 ul 下面放一堆 li，可喜之處是它有基本封裝，
 * 因此外界只要傳入 collection，它就會偵聽並重繪畫面，用起來是有幾分元件的 fu
 *
 * 目前僅用於：單個員工資料頁面裏的 direct reports
 *
 */
define( function(){

    // 它本身沒有相應的模板，就是用預設的 ul elem
    var EmployeeListView = Backbone.View.extend({

        CLASS_NAME: "EmployeeListView",

        // 所謂的 List 元件，就是一個 <ul> 加每個 item 一個 <li>
        tagName:'ul',

        className:'nav nav-list',

        // 重要：這裏就是 mediator 最重要的工作之一 → 偵聽 model 事件，並重繪 view
        initialize:function () {

            // [inject EmployeeListItemView::Class]
            this.EmployeeListItemView = null;
        },


        //
        render:function () {

            // console.log( '\n\ndirect reports 重繪: ', arguments, this.model );

            var self = this;

            this.redraw();

            return this;
        },

        /**
         * 
         */
        redraw: function(){
            
            // 這裏算是有初步清掉之前建的 elem，但它們相應的 mediator code 就沒清
            this.$el.empty();

            var self = this;

            // 注意由於這個 tag 不屬於此 view 的 template，因此不能用 this.$() 做區域選取
            // console.log( 'this.collection.length = ', this.collection.length );
            
            // toggle '沒有員工' 訊息
            this.$noReports = $('.no-reports');

            ( this.collection.length == 0 ) ? this.$noReports.show() : this.$noReports.hide();

            // 外界是把 collection 放在 model 變數傳進來，正確做法應該放在 {collection: foo} 裏
            // 因此下面 model.models 就是在存取 collection 內所有物件的 array
            _.each( this.collection.models, function (employee) {

                // 為每個 Emplyee Model 建立一個相應的 View，並 append 到 listView 裏
                // this.$el.append(new directory.EmployeeListItemView({model:employee}).render().el);
                this.$el.append( new this.EmployeeListItemView( {model:employee} ).render().el);
            }, this);
        },


        // ==========================================================================
        // view events and handler
        // ==========================================================================



        // ==========================================================================
        // model events and handler
        // ==========================================================================


        // 用宣告的方式，偵聽 model 內事件
        modelEvents: {
            "reset collection" : "resetHandler",
            "change collection" : "changeHandler",
            // "remove collection" : "removeHandler",
            "merge collection" : "mergeHandler",
            "add collection" : "addHandler"
        },

        resetHandler: function(){
            console.log( 'reset < directReport: ', arguments );
            this.redraw();
        },

        changeHandler: function(){
            console.log( '\tchange < directReport: ', arguments );
            this.redraw();
        },
        
        removeHandler: function(){
            console.log( 'remove < directReport: ', arguments );
        },
        
        mergeHandler: function(){
            console.log( 'merge < directReport: ', arguments );
        },
        
        addHandler: function( model, collection, options ){
            // console.log( 'directReport add: ', arguments );
            this.$el.append( new this.EmployeeListItemView( {model:model} ).render().el);

            //
            ( this.collection.length == 0 ) ? this.$noReports.show() : this.$noReports.hide();
        }

    });
    
    return EmployeeListView;
    

});    