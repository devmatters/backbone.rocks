/**
 * collection
 *
 * 它是從 shell.js 呼叫這支，並且在 constructor 裏傳了 options{}，內容為 {reset: true, data: {name: key}}
 */
define( [/*'js/models/EmployeeModel'*/], function( /*EmployeeModel*/ ){
    
    var EmployeeCollection = Backbone.Collection.extend({

        CLASS_NAME: "EmployeeCollection",

        /**
         * 
         * 指定此 collection 內容物的 class type 為 Employee
         * 由於 injector 是認 'model' 字串做 mapping，但每個 Collection 裏都有 model 這屬性，因此無法用注射
         * 只好乖乖用 require 載入 Class definition，這是目前唯一無法注射的情況
         *
         * update: 原本以為只能透過 define([]) 時傳入 model，後來學會 require() 這招，再搭配 __proto__ 就解決 circular reference 了
         */
        // model: EmployeeModel

        /**
         * 
         */
        initialize: function(options){
            // console.log( 'initi' );

            this.memoryStore = null;

            // 為了解決 circular reference 採取的手段
            var Clazz = require('js/models/EmployeeModel');
            this.__proto__.model = Clazz;

        },

        /**
         * 
         */
        sync: function(method, model, options) {
            if (method === "read") {

                // 這裏的 directory.store 就是在操作他自已寫的 MemoryStore 物件
                // 應該所有 CRUD 都會轉手交給它處理
                this.memoryStore.findByName( options.data, function (data) {
                    options.success(data);
                    // console.log( '取得資料: ', data );
                });
            }

            
        }

    });

    return EmployeeCollection;
    
});