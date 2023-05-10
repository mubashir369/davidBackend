
    const sendgrid = require('@sendgrid/mail'),
          customer = require('../models/customers'),
          admin = require('../models/admins'),
          staff = require('../models/staff'),
          appointment = require('../models/appointments'),
          user_notification = require('../models/user_notifications'),
          Nexmo = require('nexmo'),
          Twilio = require('twilio'),
          CronJob = require('cron').CronJob,
          Pstmk = require("postmark")



    var smsSend, sendEmail, smsBalanceWarn = false

    if (config.sms && config.sms.provider){

        if (config.sms.provider == 'twilio'){

            const twilio_c = new Twilio(config.sms.apiKey, config.sms.apiSecret);

            smsSend = (to, body)=>{

                return new Promise(function(resolve, reject) {

                    twilio_c.messages.create({
                        body: body,
                        to: to,  // Text this number
                        from: config.sms.from // From a valid Twilio number
                    })
                    .then((message) => {resolve(message)})
                    .catch((err) => {reject(err)})

                })

            }

        }

        if (config.sms.provider == 'nexmo'){

            const nexmo = new Nexmo({
                apiKey: config.sms.apiKey,
                apiSecret: config.sms.apiSecret,
            });

            smsSend = (to, body)=>{

                to = to.replace(/^0/,'44')

                return new Promise(function(resolve, reject) {
                    nexmo.message.sendSms(config.sms.from, to, body, (err, responseData)=>{
                        if (err) {
                            reject(err)
                        } else {

                            resolve(responseData)

                            if (responseData.messages && responseData.messages[0] && responseData.messages[0]['remaining-balance']){

                                let balance = parseFloat(responseData.messages[0]['remaining-balance'])
                                if (balance <= 5 && smsBalanceWarn === false){
                                    let msg = {
                                        type: 'SMS balance low',
                                        msg:'Your SMS balance is currently £'+balance.toFixed(2)
                                    }
                                    notification.salonNotification(msg)
                                    smsBalanceWarn = true
                                } else if (balance > 5 ){
                                    smsBalanceWarn = false
                                }

                            }
                        }
                    })

                })

            }

        }
    }

    if (config.email && config.email.provider){

        if (config.email.provider == 'sendgrid'){

            sendgrid.setApiKey(config.email.api_key)

            sendEmail = (user, data) => {

                return new Promise(function(resolve, reject){

                    if (user.email && user.email.match(/^(.*?)@(.*?)\.(.*?)/) || typeof user == 'string' && user.match(/^(.*?)@(.*?)\.(.*?)/)){

                        let template_id = config.email.template_id
                        if (data.template && config.email.templates && config.email.templates[data.template]){
                            template_id = config.email.templates[data.template]
                        }

                        if (typeof user == 'object'){

                            var msg = {
                                to: user.email,
                                from: config.email.from_address,
                                subject: data.subject,
                                text: data.text,
                                html: data.html,
                                templateId: template_id,
                                dynamic_template_data: {
                                    "body":data.text,
                                    "subject":data.subject,
                                    "title":data.subject
                                }
                            }

                        } else if (user.match(/^(.*?)@(.*?)\.(.*?)/)){

                            var msg = {
                                to: user,
                                from: config.email.from_address,
                                subject: data.subject,
                                text: data.text,
                                html: data.html,
                                templateId: template_id,
                                dynamic_template_data: {
                                    "body":data.text,
                                    "subject":data.subject,
                                    "title":data.subject
                                }
                            }

                        } else {
                            reject('Invalid recipient')
                            return false
                        }

                        if (data.button_text && data.button_url){
                            msg.dynamic_template_data.link = {
                                text:data.button_text,
                                url: data.button_url
                            }
                        }

                        if (data.voucher){
                            msg.dynamic_template_data.voucher = data.voucher
                        }

                        if (data.attachments){
                            msg.attachments = data.attachments
                        }

                        if (data.dynamic_template_data){
                            msg.dynamic_template_data = Object.assign(msg.dynamic_template_data, data.dynamic_template_data)
                        }

                        sendgrid.send(msg).then((email_res) => {
                            resolve(email_res)
                        }).catch((error) => {
                            console.log('Module Notifications | sendEmail: ',error)
                            reject('Unable to contact client, their email address may be invalid or uncontactable')
                        })

                    } else {
                        resolve('not sent')
                    }

                })

            }


        } else if (config.email.provider == 'postmark') {

            const postmark = new Pstmk.ServerClient(config.email.api_key)

            sendEmail = (user, data) => {

                return new Promise(function(resolve, reject){

                    if (user.email && user.email.match(/^(.*?)@(.*?)\.(.*?)/) || typeof user == 'string' && user.match(/^(.*?)@(.*?)\.(.*?)/)){

                        if (typeof user == 'object' && user.email){
                            user = user.email
                        }

                        let payload = {
                            "From": config.email.from_address,
                            "To": user
                        }

                        let email_text = data.text.replace(/\r\n|\r|\n/g,"<br />")

                        let matches = email_text.match(/(http(s)*\:\/\/[a-zA-Z0-9_.-/]+)/)

                        if (matches){
                            data.link = matches[1]
                            email_text = email_text.replace(/(http(s)*\:\/\/[a-zA-Z0-9_.-/]+)/,'')
                        }

                        payload.TemplateAlias = config.email.templates[0]
                        payload.TemplateModel = {
                            "subject": data.subject,
                            "content": email_text
                        }

                        if (data.link){
                            payload.TemplateModel.link = {
                                url: data.link
                            }
                        }

                        if (data.image){
                            payload.TemplateModel.image = {
                                url: data.image,
                                position: 'bottom'
                            }
                        }

                        if (data.button_url && data.button_text){
                            payload.TemplateModel.button = {
                                url: data.button_url,
                                text:data.button_text
                            }
                        }

                        if (data.voucher){
                            payload.TemplateAlias = 'ss-voucher-general'
                            payload.TemplateModel.voucher = data.voucher
                        }

                        if (data.transactions){
                            payload.TemplateModel.transactions = data.transactions
                        }
                        console.log("payLoaaaad",payload);
                        postmark.sendEmailWithTemplate(payload, function(error, email_res) {

                            if(error) {
                                log('Mail error: '+JSON.stringify(error))
                                reject('Unable to contact client, their email address may be invalid or uncontactable')
                                return
                            }
                            resolve(email_res)
                        })

                    } else {
                        reject('No email address found')
                    }

                })

            }

        }

    }


    var notification = {

        sendEmail: sendEmail,

        sendSms: smsSend,

        toStaff: (type, data, date)=>{

            return new Promise(function(resolve, reject) {

                if (type == 'complete_registration'){

                   msg = {
                       to: data.email,
                       subject: 'Complete Your Registration',
                       text: "Welcome to "+config.site_name+"! To complete your registration, please click the link below to add a password to your account. "+config.site_url+'/login/staff/'+data.hash,
                       button_text: 'Complete Registration',
                       button_url: config.site_url+'/login/staff/'+data.hash
                   }
               }

               if (data.appointment_id){
                   msg.appointment_id = data.appointment_id
               }

               if (data.method && data.method == 'sms'){

                   if (date){

                       date = new Date(date)
                       const job = new CronJob(date, function() {
                           notification.sms(msg).then((data)=>{
                               // update appointment log
                           })
                       });

                       job.start();
                       resolve(data)

                   } else {

                       notification.sms(msg).then((data)=>{
                           resolve(data)
                       }).catch((err)=>{
                           console.log('Module Notifications | SMS error 261: ',err)
                           reject('Unable to contact client, please check their phone number')
                       })

                   }

               } else {

                   if (date){

                       date = new Date(date)
                       const job = new CronJob(date, function() {
                           notification.email(msg).then((data)=>{
                               // update appointment log
                           })
                       });

                       job.start();
                       resolve(data)

                   } else {

                       notification.email(msg).then((data)=>{
                           resolve(data)
                       }).catch((err)=>{
                           console.log('Module Notifications | Email error 286: ',err)
                           reject('Unable to contact client, their email address may be invalid or uncontactable')
                       })

                   }

               }

            })

        },


        toCustomer:(type, data, date)=>{

            return new Promise(async function(resolve, reject) {

                let msg

                if (type == 'confirm_appointment'){

                    msg = {
                        to: data.customer_id,
                        subject: 'Please confirm your appointment',
                        text: 'To complete your booking on '+data.date+', please confirm within 24hrs by clicking the link below: '+config.site_url+'/book/confirm/'+data.timestamp,
                        html: 'To complete your booking on '+data.date+', please confirm within 24hrs by clicking the link below<br><br><h4><a href="'+config.site_url+'/book/confirm/'+data.timestamp+'">Confirm your appointment</a></h4>',
                        button_text: 'Confirm Appointment',
                        button_url: config.site_url+'/book/confirm/'+data.timestamp
                    }

                } else if (type == 'appointment_confirmed'){

                    msg = {
                        to: data.customer_id,
                        subject: 'Appointment Confirmed',
                        text: 'Your appointment on '+data.date+' at '+data.time+' has been confirmed. You can view your upcoming appointments here: '+data.auth_link,
                        html: 'Your appointment on '+data.date+' at '+data.time+' has been confirmed. If you haven\'t booked with us before, please click the link below to complete your registration.',
                        button_text: 'Your Account',
                        button_url: data.auth_link
                    }

                } else if (type == 'complete_registration'){

                    msg = {
                        to: data.email,
                        subject: 'Complete Your Registration',
                        text: "Welcome to "+config.site_name+"! To complete your registration, please click the link below to add a password to your account. "+config.site_url+'/login/customer/'+data.hash,
                        button_text: 'Complete Registration',
                        button_url: config.site_url+'/login/customer/'+data.hash
                    }

                }  else if (type == 'complete_registration_minor'){

                    msg = {
                        to: data.email,
                        subject: 'Verify Your Email Address',
                        text: "Welcome to "+config.site_name+"! To complete your registration, please click the link below to Verify your email address. ",
                        button_text: 'Verify Your Email',
                        button_url: config.minor_site_url+'/email-verify/'+data._key
                    }

                }  else if (type == 'password_reset'){

                    msg = {
                        to: data.email,
                        subject: 'Password Reset',
                        text: "Please click the following link to reset your password. Your current password has not been changed, so if you didn't initiate this, you can ignore it. It could mean someone has attempted to access your account however, so please get in contact if you have concerns. "+config.site_url+'/login/customer/'+data.hash,
                        button_text: 'Reset Your Password',
                        button_url: config.site_url+'/login/customer/'+data.hash
                    }

                }else if (type == 'password_reset_minor'){

                    msg = {
                        to: data.email,
                        subject: 'Password Reset',
                        text: "Please click the following link to reset your password. Your current password has not been changed, so if you didn't initiate this, you can ignore it. It could mean someone has attempted to access your account however, so please get in contact if you have concerns. ",
                        button_text: 'Reset Your Password',
                        button_url: config.minor_site_url+'/reset-password/'+data.password_reset
                    }

                }else if (type == 'password_changed'){

                    msg = {
                        to: data.email,
                        subject: 'Password changed Successfully',
                        text: "Your password changed successfully. You can now login with this password.",
                        button_text: 'Login',
                        button_url: config.minor_site_url+'/signup'
                    }

                } else if (type == 'send_receipt'){

                    for (let item of data.items){
                        item.price = await view.functions.getPrice(item)
                    }

                    msg = {
                        to: data.customer_id,
                        subject: 'Your Transaction Receipt',
                        text: "Thank you for your business",
                        transactions:{
                            "items": data.items,
                            "sub_total":"£"+parseFloat(data.sub_total).toFixed(2),
                            "tax":"£"+parseFloat(data.tax).toFixed(2),
                            "total":"£"+parseFloat(data.total).toFixed(2)
                        }
                    }

                    if (data.payment.vouchers){
                        msg.transactions.vouchers = parseFloat(data.payment.vouchers).toFixed(2)
                    }

                    if (data.payment.account){
                        msg.transactions.account = parseFloat(data.payment.account).toFixed(2)
                    }


                } else if (type == 'voucher'){

                    msg = {
                        to: data.to,
                        subject: 'Your Email Voucher',
                        text: "Here's your £"+parseFloat(data.voucher.value).toFixed(2)+" voucher code! Feel free to use it anytime",
                        voucher: {
                            image: config.site_url+data.voucher.image,
                            barcode: data.voucher.barcode,
                            value: data.voucher.value,
                            expiry_date: moment(data.voucher.expiry_date).format('Do MMMM YYYY')
                        },
                        template:'voucher_simple'
                    }

                } else if (type == 'appointment_cancelled'){

                    msg = {
                        to: data.customer_id,
                        subject: 'Appointment Cancelled',
                        text: 'Your appointment on '+data.date+' has been cancelled. Please contact us on '+config.site_tel+' if you would like to rebook.',
                        html: 'Your appointment on '+data.date+' has been cancelled. Please contact us on '+config.site_tel+' if you would like to rebook.'
                    }

                } else if (type == 'appointment_reminder'){

                    msg = {
                        to: data.customer_id,
                        subject: 'Reminder for your upcoming appointment',
                        text: 'You have an upcoming appointment on '+data.date+'. Please let us know within 48 hours of your appointment if you are unable to attend. '+config.site_url+'/account',
                        html: 'You have an upcoming appointment on '+data.date+'. Please let us know within 48 hours of your appointment if you are unable to attend<br><br><h4><a href="'+config.site_url+'/account">Login to your account</a></h4>',
                        button_text: 'Your Account',
                        button_url: config.site_url+'/account'
                    }

                }

                if (data.appointment_id){
                    msg.appointment_id = data.appointment_id
                }

               if (data.method && data.method == 'sms' || data.method && data.method == 'smsEmail'){

                    if (date){

                        date = new Date(date)
                        const job = new CronJob(date, function() {
                            notification.sms(msg).then((data)=>{
                                // update appointment log
                            })
                        });

                        job.start();
                        resolve(data)

                    } else {

                        notification.sms(msg).then((data)=>{
                            resolve(data)
                        }).catch((err)=>{
                            console.log('Module Notifications | SMS error 434: ',err)
                            reject('Unable to contact client, please check their phone number')
                        })

                    }

                }

                if (!data.method || data.method && data.method == 'smsEmail'){

                    if (date){

                        date = new Date(date)

                        const job = new CronJob(date, function() {
                            notification.email(msg).then((data)=>{
                                // update appointment log
                            })
                        });

                        job.start();
                        resolve(data)

                    } else {

                        notification.email(msg).then((data)=>{
                            resolve(data)
                        }).catch((err)=>{
                            console.log('Module Notifications | Email error 462: ',err)
                            reject('Unable to contact client, their email address may be invalid or uncontactable')
                        })

                    }

                }

            })

        },

        email:(data) => {

            return new Promise(async function(resolve, reject){
                console.log("smsmsmsmsmsmsmsmsmmsmsmsms",data.appointment_id);
                if (!data){
                    reject()
                    return
                }

                if (data.appointment_id){

                    let appt = await appointment.findWithoutCustomer(data.appointment_id)

                    if (!appt){
                        reject()
                        return
                    } else {
                        data.html = 'You have an upcoming appointment on '+moment(appt.date).format('ddd Do MMM [at] h:mma')+'. Please let us know within 48 hours of your appointment if you are unable to attend<br><br><h4><a href="'+config.site_url+'/account">Login to your account</a></h4>'
                        data.text = 'You have an upcoming appointment on '+moment(appt.date).format('ddd Do MMM [at] h:mma')+'. Please let us know within 48 hours of your appointment if you are unable to attend. '+config.site_url+'/account'
                    }

                }

                if (!data.to){
                //    log('Email not sent: Enter a valid recipient')
                    reject(new Error("Enter a valid recipient"))
                    return
                }

                if (!data.subject){
                    data.subject = 'Client notification from '+config.site_name
                }

                if (!data.text && !data.html){
                //    log('Email not sent: Enter a message body')
                    reject(new Error("Enter a message body"))
                    return
                }

                if (!data.text && data.html){
                    data.text = data.html.replace(/(<([^>]+)>)/ig,"")
                }

                if (data.text && !data.html){
                    data.html = data.text
                }

                if (typeof data.to == 'string' && data.to.match(/\@/)){

                    sendEmail(data.to, data).then((email_res)=>{
                        resolve(email_res)
                    }).catch((err)=>{
                        console.log('Module Notifications | Email error 523: ',err)
                        reject(err)
                    })

                } else {

                    customer.find(data.to).then((user)=>{

                        sendEmail(user, data).then((email_res)=>{

                            if (email_res[0] && email_res[0].request && email_res[0].request.body){
                                resolve(email_res[0].request.body)
                            } else {
                                resolve()
                            }

                        }).catch((err)=>{
                            console.log('Module Notifications | Email error 540: ',err)
                            reject(err)
                        })

                    }).catch((err)=>{

                        staff.find(data.to).then((user)=>{

                            sendEmail(user, data).then(()=>{
                                resolve()
                            }).catch((err)=>{
                                reject(err)
                            })

                        }).catch((err)=>{

                            var msg = {
                                to: config.email.admin_to,
                                from: config.email.from_address,
                                subject: 'Notification not sent',
                                text: 'A notification to '+data.to+' was not sent. The content was as follows: '+data.text,
                                html: 'A notification to '+data.to+' was not sent. The content was as follows:<br><br>'+data.html
                            }

                            sendEmail(msg).then(() => {
                                resolve()
                            }).catch((error) => {
                                console.log('Module Notifications | Email error 567: ',error)
                                reject('Unable to contact client, their email address may be invalid or uncontactable')
                            })
                            resolve()

                        })

                    })

                }

            })

        },

        sms:(data, date) => {

            return new Promise(async function(resolve, reject){

                if (data.appointment_id){

                    let appt = await appointment.findWithoutCustomer(data.appointment_id)

                    if (!appt){
                        reject()
                        return
                    } else {
                        data.text = 'You have an upcoming appointment on '+moment(appt.date).format('ddd Do MMM [at] h:mma')+'. Please let us know within 48 hours of your appointment if you are unable to attend. '+config.site_url+'/account'
                    }

                }


                if (data.to && data.to.match(/^(07|\+447)[0-9]{8,11}/)){

                    data.to = data.to.replace(/^0/,'44')

                    smsSend(data.to, data.text)
                       .then((sms_data)=>{resolve(sms_data)})
                       .catch((err)=>{console.log('Module Notifications | SMS error 604: ',err);reject(err)})

                } else {

                    customer.find(data.to).then((user)=>{

                        if (user.tel && user.tel.match(/^(07|\+447)[0-9]{8,11}/)){

                            let to = user.tel.replace(/^0/,'44'),
                                body = data.text
console.log(body)
                            smsSend(to, body)
                               .then((sms_data)=>{resolve(sms_data)})
                               .catch((err)=>{console.log('Module Notifications | SMS error 617: ',err);reject(err)})

                        } else {
                            reject('Unable to contact client, please check contact details')
                        }

                    }).catch((err)=>{

                        staff.find(data.to).then((user)=>{

                            if (user.tel && user.tel.match(/^(07|\+447)[0-9]{8,11}/)){

                                let to = user.tel.replace(/^0/,'44'),
                                    body = data.text

                                smsSend(to, body)
                                   .then((sms_data)=>{resolve(sms_data)})
                                   .catch((err)=>{console.log('Module Notifications | SMS error 634: ',err);reject(err)})

                            } else {
                                reject('Unable to contact client, please check contact details')
                            }

                        }).catch((err)=>{

                            var msg = {
                                to: config.email.admin_to,
                                from: config.email.from_address,
                                subject: 'Notification not sent',
                                text: 'A notification to '+data.to+' was not sent. The content was as follows: '+data.text,
                                html: 'A notification to '+data.to+' was not sent. The content was as follows:<br><br>'+data.text
                            }

                            sendEmail(msg).then(() => {
                                resolve()
                            }).catch((error) => {
                                console.log('Module Notifications | Email error 653: ',error)
                                reject('Unable to contact client, their email address may be invalid or uncontactable')
                            })


                        })

                    })

                }



            //    data.to = '+447936642915'
                //
                // if (data.tel && data.tel.match(/^(07|\+447)[0-9]{8,11}/)){
                //
                //     data.tel = data.tel.replace(/^0/,'44')
                //
                //     const to = data.tel,
                //           body = data.msg
                //
                //     if (date){
                //
                //         date = new Date(date)
                //         const job = new CronJob(date, function() {
                //             smsSend(to, body)
                //                 .then((sms_data)=>{resolve(sms_data)})
                //                 .catch((err)=>{reject(err)})
                //         });
                //
                //         job.start();
                //
                //     } else {
                //
                //         smsSend(to, body)
                //             .then((sms_data)=>{resolve(sms_data)})
                //             .catch((err)=>{reject(err)})
                //
                //     }
                //
                // } else {
                //     reject('not sent')
                // }

            })

        },

        toUser:(user_id, msg) => {

            return new Promise(function(resolve, reject){

                let payload = {
                    _key: user_id,
                    msg: msg
                }

                user_notification.save(payload).then((data)=>{
                    resolve(data)
                }).catch((err)=>{
                    reject(err)
                })

            })

        },

        toAdmin:(user_id, msg) => {

            return new Promise(function(resolve, reject){

                let payload = {
                    _key: user_id,
                    msg: msg,
                    admin: true
                }

                user_notification.save(payload).then((data)=>{
                    resolve(data)
                }).catch((err)=>{
                    reject(err)
                })

            })

        },

        salonNotification:(msg) => {

            return new Promise(function(resolve, reject){

                user_notification.save(msg).then((data)=>{
                    resolve(data)
                }).catch((err)=>{
                    reject(err)
                })

            })

        },

        broadcastToAdmins:(msg) => {

            return new Promise(function(resolve, reject){

                user_notification.save(msg).then((data)=>{
                    resolve(data)
                }).catch((err)=>{
                    reject(err)
                })

            })

        }



    }

    module.exports = notification
