const db = require('../components/arango')

const member_tagline = {

    find:(key) => {

        //console.log(key)

        if (typeof key == 'object'){
            key = key['id']
        }
        console.log(key)
        return new Promise(function(resolve, reject){
            db.query('FOR a in members FILTER a._key == "'+key+'" RETURN a', (data)=>{

                if (data){
                    console.log(data,"data of tagline member")
                    resolve(data)
                } else {
                    //console.log(data)
                    reject('Not found')
                }

            })
        })

    },
    //INSERT { value: 1 } INTO numbers

    create:(key,data) => {
        console.log(data,"inside create")
        console.log(key);
            return new Promise(function(resolve, reject){
                db.query(`FOR a in members FILTER a._key == '${key}' UPDATE a WITH {tagline:${JSON.stringify(data)}} IN members RETURN NEW`, (data)=>{
                    console.log(data,"data from tagline query")
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
        update_tagline:(m_id,data) => {
            
            return new Promise(function(resolve, reject){
                console.log(m_id)
                //const query = `UPDATE { "m_id": "8049824" } WITH ${JSON.stringify(data)} IN member_about RETURN NEW`
                const query = `FOR doc IN members FILTER doc.m_id == '${m_id}' UPDATE doc WITH ${JSON.stringify(data)} IN members RETURN NEW`
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
    
        }
}

module.exports = member_tagline;