
    const db = require('../components/arango'),
          products = require('../models/products'),
          customers = require('../models/customers'),
          collection = db.db.collection('customers'),
          fs = require('fs')

    const clickCollect = {

        getCart: (key, req) => {

            return new Promise( async (resolve, reject) => {

                if (req.session && req.session.click_collect_cart && req.session.click_collect_cart.items && req.session.click_collect_cart.items.length > 0){

                    req.session.click_collect_cart = await clickCollect.calcPrices(req.session.click_collect_cart)
                    req.session.click_collect_cart = await clickCollect.calcTotal(req.session.click_collect_cart)

                    resolve(req.session.click_collect_cart)

                } else if (req.session && req.session.user && req.session.user._key){

                    let client = await collection.document(req.session.user)

                    if (client.click_collect_cart && client.click_collect_cart.items && client.click_collect_cart.items.length > 0){

                        req.session.click_collect_cart = client.click_collect_cart
                        req.session.click_collect_cart.saved = true
                        req.session.click_collect_cart = await clickCollect.calcPrices(req.session.click_collect_cart)
                        req.session.click_collect_cart = await clickCollect.calcTotal(req.session.click_collect_cart)

                    } else {
                        req.session.click_collect_cart = {
                            items:[],
                            sub_total: 0,
                            tax: 0,
                            total: 0
                        }
                    }

                    resolve(req.session.click_collect_cart)

                } else {

                    req.session.click_collect_cart = {
                        items:[],
                        sub_total: 0,
                        tax: 0,
                        total: 0
                    }

                    resolve(req.session.click_collect_cart)

                }

            })

        },

        addItem: (data, req) => {

            return new Promise( async (resolve, reject) => {

                if (req.session && req.session.click_collect_cart){

                    let payload = {
                        _key: data.key,
                        quantity: 1
                    }

                    let idx = req.session.click_collect_cart.items.findIndex((item,i) => {
                                return item._key == data.key
                            })

                    if (idx >= 0){
                        req.session.click_collect_cart.items[idx].quantity++
                    } else {
                        req.session.click_collect_cart.items.push(payload)
                    }

                    req.session.click_collect_cart = await clickCollect.calcPrices(req.session.click_collect_cart)
                    req.session.click_collect_cart = await clickCollect.calcTotal(req.session.click_collect_cart)

                    resolve(req.session.click_collect_cart)

                } else {

                    req.session.click_collect_cart = {
                        items:[],
                        sub_total: 0,
                        tax: 0,
                        total: 0
                    }

                    resolve(req.session.click_collect_cart)

                }

            })

        },

        removeItem: (data, req) => {

            return new Promise( async (resolve, reject) => {

                if (req.session && req.session.click_collect_cart){

                    let idx = req.session.click_collect_cart.items.findIndex((item,i) => {
                                return item._key == data.key
                            })

                    if (idx >= 0){
                        req.session.click_collect_cart.items[idx].quantity--

                        if (req.session.click_collect_cart.items[idx].quantity <= 0){
                            req.session.click_collect_cart.items.splice(idx,1)
                        }
                    }

                    req.session.click_collect_cart = await clickCollect.calcPrices(req.session.click_collect_cart)
                    req.session.click_collect_cart = await clickCollect.calcTotal(req.session.click_collect_cart)

                    resolve(req.session.click_collect_cart)

                } else {

                    req.session.click_collect_cart = {
                        items:[],
                        sub_total: 0,
                        tax: 0,
                        total: 0
                    }

                    resolve(req.session.click_collect_cart)

                }

            })

        },

        emptyCart: (data, req) => {
            return new Promise((resolve, reject) => {

                if (req.session){

                    req.session.click_collect_cart = {
                        items:[],
                        sub_total: 0,
                        tax: 0,
                        total: 0
                    }

                    resolve(req.session.click_collect_cart)

                }

            })
        },

        submitCart: (data, req) => {

            return new Promise( async (resolve, reject) => {

                if (req.session && req.session.user && req.session.click_collect_cart && req.session.click_collect_cart.items && req.session.click_collect_cart.items.length > 0){

                    let client = await collection.document(req.session.user)

                    client.click_collect_cart = req.session.click_collect_cart

                    await collection.update(client, client)

                    req.session.click_collect_cart = {
                        items:[],
                        sub_total:0,
                        tax:0,
                        total:0
                    }

                    resolve(req.session.click_collect_cart)

                } else {

                    reject('Unable to submit cart')

                }

            })

        },

        removeSavedCart: (data, req) => {

            return new Promise( async (resolve, reject) => {

                if (req.session && req.session.user && req.session.click_collect_cart && req.session.click_collect_cart.items && req.session.click_collect_cart.items.length > 0){

                    await customers.resetClickCollect(req.session.user._key)
                    req.session.click_collect_cart = {
                        items:[],
                        sub_total:0,
                        tax:0,
                        total:0
                    }

                    resolve(req.session.click_collect_cart)

                }

            })

        },

        calcPrices: (cart) => {

            return new Promise( async (resolve, reject) => {

                cart.items = await Promise.all(cart.items.map( async (item, i) => {

                    let product = await products.find(item._key)

                    if (product && product[0]){

                        item.price = parseFloat(product[0].price)
                        item.name = product[0].name
                        item.brand = product[0].brand
                        item.image = product[0].image

                        item.total = item.price*parseInt(item.quantity)
                        item.sub_total = parseFloat(item.total)/config.tax_amount
                        item.tax = parseFloat(item.total)-parseFloat(item.sub_total)
                        item.tax = parseFloat(item.tax).toFixed(2)
                        item.sub_total = (item.sub_total).toFixed(2)

                        return item

                    }

                }))

                resolve(cart)

            })

        },

        calcTotal: (cart) => {

            return new Promise((resolve, reject) => {

                cart.sub_total = 0
                cart.tax = 0
                cart.total = 0

                cart.items.map((item, i) => {
                    cart.sub_total += parseFloat(item.sub_total)
                    cart.tax += parseFloat(item.tax)
                    cart.total += parseFloat(item.total)
                    return item
                })

                resolve(cart)

            })

        }

    }

    module.exports = clickCollect
