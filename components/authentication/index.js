//
// Admin Module
// Admin user functions
//


// vars

const express = require('express'),
    routes = express.Router(),
    db = require(global.config.db_connector),
    admin = require('../../models/admins.js'),
    customer = require('../../models/customers.js'),
    staff = require('../../models/staff.js'),
    member = require('../../models/members.js'),

    settings = {
        default_route: 'login',
        menu: {
            admin: [{link:'Login',slug: '/login'}]
        }
    }


// methods

    functions = {


    }


// routes

    routes.use('/static', express.static(__dirname + '/static'))

    routes.get('/', (req, res) => {

        res.render('authentication/views/login.ejs', {guard:'customer',brand: req.headers.host})
    })

    routes.get('/new-account', (req, res) => {
        res.render('authentication/views/new_account.ejs', {guard:'customer',brand: req.headers.host})
    })

    routes.get('/new-account/sent', (req, res) => {
        res.render('authentication/views/new_account.ejs', {guard:'customer',sent:true,brand: req.headers.host})
    })

    routes.get('/link/:key', (req, res) => {

        customer.getAuthLink(req.params.key).then((cust_data)=>{
            req.session.user = cust_data
            req.session.user.guard = 'customer'
            res.redirect('/account')
        }).catch((err)=>{
            res.render('authentication/views/login.ejs', {guard:'customer',error:err,brand: req.headers.host})
        })

    })

    routes.get('/:guard/:type?', (req, res) => {

        let guards = ['admin','customer','staff','member']

        console.log(req.params)

        if (guards.indexOf(req.params.guard) >= 0 && req.params.type){

            res.render('authentication/views/reset.ejs', {type:req.params.type,guard:req.params.guard,brand: req.headers.host})

        } else if (guards.indexOf(req.params.guard) >= 0 && req.params.type == 'reset'){

            res.render('authentication/views/reset.ejs', {type:req.params.guard,guard:'customer'})

        } else {

            if (req.params.guard == 'staff'){

                if (req.session.user && req.session.user.guard && req.session.user.guard == 'staff'){

                    delete req.session.user
                    req.session.destroy()

                    staff.all().then((staff_data)=>{
                        res.render('authentication/views/login_staff.ejs', {guard:'staff', staff: staff_data,brand: req.headers.host})
                    }).catch((err)=>{
                        res.render('authentication/views/login_staff.ejs', {guard:'staff',error:err, staff: [],brand: req.headers.host})
                    })

                } else {
                    res.render('authentication/views/login.ejs', {guard:'staff',brand: req.headers.host})
                }

            } else if (req.params.guard == 'member'){
                res.render('authentication/views/login.ejs', {guard:'member',brand: req.headers.host})

            } else {
                res.render('authentication/views/login.ejs', {guard:req.params.guard,brand: req.headers.host})
            }


        }

    })

    routes.post('/:guard', (req, res) => {

        if (req.params.guard == 'admin'){

            admin.authenticate(req.body).then((data)=>{
                req.session.user = data

                if (req.session.redirect){
                    let redirect = req.session.redirect
                    delete req.session.redirect
                    res.redirect(redirect)
                } else {
                    res.redirect('/dashboard/calendar')
                }

            }).catch((err)=>{
                res.render('authentication/views/login.ejs', {guard:req.params.guard,error:err,brand: req.headers.host})
            })

        } else if (req.params.guard == 'staff'){

            staff.authenticate(req.body).then((data)=>{
                req.session.user = data

                if (req.session.redirect){
                    let redirect = req.session.redirect
                    delete req.session.redirect
                    res.redirect(redirect)
                } else {
                    res.redirect('/dashboard/calendar')
                }
            }).catch((err)=>{
                staff.all().then((staff_data)=>{
                    res.render('authentication/views/login_staff.ejs', {guard:req.params.guard,error:err, staff: staff_data,brand: req.headers.host})
                }).catch((err)=>{
                    res.render('authentication/views/login_staff.ejs', {guard:req.params.guard,error:err, staff: [],brand: req.headers.host})
                })

            })

        } else if (req.params.guard == 'customer'){

            console.log('gggggggggg',req.params.guard)

            if (req.body.new_account){

                customer.authenticate(req.body).then((data)=>{
                    res.redirect('/login')
                }).catch((err)=>{
                    res.redirect('/login/new-account/sent')
                })

            } else {
                customer.authenticate(req.body).then((data)=>{
                    req.session.user = data
                    if (req.session.redirect){
                        let redirect = req.session.redirect
                        delete req.session.redirect
                        res.redirect(redirect)
                    } else {
                        res.redirect('/account')
                    }
                }).catch((err)=>{
                    res.render('authentication/views/login.ejs', {guard:req.params.guard,error:err,brand: req.headers.host})
                })
            }

        } else if (req.params.guard == 'member'){

            console.log('member')

            member.authenticate(req.body).then((data)=>{
                req.session.user = data

                if (req.session.redirect){
                    let redirect = req.session.redirect
                    delete req.session.redirect
                    res.redirect(redirect)
                } else {
                    res.redirect('/member/purchase-seats')
                }
            }).catch((err)=>{


                console.log('error', err)
                res.render('authentication/views/login.ejs', {guard:req.params.guard,error:err,brand: req.headers.host})

                /*staff.all().then((staff_data)=>{
                    res.render('authentication/views/login_staff.ejs', {guard:req.params.guard,error:err, staff: staff_data,brand: req.headers.host})
                }).catch((err)=>{
                    res.render('authentication/views/login_staff.ejs', {guard:req.params.guard,error:err, staff: [],brand: req.headers.host})
                })*/

            })

        }

    })

    routes.post('/:guard/send_reset', (req, res) => {

        if (req.params.guard == 'admin'){

            admin.sendReset(req.body).then((data)=>{
                res.render('authentication/views/reset.ejs', {type:'reset_sent',brand: req.headers.host})
            }).catch((err)=>{
                res.render('authentication/views/reset.ejs', {error:err,type:'reset',guard:'admin',brand: req.headers.host})
            })

        } else if (req.params.guard == 'staff'){

            staff.sendReset(req.body).then((data)=>{
                res.render('authentication/views/reset.ejs', {type:'reset_sent',brand: req.headers.host})
            }).catch((err)=>{
                res.render('authentication/views/reset.ejs', {error:err,type:'reset', guard:'staff',brand: req.headers.host})
            })

        } else if (req.params.guard == 'customer'){

            customer.sendReset(req.body).then((data)=>{
                res.render('authentication/views/reset.ejs', {type:'reset_sent',brand: req.headers.host})
            }).catch((err)=>{
                res.render('authentication/views/reset.ejs', {type:'reset_sent',guard:'customer',brand: req.headers.host})
            })

        } else if (req.params.guard == 'member'){
            if(!req.body.email|| !req.body.email.match(
                /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
              )){
                console.log(req.body.email,"email");
                res.render('authentication/views/reset.ejs', {type:'reset_error',oldEmail:req.body.email,guard:'member' ,brand: req.headers.host})
            }else{
                member.sendReset(req.body).then((data)=>{
                    res.render('authentication/views/reset.ejs', {type:'reset_sent',brand: req.headers.host})
                }).catch((err)=>{
                    res.render('authentication/views/reset.ejs', {type:'reset_sent',guard:'member',brand: req.headers.host})
                })
            }
           

        }

    })

    routes.post('/:guard/reset_password', (req, res) => {
        console.log("member reset pass",req.params.guard);
        if (req.params.guard == 'admin'){

            admin.resetPassword(req.body).then((data)=>{

                admin.authenticate(req.body).then((user_data)=>{

                    req.session.user = user_data
                    if (req.session.redirect){
                        let redirect = req.session.redirect
                        delete req.session.redirect
                        res.redirect(redirect)
                    } else {
                        res.redirect('/dashboard/calendar')
                    }

                }).catch((err)=>{
                    res.render('authentication/views/login.ejs', {guard:'admin',error:err,brand: req.headers.host})
                })
                // res.redirect('/login')
            }).catch((err)=>{
                res.render('authentication/views/reset.ejs', {type:req.params.guard,guard:'admin',error:err,brand: req.headers.host})
            })

        } else if (req.params.guard == 'staff'){

            staff.resetPassword(req.body).then((data)=>{

                staff.authenticate(req.body).then((user_data)=>{

                    req.session.user = user_data
                    if (req.session.redirect){
                        let redirect = req.session.redirect
                        delete req.session.redirect
                        res.redirect(redirect)
                    } else {
                        res.redirect('/dashboard/calendar')
                    }

                }).catch((err)=>{
                    res.render('authentication/views/login.ejs', {guard:'staff',error:err,brand: req.headers.host})
                })
                // res.redirect('/login')
            }).catch((err)=>{
                res.render('authentication/views/reset.ejs', {type:req.params.guard,guard:'staff',error:err,brand: req.headers.host})
            })

        } else if (req.params.guard == 'customer'){

            customer.resetPassword(req.body).then((data)=>{

                customer.authenticate(req.body).then((user_data)=>{

                    req.session.user = user_data
                    if (req.session.redirect){
                        let redirect = req.session.redirect
                        delete req.session.redirect
                        res.redirect(redirect)
                    } else {
                        res.redirect('/account')
                    }

                }).catch((err)=>{
                    res.render('authentication/views/login.ejs', {guard:req.params.guard,error:err,brand: req.headers.host})
                })
                // res.redirect('/login')
            }).catch((err)=>{
                res.render('authentication/views/reset.ejs', {type:req.body.hash,guard:'customer',error:err,brand: req.headers.host})
            })

        }else if(req.params.guard == "member"){
            console.log("member reset pass");
            member.resetPassword(req.body).then((data)=>{
                // console.log(data);
                member.authenticate(req.body).then((user_data)=>{

                    req.session.user = user_data
                    
                        res.redirect('/login/member')
                    

                }).catch((err)=>{
                    res.redirect(`/login/member/reset`)
                    console.log("error");
                    // res.render('authentication/views/login.ejs', {guard:'admin',error:err,brand: req.headers.host})
                })
            }).catch((err)=>{
                
                res.redirect(`/login/member/${req.body.hash}`)
                console.log("err",err);
            })
        }

    })

// export

    module.exports = functions
    module.exports.routes = routes
    module.exports.settings = settings
