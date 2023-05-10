//
// Dashboard Module
// Includes functions and tools for all users
//

const members = require('../../models/members')


// vars

let express = require('express'),
    moment = require('moment'),
    routes = express.Router(),
    db = require(global.config.db_connector),
    customers = require('../../models/customers'),
    consultations = require('../../models/consultations'),
    memberships = require('../../models/memberships'),
    member_subscriptions = require('../../models/member_subscriptions'),
    cafeproducts = require('../../models/cafeproducts'),
    Pstmk = require("postmark"),
    stripe = require('stripe')(config.stripe_secret_key),
    campaigns = require('../../models/marketing_campaigns'),
    
    settings = {

        default_route: 'dashboard',
        views: 'dashboard/views',
        menu: {
            dashboard_menu: [
                {link:'Clients',slug: '/clients', weight:2, icon:'client',subitems:[
                    {link:'Marketing',slug: '/clients/marketing',min_role:2, weight:2},
                   
                    {link:'Client Memberships',slug: '/clients/memberships',min_role:2, weight:3},
                    // {link:'Member Subscription',slug: '/clients/member_subscriptions',min_role:2, weight:4},
                     {link:'Cancel Request',slug: '/clients/cancel',min_role:2, weight:5},
                     {link:'redeem Request',slug: '/clients/redeem',min_role:2, weight:6},
                    // {link:'Duplicates',slug: '/clients/duplicates',min_role:2, weight:6}
                ]}
            ]
        }
    },


