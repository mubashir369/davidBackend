
    const db = require('../components/arango'),
          collection = db.db.collection('appointments'),
          async = require('async')

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
                        reject('Not found')
                    }

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

                    data = data.map((item)=>{
                        item.start_time = moment(item.date)
                        item.end_time = moment(item.end_date)
                        item.duration = item.end_time.diff(item.start_time,'minutes')
                        item.start_time = item.start_time.format('HH:mm')
                        item.end_time = item.end_time.format('HH:mm')
                        return item
                    })
                    resolve(data)

                })
            })


        },

        findWithoutCustomer:(key) => {

            return new Promise(function(resolve, reject){
                db.query('FOR a in appointments FILTER a._key == "'+key+'" FILTER a.status != "deleted" RETURN a', (appt_data) => {
                    resolve(appt_data[0])
                })
            })

        },

        findWithCustomerNote:(key) => {

            return new Promise(function(resolve, reject){
                db.query('FOR app IN appointments FILTER app._key == "'+key+'" LET cust = (FOR c IN customers FILTER c._key == app.customer_id RETURN {_key:c._key,name:c.name,avatar:c.avatar,note:c.note}) RETURN MERGE(app, {customer:cust[0]})', (data)=>{

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
                let appt_data = await appointment.find(key)

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

        findFutureAppointments: (date, staff_id)=>{

            return new Promise(function(resolve, reject){
                db.query('FOR a in appointments FILTER a.staff_id == "'+staff_id+'" && a.date > "'+date+'" RETURN a', (data)=>{
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

                        let prev_date, prev_sid

                        data = data.filter((appt)=>{

                            let curr_date = moment(appt.date)
                            if (!prev_date || !prev_date.isSame(curr_date,'day') && prev_sid != appt.service._key){
                                prev_date = curr_date
                                prev_sid = appt.service_id
                                return true
                            }

                        })
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

        staffAvailability:(date, staff_id) => {

            return new Promise(function(resolve, reject){
// console.log(date)
                appointment.all(date, staff_id).then((appointments)=>{

                    let staff_availability = {
                        staff:{},
                        appointments:{},
                        slots:{},
                        targets:['11:00','12:00','13:00']
                    }

                    async.eachSeries(appointments, (item,next)=>{

                        if (item.event_type.match(/customer_appointment|staff_appointment/)){

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
                    console.log(err)
                })

            })

        },

        getNote:(key, req) => {

            return new Promise(function(resolve, reject){

                db.query('LET appt = DOCUMENT("appointments/'+key+'") RETURN appt.note',(data) => {
                    resolve({note:data[0],_key:key})
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

        delete:(key,req) => {

            return new Promise(function(resolve, reject){

                collection.document(key).then((doc) => {

                    doc.prev_status = doc.status+''
                    doc.status = 'deleted'
                    doc.confirm_id = ''
                    doc._updated = moment().toISOString()

                    let unlink_data = {
                        appt_1: key
                    }

                    appointment.unlinkLinkedAppointments(unlink_data).then(()=>{

                        collection.update(doc, doc).then(
                            (data) => {

                                appointment.addLog(doc._key,req.session.user,'Appointment deleted')

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
                        );

                    }).catch((err)=>{

                        console.log('Issue unlinking '+key+' during deletion')
                        reject(err)

                    })

                }).catch((err)=>{
                    reject(moment().format("DD/MM/YY HH:mm:ss")+' delete: ',err)
                })

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

        markLinkedAsPaid:(data) => {

            return new Promise(async (resolve, reject) => {

                if (data && data.length > 0){
                    for (let appt of data){
                        await appointment.paid(appt)
                    }
                    resolve('Paid')
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

            return new Promise(function(resolve, reject){

                db.query('FOR a IN appointments FOR c IN customers FOR s IN services FILTER a.confirm_id == '+status+' && a.customer_id == c._key && a.service_id == s._key SORT a.date ASC RETURN MERGE(a,{customer:c, service:s})', (appt_data)=>{

                    if (appt_data && appt_data[0]){
                        resolve(appt_data)
                    } else {
                        reject('Not found')
                    }

                })

            })

        },

        confirm:(confirm_id)=>{ // customer confirmation

            if (typeof confirm_id == 'object'){
                confirm_id = confirm_id.confirm_id
            }

            return new Promise(function(resolve, reject){

                let date = moment().toISOString(),
                    log = {
                        log: 'Customer confirmed with deposit',
                        date: date
                    }

                db.query('FOR a IN appointments FILTER a.confirm_id == '+confirm_id+' UPDATE a WITH {deposit_taken:"'+date+'", status:"confirmed",confirmed:"'+date+'",confirm_id:"",log:PUSH(a.log,'+JSON.stringify(log)+')} IN appointments SORT a.date ASC RETURN NEW', async (appt_data)=>{

                    let email_data = {
                            date: moment(appt_data[0].date).format('Do MMMM'),
                            time: moment(appt_data[0].date).format('h:mma'),
                            customer_id: appt_data[0].customer_id,
                            method:'smsEmail'
                        }

                    if (appt_data[0].status == 'confirmed'){
                        email_data.auth_link = await customer.createAuthLink(appt_data[0].customer_id)
                        notification.toCustomer('appointment_confirmed', email_data)
                    }

                    resolve(appt_data)

                })

            })

        },

        customerReschedule:(status,check,fee_paid)=>{

            return new Promise(function(resolve, reject){

                if (check){

                    db.query('FOR a IN appointments FILTER a.confirm_id == "'+status+'" RETURN a', (appt_data)=>{
                        resolve(appt_data)
                    })

                } else {

                    let payload = '{status:"reschedule",confirm_id:""}'

                    if (fee_paid == true){
                        payload = '{status:"reschedule",confirm_id:"",reschedule_fee_paid:"'+moment().toISOString()+'"}'
                    }

                    db.query('FOR a IN appointments FILTER a.confirm_id == "'+status+'" UPDATE a WITH '+payload+' IN appointments RETURN NEW', async (appt_data)=>{

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

                        let cust_name = await customer.find(appt_data[0].customer_id,'c.name')
                        cust_name = view.functions.capitalise(cust_name.first+' '+cust_name.last)

                        let admin_msg = {
                            msg:'Customer would like to move their appointment on '+moment(appt_data[0].date).format('HH:mm')+' at '+moment(appt_data[0].date).format('dddd Do MMM'),
                            type: cust_name+' is requesting reschedule',
                            data: {
                                url: '/dashboard/calendar/'+moment(appt_data[0].date).format('YYYY/M/D')+'?appointment_id='+appt_data[0]._key
                            }
                        }
                        notification.broadcastToAdmins(admin_msg)

                        resolve(appt_data)

                    })

                }

            })

        },

        customerAmend: async (key) => {

            return new Promise(function(resolve, reject) {
                let timestamp = moment().format('x')
                db.query('LET appt = DOCUMENT("appointments/'+key+'") FOR a IN appt.linked_appointments UPDATE a WITH {confirm_id:"'+timestamp+'"} IN appointments SORT NEW.date ASC RETURN NEW', (appt_data)=>{
                    if (appt_data.length > 0){
                        resolve(appt_data)
                    } else {
                        reject([])
                    }
                })
            })

        },

        customerCancel:(status,check,fee_paid)=>{

            return new Promise(function(resolve, reject){

                if (check){

                    db.query('FOR a IN appointments FILTER a.confirm_id == "'+status+'" RETURN a', (appt_data)=>{
                        resolve(appt_data)
                    })

                } else {

                    db.query('FOR a IN appointments FILTER a.confirm_id == "'+status+'" UPDATE a WITH {status:"cancelled",confirm_id:""} IN appointments RETURN NEW', async (appt_data)=>{

                        if (appt_data && appt_data[0] && appt_data[0].linked_appointments && appt_data[0].linked_appointments.length > 0){
                            for (var i in appt_data[0].linked_appointments){

                                let payload = '{status:"cancelled",confirm_id:""}'

                                if (fee_paid == true){

                                    payload = '{status:"cancelled",confirm_id:"",cancellation_fee_paid:"'+moment().toISOString()+'"}'
                                    await appointment.addLog(appt_data[0].linked_appointments[i],false,'Customer requested cancellation, 48 hour cancellation fee paid')

                                } else {
                                    await appointment.addLog(appt_data[0].linked_appointments[i],false,'Customer requested cancellation')
                                }

                                db.query('FOR a IN appointments FILTER a._key == "'+appt_data[0].linked_appointments[i]+'" UPDATE a WITH '+payload+' IN appointments RETURN NEW', ()=>{})
                            }
                        }

                        let cust_name = await customer.find(appt_data[0].customer_id,'c.name')
                        cust_name = view.functions.capitalise(cust_name.first+' '+cust_name.last)

                        let admin_msg = {
                            msg:'Appointment at '+moment(appt_data[0].date).format('HH:mm')+' on '+moment(appt_data[0].date).format('dddd Do MMM')+' has been cancelled by the customer',
                            type: cust_name+' is requesting cancellation',
                            data: {
                                url: '/dashboard/calendar/'+moment(appt_data[0].date).format('YYYY/M/D')+'?appointment_id='+appt_data[0]._key
                            }
                        }
                        notification.broadcastToAdmins(admin_msg)

                        resolve(appt_data)

                    })

                }

            })

        },

        salonConfirm:(key, req, no_repeat)=>{

            return new Promise(function(resolve, reject){

                collection.document(key).then(async (appt_data) => {

                    if (appt_data && !no_repeat){

                        appt_data.status = 'confirmed'
                        appt_data.confirmed = moment().toISOString()

                        if (appt_data.linked_appointments){
                            for (var appt_id of appt_data.linked_appointments){
                                await appointment.salonConfirm(appt_id,req,true)
                            }
                        }

                        collection.update(appt_data, appt_data).then(async ()=>{

                            let user = false,
                                log_msg = 'Appointment confirmed'

                            if (req.session && req.session.user && req.session.user._key){
                                user = req.session.user
                                if (req.session.user.guard && req.session.user.guard != 'customer'){
                                    log_msg = 'Appointment confirmed from salon'
                                }
                            }

                            appointment.addLog(appt_data._key,user,log_msg)

                            let timestamp = Date.now(),
                                email_data = {
                                    date: moment(appt_data.date).format('Do MMMM'),
                                    time: moment(appt_data.date).format('h:mma'),
                                    customer_id: appt_data.customer_id,
                                    appointment_id: appt_data._key,
                                    method: 'smsEmail'
                                }

                            email_data.auth_link = await customer.createAuthLink(appt_data.customer_id)

                            notification.toCustomer('appointment_confirmed',email_data)
                            resolve(appt_data.linked_appointments)

                        })

                    } else {

                        appt_data.confirmed = moment().toISOString()
                        appt_data.status = 'confirmed'
                        collection.update(appt_data, appt_data).then(()=>{
                            resolve()
                        })

                    }

                }).catch((err)=>{
                    reject(err)
                })

            })

        },

        sendConfirmation:(key, req, timestamp)=>{

            return new Promise(function(resolve, reject){

                collection.document(key).then((appt_data) => {

                    if (appt_data && !timestamp){

                        timestamp = Date.now()
                        let email_data = {
                                date: moment(appt_data.date).format('Do MMMM'),
                                time: moment(appt_data.date).format('h:mma'),
                                timestamp: timestamp,
                                customer_id: appt_data.customer_id,
                                appointment_id: appt_data._key,
                                method: 'smsEmail'
                            }

                        appt_data.confirmation_sent = moment().toISOString()

                        appt_data.confirm_id = timestamp
                        appt_data.status = 'unconfirmed'
                        collection.update(appt_data, appt_data).then(()=>{
                            let user = false,
                                log_msg = 'Appointment confirmation sent'
                            if (req.session && req.session.user && req.session.user._key){
                                user = req.session.user
                                if (req.session.user.guard && req.session.user.guard != 'customer'){
                                    log_msg = 'Appointment confirmation sent from salon'
                                }
                            }
                            appointment.addLog(appt_data._key,user,log_msg)

                            notification.toCustomer('confirm_appointment',email_data).then((data)=>{
                                resolve(appt_data.linked_appointments)
                            }).catch((err)=>{
                                reject(appt_data.linked_appointments)
                            })

                        })

                        if (appt_data.linked_appointments){
                            appt_data.linked_appointments.forEach((appt_id,i)=>{
                                appointment.sendConfirmation(appt_id,req,timestamp)
                            })
                        }

                    } else {

                        appt_data.confirmation_sent = moment().toISOString()
                        appt_data.confirm_id = timestamp
                        appt_data.status = 'unconfirmed'
                        collection.update(appt_data, appt_data)

                    }

                }).catch((err)=>{
                    reject(err)
                })

            })

        },

        resendConfirmation:(key, req, timestamp)=>{

            return new Promise(function(resolve, reject){

                collection.document(key).then((appt_data) => {

                    if (appt_data && !timestamp){

                        timestamp = Date.now()
                        let email_data = {
                                date: moment(appt_data.date).format('Do MMMM'),
                                time: moment(appt_data.date).format('h:mma'),
                                timestamp: timestamp,
                                customer_id: appt_data.customer_id,
                                appointment_id: appt_data._key,
                                method:'smsEmail'
                            }

                        notification.toCustomer('appointment_reminder',email_data).then((data)=>{

                            appt_data.reminder_sent = moment().toISOString()

                            appt_data.confirm_id = timestamp
                            appt_data.status = 'unconfirmed'
                            collection.update(appt_data, appt_data).then(()=>{
                                let user = false,
                                    log_msg = 'Appointment reminder sent'
                                if (req.session && req.session.user && req.session.user._key){
                                    user = req.session.user
                                    if (req.session.user.guard && req.session.user.guard != 'customer'){
                                        log_msg = 'Appointment reminder sent from salon'
                                    }
                                }
                                appointment.addLog(appt_data._key,user,log_msg)
                            })

                            if (appt_data.linked_appointments){
                                appt_data.linked_appointments.forEach((appt_id,i)=>{
                                    appointment.resendConfirmation(appt_id,req,timestamp)
                                })
                            }
                            resolve(appt_data.linked_appointments)

                        }).catch((err)=>{
                            reject(err)
                        })

                    } else {

                        appt_data.reminder_sent = moment().toISOString()
                        appt_data.confirm_id = timestamp
                        appt_data.status = 'unconfirmed'
                        collection.update(appt_data, appt_data)

                    }

                }).catch((err)=>{
                    reject(err)
                })

            })

        },

        noShow:(key, req, linked)=>{

            return new Promise(function(resolve, reject){

                collection.document(key).then(async (appt_data) => {

                    if (!linked && appt_data){

                        let link_id

                        if (appt_data.linked_appointments && appt_data.linked_appointments.length > 1){

                            for (let appt_id of appt_data.linked_appointments){
                                await appointment.noShow(appt_id,req,true)
                            }

                            appt_data.linked_appointments.sort((a,b)=>{
                                return a - b
                            })
                            link_id = appt_data.linked_appointments.join('_')

                        } else {
                            appt_data = await appointment.addLog(appt_data._key,req.session.user,"Customer didn't turn up for appointment")
                            appt_data.status = 'no_show'
                            collection.update(appt_data, appt_data)
                        }

                        if (appt_data.customer_id){
                            customer.addNoShow(appt_data.customer_id, req, appt_data.date)
                            link_id = appt_data.customer_id
                        }

                        transaction.newTransaction({type:'appointment',key:appt_data._key,cart_id:link_id}).then((redis)=>{
                            resolve('No Show registered. Transaction also added to checkout')
                        }).catch(err => {
                            resolve('No Show registered, however unable to add transaction to checkout. Please take payment manually')
                        })

                    } else {



                        appt_data = await appointment.addLog(key,req.session.user,"Customer didn't turn up for appointment")
                        appt_data.status = 'no_show'
                        collection.update(appt_data, appt_data)
                        resolve()
                    }

                }).catch((err)=>{
                    console.log('No show: ',err)
                    reject(err)
                })

            })

        },

        createLinkedAppointments: (appt_keys) => {

            return new Promise(async (resolve,reject)=>{

                let appt_1 = await collection.document(appt_keys.appt_1),
                    appt_2 = await collection.document(appt_keys.appt_2),
                    linked = []

                if (!appt_1.linked_appointments){
                    appt_1.linked_appointments = []
                    appt_1.linked_appointments.push(appt_1._key)
                }

                if (!appt_2.linked_appointments){
                    appt_2.linked_appointments = []
                    appt_2.linked_appointments.push(appt_2._key)
                }

                linked = appt_1.linked_appointments.concat(appt_2.linked_appointments)

                linked = linked.filter((v, i, a)=>{
                    return a.indexOf(v) === i && parseInt(v)
                })

                appointment.linkAppointments(linked).then((linked_data)=>{
                    resolve('Appointments Linked')
                }).catch((err)=>{
                    reject(err)
                })

            })

        },

        unlinkLinkedAppointments: (appt_keys) => {

            return new Promise(async (resolve,reject)=>{

                let appt = await collection.document(appt_keys.appt_1),
                    linked = []

                if (appt.linked_appointments && appt.linked_appointments.length > 0){

                    linked = appt.linked_appointments.splice(appt.linked_appointments.indexOf(appt_keys.appt_1),1)

                    linked = appt.linked_appointments.filter((v, i, a)=>{
                        return v != appt_keys.appt_1 && a.indexOf(v) === i && parseInt(v)
                    })

                    appt.linked_appointments = []
                    appt.linked_appointments.push(appt_keys.appt_1)

                    collection.update(appt,appt).then((appt_data)=>{ // save initial appt without the other linked

                        appointment.linkAppointments(linked).then((linked_data)=>{
                            resolve('Appointments Linked')
                        }).catch((err)=>{
                            reject(err)
                        })

                    }).catch((err)=>{
                        reject('Unable to break link: '+err)
                    })

                } else {
                    reject('This appointment is not currently linked')
                }

            })

        },

        linkAppointments:(appointment_ids)=>{

            return new Promise(async (resolve, reject) => {

                let data

                for (var i of appointment_ids){
                    data = {
                        linked_appointments: appointment_ids
                    }
                    await db.query('FOR a IN appointments FILTER a._key == "'+i+'" UPDATE a WITH '+JSON.stringify(data)+' IN appointments', ()=>{})
                }

                resolve()

            })

        },

        checkLinked:async(key) => {

            let appt_data = await collection.document(key)

            if (appt_data && !appt_data.linked_appointments){
                appt_data.linked_appointments = []
                appt_data.linked_appointments.push(key)

                await collection.update(appt_data, appt_data)

                return appt_data.linked_appointments

            } else if (appt_data && appt_data.linked_appointments){
                return appt_data.linked_appointments
            } else {
                return false
            }

        },

        checkIn:(key, req)=>{

            return new Promise(async (resolve, reject) => {

                if (!key){
                    reject()
                    return
                }

                let appt,
                    status = "checked_in",
                    appt_payload = '{status:"'+status+'"}'

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

                // ensures each appointment is linked, even if it's just linked to itself (legacy issue)

                    let linked = await appointment.checkLinked(key)

                    if (!linked){
                        reject('Unable to check in appointment, due to issues with links')
                        return false
                    }

                // create a transaction link id

                    if (appt.customer_id){
                        link_id = appt.customer_id
                    }

                    if (appt.linked_appointments){
                        appt.linked_appointments.sort((a,b)=>{
                            return a - b
                        })
                        link_id = appt.linked_appointments.join('_')
                    }

                // attempt to create a transaction

                if (appt.status != 'checked_in'){ // appointment isn't checked in, so creat a transaction and check it in

                    transaction.newTransaction({type:'appointment',key:appt._key,cart_id:link_id}).then((redis)=>{

                        // if the appointment doesn't have the checked in timestamp, it's a new check in, so send the welcome email and add the timestamp

                            if (!appt.checked_in){

                                let msg = {
                                        to: appt.customer_id,
                                        subject: 'Welcome to David Rozman: The Hair Experience',
                                        text: 'Welcome to David Rozman. Please sit down and relax, your experience will begin shortly.'
                                    }

                            //    notification.email(msg)

                                appt_payload.checked_in = moment().toISOString()

                            }

                        // Update the linked appointments and return the promise

                            db.query('LET appt = DOCUMENT("appointments/'+appt._key+'") FOR a IN appt.linked_appointments UPDATE a WITH '+JSON.stringify(appt_payload)+' IN appointments RETURN NEW', async (appt_data)=>{

                                if (appt_data && appt_data.length > 0){
                                    resolve(appt_data[0])
                                } else {
                                    console.log('Appointments for '+link_id+' have not been updated')
                                    reject()
                                }

                            })

                    }).catch((err)=>{
                        console.log('Redis issue adding transaction '+link_id+':', err)
                        reject(err)
                    })

                } else if (appt.status == 'checked_in' && link_id){

                    // appointment is already checked in and the user is marking as 'not checked in'. Delete the transaction and update linked appts

                        db.query('LET appt = DOCUMENT("appointments/'+appt._key+'") FOR a IN appt.linked_appointments UPDATE a WITH '+JSON.stringify(appt_payload)+' IN appointments RETURN NEW', async (appt_data)=>{
                            if (appt_data && appt_data.length > 0){
                                resolve(appt_data[0])
                            } else {
                                console.log('Appointments for '+link_id+' have not been updated')
                                reject()
                            }
                        })

                        // transaction.deleteCart('cart_'+link_id).then((redis)=>{
                        //
                        //     // Update the linked appointments and return the promise
                        //
                        //     db.query('LET appt = DOCUMENT("appointments/'+appt._key+'") FOR a IN appt.linked_appointments UPDATE a WITH '+JSON.stringify(appt_payload)+' IN appointments RETURN NEW', async (appt_data)=>{
                        //         if (appt_data && appt_data.length > 0){
                        //             resolve(appt_data[0])
                        //         } else {
                        //             console.log('Appointments for '+link_id+' have not been updated')
                        //             reject()
                        //         }
                        //     })
                        //
                        // }).catch((err)=>{
                        //     console.log('Redis issue deleting '+link_id+':', err)
                        //     reject(err)
                        // })

                } else {

                    // Reject any other issues

                    console.log('Issue checking in '+appt._key+' - either appt status or link_id issue')
                    reject('Unable to check in')

                }

            })

        },

        checkInOLD:(key, req)=>{

            return new Promise(async (resolve, reject) => {

                if (!key){
                    reject()
                    return
                }

                let status = "checked_in",
                    payload = '{status:"'+status+'"}'

                if (typeof key == 'object'){

                    if (key.status && key.status == 'checked_in'){
                        payload = '{status:"'+key.prev_status+'",prev_status:"'+key.status+'"}'
                    } else if (key.status){
                        payload = '{status:"'+status+'",prev_status:"'+key.status+'"}'
                    }
                    key = key._key

                }

                let linked = await appointment.checkLinked(key)

                if (!linked){
                    reject('Unable to link appointment')
                    return false
                }

                db.query('LET appt = DOCUMENT("appointments/'+key+'") FOR a IN appt.linked_appointments UPDATE a WITH '+payload+' IN appointments RETURN NEW', async (appt_data)=>{

                    if (!appt_data || !appt_data[0]){
                        reject('Not checked in, please try again')
                        return false
                    }

                    let appt = appt_data[0],
                        link_id = ''

                    if (appt.customer_id){
                        link_id = appt.customer_id
                    }

                    if (appt.linked_appointments){
                        appt.linked_appointments.sort((a,b)=>{
                            return a - b
                        })
                        link_id = appt.linked_appointments.join('_')
                    }

                    if (appt.status == 'checked_in' && !appt.checked_in){

                        let msg = {
                                to: appt.customer_id,
                                subject: 'Welcome to David Rozman: The Hair Experience',
                                text: 'Welcome to David Rozman. Please sit down and relax, your experience will begin shortly.'
                            }

                        notification.email(msg)

                        payload = '{checked_in:"'+moment().toISOString()+'"}'

                        db.query('LET appt = DOCUMENT("appointments/'+appt._key+'") FOR a IN appt.linked_appointments UPDATE a WITH '+payload+' IN appointments RETURN NEW',(new_data)=>{

                            console.log('new check in',appt._key,link_id)

                            transaction.newTransaction({type:'appointment',key:appt._key,cart_id:link_id}).then((redis)=>{
                                resolve(appt)
                            }).catch((err)=>{
                                reject(err)
                            })

                        })

                    } else if (appt.status == 'checked_in' && appt.checked_in){ // if the appointment has been checked in, just create a new transaction

                        console.log('already checked in',appt._key,link_id)
                        transaction.newTransaction({type:'appointment',key:appt._key,cart_id:link_id}).then((redis)=>{
                            resolve(appt)
                        }).catch((err)=>{
                            reject(err)
                        })

                    } else if (link_id) {
                        console.log('delete cart_'+link_id, appt)
                        await transaction.deleteCart('cart_'+link_id)
                        resolve(appt)
                    } else {
                        reject('Transaction not added: '+appt._key+', '+link_id)
                    }

                })

            })

        },

        save:(data,req) => {

            return new Promise(async (resolve, reject) => {

                if (data.appointments && data.appointments.length > 0){ // new appointment

                    let linked = [],
                        first_appt_key,
                        timestamp = Date.now(),
                        status,
                        time

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

                            let date = moment().toISOString()

                            appt.customer_id = data.customer_id
                            appt.paid = data.paid
                            appt.source = data.source
                            appt.status = status
                            appt.confirm_id = timestamp
                            appt._created = date
                            appt._updated = date

                            if (appt.date.match(/^[0-9][0-9]\:[0-9][0-9]$/)){ // if only a time is supplied, use the payload date
                                let time = appt.date.split(':')
                                appt.date = moment(data.selected_date).set({hours:time[0],minutes:time[1],seconds:0})
                            }

                            if (appt.end_date.match(/^[0-9][0-9]\:[0-9][0-9]$/)){ // if only a time is supplied, use the payload date
                                let time = appt.end_date.split(':')
                                appt.end_date = moment(data.selected_date).set({hours:time[0],minutes:time[1],seconds:0})
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

                        await db.query('UPSERT {_key:"'+appt._key+'"} INSERT '+JSON.stringify(appt)+' UPDATE '+JSON.stringify(appt)+' IN appointments RETURN NEW', async (appt_data)=>{

                            linked.push(appt_data[0]._key)

                            if (req.session && req.session.user && req.session.user._key){
                                appointment.addLog(appt_data[0]._key,req.session.user,'Appointment created')
                            } else {
                                appointment.addLog(appt_data[0]._key,false,'Appointment created online')
                            }

                            if (appt_data.length > 0 && notify === true){

                                let reminder_date = moment(appt_data[0].date).utc()
                                reminder_date = reminder_date.subtract(48,'hours')

                                let email_data = {
                                    email_date: moment(appt_data[0].date).format('Do MMMM'),
                                    start_time: moment(appt_data[0].date).format('HH:mm'),
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
                                        date: moment(appt_data[0].date).format('ddd Do MMM [at] HH:mm'),
                                        customer_id: appt_data[0].customer_id,
                                        appointment_id: appt_data[0]._key
                                    }

                                    notification.toCustomer('appointment_reminder', reminder_data, reminder_date.toISOString())
                                }

                                if (appt_data[0].source.match(/online/i)){

                                    let cust_name = await customer.find(appt_data[0].customer_id,'c.name')
                                    cust_name = view.functions.capitalise(cust_name.first+' '+cust_name.last)

                                    let admin_msg = {
                                        msg: '<b>'+cust_name+'</b> booked in at '+moment(appt_data[0].date).format('HH:mm')+' on '+moment(appt_data[0].date).format('dddd Do MMM'),
                                        type:'New Online Booking',
                                        data: {
                                            url: '/dashboard/calendar/'+moment(appt_data[0].date).format('YYYY/M/D')+'?appointment_id='+appt_data[0]._key
                                        }
                                    }
                                    notification.broadcastToAdmins(admin_msg)
                                }

                                // check after 48 hours if confirmed with timestamp

                                // if with 48 hours send reminder 24hrs later

                                //    customer.checkRegistration(appt_data[0].customer_id)

                            }


                            if (data.appointments.length == linked.length){

                                await appointment.linkAppointments(linked)
                                linked = []
                                resolve(data)

                            }

                        })

                    }

                } else if (data._key) {

                    if (data.duration){

                        await collection.document(data._key).then((appt_data)=>{
                            data.end_date = moment(appt_data.date).add(data.duration,'minutes').toISOString()
                        })

                    }

                    if (data.staff_id){
                        let staff = db.db.collection('staff')
                        await staff.document(data.staff_id).then((staff_data)=>{
                            if (staff_data.name.last){
                                data.staff_name = staff_data.name.first+' '+staff_data.name.last
                            } else {
                                data.staff_name = staff_data.name.first
                            }

                        })
                    }

                    db.query('FOR a IN appointments FILTER a._key == "'+data._key+'" UPDATE a WITH '+JSON.stringify(data)+' IN appointments RETURN NEW', (appt_data)=>{

                        appt_data = appt_data.map((item)=>{
                            item.start_time = moment(item.date)
                            item.end_time = moment(item.end_date)
                            item.duration = item.end_time.diff(item.start_time,'minutes')
                            item.start_time = item.start_time.format('HH:mm')
                            item.end_time = item.end_time.format('HH:mm')
                            return item
                        })

                        // if (appt_data && appt_data && appt_data[0].linked_appointments && appt_data[0].linked_appointments.length > 0 && !data.service_id){
                        //     for (var i in appt_data[0].linked_appointments){
                        //         data._key = appt_data[0].linked_appointments[i]
                        //         db.query('FOR a IN appointments FILTER a._key == "'+data._key+'" && a.status != "deleted" UPDATE a WITH '+JSON.stringify(data)+' IN appointments RETURN NEW', ()=>{})
                        //     }
                        // }
                        if (data.prev_start_time && appt_data[0].status == 'confirmed'){

                            let start_time = moment(appt_data[0].date),
                               prev_start_time = moment(data.prev_start_time, 'HH:mm'),
                               diff = start_time.diff(prev_start_time,'minutes'),
                               msg = {
                                   to: appt_data[0].customer_id,
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

                               let user = false,
                                   log_msg = 'Appointment moved from '+prev_start_time.format('h:mma')+' to '+start_time.format('h:mma')
                               if (req.session && req.session.user && req.session.user._key){
                                   user = req.session.user
                                   if (req.session.user.guard && req.session.user.guard != 'customer'){
                                       log_msg = 'Appointment moved in salon from '+prev_start_time.format('h:mma')+' to '+start_time.format('h:mma')
                                   }
                               }

                               appointment.addLog(data._key,user,log_msg)

                        }

                        resolve(appt_data)

                    })

                } else {
                    reject('Not saved')
                }

            })

        }

    }

    module.exports = appointment
