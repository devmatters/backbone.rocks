/*

 */
define( ['text!tpl/ContactView.html'], function(tpl){

	var ContactView = Backbone.View.extend({

		CLASS_NAME: "ContactView",

		/**
		 * 
		 */
		initialize: function( options ){

		}, 

		// 將 tpl 字串轉成 template function 並存起來
	    template: _.template(tpl),

	    render:function () {
	        this.$el.html(this.template());
	        return this;
	    }

	    // ==========================================================================
        // view events and handler
        // ==========================================================================



        // ==========================================================================
        // model events and handler
        // ==========================================================================



        // ==========================================================================
        // helpers
        // ==========================================================================



	});

	return ContactView;

});