//
// Stripe Payment Gateway Module
// Includes functions and tools for all users
//


// vars

var express = require('express'),
    routes = express.Router(),
    db = require(config.db_connector),
    customer = require('../../models/customers'),
    transaction = require('../../models/transactions'),
    memberships = require('../../models/memberships'),
    stripe = require('stripe')(config.stripe_secret_key),

    settings = {
        default_route: 'checkout',
        views: 'checkout/views'
    },


// functions


    functions = {

        currency:(input)=>{

            return '£'+(parseInt(input)/100).toFixed(2)

        },

        parseName:(input)=>{

            if (typeof input == 'object'){
                return input.first+' '+input.last
            } else {
                return 'No Name'
            }

        }

    }


// routes

    routes.post('/stripe/webhook', (req, res) => {

        let event = req.body
        var stripe_data;

        if (event && event.type){
            switch (event.type) {
                case 'payment_intent.succeeded':

                    stripe_data = event.data.object;
                    let customer_ref, customer_ref_method

                    if (!stripe_data.customer){

                        let payload = {
                            payment_method: stripe_data.charges.data[0].payment_method,
                            name:stripe_data.charges.data[0].billing_details.name
                        }

                        if (stripe_data.charges.data[0].billing_details.email){
                            payload.email = stripe_data.charges.data[0].billing_details.email
                            customer_ref = stripe_data.charges.data[0].billing_details.email
                            customer_ref_method = 'email'
                        }

                        if (stripe_data.charges.data[0].billing_details.phone){
                            payload.phone = stripe_data.charges.data[0].billing_details.phone
                            customer_ref = stripe_data.charges.data[0].billing_details.phone
                            customer_ref_method = 'tel'
                        }

                        var create_customer = stripe.customers.create(payload)

                        if (stripe_data.charges.data[0] && stripe_data.charges.data[0].payment_method_details && stripe_data.charges.data[0].payment_method_details.card && customer_ref && customer_ref_method){
                            customer.addCardInfo(customer_ref,customer_ref_method,stripe_data.charges.data[0].payment_method_details.card)
                        }

                    }

                    if (stripe_data.customer && stripe_data.charges.data[0] && stripe_data.charges.data[0].payment_method_details && stripe_data.charges.data[0].payment_method_details.card){
                        customer.addCardInfo(stripe_data.customer,'stripe_id',stripe_data.charges.data[0].payment_method_details.card)
                    }

                    break;

                case 'payment_method.payment_failed':

                    stripe_data = event.data.object;
                    break;

                case 'invoice.payment_succeeded':

                    stripe_data = event.data.object

                    if (stripe_data.subscription){

                        customer.addSubscriptionID(stripe_data, stripe_data.subscription).then( async (client)=>{

                            stripe_data.client_key = client._key

                            let membership = await memberships.find(stripe_data)

                            if (membership && membership.deposit_amount && parseFloat(membership.deposit_amount) > 0){

                                stripe_data.deposit_amount = parseFloat(membership.deposit_amount)

                                if (membership.type){
                                    stripe_data.membership_type = membership.type
                                } else {
                                    stripe_data.membership_type = 'membership'
                                }

                                customer.updateBalance(stripe_data)

                            } else if (membership && membership.type){

                                customer.membershipReciept(stripe_data, membership.type)

                            } else {

                                customer.membershipReciept(stripe_data, "account")

                            }

                        })

                    }

                    break;

                case 'payment_method.amount_capturable_updated':

                    stripe_data = event.data.object;
                    break;

                case 'customer.created':

                    stripe_data = event.data.object

                    if (stripe_data.email){
                        customer.addStripeID(stripe_data.email, stripe_data.id)
                    }

                    if (stripe_data.phone){
                        customer.addStripeID(stripe_data.phone, stripe_data.id)
                    }
                    break;

                case 'customer.updated':

                    stripe_data = event.data.object;
                    break;

                default:
                    // Unexpected event type
                return res.status(200).end();
            }

            // Return a response to acknowledge receipt of the event
            res.json({received: true});

        } else {
            return res.status(200).end();
        }

    })


    routes.get('/stripe/success', (req, res) => {

        let data = {
            title:"Stripe Checkout",
            stripe_id: config.stripe_publishable_key,
            brand: req.headers.host
        }

        if (req.session && req.session.user){
            user:req.session.user
        } else {
            user:{}
        }

        if (req.session.cart_id && req.session.intent){ // if customer is paying for a cart

            stripe.paymentIntents.retrieve(req.session.intent,(err, paymentIntent)=>{

                if (err){

                    data.type = '400'
                    data.error = err
                    res.render(settings.views+'/checkout.ejs',data)

                } else if (paymentIntent.status == 'succeeded') {

                    customer.processCart(req.session.cart_link, req.session.cart_id, req.session.intent).then((cart_data)=>{

                        let event_data = {
                            // type: 'Online Payment Made',
                            // msg: 'Payment has been made online for transaction '+req.session.cart_id+'. Payment ID: '+req.session.intent,
                            // data: {
                            //     url: '/dashboard/checkout'
                            // }
                            transaction_link: cart_data.transaction_link,
                            cart_total: parseFloat(paymentIntent.amount/100).toFixed(2),
                            cart_id: req.session.cart_id,
                            intent:req.session.intent,
                            customer_id: cart_data.customer._key
                        }
                        //
                        // if (cart_data.customer && cart_data.customer.name && cart_data.customer.name.first){
                        //     msg.msg = cart_data.customer.name.first+' '+cart_data.customer.name.last+' has made payment online for transaction '+req.session.cart_id+'. Payment ID: '+req.session.intent
                        //     msg.data.url = '/dashboard/clients/'+cart_data.customer._key
                        // }
                        //
                        // notification.broadcastToAdmins(msg)

                        events.trigger('payment_link_succeeded',event_data)

                        req.session.intent = false
                        req.session.cart_id = false

                        data.type = 'success_payment_link'
                        res.render(settings.views+'/checkout.ejs',data)

                    }).catch(async(err)=>{

                        let cust_name = '(name not available)'

                        if (req.session.user){
                            cust_name = view.functions.capitalise(req.session.user.name.first+' '+req.session.user.name.last)
                        }

                        let admin_msg = {
                            msg:"The customer has made payment, but the transaction couldn't be completed. Please check any pending and/or completed transactions to verify.<br>Cart ID: "+req.session.cart_id+"<br>Payment ID: "+req.session.intent+"<br><br>Server Error: "+err,
                            type: 'Payment Link Issue for '+cust_name,
                            data: {
                                url: '/dashboard/checkout'
                            }
                        }

                        events.trigger('payment_link_failed',admin_msg)
                        notification.broadcastToAdmins(admin_msg)

                        data.type = 'transaction_err'
                        res.render(settings.views+'/checkout.ejs',data)

                    })

                } else if (paymentIntent.status == 'canceled') {

                    data.type = '400'
                    data.error = 'Your transaction has been canceled'
                    events.trigger('payment_link_failed',data)
                    res.render(settings.views+'/checkout.ejs',data)

                } else {

                    data.type = '402'
                    data.error = 'We are sorry, there was an issue processing your payment. Please try again using a different payment method'
                    events.trigger('payment_link_failed',data)
                    res.render(settings.views+'/checkout.ejs',data)

                }

            })

        } else if (req.session.intent){ // if customer is paying for a balance

            stripe.paymentIntents.retrieve(req.session.intent,(err, paymentIntent)=>{

                if (err){

                    data.type = '400'
                    data.error = err
                    res.render(settings.views+'/checkout.ejs',data)

                } else if (paymentIntent.status == 'succeeded') {

                    customer.updateBalance(paymentIntent,req).then((cart_data)=>{
                    //    req.session.intent = false

                        data.type = 'success'

                        if (req.session && req.session.appointment_confirm){ // if confirming an appointment

                            req.session.intent = false
                            req.session.ok_to_confirm = true
                            req.session.save(function(err) {
                                res.redirect('/book/confirm/'+req.session.appointment_confirm+'/ok')
                            })

                        } else if (req.session && req.session.appointment_cancel){ // if cancelling an appointment

                            req.session.intent = false
                            req.session.ok_to_cancel = true
                            req.session.save(function(err) {
                                res.redirect('/book/confirm/'+req.session.appointment_cancel+'/cancel')
                            })

                        } else if (req.session && req.session.appointment_reschedule){ // if moving an appointment

                            req.session.intent = false
                            req.session.ok_to_cancel = true
                            req.session.save(function(err) {
                                res.redirect('/book/confirm/'+req.session.appointment_reschedule+'/reschedule')
                            })

                        } else { // otherwise just redirect

                            req.session.intent = false
                            req.session.save(function(err) {
                                res.render(settings.views+'/checkout.ejs',data)
                            })

                        }

                    })

                } else if (paymentIntent.status == 'canceled') {

                    data.type = '400'
                    data.error = 'Your transaction has been canceled'
                    res.render(settings.views+'/checkout.ejs',data)

                } else {

                    data.type = '402'
                    data.error = 'We are sorry, there was an issue processing your payment. Please try again using a different payment method'
                    res.render(settings.views+'/checkout.ejs',data)

                }

            })

        } else {
            data.type = '404'
            res.render(settings.views+'/checkout.ejs',data)
        }

    })

        routes.get('/stripe/appointment-cancellation', async (req,res)=>{

            res.locals.functions = functions

            if (req.query && req.query.appointment_id){
                req.session.appointment_cancel = req.query.appointment_id
            } else if (req.session.appointment_cancel){
                delete req.session.appointment_cancel
            }

            let amount = await transaction.getTotal(req.query.appointment_key)

            amount = parseFloat(amount.total)/2
            let amount100 = parseFloat(amount)*100

            var data = {
                    title: 'A cancellation fee is required to cancel your appointment within 48 hours',
                    text: 'This amount will be credited to your account and can be used for any future appointments',
                    total:parseInt(amount100).toFixed(0),
                    user: false,
                    cart: {
                        items:[
                            {name:'Appointment Cancellation', price:amount, total:amount, quantity:1}
                        ]
                    },
                    methods:[],
                    brand: req.headers.host
                },
                paymentIntent,
                paymentMethods

            (async () => {

                if (req.session && req.session.user){
                    data.user = req.session.user
                } else if (req.query && req.query.client_id){
                    data.user = await customer.find(req.query.client_id)
                    req.session.user = data.user
                }

                if (data.user.stripe_id){

                    paymentMethods = await stripe.paymentMethods.list({
                        customer: data.user.stripe_id,
                        type: 'card',
                    });

                    paymentIntent = await stripe.paymentIntents.create({
                        amount: data.total,
                        currency: 'gbp',
                        payment_method_types: ['card'],
                        setup_future_usage: 'off_session',

                        customer: data.user.stripe_id,
                        metadata:{
                            balance_top_up: req.session.user._key
                        }
                    });

                    data.methods = paymentMethods.data

                } else if (data.user._key){

                    paymentIntent = await stripe.paymentIntents.create({
                        amount: data.total,
                        currency: 'gbp',
                        payment_method_types: ['card'],
                        setup_future_usage: 'off_session',

                        metadata:{
                            balance_top_up: data.user._key
                        }
                    });

                } else {

                    res.redirect('/login')
                    return false

                }

                data.intent = paymentIntent
                data.stripe_id = config.stripe_publishable_key
                req.session.intent = paymentIntent.id

                res.render(settings.views+'/stripe.ejs', data)

            })();

        })

        routes.get('/stripe/appointment-reschedule', async (req,res)=>{

            res.locals.functions = functions

            if (req.query && req.query.appointment_id){
                req.session.appointment_reschedule = req.query.appointment_id
            } else if (req.session.appointment_reschedule){
                delete req.session.appointment_reschedule
            }

            let amount = await transaction.getTotal(req.query.appointment_key)

            amount = parseFloat(amount.total)/2

            let amount100 = parseFloat(amount)*100

            var data = {
                    title: 'A contribution is required to move or change your appointment within 48 hours',
                    text: 'This amount will be credited to your account and can be used for any future appointments',
                    total:parseInt(amount100).toFixed(0),
                    user: false,
                    cart: {
                        items:[
                            {name:'Appointment Change', price:amount}
                        ]
                    },
                    methods:[],
                    brand: req.headers.host
                },
                paymentIntent,
                paymentMethods

            (async () => {

                if (req.session && req.session.user){
                    data.user = req.session.user
                } else if (req.query && req.query.client_id){
                    data.user = await customer.find(req.query.client_id)
                    req.session.user = data.user
                }

                if (data.user.stripe_id){

                    try {

                        paymentMethods = await stripe.paymentMethods.list({
                            customer: data.user.stripe_id,
                            type: 'card',
                        });

                        paymentIntent = await stripe.paymentIntents.create({
                            amount: data.total,
                            currency: 'gbp',
                            payment_method_types: ['card'],
                            setup_future_usage: 'off_session',

                            customer: data.user.stripe_id,
                            metadata:{
                                balance_top_up: req.session.user._key
                            }
                        })

                        data.methods = paymentMethods.data

                    }

                    catch(e){
                        paymentIntent = await stripe.paymentIntents.create({
                            amount: data.total,
                            currency: 'gbp',
                            payment_method_types: ['card'],
                            setup_future_usage: 'off_session',

                            metadata:{
                                balance_top_up: data.user._key
                            }
                        })
                    }



                } else if (data.user._key){

                    paymentIntent = await stripe.paymentIntents.create({
                        amount: data.total,
                        currency: 'gbp',
                        payment_method_types: ['card'],
                        setup_future_usage: 'off_session',

                        metadata:{
                            balance_top_up: data.user._key
                        }
                    });

                } else {

                    res.redirect('/login')
                    return false

                }

                data.intent = paymentIntent
                data.stripe_id = config.stripe_publishable_key
                req.session.intent = paymentIntent.id

                res.render(settings.views+'/stripe.ejs', data)

            })();

        })

        routes.get('/stripe/appointment-deposit', (req,res)=>{

            res.locals.functions = functions

            if (req.query && req.query.appointment_id){
                req.session.appointment_confirm = req.query.appointment_id
            } else if (req.session.appointment_confirm){
                delete req.session.appointment_confirm
            }

            var data = {
                    title: 'To confirm your appointment, we require a small deposit',
                    text: 'This will secure your appointment and the amount will be deducted from your final bill',
                    sub_text: 'You consent to your payment card being used to debit the full amount of the appointment in the event you cancel with less than 48 hours prior to the appointment time, or in the event of not attending your appointment',
                    total:parseFloat(500).toFixed(0),
                    user: false,
                    cart: {
                        items:[
                            {name:'Appointment Deposit', price:'5.00'}
                        ]
                    },
                    methods:[],
                    brand: req.headers.host
                },
                paymentIntent,
                paymentMethods

            (async () => {

                if (req.session && req.session.user){
                    data.user = req.session.user
                } else if (req.query && req.query.client_id){
                    data.user = await customer.find(req.query.client_id)
                    req.session.user = data.user
                }

                if (data.user.stripe_id){

                    paymentMethods = await stripe.paymentMethods.list({
                        customer: data.user.stripe_id,
                        type: 'card',
                    });

                    paymentIntent = await stripe.paymentIntents.create({
                        amount: data.total,
                        currency: 'gbp',
                        payment_method_types: ['card'],
                        setup_future_usage: 'off_session',

                        customer: data.user.stripe_id,
                        metadata:{
                            balance_top_up: req.session.user._key
                        }
                    });

                    data.methods = paymentMethods.data

                } else if (data.user._key){

                    paymentIntent = await stripe.paymentIntents.create({
                        amount: data.total,
                        currency: 'gbp',
                        payment_method_types: ['card'],
                        setup_future_usage: 'off_session',

                        metadata:{
                            balance_top_up: data.user._key
                        }
                    });

                } else {

                    res.redirect('/login')
                    return false

                }

                data.intent = paymentIntent
                data.stripe_id = config.stripe_publishable_key
                req.session.intent = paymentIntent.id

                res.render(settings.views+'/stripe.ejs', data)

            })();

        })


    routes.get('/stripe/:key?/:index?', (req, res) => {

        res.locals.functions = functions

        if (req.params.key){

            customer.getCart(req.params.key).then((cust_data)=>{

                req.session.user = cust_data
                req.session.user.guard = 'customer'

                if (cust_data && cust_data.cart && typeof cust_data.cart == 'object'){

                    req.session.cart_id = cust_data.cart.id
                    req.session.cart_link = req.params.key

                    let data = {
                        title:"Checkout",
                        cart:cust_data.cart,
                        total:parseFloat(cust_data.cart.total)*100,
                        methods:[],
                        brand: req.headers.host
                    }

                    if (req.session && req.session.user){
                        data.user = req.session.user
                    } else {
                        data.user = cust_data
                    }

                    (async () => {

                        var paymentIntent, paymentMethods

                        if (data.user.stripe_id){ // existing stripe customer

                            paymentMethods = await stripe.paymentMethods.list({
                                customer: data.user.stripe_id,
                                type: 'card',
                            });

                            paymentIntent = await stripe.paymentIntents.create({
                                amount: parseInt(data.total).toFixed(0),
                                currency: 'gbp',
                                payment_method_types: ['card'],
                                customer: data.user.stripe_id,
                                setup_future_usage: 'off_session',

                                metadata:{
                                    balance_top_up: data.user._key
                                }
                            });
                            data.methods = paymentMethods.data

                        } else { // registered user without stripe ID

                            paymentIntent = await stripe.paymentIntents.create({
                                amount: data.total,
                                currency: 'gbp',
                                payment_method_types: ['card'],
                                setup_future_usage: 'off_session',
                                //
                                // receipt_email: data.user.email,
                                setup_future_usage: 'off_session'
                            });

                        }

                        data.intent = paymentIntent
                        data.stripe_id = config.stripe_publishable_key
                        req.session.intent = paymentIntent.id

                        res.render(settings.views+'/stripe.ejs', data)

                    })();

                } else {
                    res.redirect('/checkout/404')
                }

            }).catch((err)=>{

                let data = {
                    title:"Stripe Checkout",
                    cart:{},
                    total:0,
                    methods:[],
                    error:err,
                    stripe_id: config.stripe_publishable_key,
                    brand: req.headers.host
                }
                res.render(settings.views+'/stripe.ejs',data)
            })


        } else {

            let data = {
                title:"Stripe Checkout",
                total:0,
                brand: req.headers.host
            }

            if (req.session && req.session.user){
                data.user = req.session.user
            } else {
                data.user = {}
            }

            (async () => {

                const paymentIntent = await stripe.paymentIntents.create({
                    amount: parseInt(data.total).toFixed(0),
                    currency: 'gbp',
                    payment_method_types: ['card'],
                    setup_future_usage: 'off_session',

                });

                data.intent = paymentIntent
                data.stripe_id = config.stripe_publishable_key
                req.session.intent = paymentIntent.id

                res.render(settings.views+'/stripe.ejs', data)

            })();

        }

    })

    routes.post('/topup', (req,res)=>{

        res.locals.functions = functions

        if (!req.session.user){
            res.redirect('/login')
            return
        }

        if (req.body.amount && req.body.amount > 0 && req.session && req.session.user && req.session.user._key){

            var data = {
                    title: 'Top Up Your Balance',
                    user: req.session.user,
                    total:(parseFloat(req.body.amount)*100).toFixed(0),
                    methods:[],
                    brand: req.headers.host
                },
                paymentIntent,
                paymentMethods

            (async () => {

                if (data.user.stripe_id){

                    paymentMethods = await stripe.paymentMethods.list({
                        customer: data.user.stripe_id,
                        type: 'card',
                    });

                    paymentIntent = await stripe.paymentIntents.create({
                        amount: data.total,
                        currency: 'gbp',
                        payment_method_types: ['card'],
                        customer: data.user.stripe_id,
                        setup_future_usage: 'off_session',

                        metadata:{
                            balance_top_up: req.session.user._key
                        }
                    });

                    data.methods = paymentMethods.data

                } else {

                    paymentIntent = await stripe.paymentIntents.create({
                        amount: data.total,
                        currency: 'gbp',
                        payment_method_types: ['card'],
                        setup_future_usage: 'off_session',

                        metadata:{
                            balance_top_up: req.session.user._key
                        }
                    });

                }

                data.intent = paymentIntent
                data.stripe_id = config.stripe_publishable_key
                req.session.intent = paymentIntent.id


                res.render(settings.views+'/stripe.ejs', data)

            })();

        }

    })




// export


    module.exports = functions
    module.exports.routes = routes
    module.exports.settings = settings
