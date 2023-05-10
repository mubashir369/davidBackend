const db = require('../components/arango')

const banner = {

    find:(key) => {

        console.log(key,"kkkkkk")

        if (typeof key == 'object'){
            key = key['key']
        }



        
     
        return new Promise(function(resolve, reject){
            console.log(key,"keyyy");
            db.query(`FOR a in banner FILTER a.m_id == '${key}' || a.m_id == "'${key}'" RETURN a`, (data)=>{
                
                console.log(data,"daaaaa1")
                if (data.length>0){

                    resolve(data)
                } else {
                    console.log(data,"NOT")
                    resolve(data)
                }

            })
        })

    },
    //INSERT { value: 1 } INTO numbers

    create:(data) => {
            
            return new Promise(function(resolve, reject){
                db.query(`INSERT ${JSON.stringify(data)} INTO banner RETURN NEW`, (data)=>{
                    //console.log(data)
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
        pushBanner:(m_id,data) => {
            console.log(data,"inside pushbanner");
            return new Promise(function(resolve, reject){
                const query = `FOR doc IN banner FILTER doc.m_id == '${m_id}' UPDATE doc WITH { banner: APPEND(doc.banner,{"heading" : '${data.heading}',"description" : '${data.description}',"image" : '${data.image}'})} IN banner RETURN NEW`
                console.log(query,"qqqqqqqqqq");
                db.query(query, (data)=>{
                    console.log(data,"ddddd")
                    if (data.length > 0){                       
                        resolve(data[0])
                    } else {
                        console.log(data,"else data")
                        reject('Not found')
                    }
                })
            })
    
        },
    delete: (data) => {
        console.log(data,"deldataa");

        return new Promise(function (resolve, reject) {
            const query = `FOR a IN banner FILTER a.m_id =='${data.member_id}' UPDATE a WITH  {banner:REMOVE_NTH(a.banner,'${data.key}')} IN banner RETURN NEW`

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

    getSingle: (data) => {
        console.log("inside find portfolio");
        //console.log(key)
        console.log(data)
        return new Promise(function (resolve, reject) {
            db.query(`FOR a in banner FILTER a.m_id == '${data.member_id}' RETURN NTH( a.banner, '${data.key}' )`, (data) => {

                if (data.length>0) {                    
                    resolve(data[0])
                } else {
                    //console.log(data)
                    reject('Not found in portfo')
                }

            })
        })

    },
    update: (data) => {
        console.log(data,"update");

        data.key = data.key?data.key:0

        return new Promise(function (resolve, reject) {

            db.query(`FOR a in banner FILTER a.m_id == '${data.member_id}' RETURN a.banner`, (portdata) => {

                if (portdata.length>0 && portdata[0].length>0) {  

                    portdata = portdata[0]                 

                    portdata[data.key] = {"heading" : data.heading,"description" : data.description,"image" : data.image}
                    //console.log(portdata)
                    //return;
                    const query = `FOR a IN banner FILTER a.m_id =='${data.member_id}' UPDATE a WITH  {banner:${JSON.stringify(portdata)}} IN banner RETURN NEW`
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


    }
}

module.exports = banner;