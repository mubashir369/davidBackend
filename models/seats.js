
    const db = require('../components/arango'),
        collection = db.db.collection('seats'),
        stripe = require('stripe')(config.stripe_secret_key)


    const seats = {

        all:(req) => {

            return new Promise(function(resolve, reject){
                db.query('FOR a in seats RETURN a', (data)=>{

                    resolve(data)

                })
            })

        },

        stripPayment:  (data, req)=>{

        return new Promise(async function(resolve, reject){

            console.log(data,config.stripe_secret_key)
            //console.log(data.cardnumber.replace(/[ ]+/g, ""))    

            let price = parseFloat(data.price) || 0



            let newitems = []

            data.items.map((val,key)=>{
                //price += parseFloat(val.price)
                data.items[key].weekday = moment(val.date).format('dddd');
            })

            //console.log('price',price)
            if(price>0){
            const token = await stripe.tokens.create({
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
                    description: 'Payment sent by userid:'+data.member_id
                }).then(async (charge)=>{

                    console.log(charge)

                    data.items.map((val,key)=>{                       
                        db.query('FOR u IN seats FILTER u._key == "'+val._key+'" UPDATE u WITH { seats: u.seats-1 } IN seats',(seats)=>{
                            
                        }) 
                    })

                    let doc = {
                        order: data.items,
                        total: price,
                        order_id: Math.round(+new Date()/1000),
                        _created: new Date().toISOString()
                    }

                    db.query('FOR u IN members FILTER u._key == "'+data.member_id+'" UPDATE u WITH { orders: PUSH(u.orders, '+JSON.stringify(doc)+'), selected_seats: '+JSON.stringify([])+' } IN members',(seats)=>{                    
                        }) 


                    data.free_seats = parseInt(data.free_seats)<0?0:parseInt(data.free_seats)

                    //update seats for subscription
                    db.query('FOR u IN membership_cycle FILTER u.subscription_id == "'+data.subscription_id+'" AND u.member_id == "'+data.member_id+'" SORT u._created DESC limit 1 UPDATE u WITH { pending:'+data.free_seats+'  } IN membership_cycle',(seats)=>{

                        console.log(seats)
                    })


                    let date = moment().toISOString(),
                    transaction = {
                      "items": data.items,
                      "transaction_id": doc.order_id,
                      "stripe_transcation_id": charge.id,
                      "total": price,
                      "type": 'Service Payment',
               
                      "status": "complete",
                      "method": "stripe",
                      "member_id": data.member_id,                      
                      "item_total": price,
                      "temp":"true",
                      "_created": date,
                      "_updated": date
                    }

                    db.query('INSERT '+JSON.stringify(transaction)+' INTO member_transactions', (data)=>{
                    })


                    resolve(charge);
                }).catch((error)=>{
                    console.log(error.message)
                    reject(error.message);
                });
            }).catch((error)=>{
                console.log(error.message)
                reject(error.message);
            })

        }else{


              data.items.map((val,key)=>{                       
                        db.query('FOR u IN seats FILTER u._key == "'+val._key+'" UPDATE u WITH { seats: u.seats-1 } IN seats',(seats)=>{
                            
                        }) 
                    })

                    let doc = {
                        order: data.items,
                        total: price,
                        order_id: Math.round(+new Date()/1000),
                        _created: new Date().toISOString()
                    }

                    db.query('FOR u IN members FILTER u._key == "'+data.member_id+'" UPDATE u WITH { orders: PUSH(u.orders, '+JSON.stringify(doc)+'), selected_seats: '+JSON.stringify([])+' } IN members',(seats)=>{
                            
                        }) 

                    data.free_seats = parseInt(data.free_seats)<0?0:parseInt(data.free_seats)

                    console.log('FOR u IN membership_cycle FILTER u.subscription_id == "'+data.subscription_id+'" AND u.member_id == "'+data.member_id+'" SORT u._created DESC limit 1 UPDATE u WITH { pending:'+data.free_seats+'  } IN membership_cycle')

                    //update seats for subscription
                    db.query('FOR u IN membership_cycle FILTER u.subscription_id == "'+data.subscription_id+'" AND u.member_id == "'+data.member_id+'" SORT u._created DESC limit 1 UPDATE u WITH { pending:'+data.free_seats+'  } IN membership_cycle',(seats)=>{

                        console.log(seats)
                    })


                    let date = moment().toISOString(),
                    transaction = {
                      "items": data.items,
                      "transaction_id": doc.order_id,
                      "stripe_transcation_id": null,
                      "total": price,
                      "type": 'Service Payment',
               
                      "status": "complete",
                      "method": "stripe",
                      "member_id": data.member_id,                      
                      "item_total": price,
                      "temp":"true",
                      "_created": date,
                      "_updated": date
                    }

                    db.query('INSERT '+JSON.stringify(transaction)+' INTO member_transactions', (data)=>{
                    })


                    resolve({'msg':'success'});



        }

                  
            })

            
        },
        find:(key) => {

            console.log(key)

            return new Promise(function(resolve, reject){
                db.query('FOR a in seats FILTER a._key == "'+key+'" RETURN a', (data)=>{

                    if (data.length > 0){
                        console.log(data)
                        resolve(data[0])
                    } else {
                        reject('Not found')
                    }

                })
            })

        },



        save:(data, req) => {

            return new Promise(function(resolve, reject){

                if (!data.price || !data.seats || (!data.date2 && !data.date)){
                    reject('Please enter values in all fields')
                    return
                } 
                
                let datee = data.date || data.date2

                if(data.repeat){

                    let curr = new Date(datee) 
                    const result = [];
                            console.log(curr)

                    if(data.repeat=='week'){

                        //let rtype = data.repeat=='week'?7:30

                        for (let i = 1; i <= 7; i++) {


                            let nextday = moment(datee).add(i-1, 'days').format('YYYY-MM-DD')


                              //let first = curr.getDate() - curr.getDay() + i 
                              //console.log(first)
                              //let day = new Date(curr.setDate(first)).toISOString().slice(0, 10)
                              //result.push(day) 
                            console.log('dateCopy',nextday);

                            let nobject = {price: data.price,seats: data.seats, date: nextday}             
                       
                            nobject._created = new Date().toISOString()                 
                            nobject._updated = new Date().toISOString()

                            console.log(nobject)
                            db.query('UPSERT {date:"'+nextday+'"} INSERT '+JSON.stringify(nobject)+' UPDATE '+JSON.stringify(nobject)+' IN seats RETURN NEW',(seats)=>{                           })                    

                        }

                    }else {

                        console.log(datee.split('-')[0], datee.split('-')[1])


                        const monthIndex = parseInt(datee.split('-')[1]) - 1;
                          const names = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
                          const date = new Date(parseInt(datee.split('-')[0]), monthIndex, 1);
                          while (date.getMonth() === monthIndex) {
                            date.setDate(date.getDate() + 1);
                            result.push(date.toISOString().split('T')[0]);
                            let day = date.toISOString().split('T')[0]
                            let nobject = {price: data.price,seats: data.seats, date: day}             
                       
                            nobject._created = new Date().toISOString()                 
                            nobject._updated = new Date().toISOString()
                            db.query('UPSERT {date:"'+day+'"} INSERT '+JSON.stringify(nobject)+' UPDATE '+JSON.stringify(nobject)+' IN seats RETURN NEW',(seats)=>{
                                
                            })


                          }

                      }

                        console.log(result)



                      





                    resolve([])





                }else {


                    let nobject = {price: data.price,seats: data.seats, date: datee}             
                       
                        nobject._created = new Date().toISOString()                 
                        nobject._updated = new Date().toISOString()
                        db.query('UPSERT {date:"'+datee+'"} INSERT '+JSON.stringify(nobject)+' UPDATE '+JSON.stringify(nobject)+' IN seats RETURN NEW',(seats)=>{
                            resolve(seats)
                        })

                }
               


            })

        },

        delete:(data, req) => {

            console.log(data,req.params.function)

            return new Promise(function(resolve, reject){

                db.query('LET doc = DOCUMENT("seats/'+req.params.function+'") REMOVE doc IN seats', (msg_data)=>{
                    console.log(msg_data)
                    resolve('done')
                })

            })

        },

        getDaysInMonth:(month, year) => {
          var date = new Date(year, month, 1);
          var days = [];
          while (date.getMonth() === month) {
            days.push(new Date(date));
            date.setDate(date.getDate() + 1);
          }
          return days;
        }

    }

    module.exports = seats