// methods

    functions = {


        getTodaysClients:()=>{

            return new Promise(function(resolve, reject){
                customer.today().then((data) => {
                    resolve(data)
                }).catch((err)=>{
                    reject(err)
                })
            })

        },

        getClient:(id)=>{

            return new Promise(function(resolve, reject){
                customer.appointments(id).then((data) => {
                    resolve(data)
                }).catch((err)=>{
                    reject(err)
                })
            })

        },

        getDay:(date)=>{

            var dayNames = {1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun'}
            date = new Date(date)
            return dayNames[date.getDay()]

        },

        getDate:(date)=>{

            date = new Date(date)
            return date.getDate()

        },

        getStart:(date)=>{

            if (date.match(/Z$/)){
                return moment(date).format("HH:mm")
            }

        },

        parseCalendarLink:(date)=>{

            if (date.match(/Z$/)){
                return moment(date).format('YYYY/M/D')
            } else {
                return
            }

        },

        getMonth:(date)=>{

            if (date.match(/Z$/)){
                return moment(date).format('MMMM')
            } else {
                return ''
            }


        },

        getStart:(date)=>{

            if (date.match(/Z$/)){
                return moment(date).format("HH:mm")
            }

        },


        getMonthShort:(date)=>{

            var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
            date = new Date(date)
            return months[date.getMonth()]

        },

        getYear:(date)=>{

            date = new Date(date)
            return "'"+date.getFullYear().toString().substr(-2)

        },

        parseTime:(time)=>{

            time = time.toString().split("")

            if (time.length == 3){
                return '0'+''+time[0]+':'+time[1]+''+time[2]
            } else {
                return time[0]+''+time[1]+':'+time[2]+''+time[3]
            }


        },

        getPercentage: (total, value) => {
            return (parseFloat(value)/parseFloat(total))*100
        },

        getLooks:() => {
            return new Promise(function(resolve, reject){
                db.query('FOR l IN looks RETURN l', (data)=>{
                    resolve(data)
                })
            })
        }

    }

    const postmark = new Pstmk.ServerClient(config.email.api_key)


// routes

    routes.use('/static', express.static(__dirname + '/static'))

    routes.get('*',(req, res, next)=>{
        if (req.session && req.session.user && req.session.user._key){
            view.current_view = 'dashboard'
            view.dashboard_category = 'clients'
            next()
        } else {
            res.redirect('/login/staff')
        }
    })

    routes.get('/clients/consultation', async (req, res) => {

        res.locals.functions = functions

        let data = {
            title: "Consultation",
        //    user:req.session.user,
            include_scripts: [settings.views+'/scripts/consultation.ejs'],
            // todays_clients: await customers.today(),
            looks: await functions.getLooks(),
            id: req.params.id
        }

        res.render(settings.views+'/client_consultation.ejs', data)

    })

    routes.get('/clients/duplicates', async (req, res) => {

        res.locals.functions = functions

        view.dashboard_view = 'clients'

        res.locals.functions = functions
        let data = {
            user:req.session.user,
            title:"Duplicate Clients",
            include_scripts: [settings.views+'/scripts/client.ejs']
        }

        if (req.cookies && req.cookies.mini_menu){
            data.mini_menu = req.cookies.mini_menu
        }

        res.render(settings.views+'/clients_duplicates.ejs',data)

    })

    routes.get('/clients/memberships/members/:id', async (req, res) => {

        view.dashboard_view = 'membership'
        res.locals.functions = functions

        let data = {
            title: "Memberships",
            user:req.session.user,
            include_scripts: [settings.views+'/scripts/memberships.ejs'],
            id: req.params.id
        }
        data.cafe_categories = await cafeproducts.getCategory()

        data.weekdays = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']

        res.render(settings.views+'/client_membership_members.ejs', data)

    })

    routes.get('/clients/memberships/:type', async (req, res) => {
       
try{
        let result

        if (req.params.type == 'prices'){
            result = await memberships.all()
        } else if (req.params.type){
            result = await memberships.getMembers(req.params.type)
        }

        res.status(200).json(result)
    }catch(e){
        console.log(e)
        res.status(200).json({"result":[]})
    }
    })

    routes.post('/clients/memberships_full_delete', async (req, res) => {
        console.log('memberships_full_delete',req.body.id)
        try{
            let result        
            result = await memberships.full_delete(req.body.id)
            res.status(200).json(result)
        }catch(e){
            console.log(e)
            res.status(200).json({"result":[]})
        }
    })



    routes.get('/clients/memberships', async (req, res) => {
        try{
            view.dashboard_view = 'membership'
            res.locals.functions = functions

            let data = {
                title: "Membership",
                user:req.session.user,
                include_scripts: [settings.views+'/scripts/memberships.ejs']
            }

           

            data.weekdays = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
            // console.log(data,settings.views+'/scripts/memberships.ejs',"daaaaaaaaaaaaaaaaaaaaaaaaaaa");
            data.ss="hhhhh"

            res.render(settings.views+'/client_memberships.ejs', data)
        }catch(e){
            console.log(e)
            res.render("../layouts/error.ejs");
        }
    })

    routes.post('/clients/memberships/create', async (req,res) => {

        if (!req.body.name){
            res.status(404).json('Please specify a subscription name')
            return
        }

        if (!req.body.price || !parseFloat(req.body.price)){
            res.status(404).json('Please specify a valid price')
            return
        }

        if (!req.body.interval){
            res.status(404).json('Please specify a subscription interval')
            return
        }

        let membership = await memberships.create(req.body)

        res.json(membership)

    })

    routes.put('/clients/memberships/:id', async (req,res) => {

        if (!req.params.id){
            res.status(404).json('Please specify a membership ID')
            return
        }

        const price = await memberships.update(req.body)
        res.json(price)

    })

    routes.delete('/clients/memberships/:id', async (req,res) => {
        try{
        if (!req.params.id){
            res.status(404).json('Please specify a membership ID')
            return
        }

        const price = await memberships.delete(req.body)
        res.json(price)
    }catch(err){
        console.error(err)
        res.render("../layouts/error.ejs");
    }
    })

    routes.post('/clients/activate', async (req,res) => {
        console.log(req.params.id,req.body)
        try{
            if (!req.body.id){
                res.status(404).json('Please specify a membership ID')
                return
            }

            const price = await memberships.activate(req.body)
            console.log(price)
            res.json(price)
        }catch(err){
            console.error(err)
            res.render("../layouts/error.ejs");
        }
    })

    routes.post('/clients/deactivate', async (req,res) => {
        console.log(req.params.id,req.body)
        try{
            if (!req.body.id){
                res.status(404).json('Please specify a membership ID')
                return
            }

            const price = await memberships.delete(req.body)
            console.log(price)
            res.json(price)
        }catch(err){
            console.error(err)
            res.render("../layouts/error.ejs");
        }
    })

    routes.post('/clients/memberships/unsubscribe', async (req,res) => {

        const client = await customers.cancelMembership(req.body.client_key)
        // console.log(client)
        const deleted = await stripe.subscriptions.del(req.body.subscription_id)
        // console.log(deleted)
        res.json(deleted)

    })

    routes.post('/clients/memberships/subscribe', async (req,res) => {

        var client = await customers.find(req.body.client_key),
            membership_id = req.body.membership_id

        if (!client){
            res.status(404).json('Client not found')
            return
        }

        if (!membership_id){
            res.status(404).json('Please specify a subscription')
            return
        }

        if (!client.stripe_id){
            res.status(500).json('Client has no stripe ID')
            return
        }

        if (client.membership && client.membership.membership_id == req.body.membership_id){
            res.status(404).json('Client is already subscribed to this membership')
            return
        }

        client = await customers.addMembership(client._key, membership_id)

        try {

            var customer = await stripe.customers.retrieve(
                client.stripe_id
            )

            var subscription_obj = {
                customer: client.stripe_id,
                items: [
                    {price: membership_id},
                ]
            }

            if (customer && customer.invoice_settings && !customer.invoice_settings.default_payment_method){

                const paymentMethods = await stripe.paymentMethods.list({
                  customer: client.stripe_id,
                  type: 'card',
                })

                if (paymentMethods.data && paymentMethods.data[0] && paymentMethods.data[0].id){

                    subscription_obj.default_payment_method = paymentMethods.data[0].id

                    customer = await stripe.customers.update(
                        client.stripe_id,
                        {invoice_settings: {default_payment_method: paymentMethods.data[0].id}}
                    )

                }

            }

            const subscription = await stripe.subscriptions.create(subscription_obj);

            res.json(subscription)

        } catch(err) {
            res.status(500).send(err.raw)
        }

    })


    // member's subscriptions start//

   

    routes.get('/clients/cancel', async (req, res) => {
        try{
        view.dashboard_view = 'membership'
        res.locals.functions = functions

        let data = {
            title: "Cancel Request",
            user:req.session.user,
            include_scripts: [settings.views+'/scripts/member_subscriptions.ejs',settings.views+'/scripts/salon.ejs']
        }
        // data.memberships = await memberships.getCancelationRequests("all")
        // console.log(data.memberships)
        // data.salon = await salon.find('54855602')

        res.render(settings.views+'/membership_cancellations.ejs', data)
    }catch(e){
        
        console.log(e)
        res.render("../layouts/error.ejs");
    }
    })
    routes.get('/clients/redeem', async (req, res) => {
        try{
        view.dashboard_view = 'Wallet Redeem'
        res.locals.functions = functions

        let data = {
            title: "Redeem Requests",
            user:req.session.user,
            include_scripts: [settings.views+'/scripts/member_subscriptions.ejs',settings.views+'/scripts/salon.ejs']
        }

        res.render(settings.views+'/redeem_requests.ejs', data)
    }catch(e){
        
        console.log(e)
        res.render("../layouts/error.ejs");
    }
    })


    routes.get('/clients/subscriptions/members/:id', async (req, res) => {

        view.dashboard_view = 'memberships'
        res.locals.functions = functions

        let data = {
            title: "Memberships",
            user:req.session.user,
            include_scripts: [settings.views+'/scripts/memberships.ejs'],
            id: req.params.id
        }
        console.log(data.id)
        const mem = await members.getMembersWithSubsId(data.id);
        data.mem=mem;
        console.log(data.mem)
        data.cafe_categories = await cafeproducts.getCategory()
        data.weekdays = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
        res.render(settings.views+'/client_subscriptions_members.ejs', data)

    })


    routes.get('/clients/subscriptions/:type', async (req, res) => {
        try{
            let result

            if (req.params.type == 'prices'){
                result = await member_subscriptions.all()
            } else if (req.params.type){
                result = await member_subscriptions.getMembers(req.params.type)
            }

            res.json(result)
        }catch{res.status(200).json({"result":[]})}
    })

    routes.post('/clients/subscriptions/create', async (req,res) => {

        if (!req.body.name){
            res.status(404).json('Please specify a subscription name')
            return
        }

        if (!req.body.price || !parseFloat(req.body.price)){
            res.status(404).json('Please specify a valid price')
            return
        }

        if (!req.body.interval){
            res.status(404).json('Please specify a subscription interval')
            return
        }

        let membership = await member_subscriptions.create(req.body)

        res.json(membership)

    })

    routes.put('/clients/subscriptions/:id', async (req,res) => {

        if (!req.params.id){
            res.status(404).json('Please specify a membership ID')
            return
        }
        
        const price = await member_subscriptions.update(req.body)
        res.json(price)

    })

    routes.delete('/clients/subscriptions/:id', async (req,res) => {
console.log("delete",res);
        if (!req.params.id){
            res.status(404).json('Please specify a membership ID')
            return
        }

        const price = await member_subscriptions.delete(req.body)
        res.json(price)

    })

    routes.post('/clients/subscriptions/unsubscribe', async (req,res) => {

        const client = await customers.cancelMembership(req.body.client_key)
        // console.log(client)
        const deleted = await stripe.subscriptions.del(req.body.subscription_id)
        // console.log(deleted)
        res.json(deleted)

    })

    routes.post('/clients/subscriptions/subscribe', async (req,res) => {

        var client = await customers.find(req.body.client_key),
            membership_id = req.body.membership_id

        if (!client){
            res.status(404).json('Client not found')
            return
        }

        if (!membership_id){
            res.status(404).json('Please specify a subscription')
            return
        }

        if (!client.stripe_id){
            res.status(500).json('Client has no stripe ID')
            return
        }

        if (client.membership && client.membership.membership_id == req.body.membership_id){
            res.status(404).json('Client is already subscribed to this membership')
            return
        }

        client = await customers.addMembership(client._key, membership_id)

        try {

            var customer = await stripe.customers.retrieve(
                client.stripe_id
            )

            var subscription_obj = {
                customer: client.stripe_id,
                items: [
                    {price: membership_id},
                ]
            }

            if (customer && customer.invoice_settings && !customer.invoice_settings.default_payment_method){

                const paymentMethods = await stripe.paymentMethods.list({
                  customer: client.stripe_id,
                  type: 'card',
                })

                if (paymentMethods.data && paymentMethods.data[0] && paymentMethods.data[0].id){

                    subscription_obj.default_payment_method = paymentMethods.data[0].id

                    customer = await stripe.customers.update(
                        client.stripe_id,
                        {invoice_settings: {default_payment_method: paymentMethods.data[0].id}}
                    )

                }

            }

            const subscription = await stripe.subscriptions.create(subscription_obj);

            res.json(subscription)

        } catch(err) {
            res.status(500).send(err.raw)
        }

    })




    //member's subscription end//

    routes.get('/clients/marketing', async (req, res) => {
        try{
        view.dashboard_view = 'marketing'
        res.locals.functions = functions

        let data = {
            title: "Marketing",
            user:req.session.user
        }

        let today = moment(),
            month_ago = moment().subtract(30, 'days')


        data.overview = await postmark.getOutboundOverview({fromdate:month_ago.format('YYYY-MM-DD'), todate:today.format('YYYY-MM-DD'), messagestream:'promotions'})
        data.sent = await postmark.getSentCounts({fromdate:month_ago.format('YYYY-MM-DD'), todate:today.format('YYYY-MM-DD'), messagestream:'promotions'})
        data.clicks = await postmark.getClickCounts({fromdate:month_ago.format('YYYY-MM-DD'), todate:today.format('YYYY-MM-DD'), messagestream:'promotions'})

      res.render(settings.views+'/marketing.ejs',data)
    }catch(e){
        console.log(e)
        res.render("../layouts/error.ejs");
    }
    })

    routes.get('/clients/marketing/campaigns', async (req, res) => {

        view.dashboard_view = 'marketing_campaigns'
        res.locals.functions = functions

        let data = {
            title: "Marketing Campaigns",
            user:req.session.user,
            include_scripts:[settings.views+'/scripts/campaigns.ejs']
        }

        res.render(settings.views+'/marketing_list.ejs',data)

    })


    routes.get('/clients/:id', async (req, res) => {

        view.dashboard_view = 'clients'
        view.dashboard_sub_view = 'client'

        res.locals.functions = functions
        let data = {
            user:req.session.user,
            title:"Client Card",
            include_scripts: [settings.views+'/scripts/client.ejs']
        }

        if (req.cookies && req.cookies.mini_menu){
            data.mini_menu = req.cookies.mini_menu
        }

        data.client_data = await customers.appointments(req.params.id)
        if (data.client_data.appointments && data.client_data.appointments.length > 0){
            data.client_data.appointments = data.client_data.appointments.sort(function(a,b){
              return new Date(b.date) - new Date(a.date);
            })
        }

        if (data.client_data && data.client_data.membership && data.client_data.membership.subscription_id){
            data.membership = await stripe.subscriptions.retrieve(data.client_data.membership.subscription_id)
        }

    //    data.consultations = await consultations.findRecent(req.params.id)
    
        let trans = await customers.getTransactions(req.params.id)
        if(data.transactions && data.transactions.length>0){
            data.transactions = trans
        }else data.transactions = []

        res.render(settings.views+'/client_profile.ejs',data)

    })

    routes.get('/clients', async (req, res) => {
        try{
        view.dashboard_view = 'clients'
        view.dashboard_sub_view = false

        res.locals.functions = functions
        let data = {
            user:req.session.user,
            title:"Clients",
            include_scripts: [settings.views+'/scripts/client.ejs']
        }

        if (req.cookies && req.cookies.mini_menu){
            data.mini_menu = req.cookies.mini_menu
        }
        res.render(settings.views+'/clients.ejs',data)
    }catch(e){
        res.render("../layouts/error.ejs")
    }
    })

    routes.get('/clients/download/:path', function(req, res){
        const file = '/websites/salonstream/documents/'+req.params.path;
        res.download(file); // Set disposition and send it.
    });

    routes.post('/clients/upload/:key', async function(req, res) {

        var fstream;
        req.pipe(req.busboy);
        req.busboy.on('file', function (fieldname, file, filename) {

            if (filename.match(/\.pdf|\.txt|\.csv|\.jpg|\.jpeg|\.png|\.zip|\.pages|\.doc|\.xls|\.number$/i)){
                let new_filename = req.session.user._key+'-'+Date.now()+'-'+filename

                fstream = fs.createWriteStream('/websites/salonstream/documents/' + new_filename);

                file.pipe(fstream);

                fstream.on('close', function () {

                    customers.saveDocument(req.params.key,filename,new_filename).then((docs)=>{
                        req.session.user.documents = docs
                        res.redirect('/dashboard/clients/'+req.params.key)
                    }).catch((docs)=>{
                        req.session.user.documents = docs
                        res.redirect('/dashboard/clients/'+req.params.key)
                    })

                })
            } else {
                res.redirect('/dashboard/clients/'+req.params.key)
            }

        })

    })

    routes.post('/clients/notify', async function(req, res) {

        if (req.session.user && req.session.user.guard.match(/(staff|admin)/)){

            if (req.body.method == 'email'){

                req.body.to = req.body.customer_id

                notification.email(req.body).then((sms_data)=>{
                    customers.addLog(req.body.customer_id,req.session.user,'Email sent: '+req.body.text)
                    res.send('Email sent')
                }).catch((err)=>{
                    res.status(500).send(err)
                })

            } else {

                if (req.body.text.length > 160){
                    res.status(500).send('Too many characters, please limit to 160.')
                    return
                }

                notification.sms(req.body).then((sms_data)=>{
                    customers.addLog(req.body.customer_id,req.session.user,'SMS sent: '+req.body.text)
                    res.send('SMS sent to '+req.body.to)
                }).catch((err)=>{
                    res.status(500).send('Unable to contact client, please check their phone number')
                })

            }

        } else {
            res.status(401).send('Not authorised')
        }

    })


// export

    module.exports = functions
    module.exports.routes = routes
    module.exports.settings = settings
