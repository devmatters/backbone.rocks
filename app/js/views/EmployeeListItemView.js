/**
 * 用於 List 裏的 item renderer 
 * 它對應的 EmployeeListItemView.js 裏的基底 elm 是 <li>，將來塞入 EmployeeListView 的 <ul> 就正好組成 List
 */
define( ['text!tpl/EmployeeListItemView.html'], function( tpl ){

    var EmployeeListItemView = Backbone.View.extend({

        tagName:"li",

        initialize: function( options ){

            // 注意只有這個 view 的 model 一定要從外面傳進來，因為它是早先在 EmployeeCollection 裏建立的 instance，
            // 因此不能用注射的    
            this.employeeModel = options.model;

            // initialize() 最後兩行一定是這個
            //injector.injectInto( this ); ← 除非這個 class 沒用到注射，就不用跑
            // this.delegateModelEvents();
        }, 


        // ==========================================================================
        // view events and handler
        // ==========================================================================

        // 將 tpl 字串轉成 template function 並存起來
        template: _.template( tpl ),

        render:function () {

            // console.log( 'employeeListItemView > render() ' );

            // The clone hack here is to support parse.com which doesn't add the id to model.attributes. For all other persistence
            // layers, you can directly pass model.attributes to the template function
            var data = _.clone(this.model.attributes);
            data.id = this.model.id;
            this.$el.html(this.template(data));
            return this;
        },


        // ==========================================================================
        // model events and handler
        // ==========================================================================
        
        modelEvents: {
            "change employeeModel" : "render",
            "destroy employeeModel" : "dispose"
        }


    });

    return EmployeeListItemView;
});