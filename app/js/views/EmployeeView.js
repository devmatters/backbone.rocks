/**
 * 個別員工 detail 頁面
 * 
 * model = employeeModel instance 由外界傳入
 *
 * ReportCollection 雖是 circular 
 *
 * 頁面上半段的資料，例如頭像、姓名、職稱、電話等，都是由 EmployeeSummaryView 負責，
 * 頁面下半段的 direct reports 則由這個 view 負責
 */
define( ['text!tpl/EmployeeView.html' ], function( tpl ){

    var EmployeeView = Backbone.View.extend({

        CLASS_NAME: "EmployeeView",

        /**
         * 
         */
        initialize: function( options ){

            //[inject EmployeeSummaryView]
            this.EmployeeSummaryView = null;

            //[inject EmployeeListView]
            this.EmployeeListView = null;

            //[inject ReportCollection]
            this.ReportCollection = null;

            //[inject HomeListingItemView]
            this.HomeListingItemView = null;

            //[inject]
            this.EmployeeCollection = null;

            //[inject]
            this.appModel = null;
        }, 

        // 將 tpl 字串轉成 template function 並存起來
        template: _.template( tpl ),

        /**
         * 
         */
        render: function () {

            // console.log( '\nEmployeeView > render', arguments );

            var self = this;

            // 統一保存目前是否為 add 模式，一定要先保存才能跑 redraw()，因為它內部需這個值
            this.isAddingMode = this.model.id === null;

            // 改客戶端自建 uuid
            /*
            if( this.isAddingMode ){
                this.model.set('id', _.uniqueId('new_'));
            }
            */
            
            //
            this.redraw();

            // 儲存失敗時的提示框
            this.$alertEditFaild = this.$('#alertEditFaild').hide();
            // this.$alertEditFaild = this.$('#alertEditFaild').hide();

            // 這個 use case 裏，正好 EmployeeView 負責處理 direct reports 的編輯，因此它要偵聽 toggleEdit 事件
            // 然後正好 edit button 也位在這個 view 裏，因此看來有點怪，純巧合而已
            // this.on('toggleEdit', this.toggleEditHandler );

            //========================================================================
            //
            // edit button

            // 凡是只需要做一次的事務，就適合放在 render() 處理，不然放 redraw() 裏日後可能重覆跑，就掛上多次偵聽
            this.$btnEdit = this.$('#btnEdit');

            this.$btnEdit.on('click', function(evt){
                
                // console.log( '編輯鈕按: ', arguments );
                
                // 無奈的做法，按下鈕時，active class 還沒加上去，因此反而不能看 active 是否存在判斷，要正好相反
                var isEditing = !this.classList.contains('active');

                // 編輯模式改變
                if( isEditing ){
                    
                    // 進入編輯模式
                    
                    // 切換按鈕的文字與樣式
                    self.$btnEdit.val( self.poly.t('ui.btn_save') );
                    self.$btnEdit.addClass('btn-primary');

                }else{

                    // 退出編輯模式

                    // 這時才存檔，將資料真正傳回 server
                    var saveOk = ( self.model.save( {}, {validate:true} ) === undefined );
                    
                    if( saveOk ){

                        // 更新按鈕狀態    
                        self.$btnEdit.val( self.poly.t('ui.btn_edit') );
                        self.$btnEdit.removeClass('btn-primary');

                    }else{
                        
                        console.log( '儲存失敗' );

                        self.$alertEditFaild.show(200);

                        setTimeout( function(){self.$alertEditFaild.hide(500);}, 2000);

                        // 儲存時 validation 失敗，強迫再按下 button
                        self.$btnEdit.button('toggle');

                        // 重要：阻斷流程，不要再跑下去
                        return;       
                    }

                }

                // 新增資料完畢, 要退出 isAddingMode, 並且修改 location 值，原本是 /#employees/new, 現要改成 /#employees/13
                if( self.isAddingMode == true && isEditing == false ){
                    self.isAddingMode = false;
                    // 原本直接拿 self.model.id 但這樣太快，此時值只存入 model.attributes[] 中，還沒更新到 model.id
                    self.appModel.goto( '/employees/'+ self.model.get('id'), {trigger:false, replace: false} );
                }

                // 方法一：目前先採取：直接通知下屬 view，將來再改
                // self.summaryView.trigger('toggleEdit', isEditing );
                // self./*listView.*/trigger('toggleEdit', isEditing );

                // 方法二：劇情想定是 - 畫面上會用 MDI 同時開多個 EmployeeView 視窗，因此要分別記錄每個視窗的編輯狀態
                // 並且又不希望由 parent view 直接操作 child view 送 event，因此想出透過 appModel 設定的方式
                self.prefix = 'edit_';
                self.appModel.set( self.prefix + self.cid, isEditing );

            });

            // id = null 代表新增員工，要幫忙按下 edit button 進入 edit 模式
            if( this.isAddingMode ){

                // 代為觸發 click 事件，自動進入編輯模式
                this.$btnEdit.trigger('click');

                // 切換 button 狀態為按下
                this.$btnEdit.button('toggle');
            }

            //========================================================================
            //
            // remove button
            
            
            // delete button
            this.$btnRemove = this.$('#btnRemove');
            this.$btnRemove.on( 'click', $.proxy( removeEmployeeHandler, this) );

            function removeEmployeeHandler(evt){
                //this.appModel.goto('/employees/new', {trigger:true});
                // console.log( '確定要刪除員工: ', this.model.id );

                var self = this;

                // 建立並顯示 modal，也保存一份 ref
                if( !this.$modal ){
                    this.$modal = this.$('#myModal').modal({ backdrop: 'static' }); //要全灰背景，但不可點選取消 modal alert
                    this.$modal.on('click', function(evt){
                        
                        // bootstrap 的按鈕用 <a> 寫的，裏面有加 href="#"，導致每次按鈕就會跳回首頁，因此擋掉    
                        evt.preventDefault();
                        // console.log( '按鈕: ', evt.target );
                        
                        if( evt.target.id === "btnConfirm"){
                            // console.log( '確定刪除' );
                            self.model.destroy( {success: function(){
                                // 刪除成功就導向首頁
                                self.appModel.goto('/page/1', {trigger:true, replace:false});
                            }});
                        }else{
                            console.log( '取消刪除' );
                        }

                        self.$modal.modal('hide');
                    })
                }else{
                    this.$modal.modal('show');
                }

            }

            return this;
        },

        /**
         * 
         */
        redraw: function(){
            
            // console.log( '\t\tredraw() < EmployeeView ' );

            // 準備 i18n 字串
            var poly = this.appModel.polyglot;
            this.poly = poly;
            var o = {
                "direct_reports": poly.t('employee_view.direct_reports')
                , "has_no_direct_reports": poly.t('employee_view.has_no_direct_reports')
                , "info": poly.t('employee_view.info')

                , "title_remove": poly.t('ui.title_remove')
                , "msg_remove": poly.t('ui.msg_remove')
                , "label_delete": poly.t('ui.label_delete')
                , "label_cancel": poly.t('ui.label_cancel')
                
                , "btn_remove": poly.t('ui.btn_remove')
                , "btn_edit": poly.t('ui.btn_edit')
                , "btn_save": poly.t('ui.btn_save')
            };

            this.model.attributes._i18n = o;

            // 本身的 ui
            this.$el.html( this.template( this.model.attributes ) );

            var self = this;

            this.$('#alertEditFaild').hide();

            //========================================================================
            //
            // 頁面最上方 每個員工的 大頭照、職稱、四列 table ← 屬於 EmployeeSummaryView.js
            
            this.summaryView = new this.EmployeeSummaryView( {model:this.model} );
            this.summaryView.parentViewId = this.cid;   //jx: child view 要籍此 id 判斷自已的 parent id 是誰
            this.$('#details').html( this.summaryView.render().el );
            this.subViews.push( this.summaryView );



            //========================================================================
            //
            // 最下方的 Direct Reports 列表
            
            // 先取得鋪畫面需要的 collection，也就是 reports[]
            this.colReports = this.model.get('reports');

            // model 內一對多屬性還沒啟始完畢，要等；例外狀況是如果在 AppView.js 裏是等到 model.fetch() success 才跑，這裏就會已經有值
            if( !this.colReports ){
                
                    
                // 注意是用 once() 只聽一次
                this.model.once('change', function( model, options ){
                    // 一對多屬性 reports 啟始完畢，但此時 model.attributes.reports 還未跑過 fetch()，內容物會是空的
                    // console.log( '貨來了', model.attributes.reports );
                    self.laterRedraw();
                })
                
                // add 模式，因為 model 取回 null data，因此不會觸發 parse 來鋪滿 一對多 屬性，因此自已建
                if( this.isAddingMode ){
                    
                    // 這裏 set() 完就會觸發上面的 'change' 事件，
                    // 接著跑 laterRedraw() 然後就接回正常流程了
                    var collection = new this.ReportCollection();
                    collection.parentId = null; // 理論上應該要指定，但這裏是新增一筆資料，根本不會操作它，因此沒差
                    this.model.set('reports', collection );

                    // 預設顯示 "此人沒有直屬員工"
                    this.$('.no-reports').show();
                }

            }else{
                this.laterRedraw();
            }

        }, 


        /**
         * 這裏很精準的只更新 direct reports 下的 list 區域
         */
        laterRedraw: function(){
        
            // 由於 laterRedraw() 會跑很多次，但編輯後不會立即回存此人的下屬員工，因此如果每次執行 laterRedraw() 都 fetch()
            // 就會抓到空值，所以先檢查        
            if( !this.colReports ){
                this.colReports = this.model.get('reports');

                // 觸發 fetch()
                this.colReports.fetch();
                // console.log( 'LATER_REDRAW 跑: colReports = ', this.colReports );
            }

            // view.render() 每次重繪前，要記得先清掉舊東西
            if( this.listView )
                this.listView.dispose();

            // 這塊是重覆使用 EmployeeListView，之前在 serach box 裏也用過
            // 建立一個新的 List 元件，將 collection 傳入，讓 List 內部負責畫出來
            this.listView = new this.EmployeeListView( { collection: this.colReports, model: this.model } );
            
            // 
            // this.$('#reports').empty();
            this.$('#reports').append( this.listView.render().el);

            // 存一份到 subViews[] 裏，將來 dispose()才清的掉
            this.subViews.push( this.listView );
        },

        /**
         * 掛上 x-editable
         */
        enableEditables: function(){

            var self = this;
            
            var $response = new $.Deferred();

            /*
            // 理論上應該是不用重撈，而跟 appModel 拿先前建立過的 collection 即可
            // 但也有可能是直接進入此頁面，因此根本沒建過 collection，或當時那裏建的 paginated collection
            // 因此為了保險，還是自建
            if( this.appModel.has('collections', 'colEmployees') ){
                this.colEmployees = this.appModel.get('collections', 'colEmployees');
            }else{
                //
            }
            */
           
            // direct reports 編輯時，要能從所有 employees 中選取，因此要建立 collection 並 fetch
            this.colEmployees = new this.EmployeeCollection();

            this.colEmployees.fetch({

                data:{ name:'' },

                success: function(){
                    // console.log( 'managers 取回', arguments );
                    
                    // 要等到 collection 取回資料後再灌入，因此拉出來在這裏做

                    self.$reports = this.$('#reports').editable({
                        
                        // x-editable 吃的屬性
                        type:'select2'

                        , title: ''

                        // , validate: self.validForm   // 暫時不檢查，讓它可以是空值
                        
                        , url: self.saveFunct   //測試 url 給定 save function 會成功

                        // select2 特殊格式的 []
                        , source: self.convert( self.colEmployees )

                        // 重要：使用 select2 時，傳這個自定參數，讓 x-editable 不會幫忙改 html elem value
                        , skipSetValue: true
                        
                        // 其它要 pass down to select2 的參數
                        , select2: {
                           
                           multiple: true
                           
                           , placeholder: self.poly.t('ui.select_subordinate')
                           
                           // 設定 select2 的預選項目，更棒的是，將來開啟下拉選單時，它會自動過濾掉已選項目
                           , initSelection : function (element, callback) {

                                var arrValue = element.val().split(','); // 會拿到 "8,9" 字串，要拆解成 array [8,9]，這樣下面比對才正確
                                var arr = [];

                                // 從早先建立的 arrEmployess[] 裏找出符合的資料，塞入 array，做為 select2 的預選值
                                _.each(self.arrEmployees, function(item){
                                    if( arrValue.indexOf(item.id.toString()) > -1 )
                                        arr.push(item);
                                })
                                //
                                callback( arr );
                            }

                            , formatResult: self.format
                        }
                    });

                    // 套上編輯圖示(鉛筆)
                    self.$reports.addClass('editbox-base');    
                    
                    // 偵聽 shown, save 等事件
                    self.hook();

                    // toggleEditHandler() 會呼叫這支，並且等待它完事才繼續跑，因此當初是先返還一個 promise 物件，現在要終結它
                    $response.resolve();
                }
            });

            return $response.promise();
        },

        /**
         * 讓 direct reports 編輯畫面內 select2 下拉選單也會顯示頭像
         */
        format: function( obj, container ){
            // console.log( 'format: ', arguments );
            // return "<img src='pics/Julie_Taylor.jpg' width='32' height='32'/>&nbsp;&nbsp;<span>Julie Taylor</span>";
            var str = "<img src='pics/" + obj.text.replace(' ', '_') + ".jpg'" + " width='32' height='32'/>&nbsp;&nbsp;<span>" + obj.text + "</span>";
            return str;
        },


        /**
         * 測試：提供一支客製化 save function 給 x-editable 用
         */
        // saveFunct: function(){
        //     // console.log( '存檔: ', arguments );

        //     return false;
        // },

        /**
         * 
         */
        validForm: function( value ){
            // console.log( 'validate: ', value );

            // 目前只像徵性檢查一下是否為空值
            if( value == "" )
                return 'value can not be empty';
        },

        /**
         * 將 collection.models 轉換為 editable::select 能吃的 source[] 物件格式
         */
        convert: function( c ){
            
            var self = this;

            //故意放在 instance 身上，因為將來存檔時，還要查找一次
            this.arrEmployees = [];
            var str;

            _.each( c.models, function( model ) {
                str = model.get('firstName') + " " + model.get('lastName');
                // value 是放 model.id，將來方便查找選了哪個人
                // text 就是 label，給人看的
                self.arrEmployees.push({ id: model.get('id'), text: str });
            });

            // console.log( '選單長度 = ', this.arrEmployees.length );
            return this.arrEmployees;
        },

        /**
         * 由於 $reports 欄位要等 collection 取回資料才能建立，因此統一等待它取得資料後再一次處理所有 editable 欄位
         */
        hook: function(){
            
            var self = this;

            // jxhack: EmployeeView 一開始拿到 model 是 dummy，第二次有資料時會重繪，但也造成建了兩次 x-editable
            this.$reports.off('save shown');

            // 統一處理所有 x-editable 元件的 shown 事件
            this.$reports.on('shown', function( evt, popup ){
                
                // x-editable 與 bootstrap 都會廣播 shown，我只要 x-editable 的                
                if( arguments.length != 2 ) return;

                
                // 這裏要設定 select2 預選的項目，並且由於是設在 <input value=""> 裏，因此只能給 String
                // 我是組合一個 employeeId [] 傳進去
                var arr = [];
                _.each( self.colReports.models, function(item){
                    arr.push( item.id );
                })

                // console.log( '預選id= ', arr, arr.toString() );

                // ↓ 幹，好難終於找到如何設預設值，重點在要透過 x-editable 建立的 $input 元件去設
                // 這是多層元件包覆後的必然下場...
                self.$reports.data('editable').input.$input.val( arr );
                self.$reports.data('editable').input.$input.trigger("change");
                // self.$reports.data('editable').input.$input.trigger("change");

                self.clearErrors();

                // 修正 popover 偏移問題
                // setTimeout( function(){
                //     self.fixPopoverPosition( popup.$element );
                // });
            });

            // console.log( '掛偵聽 save' );


            
            // 統一處理 x-editable save event
            this.$reports.on('save', function( evt, obj ){

                // console.log('save > new value= ', obj.newValue, arguments);
                

                // obj.newValue = [8, 0, 2]，要找出這三個 obj
                var arrValue = obj.newValue; // 會拿到 [8,9] 這樣的值，這些是 employee.id
                var arr = [];

                var uid = self.model.get('id');
                var uname = self.model.get('firstName') + " " + self.model.get('lastName');

                // 從早先建立的 arrEmployess[] 裏找出符合的資料，做為存檔資料
                _.each( self.colEmployees.models, function( m ){
                    if( arrValue.indexOf( m.get('id').toString() ) > -1 ){
                        // 找到受影響的員工 model 了，修改他們身上的 manager 欄位值
                        // console.log( 'm.id = ', m.id, m.attributes.id );
                        // m.set( 'managerId', uid );
                        // m.set( 'managerName', uname );
                        // var ok = m.save();   // 每個 model 要個別儲存資料

                        arr.push( m );
                    }
                })

                // 整包替換掉 report collection 裏的值最省事    
                self.colReports.reset( arr );

                // console.log( 'direct reports 存完: ', obj.newValue );

                //========================================================================
                //
                // test: 改將 [8,9] 直接存在 model 裏，將來到 memorySTore 再存                
                self.model.set('_reports', obj.newValue );

                //self.model.save();

            });
        },


        // ==========================================================================
        // view events and handler
        // ==========================================================================

        events: {
           // "dblclick" : "foo"
        },
        

        // ==========================================================================
        // model events and handler
        // ==========================================================================

        /**
         * 
         */
        modelEvents: {
            // 這個 view 比較特殊，因為要用 x-editable 編輯，因此 model change 時不用重繪
            // update: 新規則：如果屬下皆為 sub-views，redraw() 一律交給 sub-view 內部處理
            // 除非這個 view 也有本身管理的頁面元素要更新，才精準針對該元素處理
            "change model" : "changeHandler"
            
            , "change appModel" : "toggleEditHandler"

            , "invalid model" : "invalidationHandler"
        }, 

        /**
         * errors 最重要，會說明哪些欄位錯
         */
        invalidationHandler: function( model, errors, options ){

            console.log( '\nview > invalidationHandler() ', arguments );

            var i, error, field, msg, len=errors.length, self = this;

            // 先還原所有欄位狀態
            this.clearErrors();

            // 每次先還原所有元件身上的 error style 狀態，下面再重新跑
            this.clearErrors();

            this.arrTips = [];
            
            var $elem;

            // loop errors 找出每個出錯欄位
            for(i=0;i<len;i++){
                error = errors[i];
                field = error.field;
                msg = error.msg;

                if( field !== 'reports' ) 
                    continue;

                $elem = this.$('#reports')
                
                // 1. 套上紅框，表示有錯誤
                $elem.addClass('jx-error');
                // 2. 加上 tooltip 顯示錯誤訊息
                $elem.tooltip({title:msg})
                // 3. 保存一份有 error tooltip 的物件，將來一併清掉
                self.arrTips.push( $elem );

                console.log( field, ' : ', msg );
            }
        },

        /**
         * helper
         */
        clearErrors: function(){
            if( this.arrTips ){
                var i, len = this.arrTips.length;
                for (i = 0; i < len; i++) {
                    this.arrTips[i].tooltip('destroy');
                    this.arrTips[i].removeClass('jx-error');
                };
            }
        },

        /**
         * 偵聽並檢查 appModel 裏是否有 view edit 狀態改變
         *
         * 這裏主要是在處理 x-editable 的功能，其它關於 button 本身狀態的切換，放在 render() 裏
         */
        toggleEditHandler: function( model, options ){
            
            // console.log( 'editState change: ', arguments );
            
            // 資料結構是： data[ 'view23' ] = true
            if( !model.changed.hasOwnProperty( this.prefix + this.cid ) )
                return;
            
            var self = this;
            this.isEditing = model.changed[ this.prefix + this.cid ];
            
            if( this.isEditing ){
                
                //在編輯狀態
                // console.log( '在編輯狀態' );
                
                var resp = this.enableEditables();

                resp.done( function(){
                    self.$reports.toggleClass('editbox', true );
                } )

            }else{
                
                // 退出編輯狀態
                // console.log( '非編輯狀態' );
                this.clearErrors();
                this.$reports.editable('destroy');
                this.$reports.toggleClass('editbox', false );
            }

        },



        /**
         * example code
         */
        changeHandler: function( m, options ){
            
            // console.log( '\n\t\tEmployeeView :: model.changeHandler:', options.redraw, " >isEditing: ", this.isEditing );

            // 由於這個 view 的 sub-views 內含 x-editable 可編輯頁面
            // 那裏每個欄位存檔時會觸發 model change 事件，而我不希望因此造成畫面重繪
            // 因此有偷藏 options.redraw 參數通知這裏不要重繪
            // 但因為一般情況下 options.redraw 不會存在，因此用 !options.redraw 來判斷
            if( this.preventRedraw(options) ) return;

            // console.log( '\t\tEmployeeView 真的有重繪喔 > ', options.redraw );
            // this.redraw();
            // this.render();
            this.laterRedraw();

        },



        // ==========================================================================
        // helpers
        // ==========================================================================

        
    });

    return EmployeeView;
});