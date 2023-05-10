
    const db = require('../components/arango'),
          collection = db.db.collection('events'),
          customers = require('../models/customers'),
          fs = require('fs'),
          return_fields = 'c'

    const events = {

        all: () => {

            return new Promise(async (resolve, reject) => {
                let events = await collection.all()

                events._result.sort((a,b)=>{
                    return a.name.localeCompare(b.name)
                })

                resolve(events._result)
            })

        },

        save: (data)=>{

            return new Promise(async(resolve, reject) => {

                if (data._key){

                    let evnt = await collection.document(data._key)
                    evnt = await collection.update(evnt, data)

                    resolve(data)

                } else {

                    let new_event = collection.save(data)
                    resolve(new_event)

                }

            })

        },

        addImage: (data) => {

            return new Promise(async(resolve, reject) => {

                let img = await image.save(data.img, data.name, 'media')
                resolve(config.site_url+'/'+img)

            })

        },

        test: (evnt, req) => {

            if (evnt.key){
                evnt = evnt.key
            }

            return new Promise( async (resolve, reject) => {

                let evnt_data, data

                if (req && req.session && req.session.user && req.session.user._key){

                    data = req.session.user

                    if (evnt.match(/stock/)){

                        db.query('FOR p IN products SORT RAND() LIMIT 1 RETURN p', async(prod_data)=>{
                            evnt_data = await events.trigger(evnt, prod_data[0])
                            resolve(evnt_data)
                        })

                    } else if (evnt.match('payment_link')){

                        let event_data = {
                            cart_total: '123.00',
                            cart_id: 'cart_12312321',
                            intent: 'pi_23o2n3lin2l3il2nl',
                            customer_id: req.session.user._key
                        }

                        evnt_data = await events.trigger(evnt, event_data)
                        resolve(evnt_data)

                    } else {
                        evnt_data = await events.trigger(evnt, req.session.user)
                        resolve(evnt_data)
                    }

                }

            })


        },

        trigger: (evnt, data) => {

            return new Promise(async (resolve, reject) => {

                let event_data = await collection.document(evnt)

                if (event_data && event_data.actions && event_data.actions.length > 0){

                    let actions = event_data.actions,
                        appointment = await events.findAppointment(data),
                        client = await events.findClient(data),
                        product_link = await events.findProductLink(data),
                        recipient

                    data.admin_email = config.email.admin_to

                    if (data.email){
                        data.client_email = data.email
                    }

                    if (data.name && data.name.first){
                        data.client_first_name = data.name.first
                    }

                    if (data.name && data.name.last){
                        data.client_surname = data.name.last
                    }

                    if (client){

                        if (client.email){
                            data.client_email = client.email
                        }

                        if (client.tel){
                            data.client_tel = client.tel
                        }

                        if (client.name && client.name.first){
                            data.client_first_name = client.name.first
                        }

                        if (client.name && client.name.last){
                            data.client_surname = client.name.last
                        }

                        if (client.login_link){
                            data.login_link = config.site_url+'/login/link/'+client.login_link
                        }

                        if (client.password_reset){
                            data.password_reset_link = config.site_url+'/login/customer/'+client.password_reset
                        }

                    }

                    if (appointment){

                        if (appointment.confirm_id){
                            data.confirmation_link = config.site_url+'/book/confirm/'+appointment.confirm_id
                        }

                        if (appointment.date){
                            data.appointment_start_date = moment(appointment.date).format('Do MMMM')
                            data.appointment_start_date_full = moment(appointment.date).format('dddd Do MMMM [at] h:mma')
                            data.appointment_start_date_short = moment(appointment.date).format('ddd Do MMM')
                            data.appointment_start_time = moment(appointment.date).format('h:mma')
                        }

                        if (appointment.end_date){
                            data.appointment_end_date = moment(appointment.end_date).format('Do MMMM')
                            data.appointment_end_date_full = moment(appointment.end_date).format('dddd Do MMMM [at] h:mma')
                            data.appointment_end_date_short = moment(appointment.end_date).format('ddd Do MMM')
                            data.appointment_end_time = moment(appointment.end_date).format('h:mma')
                        }

                    }


                    for (let action of actions){

                        if (action.enabled === true){

                            // if (action.method == 'sms' || action.method == 'email'){
                            //     recipient = await events.findRecipient(action.method, data)
                            //
                            //     if (!recipient && action.to){
                            //         recipient = action.to
                            //     }
                            // }
                            if (action.to){
                                recipient = await events.parseMoustache(action.to, data)
                            }

                            if (action.subject){
                                action.subject = await events.parseMoustache(action.subject, data)
                            }
                            if (action.text){
                                action.text = await events.parseMoustache(action.text, data)
                            }
                            if (action.button_text){
                                action.button_text = await events.parseMoustache(action.button_text, data)
                            }
                            if (action.button_url){
                                action.button_url = await events.parseMoustache(action.button_url, data)

                                if (!action.button_url.match(/^http/i)){
                                    action.button_url = config.site_url+action.button_url
                                }
                            }
                            if (action.link){
                                action.link = await events.parseMoustache(action.link, data)
                                if (!action.link.match(/^http/i)){
                                    action.link = config.site_url+action.link
                                }
                            }

                            if (action.method == 'email'){
                                global.notification.sendEmail(recipient,action)
                            }

                            if (action.method == 'sms'){
                                global.notification.sendSms(recipient,action.text)
                            }

                            if (action.method == 'salon_notification'){

                                let msg = {
                                    type: action.subject,
                                    msg: action.text,
                                    data:{}
                                }

                                if (!msg.type){
                                    msg.type = 'System Notification'
                                }

                                if (action.link){
                                    msg.data.url = action.link
                                }

                                if (product_link){
                                    msg.data.url = product_link.url
                                }

                                if (appointment){
                                    msg.data.appointment_url = '/dashboard/calendar/'+moment(appointment.date).format('YYYY/MM/DD')+'?appointment_id='+appointment._key
                                }

                                if (client){
                                    msg.data.customer_id = client._key
                                }

                                global.notification.salonNotification(msg)
                            }

                        }
                    }

                    resolve(evnt+' triggered')

                } else {
                    reject('No event found: '+evnt)
                }


            })

        },

        findRecipient: (method, data) => {

            return new Promise( async (resolve, reject) => {

                let result

                if (Array.isArray(data)){



                } else if (typeof data == 'object'){

                    if (data.customer_id){

                        if (method == 'sms'){
                            method = 'tel'
                        }

                        result = await customers.find(data.customer_id,'{recipient:c.'+method+'}')
                        resolve(result.recipient)

                    }

                    if (method == 'email' && data.email){
                        resolve(data.email)
                    }

                    if (method == 'sms' && data.tel){
                        resolve(data.tel)
                    }

                }

            })

        },

        findAppointment: (data) => {

            return new Promise((resolve, reject) => {

                if (!data){
                    resolve()
                    return
                }

                if (Array.isArray(data)){
                    data = data[0]
                }

                if (data._id && data._id.match(/appointments/)){
                    resolve(data)
                    return
                }

                resolve()

            })

        },

        findProductLink: (data) => {

            return new Promise((resolve, reject) => {

                if (Array.isArray(data)){
                    data = data[0]
                }

                if (data._id && data._id.match(/products/) && data.barcode){

                    let result = {
                        url:'/dashboard/salon/products?search='+data.barcode,
                        name: data.brand+' '+data.name,
                        stock: data.stock
                    }
                    resolve(result)
                    return
                } else if (data._id && data._id.match(/products/)){

                    let result = {
                        url:'/dashboard/salon/products?search='+data.name,
                        name: data.brand+' '+data.name,
                        stock: data.stock
                    }
                    resolve(result)
                    return
                }

                resolve()

            })

        },

        findClient: (data) => {

            return new Promise( async (resolve, reject) => {

                if (!data){
                    resolve()
                    return
                }

                if (Array.isArray(data)){
                    data = data[0]
                }

                if (data._id && data._id.match(/customers/)){
                    resolve(data)
                    return
                }

                if (data.customer_id){
                    let client = await customers.find(data.customer_id)
                    resolve(client)
                    return
                }

                resolve()

            })

        },

        parseMoustache:(text, data) => {

            return new Promise( async (resolve, reject) => {

                for (let [key,value] of Object.entries(data)){

                    let re = RegExp('{{\s*'+key+'\s*}}','g')
                    text = text.replace(re, value)

                }

                resolve(text)

            })

        }

    }

    module.exports = events
