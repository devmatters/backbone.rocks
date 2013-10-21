/**
 * 大頭照 + 五列 table 條列區，通常位於頁面最上方，或左方
 */
define( ['text!tpl/EmployeeSummaryView.html'], function( tpl ){
    
    var EmployeeSummaryView = Backbone.View.extend({

        /**
         * 
         */
        initialize:function () {
            // [inject]
            this.EmployeeCollection = null;

            // [inject]
            this.appModel = null;

            // [inject]
            this.appController = null;
        },

        // 將 tpl 字串轉成 template function 並存起來
        template: _.template( tpl ),

        /**
         * 
         */
        render:function () {
            
            var self = this;

            // 示範：通過 controller 撈回所有 managers collection
            // 這裏的重點在示範了使用 promise/deferred 手法來非同步操作
            /*
            var resp = this.appController.getManagers(["2"]);
            resp.done( function(){
                console.log( 'done = ', arguments );
            });
            */
            
            // view 初始化鋪 ui 的工作，一律委由 redraw() 進行
            this.redraw();

            
            // 說明：這是最早期採用的手法，後來改成通過 appModel.set() 通知
            // 上層 EmployeeView 目前是直接通知這裏切換 edit mode ← 要想有無其它更好手法，例如 AppModel
            // this.on('toggleEdit', this.toggleEditHandler );

            return this;
        },

        /**
         * view 第一輪啟動時，一定會呼叫 view.render()
         * 但那時傳入的 model 可能是 dummy 空值，之後資料更新時，會觸發 change event，
         * 這時就由 redraw() 處理，也因為會重覆呼叫，因此抽出來獨立一支
         *
         * TODO: 下面應該依 model 有變動的欄位，細緻的設定畫面上個別 elem 值
         * 例如 model.username 改變，就只改 $('#username').val( newVal )
         * 目前是先暫時一律重鋪整個 template，而未針對單一欄位做更新
         * update: 暫時就全部重繪，不個別更新
         */
        redraw: function(){

            // console.log( '\t\tredraw()' );

            // 準備 i18n 字串
            var poly = this.appModel.polyglot;
            
            // 在 vo 身上多塞一個屬性，放語系字串
            this.model.attributes._i18n = {
                "manager": poly.t('common.manager')
                , "office_phone": poly.t('common.office_phone')
                , "cell_phone": poly.t('common.cell_phone')
                , "twitter": poly.t('common.twitter')
                , "email": poly.t('common.email')
            };

            // 這裏算是有初步清掉之前建的 elem，但它們相應的 mediator code 就沒清
            this.$el.empty();

            // 繪製本身的 ui
            this.$el.html(this.template( this.model.attributes ));

        },

        // ==========================================================================
        // internal API
        // ==========================================================================

        /**
         * 開始處理可編輯欄位
         */
        enableEditables: function(){
             
            var self = this;

            var $response = new $.Deferred();

            // 啟動 x-editable，預設使用 popup
            $.fn.editable.defaults.mode = 'popup';
            // $.fn.editable.defaults.showbuttons = false;


            // manager 一欄要取回所有主管名單
            var managers = new this.EmployeeCollection();

            // console.log( '\nmanager.fetch() 跑' );
            managers.fetch({
                
                //找出 managerId 是 0 或 1 的員工，這些人就是最高階主管，我設計成可傳 2 個 managerId 一次查找
                //並且為了避開 julie 的 manager 也是 julie，因此加了 notInclude 功能，排除掉自已
                //注意 data: 裏傳的參數一律用 String 格式，不然很容易因為給入 Number 而比對失敗
                data:{managerId: ['0', '1'], notInclude:[ this.model.id ? this.model.id.toString() : -9999 ] },  
                
                success: function(){
                    // console.log( 'managers 取回', arguments );
                    
                    // managerName 欄位要等到 collection 取回資料後再灌入，它是唯一拉出來在這裏做的欄位
                    self.$managerName = self.$('#managerName').editable( {type:'select', source:self.convert(managers), title: '', validate:self.validForm } );
                    self.$managerName.data('key', 'managerName');

                    // console.log( 'not include: ', self.model.id, managers.length, managers );
                    //
                    self.hook();

                    $response.resolve();
                }
            });


            // 在所有可編輯欄位上啟動 x-editable
            // title 是 bootstrap 吃的屬性，寫在 html 裏要用 data-original-title
            this.$headShot = this.$('#headShot').data('key', 'headShot');
            this.$employeeName = this.$('#employeeName').editable( {type:'text', title: '', validate:this.validForm } ).data('key', 'employeeName');
            this.$title = this.$('#title').editable( {type:'text', title: '', validate:this.validForm} ).data('key', 'title');
            this.$officePhone = this.$('#officePhone').editable( {type:'text', title: '', validate:this.validForm} ).data('key', 'officePhone');
            this.$cellPhone = this.$('#cellPhone').editable( {type:'text', title: '', validate:this.validForm} ).data('key', 'cellPhone');
            this.$email = this.$('#email').editable( {type:'text', title: '', validate:this.validForm} ).data('key', 'email');
            this.$twitter = this.$('#twitterId').editable( {type:'text', title: '', validate:this.validForm} ).data('key', 'title').data('key', 'twitterId');

            
            return $response.promise();
        },

        /**
         * 
         */
        enableImageEdit: function(){
            
            var self = this;

            this.$headShot = this.$('#headShot');
            this.$headShotInput = this.$('#headShotInput');
            this.$progressBar = this.$('#progressBar');

            //
            this.$headShot.addClass('editfield-base imgfield');

            // 點圖片即開啟 file browser 選新圖片
            this.$headShot.on('click', function(){
                // 觸發 input 開啟 file browse window
                self.$headShotInput.trigger('click');
            });

            // 用戶完成選取一張圖片
            this.$headShotInput.on('change', function(){
                
                // console.log( 'change: ', this.files[0] );
                

                // 顯示上傳進度列
                self.$progressBar.show();
                
                // 模擬假的上傳進度    
                self.$progressBar.find('div').animate(

                    {width: 120 }

                    ,{
                    duration: 1000

                    , complete: function(){
                        // console.log( 'progress bar 跑完', self.$progressBar.find('div').css('width') );
                        
                        // 上傳完等 1 秒再關掉 progressBar, 讓用戶有機會看到結果
                        setTimeout(function(){
                            //
                            self.$progressBar.find('div').css('width', 0);
                            self.$progressBar.hide();

                            // 再將新選取圖片先顯示出來
                            var file = self.$headShotInput[0].files[0];
                            var fileReader = new FileReader();
                            fileReader.onload = function(){
                                self.$headShot.find('img').attr("src", this.result );
                            }
                            fileReader.readAsDataURL( file );


                        }, 1000);
                    } 

                });
            });
        },

        /**
         * 退出編輯模式 - 圖片欄位
         */
        cancleImageEdit: function(){
            this.$headShot.removeClass('editfield-base imgfield');
            this.$headShot.off('click');
            this.$headShotInput.off('change');
        }, 

        /**
         * 注意：這是 x-editable 用的 validation，跟 backbone.Model 的 validator 無關
         * 
         * x-editable 內容改變時，立即做 validate 檢查值，有錯的話 popover 會重新開啟
         *
         * TODO: 這裏可以寫的更寫，例如每個 edtiable instance 有獨立的 validate method，
         * 例如：這樣才知道編輯的欄位是 email，也才知道要調用 emailValidator
         *
         * 這個例子中我就不繼續寫下去了
         */
        validForm: function( value ){
            // console.log( 'validate: ', value );

            // 目前只像徵性檢查一下是否為空值
            if( value == "" )
                return 'value can not be empty';
        },

        /**
         * 由於 managerName 欄位要等 collection 取回資料才能建立，因此統一等待它取得資料後再一次處理所有 editable 欄位
         */
        hook: function(){
            
            var self = this;

            // 將所有套用 editable 功能的 elem 蒐集起來，方便日後統一操作
            this.$arrEditables = this.$('.editable');

            // 處於編輯狀態時，每個欄位後方顯示鉛筆圖示，並且鼠標變手指
            this.$arrEditables.addClass('editfield-base');

            // 由於 view 可能會多次 redraw()，因此要先解掉之前掛的偵聽
            this.$arrEditables.off('shown save');

            // console.log( '\thook 掛' );

            // 統一處理所有 x-editable 元件的 shown 事件
            this.$arrEditables.on('shown', function( evt, popup ){
                
                // x-editable 與 bootstrap 都會廣播 shown，我只要 x-editable 的                
                if( arguments.length != 2 ) return;

                //
                setTimeout( function(){
                    self.fixPopoverPosition( popup.$element );
                });

                // 先前某些欄位可能因為 validation 錯誤而標上了 error tooltip，
                // 現在要開啟 x-editable 重新改值了，因此就將 tooltip 都拿掉
                // 反正下次存檔時會重新再檢查一次
                self.clearErrors();
                // if( self.arrTips ){
                //     for (var i = 0; i < self.arrTips.length; i++) {
                //         self.arrTips[i].tooltip('destroy');
                //         self.arrTips[i].removeClass('jx-error');
                //     };
                // }
            });


            // 統一處理 x-editable save event
            this.$arrEditables.on('save', function( evt, obj ){

                // console.log('save > new value= ', obj.newValue, $(evt.target).data('key') );
                
                var key = $(evt.target).data('key');
                var opt = { redraw: false };    //告訴 view 不要聽到 model change 事件而重繪畫面

                switch( key ){
                    
                    // 需要特殊處理才能儲存的欄位先列出來，其它的會統一在 default 段處理
                    case "employeeName":
                        var name = obj.newValue.split(' '); // Julie Taylor 拆兩段
                        self.model.set('firstName', name.shift(), opt );
                        self.model.set('lastName', name.join(' '), opt );   //這是預防 John Paul Jones 這種三個字的姓，第一字之後的全併為 lastName
                        break;

                    case "managerName":
                        // 這邊要同時存 managerName 與 managerId，因此要特別處理
                        
                        // 之前在鋪 x-editable 時就生成過一個 arr 內含所有 manager id+name，直接從那裏找比較快
                        var manager = _.find( self.arrManagers, function( item ){
                            // select 傳回的是 employee.id，因此是比對 id
                            return item.value == obj.newValue;
                        });

                        //
                        // self.model.set('managerId', manager.value, opt );
                        // self.model.set('managerName', manager.text, opt );
                        // console.log( '存 managerName' );
                        self.model.set({'managerId': manager.value, 'managerName': manager.text}, opt );
                        break;

                    default:
                        
                        // 檢查 key 是否存在
                        if( self.model.has(key) == false ){
                            console.info( 'x-editable > key not found: ', key, self.model );
                            return;
                        }

                        // console.log( '\n\t儲存屬性: ', key, " = ", obj.newValue );
                        self.model.set( key, obj.newValue, opt );
                        

                }

            });

        },

        /**
         * 將 collection.models 轉換為 editable::select 能吃的物件格式
         */
        convert: function( c ){
            
            // console.log( 'convert > ', c.models );

            var self = this;

            //故意放在 instance 身上，因為將來存檔時，還要查找一次
            this.arrManagers = [];
            var str;

            _.each( c.models, function( model ) {
                str = model.get('firstName') + " " + model.get('lastName');
                // value 是放 model.id，將來方便查找選了哪個人
                // text 就是 label，給人看的
                self.arrManagers.push({ value: model.get('id'), text: str });
            });

            // console.log( 'arr = ', arr );
            return this.arrManagers;
        },

        /**
         * 修正 popover 位置，不要超出視窗左邊而被切掉
         * 也修正 popover arrow 位置指向 target
         */
        fixPopoverPosition: function( $element ){

            var $popover = $element.data('popover').$tip;
            var left = $popover.position().left;
            var fixedLeft = Math.max(6, left );
            
            // 注意 arrow 位置修正，只有當 panel 本身會超出視窗時才需要    
            if( fixedLeft !== left ){
                $popover.css('left', fixedLeft );
                
                // 取得文字 label 的中間位置    
                var rect = $element[0].getBoundingClientRect();
                var targetPos = rect.left + rect.width/2;

                // 找到 arrow 元件
                var $arrow = $popover.find('.arrow');

                // 取得 popover 面板本身寬度
                var popoverWidth = $arrow.parent().get(0).getBoundingClientRect().width;
                
                //移動 arrow 位置到 label 中央
                $arrow.css('left', Math.min( targetPos, popoverWidth*0.9 ) );
            }

            // console.log( '顯示 tooltip', targetPos );
        }, 
        

        // ==========================================================================
        // view events and handler
        // ==========================================================================
        
        /**
         * 第一頁主畫面只有一個 show me 按鈕會被操作，這裏就偵聽這個 view event
         */
        events:{
            // "toggleEdit" :        "toggleEditHandler"
        },

        

        // ==========================================================================
        // model events and handler
        // ==========================================================================
        
        // 用宣告的方式，偵聽 model 內事件
        modelEvents: {
            
            "change appModel" : "toggleEditHandler",

            "reset model" : "resetHandler",
            "change model" : "changeHandler",
            "remove model" : "removeHandler",
            "merge model" : "mergeHandler",
            "add model" : "addHandler", 

            "invalid model" : "invalidationHandler"
        },

        /**
         * errors 最重要，會說明哪些欄位錯
         */
        invalidationHandler: function( model, errors, options ){

            // console.log( '\nview > invalidationHandler() ', arguments );

            var i, error, field, msg, len=errors.length, self = this;



            // 每次先還原所有元件身上的 error style 狀態，下面再重新跑
            this.clearErrors();

            this.arrTips = [];
            
            var $elem;

            // loop errors 找出每個出錯欄位
            for(i=0;i<len;i++){
                error = errors[i];
                field = error.field;
                msg = error.msg;
                
                if( field == 'managerId')
                    field = 'managerName';
                else if( field == 'firstName' || field == 'lastName' )
                    field = 'employeeName'
                
                this.$arrEditables.each( function(index, elem){

                    $elem = $(elem);
                    
                    if( $elem.data('key') == field ){
                        // console.log( '找到: ', $elem );

                        // 1. 套上紅框，表示有錯誤
                        $elem.addClass('jx-error');
                        // 2. 加上 tooltip 顯示錯誤訊息
                        $elem.tooltip({title:msg})
                        // 3. 保存一份有 error tooltip 的物件，將來一併清掉
                        self.arrTips.push( $elem );

                    }
                } )

                console.log( field, ' : ', msg );
            }
        },

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
         * 切換頁面是否為編輯模式
         */
        toggleEditHandler: function( model, options ){
            
            // console.log( 'EmployeeSummaryView > toggleEditHandler = ', this.isEditing );
            
            var parentId = 'edit_' + this.parentViewId;

            // 資料結構是： data[ 'view23' ] = true
            if( !model.changed.hasOwnProperty( parentId ) )
                return;
            
            var self = this;
            this.isEditing = model.changed[ parentId ];


            if( this.isEditing ){

                //進入編輯模式

                var resp = this.enableEditables()

                resp.done( function(){
                    self.$arrEditables.toggleClass('editfield', true );
                    self.enableImageEdit();
                } )
                
            }else{
                
                // 退出編輯模式
                
                // 畫面上可能有元素還標示為 error，此時要全清掉
                this.clearErrors();

                this.$arrEditables.editable('destroy');
                this.$arrEditables.toggleClass('editfield', false );
                this.cancleImageEdit();
            }

        }, 

        resetHandler: function(){
            // console.log( '\treset < summaryView: ', arguments );
            this.redraw();
        },
        
        /**
         * view 內部如果有可編輯欄位，要擋掉因為編輯 > 存檔而造成的 change event
         * 不然畫面會重繪多次
         */
        changeHandler: function( model, options ){
            
            // console.log( '\tchange < summaryView: ', arguments );
            
            if( this.preventRedraw(options) || this.isEditing == true )
                return;
            
            // console.log( '\tsummary change -- 真的重繪 ', arguments );

            // this.render();
            this.redraw();
        },

        removeHandler: function(){
            console.log( 'summary remove: ', arguments );
        },
        mergeHandler: function(){
            console.log( 'summary merge: ', arguments );
        },
        addHandler: function( model, collection, options ){
            console.log( 'summary add: ', arguments );
        },


    });

    return EmployeeSummaryView;

});