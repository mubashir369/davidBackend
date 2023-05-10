//
// Dashboard Module
// Includes functions and tools for all users
//


// vars

var express = require('express'),
    routes = express.Router(),
    db = require(config.db_connector),
    requireDir = require('require-dir'),
    models = requireDir('../../models'),

    settings = {
        default_route: 'api',
        not_found: {error:'404 - not found'},
        customer_routes: {
            customers:{
                self:['GET','POST'],
                recommended_products:['GET']
            },
            appointments:{
                staff_availability:['GET'],
                get_promotions:['GET']
            },
            //transactions:[],
            click_collect:{},
            products:{
                all:['GET'],
                find:['GET'],
                search_site:['POST']
            },
            cafeproducts:{
                all:['GET'],
                find:['GET'],
                search_site:['POST']
            },
            salon:{
                root:['GET']
            },
            services:{
                all:['GET']
            },
            testimonials:{
                all:['GET']
            },
            members:{
                all:['GET','POST']
            },
            seats:{
                all:['GET']
            },
            staff:{
                all:['GET']
            },
            vouchers:{
                find:['GET']
            }
        },
        guest_routes: {
            customers:{
                find_or_save:['GET'],
                recommended_products:['GET']
            },
            salon:{
                root:['GET']
            },products:{
                all:['GET'],
                find:['GET'],
                search_site:['POST']
            },
            cafeproducts:{
                all:['GET'],
                find:['GET'],
                search_site:['POST']
            },
            services:{
                all:['GET']
            },
            staff:{
                all:['GET']
            },
            testimonials:{
                all:['GET']
            },
            seats:{
                all:['GET']
            },
            members:{
                all:['GET','POST']
            },
            appointments:{
                staff_availability:['GET'],
                get_promotions:['GET']
            }
        }
    },



    // methods

    functions = {

        get:(collection, key)=>{

            if (key){

                return new Promise(function(resolve, reject){
                    db.query('FOR item in '+collection+' FILTER item._key == "'+key+'" RETURN item', (data)=>{
                        resolve(data[0])
                    })
                })

            } else {

                return new Promise(function(resolve, reject){
                    db.query('FOR item in '+collection+' RETURN item', (data)=>{
                        resolve(data)
                    })
                })

            }


        },

        post:(collection, data)=>{

            data = JSON.stringify(data)

            return new Promise(function(resolve, reject){
                db.query('INSERT '+data+' INTO '+collection+' RETURN NEW', (data)=>{
                    resolve(data[0])
                })
            })

        },

        put:(collection, key, data)=>{

            data = JSON.stringify(data)

            return new Promise(function(resolve, reject){
                db.query('LET doc = DOCUMENT("'+collection+'/'+key+'") UPDATE doc WITH '+data+' IN '+collection+' RETURN NEW', (data)=>{
                    resolve(data[0])
                })
            })

        },

        delete:(collection, key)=>{

            return new Promise(function(resolve, reject){
                db.query('LET doc = DOCUMENT("'+collection+'/'+key+'") REMOVE doc IN '+collection+'', ()=>{
                    resolve('deleted')
                })
            })

        },

        checkPermission:(req) => {

            return new Promise( async (resolve, reject) => {
                if (!req){
                    reject()
                    return false
                }
                //console.log('my',req.session.user.guard)

                let result = false

                //console.log(req.headers.origin)

                if (req.session && req.session.user && req.session.user._key  && req.session.user.guard && req.session.user.guard.match(/admin|staff|member/)){ // fully auth'd
                    result = true
                    resolve(result)
                } else if (req.session && req.session.user && req.session.user._key  && req.session.user.guard && req.session.user.guard.match(/customer/)){ // client auth'd

                    result = await functions.checkRoute(req,'customer',req.session.user._key)
                    resolve(result)

                } else if (req.headers.origin === 'http://localhost:3000' || req.headers.origin === undefined || req.headers.origin === 'http://143.244.139.198' || req.headers.origin === 'http://165.22.51.23'||req.headers.origin === 'https://basekamp.co.uk' ){
                    result = true
                    resolve(result)
                } else {

                    result = await functions.checkRoute(req,'guest')
                    resolve(result)
                }

            })

        },

        checkRoute:(req, guard, key) => {

            return new Promise( async (resolve, reject) => {

                let paths = req.path.split('/'),
                    result = false

                let path_root = '/'+paths[1]

                if (paths[3]){
                    paths[2] = paths[3]
                }

                if (guard == 'customer'){

                    if (settings.customer_routes[paths[1]]){ // checking route

                        if (paths[2] == key && settings.customer_routes[paths[1]].self && settings.customer_routes[paths[1]].self.indexOf(req.method) >= 0){ // logged in user is ok to access all routes relative to their account with the correct method
                            resolve(true)
                            return
                        } else if (settings.customer_routes[paths[1]][paths[2]] && settings.customer_routes[paths[1]][paths[2]].indexOf(req.method) >= 0){ // customer accessing allowed function with the correct method
                            resolve(true)
                            return
                        } else if (settings.customer_routes[paths[1]].root && settings.customer_routes[paths[1]].root.indexOf(req.method) >= 0){ // customer accessing any function with the correct method
                            resolve(true)
                            return
                        } else {
                            resolve(false)
                            return
                        }

                    } else {
                        resolve(false)
                        return
                    }

                } else {

                    if (settings.guest_routes[paths[1]]){ // checking route

                        if (settings.guest_routes[paths[1]][paths[2]] && settings.guest_routes[paths[1]][paths[2]].indexOf(req.method) >= 0){ // guest accessing allowed function with the correct method
                            resolve(true)
                            return
                        } else if (settings.guest_routes[paths[1]].root && settings.guest_routes[paths[1]].root.indexOf(req.method) >= 0){ // guest allowed any function with the correct method
                            resolve(true)
                            return
                        } else {
                            resolve(false)
                            return
                        }

                    } else {
                        resolve(false)
                        return
                    }

                }

            })

        }

    }

    routes.get('*', async (req, res, next)=>{

        try {
            //console.log('aaaBBBB')
            let permission = await functions.checkPermission(req)
            //console.log(permission)
            if (permission){
                next()
            } else {

                let guard = ''
                if (req && req.session && req.session.user && req.session.user._key && req.session.user.guard){
                    guard = req.session.user._key +' '+ req.session.user.guard
                }
                console.log(moment().format('DD/MMM HH:mm'),'api access restricted', req.path, req.method, guard, req.headers['x-forwarded-for'])
                res.status(404).json({error:'Not Found'})
            }

        }

        catch(err){
            let guard = ''
            if (req && req.session && req.session.user && req.session.user._key && req.session.user.guard){
                guard = req.session.user._key +' '+ req.session.user.guard
            }
            console.log(moment().format('DD/MM HH:mm'),'api access blocked', req.path, req.method, guard, req.headers['x-forwarded-for'])
            res.status(404).json({error:'Not Found'})
        }

    })

    routes.get('/:collection/:id/:function?',(req,res)=>{
        if (req.params.function){
            req.params.function = req.params.function.replace(/_([a-z])/g, function (g) { return g[1].toUpperCase(); })
        } else {
            req.params.function = req.params.id.replace(/_([a-z])/g, function (g) { return g[1].toUpperCase(); })
        }

        if (req.params.function && models[req.params.collection] && typeof models[req.params.collection][req.params.function] == 'function'){

            let data

            if (Object.keys(req.query).length>0){
                data = req.query
            } else {
                data = req.params.id
            }

            models[req.params.collection][req.params.function](data, req)
                .then((data) => {
                    res.json(data)
                }).catch((err) => {
                    res.status(500).json(err)
                })

        } else if (req.query && models[req.params.collection] && typeof models[req.params.collection][req.params.id] == 'function'){

            models[req.params.collection][req.params.id](req.query, req)
                .then((data) => {
                    res.json(data)
                }).catch((err) => {
                    res.status(500).json(err)
                })

        } else if (models[req.params.collection] && typeof models[req.params.collection].find == 'function'){

            models[req.params.collection].find(req.params.id)
                .then((data) => {
                    res.json(data)
                }).catch((err) => {
                    res.status(500).json(err)
                })

        } else if (!models[req.params.collection]){
            functions.get(req.params.collection, req.params.id)
                .then((data) => {
                    res.json(data)
                }).catch((err) => {
                    res.status(500).json(err)
                })

        } else {
            console.log("No collection")
            res.status(500).json([])

        }

    })

    routes.get('/:collection',(req,res)=>{
        
        console.log(req.params.collection)
        if (models[req.params.collection] && typeof models[req.params.collection].all == 'function'){

            models[req.params.collection].all(req)
                .then((data) => {
                    res.json(data)
                }).catch(() => {
                    res.json([])
                })

        } else if (!models[req.params.collection]){

            functions.get(req.params.collection)
                .then((data) => {
                    res.json(data)
                }).catch(() => {
                    res.json([])
                })


        } else {

            res.json([])

        }


    })

    routes.post('/:collection/:function',(req,res)=>{
       
       
        // console.log(req.session.user,"user");

        if (req.params.function){
            req.params.function = req.params.function.replace(/_([a-z])/g, function (g) { return g[1].toUpperCase(); })
        }

            console.log(req.params)


        if (models[req.params.collection] && typeof models[req.params.collection][req.params.function] == 'function'){


            models[req.params.collection][req.params.function](req.body, req)
                .then((data) => {
                    res.json(data)
                }).catch((err) => {
                    if (err && err.code){ // possibly arango erro
                        log(err.code)
                        res.status(err.code).send(err.code)
                    } else if (typeof err == 'string' || typeof err == 'object') {
                        res.status(400).send(err)
                    } else {
                        res.status(500).send("Unable to complete the action")
                    }
                })

        } else {

            res.json(['ffffff'])

        }


    })

    routes.post('/:collection',(req,res)=>{

        if (models[req.params.collection] && typeof models[req.params.collection].save == 'function'){

            models[req.params.collection].save(req.body, req)
                .then((data) => {
                    res.json(data)
                }).catch((err) => {
                    if (err && err.code){ // possibly arango erro
                        log(err.code)
                        res.status(err.code).send(err.code)
                    } else if (typeof err == 'string' || typeof err == 'object') {
                        res.status(400).send(err)
                    } else {
                        res.status(500).send("Unable to complete the action")
                    }
                })

        } else if (!models[req.params.collection]){

            functions.post(req.params.collection, req.body)
                .then((data) => {
                    res.json(data)
                }).catch((err) => {
                    if (err && err.code){ // possibly arango erro
                        log(err.code)
                        res.status(err.code).send(err.code)
                    } else if (typeof err == 'string' || typeof err == 'object') {
                        res.status(400).send(err)
                    } else {
                        res.status(500).send("Unable to complete the action")
                    }
                })

        } else {

            res.json([])

        }


    })

    routes.put('/:collection/:id',(req,res)=>{

        if (models[req.params.collection] && typeof models[req.params.collection].save == 'function'){

            models[req.params.collection].save(req.body, req)
                .then((data) => {
                    res.json(data)
                }).catch(() => {
                    res.json([])
                })

        } else if (!models[req.params.collection]){

            functions.put(req.params.collection, req.params.id, req.body)
                .then((data) => {
                    res.json(data)
                }).catch(() => {
                    res.json([])
                })

        } else {

            res.json([])

        }

    })

    routes.delete('/:collection/:id/:function?',(req,res)=>{
       

        if (req.params.function){
            req.params.function = req.params.function.replace(/_([a-z])/g, function (g) { return g[1].toUpperCase(); })
        }

        if (req.params.function && models[req.params.collection] && typeof models[req.params.collection][req.params.function] == 'function'){

            models[req.params.collection][req.params.function](req.params.id, req)
                .then((data) => {
                    res.json(data)
                }).catch((err) => {
                    if (err && err.response && err.response.body && err.response.body.errorMessage){
                        log(err.response.body.errorMessage)
                        res.send(err.response.body.errorMessage)
                    } else if (err && err.code){ // possibly arango erro
                        log(err.code)
                        res.status(err.code).send(err.code)
                    } else if (typeof err == 'string') {
                        res.status(400).send(err)
                    } else {
                        res.status(404).send('Not Found')
                    }
                })

        } else if (models[req.params.collection] && typeof models[req.params.collection].delete == 'function'){

            models[req.params.collection].delete(req.params.id, req)
                .then((data) => {
                    res.json(data)
                }).catch((err) => {
                    if (err && err.response && err.response.body && err.response.body.errorMessage){
                        log(err.response.body.errorMessage)
                        res.send(err.response.body.errorMessage)
                    } else if (err && err.code){ // possibly arango erro
                        log(err.code)
                        res.status(err.code).send(err.code)
                    } else if (typeof err == 'string') {
                        res.status(400).send(err)
                    } else {
                        res.status(404).send('Not Found')
                    }
                })

        } else if (!models[req.params.collection] || models[req.params.collection] && typeof models[req.params.collection].delete == 'undefined'){

            functions.delete(req.params.collection, req.params.id)
                .then((data) => {
                    res.json(data)
                }).catch(() => {
                    res.json([])
                })

        } else {

            res.json(settings.not_found)

        }

    })

    module.exports = functions
    module.exports.routes = routes
    module.exports.settings = settings
