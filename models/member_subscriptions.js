
    const db = require('../components/arango'),
          customers = require('../models/customers'),
          collection = db.db.collection('member_subscriptions'),
          stripe = require('stripe')(config.stripe_secret_key)
        //   sendMail=require('../modules/sendmail')

    const member_subscriptions = {

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

                db.query('FOR m IN member_subscriptions LET members = (FOR c IN customers FILTER c.membership.membership_id == m._key RETURN c.subscription_id) SORT m.unit_amount ASC RETURN MERGE(m,{subscribers:COUNT(members)})', (result) => {
                    resolve(result)
                })

            })

        },
        frontall: () => {

            return new Promise( async (resolve, reject) => {

                // if (stripe[req.params.type]){
                //     data = await stripe[req.params.type].list()
                //     res.json(data.data)
                // } else {
                //     res.status(404).json('incorrect type specified')
                // }

                // let result = await collection.all()
                // resolve(result._result)

                db.query('FOR m IN member_subscriptions FILTER m.active == true LET members = (FOR c IN customers FILTER c.membership.membership_id == m._key RETURN c.subscription_id) SORT m.unit_amount ASC RETURN MERGE(m,{subscribers:COUNT(members)})', (result) => {
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
                    db.query('FOR m IN member_subscriptions FILTER m._key == "'+membership_id+'" RETURN m', (membership) => {
                        resolve(membership[0])
                    })
                } else {
                    reject([])
                }

            })

        },

        stripPayment:  (data, req)=>{

        return new Promise(async function(resolve, reject){

            console.log(data,config.stripe_secret_key)
            console.log(data.cardnumber.replace(/[ ]+/g, ""))    

            let price = parseInt(data.price)

            let newitems = []

            /*data.items.map((val,key)=>{
                price += parseFloat(val.price)
                data.items[key].weekday = moment(val.date).format('dddd');
            })*/

            console.log('price222',price,data.subscription_id)

            /*const token = await stripe.tokens.create({
                card: {
                    number: data.cardnumber.replace(/[ ]+/g, ""),
                    exp_month: data.exp_month,
                    exp_year: data.exp_year,
                    cvc: data.cvv
                }
            }).then(async (token)=>{
                await stripe.charges.create({
                    amount: parseInt(price * 100),
                    currency: 'inr',
                    source: token.id,
                    description: 'Subscription Payment sent by member id:'+data.member_id
                }).then(async (charge)=>{

                    console.log(charge)*/

                    let order_id = Math.round(+new Date()/1000)

                    /*
                    let doc = {
                        order: data.items,
                        total: price,
                        order_id: Math.round(+new Date()/1000),
                        _created: new Date().toISOString()
                    } */

                    db.query('FOR u IN members FILTER u._key == "'+data.member_id+'" UPDATE u WITH { subscription_id: "'+data.subscription_id+'" } IN members RETURN NEW', async (customer_data)=>{

                        //console.log('customer_data', customer_data)

                        if(customer_data.length>0){

                            const token = await stripe.tokens.create({
                                card: {
                                    number: data.cardnumber.replace(/[ ]+/g, ""),
                                    exp_month: data.exp_month,
                                    exp_year: data.exp_year,
                                    cvc: data.cvv
                                }
                            }).then(async (token)=>{

                            await stripe.customers.create({
                                    source: token.id,
                                    name: customer_data[0].name,
                                    description: '',
                                    address: {"city": 'Manchester', "country": 'GB', "line1": "28 Queen St, Manchester M2 5HX, UK", "line2" : "", "postal_code" : '', "state" : 'Manchester'},
                                    email: customer_data[0].email
                                  }).then(async (customer) => {
                                    console.log('customercustomer',customer)



                                    /*const schedule = await stripe.subscriptionSchedules.create({
                                      customer: customer.id,
                                      start_date: 'now',
                                      end_behavior: 'release',
                                      phases: [
                                        {
                                          items: [{ price: data.subscription_id, quantity: 1 }],
                                          iterations: 12,
                                        },
                                      ],
                                    }).then(async (subscriptionSchedules) => {
                                            console.log('subscriptionSchedules',subscriptionSchedules);


                                        })*/


                                    await stripe.subscriptions.create({
                                          customer: customer.id,
                                          items: [
                                            {
                                              plan: data.subscription_id
                                            }
                                          ]
                                        }).then(async (detail) => {
                                            console.log('subscription deeeetails',detail)

                                        
                                            let charge = detail


                                            /*await stripe.subscriptionSchedules.create({
                                              from_subscription: charge.id
                                            });*/



                                            /*const schedule = await stripe.subscriptionSchedules.create({
                                      customer: customer.id,
                                      start_date: 'now',
                                      end_behavior: 'release',
                                      phases: [
                                        {
                                          items: [{ price: data.subscription_id, quantity: 1 }],
                                          iterations: 12,
                                        },
                                      ],
                                    }).then(async (subscriptionSchedules) => {
                                            console.log('subscriptionSchedules',subscriptionSchedules);


                                        })*/

                       


                                            let date = moment().toISOString(),
                                            transaction = {
                                              //"items": data.items,
                                              "transaction_id": order_id,
                                              "stripe_transcation_id": charge.id,
                                              "stripe_member_subscription_id": charge.id,
                                              "total": price,
                                              "type": 'Member subscription Payment',
                                       
                                              "status": "complete",
                                              "method": "stripe",
                                              "member_id": data.member_id,                      
                                              "subscription_id": data.subscription_id,                      
                                              "free_seats": data.free_seats,                      
                                              "item_total": price,
                                              "temp":"true",
                                              "_created": date,
                                              "_updated": date
                                            }

                                            db.query('INSERT '+JSON.stringify(transaction)+' INTO member_transactions', (data)=>{
                                            })


                                            let start_date = moment().toISOString(),
                                            end_date = moment(start_date).add(1, 'months').toISOString(),
                                            subscribe_data = {
                                              //"items": data.items,
                                              "transaction_id": order_id,
                                              "stripe_transcation_id": charge.id,                      
                                              "stripe_member_subscription_id": charge.id,
                                              "member_id": data.member_id,                      
                                              "subscription_id": data.subscription_id,                      
                                              "free_seats": data.free_seats,                      
                                              "pending": data.free_seats,                      
                                              "item_total": price,                     
                                              "start_date": start_date,                     
                                              "end_date": end_date,                     
                                              "_created": date,
                                              "_updated": date
                                            }
                                            db.query('INSERT '+JSON.stringify(subscribe_data)+' INTO membership_cycle', (data)=>{
                                            })



                                            resolve(charge);

                                    });
                            });

                        });
                    }


                    



                        
                    }) 


                /*}).catch((error)=>{
                    console.log(error.message)
                    reject(error.message);
                });
            }).catch((error)=>{
                console.log(error.message)
                reject(error.message);
            })*/

                  
            })

            
        },updatecycle: (data)=>{


            console.log('updatecycle',data)

            db.query('FOR u IN membership_cycle FILTER u.stripe_transcation_id == "'+data.data.object.id+'" RETURN u', async (cycle_data)=>{

            console.log('updatecycle-cycle_data',cycle_data)

                //db.query('FOR u IN members FILTER u._key == "'+cycle_data.member_id+'" RETURN NEW', async (customer_data)=>{

                let order_id = Math.round(+new Date()/1000)
                
                let date = moment().toISOString()

                let start_date = moment().toISOString(),
                end_date = moment(start_date).add(1, 'months').toISOString(),
                subscribe_data = {
                  //"items": data.items,
                  "transaction_id": order_id,
                  "stripe_transcation_id": data.id,                      
                  "stripe_member_subscription_id": data.id,
                  "member_id": cycle_data[0].member_id,                      
                  "subscription_id": cycle_data[0].subscription_id,                      
                  "free_seats": cycle_data[0].free_seats,                      
                  "pending": cycle_data[0].free_seats,                      
                  "item_total": cycle_data[0].item_total,                     
                  "start_date": start_date,                     
                  "end_date": end_date,                     
                  "_created": date,
                  "_updated": date
                }
                db.query('INSERT '+JSON.stringify(subscribe_data)+' INTO membership_cycle RETURN NEW', (updated)=>{

                    db.query('FOR a in members FILTER a._key == "'+cycle_data[0].member_id+'" RETURN a', (data2)=>{

                    let msg                       
                    msg = {
                        to: data2[0].email,
                        subject: 'Your Subscription recurring payment successfully paid!!',
                        text: "Thank you for payment, we have updated your subscription cycle for next month benefits.",
                       //button_text: 'Verify Email',
                       //button_url: config.backend_url+'/member/confirm/'+hash_email
                    }             

                    notification.email(msg)
                    // sendMail.sendMail(msg.to,msg.subject,msg.text,msg.subject, "new.ejs")
                    //resolve(data)

                })


                })

            })



        },cancel_subscription: (data)=>{

            console.log(data)
            console.log('FOR u IN membership_cycle FILTER u.stripe_transcation_id == "'+data.data.object.id+'"  SORT u._created DESC LIMIT 1 RETURN u')
            db.query('FOR u IN membership_cycle FILTER u.stripe_transcation_id == "'+data.data.object.id+'"  SORT u._created DESC LIMIT 1 RETURN u', async (cycle_data)=>{


                console.log(cycle_data)
                    db.query('FOR a in members FILTER a._key == "'+cycle_data[0].member_id+'"  RETURN a', (data2)=>{

                        console.log(data2)
                        if(data2.length>0){

                            let msg                       
                            msg = {
                                to: data2[0].email,
                                subject: 'Your subscription cancelled!!',
                                text: "Your subscription cancelled you will not get any benefits for next month regarding this membership.",
                               //button_text: 'Verify Email',
                               //button_url: config.backend_url+'/member/confirm/'+hash_email
                            }             

                            notification.email(msg)
                            // sendMail.sendMail(msg.to,msg.subject,msg.text,msg.subject, "new.ejs")



                        }
                    
                    //resolve(data)

                })
            })
        },subscription_created: (data)=>{

            console.log(data.object)
            console.log('FOR u IN membership_cycle FILTER u.stripe_transcation_id == "'+data.data.object.id+'"  SORT u._created DESC LIMIT 1 RETURN u')



            db.query('FOR u IN membership_cycle FILTER u.stripe_transcation_id == "'+data.data.object.id+'"  SORT u._created DESC LIMIT 1 RETURN u', async (cycle_data)=>{


                    console.log(cycle_data)


                    db.query('FOR a in members FILTER a._key == "'+cycle_data[0].member_id+'"  RETURN a', (data2)=>{

                    console.log(data2)
                    if(data2.length>0){
                        let msg                       
                        msg = {
                            to: data2[0].email,
                            subject: 'Your subscription has been created successfully!!',
                            text: "Thank you for payment, Your subscription has been created successfully you will get all benefits regarding this membership plan.",
                           //button_text: 'Verify Email',
                           //button_url: config.backend_url+'/member/confirm/'+hash_email
                        }             

                        notification.email(msg)
                        // sendMail.sendMail(msg.to,msg.subject,msg.text,msg.subject, "new.ejs")
                        //resolve(data)
                    }

                })
            })
        },subscription_schedule_created: (data)=>{

            console.log(data.object)
            console.log('FOR u IN membership_cycle FILTER u.stripe_transcation_id == "'+data.data.object.subscription+'"  SORT u._created DESC LIMIT 1 RETURN u')



            db.query('FOR u IN membership_cycle FILTER u.stripe_transcation_id == "'+data.data.object.subscription+'"  SORT u._created DESC LIMIT 1 RETURN u', async (cycle_data)=>{


                    console.log(cycle_data)


                    db.query('FOR a in members FILTER a._key == "'+cycle_data[0].member_id+'"  RETURN a', (data2)=>{

                    console.log(data2)
                    if(data2.length>0){
                        let msg                       
                        msg = {
                            to: data2[0].email,
                            subject: 'Your subscription payment is ready to pay!!',
                            text: "Your subscription subscription has been created successfully for this month. Keep sufficient balance in your bank account.",
                           //button_text: 'Verify Email',
                           //button_url: config.backend_url+'/member/confirm/'+hash_email
                        }             

                        notification.email(msg)
                        // sendMail.sendMail(msg.to,msg.subject,msg.text,msg.subject, "new.ejs")
                        //resolve(data)
                    }

                })
            })
        },

        getcycle: (id,member_id) => {

            console.log(id,member_id)

            return new Promise((resolve, reject) => {

                let today = moment().toISOString()

                console.log('today',today)

                db.query('FOR m IN membership_cycle FILTER m.subscription_id == "'+id+'" AND (m.member_id == "'+member_id+'" OR m.member_id == '+member_id+') AND (m.start_date<="'+today+'" AND m.end_date>="'+today+'") SORT m._created DESC RETURN m', (subs) => {

                    console.log(subs)
                    resolve(subs[0])
                })

            })

        },

        getMembers: (id) => {

            return new Promise((resolve, reject) => {

                db.query('FOR c IN customers FILTER c.membership.membership_id == "'+id+'" RETURN {name:c.name, _key:c._key, email:c.email, member_since:c.membership.started, subscription_id: c.membership.subscription_id}', (members) => {
                    resolve(members)
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
                    seats: data.seats,
                    currency: 'gbp',
                    active: product.active,
                    nickname: price.name,
                    recurring: {
                        interval: price.recurring.interval,
                        interval_count: price.recurring.interval_count,
                        trial_period_days: price.recurring.trial_period_days
                    }
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
                console.log('payloadpayload',payload)

                payload.active = payload.active === 'true' ? true : payload.active

                payload.unit_amount = parseFloat(data.price.toString().replace(/£/,''))*100
                payload._key = prices.id

                if (payload.deposit_amount){
                    payload.deposit_amount = payload.deposit_amount.replace(/£/,'')
                }

                await collection.update(payload,payload)

                resolve(prices)
            })

        },

        delete: (data) => {

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
        getMembershipFreeSeats: async (data) => {
            
            return new Promise( async (resolve, reject) => {
                db.query('FOR c IN membership_cycle FILTER c.member_id == "'+data+'" SORT c._updated DESC LIMIT 1 RETURN {start_date:c.start_date,pending:c.pending}', (members) => {
                    resolve(members)
                })
            //    resolve[{"sds":dsfdf}]
            })

        }


    }

    module.exports = member_subscriptions
