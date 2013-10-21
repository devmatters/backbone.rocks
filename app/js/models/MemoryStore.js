/**
 * 這是一支 class，將來要用時，要用 var a = new MemoryStore() 來建立 instance
 * 他自已寫的 storage adaptor
 *
 * 注意：把這支 class 內的功能，都視為 server code，將來可用 node or rails 取代，
 * 反正要存的資料，就會透過 REST API 以 json 格式後送到這裏，這邊處理完，也是反還 json 物件給 "前端"
 */
define( function(){

    var MemoryStore = function (successCallback, errorCallback) {

        // 例如 db 裏有 30 人，它要找出姓名中有 J 的，做法就是 30 筆都 loop 一次，一筆筆比對...
        // 一般如果是連回 server 查，就是把查詢條件，例如 name:j 傳回 server
        this.findByName = function ( queryObj, callback) {
            // update: queryObj 傳入一個物件，格式為 {name:'j'} 或 {managerId: 0}
            var employees, searchKey, notKey, id;
            
            if( queryObj.hasOwnProperty('name') ){
                searchKey = queryObj.name;
                employees = this.employees.filter( function (element) {
                    var fullName = element.firstName + " " + element.lastName;
                    return fullName.toLowerCase().indexOf(searchKey.toLowerCase()) > -1;
                });
                
            }else if( queryObj.hasOwnProperty('managerId') ){
                
                searchKey = queryObj.managerId;     //注意：一定是個 array
                notKey = queryObj.notInclude;       //後來還加了更細緻的 not 排除檢索 ← 但這些都該在 server 做

                // 找出所有符合的資料
                employees = this.employees.filter( function (element) {
                    // console.log( 'elem: ', element.managerId, element.id );
                    
                    var match = 
                        (searchKey.indexOf( element['managerId'].toString() ) > -1   
                        &&
                        notKey.indexOf( element['id'].toString() ) == -1);  //jxupdate: 一律改用 toString() 會否有事？
                    
                    // console.log( '\tmatch = ', match );
                    return match;
                });
            }

            // toString() 是因為 element 裏放的是 int, 但 searchKey 傳來的是 string
            // searchKey.indexOf( element['managerId'].toString() ) > -1   
            callLater(callback, employees, 'findByName');
        }

        // original
        // this.findByName = function (searchKey, callback) {
        //     //{data: {name:'j'}, {managerId: 0} }
        //     var employees = this.employees.filter( function (element) {
        //         var fullName = element.firstName + " " + element.lastName;
        //         return fullName.toLowerCase().indexOf(searchKey.toLowerCase()) > -1;
        //     });
        //     callLater(callback, employees);
        // }

        this.findByManager = function (managerId, callback) {
            var employees = this.employees.filter(function (element) {
                return managerId === element.managerId;
            });
            callLater(callback, employees, 'findByManager');
        }

        this.findById = function (id, callback) {
            var employees = this.employees;
            var employee = null;
            var l = employees.length;
            for (var i = 0; i < l; i++) {
                if (employees[i].id === id) {
                    employee = employees[i];
                    break;
                }
            }
            callLater(callback, employee, 'findById' );
        }

        // Used to simulate async calls. This is done to provide a consistent interface with stores that use async data access APIs
        var callLater = function (callback, data, from) {
            
            // jxtest
            // if (callback) {
            //     console.log( '\tcallLater - ', from );
            //     callback(data);
            // }
            
            // 原版 backup
            if (callback) {
                setTimeout(function () {
                    // console.log( '\tcallLater - ', from );
                    callback(data);
                });
            }
        }

        //========================================================================
        //
        // jxadded: 幫忙新增 create, update 與 delete 操作

        /**
         * 更新
         */
        this.updateEmployee = function( employee, callback ){
            
            var i, item;
            for( i=0; i<this.employees.length; i++){
                item = this.employees[i];

                if( item.id === employee.id ){
                    this.employees[i] = employee;
                    break;
                }
            }

            // 更新屬下
            this.updateDirectReports(employee);
            

            callLater( callback, employee, 'updateEmployee' );
        }

        /**
         * 新增
         */
        this.addEmployee = function( employee, callback ){
            
            if( this.employees.indexOf( employee ) !== -1 ){
                console.log( 'employee: ', employee.id, employee.firstName, ' already exists' );
                return;
            }

            // 為新物件指派一個 id，這原本該在 server 上做完
            // update: 後來發現在 client 端就必需要有 id，因此改自建 uuid
            /*
            */
            var lastId = this.employees.slice(-1)[0].id;
            employee.id = lastId+1;
            console.log( '新物件 id = ', employee.id );

            this.updateDirectReports(employee);

            // 塞入 "db" 中
            this.employees.push(employee);

            // 
            callLater( callback, employee, 'addEmployee' );
        }

        /**
         * helper: 幫忙儲存一個人的下屬
         */
        this.updateDirectReports = function( employee ){
            
            if( !employee._reports ) return;
                        
            // 處理此人的 direct report 屬下
            // view 存檔時，是將新人的屬下 id 都暫存入 model.attributes._reports[]，這裏撈出來處理每個屬下
            var i, emp, len = this.employees.length, arr = employee._reports;
            
            for(i=0;i<len;i++){
                emp = this.employees[i];
                if( arr.indexOf( emp.id.toString() ) !== -1 ){
                    emp.managerId = employee.id;
                    emp.managerName = employee.firstName + ' ' + employee.lastName;
                }
            }

            // 用完就刪掉暫存檔，將來會反應回 model 內，也刪掉裏面的 _reports 屬性
            delete employee._reports;

        }

        /**
         * 刪除
         */
        this.removeEmployee = function( employee, callback ){
            
            var i, emp, found = false, len = this.employees.length; 
            // idx = this.employees.indexOf( employee );
            
            for(i=0; i<len; i++){
                emp = this.employees[i];
                if( emp.id == employee.id ){
                    this.employees.splice( i, 1 );
                    found = true;
                    break;
                }
            }

            if( found == false ){
                console.log( 'Can not find employee: ', employee.id, employee.firstName );
                return;
            }

            
            callLater( callback, employee, 'removeEmployee' );
        }



        //========================================================================
        //
        //mock data

        this.employees = [
            {"id": 1, "firstName": "James", "lastName": "King", "managerId": 0, managerName: "", "title": "President and CEO", "department": "Corporate", "cellPhone": "617-000-0001", "officePhone": "781-000-0001", "email": "jking@fakemail.com", "city": "Boston, MA", "pic": "james_king.jpg", "twitterId": "@fakejking", "blog": "http://coenraets.org", "reports": null},
            {"id": 2, "firstName": "Julie", "lastName": "Taylor", "managerId": 1, managerName: "James King", "title": "VP of Marketing", "department": "Marketing", "cellPhone": "617-000-0002", "officePhone": "781-000-0002", "email": "jtaylor@fakemail.com", "city": "Boston, MA", "pic": "julie_taylor.jpg", "twitterId": "@fakejtaylor", "blog": "http://coenraets.org", "reports": null},
            {"id": 3, "firstName": "Eugene", "lastName": "Lee", "managerId": 1, managerName: "James King", "title": "CFO", "department": "Accounting", "cellPhone": "617-000-0003", "officePhone": "781-000-0003", "email": "elee@fakemail.com", "city": "Boston, MA", "pic": "eugene_lee.jpg", "twitterId": "@fakeelee", "blog": "http://coenraets.org", "reports": null},
            {"id": 4, "firstName": "John", "lastName": "Williams", "managerId": 1, managerName: "James King", "title": "VP of Engineering", "department": "Engineering", "cellPhone": "617-000-0004", "officePhone": "781-000-0004", "email": "jwilliams@fakemail.com", "city": "Boston, MA", "pic": "john_williams.jpg", "twitterId": "@fakejwilliams", "blog": "http://coenraets.org", "reports": null},
            {"id": 5, "firstName": "Ray", "lastName": "Moore", "managerId": 1, managerName: "James King", "title": "VP of Sales", "department": "Sales", "cellPhone": "617-000-0005", "officePhone": "781-000-0005", "email": "rmoore@fakemail.com", "city": "Boston, MA", "pic": "ray_moore.jpg", "twitterId": "@fakermoore", "blog": "http://coenraets.org", "reports": null},
            {"id": 6, "firstName": "Paul", "lastName": "Jones", "managerId": 4, managerName: "John Williams", "title": "QA Manager", "department": "Engineering", "cellPhone": "617-000-0006", "officePhone": "781-000-0006", "email": "pjones@fakemail.com", "city": "Boston, MA", "pic": "paul_jones.jpg", "twitterId": "@fakepjones", "blog": "http://coenraets.org", "reports": null},
            {"id": 7, "firstName": "Paula", "lastName": "Gates", "managerId": 4, managerName: "John Williams", "title": "Software Architect", "department": "Engineering", "cellPhone": "617-000-0007", "officePhone": "781-000-0007", "email": "pgates@fakemail.com", "city": "Boston, MA", "pic": "paula_gates.jpg", "twitterId": "@fakepgates", "blog": "http://coenraets.org", "reports": null},
            {"id": 8, "firstName": "Lisa", "lastName": "Wong", "managerId": 2, managerName: "Julie Taylor", "title": "Marketing Manager", "department": "Marketing", "cellPhone": "617-000-0008", "officePhone": "781-000-0008", "email": "lwong@fakemail.com", "city": "Boston, MA", "pic": "lisa_wong.jpg", "twitterId": "@fakelwong", "blog": "http://coenraets.org", "reports": null},
            {"id": 9, "firstName": "Gary", "lastName": "Donovan", "managerId": 2, managerName: "Julie Taylor", "title": "Marketing Manager", "department": "Marketing", "cellPhone": "617-000-0009", "officePhone": "781-000-0009", "email": "gdonovan@fakemail.com", "city": "Boston, MA", "pic": "gary_donovan.jpg", "twitterId": "@fakegdonovan", "blog": "http://coenraets.org", "reports": null},
            {"id": 10, "firstName": "Kathleen", "lastName": "Byrne", "managerId": 5, managerName: "Ray Moore", "title": "Sales Representative", "department": "Sales", "cellPhone": "617-000-0010", "officePhone": "781-000-0010", "email": "kbyrne@fakemail.com", "city": "Boston, MA", "pic": "kathleen_byrne.jpg", "twitterId": "@fakekbyrne", "blog": "http://coenraets.org", "reports": null},
            {"id": 11, "firstName": "Amy", "lastName": "Jones", "managerId": 5, managerName: "Ray Moore", "title": "Sales Representative", "department": "Sales", "cellPhone": "617-000-0011", "officePhone": "781-000-0011", "email": "ajones@fakemail.com", "city": "Boston, MA", "pic": "amy_jones.jpg", "twitterId": "@fakeajones", "blog": "http://coenraets.org", "reports": null},
            {"id": 12, "firstName": "Steven", "lastName": "Wells", "managerId": 4, managerName: "John Williams", "title": "Software Architect", "department": "Engineering", "cellPhone": "617-000-0012", "officePhone": "781-000-0012", "email": "swells@fakemail.com", "city": "Boston, MA", "pic": "steven_wells.jpg", "twitterId": "@fakeswells", "blog": "http://coenraets.org", "reports": null}
        ];

        callLater(successCallback);

    }

    // 將自已寫的 storage 物件註冊到系統 namaspace 裏
    return MemoryStore;

});

