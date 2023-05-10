const db = require('../components/arango')

const home_about_us={
    
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
            db.query( `FOR a in home_CMS UPDATE a WITH {about_us:${JSON.stringify(data)}} IN home_CMS RETURN NEW`,
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
    getAbout:()=>{
        console.log("inside getAbout model");
        return new Promise(function(resolve, reject){
        db.query(`FOR a in home_CMS  RETURN a.about_us`, (data)=>{

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

    getAbout1:(data)=>{
        console.log("inside getAbout model",data.type);
        return new Promise(function(resolve, reject){
        db.query(`FOR a in home_CMS FILTER a.type=='${data.type}'  RETURN a`, (data)=>{

            if (data.length>0){
                // console.log(data,"data in homeCMS")
                resolve(data[0])
            } else {
                //console.log(data)
                resolve([])
            }


        })
    })
    },
    updateAbout1:(data)=>{
        const type=data.type;
    data=JSON.stringify(data)
        // console.log("inside getAbout model");
        return new Promise(function(resolve, reject){
        db.query(`FOR a in home_CMS FILTER a.type=='${type}' UPDATE a WITH ${data} in home_CMS  RETURN NEW`, (data)=>{
            if (data){
                // console.log(data,"data in homeCMS")
                resolve(data[0])
            } else {
                //console.log(data)
                reject('Not found')
            }


        })
    })
    },
    updateCafeCms:async (data)=>{
        const type=data.type;
    data=JSON.stringify(data)
    console.log(data)
    
        // console.log("inside getAbout model");
        return new Promise(async function(resolve, reject){
      await  db.query(`FOR d IN home_CMS
      FILTER d.type == "foodcafeCms"
      UPDATE d WITH ${data} IN home_CMS
      RETURN NEW`, (data)=>{
                resolve(data)
        })

    })
    },
    addTopPanelImages:async (data)=>{
        const type=data.type;
    data=JSON.stringify(data)
    console.log(data)
    
        // console.log("inside getAbout model");
        return new Promise(async function(resolve, reject){
      await  db.query(`FOR d IN home_CMS
      FILTER d.type == "topPanel"
      UPDATE d WITH ${data} IN home_CMS
      RETURN NEW`, (data)=>{
      
                resolve(data)
        })

    })
    },
    addSectionData:async (data)=>{
        const type=data.type;
    data=JSON.stringify(data)
    // console.log(data)
    
        console.log(`UPSERT {type: '${type}'} INSERT ${data} UPDATE ${data} IN home_CMS return NEW`);
        return new Promise(async function(resolve, reject){
    //   await  db.query(`insert ${data} into home_CMS `, (data)=>{
      await  db.query(`UPSERT {type: '${type}'} INSERT ${data} UPDATE ${data} IN home_CMS return NEW`, (data)=>{
      
                resolve(data)
        })

    })
    },
    getHomeScreenData:async (data)=>{
        
        return new Promise(async function(resolve, reject){
      await  db.query(`for p in home_CMS filter p.menu=='homeScreen' return p`, (data)=>{
       
        let result = data.reduce((acc, curr) => {
            acc[curr.type] = curr;
            return acc;
          }, {});
                resolve(result)
        })

    })
    },
    // putting all type api saperate.. to prevent accidental data updation..
    updateProductCMS:async (data)=>{
        const type=data.type;
    data=JSON.stringify(data)
    console.log(data)
  
        return new Promise(async function(resolve, reject){
      await  db.query(` FOR d IN home_CMS
      FILTER d.type == "productCMS"
      UPDATE d WITH ${data} IN home_CMS 
      RETURN NEW`, (data)=>{
        console.log(data)
                resolve(data)
        })

    })
    },

    update_about:(data) => {
        console.log(data,"inside member about query");
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
    getAboutbackend:(data) => {
        console.log(data,"inside get")
        return new Promise(function(resolve, reject){
            db.query( `FOR u in home_CMS filter u.type=='${data.type}' RETURN u`,
            (data)=>{
                
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
    wallet_transactions:(data) => {
        console.log(data,"inside get")
        return new Promise(function(resolve, reject){
            db.query( `FOR u in wallet_transactions SORT u._created DESC RETURN u`,
            (data)=>{
                
                if (data.length > 0){
                    //console.log(data)
                    resolve(data)
                } else {
                    //console.log(data)
                    reject('Not found')
                }
            })
        })
    }

}

module.exports=home_about_us;