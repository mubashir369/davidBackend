//
// Dashboard Module
// Includes functions and tools for all users
//


// vars

let express = require('express'),
    routes = express.Router(),
    moment = require('moment'),
    db = require(global.config.db_connector),    
    seats = require('../../models/seats'),

    settings = {
        default_route: 'seats',
        views: 'member/views',
        protected_guards:['member'],
        menu: {
            packages_menu: [
                {link:'Purchase Seats',slug: '/purchase-seats', weight:1, icon:'calendar',subitems:[
                    /*{link:'Appointments',slug: '/calendar/appointments',min_role:2, weight:2},
                    {link:'Price Setting',slug: '/calendar/price-setting',min_role:2, weight:2}*/
                ]}
            ]
        }
    },


// methods

    functions = {

        parseTimeSlot:(time, appointment, selected_date, opening_times)=>{

            if (appointment && appointment.event_type == 'staff_appointment'){

                // if (selected_date == 'Today'){
                //     selected_date = moment().set({hours:6})
                // } else {
                //     selected_date = moment(selected_date,'YYYY/MM/DD').set({hours:6})
                // }
                //
                // let start = time.replace(/\:/,''),
                //     open = opening_times[selected_date.format('d')].open.replace(':','')
                //
                // if (moment(appointment.date).isBefore(selected_date)){
                //
                //     return open
                //
                // } else {
                //
                //     if (open == 'undefined' || open == 'closed'){
                //         open = start
                //     }
                //
                //     if (start < open){
                //         return open
                //     } else {
                //         return start
                //     }
                //
                // }

                return moment(appointment.date).format('HHmm')

            } else if (time){

                return time.replace(/\:/,'')

            } else {

                return '0000'

            }

        },

        getPreviousSlot: (end_time, appointment, selected_date, opening_times)=>{

            if (appointment && appointment.event_type == 'staff_appointment'){

                // if (selected_date == 'Today'){
                //     selected_date = moment().set({hours:23})
                // } else {
                //     selected_date = moment(selected_date,'YYYY/MM/DD').set({hours:23})
                // }
                //
                // let start = end_time.replace(/\:/,''),
                //     close = opening_times[selected_date.format('d')].close.replace(':','')
                //
                // if (moment(appointment.end_date).isAfter(selected_date)){
                //
                //     end_time = close
                //
                // } else {
                //
                //     if (close == 'undefined' || close == 'closed'){
                //         close = start
                //     }
                //
                //     if (parseInt(start) < parseInt(close)){
                //         end_time = start
                //     } else {
                //         end_time = close
                //     }
                //
                // }

                end_time = moment(appointment.end_date).format('HHmm')

            } else if (end_time){

                end_time = end_time.replace(/\:/,'')

            } else {

                end_time = '0000'

            }

            if (end_time.match(/[0-9]{4}/)){ // get the previous slot, otherwise all appointments are 1 slot too big

                last_two = end_time.toString().match(/[0-9][0-9]$/)[0]

                if (last_two == '00'){
                    end_time = end_time-55
                } else {
                    end_time = end_time-15
                }

                if (end_time.toString().length == 3){
                    end_time = '0'+end_time
                }

                return end_time
            } else {
                return '0000'
            }

        },

        getStaffAppointmentTimes: (appt, selected_date) => {

            let start = moment(appt.date),
                end = moment(appt.end_date)

            if (selected_date == 'Today'){
                selected_date = moment()
            } else {
                selected_date = moment(selected_date,'YYYY/MM/DD').set({hour:8})
            }

            if (end.diff(selected_date,'hours') > 8){ // if the appt ends today
                return start.format('Do MMM h:mma')+' - '+end.format('Do MMM h:mma')
            } else {
                // let diff = end.diff(start,'hours'),
                //     postfix = 'hrs'
                //
                // if (diff < 1){
                //     diff = end.diff(start,'minutes')
                //     postfix = 'mins'
                // } else if (diff == 1){
                //     postfix = 'hr'
                // }

                return
            }

        },

        isToday: (date) => {

            if (date.match(/[0-9]{4}\/[0-9]{1,2}\/[0-9]{1,2}/)){
                return false
            } else {
                return true
            }

        },

        parseName: (name_obj) => {
            return name_obj.first+' '+name_obj.last
        },

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

        parseCalendarLink:(date)=>{

            if (date.match(/Z$/)){
                return moment(date).format('YYYY/M/D')
            } else {
                return
            }

        },

    }


