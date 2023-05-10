//
// Checkout Module with Payment Gateway integration
// Includes functions and tools for all users
//

// vars

var express = require('express'),
    routes = express.Router(),
    customer = require('../../models/customers'),
    db = require(config.db_connector),

    settings = {
        default_route: 'checkout',
        views:'checkout/views',
        menu: {
        //    nav: [{link:'Checkout',slug: '/'}],
        },
        includes: [
            {name:'stripe',path:'stripe.js'}
        ]
    },


// functions


    functions = {

    }


// routes


    routes.get('/', (req, res) => {

        let data = {
            title:"Stripe Checkout",
            brand: req.headers.host
        }

        if (req.session && req.session.user){
            user:req.session.user
        } else {
            user:{}
        }

        data.type = "gateways"

        res.render(settings.views+'/checkout.ejs',data)

    })

    routes.get('/:type', (req, res) => {

        let data = {
            title:"Stripe Checkout",
            brand: req.headers.host
        }

        if (req.session && req.session.user){
            user:req.session.user
        } else {
            user:{}
        }

        data.type = req.params.type

        if (data.type == 'success' && req.session.cart_id && req.session.intent){

            customer.processCart(req.session.cart_link, req.session.cart_id, req.session.intent).then((cart_data)=>{
                req.session.intent = false
                req.session.cart_id = false
                res.render(settings.views+'/checkout.ejs',data)
            })

        } else {
            data.type = '404'
            res.render(settings.views+'/checkout.ejs',data)
        }

    })

// export

    module.exports = functions
    module.exports.routes = routes
    module.exports.settings = settings
