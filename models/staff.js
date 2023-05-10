
    const db = require('../components/arango'),
          collection = db.db.collection('staff'),
          image = require('../modules/images'),
          appointments = require('./appointments'),
          return_fields = 's',
          moment = require('moment'),
          salon = require('../models/salon')
        //   sendMail=require('../modules/sendMail')

    const staff = {

        find:(key) => {

            let query = 'FOR s in staff FILTER s._key == "'+key+'" RETURN '+return_fields

            if (typeof key == 'object'){
                query = 'FOR s in staff FILTER s._key IN '+JSON.stringify(key)+' RETURN '+return_fields
            }

            return new Promise(function(resolve, reject){
                db.query(query, (data)=>{

                    if (data.length > 0){

                        if (typeof key == 'object'){
                            delete data.password
                            resolve(data)
                        } else {
                            delete data[0].password
                            resolve(data[0])
                        }

                    } else {
                        reject('Staff '+key+' Not found')
                    }

                })
            })

        },

        all:(keys) => {

            let query = 'FOR s in staff FILTER s.salon_id == "54855602" && s.role != "not_employed" SORT s.position ASC RETURN '+return_fields
            if (keys === true){
                query = 'FOR s in staff FILTER s.salon_id == "54855602" && s.role != "not_employed" SORT s.position ASC RETURN s._key'
            } else if (parseInt(keys)){
                query = 'FOR s in staff FILTER s.salon_id == "54855602" && s.role >= "'+keys+'" SORT s.position ASC RETURN '+return_fields
            }

            return new Promise(function(resolve, reject){
                db.query(query, (data)=>{

                    if (data.length > 0){

                        data = data.map((staff)=>{
                            delete staff.password
                            delete staff.password_reset
                            return staff
                        })
                        resolve(data)
                    } else {
                        resolve([])
                    }

                })
            })

        },

        allNames:(keys) => {

            let query = 'FOR s in staff FILTER s.salon_id == "54855602" && s.role != "not_employed" SORT s.position ASC RETURN {_key:s._key, name:s.name}'
            if (keys === true){
                query = 'FOR s in staff FILTER s.salon_id == "54855602" && s.role != "not_employed" SORT s.position ASC RETURN {_key:s._key, name:s.name}'
            } else if (parseInt(keys)){
                query = 'FOR s in staff FILTER s.salon_id == "54855602" && s.role >= "'+keys+'" SORT s.position ASC RETURN {_key:s._key, name:s.name}'
            }

            return new Promise(function(resolve, reject){
                db.query(query, (data)=>{

                    if (data.length > 0){
                        resolve(data)
                    } else {
                        reject('Not found')
                    }

                })
            })

        },

        findWithAppointments:(key, date)=>{
            return new Promise(function(resolve, reject){

                let now = moment().utc(),
                    tomorrow = moment().utc().add(1, 'days').set({hour:23,minutes:59,seconds:0}),
                    today = moment().utc().set({hour:0,minutes:0,seconds:0}),
                    date_str = 'a.date >= "'+today.toISOString()+'" && '

                if (date){
                    date_str = 'DATE_COMPARE(a.date,"'+date+'", "months", "days") && '
                }

                let query = 'FOR s in staff LET a = (FOR a in appointments FOR c in customers FILTER '+date_str+' a.staff_id == "'+key+'" && a.customer_id == c._key RETURN MERGE(a,{customer:c})) LET ab = (FOR ab in appointments FILTER '+date_str.replace(/a\./g,'ab.')+' ab.staff_id == "'+key+'" && ab.event_type == "staff_appointment" SORT ab.date ASC RETURN ab) FILTER s._key == "'+key+'" RETURN MERGE({s,appointments:a, availability:ab})'

                db.query(query, (data)=>{
                    resolve(data[0])
                })
            })
        },

        bookings:(query) => {

            let keys = [],
                date,
                return_str =  'd'

            query.keys = query.keys.split('/')

            for (var i in query.keys){
                keys.push(query.keys[i])
            }

            if (!query.date){
                date = 'DATE_NOW()'
            } else if (query.date.match(/Z$/)){
                date = '"'+query.date+'"'
            } else {
                date = '"'+new Date(query.date).toISOString()+'"'
            }

            if (query.key_arr){
                return_str = 'd.staff_id'
            }

            return new Promise(function(resolve, reject){
                db.query('FOR a IN appointments FILTER a.event_type == "staff_appointment" && a.status == "not_approved" RETURN a', (data)=>{

                    if (query.return_promise === false){
                    //    console.log('retunrin')
                        return data
                    } else {
                        resolve(data)
                    }

                })
            })

        },

        requestbooking: (data) => {

            return new Promise(function(resolve, reject){
                db.query('INSERT '+JSON.stringify(data)+' INTO staff_bookings RETURN NEW', (data)=>{

                    if (data.length > 0){
                        let admin_msg = {
                            msg:'New staff booking request, <a href="/dashboard/salon/availability">click here to approve</a>',
                            type:'Staff Booking Request'
                        }
                        notification.broadcastToAdmins(admin_msg)
                        resolve(data)
                    } else {
                        reject('Not found')
                    }

                })
            })

        },

        approveBooking: (data, req) => {

            return new Promise(function(resolve, reject){

                let guards = ['admin','staff']

                if (guards.indexOf(req.session.user.guard)===-1 && req.session.user.role < 3){
                    reject('Permission to this resource has been denied')
                    return false
                }

                let approval = {}

                if (data.approved == 'confirmed'){
                    approval = {
                        status:'confirmed',
                        approved_by: req.session.user.first_name+' '+req.session.user.last_name,
                        _updated:moment().toISOString()
                    }
                } else {
                    approval = {
                        status:'denied',
                        approved_by: req.session.user.first_name+' '+req.session.user.last_name,
                        _updated:moment().toISOString()
                    }
                }

                db.query('LET ap = DOCUMENT("appointments/'+data.key+'") UPDATE ap WITH '+JSON.stringify(approval)+' IN appointments RETURN NEW', (booking_data)=>{

                    if (booking_data.length > 0){

                        let msg

                        if (data.approved == 'true'){
                            msg = {
                                msg:'Your absence starting '+moment(booking_data[0].start_date).format('Do MMM YYYY')+' has been approved!',
                                type:'Absence Approved'
                            }
                        } else {
                            msg = {
                                msg:'Your absence starting '+moment(booking_data[0].start_date).format('Do MMM YYYY')+' has unfortunately been denied',
                                type:'Absence Denied'
                            }
                        }

                        notification.toUser(booking_data[0].staff_id, msg)
                        resolve(booking_data[0])

                    } else {
                        reject('Not found')
                    }

                })
            })

        },

        allBookings:()=>{

            return new Promise(function(resolve, reject){

                db.query('FOR a IN appointments FOR s IN staff FILTER a.staff_id == s._key && a.event_type == "staff_appointment" && a.status == "unconfirmed" RETURN MERGE(a,{staff:s})', (data)=>{

                    if (data.length > 0){
                        resolve(data)
                    } else {
                        reject('Not found')
                    }

                })
            })

        },

        nextAvailable:(data)=>{

            if (!data){
                data = {}
                data.date = moment().toISOString()
                data.staff_id = "4235921"
            }

            return new Promise(async function(resolve, reject){

                let date,
                    days = ['-2','-1','1','2','3'],
                    dates_available = []

                if (moment(data.date).diff(moment(),'days') < 2){
                    days = ['1','2','3','4','5']
                }

                for (day of days){

                    date = moment(data.date).add(day,'days').set({hours:8}).toISOString()
                    let appts = await appointment.staffAvailability(date, data.staff_id),
                        date_check = moment(data.date),
                        salon_open = await salon.isOpen(date)

                    if (appts.staff[data.staff_id]){

                        if (appts.staff[data.staff_id].start <= date && appts.staff[data.staff_id].end > date || !salon_open){

                        } else {
                            dates_available.push({date:date})
                        }
                    } else if (salon_open){
                        dates_available.push({date:date})
                    }

                }

                if (dates_available.length < 3){
                    days = ['6','7','8']

                    for (day of days){

                        date = moment(data.date).add(day,'days').set({hours:8}).toISOString()
                        let appts = await appointment.staffAvailability(date, data.staff_id),
                            date_check = moment(data.date),
                            salon_open = await salon.isOpen(date)

                        if (appts.staff[data.staff_id]){

                            if (appts.staff[data.staff_id].start <= date && appts.staff[data.staff_id].end > date || !salon_open){

                            } else {
                                dates_available.push({date:date})
                            }
                        } else if (salon_open){
                            dates_available.push({date:date})
                        }

                    }

                }


                resolve(dates_available)

            })

        },

        delete: async (key) => {

            return new Promise(async function(resolve, reject){

                let date = new Date().toISOString()

                let future_appointments = await appointment.findFutureAppointments(date, key)

                future_appointments = future_appointments.filter((appt)=>{
                    if (appt.event_type == 'customer_appointment'){
                        return true
                    } else {
                        appointment.delete(appt._key)
                    }
                })

                let filter = '{role:"not_employed",password:"not_employed",employment_end:"'+date+'"}'

                if (future_appointments.length > 0){
                    filter = '{role:"employment_ending"}'

                    db.query('LET s = DOCUMENT("staff/'+key+'") UPDATE s WITH '+filter+' IN staff RETURN NEW', (data)=>{

                        reject('Staff member has appointments that need to be moved, before the account can be removed')

                    })

                } else {

                    db.query('LET s = DOCUMENT("staff/'+key+'") UPDATE s WITH '+filter+' IN staff RETURN NEW', (data)=>{

                        if (data.length > 0){
                            resolve(data)
                        } else {
                            reject('Not found')
                        }

                    })

                }

            })

        },

        search:(search)=>{
           
            let filter = ''
            console.log(search)
            return new Promise(function(resolve, reject){

                filter = 'LOWER(s.name.first) =~ "'+search.str+'" || LOWER(s.name.last) =~ "'+search.str+'" || LOWER(s.email) =~ "'+search.str+'" || LOWER(s.tel) =~ "'+search.str+'"'


                
                    db.query('FOR s in staff FILTER s.type =="authorizedStaff" && !s.employment_end && s.salon == "54855602" && '+filter+' RETURN '+return_fields, (data)=>{
                        resolve(data)
                    })
                
            })

        },

        save: async (data) => {

            data.salon_id = "54855602"

            if (!data._key){ // new Member
                data.working_hours = await salon.get('opening_times')
            }

            if (!data._key){
                data._created = new Date().toISOString()
                data._updated = new Date().toISOString()
                data.notifications = []
                data.employment_start = new Date().toISOString()

                if (!data.role){
                    data.role = '0'
                }
                if (!data.level){
                    data.level = '0'
                }

            } else {
                data._updated = new Date().toISOString()
            }

            if (data.password){
                data.password = db.hash(data.password)
            }

            await image.saveAll(data, data.name.first+'-'+data.name.last,'avatars').then((new_data)=>{
                data = new_data
            })

            return new Promise(function(resolve, reject){

                if (data._key){

                    db.query('UPDATE '+JSON.stringify(data)+' IN staff RETURN NEW', (staff_data)=>{

                        if (staff_data.length > 0){
                            delete staff_data[0].password
                            resolve(staff_data[0])

                        } else {

                            reject('Staff member Not saved')

                        }

                    })

                } else {

                    db.query('INSERT '+JSON.stringify(data)+' IN staff RETURN NEW', (staff_data)=>{

                        if (staff_data.length > 0){

                            staff.checkRegistration(staff_data[0])
                            delete staff_data[0].password
                            resolve(staff_data[0])

                        } else {

                            reject('Staff member Not saved')

                        }

                    })

                }



            })

        },

        authenticate:(data) => {

            return new Promise(function(resolve, reject){
                db.query('FOR s in staff FILTER s.email == "'+data.email+'" && s.password == "'+db.hash(data.password)+'" ||  s.email == "'+data.email+'" && s.pin == "'+data.password+'" RETURN s', (staff_data)=>{

                    if (staff_data.length > 0){
                        if (!staff_data[0].password){

                            staff.checkRegistration(staff_data[0])
                            reject('Please set a password for your account. We have sent you a link to your registered email address with more detail.')

                        } else if (staff_data[0].password == db.hash(data.password) || staff_data[0].pin == data.password){

                            staff_data[0].guard = 'staff'
                            resolve(staff_data[0])

                        } else {
                            reject('Incorrect Email address or password')
                        }

                    } else {
                        reject('Incorrect Email address or password')
                    }

                })
            })

        },

        checkRegistration: (user)=>{

            return new Promise(function(resolve, reject) {

                if (typeof user == 'object'){

                    if (user.email && !user.password || user.email && user.password == 'not_employed'){

                        let hash = db.hash('password-reset'+Date.now()),
                            email_data = {
                                email: user.email,
                                hash: hash
                            }

                        db.query('LET staff = DOCUMENT("staff/'+user._key+'") UPDATE staff WITH {password_reset:"'+hash+'"} IN staff', ()=>{})
                        notification.toStaff('complete_registration',email_data).then(()=>{
                            resolve('Sent')
                        })

                    } else {
                        reject('No email address')
                    }

                } else {

                    db.query('LET staff = DOCUMENT("staff/'+user+'") RETURN staff', (user_data)=>{

                        let user = user_data[0]

                        if (user.email && !user.password){

                            let hash = db.hash('password-reset'+Date.now()),
                                email_data = {
                                    email: user.email,
                                    hash: hash
                                }

                            db.query('LET staff = DOCUMENT("staff/'+user._key+'") UPDATE staff WITH {password_reset:"'+hash+'"} IN staff', ()=>{})
                            notification.toStaff('complete_registration',email_data).then(()=>{
                                resolve('Sent')
                            })

                        } else {
                            reject('No email address')
                        }

                    })

                }

            })

        },

        available:(query) => {

            var all_staff = []

            return new Promise(function(resolve, reject){

                staff.all(true).then((staff)=>{ // get all staff and just return the keys

                    all_staff = staff
                    return staff

                }).then((staff2)=>{ // using the key array, check if any of the staff are off that day and return the keys

                    let payload = {
                        keys:staff2.join('/'),
                        date: query.date,
                        key_arr: true
                    }
                    return staff.bookings(payload)

                }).then((away_keys)=>{ // remove the away keys from the all staff keys, and lookup the staff data

                    if (away_keys && away_keys.length > 0){
                        available_staff = all_staff.filter(function(x) {
                            return away_keys.indexOf(x) < 0;
                        });
                    } else {
                        available_staff = all_staff
                    }

                    return staff.find(available_staff)

                }).then((available_staff)=>{ // send available staff data to the client

                    resolve(available_staff)

                })

            })
        },

        sendReset:(data) => {

            return new Promise(function(resolve, reject){

                let hash = db.hash('password-reset'+Date.now())

                db.query('FOR s in staff FILTER s.email == "'+data.email+'" && s.role != "not_employed" UPDATE s WITH {password_reset:"'+hash+'"} IN staff RETURN NEW', (staff_data)=>{

                    if (staff_data.length > 0){

                        let msg

                        if (staff_data[0].password){
                            msg = {
                                to: staff_data[0].email,
                                subject: 'Password Reset',
                                text: "Please click the following link to reset your password. Your current password has not been changed, so if you didn't initiate this, you can ignore it. It could mean someone has attempted to access your account however, so please get in contact if you have concerns. "+config.site_url+'/login/staff/'+hash
                            }
                        } else {
                            msg = {
                                to: staff_data[0].email,
                                subject: 'Welcome to '+config.site_name+'!',
                                text: "We're pleased to have you on board, but first you need to set a password for your "+config.site_name+" account. Please click the following link to get started. "+config.site_url+'/login/staff/'+hash
                            }
                        }

                        notification.email(msg)
                        // sendMail.sendMail(msg.to,msg.subject,msg.text,msg.subject, "new.ejs")
                        resolve(data[0])

                    } else {
                        reject('Email address not found')
                    }

                })
            })

        },

        resetPassword:(data) => {

            return new Promise(function(resolve, reject){

                if (data.password != data.password_conf || !data.password){
                    reject('Mismatching passwords')
                } else {

                    db.query('FOR s in staff FILTER s.email == "'+data.email+'" && s.password_reset == "'+data.hash+'" && s.role != "not_employed" UPDATE s WITH {password:"'+db.hash(data.password)+'", password_reset:""} IN staff RETURN NEW', (data)=>{

                        if (data.length > 0){

                            resolve(data[0])

                        } else {
                            reject(data)
                        }

                    })

                }

            })

        },
        saveStaff:async (data)=>{
            data.type='authorizedStaff'
            console.log(data._key)
            if(data._key===null ||data._key===undefined ||data._key===''){
               
                return new Promise( async function(resolve, reject){
             await db.query('INSERT '+JSON.stringify(data)+' IN staff RETURN NEW', (staff_data)=>{
                    resolve(staff_data)
                })
            })
            }
            else{
                return new Promise( async function(resolve, reject){
                    
                    await db.query('UPSERT {_key:"'+data._key+'"} INSERT '+JSON.stringify(data)+' UPDATE '+JSON.stringify(data)+' IN staff RETURN NEW', (staff_data)=>{
                        console.log(staff_data)
                           resolve(staff_data)
                          
                       })
                   })
            }
        },
        getStaff:async (data)=>{
           
            return new Promise( async function(resolve, reject){
                await db.query(`for p in staff return p`, (staff_data)=>{
                    resolve(staff_data)
                    })
        //  await db.query(`for p in staff filter p.type =="authorizedStaff" && !p.employment_end return p`, (staff_data)=>{
        //     resolve(staff_data)
        //     })
        })}

    }

    module.exports = staff
