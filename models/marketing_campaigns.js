
    const db = require('../components/arango'),
          collection = db.db.collection('marketing_campaigns')

    const campaign = {

        find:(key) => {

            return new Promise(function(resolve, reject){
                db.query('FOR m IN marketing_campaigns FILTER m._key == "'+key+'" RETURN m', (data)=>{

                    if (data.length > 0){
                        resolve(data)
                    } else {
                        reject('Marketing '+key+' Not found')
                    }

                })
            })

        },

        all:() => {

            return new Promise(function(resolve, reject){
                db.query('FOR m IN marketing_campaigns SORT m._updated DESC LIMIT 60 RETURN m', (data)=>{

                    if (data.length > 0){
                        resolve(data)
                    } else {
                        reject('Not found')
                    }

                })
            })

        },

        save:(data) => {

            if (!data._key){
                data._created = new Date().toISOString()
                data._updated = new Date().toISOString()
            } else {
                data._updated = new Date().toISOString()
            }

            return new Promise( async (resolve, reject) => {

                if (data.query){
                    data.query_func = data.query.split('|')[0],
                    data.query_val = data.query.split('|')[1]
                    data.recipient_count = await campaign[data.query_func](data.query_val)
                }

                db.query('UPSERT {_key:"'+data._key+'"} INSERT '+JSON.stringify(data)+' UPDATE '+JSON.stringify(data)+' IN marketing_campaigns RETURN NEW', (data)=>{

                    if (data.length > 0){
                        resolve(data[0])
                    } else {
                        reject(data)
                    }

                })

            })

        },

        getRecipients:(query, emails) => {

            return new Promise( async (resolve, reject) => {

                if (emails === true){

                    db.query('FOR c IN customers FILTER '+query+' RETURN c.email', (data)=>{
                        if (data.isArangoError){
                            reject(data)
                        } else {
                            resolve(data)
                        }

                    })

                } else {

                    db.query('FOR c IN customers FILTER '+query.replace(/'/g,'"')+' COLLECT WITH COUNT INTO length RETURN length', (data)=>{
                        if (data.isArangoError){
                            reject(data)
                        } else {
                            resolve(data[0])
                        }

                    })

                }

            })

        },

        viewRecipients:(key)=>{

            return new Promise( async (resolve, reject) => {

                let camp = await collection.document(key)
                let result

                if (!camp){
                    resolve([])
                    return
                }
                if (camp.query_val){
                    result = await campaign[camp.query_func](camp.query_val, true)
                } else {
                    result = await campaign[camp.query_func](false, true)
                }

                resolve(result)

            })

        },

        search:(search)=>{

            let filter = ''

            return new Promise(function(resolve, reject){

                filter = 'm._key == "'+search.str+'" || LOWER(m.name) =~ "'+search.str+'" || LOWER(m.description) =~ "'+search.str+'"'

                if (search.str.length > 2){
                    db.query('FOR m in marketing_campaigns FILTER '+filter+' RETURN m', (data)=>{
                        resolve(data)
                    })
                } else {
                    resolve([])
                }
            })

        },

        addImage: (data) => {

            return new Promise(async(resolve, reject) => {

                let img = await image.save(data.img, data.name, 'media')
                resolve({img:config.site_url+'/media/600/60'+img})

            })

        },


    // client queries


        transactionsOver:(months, email) => {

            return new Promise( async (resolve, reject) => {

                if (!months){
                    months = 6
                }
                let result = await campaign.getRecipients('HAS(c.last_transaction,"date") && c.last_transaction.date < DATE_ADD(DATE_TIMESTAMP(DATE_NOW()), -'+months+', "months")', email)
                resolve(result)

            })

        },

        birthdaysThisMonth:(val, email) => {

            return new Promise( async (resolve, reject) => {

                let result = await campaign.getRecipients('TO_NUMBER(c.dob.month) == DATE_MONTH(DATE_NOW())', email)
                resolve(result)

            })

        },

        birthdaysNextMonth:(val, email) => {

            return new Promise( async (resolve, reject) => {

                let result = await campaign.getRecipients('TO_NUMBER(c.dob.month) == DATE_MONTH(DATE_ADD(DATE_NOW(),1,"month"))', email)
                resolve(result)

            })

        },

        allClients:(val, email)=>{
            return new Promise( async (resolve, reject) => {

                let result = await campaign.getRecipients('HAS(c,"_key")', email)
                resolve(result)

            })
        }


    }

    module.exports = campaign
