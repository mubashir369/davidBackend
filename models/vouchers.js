
    const db = require('../components/arango'),
          collection = db.db.collection('vouchers')

    const vouchers = {

        find:(key) => {

            return new Promise(function(resolve, reject){
                db.query('FOR v in vouchers FILTER v._key == "'+key+'" || v.barcode == "'+key+'" RETURN v', (data)=>{

                    if (data.length > 0){
                        resolve(data)
                    } else {
                        reject('Voucher '+key+' Not found')
                    }

                })
            })

        },

        search:(key) => {

            return new Promise(function(resolve, reject) {

                filter = 'v._key == "'+search.str+'" || LOWER(v.barcode) =~ "'+search.str+'"'

                if (search.str.length > 2){
                    db.query('FOR v in vouchers FILTER '+filter+' RETURN v', (data)=>{
                        resolve(data)
                    })
                } else {
                    resolve([])
                }

            })

        },

        
        saveOfferCode:((data) => {
           var query='';
           if(data._key){
            query='UPSERT {_key:"'+data._key+'"} INSERT '+JSON.stringify(data)+' UPDATE '+JSON.stringify(data)+' IN offer_codes RETURN NEW'
           }
           else{
            delete data._key
            query ='INSERT '+JSON.stringify(data)+' INTO offer_codes RETURN NEW'
           }
           console.log(query)
            // data = JSON.stringify(data)
            return new Promise(function(resolve, reject){
                db.query(query, (data)=>{
                    resolve(data[0])
                })
                // resolve([])
            })
        }),

        all:() => {

            return new Promise(function(resolve, reject){
                db.query('FOR v in vouchers SORT v._updated DESC RETURN v', (data)=>{

                    if (data.length > 0){
                        resolve(data)
                    } else {
                        reject('Not found')
                    }

                })
            })

        },

        save:(async (data) => {

            if (!data._key){
                data._created = new Date().toISOString()
                data._updated = new Date().toISOString()
                if (!data.expiry_date){
                    data.expiry_date = moment().utc().add(1,'years').set({hours:23,minutes:59,seconds:59}).toISOString()
                }
            } else {
                data._updated = new Date().toISOString()
                if (data.image){
                    image.delete(data.image)
                }
            }

            data.image = await image.generateBarcode(data.barcode,'qrcode',true)

            return new Promise(function(resolve, reject){

                db.query('UPSERT {_key:"'+data._key+'"} INSERT '+JSON.stringify(data)+' UPDATE '+JSON.stringify(data)+' IN vouchers RETURN NEW', (voucher_data)=>{

                    if (voucher_data.length > 0){

                        resolve(voucher_data[0])

                    } else {
                        reject('Voucher not saved')
                    }

                })

            })

        }),
        /*getOfferCodes:(search)=>{
            let filter = ''
            return new Promise(function(resolve, reject){
                // filter = 'i.customer_id == "'+search.customer_id+'"'
                 console.log(search)
                    db.query('FOR i in offer_codes FILTER i.customer_id =="'+search.customer_id+'" RETURN i', (data)=>{
                        console.log(data)
                        if(data){
                        resolve(data)}
                        else resolve([])
                    })
            })
        },
*/
getOfferCodes1:(search)=>{
    let filter = ''
    return new Promise(function(resolve, reject){
        // filter = 'i.customer_id == "'+search.customer_id+'"'
        db.query('FOR i in offer_codes FILTER i.type =="'+search.type+'" RETURN i', (data)=>{
                if(data){
                resolve(data)}
                else resolve([])
            })
    })
},
        getOfferCodes:async (search)=>{

            var filter = ''

            if(search.active ==='true'){
                filter = `FILTER DATE_TIMESTAMP(p.end_date) > ${new Date().valueOf()} `
                }
                else if(search.active ==='false'){
                    filter = `FILTER DATE_TIMESTAMP(p.end_date) < ${new Date().valueOf()} `
                }
            var query =`for p in offer_codes filter p.type=='${search.type}' filter p.customer_to=='all' 
            OR (p.customer_id=='${search.customer_id}' AND p.customer_to=='custom') ${filter} return p`
            return new Promise(async function(resolve, reject){
                 console.log(query)
                   await  db.query(query,async (data)=>{
                        if(data){
                        resolve(data)}
                        else resolve([])
                    })
               
            })

        },

        delete:(key)=>{

            return new Promise(function(resolve, reject){

                db.query('LET v = DOCUMENT("vouchers/'+key+'") UPDATE v WITH {purchased: false} IN vouchers RETURN v', (data)=>{
                    resolve(data)
                })

            })

        },

        search:(search)=>{

            let filter = ''

            return new Promise(function(resolve, reject){

                filter = 'v.barcode =~ "'+search.str+'"'

                if (search.str.length > 2){
                    db.query('FOR v in vouchers FILTER '+filter+' RETURN v', (data)=>{
                        resolve(data)
                    })
                } else {
                    db.query('FOR v in vouchers SORT v._created DESC LIMIT 30 RETURN v', (data)=>{
                        resolve(data)
                    })
                }
            })

        },

        send:(key, customer_id) => {

            return new Promise(function(resolve, reject){
                db.query('FOR v IN vouchers FILTER v._key == "'+key+'" UPDATE v WITH {purchased:true, customer_id:"'+customer_id+'"} IN vouchers RETURN NEW', (data)=>{

                    if (data.length > 0){

                        let email_data = {
                            to: customer_id,
                            voucher: data[0]
                        }
                        notification.toCustomer('voucher',email_data).then((email_res)=>{
                            resolve('sent')
                        }).catch((err)=>{
                            reject(err)
                        })


                    } else {
                        reject('Not found')
                    }

                })
            })

        },

        updateValue: (key, spent) => {

            return new Promise(function(resolve, reject){

                collection.document(key).then((doc)=>{

                    doc.value = parseFloat(doc.value)-parseFloat(spent)

                    if (doc.value < 0){
                        reject('Not enough left on voucher')
                    } else {
                        collection.update(doc,doc).then(()=>{
                            resolve(doc)
                        }).catch(()=>{
                            reject('not found')
                        })
                    }

                })

            })

        },

        reissue: (voucher_data) => {

            return new Promise(function(resolve, reject) {

                collection.document(voucher_data._key).then((doc)=>{

                    var date = moment().utc()

                    var str = date.format('YYYY')+'-'+date.format('MM')+date.format('DD')

                    str = str+'-xxxx-xxxx'.replace(/[xy]/g, function(c) {
                        var r = Math.random() * 9 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                        return v.toString(16);
                    });

                    doc.barcode = str

                    if (doc.value <= 0){
                        reject('Not enough left on voucher')
                    } else if (!doc.purchased){
                        reject('This voucher has not been purchased')
                    } else {
                        collection.update(doc,doc).then(()=>{

                            if (doc.customer_id){
                                vouchers.send(doc._key, doc.customer_id).then((email_data)=>{
                                    resolve(voucher_data)
                                }).catch((err)=>{
                                    reject(err)
                                })
                            } else {
                                resolve(voucher_data)
                            }

                        }).catch((err)=>{
                            reject(err)
                        })
                    }

                }).catch((err)=>{
                    reject(err)
                })

            })

        },


    }

    module.exports = vouchers
