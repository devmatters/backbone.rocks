/**
 * 
 * 
 */
define( function(){
    
    return {
        
        langs: {},

        /**
         * 要想取得語系，永遠操作這支即可，如果語系不存在，它會自動載入
         * 因此不需要自已呼叫 loadLang()
         */
        getLang: function( lang ){
            var resp = $.Deferred();

            if( !this.langs[lang] ){
                this.loadLang( lang, resp );
            }else{
                resp.resolve( this.langs[lang] );
            }

            return resp.promise();
        },

        /**
         * internal
         *
         * 外界不應該直接呼叫這支來載入語系
         */
        loadLang: function( lang, resp ){
            
            var str = 'text!i18n/' + lang + '.json';
            
            // jxhack: 在 require() callback 裏無論如何無法取得原始傳入的變數了，只能偷藏
            require._tmp = {lang: lang, resp: resp, request: str, self: this };

            require( [str], 
                
                // success                
                function( result ){
                    var tmp = require._tmp;
                    // delete require._tmp;

                    // console.log( 'LangManager :: 載完: ', tmp.lang, tmp.request );

                    // 載入的結果是 string，將它轉成 json obj 後，按 lang key 存入 dictionary
                    // this.langs['en'] = {"hello" : "哈囉"}
                    tmp.self.langs[ tmp.lang ] = JSON.parse(result);

                    // 通知外界語系載完了
                    tmp.resp.resolve( tmp.self.langs[ tmp.lang ] );
                }, 

                // error
                function(err){
                    var tmp = require._tmp;
                    delete require._tmp;
                    console.log( '載入語系錯誤: ', tmp.lang, '\n', tmp.request );

                    // 通初外界出錯，並將相關參數送出去
                    tmp.resp.reject( err, tmp.lang, tmp.request );
                }
            )


        },

        /**
         * 列出所有已載入的語系
         */
        listLang: function(){
            return _.keys( this.langs );
        },
    }

});