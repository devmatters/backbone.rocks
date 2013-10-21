/**
 * one-to-many collection
 *
 * 其直屬於 EmployeeModdel.reports, 僅存放該 Employee 身上的 reports 資料
 *
 * 有一 parentID 指回 EmployeeModel.id
 *
 */
define( [], function(){

    //[circular with EmployeeModel] 
    // ← 凡是有標 circular 的，代表無法用 define(['className']) 這種方式直接取用，要用 require('className') 來取得
    // 重要：並且這支 class 一定要在 AppContext.js 裏透過 define([])載入，不然會根本不存在於程式中
    var ReportCollection = Backbone.Collection.extend({

        CLASS_NAME: "ReportCollection",

        // 注意：無法用注射的，因為 key 是 'model' 字串，太通用了
        // update: 並且因為有 circular 問題，因此無法用 define[] 宣告，只能用 require()來取得
        // model: require('js/models/EmployeeModel'),
        // update 2: 但因為有時這支 class 會太早被呼叫，這時下面 require() 也沒法發功，為了安全起見，還是用 __proto__ 這招 ← final decision

        initialize: function(options){

            // [inject MemoryStore]
            this.memoryStore = null;

            // console.log( 'model 有了嗎？', MyApp.circulars );

            // 這句可以將 prototype.model 的值設回正確 class
            var Clazz = require('js/models/EmployeeModel');
            this.__proto__.model = Clazz;

        },

        sync: function(method, model, options) {
            // console.log( 'sync 有了嗎？', this.model );
            if (method === "read") {
                this.memoryStore.findByManager( this.parentID, function (data) {
                    options.success(data);
                });
            }
        }

    });

    return ReportCollection;
        
});