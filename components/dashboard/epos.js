//
// Dashboard Module
// Includes functions and tools for all users
//

// vars

var express = require('express'),
    routes = express.Router(),
    db = require(config.db_connector),
    transaction = require('../../models/transactions'),
    customer = require('../../models/customers'),
    staff = require('../../models/staff'),
    moment = require('moment'),
    stripe = require('stripe')(config.stripe_secret_key),

    settings = {
        default_route: 'dashboard',
        views:'dashboard/views',

        menu: {
            dashboard_menu: [{link:'Checkout',slug: '/checkout',icon:'sale', weight:5, subitems:[
                {link:'Transactions',slug: '/checkout/transactions', weight:1, min_role:1},
                {link:'Vouchers',slug: '/checkout/vouchers', weight:2},
                {link:'Store Discount Codes',slug: '/checkout/offer-codes?type=Store', weight:2, min_role:3},
                {link:'Caffe Discount Codes',slug: '/checkout/offer-codes?type=Caffe', weight:2, min_role:3}
            ]}]
        }
    },


// methods

    functions = {

        parseDate:(date)=>{
            return moment(date).format('Do MMM HH:mm')
        }

    }


// routes

    routes.use('/static', express.static(__dirname + '/static'))

    routes.get('*',(req, res, next)=>{

        if (req.session && req.session.user && req.session.user._key){
            view.current_view = 'dashboard'
            view.dashboard_category = 'checkout'
            next()
        } else {
            res.redirect('/login/staff')
        }

    })

    routes.get('/checkout/transactions/print/:key', async (req, res) => {

        view.dashboard_view = 'transactions'

        res.locals.functions = functions
        let data = {
                user:req.session.user,
                title: "Transactions"
            }

        data.transaction = await transaction.find(req.params.key)
        data.transaction = data.transaction[0]
        data.customer = {}
        if (data.transaction.customer_id){
            customer.find(data.transaction.customer_id).then((cust_data)=>{
                data.customer = cust_data
                res.render(settings.views+'/checkout_transaction_print.ejs',data)
            }).catch((err)=>{
                res.render(settings.views+'/checkout_transaction_print.ejs',data)
            })
        } else {
            res.render(settings.views+'/checkout_transaction_print.ejs',data)
        }

    })

    routes.get('/checkout/transactions', (req, res) => {

        view.dashboard_view = 'transactions'

        res.locals.functions = functions
        let data = {
                user:req.session.user,
                title: "Completed Transactions",
                include_scripts: [settings.views+'/scripts/checkout.ejs']
            }

        if (req.cookies && req.cookies.mini_menu){
            data.mini_menu = req.cookies.mini_menu
        }

        res.render(settings.views+'/checkout_transactions.ejs',data)

    })

    routes.get('/checkout/vouchers', (req, res) => {

        view.dashboard_view = 'vouchers'

        res.locals.functions = functions
        let data = {
            user:req.session.user,
            title: "Vouchers",
        }

        if (req.cookies && req.cookies.mini_menu){
            data.mini_menu = req.cookies.mini_menu
        }

        res.render(settings.views+'/salon_vouchers.ejs',data)

    })

    routes.get('/checkout/offer-codes', (req, res) => {

        view.dashboard_view = 'offer codes'

        res.locals.functions = functions
        let data = {
                user:req.session.user,
                title: "Offer Codes",
                include_scripts: [settings.views+'/scripts/checkout.ejs']
            }
        
        if (req.cookies && req.cookies.mini_menu){
            data.mini_menu = req.cookies.mini_menu
        }

       if(req.query.type==="Store"){
        res.render(settings.views+'/checkout_offer_codes.ejs',data)
        }
       else{
        res.render(settings.views+'/checkout_offer_codes_caffe.ejs',data)
        }

    })

    routes.get('/checkout/stripe/:key', (req, res) => {

        transaction.cart({id:req.params.key}).then(async (cart_data)=>{

            if (typeof cart_data == 'object'){

                let data = {
                    title:"Checkout",
                    cart:cart_data,
                    total:parseFloat(cart_data.total)*100,
                    methods:[]
                }

                data.total = parseInt(parseFloat(data.total).toFixed(0))

                data.user = await customer.find(cart_data.customer_id)

                var paymentIntent, paymentMethods

                if (data.user.stripe_id){ // existing stripe customer

//                     if (cart_data.stripe_data && cart_data.stripe_data.intent && cart_data.stripe_data.intent.id && cart_data.stripe_data.selected_method){
// console.log(1, cart_data.stripe_data.intent.id)
//                         paymentIntent = await stripe.paymentIntents.capture(cart_data.stripe_data.intent.id)
// console.log(paymentIntent)
//                     } else {
// console.log(2)
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
                                balance_top_up: data.user._key
                            }
                        });
                        data.methods = paymentMethods.data

                    // }

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

                res.json(data)

            } else {
                res.status(404).send('No customer data supplied')
            }

        }).catch((err)=>{
            res.status(404).send(err)
        })

    })

    routes.get('/checkout/:id?', async (req, res) => {

        view.dashboard_view = 'checkout'

        res.locals.functions = functions
        let data = {
                user:req.session.user,
                title: "Checkout",
                include_scripts: [settings.views+'/scripts/checkout.ejs']
            }

        if (req.cookies && req.cookies.mini_menu){
            data.mini_menu = req.cookies.mini_menu
        }

        data.staff = await staff.all()

        if (req.params.id && req.params.id == 'new'){

            transaction.newTransaction(false, req).then((new_cart) => {

                res.redirect('/dashboard/checkout/'+new_cart.id.replace('cart_',''))

            }).catch(err=>{
                res.send(err)
            })

        } else if (req.params.id){

            localStorage.get('cart_'+req.params.id).then( async (cart)=>{

                if (cart){

                    data.cart_id = 'cart_'+req.params.id
                    data.cart = cart

                    if (cart.customer_id){
                        data.customer = await customer.find(cart.customer_id)
                    }

                    if (typeof data.customer == 'object'){
                        data.recommended_products = await customer.recommendedProducts(data.customer._key)
                        data.customer.next_appointments = await customer.futureAppointments(data.customer._key)
                    }


                    res.render(settings.views+'/checkout.ejs',data)

                } else {

                    transaction.find(req.params.id).then(async (transaction_data)=>{

                        localStorage.set(transaction_data[0].id, transaction_data[0])

                        data.cart_id = transaction_data[0].id
                        data.transaction_key = transaction_data[0]._key
                        data.cart_id = transaction_data[0].id
                        data.cart = transaction_data[0]

                        data.recommended_products = []
                        data.customer = {}

                        if (transaction_data[0].customer_id){
                            try {
                                data.customer = await customer.find(transaction_data[0].customer_id)
                            }
                            catch(err){
                                data.customer = {}
                            }
                        }

                        res.render(settings.views+'/checkout.ejs',data)

                    })

                }

            })

        } else {

            data.cart_id = null

            localStorage.list('cart_').then((carts)=>{

                var sortable = [];
                for (var i in carts) {
                    if (!carts[i]._created){
                        carts[i]._created = moment().subtract(1,'day').toISOString()
                    }
                    sortable.push(carts[i]);
                }

                sortable.sort(function(a,b) {
                    return -a._created.localeCompare(b._created)
                });

                data.carts = {}

                sortable.forEach(function(item){
                    data.carts[item.id]=item
                })

                res.render(settings.views+'/checkout.ejs',data)
            })

        }

    })





// export

    module.exports = functions
    module.exports.routes = routes
    module.exports.settings = settings
