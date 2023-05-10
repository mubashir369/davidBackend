//
// Client Shop Module
// Includes functions and tools for all users
//

// vars

var express = require('express'),
    moment = require('moment'),
    routes = express.Router(),
    customer = require('../../models/customers'),
    products = require('../../models/products'),
    salon = require('../../models/salon'),
    db = require(config.db_connector),

    settings = {
        default_route: 'shop',
        protected_guards:['customer'],
        views:'client/views'
    },


// functions


    functions = {

    }


// routes

    let data = {}

    routes.get('*', async (req, res, next) => {

        if (req.session && req.session.user && req.session.user.guard && req.session.user.guard != 'customer'){
            req.session.redirect = '/account'
            res.redirect('/logout')
        } else {
            data.brand = req.headers.host
            data.user = req.session.user
            data.categories = await salon.get('product_categories')

            data.cart_count = 0

            

            if (req.session && req.session.click_collect_cart && req.session.click_collect_cart.items && req.session.click_collect_cart.items.length > 0){

                const initialValue = 0

                data.cart_count = req.session.click_collect_cart.items.reduce((sum, item) => {
                                        return sum + item.quantity
                                    }, 0)

            }

            next()
        }

    })

    routes.get('/product/:slug', async (req, res) => {

        data.product =  await products.find(req.params.slug)
        data.include_scripts = ['client/views/scripts/shop.ejs']
        res.render('client/views/shop.ejs',data)

    })

    routes.get('/brand/:slug', async (req, res) => {

        let brand = view.functions.parseSlug(req.params.slug)
        data.products =  await products.allPublic({brand: brand})
        data.include_scripts = ['client/views/scripts/shop.ejs']
        data.title = brand
        res.render('client/views/shop.ejs',data)

    })

    routes.get('/category/:slug', async (req, res) => {

        let category = view.functions.parseSlug(req.params.slug)
        data.products =  await products.allPublic({category:category})
        data.include_scripts = ['client/views/scripts/shop.ejs']
        data.title = category
        res.render('client/views/shop.ejs',data)

    })

    routes.get('/cart', async (req, res) => {

        if (req.session && req.session.user && req.session.user._key){
            data.next_appointment = await customer.nextAppointment(req.session.user._key)
        } else {
            data.next_appointment = {}
        }

        data.include_scripts = ['client/views/scripts/shop.ejs']
        res.render('client/views/shop_cart.ejs',data)

    })

    routes.get('/', async (req, res) => {

        data.products =  await products.allPublic()
        data.include_scripts = ['client/views/scripts/shop.ejs']
        res.render('client/views/shop.ejs',data)

    })

    module.exports = functions
    module.exports.routes = routes
    module.exports.settings = settings
