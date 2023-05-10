//
// Dashboard Module
// Includes functions and tools for all users
//


// vars

let express = require('express'),
    routes = express.Router(),
    db = require(global.config.db_connector),
    report = require('../../models/reports'),
    transactions = require('../../models/transactions'),
    path = require('path'),

    settings = {
        default_route: 'dashboard',
        views: 'dashboard/views',
        protected_guards:['staff','admin'],
        menu: {
            dashboard_menu: [
                {link:'Reports',slug: '/reports', protected_guards:['staff','admin'], min_role:1, weight:4, icon:'reports'}
            ]
        }
    },


// methods

    functions = {

        toCurrency:(input)=>{
            return '£'+parseFloat(input).toFixed(2)
        },

        calcAdj: (total, adjustment)=>{

            adjustment = adjustment.replace(/\$|\£|\#|p/,'')

            if (adjustment.match(/%/)){

                let adjustment_value = adjustment.replace(/%/,'')
                adjustment_value = (total/100)*adjustment_value
                return parseFloat(total)+parseFloat(adjustment_value)

            } else {

                return parseFloat(total)+parseFloat(adjustment)

            }

        },

        parseDate: (date, format) =>{

            if (typeof date != 'string'){
                return ''
            }
            if (format){
                return moment(date).format(format)
            } else {
                return moment(date).format('llll')
            }

        }

    }


// routes

    routes.use('/static', express.static(__dirname + '/static'))

    routes.get('*',(req, res, next)=>{

        if (req.session && req.session.user && req.session.user._key){
            view.current_view = 'dashboard'
            view.dashboard_view = 'reports'
            view.dashboard_category = 'reports'
            next()
        } else {
            res.redirect('/login/staff')
        }

    })

    routes.get('/reports/download/:filename', (req, res) => {

        res.sendFile(path.resolve(global.basedir+'/documents/reports/'+req.params.filename))

    })

//     routes.get('/reports/getaccounts', async (req, res) => {
//
//         db.query('FOR c IN customers FILTER c.balance.payment_intents RETURN c',async (data)=>{
//
//             let transactions = []
//
//             for (let cust of data){
//
//                 cust.account_total = 0
//                 cust.account_sub_total = 0
//                 cust.account_tax = 0
//
//                 if (cust.balance.payment_intents){
//                     cust.balance.payment_intents.map((intent)=>{
//                         cust.account_total = parseFloat(intent.new) - parseFloat(intent.old)
//                         cust.account_sub_total = cust.account_total/1.2
//                         cust.account_tax = cust.account_total - cust.account_sub_total
//
//                         cust.account_total = parseFloat(cust.account_total).toFixed(2)
//                         cust.account_sub_total = parseFloat(cust.account_sub_total).toFixed(2)
//                         cust.account_tax = parseFloat(cust.account_tax).toFixed(2)
//                     })
//                 }
//
//                 let date = moment().toISOString()
//                 let ts = moment().format('x')
//                 let transaction = {
//   "id": "cart_"+ts,
//   "items": [
//     {
//       "name": "Account Payment £"+cust.account_total,
//       "price": cust.account_total,
//       "type": "account",
//       "quantity": "1",
//       "sub_total": 0,
//       "tax": 0
//     }
//   ],
//   "total": cust.account_total,
//   "sub_total": 0,
//   "tax": 0,
//   "delivery": 0,
//   "delivery_method": "",
//   "status": "complete",
//   "method": "stripe",
//   "customer_id": cust._key,
//   "payment": {
//     "vouchers": 0,
//     "account": 0,
//     "card": 0,
//     "bacs": 0,
//     "cash": 0,
//     "change": 0,
//     "payment_link": cust.account_total
//   },
//   "item_total": cust.account_total,
//   "customer": {
//     "name": cust.name.first+' '+cust.name.last,
//     "avatar": cust.avatar
//   },
//   "temp":"true",
//   "_created": date,
//   "_updated": date
// }
//
//             transactions.push(transaction)
//             console.log('inserting')
//         //    await db.query('INSERT '+JSON.stringify(transaction)+' INTO transactions')
//
//             }
// console.log('done')
//             res.json(transactions)
//
//         })
//
//     })


    routes.get('/reports/:id/save', async (req, res) => {

        let report_data = await localStorage.get('report_'+req.params.id)

        res.locals.functions = functions
        let data = {
            user:req.session.user,
            title:"Report Saved"
        }

        if (req.cookies && req.cookies.mini_menu){
            data.mini_menu = req.cookies.mini_menu
        }

        if (report_data){

            report_data._created = moment().toISOString()

            if (report_data.transactions){
                report_data.transactions = report_data.transactions.map((transaction,i)=>{
                    return transaction._key
                })
                transactions.markAsProcessed(report_data.transactions,report_data._created)
            }

            db.query('INSERT '+JSON.stringify(report_data)+' INTO reports RETURN NEW', (saved_data)=>{

                data.saved_data = saved_data
                res.render(settings.views+'/report_saved.ejs',data)

            })

            localStorage.delete('report_'+req.params.id)

        } else {
            data.title = "Report Already Saved"
            res.render(settings.views+'/report_saved.ejs',data)
        }

    })
    



    routes.get('/reports/:function', async (req, res) => {

        res.locals.functions = functions
        let data = {
            user:req.session.user,
            title:"Reports",
            template:req.params.function,
            include_scripts: [settings.views+'/scripts/reports.ejs']
        }

        if (req.cookies && req.cookies.mini_menu){
            data.mini_menu = req.cookies.mini_menu
        }

        data.title = "Report: "+view.functions.capitalise(req.params.function.replace(/_/g, ' '))
        req.params.function = req.params.function.replace(/_([a-z])/g, function (g) { return g[1].toUpperCase(); })

        await localStorage.delete('report_results')

        if (typeof report[req.params.function] == 'function'){

            report[req.params.function](req.query).then((result)=>{

                if (!result){
                    result = 'Report Failed'
                }

                if (result == 'running'){
                    res.redirect('/dashboard/reports/'+req.params.function+'/results')
                } else {
                    data.result = result
                    res.render(settings.views+'/report_view.ejs',data)
                }

            }).catch((err)=>{

                data.title = "Report Failed"
                data.result = 'Report Failed: '+err
                data.error = err
                res.render(settings.views+'/report_view.ejs',data)

            })

        //    res.status(200).send('Running')

        } else {

            data.title = "Report not found"
            data.result = "Not Found"
            res.render(settings.views+'/report_view.ejs',data)

        }

    })


    routes.get('/reports/:function/results', async (req, res) => {

        res.locals.functions = functions
        let data = {
            user:req.session.user,
            title:"Report Results",
            template: view.functions.parseCamelCase(req.params.function, true),
            include_scripts: [settings.views+'/scripts/reports.ejs']
        }

        if (req.cookies && req.cookies.mini_menu){
            data.mini_menu = req.cookies.mini_menu
        }
        
        data.result = await localStorage.get('report_results')

        if (!data.result){
            data.title = "Awaiting report results..."
            data.result = false
        }
        
        res.render(settings.views+'/report_view.ejs',data)

    })

    // routes.get('/reports', (req, res) => {

    //     res.locals.functions = functions
    //     let data = {
    //         user:req.session.user,
    //         title:"Reports",
    //         include_scripts: [settings.views+'/scripts/reports.ejs']
    //     }

    //     if (req.cookies && req.cookies.mini_menu){
    //         data.mini_menu = req.cookies.mini_menu
    //     }

    //     res.render(settings.views+'/reports.ejs',data)

    // })
    routes.get('/reports', (req, res) => {

        res.locals.functions = functions
        let data = {
            user:req.session.user,
            title:"Reports",
            include_scripts: [settings.views+'/scripts/reports.ejs']
        }

        if (req.cookies && req.cookies.mini_menu){
            data.mini_menu = req.cookies.mini_menu
        }

        res.render(settings.views+'/admin_report.ejs',data)

    })

    routes.post('/reports/custom', (req, res) => {

        db.query(req.body.query, (report_data) => {
            resolve(report_data)
        })

    })




// export

    module.exports = functions
    module.exports.routes = routes
    module.exports.settings = settings
