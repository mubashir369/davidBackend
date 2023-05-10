const db = require('../components/arango')

const whyChooseUs={

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

    create:(data) => {
        console.log(data,"inside create")
 
        return new Promise(function(resolve, reject){
            db.query( `FOR a in home_CMS UPDATE a WITH {why_choose_us:${JSON.stringify(data)}} IN home_CMS RETURN NEW`,
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
    getwhyChooseUs:()=>{
        console.log("inside getAbout model");
        return new Promise(function(resolve, reject){
        db.query(`FOR a in home_CMS  RETURN a.why_choose_us`, (data)=>{

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
    update_about:(data) => {
        console.log("inside member about query");
        return new Promise(function(resolve, reject){
            console.log(m_id)
            //const query = `UPDATE { "m_id": "8049824" } WITH ${JSON.stringify(data)} IN member_about RETURN NEW`
            const query = `FOR doc IN home_CMS  UPDATE doc WITH ${JSON.stringify(data)} IN home_CMS RETURN NEW`
            //FOR doc IN banner FILTER doc.m_id == '${data.m_id}' UPDATE doc WITH
            db.query(query, (data)=>{
                //console.log(data)
                if (data.length > 0){                       
                    resolve(data[0])
                } else {
                    //console.log(data)
                    reject('Not found')
                }
            })
        })

    },



}
module.exports=whyChooseUs;