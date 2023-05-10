const express = require('express'),
    engine = require('ejs-mate')
    path_component = require('path'),
    session = require('express-session'),
    cookie = require('cookie'),
    cookieParser = require('cookie-parser'),
    http = require('http'),
    WebSocket = require('ws'),
    fs = require('fs'),
    async = require('async'),
    bodyParser = require("body-parser"),
    querystring = require('querystring'),
    busboy = require('connect-busboy'),
    watch = require('node-watch'),
    cors = require('cors'),
    uuid = require('uuid'),
    redis = require("redis"),
    redisStore = require('connect-redis')(session),
    client  = redis.createClient(),
    sessionStore = new redisStore({ host: 'localhost', port: 6379, client: client,ttl: 86400});

var flash = require('connect-flash');
// load scope and config

    global.moment = require("moment-timezone")
    global.config = require('./modules/config')
    global.log = require('./modules/log')
    global.isSet = require('./modules/isSet')
    global.basedir = __dirname
    global.view = require('./modules/view')
    global.client = require('./modules/client')
    global.notification = require('./modules/notification')
    global.events = require('./models/events')
    global.image = require('./modules/images')
    global.localStorage = require('./modules/localStorage')
    global.clients = {}
    global.components = {}

    global.transaction = require('./models/transactions')
    global.appointment = require('./models/appointments')
    global.customer = require('./models/customers')
    global.staff = require('./models/staff')
    global.voucher = require('./models/vouchers')
    global.product = require('./models/products')
    global.service = require('./models/services')
    global.salon = require('./models/salon')


// setup express


    const sessionParser = session({
        secret: 'oiernf83049o3in4fihq3rfjkqrfiopj2[r4fioj34]',
        resave: true,
        store: sessionStore,
        saveUninitialized: true,
        cookie:{secure:false}
    })

    const app = express();


    app.use(flash());

    app.use(express.static(__dirname + '/public'));
    app.use(express.static(__dirname +'/uploads'))
    app.use('/uploads', express.static('uploads'))
    app.use(bodyParser.json({limit: '500mb'}))
    app.use(bodyParser.urlencoded({extended: true, limit: '500mb'}))
    app.use(cookieParser());
    //app.use(busboy());
    app.engine('ejs', engine)
    app.set('view engine', 'ejs')
    app.set('trust proxy', 1)
    app.use(cors());

    app.use(sessionParser);


// start http and ws


    const server = http.createServer(app);

    // starts the websocket server. Messages can be sent to the clients from any component using view.emit()

    client.wss = new WebSocket.Server({
        host: '0.0.0.0',
        port: config.wss_port,
        verifyClient: function(info, done) {
			done(info.req.headers);
		}
    })


    client.wss.on('connection', function connection(ws, req) {

        ws.upgradeReq = req;

        if (ws.upgradeReq.headers && typeof ws.upgradeReq.headers.cookie == 'string'){

            var cookies=cookie.parse(ws.upgradeReq.headers.cookie);
            var sid=cookieParser.signedCookie(cookies["connect.sid"],'oiernf83049o3in4fihq3rfjkqrfiopj2[r4fioj34]')

            if (!global.clients['wsc_'+sid]){
                global.clients['wsc_'+sid] = ws
            }

            sessionStore.get(sid,function(err, ss){
                sessionStore.createSession(ws.upgradeReq,ss)
                if (ws.upgradeReq.session.data){
                    ws.send(JSON.stringify(ws.upgradeReq.session.data))
                } else {
                    ws.send('connected')
                }
            });


        }

        ws.on('message', (msg) => {
            msg = JSON.parse(msg)

            if (msg.e && msg.e.match(/add|remove|update/) && components[msg.c] && typeof components[msg.c][msg.m] == 'function'){
                components[msg.c][msg.m](msg.d).then((data)=>{
                    ws.send(JSON.stringify(data))
                }).catch((err)=>{
                    ws.send(err)
                })
            }
        })

    });