// routes

    routes.use('/static', express.static(__dirname + '/static'))

    routes.get('*',(req, res, next)=>{
        if (req.session && req.session.user && req.session.user._key){
            view.current_view = 'dashboard'
            view.dashboard_category = 'calendar'
            next()
        } else {
            res.redirect('/login/staff')
        }
    })

    routes.get('/packages', async (req, res) => {

        view.dashboard_view = 'calendar'

        res.locals.functions = functions
        let data = {
            user:req.session.user,
            title: "Calendar",
            appointments:[],
            selected_date: "Today",
            include_scripts: [settings.views+'/scripts/calendar.ejs'],
            mini_menu: false
        }

        if (req.cookies.selected_date){ // if there's a date that's been previously selected, go to that instead
            res.redirect('/dashboard/calendar/'+req.cookies.selected_date)
        } else {

            if (req.cookies && req.cookies.mini_menu){
                data.mini_menu = req.cookies.mini_menu
            }

            data.appointments = await appointments.all()
            data.staff = await staff.all()
            data.salon = await salon.find('54855602')

            for (var appt of data.appointments){
                if (appt.staff_id == '0000'){
                    data.staff.unshift({_key:'0000', name: {first: 'Unassigned',last:'Appointments'}})
                    break
                }
            }

            data.opening_times = data.salon.opening_times[moment().format('d')]

            res.render(settings.views+'/calendar.ejs',data)

        }


    })

    routes.get('/calendar/notifications', async (req, res) => {

        view.dashboard_view = 'notifications'

        res.locals.functions = functions
        let data = {
            user:req.session.user,
            hide_datepicker:true,
            title: "Notifications",
            include_scripts: [settings.views+'/scripts/notifications.ejs']
        }

        if (req.cookies && req.cookies.mini_menu){
            data.mini_menu = req.cookies.mini_menu
        }

        data.notifications = await notifications.all()

        res.render(settings.views+'/calendar_notifications.ejs',data)

    })

    routes.get('/calendar/appointments', async (req, res) => {

        view.dashboard_view = 'appointments'

        res.locals.functions = functions
        let data = {
            user:req.session.user,
            hide_datepicker:true,
            title: "Appointments",
            include_scripts: [settings.views+'/scripts/calendar.ejs']
        }

        if (req.cookies && req.cookies.mini_menu){
            data.mini_menu = req.cookies.mini_menu
        }

        data.salon = await salon.find('54855602')
        data.appointments = await appointments.findTodaysAppointments()
        data.unconfirmed_appointments = await appointments.findAppointmentsWithStatus('unconfirmed')
        data.pending_appointments = await appointments.findAppointmentsWithStatus('salon_confirmation')
        data.cancelled_appointments = await appointments.findAppointmentsWithStatus('cancelled')
        data.rescheduled_appointments = await appointments.findAppointmentsWithStatus('reschedule')
        data.covid_appointments = [] //await appointments.findAppointmentsWithCovid('salon_confirmation')
        data.incomplete_appointments = await customer.incompleteAppointments()

        res.render(settings.views+'/calendar_appointments.ejs',data)

    })

    routes.get('/calendar/new-appointment', (req, res) => {

        view.dashboard_view = 'new_appointment'

        res.locals.functions = functions
        let data = {
            user:req.session.user,
            hide_datepicker:true,
            title: "New Appointment",
            customers:[],
            parseName: functions.parseName,
            customer: true,
            include_scripts: [settings.views+'/scripts/new_appointment.ejs']
        }

        if (req.query && req.query.date){
            data.selected_date = moment(req.query.date).format('/YYYY/M/D')
        } else {
            data.selected_date = ''
        }

        if (req.cookies && req.cookies.mini_menu){
            data.mini_menu = req.cookies.mini_menu
        }

        res.render(settings.views+'/new_appointment.ejs',data)

    })

    routes.get('/calendar/new-staff-appointment', async (req, res) => {

        view.dashboard_view = 'new_appointment'

        res.locals.functions = functions
        let data = {
            user:req.session.user,
            hide_datepicker:true,
            title: "Book Staff Absence",
            customers:[],
            parseName: functions.parseName,
            customer: false,
            include_scripts: [settings.views+'/scripts/new_appointment.ejs']
        }

        if (req.query && req.query.date){
            data.selected_date = moment(req.query.date).format('/YYYY/M/D')
            data.availability = await appointments.getStaffAvailability(req.query.date, req.query.staff_id)
        } else {
            data.selected_date = ''
        }

        if (req.cookies && req.cookies.mini_menu){
            data.mini_menu = req.cookies.mini_menu
        }

        data.salon = await salon.find('54855602')

        res.render(settings.views+'/new_staff_appointment.ejs',data)

    })

    routes.get('/calendar/opening-times', async (req, res) => {

        view.dashboard_view = 'new_appointment'

        res.locals.functions = functions
        let data = {
            user:req.session.user,
            hide_datepicker:true,
            title: "",
            customers:[],
            parseName: functions.parseName,
            customer: false,
            include_scripts: [settings.views+'/scripts/new_appointment.ejs']
        }

        data.salon = await salon.find('54855602')

        if (req.query && req.query.date){

            let query_date = moment(req.query.date)
            data.selected_date = query_date.format('YYYY/M/D')

        } else {
            data.selected_date = ''
        }

        data.title = moment(req.query.date).format('dddd Do MMMM')

        if (req.cookies && req.cookies.mini_menu){
            data.mini_menu = req.cookies.mini_menu
        }

        res.render(settings.views+'/calendar_opening_times.ejs',data)

    })

    routes.get('/calendar/new-memo', (req, res) => {

        view.dashboard_view = 'new_appointment'

        res.locals.functions = functions
        let data = {
            user:req.session.user,
            hide_datepicker:true,
            title: "New Memo",
            customers:[],
            parseName: functions.parseName,
            customer: false,
            include_scripts: [settings.views+'/scripts/new_appointment.ejs']
        }

        if (req.cookies && req.cookies.mini_menu){
            data.mini_menu = req.cookies.mini_menu
        }

        if (req.query && req.query.date){
            data.selected_date = moment(req.query.date).format('/YYYY/M/D')
        } else {
            data.selected_date = ''
        }

        res.render(settings.views+'/new_memo.ejs',data)

    })

    routes.get('/calendar/price-setting', async (req, res) => {

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

    routes.get('/calendar/appointment/:id', (req, res) => {

        view.dashboard_view = 'appointment'

        res.locals.functions = functions
        let data = {
            user:req.session.user,
            hide_datepicker:true,
            title: "Edit Appointment ref:"+req.params.id,
            customers:[],
            parseName: functions.parseName,
            appointment_key: req.params.id,
            customer:true,
            selected_date:'',
            include_scripts: [settings.views+'/scripts/new_appointment.ejs']
        }

        if (req.cookies && req.cookies.mini_menu){
            data.mini_menu = req.cookies.mini_menu
        }

        res.render(settings.views+'/new_appointment.ejs',data)

    })

    routes.get('/calendar/staff-appointment/:id', (req, res) => {

        view.dashboard_view = 'staff_appointment'

        res.locals.functions = functions
        let data = {
            user:req.session.user,
            hide_datepicker:true,
            title: "Edit Appointment ref: "+req.params.id,
            customers:[],
            parseName: functions.parseName,
            appointment_key: req.params.id,
            customer:false,
            include_scripts: [settings.views+'/scripts/new_appointment.ejs']
        }

        if (req.cookies && req.cookies.mini_menu){
            data.mini_menu = req.cookies.mini_menu
        }

        res.render(settings.views+'/edit_appointment.ejs',data)

    })

    routes.get('/calendar/:year/:month?/:day?', async (req, res) => {

        let date_string = ''

        if (parseInt(req.params.year)){
            if (!req.params.month || !req.params.day || !parseInt(req.params.month) || !parseInt(req.params.day)){
                res.redirect('/dashboard/calendar')
                return
            }
            date_string = new Date(req.params.year+'-'+req.params.month+'-'+req.params.day).toISOString()
        }

        view.dashboard_view = 'calendar'

        res.locals.functions = functions
        let data = {
            user:req.session.user,
            selected_date: req.params.year+'/'+req.params.month+'/'+req.params.day,
            title: "Calendar",
            appointments:[],
            include_scripts: [settings.views+'/scripts/calendar.ejs']
        }

        if (req.cookies && req.cookies.mini_menu){
            data.mini_menu = req.cookies.mini_menu
        }

        if (req.params.year == 'today'){
            res.clearCookie('selected_date')
            res.redirect('/dashboard/calendar')
            return
        } else {
            res.cookie('selected_date',data.selected_date, { maxAge: 900000, httpOnly: true });
        }

        data.appointments = await appointments.all(date_string)
        data.staff = await staff.all()
        data.salon = await salon.find('54855602')

        for (var appt of data.appointments){
            if (appt.staff_id == '0000'){
                data.staff.unshift({_key:'0000', name: {first: 'Unassigned',last:'Appointments'}})
                break
            }
        }

        data.opening_times = data.salon.opening_times[moment(new Date(req.params.year+'-'+req.params.month+'-'+req.params.day)).format('d')]

        res.render(settings.views+'/calendar.ejs',data)

    })



// export

    module.exports = functions
    module.exports.routes = routes
    module.exports.settings = settings
