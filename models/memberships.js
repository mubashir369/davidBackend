
    const db = require('../components/arango'),
          customers = require('../models/customers'),
          collection = db.db.collection('memberships'),
          stripe = require('stripe')(config.stripe_secret_key)
          sendMail=require('../modules/sendMail')

    const memberships = {

        all: () => {

            return new Promise( async (resolve, reject) => {

                // if (stripe[req.params.type]){
                //     data = await stripe[req.params.type].list()
                //     res.json(data.data)
                // } else {
                //     res.status(404).json('incorrect type specified')
                // }

                // let result = await collection.all()
                // resolve(result._result)
                // let old=`FOR m IN memberships FILTER m.delete!=true LET members = (FOR c IN customers FILTER c.membership.membership_id == m._key RETURN c.subscription_id) SORT m.name ASC RETURN MERGE(m,{subscribers:COUNT(members)})`
                let query=`FOR m IN memberships FILTER m.delete!=true LET members = (FOR c IN customers FILTER c.subscription_id AND c.subscription_id == m.id RETURN c.subscription_id) SORT m.name ASC RETURN MERGE(m,{subscribers:COUNT(members)})`
                db.query(query, (result) => {
                    resolve(result)
                })

            })

        },

        active: () => {

            return new Promise( async (resolve, reject) => {

                db.query('FOR m IN memberships FILTER (m.active == true || m.active == "true") && m.delete!=true LET members = (FOR c IN customers FILTER c.membership.membership_id == m._key RETURN c.subscription_id) RETURN MERGE(m,{subscribers:COUNT(members)})', (result) => {
                    console.log(result)
                    resolve(result)
                })

            })

        },
        raiseCancelRequest: async (data) => {
            console.log(data)
            if(!data.usertype){
               data.usertype= 'member'
            }
            
            if(!data._created){
                data._created= new Date();
            }
            return new Promise( async (resolve, reject) => {
                let text1 = ` <br>click  <a href = '${config.backend_url}/dashboard/clients/membership_request'>click here  </a>or copy paste following url into browser: ${config.minor_site_url}/dashboard/clients/membership_request`
                let msg2 = {
                    to: config.email.admin_to,
                    subject: "Membership cancel request",

                    text: `<p> ${data.name}(Id:${data.memberId}) has requested For Membership Cancellation. Please review and Update. </p> ${text1}`,
                  };
                 notification.email(msg2);
                //   sendMail.sendMail(msg2.to,msg2.subject,msg2.text,msg2.subject, "new.ejs")
                db.query(`INSERT ${JSON.stringify(data)} INTO membership_update_requests`, (result) => {
                    // console.log(result)

                    resolve(result)
                })
                  resolve([])
            })

        },
        getCancelationRequest: async (data) => {
            return new Promise( async (resolve, reject) => {

                db.query(`for p in membership_update_requests filter p.membership_id=='${data}' and p.status=='pending' sort p._key desc limit 1 return p`, (result) => {
                    // console.log(result)
                    resolve(result)
                })

            })

        },
        getCancelationRequests: async (data) => {
            var filter='';
           
            if(data.userType){
                filter=`FILTER (p.userType=="${data.userType}" || p.usertype=="${data.userType}"`
            }   
            return new Promise( async (resolve, reject) => {
               await db.query(`for p in membership_update_requests ${filter} sort p._key desc limit 10 return {"_key":p._key,"membership_id":p.membership_id,"status":p.status,
                "memberId":p.memberId,"name":p.name,"email":p.email,"created_at":DATE_FORMAT(p._created,"%d-%m-%y")}`, (result) => {
                    // console.log(result);
                    resolve(result)
                })

            })

        },
        updateMemStatus: async (data) => {
            console.log(data)
            return new Promise( async (resolve, reject) => {
               await db.query(`FOR u IN membership_update_requests
               FILTER u._key == '${data.key}'
               UPDATE u WITH { status: 'cancelled'} IN membership_update_requests return NEW`,  (result) => {
                console.log(result)
                resolve(result)
            })
            // update subscription in members 
            await db.query(`FOR doc IN members
                FILTER doc._key == '${data.id}'
                UPDATE doc WITH {subscription_id:""} IN members return {"updated":true}
                `, (result) => {
                    console.log(result)
                    resolve(result)
                 })
                

            })

        },

        find: (data) => {

            return new Promise( async (resolve, reject) => {

                let membership_id

                if (typeof data == 'object' && data.lines && data.lines.data && data.lines.data.length > 0){ // stripe data

                    if (data.lines.data[0].price && data.lines.data[0].price.id){
                        membership_id = data.lines.data[0].price.id
                    } else if (data.lines.data[0].plan && data.lines.data[0].plan.id){
                        data = data.lines.data[0].plan.id
                    }

                } else if (typeof data == 'string'){
                    membership_id = data
                }

                if (membership_id){
                    db.query('FOR m IN memberships FILTER m._key == "'+membership_id+'" RETURN m', (membership) => {
                        resolve(membership[0])
                    })
                } else {
                    reject([])
                }

            })

        },
        full_delete: (data,postval) => {
            console.log('full_delete',data)
            return new Promise(async (resolve, reject) => {

                let payload = {
                    _key: data,
                    delete: true
                }

                await collection.update(payload,payload)
                resolve([])
            })
        },
        getMembers: (id) => {

            console.log('getMembers',id)

            return new Promise((resolve, reject) => {
                // 'FOR cm IN customer_memberships FILTER cm.subscription_id == "'+id+'" COLLECT customerID = cm.customer_id INTO customerGroup LET c = (FOR r IN customers FILTER r._key == customerID LIMIT 1 RETURN r) RETURN {name:c[0].name, _key:c[0]._key, email:c[0].email, member_since:c[0].membership.started, subscription_id: c[0].membership.subscription_id}'

                db.query('FOR cm IN customer_memberships FILTER cm.subscription_id == "'+id+'" LET c = (FOR r IN customers FILTER r._key == cm.customer_id LIMIT 1 RETURN r) RETURN {name:c[0].name, _key:c[0]._key, email:c[0].email, member_since:cm._created, expiry:cm.expiry, subscription_id: cm.subscription_id}', (members) => {

                    console.log(members)

                //db.query('FOR c IN customers FILTER c.membership.membership_id == "'+id+'" RETURN {name:c.name, _key:c._key, email:c.email, member_since:c.membership.started, subscription_id: c.membership.subscription_id}', (members) => {
                    resolve(members)
                })

            })

        },

        getCustomerMemberships: (data) => {

            console.log('memmmmmmm',data)

            return new Promise((resolve, reject) => {
                console.log(`FOR m IN memberships
                filter !m.delete
                filter (m.active == true || m.active == "true") 
                  LET customerSubscription = (
                    FOR p IN customer_memberships
                      FILTER p.customer_id == "${data.id}"
                      FILTER p.subscription_id == m._key
                      FILTER DATE_ISO8601(p.expiry) > DATE_ISO8601(DATE_NOW())
                      SORT p._created DESC
                      LIMIT 1
                      RETURN p
                  )[0]
                  LET cancelStatus = (
                    FOR request IN membership_update_requests
                      FILTER request.customerId == "${data.id}"
                      FILTER request.membership_id == m._key
                      LIMIT 1
                      RETURN request.status
                  )[0]
                  RETURN MERGE({interval:m.interval, _key:m._key, subscription_id:m._key, expiry:customerSubscription ? customerSubscription.expiry : null}, { cancelStatus: cancelStatus },{membership:m})`)
                db.query(`FOR m IN memberships
                filter !m.delete
                filter (m.active == true || m.active == "true") 
                  LET customerSubscription = (
                    FOR p IN customer_memberships
                      FILTER p.customer_id == "${data.id}"
                      FILTER p.subscription_id == m._key
                      FILTER DATE_ISO8601(p.expiry) > DATE_ISO8601(DATE_NOW())
                      SORT p._created DESC
                      LIMIT 1
                      RETURN p
                  )[0]
                  LET cancelStatus = (
                    FOR request IN membership_update_requests
                      FILTER request.customerId == "${data.id}"
                      FILTER request.membership_id == m._key
                      LIMIT 1
                      RETURN request.status
                  )[0]
                  RETURN MERGE({interval:m.interval, _key:m._key, subscription_id:m._key, expiry:customerSubscription ? customerSubscription.expiry : null}, { cancelStatus: cancelStatus },{membership:m})`, (members) => {
                // db.query('FOR c IN customer_memberships FILTER c.customer_id == "'+data.id+'" RETURN {interval:c.interval, _key:c._key, subscription_id:c.subscription_id, expiry:c.expiry}', (members) => {
                    resolve(members)
                })

            })

        },

        getMembershipByIds: (data) => {

            var result = new Array();

            for (var i in data.ids)
                result.push(data.ids[i]);

            console.log(result)
            

            return new Promise( async (resolve, reject) => {              

                db.query('FOR m IN memberships FILTER m.active == true AND m._key IN '+JSON.stringify(result)+' RETURN {_id:m._key,benefits:m.benefits,name:m.name,weekdays:m.weekdays,cafe_product_weekdays:m.cafe_product_weekdays,product_weekdays:m.product_weekdays}', (result2) => {
                    //console.log('FOR m IN memberships FILTER m.active == true AND '+result+' IN m._key RETURN m')
                    resolve(result2)
                })

            })

        },

        checkBenefits: (client_id, item, type) => {
            // console.log(item)
            return new Promise( async (resolve, reject) => {

                let client = await customers.find(client_id, '{_key: c._key,membership: c.membership}')

                if (client && client.membership && client.membership.membership_id){

                    let membership = await collection.document({_key: client.membership.membership_id}),
                        result = {}

                    if (membership && membership.benefits && typeof membership.benefits.discount == 'object'){

                        if (membership.benefits.discount.type == 'all'){

                            if (membership.benefits.discount.services_categories && item.type == 'services'){

                            //    console.log('alls',item.category, membership.benefits.discount.services_categories, membership.benefits.discount.services_categories.indexOf(item.category))

                                if (membership.benefits.discount.services_categories.indexOf(item.category) >= 0){ // only add the discount if the category is allowed
                                    result = membership.benefits.discount
                                    result.parse = {
                                        amount: result.amount.replace(/[^0-9.]/g,''),
                                        percent: result.amount.match(/\%/)
                                    }
                                }

                            }

                            if (membership.benefits.discount.products_categories && item.type == 'products'){

                            //    console.log('allp',item.category, membership.benefits.discount.products_categories, membership.benefits.discount.products_categories.indexOf(item.category))

                                if (membership.benefits.discount.products_categories.indexOf(item.category) >= 0){ // only add the discount if the category is allowed
                                    result = membership.benefits.discount
                                    result.parse = {
                                        amount: result.amount.replace(/[^0-9.]/g,''),
                                        percent: result.amount.match(/\%/)
                                    }
                                }

                            }

                        } else if (item.type == membership.benefits.discount.type){

                            if (membership.benefits.discount[membership.benefits.discount.type+'_categories']){

                            //    console.log('a',item.category, membership.benefits.discount[membership.benefits.discount.type+'_categories'], membership.benefits.discount[membership.benefits.discount.type+'_categories'].indexOf(item.category))

                                if (membership.benefits.discount[membership.benefits.discount.type+'_categories'].indexOf(item.category) >= 0){ // only add the discount if the category is allowed
                                    result = membership.benefits.discount
                                    result.parse = {
                                        amount: result.amount.replace(/[^0-9.]/g,''),
                                        percent: result.amount.match(/\%/)
                                    }
                                }

                            } else {

                                result = membership.benefits.discount
                                result.parse = {
                                    amount: result.amount.replace(/[^0-9.]/g,''),
                                    percent: result.amount.match(/\%/)
                                }

                            }

                        }

                    }

                    if (membership && membership.benefits && typeof membership.benefits.booking_discount == 'object' && item.type == 'services' && typeof membership.benefits.booking_discount.services_categories == 'object' && membership.benefits.booking_discount.services_categories.indexOf(item.category) >= 0){

                        let diff = moment().diff(moment(item._created), 'weeks')

                        if (diff >= parseInt(membership.benefits.booking_discount.length)){

                            if (result.parse){

                                let parse_amount = membership.benefits.booking_discount.amount.replace(/[^0-9.]/g,''),
                                    percent = membership.benefits.booking_discount.amount.match(/\%/)

                                if (result.parse.percent && result.parse.percent.length > 0 && percent && percent.length > 0){

                                    result.parse.new_amount = parseInt(result.parse.amount) + parseInt(parse_amount)
                                    result.amount = '-'+result.parse.new_amount+'%'

                                } else if (!result.parse.percent && !percent){

                                    result.parse.new_amount = parseInt(result.parse.amount) + parseInt(parse_amount)
                                    result.amount = '-'+result.parse.new_amount

                                }

                            } else {
                                result = membership.benefits.booking_discount
                            }

                        }

                    }

                    if (result.amount && !result.amount.match(/^-/)){
                        result.amount = '-'+result.amount
                    }

                    resolve(result)

                } else {
                    resolve({})
                }

            })

        },

        checkRewardPoints: (client_id, item, type) => {

            return new Promise( async (resolve, reject) => {

                let client = await customers.find(client_id, '{_key: c._key,membership: c.membership, reward_points: c.reward_points}')

                if (client && client.membership && client.membership.membership_id){

                    let membership = await collection.document({_key: client.membership.membership_id}),
                        result = {}

                    //    console.log(client, membership)

                } else {
                    resolve({})
                }

            })

        },

        create: (data) => {

            return new Promise(async (resolve, reject) => {

                let deposit_amount = 0

                if (typeof data.deposit_amount == 'string'){
                    deposit_amount = data.deposit_amount.replace(/£/,'')
                } else if (data.deposit_amount){
                    deposit_amount = data.deposit_amount
                }

                const product = await stripe.products.create({
                    name: data.name,
                })

                const price = await stripe.prices.create({
                    unit_amount: parseFloat(data.price.replace(/£/,''))*100,
                    currency: 'gbp',
                    nickname: data.name,
                    recurring: {interval: data.interval},
                    product: product.id
                })

                let new_membership = {
                    _key: price.id,
                    name: product.name,
                    unit_amount: price.unit_amount,
                    deposit_amount: deposit_amount,
                    description: data.description,
                    type: data.type,
                    currency: 'gbp',
                    active: product.active,
                    nickname: price.name,
                    recurring: {
                        interval: price.recurring.interval,
                        interval_count: price.recurring.interval_count,
                        trial_period_days: price.recurring.trial_period_days
                    },
                    benefits: data.benefits,
                    weekdays: data.weekdays,
                }

                await collection.save(new_membership)

                resolve({product:product, price: price})

            })

        },

        update: (data) => {

            return new Promise( async (resolve, reject) => {
                let prices = await stripe.prices.update(
                                data.id,
                                {
                                    nickname: data.name,
                                    active: data.active
                                }
                            )

                let payload = data
                payload._key = prices.id

                if (payload.deposit_amount){
                    payload.deposit_amount = payload.deposit_amount.replace(/£/,'')
                }
            //  const data1=   await collection.update(payload,payload)
        
                db.query(`for p in memberships filter p._key=='price_1LndczHfeWtaNgKZvuITzk9U' 
                update p with ${JSON.stringify(payload)} in memberships return p`, (result2) => {
                    //console.log('FOR m IN memberships FILTER m.active == true AND '+result+' IN m._key RETURN m')
                    // console.log(result2)
                    resolve(result2)
                })
            //  console.log(data1)
                resolve(prices)
            })

        },

        delete: (data) => {

            console.log("data",data)

            return new Promise( async (resolve, reject) => {
                let prices = await stripe.prices.update(
                    data.id,
                    {active: false}
                )

                let payload = {
                    _key: data.id,
                    active: false
                }

                await collection.update(payload,payload)

                resolve(prices)

            })

        },

        activate: (data) => {

            console.log(data)

            return new Promise( async (resolve, reject) => {
                let prices = await stripe.prices.update(
                    data.id,
                    {active: true}
                )

                let payload = {
                    _key: data.id,
                    active: true
                }

                await collection.update(payload,payload)

                resolve(prices)

            })

        },
        setorder:(data)=>{



            return new Promise(async function(resolve, reject){                

             

                console.log('data',data);
                //return;

                data.total = data.totals['total']

                let doc = data
                doc['order_id'] = Math.round(+new Date()/1000),
                doc['_created'] = new Date().toISOString()

                //const { token, currency, price } = req.body;
                  const charge = await stripe.charges.create({
                    amount: parseInt(data.total)*100,
                    currency: 'INR',
                    source: data.token,
                  });

                  if (charge && charge.id){

                        console.log(charge.id)

                        doc.stripe_transcation_id = charge.id


                        db.query('FOR u IN customers FILTER u._key == "'+data.customer_id+'" UPDATE u WITH { subscription_id: "'+data.subscription_id+'" } IN customers RETURN NEW', async (customer_data)=>{


                        //return;

                        db.query('INSERT '+JSON.stringify(data)+' INTO customer_memberships RETURN NEW', (data2)=>{

                        console.log(data2)
                        if (data2){


                            

                let date = moment().toISOString(),
                    transaction = {
                      
                      "transaction_id": doc.order_id,
                      "stripe_transcation_id": charge.id,
                      "total": data.total,
                      "type": 'Customer membership payment',
                      "sub_total": 0,
                      "tax": 0,
                      "delivery": 0,
                      "delivery_method": "",
                      "status": "complete",
                      "method": "stripe",
                      "customer_id": data.customer_id,
                      "payment": {
                        "vouchers": 0,
                        "account": 0,
                        "card": 0,
                        "stripe": data.total,
                        "bacs": 0,
                        "cash": 0,
                        "change": 0,
                        "payment_link": 0
                      },
                      "item_total": data.total,
                      "temp":"true",
                      "_created": date,
                      "_updated": date
                    }

                    db.query('INSERT '+JSON.stringify(transaction)+' INTO transactions', (data)=>{
                    })

                    
                    
                    //getting customer email..
                    db.query('FOR p in customers FILTER p._key == "'+data2[0].customer_id+'" || p._key == '+data2[0].customer_id+' RETURN p', (cust)=>{
                        // sending mail to customer for appoinment confirmation.
                        let start = new Date(data.date)
                        let end = new Date(data.end_date)
                        let startDate = start.getDate() + '-' + parseInt(start.getMonth() + 1) + '-' + start.getFullYear();
                        let endTime = parseInt(end.getMinutes() )>9?end.getHours() + ':' + parseInt(end.getMinutes() ):end.getHours() + ': 0' + parseInt(end.getMinutes() );
                        let startTime = parseInt(start.getMinutes() )>9?start.getHours() + ':' + parseInt(start.getMinutes() ):start.getHours() + ': 0' + parseInt(start.getMinutes() );
                        let msg = {
                            to: cust[0].email,
                            subject: 'Customer Membership Payment Successfull.',
                            text:`Thank you, Your Appoinment Customer Membership Payment Successfully Completed. `
                        }
                        // sendMail.sendMail(msg.to,msg.subject,msg.text,msg.subject, "new.ejs")
                        // send notification to admin..
                        let msg2 = {
                            to: config.email.admin_to,
                            subject: 'Customer Membership Payment Confirmation.',
                            text:`Thank you, Your Appoinment Customer Membership Payment Successfully Completed.`
                        }
                        notification.email(msg)
                        // sendMail.sendMail(msg2.to,msg2.subject,msg2.text,msg2.subject, "new.ejs")
                    })


                            resolve(data2)
                        } else {
                            reject([])
                        }

                        return;

                    })
                })
                    
                  } 

                  

                



            })

        },
        setorderWithWallet:(data)=>{



            return new Promise(async function(resolve, reject){                

             

                console.log('data',data);
                //return;

                data.total = data.totals['total']

                let doc = data
                doc['order_id'] = Math.round(+new Date()/1000),
                doc['_created'] = new Date().toISOString()

                //const { token, currency, price } = req.body;
                //   const charge = await stripe.charges.create({
                //     amount: parseInt(data.total)*100,
                //     currency: 'INR',
                //     source: data.token,
                //   });

                  if (1){

                     

                        doc.stripe_transcation_id = ""


                        db.query('FOR u IN customers FILTER u._key == "'+data.customer_id+'" UPDATE u WITH { subscription_id: "'+data.subscription_id+'" } IN customers RETURN NEW', async (customer_data)=>{


                        //return;

                        db.query('INSERT '+JSON.stringify(data)+' INTO customer_memberships RETURN NEW', (data2)=>{

                        console.log(data2)
                        if (data2){


                            

                let date = moment().toISOString(),
                    transaction = {
                      
                      "transaction_id": doc.order_id,
                      "stripe_transcation_id": "",
                      "total": data.total,
                      "type": 'Customer membership payment',
                      "sub_total": 0,
                      "tax": 0,
                      "delivery": 0,
                      "delivery_method": "",
                      "status": "complete",
                      "method": "wallet",
                      "customer_id": data.customer_id,
                      "payment": "wallet",
                      "item_total": data.total,
                      "temp":"true",
                      "_created": date,
                      "_updated": date
                    }

                    db.query('INSERT '+JSON.stringify(transaction)+' INTO transactions', (data)=>{
                    })

                     // updating wallet for customer...
                     db.query(`
                     for p in customers filter p._key=='${data2[0].customer_id}' update p with {wallet:p.wallet - ${data.total} } in  customers   
                     return {wallet:p.wallet}
                     `, (data)=>{
                     })
                    
                    //getting customer email..
                    db.query('FOR p in customers FILTER p._key == "'+data2[0].customer_id+'" || p._key == '+data2[0].customer_id+' RETURN p', (cust)=>{
                        // sending mail to customer for appoinment confirmation.
                        let start = new Date(data.date)
                        let end = new Date(data.end_date)
                        let startDate = start.getDate() + '-' + parseInt(start.getMonth() + 1) + '-' + start.getFullYear();
                        let endTime = parseInt(end.getMinutes() )>9?end.getHours() + ':' + parseInt(end.getMinutes() ):end.getHours() + ': 0' + parseInt(end.getMinutes() );
                        let startTime = parseInt(start.getMinutes() )>9?start.getHours() + ':' + parseInt(start.getMinutes() ):start.getHours() + ': 0' + parseInt(start.getMinutes() );
                        let msg = {
                            to: cust[0].email,
                            subject: 'Customer Membership Payment Successfull.',
                            text:`Thank you, Your Appoinment Customer Membership Payment Successfully Completed. `
                        }
                        // sendMail.sendMail(msg.to,msg.subject,msg.text,msg.subject, "new.ejs")
                        // send notification to admin..
                        let msg2 = {
                            to: config.email.admin_to,
                            subject: 'Customer Membership Payment Confirmation.',
                            text:`Thank you, Your Appoinment Customer Membership Payment Successfully Completed.`
                        }
                        // notification.email(msg)
                        sendMail.sendMail(msg2.to,msg2.subject,msg2.text,msg2.subject, "new.ejs")
                    })


                            resolve(data2)
                        } else {
                            reject([])
                        }

                        return;

                    })
                })
                    
                  } 

                  

                



            })

        },
        deleteOne:(id)=>{
            return new Promise((resolve,reject)=>{
                console.log("id is",id);
                let q=`FOR doc IN member_subscriptions FILTER doc._key=="${id.id}"  REMOVE doc IN member_subscriptions`
                db.query(q,(data)=>{
                    console.log("ans",data);
                    resolve(data)
                })
            })
        }


    }

    module.exports = memberships
