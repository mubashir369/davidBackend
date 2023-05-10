//
// Dashboard Module
// Includes functions and tools for all users
//


// vars

const express = require('express'),
    moment = require('moment'),
    routes = express.Router(),
    db = require(global.config.db_connector),
    customers = require('../../models/customers'),
    marketing_campaign = require('../../models/marketing_campaigns'),
    Pstmk = require("postmark"),

    settings = {

        default_route: 'root',
        views: 'dashboard/views',
        protected_guards:['staff','admin']

    }

const postmark = new Pstmk.ServerClient(config.email.api_key)


// methods

const functions = {

        sendBatch:(recipients, campaign, template_id, delay) => {

            return new Promise((resolve, reject) => {

                if (!recipients){
                    recipients = ['lee@reformedreality.com','lee@marimo.co','leeanderson60@gmail.com']
                }

                if (!template_id){
                    reject('no template ID')
                    return
                }

                let base_payload = {
                    "From": config.email.from_address,
                    "TemplateID": template_id,
                    "MessageStream": 'Promotions',
                    "TemplateModel": {
                        "content": campaign.content,
                        "subject": campaign.subject
                    }
                }

                if (campaign.image){
                    base_payload.TemplateModel.image = campaign.image
                }

                if (campaign.button_text && campaign.button_url){
                    base_payload.TemplateModel.button = {}
                    base_payload.TemplateModel.button.text = campaign.button_text
                    base_payload.TemplateModel.button.url = campaign.button_url
                }

                let payload = recipients.map((recipient) => {

                    if (recipient && recipient.match(/(.*?)@(.*?)\.(.*?)/)){
                        let result = JSON.parse(JSON.stringify(base_payload))
                        result.To = recipient
                        result.TemplateModel.recipient = recipient
                        return result
                    }

                }).filter((item)=>{
                    return item != null
                })

                postmark.sendEmailBatchWithTemplates(payload, function(error, email_res) {
                    if(error) {
                        console.log('Component Dashboard | bulk_email.js: ',JSON.stringify(error))
                        reject(error)
                        return
                    }
                    resolve(email_res)
                })

            //    resolve(payload)

            });
        }

    }

    routes.get('/dashboard/promotional-email/send/:id', async (req,res) => {

        let data = {},
            batch_size = 400,
            timenow = moment().toISOString()

        db.query('FOR m IN marketing_campaigns FILTER m._key == "'+req.params.id+'" && m.tested == true UPDATE m WITH {last_run: "'+timenow+'"} IN marketing_campaigns RETURN m', async (campaign)=>{

            if (campaign.length > 0 && campaign[0].query_func){

                let recipients

                if (campaign[0].query_val){
                    recipients = await marketing_campaign[campaign[0].query_func](campaign[0].query_val, true)
                } else {
                    recipients = await marketing_campaign[campaign[0].query_func](false, true)
                }

                function sendLoop(){

                    let batch = recipients.splice(0,batch_size)

                    if (batch.length > 0){
                        functions.sendBatch(batch,campaign[0],'21183394').then((email_res)=>{
                            sendLoop()
                        }).catch((err)=>{
                            res.send(err)
                        })
                    } else {
                        res.send('done')
                    }

                }

                sendLoop()

            } else {
                res.send('No recipients found. Please add recipients and test the campaign before sending')
            }

        })

    })

    routes.get('/dashboard/promotional-email/test/:id', async (req,res) => {

        let data = {},
            batch_size = 500,
            timenow = moment().toISOString()

        db.query('FOR m IN marketing_campaigns FILTER m._key == "'+req.params.id+'" UPDATE m WITH {tested: true} IN marketing_campaigns RETURN m', (campaign)=>{

            if (campaign.length > 0){

                let recipients = []
                recipients.push(req.session.user.email)

                function sendLoop(){

                    let batch = recipients.splice(0,batch_size)

                    if (batch.length > 0){
                        functions.sendBatch(batch,campaign[0],'21183394').then((email_res)=>{
                            sendLoop()
                        }).catch((err)=>{
                            res.send(err)
                        })
                    } else {
                        res.send('Test sent to '+req.session.user.email)
                    }

                }

                sendLoop()

            } else {
                res.send('No recipients found')
            }

        })

    })


    routes.get('/unsubscribe/:email', async (req,res) => {

        db.query('FOR c IN customers FILTER c.email == "'+req.params.email+'" UPDATE c WITH {unsubscribe:true} IN customers RETURN c.email', (user)=>{

            let data = {
                title: "Unsubscribe Successful",
                email: req.params.email,
                brand: req.headers.host
            }
            res.render(settings.views+'/unsubscribe.ejs',data)

        })

    })


    routes.get('/subscribe/:email', async (req,res) => {

        db.query('FOR c IN customers FILTER c.email == "'+req.params.email+'" UPDATE c WITH {unsubscribe:false} IN customers RETURN c.email', (user)=>{

            let data = {
                title: "Subscription Successful",
                email: req.params.email,
                brand: req.headers.host
            }
            res.render(settings.views+'/subscribe.ejs',data)

        })

    })

    routes.post('/postmark-webhook', async (req,res) => {

        if (req.headers && req.headers.auth == '23098420938402938402' && req.body && req.body.RecordType){

            let client_email = req.body.Recipient

            if (typeof client_email == 'object' && client_email[0]){
                client_email = client_email[0]
            }

            if (req.body.RecordType == "SubscriptionChange"){

                let unsub = 'true'

                if (req.body.SuppressSending == false){
                    unsub = 'false'
                }

                db.query('FOR c IN customers FILTER c.email == "'+client_email+'" UPDATE c WITH {unsubscribe:'+unsub+'} IN customers RETURN c.email', (user)=>{
                    res.status(200).send('ok')
                })

            } else if (req.body.RecordType == "Bounce"){

                let unsub = 'true',
                    log = {
                        "date": req.body.BouncedAt,
                        "user": {},
                        "log": "Email bounced, auto unsubscribing from marketing emails"
                    }

                db.query('FOR c IN customers FILTER c.email == "'+client_email+'" UPDATE c WITH {unsubscribe:true,email_bounce:true, PUSH(c.log, '+JSON.stringify(log)+')} IN customers RETURN c.email', (user)=>{
                    res.status(200).send('ok')
                })

            } else if (req.body.RecordType == "Delivery"){

                // let data = {
                //     MessageID: req.body.MessageID,
                //     MessageStream: req.body.MessageStream,
                //     Recipient: req.body.Recipient,
                //     DeliveredAt: req.body.DeliveredAt
                // }
                //
                db.query('FOR c IN customers FILTER c.email == "'+client_email+'" UPDATE c WITH {email_bounce:false} IN customers RETURN c.email', (user)=>{
                    res.status(200).send('ok')
                })

            } else {
                res.status(200).send('ok')
            }

        } else {
            res.status(404).send('not found')
        }

    })

    module.exports = functions
    module.exports.routes = routes
    module.exports.settings = settings
