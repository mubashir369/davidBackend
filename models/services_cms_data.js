
    const db = require('../components/arango')

    const services_cms_data = {

        find:(key) => {

            return new Promise(function(resolve, reject){
                db.query('FOR a in services_cms_data FILTER a.service_id == "'+key+'" RETURN a', (data)=>{

                    if (data.length > 0){
                        resolve(data[0])
                    } else {
                        resolve({service_prices:[],ChooseStyle_items:[]})
                    }

                })
            })

        },
        findbyslug:async (key) => {
            console.log(`
            FOR a in services_cms_data FILTER a.slug == "${key.slug}"
            let services = (for s in services filter s.category ==a.service_id return {_key:s._key,name:s.name})
             RETURN MERGE(a, {services: services})`)

            return new Promise( async function(resolve, reject){
               await db.query(`
               FOR a in services_cms_data FILTER a.slug == "${key.slug}"
               let services = (for s in services filter s.category ==a.service_id return {_key:s._key,name:s.name})
                RETURN MERGE(a, {services: services})`, async (data)=>{

                    if (data.length > 0){
                        resolve(data[0])
                    } else {
                        reject('Not found')
                    }

                })
            })

        },

        all:() => {

            return new Promise(function(resolve, reject){
                db.query('FOR a in services_cms_data RETURN a', (data)=>{

                    resolve(data)

                })
            })

        },

        save:(data) => {

            return new Promise(function(resolve, reject){
                db.query('UPSERT {_key:"'+data._key+'"} INSERT '+JSON.stringify(data)+' UPDATE '+JSON.stringify(data)+' IN services_cms_data RETURN NEW', (data)=>{

                    if (data.length > 0){
                        resolve(data[0])
                    } else {
                        reject(data)
                    }

                })
            })

        },

        

    }

    module.exports = services_cms_data
