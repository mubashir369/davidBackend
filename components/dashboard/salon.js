//
// Dashboard Module
// Includes functions and tools for all users
//


// vars

let express = require('express'),
    routes = express.Router(),
    db = require(global.config.db_connector),
    moment = require('moment'),
    services = require('../../models/services'),
    salon = require('../../models/salon'),
    staff = require('../../models/staff'),
    products = require('../../models/products'),
    testimonials = require('../../models/testimonials'),
    members = require('../../models/members'),
    seats = require('../../models/seats'),
    home_about_us = require('../../models/home_about_us'),

    settings = {
        default_route: 'dashboard',
        views: 'dashboard/views',
        protected_guards:['staff','admin'],
        menu: {
            dashboard_menu: [
                    {link:'Salon',slug: '/salon', weight:1, icon:'stylist', protected_guards:['staff','admin'], min_role:1, subitems:[
                    {link:'Services',slug: '/salon/services', weight:1, min_role:2},
                    // {link:'Service Categories CMS',slug: '/salon/service_cms', weight:1, min_role:2},
                    {link:'Products',slug: '/salon/products', weight:2},
                    {link:'Orders',slug: '/salon/orders', weight:2},
                    {link:'Testimonials',slug: '/salon/testimonials', weight:2},
                    {link:'Staff',slug: '/salon/staff', weight:4, min_role:2},
                    // {link:'Staff',slug: '/salon/staff', weight:4, min_role:2},
                    // {link:'Events',slug: '/salon/events',min_role:2, weight:4},
                    {link:'Member Enquiry',slug: '/user_enquiry',min_role:2, weight:4},
                    {link:'Members',slug: '/salon/members',min_role:2, weight:4},
                    {link:'Member Subscription',slug: '/salon/member_subscriptions',min_role:2, weight:4},
                    {link:'Price Settings',slug: '/salon/price-setting',min_role:2, weight:4},
                    {link:'Commission Settings',slug: '/salon/commission-setting',min_role:2, weight:4},
                    // {link:'Product CMS',slug: '/salon/productCMS',min_role:2, weight:4}
                ]}
            ]
        }
    },


