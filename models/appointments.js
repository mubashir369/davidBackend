
    const db = require('../components/arango'),
          collection = db.db.collection('appointments'),
          async = require('async'),
          customers = require('./customers.js'),
          transactions = require('./transactions.js'),
          salon = require('./salon.js')
          const stripe = require("stripe")('sk_test_51HTjTEHfeWtaNgKZlpkON372lx2smnr0vQekEUslVH82VpnPG0TyDbZEM1CZh4Kq8F41ZjSGnbdBXl19p7wrsPSC00mxadrWdC');
          const config = require("../modules/config");
          const sendMail = require('../modules/sendMail');
          const moment = require('moment');

    const appointment = {

        find:(key) => {

            return new Promise(function(resolve, reject){
                db.query('FOR app IN appointments FILTER app._key == "'+key+'" LET linked = (FOR lnkd IN app.linked_appointments FOR a IN appointments FILTER a._key == lnkd RETURN a) LET cust = (FOR c IN customers FILTER c._key == app.customer_id RETURN c) LET staff = (FOR s IN staff FILTER s._key == app.staff_id RETURN s) RETURN LENGTH(linked) > 0 ? {appointments:linked, customer:cust[0], staff:staff[0]} : {appointments:[app], customer:cust[0]}', (data)=>{

                    if (data.length > 0){

                        data = data.map((item)=>{
                            item.start_time = moment(item.date)
                            item.end_time = moment(item.end_date)
                            item.duration = item.end_time.diff(item.start_time,'minutes')
                            item.start_time = item.start_time.format('HH:mm')
                            item.end_time = item.end_time.format('HH:mm')

                            return item
                        })

                        resolve(data)
                    } else {
                        reject('Appointment '+key+' Not found')
                    }

                })
            })

        },

        gettotal:(key) => {

            console.log(key)

            return new Promise(function(resolve, reject){
                let q=`FOR a in appointments FILTER (a.staff_id == "${key}" || a.staff_id == "${key}") && a.status != "deleted"  LET c = (FOR c IN customers FILTER c._key == a.customer_id  RETURN c) LET t = (FOR t IN transactions FILTER t.transaction_id == a.order_id and t.customer_id == a.customer_id RETURN t) FILTER LENGTH(t) > 0 COLLECT WITH COUNT INTO length RETURN length`
                db.query(q, (data)=>{
                    resolve(data[0])


                })
            })

        },
        getmemappoints:(key,data) => {
            // console.log(key,data.params.function)
            let staff_id = ''

            if(key.cust_id){
                staff_id = key.cust_id
            }else{
                staff_id = data.params.function
            }

            // console.log('staff_id',staff_id)
            let offset  = key.page?(key.page-1)*10:0

            let query;

            let servic_name = '';
            let status = '';
            let search = '';
            if(key.status){                      
                status += ' and t.status=="'+key.status+'"'
            }

            if(key.service){                            
                servic_name += ' and a.service_id=="'+key.service+'"'
            }

            if(key.search){                            
                servic_name += ` and a.service_name LIKE "%${key.search}%" || a.staff_name LIKE "%${key.search}%" || (FOR c IN customers  FILTER c._key == a.customer_id RETURN LOWER(c.email))LIKE LOWER(CONCAT("%${key.search}%")) `
                //search += ' and c.name[0].first LIKE "'+key.search+'"'
            }

            
            //query = 'FOR a in appointments FILTER a.staff_id == "'+staff_id+'" && a.status != "deleted" LET c = (FOR c IN customers FILTER c._key == a.customer_id RETURN c) SORT a._created DESC RETURN MERGE(a,{customer:c})'

            //FOR a in appointments FOR c IN customers FOR s IN staff FILTER a.staff_id == s._key && a.customer_id == c._key && DATE_COMPARE(a.date, DATE_ISO8601(DATE_NOW()), "years", "days") RETURN MERGE(a,{customer:c,staff:s})        

            query = 'FOR a in appointments FILTER (a.staff_id == "'+parseInt(staff_id)+'" || a.staff_id == "'+staff_id+'") && a.status != "deleted" '+servic_name+' LET c = (FOR c IN customers FILTER c._key == a.customer_id  RETURN c) LET t = (FOR t IN transactions FILTER t.transaction_id == a.order_id and t.customer_id == a.customer_id  '+status+' RETURN t) FILTER LENGTH(t) > 0 '    
            
            if(key.search){

            }
            

            if(key.sortby){
                var myarr = key.sortby.split("-");
                //console.log(myarr)               
                query += ' SORT a.'+myarr[0]+' '+myarr[1]
            }else {                
                query += ' SORT a._created DESC '
            }


            query += ' LIMIT '+offset+',10 RETURN MERGE(a,{customer:c,transactions:t})'
            // query += ' LIMIT '+offset+',10 RETURN {transactions:t}'

            //console.log(query)


            return new Promise(function(resolve, reject){
                db.query(query, (data)=>{
                    //console.log(data)
                   
                    
                    if(Object.keys(key).length>0){
                        let tquery = 'FOR a in appointments FILTER (a.staff_id == "'+parseInt(staff_id)+'" || a.staff_id == "'+staff_id+'") && a.status != "deleted" '+servic_name+' LET c = (FOR c IN customers FILTER c._key == a.customer_id  RETURN c) LET t = (FOR t IN transactions FILTER t.transaction_id == a.order_id and t.customer_id == a.customer_id  '+status+' RETURN t) FILTER LENGTH(t) > 0 COLLECT WITH COUNT INTO length RETURN length';
                        db.query(tquery, (total)=>{
                           
                            resolve({data:data,total:total[0]})
                            // resolve({data:data})
                        })
                    }else resolve(data)
                        })
                    })

        },

        all:(date, staff_id) => {

            if (!date || typeof date == 'object'){
                start_date = moment.utc().add(1, 'days').set({hours:0,minutes:0,seconds:0}).toISOString()
                end_date = moment().set({hours:0,minutes:0,seconds:0}).toISOString()

            } else {
                start_date = moment.utc(date,"YYYY-MM-DD").add(1, 'days').set({hours:0,minutes:0,seconds:0}).toISOString()
                end_date = moment.utc(date,"YYYY-MM-DD").set({hours:0,minutes:0,seconds:0}).toISOString()
            }

            let query

            if (typeof staff_id == 'string'){
                query = 'FOR a in appointments FILTER a.staff_id == "'+staff_id+'" && a.date <= "'+start_date+'" && a.end_date >= "'+end_date+'" && a.status != "deleted" LET c = (FOR c IN customers FILTER c._key == a.customer_id RETURN c) SORT a._created DESC RETURN MERGE(a,{customer:c})'
            } else {
                query = 'FOR a in appointments FILTER a.date <= "'+start_date+'" && a.end_date >= "'+end_date+'" && a.status != "deleted" LET c = (FOR c IN customers FILTER c._key == a.customer_id RETURN c) SORT a._created DESC RETURN MERGE(a,{customer:c})'
            }

            return new Promise(function(resolve, reject){
                db.query(query, (data)=>{

                    if (Array.isArray(data)){
                        data = data.map((item)=>{
                            item.start_time = moment(item.date)
                            item.end_time = moment(item.end_date)
                            item.duration = item.end_time.diff(item.start_time,'minutes')
                            item.start_time = item.start_time.format('HH:mm')
                            item.end_time = item.end_time.format('HH:mm')

                            if (!item.staff_id){
                                item.staff_id = '0000'
                            }
                            return item

                        })
                    }

                    resolve(data)

                })
            })


        },

        findWithoutCustomer:(key, staff) => {

            return new Promise(function(resolve, reject){
                let query = 'FOR a in appointments FILTER a._key == "'+key+'" && a.status != "deleted" RETURN a'

                if (staff && staff === true){
                    query = 'FOR a in appointments FILTER a._key == "'+key+'" && a.status != "deleted" LET staff = (FOR s IN staff FILTER s._key == a.staff_id RETURN s) RETURN MERGE(a,{stylist: staff})'
                }

                db.query(query, (appt_data) => {
                    resolve(appt_data[0])
                })
            })

        },

        findWithCustomerNote:(key) => {

            return new Promise(function(resolve, reject){
                db.query('FOR app IN appointments FILTER app._key == "'+key+'" LET cust = (FOR c IN customers FILTER c._key == app.customer_id RETURN {_key:c._key,name:c.name,avatar:c.avatar,note:c.note,email:c.email,tel:c.tel,email_bounce:c.email_bounce}) RETURN MERGE(app, {customer:cust[0]})', (data)=>{

                    if (data.length > 0){

                        data = data.map((item)=>{
                            item.start_time = moment(item.date)
                            item.end_time = moment(item.end_date)
                            item.duration = item.end_time.diff(item.start_time,'minutes')
                            item.start_time = item.start_time.format('HH:mm')
                            item.end_time = item.end_time.format('HH:mm')
                            return item
                        })

                        resolve(data[0])
                    } else {
                        reject('Not found')
                    }

                })
            })

        },

        findStaffFromClientAppts:(date, client_id) => {

            return new Promise(function(resolve, reject){
                db.query('FOR a IN appointments FILTER DATE_COMPARE(a.date, "'+date+'", "years", "days") && a.status != "deleted" && a.customer_id == "'+client_id+'" RETURN {staff_id:a.staff_id, service_name:a.service_name}', (data)=>{

                    resolve(data)


                })
            })

        },

        findStaffFromLinkedAppts:(key) => {

            return new Promise(async (resolve, reject) => {

                let appt_data
                try {
                    appt_data = await appointment.find(key)
                }
                catch(e){
                    reject('findStaffFromLinkedAppts: '+key+' not found')
                }


                if (appt_data && appt_data.length > 0 && appt_data[0].appointments){

                    let result = appt_data[0].appointments.map((appt,i)=>{
                        return {staff_id:appt.staff_id, service_name:appt.service_name}
                    })

                    resolve(result)

                } else {
                    resolve([])
                }
            })

        },

        findbystaff: (staff_id)=>{

            return new Promise(function(resolve, reject){
                
                db.query('FOR a in appointments FILTER a.staff_id == "'+staff_id+'" && a.status != "cancelled" LET customer = (FOR c IN customers FILTER c._key == a.customer_id RETURN c.name) LET member = (FOR s IN members FILTER s._key == a.staff_id RETURN KEEP(s,"_key","name","email","mem_services")) RETURN MERGE(a,{customer:customer,member:member})', (data)=>{
                    resolve(data)
                })
            })

        },
        findByOrderId: async(orderId)=>{
            return new Promise( async function(resolve, reject){

              await db.query(`for p in appointments filter p.order_id== ${orderId.id} return {"service_name":p.service_name,"staff_name":p.staff_name,"date":p.date,"end_date":p.end_date}`, (data)=>{
                if(data.length>0){
                    resolve(data)
                } 
                else{
                    resolve([]);
                }  
                })
            })

        },

        findbystaffanddate: (data2)=>{

            console.log(data2['id'])

            return new Promise(function(resolve, reject){
                //AND DATE_FORMAT(a.date, "%yyyy-%mm-%dd") <= "'+data2['date']+'"
                db.query('FOR a in appointments FILTER (a.staff_id == "'+parseInt(data2['id'])+'" || a.staff_id == '+data2['id']+') && "'+data2['date']+'" <= DATE_FORMAT(a.date, "%yyyy-%mm-%dd") AND DATE_FORMAT(a.date, "%yyyy-%mm-%dd") <= "'+data2['date']+'" && a.status != "cancelled" RETURN {start:a.date,end:a.end_date}', (data)=>{
                    console.log(data)
                    resolve(data)
                })
            })

        },

        findFutureAppointments: (date, staff_id)=>{

            return new Promise(function(resolve, reject){
                db.query('FOR a in appointments FILTER a.staff_id == "'+staff_id+'" && a.date > "'+date+'" && a.status != "deleted" RETURN a', (data)=>{
                    resolve(data)
                })
            })

        },

        findTodaysAppointments: ()=>{

            return new Promise(function(resolve, reject){
                db.query('FOR a in appointments FOR c IN customers FOR s IN staff FILTER a.staff_id == s._key && a.customer_id == c._key && DATE_COMPARE(a.date, DATE_ISO8601(DATE_NOW()), "years", "days") RETURN MERGE(a,{customer:c,staff:s})', (data)=>{

                    data.sort((a,b)=>{
                        return a._created.localeCompare(b._created)
                    })

                    let link_id = ''
                    data = data.filter((item,i)=>{

                        if (link_id == item.link_id){
                            return false
                        } else {
                            link_id = item.link_id
                            return true
                        }
                    })
                    resolve(data)
                })
            })

        },

        findCurrentAppointments: ()=>{

            return new Promise(function(resolve, reject){

                let start = moment().subtract(2, 'hour').utc().toISOString(),
                    end = moment().utc().add(2, 'hour').toISOString()

                db.query('FOR a in appointments FOR c IN customers FOR s IN staff FILTER a.staff_id == s._key && a.customer_id == c._key && a.status == "confirmed" && a.date >= "'+start+'" && a.date <= "'+end+'"  RETURN MERGE(a,{customer:c,staff:s})', (data)=>{

                    data.sort((a,b)=>{
                        return a._created.localeCompare(b._created)
                    })

                    let link_id = ''
                    data = data.filter((item,i)=>{

                        if (link_id == item.link_id){
                            return false
                        } else {
                            link_id = item.link_id
                            return true
                        }
                    })
                    resolve(data)
                })
            })

        },


        findAppointmentsWithStatus: (status)=>{

            return new Promise(function(resolve, reject){
                db.query('FOR a in appointments FOR c IN customers FOR s IN staff FILTER a.date >= DATE_ISO8601(DATE_NOW()) && a.staff_id == s._key && a.customer_id == c._key && a.status == "'+status+'" RETURN MERGE(a,{customer:c,staff:s})', (data)=>{

                    data.sort((a,b)=>{
                        return a.date.localeCompare(b.date)
                    })

                    let link_id = ''
                    data = data.filter((item,i)=>{

                        if (link_id == item.link_id){
                            return false
                        } else {
                            link_id = item.link_id
                            return true
                        }
                    })

                    resolve(data)
                })
            })

        },

        findAppointmentsWithCovid: (status)=>{

            return new Promise(function(resolve, reject){
                db.query('FOR a in appointments FOR c IN customers FOR s IN staff FILTER a.staff_id == s._key && a.customer_id == c._key && a.status == "deleted" && a.covid_cancel RETURN MERGE(a,{customer:c,staff:s})', (data)=>{

                    data.sort((a,b)=>{
                        return a.date.localeCompare(b.date)
                    })

                    let link_id = ''
                    data = data.filter((item,i)=>{

                        if (link_id == item.link_id){
                            return false
                        } else {
                            link_id = item.link_id
                            return true
                        }
                    })

                    resolve(data)
                })
            })

        },

        findClientPreviousAppointments: (data)=>{


            return new Promise(function(resolve, reject){

                if (!data.customer_id){
                    reject('No customer id supplied')
                    return
                }

                db.query('FOR a in appointments FOR s IN services FOR st IN staff FILTER a.customer_id == "'+data.customer_id+'" && a.status == "paid" && a.staff_id == st._key && a.service_id == s._key SORT a.date DESC LIMIT 6 RETURN {date:a.date, note:a.note, stylist:st, service:s,task_name: a.service_name}', (data)=>{

                    if (data && data.length > 0){

                        // let prev_date, prev_sid
                        //
                        // data = data.filter((appt)=>{
                        //
                        //     let curr_date = moment(appt.date)
                        //     if (!prev_date || !prev_date.isSame(curr_date,'day') && prev_sid != appt.service._key){
                        //         prev_date = curr_date
                        //         prev_sid = appt.service_id
                        //         return true
                        //     }
                        //
                        // })

                        resolve(data)

                    } else {
                        resolve([])
                    }

                })
            })

        },

        allWithoutCustomer:(date) => {

            if (!date || typeof date == 'object'){
                date = 'DATE_NOW()'
            } else {
                date = '"'+date+'"'
            }

            return new Promise(function(resolve, reject){
                db.query('FOR a in appointments FILTER DATE_COMPARE(a.date, '+date+', "years", "days") RETURN a', (data)=>{

                    resolve(data)

                })
            })


        },

        findEarliestLatest:(data, req) => {

            return new Promise(function(resolve, reject) {

                if (typeof data != 'object' || !data.date || !data.date.match(/Z$/) || !data.staff_id){
                    reject('Appt findEarliestLatest: incorrect data specified')
                    return false
                }

                db.query('LET appts = (FOR a IN appointments FILTER DATE_COMPARE(a.date,"'+data.date+'","years","days") && a.staff_id == "'+data.staff_id+'" && a.status != "deleted" SORT a.date ASC RETURN a) RETURN {earliest:appts[0].date, latest: appts[-1].end_date}',(data) => {
                    resolve(data)
                })

            })

        },

        addStaffAvailability:(data, req) => {

            return new Promise(async (resolve, reject) => {

                if (data.appointments && data.appointments.length > 0){

                    if (data.appointments[0].description == 'closed'){ // all availability cancelled for this day

                        data.appointments = data.appointments.map((appt)=>{

                            db.query('FOR a IN appointments FILTER DATE_COMPARE(a.date,"'+appt.date+'","years","days") && a.event_type == "staff_appointment" && a.description == "available" REMOVE a IN appointments RETURN a', async (appt_data) => {

                                resolve(appt_data)

                            })

                        })

                    } else if (data.appointments[0].description == 'not_available'){ // single staff member availability removed

                        data.appointments = data.appointments.map((appt)=>{

                            db.query('FOR a IN appointments FILTER DATE_COMPARE(a.date,"'+appt.date+'","years","days") && a.event_type == "staff_appointment" && a.description == "available" && a.staff_id == "'+appt.staff_id+'" REMOVE a IN appointments RETURN a', async (appt_data) => {

                                resolve(appt_data)

                            })

                        })

                    } else if (data.appointments[0].description == 'available'){

                        db.query('FOR a IN appointments FILTER a.date > "'+data.range.start+'" && a.date < "'+data.range.end+'" && a.description == "available" RETURN a', async (appt_data) => {

                            if (appt_data && appt_data.length > 0){

                                data.appointments = data.appointments.map((appt)=>{

                                    let existing = appt_data.find((item)=>{
                                        return item.staff_id == appt.staff_id && moment(item.date).isSame(moment(appt.date),'day')
                                    })
                                    if (existing && existing._key){
                                        appt._key = existing._key
                                    }
                                    return appt

                                })

                                await appointment.save(data, req)
                                resolve(data)

                            } else {

                                await appointment.save(data, req)
                                resolve(data)

                            }

                        })

                    } else {

                        await appointment.save(data, req)
                        resolve(data)

                    }

                } else if (data.type) {

                    if (data.type == 'available_start'){

                        db.query('FOR a IN appointments FILTER DATE_COMPARE(a.date,"'+data.date+'","years","days") && a.event_type == "staff_appointment" && a.description == "available" && a.staff_id == "'+data.staff_id+'" UPDATE a WITH {date: "'+data.date+'"} IN appointments RETURN NEW', async (appt_data) => {

                            if (appt_data && appt_data[0]){
                                resolve(appt_data)
                            } else {

                                let new_availability = {
                                      event_type: "staff_appointment",
                                      description: "available",
                                      staff_id: data.staff_id,
                                      date: data.date,
                                      end_date: moment(data.date).add(6,'hours'),
                                      customer_id: "available",
                                      paid: false
                                  }

                                  db.query('INSERT '+JSON.stringify(new_availability)+' IN appointments RETURN NEW', async (appt_data) => {
                                      resolve(appt_data)
                                  })

                            }

                        })

                    } else if (data.type == 'available_end'){

                        db.query('FOR a IN appointments FILTER DATE_COMPARE(a.date,"'+data.date+'","years","days") && a.event_type == "staff_appointment" && a.description == "available" && a.staff_id == "'+data.staff_id+'" UPDATE a WITH {end_date: "'+data.date+'"} IN appointments RETURN NEW', async (appt_data) => {
                            resolve(appt_data)
                        })

                    }

                }

            })

        },

        getStaffAvailability:(date, staff_id) => {

            return new Promise( async (resolve, reject) => {

                db.query('FOR a IN appointments FILTER DATE_COMPARE(a.date,"'+date+'","years","days") && a.event_type == "staff_appointment" && a.description == "available" && a.staff_id == "'+staff_id+'" RETURN a', async (appt_data) => {
                    resolve(appt_data)
                })

            })

        },

        staffAvailability:(date, staff_id) => {

            return new Promise( async (resolve, reject) => {
// console.log(date)

                let opening_times = await salon.isOpen(date)

                appointment.all(date, staff_id).then((appointments)=>{

                    let staff_availability = {
                        staff:{},
                        appointments:{},
                        slots:{},
                        opening_times: opening_times,
                        targets:['11:00','12:00','13:00']
                    }

                    async.eachSeries(appointments, (item,next)=>{

                        if (!staff_availability.staff[item.staff_id]){
                            staff_availability.staff[item.staff_id] = {}
                        }

                        if (item.event_type.match(/customer_appointment|staff_appointment/)){

                            if (item.event_type == 'staff_appointment' && item.description == 'available'){

                                staff_availability.staff[item.staff_id].open = moment(item.date).format('HH:mm')
                                staff_availability.staff[item.staff_id].close = moment(item.end_date).format('HH:mm')
                                next()

                            } else {

                                if (item.event_type == 'staff_appointment'){

                                    let moment_date = moment(date).set({hours:8,minutes:0,seconds:0}),
                                        end_date = moment(item.end_date),
                                        diff = end_date.diff(moment_date,'hours')

                                    if (diff > 8){
                                        staff_availability.staff[item.staff_id] = {
                                            start: item.date,
                                            end: item.end_date
                                        }
                                    }

                                }

                                if (!staff_availability.appointments[item.start_time]){
                                    staff_availability.appointments[item.start_time] = []
                                }

                                let slots = item.duration / 15,
                                    start_time = moment(item.date),
                                    end_time = moment(item.end_date),
                                    selected_date = moment(date),
                                    time
    // console.log(start_time.isSame(selected_date, 'date'), end_time.diff(selected_date,'minutes'))
                                if (end_time.diff(selected_date,'minutes') > 0){
                                    staff_availability.appointments[item.start_time].push({staff_id:item.staff_id, slots:slots})
                                } else {
                                    slots = 0
                                }

                                if (slots < 0){
                                    slots = 1
                                }
    // console.log(slots, start_time.format('llll'))
                                if (slots <= 0){
                                    next()
                                } else {

                                    for (var i=0; i<slots; i++){

                                        start_time = start_time.add(15,'minutes')
                                        time = start_time.format('HH:mm'),
                                        time_int = parseInt(start_time.format('HHmm')),
                                        ii = i+1

                                        if (i >= slots-1){
                                        //    staff_availability.appointments[time].push({promotion:2}) // last iteration after the appointment, add in a promoted slot
                                            next()
                                        } else {
                                            if (!staff_availability.appointments[time]){
                                                staff_availability.appointments[time] = []
                                            }
                                            staff_availability.appointments[time].push({staff_id:item.staff_id, slots:slots-ii})
                                        }

                                    }
                                }

                            }

                        } else if (item.event_type.match(/target_bookings/)){

                            let target_time = moment(item.date)

                            let target_before = target_time.subtract(1,'hour').format('HH:mm'),
                                target_after = target_time.add(2,'hour').format('HH:mm')

                            if (!staff_availability.staff[item.staff_id]){
                                staff_availability.staff[item.staff_id] = {}
                            }
                            staff_availability.staff[item.staff_id].targets = [
                                target_before,
                                target_time.subtract(1,'hour').format('HH:mm'),
                                target_after
                            ]

                            next()

                        } else if (item.event_type.match(/slot_promotion/)){

                            let promo_time = moment(item.date).format('HH:mm')

                            if (!staff_availability.staff[item.staff_id]){
                                staff_availability.staff[item.staff_id] = {}
                            }

                            if (!staff_availability.staff[item.staff_id].promotions){
                                staff_availability.staff[item.staff_id].promotions = {}
                            }
                            staff_availability.staff[item.staff_id].promotions[promo_time] = item.promotion

                            next()

                        } else {
                            next()
                        }

                    },
                    function(err){
                    //    console.log('done')
                        resolve(staff_availability)
                    })


                }).catch((err)=>{
                    console.log('Model Appointments: '+err)
                })

            })

        },

        getPromotions:(key, req) => {

            return new Promise(function(resolve, reject){

                let now = moment().toISOString()

                db.query('FOR a IN appointments FILTER a.date > "'+now+'" && a.event_type == "slot_promotion" && a.status != "deleted" RETURN {date: a.date, promotion:a.promotion, description: a.description, _key:a._key, end_date: a.end_date}',(data) => {
                    resolve(data)
                })

            })

        },

        getNote:(key, req) => {

            return new Promise(function(resolve, reject){

                db.query('LET appt = DOCUMENT("appointments/'+key+'") RETURN {note:appt.note, description: appt.description}',(data) => {
                    resolve({note:data[0].note,_key:key, description: data[0].description})
                })

            })

        },

        saveNote:(data, req) => {

            return new Promise(function(resolve, reject){

                db.query('LET appt = DOCUMENT("appointments/'+data._key+'") UPDATE appt WITH {note:"'+data.note+'"} IN appointments RETURN appt.note',(data) => {
                    resolve(data)
                })

            })

        },

        saveMemo:(data, req) => {

            return new Promise( async (resolve, reject) => {

                if (data.note && data.note.length > 0){
                    db.query('LET appt = DOCUMENT("appointments/'+data._key+'") UPDATE appt WITH {description:"'+data.note+'"} IN appointments RETURN appt.description',(data) => {
                        resolve(data)
                    })
                } else {
                    await appointment.delete(data._key)
                    resolve([])
                }

            })

        },

        delete:(key,req) => {

            return new Promise(function(resolve, reject){

                collection.document(key).then((doc) => {

                    doc.prev_status = doc.status+''
                    doc.status = 'deleted'
                    doc.confirm_id = ''
                    doc.link_id = 'deleted-'+Date.now()
                    doc._updated = moment().toISOString()

                    collection.update(doc, doc).then(
                        (data) => {

                            if (req.session && req.session.user){
                                appointment.addLog(doc._key,req.session.user,'Appointment deleted')
                            }

                            if (doc.prev_status == 'confirmed' && doc.event_type == 'appointment'){
                                let email_data = {
                                    date: moment(doc.date).format('Do MMMM [at] h:mma'),
                                    customer_id:doc.customer_id,
                                    method:'smsEmail'
                                }

                                notification.toCustomer('appointment_cancelled',email_data).then((email)=>{
                                    resolve('deleted')
                                }).catch((err)=>{
                                    resolve(err)
                                })
                            } else {
                                resolve('deleted')
                            }


                        },
                        err => {reject(err)}
                    )

                }).catch((err)=>{
                    reject(moment().format("DD/MM/YY HH:mm:ss")+' delete: ',err)
                })

            })

        },

        deleteLinked: (data, req) => {

            return new Promise( async (resolve, reject) => {

                let appts = await appointment.getLinked(data.link_id)

                for (let appt of appts){
                    await appointment.delete(appt._key, req)
                }

                resolve('deleted')

            })


        },

        chgstatus: (data, req) => {

            console.log(data)

            return new Promise( async (resolve, reject) => {

                collection.document(data._key).then((doc) => {

                    doc.prev_status = doc.status+''
                    doc.status = 'cancelled'
                    doc.confirm_id = ''
                    doc.link_id = moment().format("YYYYMMDD")+'-'+data.customer_id
                    doc._updated = moment().toISOString()

                    collection.update(doc, doc).then(
                        (data2) => {


                            db.query('FOR t IN transactions FILTER t.stripe_transcation_id == "'+data.stripe_transcation_id+'" UPDATE t WITH {status:"cancelled",cancelled_on:"'+moment().toISOString()+'"} IN transactions RETURN NEW', (dataaa)=>{
                                    console.log(dataaa)
                                })
                             // sending email for Appoinment Cancellation..
                             let msg = {
                                to: data.customer[0].email,
                                subject: 'Appoinment Status Update',
                                 text:`Your Appoinment for ${data.service_name} with ${data.staff_name} is cancelled`
                            }
                            sendMail.sendMail(data.customer[0].email,msg.subject,msg.text,msg.subject, "new.ejs")
                            notification.email(msg)

                            if (req.session && req.session.user){
                                appointment.addLog(doc._key,req.session.user,'Appointment cancelled')
                            }

                            if (doc.prev_status == 'confirmed' && doc.event_type == 'appointment'){
                                let email_data = {
                                    date: moment(doc.date).format('Do MMMM [at] h:mma'),
                                    customer_id:doc.customer_id,
                                    method:'smsEmail'
                                }

                                notification.toCustomer('appointment_cancelled',email_data).then((email)=>{
                                    resolve('deleted')
                                }).catch((err)=>{
                                    resolve(err)
                                })
                            } else {
                                resolve('deleted')
                            }


                        },
                        err => {reject(err)}
                    )

                }).catch((err)=>{
                    reject(moment().format("DD/MM/YY HH:mm:ss")+' delete: ',err)
                })

                

               /* let appts = await appointment.getLinked(data.link_id)

                for (let appt of appts){
                    await appointment.delete(appt._key, req)
                }

                resolve('deleted')*/

            })


        },
        changeStatus: async (data) => {
             return new Promise( async (resolve, reject) => {
            await db.query(` for c in transactions filter c._key=="${data._key}" UPDATE c WITH {status: "${data.order_status}"} IN transactions RETURN NEW`,async (dataaa)=>{
                //console.log(dataaa)
                resolve(dataaa)
            })
         // sending email for Appoinment Cancellation..
        //  let msg = {
        //     to: data.customer[0].email,
        //     subject: 'Appoinment Status Update',
        //      text:`Your Appoinment for ${data.service_name} with ${data.staff_name} is cancelled`
        // }
        // // sendMail.sendMail(data.customer[0].email,msg.subject,msg.text,msg.subject, "new.ejs")
        // notification.email(msg)
            })


        },

        chgfstatus: (data, req) => {

            console.log(data)

            return new Promise( async (resolve, reject) => {

                collection.document(data._key).then((doc) => {

                    doc.prev_status = doc.status+''
                    doc.status = 'cancelled'
                    doc.confirm_id = ''
                    doc.link_id = moment().format("YYYYMMDD")+'-'+data.customer_id
                    doc._updated = moment().toISOString()

                    collection.update(doc, doc).then(
                        (data2) => {


                            db.query('FOR t IN transactions FILTER t.stripe_transcation_id == "'+doc.stripe_transcation_id+'" UPDATE t WITH {status:"cancelled",cancelled_on:"'+moment().toISOString()+'"} IN transactions RETURN NEW', (dataaa)=>{
                                    console.log(dataaa)
                                })


                            db.query('FOR u IN member_transactions FILTER u.stripe_transcation_id == "'+doc.stripe_transcation_id+'" RETURN u', (mtranscation)=>{

                                mtranscation = mtranscation[0]

                                console.log("mtranscation",mtranscation)
                                db.query('FOR u IN members FILTER u._key == "'+mtranscation.member_id+'"  UPDATE u WITH { wallet: u.wallet - '+mtranscation.total+' } IN members RETURN u.wallet', (mwallet)=>{
                                    console.log('mwallet',mwallet)
                                })


                                db.query('FOR u IN customers FILTER u._key == "'+data.customer_id+'"  UPDATE u WITH { wallet: u.wallet + '+mtranscation.total+' } IN customers RETURN u.wallet', (cwallet)=>{
                                    console.log('cwallet',cwallet)
                                })


                            })


                            db.query('FOR c in customers FILTER c._key == "'+data.customer_id+'" RETURN c', (customer)=>{
                                // sending email for Appoinment Cancellation..
                                let msg = {
                                    to: customer[0].email,
                                    subject: 'Appoinment Status Update',
                                    text:`Your Appoinment for ${doc.service_name} with ${doc.staff_name} is cancelled`
                                }
                                // notification.email(msg)
                                sendMail.sendMail(msg.to,msg.subject,msg.text,msg.subject, "new.ejs")
                            })
                            if (req.session && req.session.user){
                                appointment.addLog(doc._key,req.session.user,'Appointment cancelled')
                            }

                            if (doc.prev_status == 'confirmed' && doc.event_type == 'appointment'){
                                let email_data = {
                                    date: moment(doc.date).format('Do MMMM [at] h:mma'),
                                    customer_id:doc.customer_id,
                                    method:'smsEmail'
                                }

                                notification.toCustomer('appointment_cancelled',email_data).then((email)=>{
                                    resolve('deleted')
                                }).catch((err)=>{
                                    resolve(err)
                                })
                            } else {
                                resolve('deleted')
                            }


                        },
                        err => {reject(err)}
                    )

                }).catch((err)=>{
                    reject(moment().format("DD/MM/YY HH:mm:ss")+' delete: ',err)
                })

                

               /* let appts = await appointment.getLinked(data.link_id)

                for (let appt of appts){
                    await appointment.delete(appt._key, req)
                }

                resolve('deleted')*/

            })


        },

        makeLog: (req,msg) => {

            let user = {},
                date = moment().toISOString()

            if (req && req.session && req.session.user && req.session.user.name && req.session.user.name.first && req.session.user.name.last){
                user = {
                    name: req.session.user.name.first+' '+req.session.user.name.last,
                    _key: req.session.user._key,
                    _id: req.session.user._id,
                    email: req.session.user.email,
                    guard: req.session.user.guard
                }
            }

            return new Promise((resolve, reject) => {

                if (typeof msg == 'object'){

                    let log = msg.map((item)=>{

                        return {
                            date: date,
                            user: user,
                            log: item
                        }

                    })

                    resolve(log)

                } else {
                    let log = {
                        date: date,
                        user: user,
                        log: msg
                    }
                    resolve(log)
                }


            })

        },

        addLog: (key, user, log) => {

            return new Promise(function(resolve, reject) {

                let date = moment().tz('Europe/London')

                date = date.toISOString()

                collection.document(key).then((doc)=>{

                    if (!doc.log){
                        doc.log = []
                    }

                    let payload = {
                        date:date,
                        user:{},
                        log:log
                    }

                    if (user && user._key){
                        payload.user = {
                            name: user.name.first+' '+user.name.last,
                            _key: user._key,
                            _id: user._id,
                            email: user.email,
                            guard: user.guard
                        }
                    }

                    doc.log.push(payload)

                    doc._updated = date

                    collection.update(doc, doc).then(()=>{
                        resolve(doc)
                    }).catch((err)=>{
                        reject('Not Saved')
                    })

                }).catch(()=>{
                    reject(moment().format("DD/MM/YY HH:mm:ss")+' addLog: Appt '+key+' Not Found')
                })

            })

        },

        markLinkedAsPaid:(link_id) => {

            return new Promise(async (resolve, reject) => {

                if (link_id){
                    db.query('FOR a IN appointments FILTER a.link_id == "'+link_id+'" UPDATE a WITH {status:"paid",paid:"'+moment().toISOString()+'"} IN appointments RETURN NEW', (appt_data)=>{
                        resolve(appt_data)
                    })
                } else {
                    reject(moment().format("DD/MM/YY HH:mm:ss")+' markLinkedAsPaid: No keys provided')
                }

            })

        },

        paid:(key)=>{

            return new Promise(async (resolve, reject) => {

                if (typeof key == 'object'){

                    for (let appt of key){

                        if (appt.note){
                        //    customer.addNote(key[i].customer_id,key[i].note)
                        }

                        db.query('LET a = DOCUMENT("appointments/'+appt.appointment_id+'") UPDATE a WITH {status:"paid"} IN appointments RETURN NEW', (appt_data)=>{

                        })

                    }

                    resolve('done')

                } else {

                    db.query('LET a = DOCUMENT("appointments/'+key+'") UPDATE a WITH {status:"paid"} IN appointments RETURN NEW', (appt_data)=>{
                        resolve(appt_data)
                    })

                }

            })

        },

        getConfirm:(status)=>{

            return new Promise( async (resolve, reject) => {

                db.query('FOR a IN appointments FILTER a.confirm_id == '+status+' || a.confirm_id == "'+status+'" RETURN a', (confirm_appts) => {

                    if (confirm_appts && confirm_appts.length > 0){

                        db.query('FOR a IN appointments FOR c IN customers FOR s IN services FILTER a.link_id == "'+confirm_appts[0].link_id+'" && a.customer_id == c._key && a.service_id == s._key SORT a.date ASC RETURN MERGE(a,{customer:c, service:s})', (appt_data)=>{

                            if (appt_data && appt_data[0]){
                                resolve(appt_data)
                            } else {
                                reject('Not found')
                            }

                        })

                    } else {
                        reject('Confirmation id: '+status+' Not found')
                    }

                })

            })

        },

        confirm:(confirm_id, req)=>{ // customer confirmation

            if (typeof confirm_id == 'object'){
                confirm_id = confirm_id.confirm_id
            }

            return new Promise( async (resolve, reject) => {

                let date = moment().toISOString(),
                    log = await appointment.makeLog(req, 'Customer accepted terms and conditions and confirmed appointment')

                    db.query('FOR a IN appointments FILTER a.confirm_id == '+confirm_id+' RETURN a', (confirm_appts) => {

                        if (confirm_appts && confirm_appts.length > 0){

                            db.query('FOR a IN appointments FILTER a.link_id == "'+confirm_appts[0].link_id+'" UPDATE a WITH {deposit_taken:"'+date+'", status:"confirmed",termsandconditions_accepted:"'+date+'",confirmed:"'+date+'",confirm_id:"",log:PUSH(a.log,'+JSON.stringify(log)+')} IN appointments SORT a.date ASC RETURN NEW', async (appt_data)=>{

                                try {
                                    appt_data[0].login_link = await customers.createAuthLink(confirm_appts[0].customer_id)
                                    events.trigger('appointment_confirmed_client',appt_data[0])
                                }

                                catch(e){

                                }

                                resolve(appt_data)

                            })

                        } else {
                            reject('appointments.js confirm: appt or customer not found')
                        }

                    })

            })

        },

        customerReschedule:(status, check, fee_paid, note)=>{

            return new Promise(function(resolve, reject){

                if (check){

                    db.query('FOR a IN appointments FILTER a.confirm_id == '+status+' || a.link_id == "'+status+'" RETURN a', (appt_data)=>{
                        resolve(appt_data)
                    })

                } else {

                    let payload = '{status:"reschedule",confirm_id:""}'

                    if (fee_paid == true){
                        payload = '{status:"reschedule",confirm_id:"",reschedule_fee_paid:"'+moment().toISOString()+'"}'
                    }

                    db.query('FOR a IN appointments FILTER a.confirm_id == '+status+' || a.link_id == "'+status+'" UPDATE a WITH '+payload+' IN appointments RETURN NEW', async (appt_data)=>{

                        // if (appt_data && appt_data[0] && appt_data[0].linked_appointments && appt_data[0].linked_appointments.length > 0){
                        //     for (var i in appt_data[0].linked_appointments){
                        //
                        //         let payload = '{status:"reschedule",confirm_id:""}'
                        //
                        //         if (fee_paid == true){
                        //
                        //             payload = '{status:"reschedule",confirm_id:"",reschedule_fee_paid:"'+moment().toISOString()+'"}'
                        //             await appointment.addLog(appt_data[0].linked_appointments[i],false,'Customer requested reschedule, 48 hour reschedule fee paid')
                        //
                        //         } else {
                        //             await appointment.addLog(appt_data[0].linked_appointments[i],false,'Customer requested reschedule')
                        //         }
                        //
                        //         db.query('FOR a IN appointments FILTER a._key == "'+appt_data[0].linked_appointments[i]+'" UPDATE a WITH '+payload+' IN appointments RETURN NEW', ()=>{})
                        //     }
                        // }

                        for (let appt of appt_data){
                            await appointment.addLog(appt._key,false,'Customer requested appointment change: '+note)
                        }

                        let cust_name = await customer.find(appt_data[0].customer_id,'c.name')
                        cust_name = view.functions.capitalise(cust_name.first+' '+cust_name.last)

                        let admin_msg = {
                            type: cust_name+' is requesting to change their appointment on '+moment(appt_data[0].date).format('HH:mm')+' at '+moment(appt_data[0].date).format('dddd Do MMM'),
                            msg: 'They have left the following information: '+note,
                            data: {
                                appointment_url: '/dashboard/calendar/'+moment(appt_data[0].date).format('YYYY/M/D')+'?appointment_id='+appt_data[0]._key,
                                customer_id: appt_data[0].customer_id
                            }
                        }
                        notification.broadcastToAdmins(admin_msg)

                        resolve(appt_data)

                    })

                }

            })

        },

        customerAmend: async (key) => {

            return new Promise( async (resolve, reject) => {
                let timestamp = moment().format('x'),
                    appt = await collection.document({_key: key})

                if (appt && appt.link_id){
                    db.query('FOR a IN appointments FILTER a.link_id == "'+appt.link_id+'" UPDATE a WITH {confirm_id: "'+timestamp+'"} IN appointments SORT NEW.date ASC RETURN NEW', (appt_data)=>{
                        if (appt_data.length > 0){
                            resolve(appt_data)
                        } else {
                            reject([])
                        }
                    })
                } else {
                    reject([])
                }

            })

        },

        customerCancel:(status,check,fee_paid)=>{

            return new Promise(function(resolve, reject){

                if (check){

                    db.query('FOR a IN appointments FILTER a.confirm_id == '+status+' || a.link_id == "'+status+'" RETURN a', (appt_data)=>{
                        resolve(appt_data)
                    })

                } else {

                    db.query('FOR a IN appointments FILTER a.confirm_id == '+status+' || a.link_id == "'+status+'" UPDATE a WITH {status:"cancelled",confirm_id:"",cancellation_fee_paid:"'+moment().toISOString()+'"} IN appointments RETURN NEW', async (appt_data)=>{

                        // if (appt_data && appt_data[0] && appt_data[0].linked_appointments && appt_data[0].linked_appointments.length > 0){
                        //     for (var i in appt_data[0].linked_appointments){
                        //
                        //         let payload = '{status:"cancelled",confirm_id:""}'
                        //
                        //         if (fee_paid == true){
                        //
                        //             payload = '{status:"cancelled",confirm_id:"",cancellation_fee_paid:"'+moment().toISOString()+'"}'
                        //             await appointment.addLog(appt_data[0].linked_appointments[i],false,'Customer requested cancellation, 48 hour cancellation fee paid')
                        //
                        //         } else {
                        //             await appointment.addLog(appt_data[0].linked_appointments[i],false,'Customer requested cancellation')
                        //         }
                        //
                        //         db.query('FOR a IN appointments FILTER a._key == "'+appt_data[0].linked_appointments[i]+'" UPDATE a WITH '+payload+' IN appointments RETURN NEW', ()=>{})
                        //     }
                        // }

                        for (let appt of appt_data){
                            await appointment.addLog(appt._key,false,'Customer requested cancellation')
                        }

                        let cust_name = await customer.find(appt_data[0].customer_id,'c.name')
                        cust_name = view.functions.capitalise(cust_name.first+' '+cust_name.last)

                        let admin_msg = {
                            msg:'Appointment at '+moment(appt_data[0].date).format('HH:mm')+' on '+moment(appt_data[0].date).format('dddd Do MMM')+' has been cancelled by the customer',
                            type: cust_name+' is requesting cancellation',
                            data: {
                                appointment_url: '/dashboard/calendar/'+moment(appt_data[0].date).format('YYYY/M/D')+'?appointment_id='+appt_data[0]._key,
                                customer_id: appt_data[0].customer_id
                            }
                        }
                        notification.broadcastToAdmins(admin_msg)

                        resolve(appt_data)

                    })

                }

            })

        },

        salonConfirm:(key, req, no_repeat)=>{

            return new Promise(async (resolve, reject) => {

                let log_msg = 'Appointment confirmed by client'

                if (req.session && req.session.user && req.session.user.guard){
                    if (req.session.user.guard != 'customer'){
                        log_msg = 'Appointment confirmed by salon'
                    }
                }

                let appt = await collection.document(key),
                    log = await appointment.makeLog(req, log_msg),
                    timestamp = Date.now()

                let customer = await customers.find(appt.customer_id, '{name: c.name, stripe_id:c.stripe_id, card_info:c.card_info, _key:c._key}')

                if (typeof customer == 'object' && customer.stripe_id){

                    db.query('FOR a IN appointments FILTER a.link_id == "'+appt.link_id+'" UPDATE a WITH {status:"confirmed", confirm_id:false, confirmed: "'+moment().toISOString()+'",log:PUSH(a.log, '+JSON.stringify(log)+')} IN appointments SORT a.date ASC RETURN NEW', async (appt_data)=>{

                        if (appt_data){

                            // let email_data = {
                            //         date: moment(appt_data[0].date).format('Do MMMM'),
                            //         time: moment(appt_data[0].date).format('h:mma'),
                            //         customer_id: appt.customer_id,
                            //         appointment_id: appt._key,
                            //         method: 'smsEmail'
                            //     }
                            //
                            appt_data[0].login_link = await customers.createAuthLink(appt.customer_id)
                            //
                            // notification.toCustomer('appointment_confirmed',email_data).then((data)=>{
                            //     resolve(appt_data)
                            // }).catch((err)=>{
                            //     reject(appt_data)
                            // })

                            events.trigger('appointment_confirmed', appt_data[0])
                            resolve(appt_data)

                        } else {
                            reject('Unable to mark appointments as confirmed')
                        }

                    })

                } else {

                    let payload = {
                        type: 'customer',
                        key: customer._key
                    }

                    let transaction = await transactions.newTransaction(payload)

                    payload = {
                        type: 'account',
                        cart_id:transaction.id
                    }

                    transaction = await transactions.addToCart(payload)
                    reject({error:'No card on file, deposit required to confirm this appointment',cart_id:transaction.id.replace(/cart\_/,'')})

                }

            })

        },

        sendConfirmation:(key, req, timestamp)=>{

            return new Promise(async (resolve, reject) => {

                let appt = await collection.document(key),
                    log = await appointment.makeLog(req, "Appointment confirmation sent from salon"),
                    timestamp = Date.now(),
                    confirmation_sent = moment().toISOString()

                db.query('FOR a IN appointments FILTER a.link_id == "'+appt.link_id+'" UPDATE a WITH {status:"unconfirmed", confirm_id:'+timestamp+', confirmation_sent:"'+confirmation_sent+'",log:PUSH(a.log, '+JSON.stringify(log)+')} IN appointments SORT a.date ASC RETURN NEW', async (appt_data)=>{

                    if (appt_data){

                        // let email_data = {
                        //         date: moment(appt_data[0].date).format('Do MMMM'),
                        //         time: moment(appt_data[0].date).format('h:mma'),
                        //         timestamp: timestamp,
                        //         customer_id: appt.customer_id,
                        //         appointment_id: appt._key,
                        //         method:'smsEmail'
                        //     }
                        //
                        // notification.toCustomer('confirm_appointment',email_data).then((data)=>{
                        //
                        //     db.query('FOR a IN appointments FILTER a.link_id == "'+appt.link_id+'" UPDATE a WITH {confirmation_sent:"'+confirmation_sent+'",log:PUSH(a.log, '+JSON.stringify(log)+')} IN appointments RETURN {_key:a._key,status:NEW.status}', async (appt_data)=>{
                        //         resolve(appt_data)
                        //     })
                        //
                        // }).catch((err)=>{
                        //     reject(appt_data)
                        // })

                        events.trigger('send_confirmation', appt_data)
                        resolve(appt_data)

                    } else {
                        reject('Unable to mark appointments as unconfirmed')
                    }

                })

            })

        },

        resendConfirmation:(key, req, timestamp)=>{

            return new Promise(async (resolve, reject) => {

                let appt = await collection.document(key),
                    log = await appointment.makeLog(req, "Appointment reminder sent from salon"),
                    timestamp = Date.now()

                db.query('FOR a IN appointments FILTER a.link_id == "'+appt.link_id+'" UPDATE a WITH {status:"unconfirmed", confirm_id:'+timestamp+'} IN appointments SORT a.date ASC RETURN {_key:a._key,status:NEW.status, date:a.date}', async (appt_data)=>{

                    if (appt_data){

                        let email_data = {
                                date: moment(appt_data[0].date).format('Do MMMM'),
                                time: moment(appt_data[0].date).format('h:mma'),
                                timestamp: timestamp,
                                customer_id: appt.customer_id,
                                appointment_id: appt._key,
                                method:'smsEmail'
                            }

                        notification.toCustomer('confirm_appointment',email_data).then((data)=>{

                            db.query('FOR a IN appointments FILTER a.link_id == "'+appt.link_id+'" UPDATE a WITH {confirmation_sent:"'+confirmation_sent+'",log:PUSH(a.log, '+JSON.stringify(log)+')} IN appointments RETURN {_key:a._key,status:NEW.status}', async (appt_data)=>{
                                resolve(appt_data)
                            })

                        }).catch((err)=>{
                            reject(appt_data)
                        })

                    } else {
                        reject('Unable to mark appointments as unconfirmed')
                    }


                })

            })

        },

        noShow:(key, req, linked)=>{

            return new Promise(async (resolve, reject) => {

                let appt = await collection.document(key),
                    log = await appointment.makeLog(req, "Customer didn't turn up for appointment")


                db.query('FOR a IN appointments FILTER a.link_id == "'+appt.link_id+'" UPDATE a WITH {status:"no_show", log:PUSH(a.log, '+JSON.stringify(log)+')} IN appointments RETURN {_key:a._key,status:NEW.status}', async (appt_data)=>{

                    if (appt.customer_id){
                        customer.addNoShow(appt.customer_id, req, appt.date)
                        link_id = appt.customer_id
                    }

                    transaction.newTransaction({type:'appointment',key:appt._key,cart_id:link_id}).then((redis)=>{
                        resolve(appt_data)
                    }).catch(err => {
                        resolve(appt_data)
                    })

                })

            })

        },

        link:(appt_keys, req) => {

            return new Promise(async (resolve, reject) => {

                let link = await collection.document(appt_keys.link),
                    link_to = await collection.document(appt_keys.link_to)

                if (link_to.status != 'paid' && link.status != 'paid' ){
                    link.link_id = link_to.link_id
                    link.link_id = link.link_id.replace(/\"|\\"/g,'')

                    let log = await appointment.makeLog(req,"Linked appointment to "+link_to._key)

                    if (!link.log){
                        link.log = []
                    }

                    link.log.push(log)

                    collection.update(link, link).then((appt_data)=>{
                        resolve(link.link_id)
                    }).catch((err)=>{
                        reject(err)
                    })
                } else {
                    reject('Unable to link to an appointent which has been paid for')
                }

            })

        },

        unlink:(key, req) => {

            return new Promise(async (resolve, reject) => {

                if (typeof key == 'object'){
                    key = key._key
                }

                let unlink = await collection.document(key),
                    link_id = unlink.link_id.split('-')


                unlink.link_id = link_id[0]+'-'+link_id[1]+'-'+Date.now()
                unlink.link_id = unlink.link_id.replace(/\"|\\"/g,'')

                let log = await appointment.makeLog(req,"Unlinked appointment")

                if (!unlink.log){
                    unlink.log = []
                }

                unlink.log.push(log)

                collection.update(unlink, unlink).then((appt_data)=>{
                    resolve(unlink.link_id)
                }).catch((err)=>{
                    reject(err)
                })

            })

        },

        getLinked:(link_id) => {

            return new Promise(async (resolve, reject) => {

                if (typeof link_id == 'object'){
                    link_id = link_id.link_id.replace(/\"|\\"/g,'')
                }

                db.query('FOR a IN appointments FOR c IN customers FILTER a.link_id == "'+link_id+'" && a.customer_id == c._key RETURN MERGE(a,{customer_name:c.name})', (appt_data)=>{
                    if (appt_data.length > 0){
                        resolve(appt_data)
                    } else {
                        reject("No appointments found for that link ID")
                    }
                })

            })

        },

        moveLinked: (data, req)=>{

            return new Promise(async (resolve, reject) => {

                let app = await collection.document(data._key),
                    new_link_id = await appointment.createLinkId(data.date, app.customer_id)

                data.link_id = new_link_id

                let new_app = await appointment.save(data, req)

                if (app && app.link_id){

                    let prev_date = app.date.split('T')[0],
                        new_date = data.date.split('T')[0]

                    db.query('FOR a IN appointments FILTER a.link_id == "'+app.link_id+'" UPDATE a WITH {date: SUBSTITUTE(a.date,"'+prev_date+'","'+new_date+'"),end_date: SUBSTITUTE(a.end_date,"'+prev_date+'","'+new_date+'"), link_id:"'+new_link_id+'"} IN appointments RETURN NEW', (appt_data)=>{
                         resolve(appt_data)
                    })

                } else {
                    resolve(new_app[0])
                }

            })

        },


        checkIn:(key, req)=>{

            return new Promise(async (resolve, reject) => {

                if (!key){
                    reject()
                    return
                }

                let appt,
                    status = "checked_in",
                    appt_payload = '{status:"'+status+'"}',
                    client

                // layout the appointment payload, to add to the linked appointments once a transaction has been created

                    if (typeof key == 'object'){
                        appt = await collection.document(key._key)
                    } else {
                        appt = await collection.document(key)
                    }

                    if (appt.status && appt.status == 'checked_in'){ // revert to previous status if already checked in
                        appt_payload = {
                            status:appt.prev_status,
                            prev_status:appt.status
                        }
                    } else if (key.status){
                        appt_payload = {
                            status:status,
                            prev_status:appt.status
                        }
                    }

                // create a transaction link id

                    if (appt.customer_id){
                        link_id = appt.customer_id

                        let client_collection = db.db.collection('customers')
                        client = await client_collection.document({_key: appt.customer_id})

                    }

                    if (appt.link_id){
                        link_id = appt.link_id
                    }

                // attempt to create a transaction

                if (appt.status != 'checked_in'){ // appointment isn't checked in, so creat a transaction and check it in

                    transaction.newTransaction({type:'appointment',key:appt._key,cart_id:link_id}).then( async (redis)=>{

                        var click_collect = false,
                            out_of_stock = []

                        // if the appointment doesn't have the checked in timestamp, it's a new check in, so send the welcome email and add the timestamp

                            if (!appt.checked_in){

                                events.trigger('check_in', appt)
                                appt_payload.checked_in = moment().toISOString()

                            }

                        // add in products from click and collect cart

                            if (redis && redis.id && typeof client == 'object' && client.click_collect_cart && client.click_collect_cart.items && client.click_collect_cart.items.length > 0){

                                click_collect = true

                                for (var item of client.click_collect_cart.items){

                                    let payload = {
                                        cart_id: redis.id,
                                        type: 'products',
                                        key: item._key
                                    }

                                    let item_name = item.name

                                    if (item.brand){
                                        item.name += '('+item.brand+')'
                                    }

                                    if (item.quantity > 1){

                                        let quantity = new Array(parseInt(item.quantity))

                                        for (var i of quantity){

                                            try {
                                                await transaction.addToCart(payload)
                                            }
                                            catch(err) {
                                                out_of_stock.push(item_name)
                                                continue
                                            }

                                        }

                                    } else {
                                        try {
                                            await transaction.addToCart(payload)
                                        }
                                        catch(err) {
                                            out_of_stock.push(item_name)
                                            continue
                                        }
                                    }

                                }

                            }

                        // Update the linked appointments and return the promise

                            db.query('FOR a IN appointments FILTER a.link_id == "'+appt.link_id+'" && a.status != "paid" && a.status != "deleted" UPDATE a WITH '+JSON.stringify(appt_payload)+' IN appointments RETURN {_key:a._key,status:NEW.status}', async (appt_data)=>{

                                if (appt_data && appt_data.length > 0){

                                    if (click_collect == true){
                                        appt_data[0].click_collect = true
                                    }

                                    if (out_of_stock.length > 0){

                                        appt_data[0].out_of_stock = out_of_stock

                                        let client_name = ''

                                        if (client && typeof client.name == 'object'){
                                            client_name = client.name.first+' '+client.name.last+': '
                                        }

                                        let msg = {
                                            type: client_name+'Click and collect items out of stock',
                                            msg: 'Client pre-ordered items which are now out of stock: '+out_of_stock.join(', '),
                                            data: {
                                                customer_id: client._key,
                                                appointment_url: '/dashboard/calendar/'+moment(appt_data[0].date).format('YYYY/MM/DD')+'?appointment_id='+appt_data[0]._key
                                            }
                                        }

                                        global.notification.salonNotification(msg)

                                    }

                                    resolve(appt_data)

                                } else {
                                    console.log('Model Appointments: Appointments for '+link_id+' have not been updated')
                                    reject()
                                }

                            })

                    }).catch((err)=>{
                        console.log('Model Appointments: Redis issue adding transaction '+link_id+':', err)
                        reject(err)
                    })

                } else if (appt.status == 'checked_in' && link_id){

                    // appointment is already checked in and the user is marking as 'not checked in'. Delete the transaction and update linked appts

                        db.query('FOR a IN appointments FILTER a.link_id == "'+appt.link_id+'" && a.status != "paid" && a.status != "deleted" UPDATE a WITH '+JSON.stringify(appt_payload)+' IN appointments RETURN {_key:a._key,status:NEW.status}', async (appt_data)=>{
                            if (appt_data && appt_data.length > 0){
                                resolve(appt_data)
                            } else {
                                console.log('Model Appointments: Server issue reverting status')
                                reject()
                            }
                        })

                } else {

                    // Reject any other issues

                    console.log('Model Appointments: Issue checking in '+appt._key+' - either appt status or link_id issue')
                    reject('Unable to check in')

                }

            })

        },

        createLinkId:(date, customer_id)=>{
            return new Promise((resolve, reject) => {
                if (!date || !customer_id){
                    reject('cant create link id')
                    return
                }
                let id = moment(date).format('YYYYMMDD')+'-'+customer_id
                resolve(id)
            })

        },

        getTotals: async (linked) => {

            if (Array.isArray(linked)){

                for (var key in linked){

                    let totals = await transactions.getTotal(linked[key]),
                        appt = await collection.document("appointments/"+linked[key])

                    if (totals && appt){
                        delete totals.items
                        appt.totals = totals
                        collection.update(appt, appt)
                    }


                }

            } else {

                let appts = await appointment.getLinked(linked)
                for (var appt in appts){

                    let totals = await transactions.getTotal(appts[appt]._key)

                    if (totals){
                        delete totals.items
                        appts[appt].totals = totals
                        collection.update(appts[appt], appts[appt])
                    }

                }

            }



        },
        setorder:(data)=>{



            return new Promise(async function(resolve, reject){                

                /*db.query('LET c = DOCUMENT("customers/'+data.key+'") UPDATE c WITH {orders: PUSH(c.orders, '+JSON.stringify(data.order)+'), true} IN customers RETURN NEW', (data2)=>{
                    console.log(data2)
                    if (data2.length>0){
                        resolve(data2)
                    } else {
                        resolve([])
                    }

                })*/

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


                        db.query('FOR c in customers FILTER c._key == "'+data.customer_id+'" UPDATE c WITH { member_array : PUSH(c.member_array, "'+data.staff_id+'",true)} IN customers RETURN NEW', (member)=>{

                            console.log(member,'membermembermembermembermember')

                        })


                        db.query('FOR u IN home_CMS FILTER u._key == "3785478" RETURN u', (data_per)=>{

                            let percentage = 0;

       
                            if(data_per.length>0 && data_per[0].service_commission_percentage && (data.commission===true || data.commission==='true')){
                                percentage = parseInt(data_per[0].service_commission_percentage);       
                                
                                //console.log('data.commission',data.commission)
                                //return;
    
                                    if(data.staff_id){
                                        let commission = parseInt(data.total)/100 * percentage
        
                                        let insert_data = {
                                            "created_to": 'admin',
                                            "member_id": data.staff_id,
                                            "amount": commission,
                                            "name": data.service_name,
                                            "Remarks": "Service Reference commission.",
                                            "_created": new Date().toISOString(),
                                        }
        
                                        db.query('INSERT '+JSON.stringify(insert_data)+' INTO wallet_transactions', (data)=>{
                                        })


                                        db.query('FOR u IN home_CMS FILTER u._key == "11607660" UPDATE u WITH { serviceWallet: u.serviceWallet + '+commission+' } IN home_CMS', (data)=>{
                                        })
        
                                        // db.query('FOR m IN members FILTER m._key == "'+val.member_id+'" UPDATE m WITH {wallet: m.wallet + '+commission+'} IN members RETURN NEW.wallet', (wallet)=>{
                                        //     console.log("wallet--wallet--",wallet)
                                        // })

                                        //data.total = data.total - commission
                                    }
   
                            }

                        })

                        //return;

                        db.query('INSERT '+JSON.stringify(data)+' INTO appointments RETURN NEW', (data2)=>{

                        console.log(data2)
                        if (data2){
                            const date1 = new Date(data.date);
                            const formattedDate = date1.toISOString().slice(0, 10).replace(/-/g, "");
                            const key = "date_" + formattedDate;
                            const formattedDate1 = date1.toISOString().slice(11, 16).replace(/-/g, "");
                            const key1 = formattedDate1;
                            console.log(`FOR slot IN slots
                            FILTER slot.member_data == '${data.staff_id}'
                            UPDATE slot WITH { ${key}: { ['${key1}']: null } } IN slots`)
                            db.query(`FOR slot IN slots
                            FILTER slot.member_data == '${data.staff_id}'
                            UPDATE slot WITH { ${key}: { ['${key1}']: null } } IN slots`,(data3)=>{
                                console.log("updated data")
                            })

                            

                let date = moment().toISOString(),
                    transaction = {
                      
                      "transaction_id": doc.order_id,
                      "stripe_transcation_id": charge.id,
                      "total": data.total,
                      "type": 'Appointment booking payment',
                      "sub_total": 0,
                      "tax": 0,
                      "delivery": 0,
                      "delivery_method": "",
                      "status": "complete",
                      "method": "stripe",
                      "customer_id": data.customer_id,
                      "member_id":data.staff_id,
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
                      "discount_data": data.discount_data,
                      "temp":"true",
                      "_created": date,
                      "_updated": date
                    }

                    db.query('INSERT '+JSON.stringify(transaction)+' INTO transactions', (data)=>{
                    })

                    let date2 = moment().toISOString(),
                    transaction2 = {
                      "transaction_id": doc.order_id,
                      "stripe_transcation_id": charge.id,
                      "total": data.total,
                      "type": 'Recived Booking Payment',
               
                      "status": "complete",
                      "method": "stripe",
                      "member_id": data.staff_id,                      
                      "item_total": data.total,
                      "temp":"true",
                      "_created": date2,
                      "_updated": date2
                    }

                    db.query('INSERT '+JSON.stringify(transaction2)+' INTO member_transactions', (data)=>{
                    })
                     //updating wallet for member....
                    db.query('FOR u IN members FILTER u._key =="'+transaction2.member_id+'" RETURN u.wallet', (data)=>{
                        console.log(data[0])
                        if(data[0] !==undefined || data[0]!==null){
                        console.log("inside if..")    
                            db.query('FOR u IN members FILTER u._key == "'+transaction2.member_id+'"  UPDATE u WITH { wallet: u.wallet + '+transaction2.item_total+' } IN members RETURN u.wallet', (data)=>{
                                console.log(data,"=== item total ",transaction2.item_total)
                            })
                        }
                        else{
                            db.query('FOR u IN members FILTER u._key == "'+transaction2.member_id+'"  UPDATE u WITH { wallet: '+transaction2.item_total+' } IN members RETURN u', (data)=>{
                            })
                        }
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
                        subject: 'Appoinment Confirmation.',
                         text:`Your Appoinment with ${data.staff_name} for ${data.service_name} is successfully Scheduled on ${startDate} between ${startTime} - ${endTime} `
                    }
                    // send notification to admin..
                     let msg2 = {
                        to: config.email.admin_to,
                        subject: 'Appoinment Confirmation.',
                         text:`An Appoinment with ${data.staff_name} for ${data.service_name} is successfully Scheduled on ${startDate} between ${startTime} - ${endTime} `
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
                    
                  } 

                  

                



            })

        },
        setorderWithWallet:(data)=>{



            return new Promise(async function(resolve, reject){                

                /*db.query('LET c = DOCUMENT("customers/'+data.key+'") UPDATE c WITH {orders: PUSH(c.orders, '+JSON.stringify(data.order)+'), true} IN customers RETURN NEW', (data2)=>{
                    console.log(data2)
                    if (data2.length>0){
                        resolve(data2)
                    } else {
                        resolve([])
                    }

                })*/

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


                        db.query('FOR c in customers FILTER c._key == "'+data.customer_id+'" UPDATE c WITH { member_array : PUSH(c.member_array, "'+data.staff_id+'",true)} IN customers RETURN NEW', (member)=>{

                        //     console.log(member,'membermembermembermembermember')

                        })


                        db.query('FOR u IN home_CMS FILTER u._key == "3785478" RETURN u', (data_per)=>{

                            let percentage = 0;

       
                            if(data_per.length>0 && data_per[0].service_commission_percentage && (data.commission===true || data.commission==='true')){
                                percentage = parseInt(data_per[0].service_commission_percentage);       
                                
                                //console.log('data.commission',data.commission)
                                //return;
    
                                    if(data.staff_id){
                                        let commission = parseInt(data.total)/100 * percentage
        
                                        let insert_data = {
                                            "created_to": 'admin',
                                            "member_id": data.staff_id,
                                            "amount": commission,
                                            "name": data.service_name,
                                            "Remarks": "Service Reference commission.",
                                            "_created": new Date().toISOString(),
                                        }
        
                                        db.query('INSERT '+JSON.stringify(insert_data)+' INTO wallet_transactions', (data)=>{
                                        })


                                        db.query('FOR u IN home_CMS FILTER u._key == "11607660" UPDATE u WITH { serviceWallet: u.serviceWallet + '+commission+' } IN home_CMS', (data)=>{
                                        })
        
                                        // db.query('FOR m IN members FILTER m._key == "'+val.member_id+'" UPDATE m WITH {wallet: m.wallet + '+commission+'} IN members RETURN NEW.wallet', (wallet)=>{
                                        //     console.log("wallet--wallet--",wallet)
                                        // })

                                        //data.total = data.total - commission
                                    }
   
                            }

                        })

                        //return;

                        db.query('INSERT '+JSON.stringify(data)+' INTO appointments RETURN NEW', (data2)=>{

                        console.log(data2)
                        if (data2){
                            const date1 = new Date(data.date);
                            const end = new Date(data.end_date);
                            const formattedDate = date1.toISOString().slice(0, 10).replace(/-/g, "");
                            const key = "date_" + formattedDate;
                            const formattedDate1 = date1.toISOString().slice(11, 16).replace(/-/g, "");
                            const formattedEnd = end.toISOString().slice(11, 16).replace(/-/g, "");
                            const key1 = formattedDate1;
                            const st1 = moment(formattedDate1, 'HH:mm');
                            const st2 = moment(formattedEnd, 'HH:mm');
                            const numIntervals = Math.ceil(st2.diff(st1, 'minutes') / 30);

                            const timesArray = Array.from({ length: numIntervals }, (_, i) =>
                            st1.clone().add(i * 30, 'minutes').format('HH:mm')
                            );
                            const arr ={}
                             timesArray.map((dt)=>{
                                arr[dt]=null
                            })

                            
                            console.log(`FOR slot IN slots
                            FILTER slot.member_data == '${data.staff_id}'
                            UPDATE slot WITH { ${key}: { ${JSON.stringify(arr)}  } IN slots`)
                            db.query(`FOR slot IN slots
                            FILTER slot.member_data == '${data.staff_id}'
                            UPDATE slot WITH { ${key}: ${JSON.stringify(arr)} } IN slots`,(data3)=>{
                                console.log("updated data")
                            })

                            

                let date = moment().toISOString(),
                    transaction = {
                      
                      "transaction_id": doc.order_id,
                      "stripe_transcation_id": "",
                      "total": data.total,
                      "type": 'Appointment booking payment',
                      "sub_total": 0,
                      "tax": 0,
                      "delivery": 0,
                      "delivery_method": "",
                      "status": "complete",
                      "method": "wallet",
                      "customer_id": data.customer_id,
                      "member_id":data.staff_id,
                      "payment": {
                        "vouchers": 0,
                        "account": 0,
                        "card": 0,
                        "wallet": data.total,
                        "bacs": 0,
                        "cash": 0,
                        "change": 0,
                        "payment_link": 0
                      },
                      "item_total": data.total,
                      "discount_data": data.discount_data,
                      "temp":"true",
                      "_created": date,
                      "_updated": date
                    }

                    db.query('INSERT '+JSON.stringify(transaction)+' INTO transactions', (data)=>{
                    })

                    let date2 = moment().toISOString(),
                    transaction2 = {
                      "transaction_id": doc.order_id,
                      "stripe_transcation_id": "",
                      "total": data.total,
                      "type": 'Recived Booking Payment',
               
                      "status": "complete",
                      "method": "wallet",
                      "member_id": data.staff_id,                      
                      "item_total": data.total,
                      "temp":"true",
                      "_created": date2,
                      "_updated": date2
                    }

                    db.query('INSERT '+JSON.stringify(transaction2)+' INTO member_transactions', (data)=>{
                    })
                     //updating wallet for member....
                    db.query('FOR u IN members FILTER u._key =="'+transaction2.member_id+'" RETURN u.wallet', (data)=>{
                        console.log(data[0])
                        if(data[0] !==undefined || data[0]!==null){
                        console.log("inside if..")    
                            db.query('FOR u IN members FILTER u._key == "'+transaction2.member_id+'"  UPDATE u WITH { wallet: u.wallet + '+transaction2.item_total+' } IN members RETURN u.wallet', (data)=>{
                                console.log(data,"=== item total ",transaction2.item_total)
                            })
                        }
                        else{
                            db.query('FOR u IN members FILTER u._key == "'+transaction2.member_id+'"  UPDATE u WITH { wallet: '+transaction2.item_total+' } IN members RETURN u', (data)=>{
                            })
                        }
                    })
                    // updating wallet for customer...
                    db.query(`
                    for p in customers filter p._key=='${data.customer_id}' update p with {wallet:p.wallet - ${data.total} } in  customers   
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
                        subject: 'Appoinment Confirmation.',
                         text:`Your Appoinment with ${data.staff_name} for ${data.service_name} is successfully Scheduled on ${startDate} between ${startTime} - ${endTime} `
                    }
                    // send notification to admin..
                     let msg2 = {
                        to: config.email.admin_to,
                        subject: 'Appoinment Confirmation.',
                         text:`An Appoinment with ${data.staff_name} for ${data.service_name} is successfully Scheduled on ${startDate} between ${startTime} - ${endTime} `
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
                    
                  } 

                  

                



            })

        },

        save:(data,req) => {

            return new Promise(async (resolve, reject) => {

                if (data.appointments && data.appointments.length > 0){ // new appointment

                    let linked = [],
                        first_appt_key,
                        timestamp = Date.now(),
                        status,
                        time,
                        unassigned = false

                    if (data.source.match(/salon/i)){
                        status = 'salon_confirmation'
                    } else {
                        status = 'unconfirmed'
                    }

                    async function parseAppointments(){

                        var i = 0

                        for (var appt of data.appointments){

                            if (appt.salon_confirmation && appt.salon_confirmation == 'true' || data.source.match(/salon/i)){ // && !data.source.match(/salon/i)){ // if salon confirmation is needed when booked online
                                status = 'salon_confirmation'
                            } else {
                                status = 'unconfirmed'
                            }

                            if (appt.event_type == 'memo'){
                                status = 'confirmed'
                            }

                            if (!appt.staff_id){
                                unassigned = true
                            }

                            let date = moment().toISOString()

                            appt.customer_id = data.customer_id
                            appt.paid = data.paid
                            appt.duration = 30
                            appt.source = data.source
                            appt.status = status
                            appt.confirm_id = timestamp
                            appt._created = date
                            appt._updated = date
                            appt.link_id = await appointment.createLinkId(data.selected_date, data.customer_id)

                            if (appt.date.match(/^[0-9][0-9]\:[0-9][0-9]$/)){ // if only a time is supplied, use the payload date
                                let time = appt.date.split(':')
                                appt.date = moment(data.selected_date).set({hours:time[0],minutes:time[1],seconds:0})
                            }

                            /*if (appt.end_date.match(/^[0-9][0-9]\:[0-9][0-9]$/)){ // if only a time is supplied, use the payload date
                                let time = appt.end_date.split(':')
                                appt.end_date = moment(data.selected_date).set({hours:time[0],minutes:time[1],seconds:0})
                            }*/

                            appt.end_date = moment(appt.date).add(30,'minutes').toISOString()


                            db.query('FOR c in customers FILTER c._key == "'+appt.customer_id+'" UPDATE c WITH { member_array : PUSH(c.member_array, "'+appt.staff_id+'",true)} IN customers RETURN NEW', (member)=>{

                                console.log(member,'membermembermembermembermember')
    
                            })

                            if (data.note){
                                appt.note = data.note
                            }

                            if (i == 0){

                                if (data.appointments.length == 1){
                                    await saveAppointment(appt, true, true,'1') // notify the customer and end
                                } else {
                                    await saveAppointment(appt, true, false,'2') // first, notify customer
                                }

                            } else if (i == data.appointments.length-1){
                                await saveAppointment(appt, false, true,'3') // last, resolve the promise
                            } else {
                                await saveAppointment(appt, false, false,'4') // just save all the rest
                            }
                            i++

                        }

                    }

                    await parseAppointments()

                    async function saveAppointment(appt, notify, end, idx) {

                        console.log('appt',appt)

                        await db.query('UPSERT {_key:"'+appt._key+'"} INSERT '+JSON.stringify(appt)+' UPDATE '+JSON.stringify(appt)+' IN appointments RETURN NEW', async (appt_data)=>{

                            linked.push(appt_data[0]._key)

                            if (req.session && req.session.user && req.session.user._key){
                                appointment.addLog(appt_data[0]._key,req.session.user,'Appointment created for '+moment(appt_data[0].date).utc().format('DD/MM/YYYY h:mma'))
                            } else {
                                appointment.addLog(appt_data[0]._key,false,'Appointment created online for '+moment(appt_data[0].date).utc().format('DD/MM/YYYY h:mma'))
                            }

                            if (appt_data.length > 0 && notify === true){

                                let reminder_date = moment(appt_data[0].date).utc()
                                reminder_date = reminder_date.subtract(48,'hours')

                                let email_data = {
                                    email_date: moment(appt_data[0].date).utc().format('Do MMMM'),
                                    start_time: moment(appt_data[0].date).utc().format('HH:mm'),
                                    timestamp: timestamp,
                                    customer_id: appt_data[0].customer_id,
                                    appointment_id: appt_data[0]._key
                                }

                                if (appt_data[0].status == 'unconfirmed' && !appt_data[0].source.match(/salon/i)){
                                    notification.toCustomer('confirm_appointment', email_data)
                                }

                                if (reminder_date.isAfter() && appt_data[0].event_type && appt_data[0].event_type == 'customer_appointment'){
                                    let reminder_data = {
                                        method: 'sms',
                                        date: moment(appt_data[0].date).utc().format('ddd Do MMM [at] HH:mm'),
                                        customer_id: appt_data[0].customer_id,
                                        appointment_id: appt_data[0]._key
                                    }
                                //    console.log(reminder_date.toISOString())
                                    notification.toCustomer('appointment_reminder', reminder_data, reminder_date.toISOString())
                                }

                                if (appt_data[0].source.match(/online/i)){

                                    let cust_name = await customer.find(appt_data[0].customer_id,'c.name')
                                    cust_name = view.functions.capitalise(cust_name.first+' '+cust_name.last)

                                    let admin_msg = {
                                        msg: '<b>'+cust_name+'</b> booked in at '+moment(appt_data[0].date).utc().format('HH:mm')+' on '+moment(appt_data[0].date).utc().format('dddd Do MMM'),
                                        type:'New Online Booking',
                                        data: {
                                            appointment_url: '/dashboard/calendar/'+moment(appt_data[0].date).utc().format('YYYY/M/D')+'?appointment_id='+appt_data[0]._key,
                                            customer_id: appt_data[0].customer_id
                                        }
                                    }

                                    if (unassigned === true){
                                        admin_msg.type = 'New Booking with unassigned appointments'
                                        admin_msg.msg += '.<br><br>There are unassigned appointments in this booking that need to be moved into the calendar. Click "View Appointment" below, and move the appointments from the unassigned column, to an available stylist.'
                                    }
                                    notification.broadcastToAdmins(admin_msg)
                                }

                                // check after 48 hours if confirmed with timestamp

                                // if with 48 hours send reminder 24hrs later

                                //    customer.checkRegistration(appt_data[0].customer_id)

                            }


                            if (data.appointments.length == linked.length){

                                appointment.getTotals(linked)
                                // await appointment.linkAppointments(linked)
                                // linked = []
                                resolve(data)

                            }

                        })

                    }

                } else if (data._key) {

                    let appt = await collection.document(data._key)

                    for (var obj of Object.keys(data)){
                        if (appt[obj] != data[obj]){
                            if (!obj.match('log')){
                                appt[obj] = data[obj]
                            }
                        }
                    }

                    //if (data.duration){
                        appt.end_date = moment(appt.date).add(30,'minutes').toISOString() //data.duration
                    //}

                    if (data.staff_id){
                        let staff = db.db.collection('staff')
                        await staff.document(data.staff_id).then((staff_data)=>{
                            if (staff_data.name.last){
                                appt.staff_name = staff_data.name.first+' '+staff_data.name.last
                            } else {
                                appt.staff_name = staff_data.name.first
                            }

                        })
                    }

                    if (appt.event_type == 'target_bookings'){
                        appt.description = 'Target Bookings '+moment(appt.date).format('HH:mm')
                    }

                //    if (data.link_id && data.link_id == 'false' || !appt.link_id){
                        appt.link_id = await appointment.createLinkId(appt.date,appt.customer_id)
                //    }

                    if (data.add_log && data.add_log.length > 0){

                        data.add_log = await appointment.makeLog(req, data.add_log)

                        if (!appt.log){
                            appt.log = []
                        }
                        appt.log = appt.log.concat(data.add_log)
                    //    appt = await collection.update(appt, appt)

                    }

                    collection.update(appt, appt).then((appt_data)=>{

            //        db.query('FOR a IN appointments FILTER a._key == "'+data._key+'" UPDATE a WITH '+JSON.stringify(data)+' IN appointments RETURN NEW', async (appt_data)=>{


                            appt.start_time = moment(appt.date)
                            appt.end_time = moment(appt.end_date)
                            appt.duration = appt.end_time.diff(appt.start_time,'minutes')
                            appt.start_time = appt.start_time.format('HH:mm')
                            appt.end_time = appt.end_time.format('HH:mm')

                        // if (appt_data && appt_data && appt_data[0].linked_appointments && appt_data[0].linked_appointments.length > 0 && !data.service_id){
                        //     for (var i in appt_data[0].linked_appointments){
                        //         data._key = appt_data[0].linked_appointments[i]
                        //         db.query('FOR a IN appointments FILTER a._key == "'+data._key+'" && a.status != "deleted" UPDATE a WITH '+JSON.stringify(data)+' IN appointments RETURN NEW', ()=>{})
                        //     }
                        // }
                        if (data.prev_start_time && appt.status == 'confirmed'){

                            let start_time = moment(appt.date),
                               prev_start_time = moment(data.prev_start_time, 'HH:mm'),
                               diff = start_time.diff(prev_start_time,'minutes'),
                               msg = {
                                   to: appt.customer_id,
                                   subject: 'Appointment Updated'
                               }

                               // log = 'Appointment start time updated from '+prev_start_time.format('h:mma')+' to '+start_time.format('h:mma')
                               // msg.text = 'Your appointment on '+moment(appt_data[0].date).format('Do MMMM')+' at '+prev_start_time.format('h:mma')+' has been moved to '+start_time.format('h:mma')
                               // msg.html = 'Your appointment on '+moment(appt_data[0].date).format('Do MMMM')+' at '+prev_start_time.format('h:mma')+' has been moved to '+start_time.format('h:mma')
                               //
                               // if (diff < 0){
                               //     diff = Math.abs(diff)
                               // }
                               //
                               // if (diff > 60){ // if the move difference is over an hour, send the confirmation
                               //     notification.email(msg)
                               // }

                        }

                        appointment.getTotals(appt.link_id)

                        resolve(appt)

                    }).catch(err =>{
                        console.log('Model Appointments: '+err)
                        reject(err)
                    })

                } else {
                    reject('Appointment(s) not saved, not enough data')
                }

            })

        },
        findByKey: async (key) => {
            

            return new Promise( async function(resolve, reject){
              
             await db.query(`FOR c in appointments FILTER c._key == "${key}"  RETURN c`, async (data)=>{

                    if (data.length > 0){
                        resolve(data[0])
                    } else {
                       resolve([])
                    }

                })
            })

        },

    }

    module.exports = appointment
