//
// Client Module
// Includes functions and tools for all users
//

// vars

var express = require('express'),
    moment = require('moment'),
    routes = express.Router(),
    consultations = require('../../models/consultations'),
    customer = require('../../models/customers'),
    transactions = require('../../models/transactions'),
    db = require(config.db_connector),

    settings = {
        default_route: 'account',
//        protected_guards:['customer','admin'],
        views:'client/views',
        menu: {
            nav: [{link:'Account',slug: '/', protected_guards:['customer']}],
        },

        includes: [
            {name:'shop',path:'shop.js'}
        ]
    },


// functions


    functions = {

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

        getMonth:(date)=>{

            if (date.match(/Z$/)){
                return moment(date).format('MMMM')
            } else {
                return ''
            }


        },

        getStart:(date)=>{

            if (date.match(/Z$/)){
                return moment(date).format("h:mma")
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


        }

    }


// routes

    let data = {}

    routes.get('*', (req, res, next) => {

        if (req.session && req.session.user && req.session.user.guard && req.session.user.guard != 'customer'){
            req.session.redirect = '/account'
            res.redirect('/logout')
        } else {

            data.brand = req.headers.host
            data.user = req.session.user
            next()
        }

    })

    routes.get('/receipt/:key', (req, res) => {

        data.title = "Receipt"

        transactions.find(req.params.key).then((trans)=>{

            if (trans[0].customer_id == req.session.user._key){
                data.transaction = trans[0]
                data.customer = req.session.user
                res.render(settings.views+'/receipt.ejs',data)
            } else {
                data.transaction = 'not found'
                data.customer = req.session.user
                res.render(settings.views+'/receipt.ejs',data)
            }

        }).catch((err)=>{
            data.transaction = 'not found'
            data.customer = req.session.user
            res.render(settings.views+'/receipt.ejs',data)
        })

    })

    routes.get('/terms-and-conditions', (req, res) => {

        data.title = "Appointment Terms and Conditions"
        res.render(settings.views+'/terms.ejs',data)
    })


    routes.get('/:type?', async (req, res) => {

        if (!req.session.user || req.session.client && req.session.client == 'existing'){
            req.session.redirect = '/account'
            res.redirect('/login')
            return
        }

        res.locals.functions = functions
        data.title = "Your Account"

        if (req.params.type){

            if (req.params.type == 'consultations'){

                customer.recommendedProducts(req.session.user._key).then((rp)=>{

                    data.type = 'consultations'
                    data.client_data = req.session.user
                    data.client_data.recommended_products = rp
                    res.render(settings.views+'/client_area.ejs',data)

                })

            } else if (req.params.type == 'documents') {

                data.type = 'documents'
                data.client_data = req.session.user
                if (!data.client_data.documents){
                    data.client_data.documents = []
                }
                res.render(settings.views+'/client_area.ejs',data)

            } else if (req.params.type == 'hair-profile') {

                data.type = 'hair_profile'
                data.include_scripts = [settings.views+'/scripts/client.ejs']
                data.client_data = req.session.user
                if (!data.client_data.documents){
                    data.client_data.documents = []
                }

                try {
                    data.consultation = await consultations.findRecent(data.client_data._key)
                    data.consultation = data.consultation[0]
                }
                catch(err){
                    data.consultation = false
                }

                res.render(settings.views+'/client_area.ejs',data)

            } else if (req.params.type == 'details') {

                data.type = 'details'
                data.include_scripts = [settings.views+'/scripts/client.ejs']
                data.client_data = await customer.find(req.session.user._key)
                if (!data.client_data.address){
                    data.client_data.address = {}
                }
                if (!data.client_data.dob){
                    data.client_data.dob = {}
                }
                res.render(settings.views+'/client_area.ejs',data)

            } else {

                transactions.find(req.session.user._key, true)
                    .then((receipts)=>{

                        // receipts.sort((a,b) => {
                        //     return -a.date.localeCompare(b.date)
                        // })

                        data.client_data = req.session.user
                        data.receipts = receipts
                        data.type = 'receipts'
                        res.render(settings.views+'/client_area.ejs',data)

                    }).catch(()=>{
                        data.client_data = req.session.user
                        data.receipts = []
                        data.type = 'receipts'
                        res.render(settings.views+'/client_area.ejs',data)
                    })

            }

        } else {

            customer.appointments(req.session.user._key)
                .then(async (client_data)=>{

                    if (!req.session.user.password){
                    //    customer.sendReset(req.session.user)
                    }

                    client_data.guard = req.session.user.guard
                    req.session.user = client_data

                    if (client_data.appointments && client_data.appointments.length > 0){

                        client_data.appointments = client_data.appointments.sort(function(a,b){
                            return new Date(a.date) - new Date(b.date);
                        })

                        let link_id = ''
                        client_data.appointments = client_data.appointments.filter((item,i)=>{

                            if (item.status == 'deleted' || link_id == item.link_id){

                                return false
                            } else {
                                item.linked_appointments = client_data.appointments.filter((obj) => obj.link_id === item.link_id).length
                                link_id = item.link_id
                                return true
                            }
                        })

                        client_data.appointments = client_data.appointments.sort(function(a,b){
                            return new Date(a.date) - new Date(b.date);
                        })

                    }

                    data.type = 'appointments'
                    data.client_data = client_data
                    res.render(settings.views+'/client_area.ejs',data)
                })

        }



    })

    routes.post('/upload', async function(req, res) {

        var fstream;
        req.pipe(req.busboy);
        req.busboy.on('file', function (fieldname, file, filename) {

            if (filename.match(/\.pdf|\.txt|\.csv$/)){
                let new_filename = req.session.user._key+'-'+Date.now()+'-'+filename

                fstream = fs.createWriteStream('/websites/salonstream/documents/' + new_filename);

                file.pipe(fstream);

                fstream.on('close', function () {

                    customer.saveDocument(req.session.user._key,filename,new_filename).then((docs)=>{
                        req.session.user.documents = docs
                        res.redirect('/account/documents')
                    }).catch((docs)=>{
                        req.session.user.documents = docs
                        res.redirect('/account/documents')
                    })

                })
            } else {
                res.redirect('/account/documents')
            }

        })

    })


// export


    module.exports = functions
    module.exports.routes = routes
    module.exports.settings = settings
