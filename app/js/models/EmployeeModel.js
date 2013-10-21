/**
 * model
 *
 * 這是在 namespace 裏存放一個 class definition，將來要用 var a = new Employee() 建立 instance
 *
 * OneToMany{}

Prop: reports
Type: ReportCollection
Lazy: true

 */
define( [], function(){
    
    // [circular with Reportcollection]
    var EmployeeModel = Backbone.Model.extend({

        /**
         * 
         */
        CLASS_NAME: "EmployeeModel",

        // ==========================================================================
        // declaratives
        // ==========================================================================

        /**
         * Model 內包含的屬性一律在這列出來，方便 debug
         */
        defaults:{
            blog: "",
            cellPhone: "",
            city: "",
            department: "",
            email: "",
            firstName: "",
            id: null, //注意：原本寫 -999，後來一律改成 null, 因為 Model.isNew() 是判斷 id == null 
            lastName: "",
            managerId: -9999, //注意：不可改成 null，因為 EmployeeSummaryView.html 需要這個值
            managerName: "",
            officePhone: "",
            pic: "",
            title: "",
            twitterId: "",
            // reports: (function(){ var c = require('js/models/ReportCollection'); return new c(); })()
            reports: null   // ReportCollection[ EmployeeModel ]
        }, 
        
        /**
         * key: 一對多的 屬性名稱
         * value:
         *     type: 指定 Collection Class，注意是用 require() 路徑語法
         *     lazy: 此 collection 是否立即 fetch()，或將來要用時再取資料
         */
        oneToMany: {
            reports: {type: 'js/models/ReportCollection', lazy: true}
        },


        // ==========================================================================
        // initialize & overrides
        // ==========================================================================


        /**
         * 
         */
        initialize: function () {

            // [inject MemoryStore]
            this.memoryStore = null;


            // 範例：將外部共用的 validator 物件導入到自身的一個變數身上
            // [inject ExternalValidatorClass]
            // this.validatorManager = null;

        },

        /**
         * fetch() →　this.sync() →　Backbone.sync()
         *
         * 這裏直接在　this.sync() 這段覆寫了，改去操作　memoryStore，因此從來沒用到　Backbone.sync
         */
        sync: function(method, model, options) {
            
            // console.log( 'EmployeeModel > method = ', method );

            // jxtest: 偷放一份到 window 裏，方便 debug ← 記得刪掉
            // if( !window.memoryStore )
            //     window.memoryStore = this.memoryStore;
            

            var debug = true;

            /*
                如果是用 backbone 預設的 REST sync 操作流程
                這裏要判斷此 model 是否為孤兒(如果沒有 collection 即是孤兒)
                要獨立運行與 server 溝通
            */
            if( debug ){
                if( this.collection ){
                    // console.log( '有從屬 collection ' );
                }else{
                    // console.log( '獨立存取 server 位址= ', this.url );
                }

                // return;
            }
            

            // 在 chris 的例子中，它是完全沒用到 REST，因此例子不準
            if (method === "read") {

                //
                this.memoryStore.findById( parseInt(this.id), function (data) {
                    options.success(data);
                });
            }

            if( method === "update"){
                this.memoryStore.updateEmployee( model.attributes, function(data){
                    options.success(data);
                } );
            }
            
            if( method === "create"){
                this.memoryStore.addEmployee( model.attributes, function(data){
                    options.success(data);
                } );
            }
            if( method === "delete"){
                this.memoryStore.removeEmployee( model.attributes, function(data){
                    options.success(data);
                } );
            }


        }, 



        // ==========================================================================
        // validators and handlers
        // ==========================================================================
        
        // validator func 有四種方法可指定
        // 1. 使用我身上的 method 做驗証
        // 2. 使用我身上有的物件內的 method 來驗証 → email: 'validatorManager validateDebug'
        // 3. 直接指向外部物件的 method 做驗証 → xlastName: 'directory.debug.voodoo validateDebug'
        // 4. 直接給 function ref → xphone: function( attrs, options ){console.log('phone validator');}
        validators: {
            firstName: 'validateName',
            lastName: 'validateName',
            title: 'validateTitle',
            managerId: 'validateManager',
            officePhone: 'validatePhone',
            cellPhone: 'validatePhone',
            email: 'validateEmail',
            twitterId: 'validateTwitter',
            reports: 'validateReports'
        }, 


        // 每支 validate method 如果有錯，返還 Error，正確就不返還
        validateName: function( value, field, options ){
            // console.log( 'validateFirstName >value= ', value, field, options );
            if( value === '' )
                return {field: field, msg: 'can not be empty'};
        }, 

        //
        validateTitle: function( value, field, options ){
            // console.log( 'validateTitle >value= ', value, field );
            
            // 目前只先簡單檢查是否為空值
            if( value === '' )
                return {field: field, msg: 'can not be empty'}
        }, 

        //
        validateManager: function( value, field, options ){
            // console.log( 'validateTitle >value= ', value, field );
            
            // 注意: 新員工 id = null，會造成它下面新增的 direct report 拿到的 managerId 都是 null，等解決那個問題再處理這邊
            // update: 後來改成直屬員工 id 先不存入 db，等存新長官時再一併存，因此這裏不用跑 validateManager()
            // if( value.toString() === '-9999' )
            //     return {field: field, msg: 'must select a manager'}
        }, 

        validatePhone: function( value, field, options ){
            // console.log( 'validate Last Name >value= ', value, " >options: ", options );

            if( value === '' )
                return {field: field, msg: 'phone can not be empty'}
        },
        
        validateEmail: function( value, field, options ){
            // console.log( 'validate Last Name >value= ', value, " >options: ", options );

            if( value.indexOf('@') == -1 )
                return {field: field, msg: 'email format incorrect'}
        },

        validateTwitter: function( value, field, options ){
            // console.log( 'validate Last Name >value= ', value, " >options: ", options );

            if( value.indexOf('@') != 0 )
                return {field: field, msg: 'twitter handle must begin with @'}
        },

        validateReports: function( value, field, options ){
            // console.log( 'reports: ', value );
            
            // 實務上，一個人是可以 沒有任何直屬員工 的，因此這裏先關掉檢查
            // if( value.length === 0 )
            //     return { field: field, msg: 'must select at least one employee'};
        },

    });
    
    return EmployeeModel;
    
});