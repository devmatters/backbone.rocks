/**
 * DI/IOC context: 將來可以依不同情境抽換不同 context 即可注入不同 class 
 *
 * toValue(): return raw javascript type
 *   - Class definition: 使用時要 var c = new Class() 自建 instance
 *   - Static Class: 例如 Class.foo()
 *   - raw value: 例如 {...}, [...], String, int
 *   
 * toType(): new instance(), add .asSingleton() to make it one and only one
 * 這個應該很少有機會用到，通常如果會讓 injector 幫建 instance，也非常可能會搭配 asSingleton() 變成 single, 
 * 例如 appRouter, appController 等。總之如果真用到，要仔細思考用途是否正確。
 * 
 */
define( 

  //
  [ 'medic-injector-sync'
  , 'backbone'
  , 'js/views/TitleBarView'
  , 'js/routers/AppRouter'
  , 'js/models/EmployeeCollection'
  , 'js/views/AppView'
  , 'js/views/EmployeeListView'
  , 'js/views/EmployeeListItemView'
  , 'js/models/MemoryStore'
  , 'js/models/AppModel'
  , 'js/views/HomeView'
  , 'js/views/ContactView'
  , 'js/views/EmployeeView'
  , 'js/views/EmployeeSummaryView'
  , 'js/models/ReportCollection'
  , 'js/models/EmployeeModel'
  , 'js/views/HomeListingItemView'
  , 'js/views/HomeListingView'
  , 'js/models/PaginatedEmployeeCollection'
  , 'js/validators/ValidatorMananger'
  , 'js/controllers/AppController'
  , 'js/utils/LangManager'

  ], 

  //
  function( Injector
    , Backbone
    , TitleBarView
    , AppRouter
    , EmployeeCollection
    , AppView
    , EmployeeListView
    , EmployeeListItemView
    , MemoryStore
    , AppModel
    , HomeView
    , ContactView
    , EmployeeView
    , EmployeeSummaryView
    , ReportCollection
    , EmployeeModel
    , HomeListingItemView
    , HomeListingView
    , PaginatedEmployeeCollection
    , ValidatorManager
    , AppController
    , LangManager 
  ){

    var injector = new Injector();

    // console.log( 'injector 建好' );

    //注意: 將 injector 放到全域變數中，因為太常用了，不然就要每次都 require('js/AppContext')
    window.injector = injector;

    injector.addMapping('appRouter').toType( AppRouter ).asSingleton();

    injector.addMapping('TitleBarView').toValue( TitleBarView );

    injector.addMapping('EmployeeCollection').toValue( EmployeeCollection );

    injector.addMapping('appView').toType( AppView ).asSingleton();

    injector.addMapping('EmployeeListView').toValue( EmployeeListView );

    injector.addMapping('EmployeeListItemView').toValue( EmployeeListItemView );  //返還 class definition，不是 instance

    injector.addMapping('memoryStore').toType( MemoryStore ).asSingleton();

    injector.addMapping('EmployeeModel').toValue( EmployeeModel );

    injector.addMapping('appModel').toType( AppModel ).asSingleton();

    injector.addMapping('HomeView').toValue( HomeView );

    injector.addMapping('ContactView').toValue( ContactView );

    injector.addMapping('EmployeeView').toValue( EmployeeView );

    injector.addMapping('EmployeeSummaryView').toValue( EmployeeSummaryView );

    injector.addMapping('ReportCollection').toValue( ReportCollection );  //Class

    injector.addMapping('HomeListingItemView').toValue( HomeListingItemView );  //Class definition
    
    injector.addMapping('HomeListingView').toValue( HomeListingView );  //Class definition
    
    injector.addMapping('PaginatedEmployeeCollection').toValue( PaginatedEmployeeCollection );  //Class definition
    
    injector.addMapping('validatorManager').toValue( ValidatorManager );  //ValidatorManager.js 內容就是寫成一個 singleton obj 直接返還，因此用 toValue()
    
    injector.addMapping('appController').toType( AppController ).asSingleton();  //singleton
    
    injector.addMapping('LangManager').toValue( LangManager ); //static class
    

    // 實驗：backbone.View 建立時，順便傳 model, collection 與其它資料進去，但 instance 建立後再傳也可以
    // 因為我不喜歡在 config 裏寫太多程式 logic，它應該就是單純 mapping 並建 instance 即可
    /*
    injector.addMapping('shellView').toProvider( function(){
      var v = new ShellView({ 
        model:{foo:'bar'}, 
        coo:"doo", 
        collection: { zoo:'loo'}
      });
      return v;
    });
    */
   
    // toModule() 一律回傳原始 require module return 的值，例如 class def, 無法再建 instance
    // injector.addMapping('logger').toModule( 'js/AClass' );

    

    return injector;

});

