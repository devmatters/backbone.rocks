/**
 * 功能為 List 裏的 item renderer
 */
define( ['text!tpl/HomeListingItemView.html'], function( tpl ){

    var HomeListingItemView = Backbone.View.extend({

        CLASS_NAME: "HomeListingItemView", 
        
        initialize: function( options ){

        }, 

        // 將 tpl 字串轉成 template function 並存起來
        template: _.template( tpl ),

        /**
         * 
         */
        render:function () {

            // console.log( 'employeeListItemView > render() ' );

            this.redraw();

            return this;
        },

        /**
         * 
         */
        redraw: function(){

            // console.log( 'item renderer redraw' );
            
            this.$el.empty();

            if( this.model ){

                // 自建一個 elem 以取代 backbone 預設的 div
                var k = $('<div></div>').append(this.template( this.model.attributes )).children();
                // this.$el.html(this.template( this.model.attributes ));
                this.setElement( k[0] );
            }
        },

        // ==========================================================================
        // view events and handler
        // ==========================================================================

        /**
         * 
         */
        events:{

        },

        // ==========================================================================
        // model events and handler
        // ==========================================================================
        
        /**
         * 
         */
        modelEvents: {
            // "change model" : "render",
            // "destroy model" : "dispose"
        }


    });

    return HomeListingItemView;
});