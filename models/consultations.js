
    const db = require('../components/arango'),
          collection = db.db.collection('consultations')

    const consultation = {

        find:(key) => {

            return new Promise(function(resolve, reject){
                db.query('FOR p in consultations FILTER p._key == "'+key+'" RETURN p', (data)=>{

                    if (data.length > 0){
                        resolve(data)
                    } else {
                        reject('Consulation '+key+' Not found')
                    }

                })
            })

        },

        findRecent:(key) => {

            return new Promise(function(resolve, reject){

                let days_ago = moment().subtract(3, 'days').toISOString()

                db.query('FOR c in consultations FILTER c.customer_id == "'+key+'" && c._created > "'+days_ago+'" SORT c._created DESC LIMIT 1 RETURN c', (data)=>{

                    if (data.length > 0){
                        resolve(data)
                    } else {
                        resolve([])
                    }

                })
            })

        },

        findByClient:(key) => {

            return new Promise(function(resolve, reject){

                db.query('FOR c in consultations FILTER c.customer_id == "'+key+'" SORT c._created DESC LIMIT 10 RETURN c', (data)=>{

                    if (data.length > 0){
                        resolve(data)
                    } else {
                        resolve([])
                    }

                })
            })

        },

        search:(search)=>{

            let filter = ''

            return new Promise(async (resolve, reject) => {

                filter = 'c.customer_id == "'+search.client_key+'" && c._created =~ "'+search.str+'" || c.customer_id == "'+search.client_key+'" && LOWER(c.stylist.name.first) =~ "'+search.str+'"  || c.customer_id == "'+search.client_key+'" && LOWER(c.stylist.name.last) =~ "'+search.str+'" '

                if (search.str.length > 2){
                    console.log('FOR c in consultations FILTER '+filter+' SORT c._created DESC RETURN c')
                    db.query('FOR c in consultations FILTER '+filter+' SORT c._created DESC RETURN c', (data)=>{
                        resolve(data)
                    })
                } else {

                    let result = await consultation.findByClient(search.client_key)
                    resolve(result)
                }
            })

        },

        save:(data) => {

            if (!data._key){
                data._created = new Date().toISOString()
                data._updated = new Date().toISOString()
            } else {
                data._updated = new Date().toISOString()
            }

            return new Promise(function(resolve, reject){

                if (data.image && data.image.match(/^data:image\//) && data.name){

                    if (!data.brand){
                        data.brand = ''
                    }

                    image.save(data.image, data.name+'-'+data.brand, 'products').then((filename)=>{
                        data.image = filename

                        db.query('UPSERT {_key:"'+data._key+'"} INSERT '+JSON.stringify(data)+' UPDATE '+JSON.stringify(data)+' IN consultations RETURN NEW', (data)=>{

                            if (data.length > 0){
                                resolve(data[0])
                            } else {
                                reject(data)
                            }

                        })
                    })

                } else {
                    db.query('UPSERT {_key:"'+data._key+'"} INSERT '+JSON.stringify(data)+' UPDATE '+JSON.stringify(data)+' IN consultations RETURN NEW', (data)=>{

                        if (data.length > 0){
                            resolve(data[0])
                        } else {
                            reject(data)
                        }

                    })

                }

            })

        },

    }

    module.exports = consultation