// load components

    const loadComponents = ()=>{

        global.view.menus = {}
        global.components = {}

        fs.readdir('components', (err, files) => {

            var views = ['layouts','components']

            files.forEach((file, index) => {

                let name = file.replace(/\.\w+$/,'')

                console.log(name)

                try {

                    global.components[name] = require('./components/'+file)
                    addComponent(name, file+'/index.js')

                    if (isSet(global.components[name],'settings','includes')){

                        global.components[name].settings.includes.forEach((include, index) => {

                            global.components[include.name] = require('./components/'+file+'/'+include.path)
                            addComponent(include.name, file+'/'+include.path)

                        })

                    }


                } catch (e) { 

                    // gracefully error if component doesn't load
                    log('Component '+file+' not loaded')
                    log(e)

                }

                if (index >= files.length - 1){
                    app.set('views', views)
                }

            })

        })

    }
   
    loadComponents()
    app.locals.view = global.view

    watch(['./components','./models','./modules'], { recursive: true }, function(evt, name) {
        log('Components Reloaded')
        loadComponents()
    });

    server.listen(config.http_port, function() {
        console.log('Listening on '+config.http_port);
    });

// functions

    const addComponent = (name, file) => {

        if (isSet(global.components[name],'settings','default_route')){

            if (global.components[name].settings.default_route == 'root'){
                app.use('/', global.components[name].routes)
            } else {
                app.use('/'+global.components[name].settings.default_route+'/?*?', function (req, res, next) {

                    if (isSet(global.components[name],'settings','protected_guards') && req.session.user && global.components[name].settings.protected_guards.indexOf(req.session.user.guard) >=0){
                        next()
                    } else if (isSet(global.components[name],'settings','protected_guards')){

                        // if (req.url && !req.url.match(/login/)){
                        //     req.session.redir = req.url
                        // }

                        res.redirect('/login')

                    } else {
                        next()
                    }

                });
              
                app.use('/'+global.components[name].settings.default_route, global.components[name].routes)
            }

        //    views.push('components/' + file + '/views')
        }

        if (isSet(global.components[name],'settings','menu')){
            addMenu(global.components[name].settings)
        }

     //  log('Component loaded: '+file)

    }

    const addMenu = (obj) => {

        async.forEach(Object.keys(obj.menu),(item, callback )=>{

            if (!global.view.menus[item]){
                global.view.menus[item] = []
            }

            async.forEach(obj.menu[item],(itemkey, itemcallback)=>{

                let re = RegExp(obj.default_route)

                if (obj.default_route && obj.default_route != 'root' && !itemkey.slug.match(/\/\//) && !itemkey.slug.match(re)){
                    itemkey.slug = '/'+obj.default_route+itemkey.slug
                    itemkey.slug = itemkey.slug.replace(/\/$/,'')
                } else if (itemkey.slug.match(/\/\//)){
                    itemkey.slug = itemkey.slug.replace(/^\//,'')
                }

                if (!itemkey.weight){
                    itemkey.weight = 0
                }

                obj.menu[item].sort((a, b) => a.weight - b.weight)

                global.view.menus[item].push(itemkey)

                global.view.menus[item].sort((a, b) => a.weight - b.weight)

                if (itemkey.subitems){

                    async.forEach(itemkey.subitems,(subkey, subcallback)=>{

                        let re = RegExp(obj.default_route)

                        if (obj.default_route && obj.default_route != 'root' && !subkey.slug.match(/\/\//) && !subkey.slug.match(re)){
                            subkey.slug = '/'+obj.default_route+subkey.slug
                            subkey.slug = subkey.slug.replace(/\/$/,'')
                        } else if (subkey.slug.match(/\/\//)){
                            subkey.slug = subkey.slug.replace(/^\//,'')
                        }

                        if (!subkey.weight){
                            subkey.weight = 0
                        }

                        itemkey.subitems.sort((a, b) => a.weight - b.weight)

                        subcallback()

                    }, (err, data)=>{


                            itemcallback()


                    })

                } else {

                    itemcallback()

                }

            }, (err, data)=>{

                callback()

            })


        }, (err, data)=>{

        })
       

    }
