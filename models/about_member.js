const db = require('../components/arango')

const about_member = {

    find:(key) => {

        console.log(key,"inside find adout_member ")

        if (typeof key == 'object'){
            key = key['id']
        }
        console.log(key)
        return new Promise(function(resolve, reject){
            db.query('FOR a in members FILTER a._key == "'+key+'" RETURN a', (data)=>{

                if (data){
                    console.log(data,"data about member")
                    resolve(data)
                } else {
                    //console.log(data)
                    reject('Not found')
                }

            })
        })

    },
    //INSERT { value: 1 } INTO numbers
// 'FOR a in members FILTER a.hash_email == "'+key+'" UPDATE a WITH {active:"true"} IN members RETURN a'
//`INSERT ${JSON.stringify(data)} INTO banner RETURN NEW
/*UPDATE "PhilCarpenter" WITH {
    status: "active",
    location: "Beijing"
} IN users*/
// a._key == "'+key+'"
    create:(key,data) => {
            console.log(data,"inside create")
            console.log(key);
            return new Promise(function(resolve, reject){
                db.query( `FOR a in members FILTER a._key == '${key}' UPDATE a WITH {about:${JSON.stringify(data)}} IN members RETURN NEW`,
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
        update_about:(m_id,data) => {
            console.log("inside member about query");
            return new Promise(function(resolve, reject){
                console.log(m_id)
                //const query = `UPDATE { "m_id": "8049824" } WITH ${JSON.stringify(data)} IN member_about RETURN NEW`
                const query = `FOR doc IN member_about FILTER doc.m_id == '${m_id}' UPDATE doc WITH ${JSON.stringify(data)} IN member_about RETURN NEW`
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
        
        addpercentage:(key,data) => {
            //console.log(data,"inside create")
            console.log(key);
            return new Promise(function(resolve, reject){
                db.query( `FOR a in home_CMS FILTER a._key == '3785478' UPDATE a WITH {share_percentage:'${key.share_percentage}',service_commission_percentage:'${key.service_commission_percentage}'} IN home_CMS RETURN NEW`,
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
    
        }
        
        ,
        portfolioInMember:(m_id,data)=>{
            console.log("inside check portfolio in member");
        }
}



module.exports = about_member;