//
// Default Routes
// Includes functions and tools for all users
//


// vars

var express = require('express'),
    routes = express.Router(),
    db = require(global.config.db_connector),
    appointment = require('../../models/appointments'),
    customer = require('../../models/customers'),

    settings = {
        default_route: 'book',
        views: 'book/views',
        menu: {
            nav: [{link:'Book',slug:'/'}]
        }
    },


// methods

    functions = {

        parseDate: (date, format) => {
            return moment(date).format(format)
        }

    }


// routes

    let data = {}

    routes.use('/static', express.static(__dirname + '/static'))

    routes.get('*', (req, res, next) => {

        view.current_view = 'home'

        data.brand = req.headers.host

        // if (req.session && req.session.user && req.session.user.existing && req.session.user.existing === true){
        //     req.session.guard = ''
        //     req.session.destroy()
        // }

        if (req.session && req.session.user){
            data.user = req.session.user
        } else {
            data.user = {}
        }

        next()

    })

    routes.get('/promotion/:key', async (req, res) => {

        data.promotion = await appointment.findWithoutCustomer(req.params.key, true)
        data.include_scripts = [settings.views+'/scripts/promo_appointment.ejs']

        if (data.promotion && !data.promotion.service_id){

            data.title = data.promotion.description

            if (data.promotion.promotion){
                data.promotion.promotion_parse = data.promotion.promotion.replace(/-/g,'')

                if (!data.promotion.promotion_parse.match(/%/) && !data.promotion.promotion_parse.match(/£/)){
                    data.promotion.promotion_parse = '£'+data.promotion.promotion_parse
                }
            }


        } else {
            data.promotion = {}
        }

        res.render(settings.views+'/promotion_book.ejs', data)

    })

    routes.get('/:salon?/thank-you', (req, res) => {

        data.title = 'Thank You'
        data.confirmation = false

        res.render(settings.views+'/thank_you.ejs', data)

    })

    routes.get('/:salon?/thank-you-confirmation', (req, res) => {

        data.title = 'Thank You'
        data.confirmation = true
        res.render(settings.views+'/thank_you.ejs', data)

    })

    routes.get('/:key?', async (req, res) => {

        data.title = 'Book an appointment'

        if (req.params.key){
            data.appt_key = req.params.key
        }

        if (req.session && req.session.user){
            let blocked = await customer.isBlocked(req.session.user._key)

            if (blocked === true){
                res.render(settings.views+'/blocked.ejs', data)
                return
            }
        }

        data.include_scripts = [settings.views+'/scripts/appointment.ejs']

        res.render(settings.views+'/book.ejs', data)

    })

    routes.post('/find-or-save', async (req, res) => {

        let client = await customer.findOrSave(req.body)
        if (!client.existing){
            req.session.user = client
        }

        res.json(client)

    })

    routes.get('/confirm/:confirm_id/ok', (req, res) => {

        appointment.getConfirm(req.params.confirm_id).then((appt_data)=>{

            let card = false

            if (appt_data[0].customer.stripe_id && appt_data[0].customer.card_info && appt_data[0].customer.card_info.exp_month && appt_data[0].customer.card_info.exp_year){ // redirect to deposit if client has a card on file but it's expired

                let expiry_date = moment().set({month:appt_data[0].customer.card_info.exp_month, year:appt_data[0].customer.card_info.exp_year})
                if (expiry_date.isBefore(moment(),'month')){
                    card = 'expired'
                } else {
                    card = true
                }

            } else if (appt_data[0] && appt_data[0].customer && appt_data[0].customer.stripe_id){ // redirect to deposit if no stripe ID
                card = true
            }

            if (appt_data[0] && appt_data[0].deposit_taken && appt_data[0].deposit_taken.match(/Z/) || appt_data[0] && appt_data[0].confirm_id && req.session.ok_to_confirm || card === true){ // confirm appt if deposit has been taken, or ok to confirm

                if (req.session){
                    delete req.session.intent
                    delete req.session.ok_to_confirm
                    delete req.session.appointment_confirm
                }

                appointment.confirm(req.params.confirm_id).then((appt_data)=>{
                    res.render(settings.views+'/confirmed.ejs', {user:req.session.user, appt:appt_data[0],brand: req.headers.host})
                }).catch((err)=>{
                    res.render(settings.views+'/confirmed.ejs', {user:req.session.user, appt:{}, brand: req.headers.host})
                })

            } else if (card === false){ // redirect to deposit if no stripe ID

                res.redirect('/checkout/stripe/appointment-deposit?appointment_id='+appt_data[0].confirm_id+'&&client_id='+appt_data[0].customer_id)

            } else if (card == 'expired'){ // redirect to deposit if client has a card on file but it's expired

                res.redirect('/checkout/stripe/appointment-deposit?appointment_id='+appt_data[0].confirm_id+'&&client_id='+appt_data[0].customer_id)

            } else {

                res.render(settings.views+'/confirmed.ejs', {user:req.session.user, appt:{}, brand: req.headers.host})
            }

        }).catch((err)=>{
            res.render(settings.views+'/confirmed.ejs', {user:req.session.user, appt:{}, brand: req.headers.host})
        })

    })

    routes.get('/confirm/:confirm_id/cancel', async (req, res) => {

        if (req.session){
            delete req.session.intent
            delete req.session.appointment_confirm
        }

        let appt_check = await appointment.customerCancel(req.params.confirm_id,true)

        if (appt_check && appt_check[0] && appt_check[0].date && appt_check[0].link_id){

            if (appt_check[0].cancellation_fee_paid || moment(appt_check[0].date).diff(moment(),'hours') > 48 || req.session.ok_to_cancel == true){

                let fee_paid = false

                if (req.session){
                    if (req.session.ok_to_cancel == true){
                        fee_paid = true
                    }

                    delete req.session.intent
                    delete req.session.appointment_cancel
                    delete req.session.ok_to_cancel
                }

                appointment.customerCancel(req.params.confirm_id,false,fee_paid).then((appt_data)=>{
                    res.render(settings.views+'/cancelled.ejs', {user:req.session.user, appt:appt_data[0],brand: req.headers.host})
                })

            } else {

                if (req.session){
                    delete req.session.intent
                    delete req.session.appointment_cancel
                    delete req.session.ok_to_cancel
                }

                res.redirect('/checkout/stripe/appointment-cancellation?appointment_key='+appt_check[0]._key+'&&appointment_id='+appt_check[0].link_id+'&&client_id='+appt_check[0].customer_id)

            }

        } else {
            res.redirect('/book/amend/'+req.params.confirm_id)
        }

    })

    routes.get('/confirm/:confirm_id/select-date', async (req, res) => {
        let appt_data = await appointment.customerReschedule(req.params.confirm_id,true)
        res.render(settings.views+'/reschedule.ejs', {user:req.session.user, appt:appt_data[0], brand: req.headers.host})
    })

    routes.get('/confirm/:confirm_id/reschedule', async (req, res) => {

        if (req.session){
            delete req.session.intent
            delete req.session.appointment_reschedule
        }

        var note = ''

        if (req.body && req.body.note){
            note = req.body.note
        } else if (req.session.note){
            note = req.session.note
        }

        let appt_check = await appointment.customerReschedule(req.params.confirm_id,true)

        if (appt_check && appt_check[0] && appt_check[0].date && appt_check[0].link_id){

            if (moment(appt_check[0].date).diff(moment(),'hours') > 48 || req.session.ok_to_cancel == true){

                let fee_paid = false

                if (req.session.ok_to_cancel == true){
                    fee_paid = true
                }

                if (req.session){
                    delete req.session.intent
                    delete req.session.appointment_reschedule
                    delete req.session.ok_to_cancel
                }

                appointment.customerReschedule(req.params.confirm_id,false,fee_paid, note).then((appt_data)=>{
                    res.render(settings.views+'/cancelled.ejs', {user:req.session.user, appt:appt_data[0], brand: req.headers.host})
                })

            }
        }
    })

    routes.post('/confirm/:confirm_id/reschedule', async (req, res) => {

        if (req.session){
            delete req.session.intent
            delete req.session.appointment_reschedule
        }

        var note = ''

        if (req.body && req.body.note){
            note = req.body.note
        }

        let appt_check = await appointment.customerReschedule(req.params.confirm_id,true)

        if (appt_check && appt_check[0] && appt_check[0].date && appt_check[0].confirm_id){

            if (appt_check[0].reschedule_fee_paid || moment(appt_check[0].date).diff(moment(),'hours') > 48 || req.session.ok_to_cancel == true){

                let fee_paid = false

                if (req.session.ok_to_cancel == true){
                    fee_paid = true
                }

                if (req.session){
                    delete req.session.intent
                    delete req.session.appointment_reschedule
                    delete req.session.ok_to_cancel
                }

                appointment.customerReschedule(req.params.confirm_id,false,fee_paid, note).then((appt_data)=>{
                    res.render(settings.views+'/cancelled.ejs', {user:req.session.user, appt:appt_data[0], brand: req.headers.host})
                })

            } else {

                if (req.session){
                    delete req.session.intent
                    delete req.session.appointment_reschedule
                    delete req.session.ok_to_cancel
                }

                req.session.note = note

                res.redirect('/checkout/stripe/appointment-reschedule?appointment_key='+appt_check[0]._key+'&&appointment_id='+appt_check[0].link_id+'&&client_id='+appt_check[0].customer_id)

            }

        } else {

            res.redirect('/book/confirm/'+req.params.confirm_id)

        }

    })
    //
    // routes.get('/confirm/:confirm_id/reschedule', (req, res) => {
    //
    //     delete req.session.intent
    //     delete req.session.appointment_confirm
    //     appointment.customerReschedule(req.params.confirm_id).then((appt_data)=>{
    //         res.render(settings.views+'/cancelled.ejs', {user:req.session.user, appt:appt_data[0]})
    //     })
    //
    // })

    routes.get('/confirm/:confirm_id', (req, res) => {

        if (req.session){
            delete req.session.ok_to_confirm
            delete req.session.intent
        }

        res.locals.functions = functions

        appointment.getConfirm(req.params.confirm_id).then((appt_data)=>{

            let user = {}
            if (req.session && !req.session.user || req.session && req.session.user && !req.session.user._key){
                req.session.user = appt_data[0].customer
                req.session.user.guard = 'customer'
                user = req.session.user
            }
            res.render(settings.views+'/confirm.ejs', {user:user, confirm_id:req.params.confirm_id, appt:appt_data, brand: req.headers.host, include_scripts: [settings.views+'/scripts/appointment.ejs']})
        }).catch((err)=>{
            log('Component Book | index.js: '+err)
            console.log(req.session.user)
            let user = {}
            if (req.session && req.session.user){
                user = req.session.user
            }
            res.render(settings.views+'/confirm.ejs', {user:user,appt:[], brand: req.headers.host})
        })

    })

    routes.get('/amend/:key', (req, res) => {

        if (req.session){
            delete req.session.intent
        }

        res.locals.functions = functions

        appointment.customerAmend(req.params.key).then((appt_data)=>{

            res.render(settings.views+'/confirm.ejs', {user:req.session.user, appt:appt_data, brand: req.headers.host, include_scripts: [settings.views+'/scripts/appointment.ejs']})

        }).catch((err)=>{
            res.render(settings.views+'/confirm.ejs', {user:req.session.user,appt:[], brand: req.headers.host})
        })

    })

// export

    module.exports = functions
    module.exports.routes = routes
    module.exports.settings = settings