// methods

    functions = {

        getDay:(date)=>{

            return moment(date).format('ddd')

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

        getMonth:(date)=>{

            var months = ['January','Febuary','March','April','May','June','July','August','September','October','November','December']
            date = new Date(date)
            return months[date.getMonth()]+' '+date.getFullYear()

        },

        parseCalendarLink:(date)=>{

            if (date.match(/Z$/)){
                return moment(date).format('YYYY/M/D')
            } else {
                return
            }

        },

        parseTime:(time)=>{

            if (time){
                time = time.toString().split("")
            } else {
                return
            }

            if (time.length == 3){
                return '0'+''+time[0]+':'+time[1]+''+time[2]
            } else {
                return time[0]+''+time[1]+':'+time[2]+''+time[3]
            }


        },

        isToday:(date) => {

            if (date && date.match(/Z$/) && moment(date).isSame(moment(), 'day')){
                return true
            } else {
                return false
            }

        },

        parseCalendarLink:(date)=>{

            if (date.match(/Z$/)){
                return moment(date).format('YYYY/M/D')
            } else {
                return
            }

        },

        getHrs: () => {

            let hrs = [], time, start_min, booked = false

            for(i=8; i<=23; i++) {

                time = ''

                for (ii=0; ii<=45; ii += 15) {

                    if (i < 10){
                        time = '0'+i+':'
                    } else {
                        time = i+':'
                    }

                    if (ii < 10){
                        time = time+'0'+ii
                    } else {
                        time = time+ii
                    }

                }

            }

        }


    }

    routes.use('/static', express.static(__dirname + '/static'))

    routes.get('*',(req, res, next)=>{
        if (req.session && req.session.user && req.session.user._key){
            view.current_view = 'dashboard'
            view.dashboard_category = 'salon'
            next()
        } else {
            res.redirect('/login/staff')
        }
    })

    routes.get('/salon/products', async (req, res) => {

        view.dashboard_view = 'products'

        res.locals.functions = functions
        let data = {
            user:req.session.user,
            title: "Products",
            include_scripts: [settings.views+'/scripts/salon.ejs']
        }

        if (req.cookies && req.cookies.mini_menu){
            data.mini_menu = req.cookies.mini_menu
        }

        data.salon = await salon.find('54855602')

        res.render(settings.views+'/salon_products.ejs',data)

    })


    routes.get('/salon/orders', async (req, res) => {

        view.dashboard_view = 'orders'

        res.locals.functions = functions
        let data = {
            user:req.session.user,
            title: "Orders",
            include_scripts: [settings.views+'/scripts/salon.ejs']
        }

        if (req.cookies && req.cookies.mini_menu){
            data.mini_menu = req.cookies.mini_menu
        }

        data.salon = await salon.find('54855602')

        res.render(settings.views+'/salon_orders.ejs',data)

    })

    routes.get('/salon/member_subscriptions', async (req, res) => {
        try{
        view.dashboard_view = 'member subscription'
        res.locals.functions = functions

        let data = {
            title: "Member Subscription",
            user:req.session.user,
            include_scripts: [settings.views+'/scripts/member_subscriptions.ejs']
        }

        data.salon = await salon.find('54855602')

        res.render(settings.views+'/member_subscriptions.ejs', data)
    }catch(e){
        console.log(e)
        res.render("../layouts/error.ejs");
    }
    })
    routes.get('/salon/testimonials', async (req, res) => {
        try{
        view.dashboard_view = 'testimonials'

        var tst = await testimonials.all()


        res.locals.functions = functions
        let data = {
            user:req.session.user,
            title: "Testimonials",
            include_scripts: [settings.views+'/scripts/salon.ejs']
        }

        if (req.cookies && req.cookies.mini_menu){
            data.mini_menu = req.cookies.mini_menu
        }

        data.salon = await salon.find('54855602')
        data.testimonials = tst

        console.log(data)
        res.render(settings.views+'/salon_testimonials.ejs',data)
    }catch(e){
        res.render('../layouts/error404.ejs')
    }

    })

    routes.get('/salon/members', async (req, res) => {

        view.dashboard_view = 'Members'

        var tst = await members.all()
        var serv = await services.all2()


        res.locals.functions = functions
        let data = {
            user:req.session.user,
            title: "Members List",
            include_scripts: [settings.views+'/scripts/salon.ejs']
        }

        if (req.cookies && req.cookies.mini_menu){
            data.mini_menu = req.cookies.mini_menu
        }

        data.salon = await salon.find('54855602')
        data.members = tst
        data.services = serv
        data.products = await products.list()

        console.log(data)

        res.render(settings.views+'/salon_members.ejs',data)

    })


    routes.get('/salon/price-setting', async (req, res) => {

        view.dashboard_view = 'new_appointment'

        res.locals.functions = functions
        let data = {
            user:req.session.user,
            hide_datepicker:true,
            title: "Price Settings",
            customers:[],
            parseName: functions.parseName,
            customer: false,
            include_scripts: [settings.views+'/scripts/calendar.ejs']
        }
        data.seats = await seats.all()

        if (req.cookies && req.cookies.mini_menu){
            data.mini_menu = req.cookies.mini_menu
        }

        if (req.query && req.query.date){
            data.selected_date = moment(req.query.date).format('/YYYY/M/D')
        } else {
            data.selected_date = ''
        }


        res.render(settings.views+'/price_setting.ejs',data)

    })
    routes.get('/user_enquiry', async (req, res) => {
        try{
        view.dashboard_view = 'member_enquiry'
        let start=parseInt(req.query.start) || 0;
        let limit=parseInt(req.query.limit) || 20;
        res.locals.functions = functions
        let data = {
            user:req.session.user,
            hide_datepicker:true,
            title: "Member Enquiry",
            customers:[],
            parseName: functions.parseName,
            customer: false,
            include_scripts: [settings.views+'/scripts/calendar.ejs']
        }
        data.member = await members.getEnquiry2({"start":start,"limit":20})

        res.render(settings.views+'/enquiry2.ejs',data)
    }catch{
        res.render('../layouts/error404.ejs')
    }

    })


    routes.get('/salon/services', async (req, res) => {
        try{
        view.dashboard_view = 'services'

        res.locals.functions = functions
        let data = {
            user:req.session.user,
            title: "Services",
            include_scripts: [settings.views+'/scripts/salon.ejs']
        }

        if (req.cookies && req.cookies.mini_menu){
            data.mini_menu = req.cookies.mini_menu
        }
       
       data.salon= await salon.find('54855602');
            
        res.render(settings.views+'/salon_services.ejs',data)
        }
            catch(err) {
                return res.render('../layouts/error.ejs')
            }
    })


    routes.get('/salon/availability', (req, res) => {

        view.dashboard_view = 'availability'

        res.locals.functions = functions
        let data = {
            user:req.session.user,
            title: "Availability",
        }

        if (req.cookies && req.cookies.mini_menu){
            data.mini_menu = req.cookies.mini_menu
        }

        res.render(settings.views+'/salon_availability.ejs',data)

    })
    

    routes.get('/salon/commission-setting', (req, res) => {

        view.dashboard_view = 'availability'

        res.locals.functions = functions
        let data = {
            user:req.session.user,
            title: "Commission Settings",
            include_scripts: [settings.views + '/scripts/purchase_seats_script.ejs']
        }

        if (req.cookies && req.cookies.mini_menu){
            data.mini_menu = req.cookies.mini_menu
        }

        res.render(settings.views+'/commission-setting.ejs',data)

    })
    routes.get('/productCMS',async (req, res) => {

        view.dashboard_view = 'Procuct CMS'

        res.locals.functions = functions
        let data = {
            user:req.session.user,
            title: "Product CMS",
            include_scripts: [settings.views + '/scripts/purchase_seats_script.ejs']
        }

        if (req.cookies && req.cookies.mini_menu){
            data.mini_menu = req.cookies.mini_menu
        }
        data.details = await home_about_us.getAbout1({type:"productCMS"})
        res.render(settings.views+'/productCMS.ejs',data)

    })


    routes.get('/salon/seat-availablity', (req, res) => {

        view.dashboard_view = 'Seat Availablity'

        res.locals.functions = functions
        let data = {
            user:req.session.user,
            title: "Seat Availablity",
        }

        if (req.cookies && req.cookies.mini_menu){
            data.mini_menu = req.cookies.mini_menu
        }

        res.render(settings.views+'/salon_seat_availability.ejs',data)

    })


    routes.get('/salon/events', async (req, res) => {

        view.dashboard_view = 'events'
        res.locals.functions = functions

        let data = {
            title: "Salon Events",
            user:req.session.user,
            include_scripts: [settings.views+'/scripts/salon_events.ejs']
        }

        res.render(settings.views+'/salon_events.ejs', data)

    })

    routes.get('/salon/service_cms', async (req, res) => {

        view.dashboard_view = 'Service Categories'
        res.locals.functions = functions

        let data = {
            title: "Service Categories",
            user:req.session.user,
            include_scripts: [settings.views+'/scripts/salon.ejs']
        }
        data.salon = await salon.find('54855602')


        res.render(settings.views+'/service_cms.ejs', data)

    })


    routes.get('/salon/edit_service_cms/:id/:name', async (req, res) => {

        view.dashboard_view = 'Service Categories'
        res.locals.functions = functions

        let data = {
            title: "Add Service Data",
            user:req.session.user,
            include_scripts: [settings.views+'/scripts/salon.ejs']
        }

        data.service_name = req.params.name
        data.service_id = req.params.id

        res.render(settings.views+'/add_service_cms.ejs', data)

    })

    routes.get('/salon/staff/:id', async (req, res) => {

        view.dashboard_view = 'staff'

        res.locals.functions = functions
        let data = {
            user:req.session.user,
            title:"Staff",
            include_scripts: [settings.views+'/scripts/salon.ejs']
        }

        data.staff_key = req.params.id
        if (data.staff_key == 'profile'){
            data.staff_key = req.session.user._key
        }

        if (req.cookies && req.cookies.mini_menu){
            data.mini_menu = req.cookies.mini_menu
        }

        data.salon = await salon.find('54855602')

        data.selected_date = false
        if (req.query.date){
            data.selected_date = req.query.date
        }

        staff.findWithAppointments(data.staff_key, data.selected_date)
            .then((member)=>{

                if (member && member.appointments && member.appointments.length > 0){
                    member.appointments = member.appointments.sort(function(a,b){
                      return new Date(a.date) - new Date(b.date);
                    })
                }

                if ( member && member.availability && member.availability.length > 0){

                    member.availability = member.availability.map((available)=>{

                        let avail_date = moment(available.date),
                            mins = moment(available.end_date).diff(avail_date, 'minutes')

                        let filled = member.appointments.filter((appointment) => {
                                return avail_date.isSame(moment(appointment.date),'day')
                            }).map((appointment) => {
                                let duration = moment(appointment.end_date).diff(moment(appointment.date),'minutes')
                                return duration
                            })

                        if (filled.length > 0){
                            filled = filled.reduce((a, b) => {
                                return a + b
                            //    return available
                            })//
                        } else {
                            filled = 0
                        }

                        available.filled = Math.round((filled/mins)*100)
                        return available

                    }).sort(function(a,b){
                        return new Date(a.date) - new Date(b.date);
                    })

                }

                let member_new = member.s
                member_new.appointments = member.appointments
                member_new.availability = member.availability
                data.title = member_new.name.first+" "+member_new.name.last
                data.member = member_new
                res.render(settings.views+'/salon_staff_member.ejs',data)
            })

    })

    // routes.get('/salon/staff', async (req, res) => {

    //     view.dashboard_view = 'staff'

    //     res.locals.functions = functions
    //     let data = {
    //         user:req.session.user,
    //         title:"Staff",
    //         include_scripts: [settings.views+'/scripts/salon.ejs']
    //     }

    //     if (req.cookies && req.cookies.mini_menu){
    //         data.mini_menu = req.cookies.mini_menu
    //     }

    //     data.stylists = await staff.all()
    //     data.salon = await salon.find('54855602')

    //     res.render(settings.views+'/salon_staff.ejs',data)


    // })
    routes.get('/salon/staff', async (req, res) => {

        view.dashboard_view = 'staff1'

        res.locals.functions = functions
        let data = {
            user:req.session.user,
            title:"Staff",
            include_scripts: [settings.views+'/scripts/salon.ejs']
        }

        if (req.cookies && req.cookies.mini_menu){
            data.mini_menu = req.cookies.mini_menu
        }

        data.stylists = await staff.getStaff()
        // data.salon = await salon.find('54855602')

        res.render(settings.views+'/staff.ejs',data)


    })

    routes.get('/salon', async (req, res) => {
        try{
        if (req.session.user.role && req.session.user.role < 2){
            res.redirect('/dashboard/salon/products')
        }

        view.dashboard_view = 'salon'

        res.locals.functions = functions
        let data = {
            user:req.session.user,
            title: "Salon",
            salon:{},
            appointments:[],
            include_scripts: [settings.views+'/scripts/salon.ejs']
        }

        if (req.cookies && req.cookies.mini_menu){
            data.mini_menu = req.cookies.mini_menu
        }

        data.salon = await salon.find('54855602')

        res.render(settings.views+'/salon.ejs',data)

    }catch (err) {
        res.render('../layouts/error.ejs')
    }
    })


    module.exports = functions
    module.exports.routes = routes
    module.exports.settings = settings
