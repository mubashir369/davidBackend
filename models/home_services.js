const db = require('../components/arango')
function addslashes (str){
    return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
}
const home_services={

    find:() => {

        return new Promise(function(resolve, reject){
            db.query(`FOR a in home_CMS  RETURN a`, (data)=>{

                if (data){
                    console.log(data,"data in homeCMS")
                    resolve(data[0])
                } else {
                    //console.log(data)
                    reject('Not found')
                }

            })
        })

    },
    getSingle: (data) => {
        console.log("inside get single service");
        //console.log(key)
        console.log(data)
        return new Promise(function (resolve, reject) {
            db.query(`FOR a in home_CMS   RETURN NTH( a.services, '${data.key}' )`, (data) => {

                if (data.length>0) {
                    console.log(data,"daaata");                    
                    resolve(data[0])
                } else {
                    //console.log(data)
                    reject('Not found in portfo')
                }

            })
        })

    },
    create:(key,data) => {
        console.log(data,"inside create")
        console.log(key);
        return new Promise(function(resolve, reject){
            db.query(`FOR a in home_CMS UPDATE a WITH {services:${JSON.stringify(data)}} IN home_CMS RETURN NEW`,
            (data)=>{
                console.log(data,"created data") 
                if (data.length > 0){
                    //console.log(data)
                    resolve(data[0])
                } else {
                    //console.log(data)
                    reject('Not found')
                }
            })
        })

    },
    pushService: (key, data) => {
        console.log(data,"data inside push service");
        console.log(key);
        if (typeof key == 'object'){
            key = key['key']
        }  
        return new Promise(function (resolve, reject) {
            const query = `FOR a IN home_CMS  UPDATE a WITH  {services:APPEND(a.services,{"service_name" : '${addslashes(data.service_name)}',"image" : '${data.image}',"service_description":'${addslashes(data.service_description)}'})} IN home_CMS RETURN NEW`

            db.query(query, (data) => {
                console.log(data)
                if (data.length > 0) {
                    resolve(data[0])
                } else {
                    //console.log(data) 
                    reject('Not found')
                }
            })
        }) 

    },
    update_services:(data) => {
        console.log("inside update services query");
        return new Promise(function(resolve, reject){
         
           
            const query = `FOR doc IN home_CMS UPDATE doc WITH ${JSON.stringify(data)} IN home_CMS RETURN NEW`
            
            db.query(query, (data)=>{
                //console.log(data)
                if (data.length > 0){                       
                    resolve(data)
                } else {
                    //console.log(data)
                    reject('Not found')
                }
            })
        })

    },


    update: (data) => {
        console.log(data,"update");

        data.key = data.key?data.key:0

        return new Promise(function (resolve, reject) {

            db.query(`FOR a in home_CMS  RETURN a.services`, (servicedata) => {

                if (servicedata.length>0 && servicedata[0].length>0) {  

                    servicedata = servicedata[0]                 

                    servicedata[data.key] = {"service_name" : data.service_name,"image" : data.image,"service_description" : data.service_description}
                    //console.log(portdata)
                    //return;
                    const query = `FOR a IN home_CMS  UPDATE a WITH  {services:${JSON.stringify(servicedata)}} IN home_CMS RETURN NEW`
                    //console.log(query)
                    db.query(query, (data) => {
                        //console.log(data)
                        if (data.length > 0) {
                            resolve(data[0])
                        } else {
                            //console.log(data)
                            reject('Not found')
                        }
                    })
                }
            })
        })


    },
    delete: (data) => {
        console.log(data,"deldataa");

        return new Promise(function (resolve, reject) {
            const query = `FOR a IN home_CMS  UPDATE a WITH  {services:REMOVE_NTH(a.services,'${data.key}')} IN home_CMS RETURN NEW`

            db.query(query, (data) => {
                console.log(data)
                if (data.length > 0) {
                    resolve(data[0])
                } else {
                    //console.log(data)
                    reject('Not found')
                }
            })
        })



    }



}

module.exports=home_services;