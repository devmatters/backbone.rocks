/*

示範：如果想將 validators 都抽出來放在一個中央 class 裏，方便日後重覆使用

- validator func 有四種方法可指定

1. 使用我身上的 method 做驗証
2. 使用我身上有的物件內的 method 來驗証 → email: 'validatorManager validateDebug'
3. 直接指向外部物件的 method 做驗証 → lastName: 'directory.debug.voodoo validateDebug'
4. 直接給 function ref → phone: function( attrs, options ){console.log('phone validator');}

- Model 裏的宣告範例

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
}

*/
define( [], function(){

    // ValidatorManager 是 singleton，因此不用寫成 class，直接用 Obj 形式返即可
    return {

        // 每支 validate method 如果有錯，返還 Error，正確就不返還
        validateName: function( value, field, options ){
            // console.log( '外部物件  validateFirstName >value= ', value, field );
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
            
            // 新員工 id = null，會造成它下面新增的 direct report 拿到的 managerId 都是 null，等解決那個問題再處理這邊
            // 後來發現這個欄位不需要驗証
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
            if( value.length === 0 )
                return { field: field, msg: 'must select at least one employee'};
        },


    }
    
    
});