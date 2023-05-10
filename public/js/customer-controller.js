
    controller = function(){

        var pathname = window.location.pathname.split('/'),
            search_timer,
            date = new Date(),
            date_path = window.location.pathname.match(/([0-9]+)\/([0-9]+)\/([0-9]+)/)

        if (date_path){ // if a date has been selected in the url somewhere

            if (parseInt(date_path[2]) < 10 && !date_path[2].match(/00/)){
                date_path[2] = '0'+date_path[2]
            }
            if (parseInt(date_path[3]) < 10 && !date_path[3].match(/00/)){
                date_path[3] = '0'+date_path[3]
            }

            date = new Date(date_path[1]+'-'+date_path[2]+'-'+date_path[3])

        }

        scope.openNav = function(){

            let nav = document.getElementById('nav'),
                body = document.querySelector("html")

            if (nav.classList.contains('open')){
                nav.classList.remove('open')
                body.style.overflow = 'auto'
            } else {
                nav.classList.add('open')
                body.style.overflow = 'hidden'
            }

        }

        scope.new_appointment = {
            service_id:'',
            staff_id:'',
            staff_name:'',
            start_time:'',
            duration:''
        }

        scope.visual_appointments = []
        scope.appointments = []

        scope.view = {
            customer: {
                name:'',
                tel:'',
                email:''
            },
            selected_customer:null,
            datepicker: false,
            context:'',
            search:'',
            tab:'one',
            page:'customer',
            booking:false,
            add_customer:true,
            notification:{},
            reschedule: false,
            reschedule_key: '',
            last_path:pathname[pathname.length-1],
            select_stylist: false,
            ok_to_book: false,
            brand:'',
            next: false
        }

        scope.cart = {}

        if (typeof extendedController == 'function'){
            extendedController()
        }


// functions


        watch['view.page'] = function(new_page, old_page){

            if (old_page == 'staff' && new_page == 'date' && scope.appointments.length > 0){
                scope.view.page = 'service'
            } else if (new_page == 'date' && scope.appointments.length > 0){
                scope.view.page = 'staff'
            }

            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;

        }

        // watch['view.selected_customer'] = function(data, old){
        //     console.log(data)
        // }

        scope.selectService = function(type){

            if (!type && scope.view.service_type){
                 type = scope.view.service_type
            }

            scope.view.service_type = type
            scope.view.page = type

            let idx = scope.salon.categories.findIndex((cat)=>{
                return cat.name.match(/colour/i)
            })

            if (type == 'colour'){

                scope.filteredServices = scope.services.filter(function(item,i){
                    item.from_price = 999
                    item.prices.map(function(price, i) {
                        if (parseFloat(price.value) < item.from_price){
                            item.from_price = parseFloat(price.value)
                        }
                        return item
                    })
                    return item.category == idx && item.public == 'true'
                })



            } else {

                scope.filteredServices = scope.services.filter(function(item,i){
                    item.from_price = 999
                    item.prices.map(function(price, i) {
                        if (parseFloat(price.value) < item.from_price){
                            item.from_price = parseFloat(price.value)
                        }
                        return item
                    })
                    return item.category != idx && item.public == 'true'
                })

            }


        }


        scope.selectStylist = function(){

            return new Promise(function(resolve, reject) {

                var rand = Math.floor(Math.random() * scope.staff.length-1)

                if (scope.staff[rand]){
                   resolve(scope.staff[rand])
                } else {
                   reject('Unable to find a stylist')
                }
            });

        }

        scope.noStylist = function(){

            delete scope.new_appointment.staff_id
            delete scope.new_appointment.staff_name
            delete scope.new_appointment.staff_level
            delete scope.new_appointment.price
            delete scope.view.select_stylist

            scope.view.page = 'date'
        }

        scope.skinTest = function(){

            scope.notify('cancel')

            if (scope.view.skin_test_required == 'false' && !scope.new_appointment.skin_test && !scope.new_appointment.skin_test_collection && !scope.view.selected_customer.address){
                scope.notify('Please confirm you have had a skin test recently, or request a new one','error')
                return false
            }

            if (scope.view.skin_test_required == 'true' && !scope.new_appointment.skin_test && !scope.new_appointment.skin_test_collection && !scope.view.selected_customer.address){
                scope.notify('Please specify how you would like to receive your skin test','error')
                return false
            }

            if (!scope.new_appointment.skin_test && !scope.new_appointment.skin_test_collection){

                scope.new_appointment.skin_test_required = true
                scope.view.selected_customer.skin_test_required = true
                if (!scope.view.selected_customer.address || !scope.view.selected_customer.address.line1 || !scope.view.selected_customer.address.postcode || !scope.view.selected_customer.address.postcode.match(/^([A-Z][A-HJ-Y]?[0-9][A-Z0-9]? ?[0-9][A-Z]{2}|GIR ?0A{2})$/i)){
                    scope.notify('Please enter a valid address to continue','error')
                    return false
                }

                let skin_test_check = localStorage.getItem('skin_test')

                if (!skin_test_check || moment(skin_test_check).diff(moment(),'months') >= 6){
                    scope.post('customers/save_details', scope.view.selected_customer).then((data)=>{
                        localStorage.setItem('skin_test',moment().toISOString())
                    })
                }

            } else if (scope.new_appointment.skin_test_collection) {

                scope.new_appointment.skin_test_required = true
                scope.view.selected_customer.skin_test_collection = true
                let skin_test_check = localStorage.getItem('skin_test')

                if (!skin_test_check || moment(skin_test_check).diff(moment(),'months') >= 6){
                    scope.post('customers/save_details', scope.view.selected_customer).then((data)=>{
                        localStorage.setItem('skin_test',moment().toISOString())
                    })
                }

            } else {
                scope.new_appointment.skin_test_required = false
                scope.view.selected_customer.skin_test_required = false
            }

            scope.view.page = 'date'

        }

        scope.newAppointment = function(type, data, index){

            if (type == 'add_customer'){

                if (data){

                    scope.get('customers',data).then((cust_data)=>{
                        scope.view.selected_customer = cust_data
                    //    localStorage.setItem('appointment_customer',JSON.stringify(data))
                        if (scope.appointments.length > 0){
                            scope.view.page = 'book'
                        } else {
                            scope.view.page = 'service'
                        }

                        scope.storeNewAppointment()
                    }).catch((err)=>{
                        // console.log(err)
                        scope.view.page = 'customer'
                    })

                } else if (scope.view.customer){

                    if (!scope.view.customer.name || !scope.view.customer.name.match(/\s/)){
                        scope.notify('Please enter your first name and surname to continue','error',5,'fa-exclamation-circle')
                        return false
                    } else if (!scope.view.customer.tel && !scope.view.customer.email){
                        scope.notify('Please enter a valid mobile telephone number or email address','error',5,'fa-exclamation-circle')
                        return false
                    } else if (!scope.view.customer.tel || scope.view.customer.tel && !scope.view.customer.tel.match(/^(\+44\s?7\d{3}|\(?07\d{3}\)?)\s?\d{3}\s?\d{3}$/)){
                        scope.notify('Please enter a valid mobile telephone number','error',5,'fa-exclamation-circle')
                        return false
                    } else if (!scope.view.customer.email || scope.view.customer.email && !scope.view.customer.email.match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/)){
                        scope.notify('Please enter a valid email address','error',5,'fa-exclamation-circle')
                        return false
                    } else {

                        scope.view.add_customer = false

                        scope.post('/book/find-or-save',scope.view.customer).then((client_data)=>{
                        //    localStorage.setItem('appointment_customer',JSON.stringify(data))

                            scope.view.selected_customer = client_data
                            if (scope.appointments.length > 0){
                                scope.view.page = 'book'
                            } else {
                                scope.view.page = 'service'
                            }

                            scope.storeNewAppointment()
                        }).catch((err)=>{
                            scope.view.add_customer = true
                            scope.notify(err, 'error')
                        })


                    }


                } else {
                    scope.notify('Please enter a valid email address','error')
                }

            } else if (type == 'validate'){

                alert(data)

            } else if (type == 'remove'){

                if (!scope.visual_appointments || !scope.visual_appointments[data]){
                    return
                }

                scope.appointments = scope.appointments.filter((item,i)=>{
                    return scope.visual_appointments[data].linked.indexOf(i+'') === -1
                })

                if (scope.staff_availability && scope.staff_availability.appointments){

                    let av_idx = 0
                    for (var i in scope.staff_availability.appointments){
                        scope.staff_availability.appointments[i] = scope.staff_availability.appointments[i].filter((appt_item)=>{
                            return appt_item.appt_idx != parseInt(data)
                        })

                        if (scope.staff_availability.appointments[i].length == 0){
                            delete scope.staff_availability.appointments[i]
                        }

                        if (av_idx == Object.keys(scope.staff_availability.appointments).length-1){
                            scope.getTimeSlots()
                        }
                        av_idx++

                    }
                }

                scope.visual_appointments.splice(data,1)
                if (scope.new_appointment.start_time){
                    delete scope.new_appointment.start_time
                }

                if (scope.appointments.length == 0){
                    scope.view.ok_to_book = false
                }

                scope.storeNewAppointment()

            } else if (type == 'push'){

                scope.new_appointment.confirm_tc = false
                let tick = document.querySelector('#confirm-tc')
                if (tick){
                    tick.checked = false
                }

                if (!scope.appointments && !scope.new_appointment.staff_id){
                    scope.notify('Please select a stylist','error')
                    return
                }

                if (!scope.appointments && !scope.new_appointment.service){
                    scope.notify('Please select a service','error')
                    return
                }
                if (!scope.appointments && !scope.new_appointment.duration){
                    scope.notify('Service currently unavailable','error')
                    return
                }

                http('post','/api/customers/new_appointment', {date:moment().toISOString(),type: 'ready_to_book', data:''})

                let start_time = scope.new_appointment.start_time.split(':'),
                    date,
                    end_date,
                    visual_date,
                    visual_linked = [],
                    next_start_time

                for (var i in scope.new_appointment.service.service_items){

                    if (i == 0){

                        date = scope.selected_date.obj.set({hours:start_time[0],minutes:start_time[1]})
                        visual_date = date
                        end_date = moment(date).add(scope.new_appointment.service.service_items[i].duration,'minutes')

                    } else {

                        if (scope.new_appointment.service.service_items && scope.new_appointment.service.service_items[i-1] && scope.new_appointment.service.service_items[i-1].wait_time){
                            date = moment(end_date).add(scope.new_appointment.service.service_items[i-1].wait_time,'minutes')
                            end_date = moment(date).add(scope.new_appointment.service.service_items[i].duration,'minutes')
                        } else {
                            date = moment(end_date)
                            end_date = moment(date).add(scope.new_appointment.service.service_items[i].duration,'minutes')
                        }

                    }

                    let appointment = {
                            event_type: 'customer_appointment',
                            service_name:scope.new_appointment.service.service_items[i].name,
                            service_id:scope.new_appointment.service_id,
                            staff_id:scope.new_appointment.staff_id,
                            staff_name: scope.new_appointment.staff_name,
                            date: date.format('HH:mm'),
                            end_date:end_date.format('HH:mm')
                        }

                    if (scope.new_appointment.promotion && typeof scope.new_appointment.promotion == 'string'){
                        appointment.promotion = scope.new_appointment.promotion
                    }

                    if (scope.new_appointment.note){
                        appointment.note = scope.new_appointment.note
                    }

                    if (scope.new_appointment.skin_test){
                        appointment.skin_test = scope.new_appointment.skin_test
                    } else {
                        appointment.skin_test = false
                    }

                    if (scope.new_appointment.service.salon_confirmation){
                        appointment.salon_confirmation = scope.new_appointment.service.salon_confirmation
                    }

                    if (appointment.service_name){

                        scope.appointments.push(appointment)

                        if (i >= scope.new_appointment.service.service_items.length-1){

                            next_start_time = end_date

                            if (scope.new_appointment.service.service_items[i].wait_time){
                                next_start_time = next_start_time.add(scope.new_appointment.service.service_items[i].wait_time,'minutes')
                            }

                            scope.updateAvailability(visual_date.utc().toISOString(),appointment.staff_id,scope.new_appointment.service.duration,scope.appointments.length-1)

                            let visual_data = JSON.parse(JSON.stringify(scope.new_appointment.service))

                            visual_data.staff_name = scope.new_appointment.staff_name
                            delete visual_data.service_items

                            visual_data.price = scope.new_appointment.price
                            visual_data.duration = scope.new_appointment.service.duration
                            visual_data.date = visual_date.format('h:mma [on] dddd Do MMMM')
                            visual_data.linked = visual_linked

                            scope.visual_appointments.push(visual_data)
                            scope.visual_appointments.sort(function(a,b){
                                return b.date - a.date
                            })

                            scope.new_appointment = {
                                service_id:'',
                                start_time: next_start_time.format('HH:mm'),
                                duration:'',
                                note:'',
                                staff_id: scope.new_appointment.staff_id,
                                staff_name: scope.new_appointment.staff_name
                            }

                            break;

                        }

                    }

                }

                scope.view.search = ''
                scope.view.page = 'book'
                scope.view.ok_to_book = true

                console.log('app',scope.appointments)

            } else if (type == 'set_start'){

                scope.selectDate(data.time,'time')
                scope.new_appointment.start_time = data.time
                if (data.promotion){
                    scope.new_appointment.promotion = data.promotion
                }
                
                scope.newAppointment('push')

            } else if (type == 'set_duration'){

                scope.new_appointment.duration = data
                scope.view.select_duration = false

            } else if (type == 'add_stylist'){

                http('post','/api/customers/new_appointment', {date:moment().toISOString(),type: type, data:data.name.first+' '+data.name.last})

                scope.new_appointment.staff_id = data._key
                scope.new_appointment.staff_name = data.name.first+' '+data.name.last
                scope.new_appointment.staff_level = data.level
                scope.new_appointment.price = scope.getPrice(data.level)
                scope.view.select_stylist = false
               
                if (data.unavailable && data.unavailable === true || !data.ignore_salon_times && typeof scope.salon == 'object' && scope.salon.is_closed === true){

                    let payload = {
                        date: scope.selected_date.full,
                        staff_id: data._key
                    }

                    scope.post('staff/next_available',payload).then((available_dates)=>{
                   
                        scope.avail_hours = []
                        scope.available_dates = available_dates.map((item,i)=>{

                            if (scope.salon.opening_times[moment(item.date).format('d')] && scope.salon.opening_times[moment(item.date).format('d')].open == 'closed' && scope.salon.opening_times[moment(item.date).format('d')].close == 'closed'){

                            } else {
                                return item
                            }

                        })

                        if (scope.available_dates.length > 0){
                            scope.view.available_dates = true
                        }

                    })

                } else {
                    
                    scope.view.available_dates = false
                    scope.available_dates = []
                    
                    scope.getTimeSlots(data.opening_times)
                }

                document.getElementById('select_dates').scrollIntoView({
                    behavior: 'smooth'
                })

            } else if (type == 'add_service'){

                if (!scope.view.add_service){
                    http('post','/api/customers/new_appointment', {date:moment().toISOString(),type: type, data:data.name})
                    scope.view.add_service = true
                }

                scope.new_appointment.service_id = data._key
                scope.new_appointment.service = data
                scope.new_appointment.duration = 0

                for (var i in data.service_items){
                    if (data.service_items[i].duration){
                        scope.new_appointment.duration = scope.new_appointment.duration+parseInt(data.service_items[i].duration)
                        if (data.service_items[i].wait_time){
                            scope.new_appointment.duration = scope.new_appointment.duration+parseInt(data.service_items[i].wait_time)
                        }
                    }
                }

                scope.view.search = data.name
                scope.view.search_results = false
                scope.view.salon_confirmation = false

                if (data.salon_confirmation == 'true'){
                    scope.view.salon_confirmation = true
                }

                if (scope.appointments.length > 0){

                    scope.view.page = 'book'
                    scope.newAppointment('push')
                    return false

                }

                if (data.skin_test == "true"){

                    if (scope.view.selected_customer.skin_test){
                        let diff = moment().diff(moment(scope.view.selected_customer.skin_test),'months')
                        if (diff >= 0 && diff <= 6){
                            scope.view.skin_test_required = 'false'
                        } else {
                            scope.view.skin_test_required = 'true'
                        }
                    } else {
                        scope.view.skin_test_required = 'true'
                    }
                    scope.view.page = 'customer_note'

                } else {
                    scope.view.page = 'date'
                }

                if (scope.staff){

                    scope.filteredStaff = scope.staff.map((stylist,i)=>{

                        for (var ii in stylist.skills){
                            if (scope.new_appointment.service.skills.indexOf(stylist.skills[ii]) >=0){
                                return stylist
                            }
                        }

                    })

                }


            } else if (type == 'save'){

                scope.notify('cancel')

                if (!scope.view.complete){
                    http('post','/api/customers/new_appointment', {complete:true})
                    scope.view.complete = true
                }

                if (scope.new_appointment.note && scope.appointments[0].note){
                    scope.appointments[0].note = scope.appointments[0].note+'\nAdditional: '+scope.new_appointment.note
                } else {
                    scope.appointments[0].note = scope.new_appointment.note
                }

                scope.appointments = scope.appointments.map((appt)=>{
                    appt.termsandconditions_accepted = moment().toISOString()
                    return appt
                })

                var payload = {
                    appointments: scope.appointments,
                    customer_id: scope.view.selected_customer._key,
                    paid: false,
                    source: 'Booked online',
                    selected_date: scope.selected_date.full
                }

            //    console.log(payload)

                http('post','/api/appointments',payload)
                    .then((data)=>{
                        data = JSON.parse(data)

                        let salon_confirmation = ''
                        if (scope.view.salon_confirmation === true){
                            salon_confirmation = '-confirmation'
                            if (scope.view.brand){
                                window.location.href = "/book/"+scope.view.brand+"/thank-you"+salon_confirmation
                            } else {
                                window.location.href = "/book/thank-you"+salon_confirmation
                            }
                        } else {
                            window.location.href = '/checkout/stripe/appointment-deposit?appointment_id='+data.appointments[0].confirm_id+'&&client_id='+data.customer_id
                        }

                    }).catch((data)=>{

                        scope.notify(data,'error')
                    })

            }

        }

        scope.updateAvailability = function(date, staff_id, duration, appt_idx){

            date = moment(date).utc()

            if (!scope.staff_availability){
                scope.staff_availability = {}
            }
            if (!scope.staff_availability.appointments){
                scope.staff_availability.appointments = {}
            }

            let slots = duration/15,
                time

            for (var i=1; i <= slots;i++){

                time = date.format('HH:mm'),
                slots_i = slots-i

                if (!scope.staff_availability.appointments[time]){
                    scope.staff_availability.appointments[time] = []
                }
        //        scope.staff_availability.appointments[time].push({staff_id:'all',slots:slots_i,appt_idx:appt_idx}) // blocks out all staff for this time
                scope.staff_availability.appointments[time].push({staff_id:staff_id,slots:slots_i,appt_idx:appt_idx}) // blocks out the staff member for this time

                date = date.add(15,'minutes')

                if (i == slots){
                    scope.getTimeSlots()
                //    console.log(scope.staff_availability.appointments)
                }

            }

        }

        scope.storeNewAppointment = function(reset){


            if (reset == 'cancel'){

                localStorage.removeItem('appointment_time')
                localStorage.removeItem('appointment_staff_id')
                localStorage.removeItem('appointment_customer')
                localStorage.removeItem('appointment_payload')
                location.reload()

            } else if (reset == 'remove_customer'){

                localStorage.removeItem('appointment_customer','')
                localStorage.removeItem('appointment_payload','')
                scope.view.selected_customer = {}
                // window.location.href = '/dashboard/calendar/new-appointment'

            } else if (reset){

                localStorage.removeItem('appointment_time')
                localStorage.removeItem('appointment_staff_id')
                localStorage.removeItem('appointment_customer')
                localStorage.removeItem('appointment_payload')

            } else if (scope.view.selected_customer && scope.view.selected_customer._key) {

                var payload = {
                    appointments: scope.appointments,
                    customer_id: scope.view.selected_customer._key,
                    paid: false,
                    source: 'Booked in salon',
                    date: scope.view.appointment_date,
                    customer: scope.view.selected_customer
                }

                localStorage.setItem('appointment_payload',JSON.stringify(payload))
            }

        }

        scope.getPrice = function(level){

            if (scope.new_appointment.service && scope.new_appointment.service.prices && scope.new_appointment.service.prices.length > 0){
                return parseFloat(scope.new_appointment.service.prices[level].value).toFixed(2)
            }

        }

        scope.searchApi = function(collection, str, prefix){

            clearTimeout(scope.view.typing)
            scope.view.typing = setTimeout(function(){

                let url = '/api/'+collection+'/search?str='+str.toLowerCase()

                http(url)
                    .then((data) => {
                        scope[collection] = JSON.parse(data)

                        if (prefix){
                            scope.view[prefix+'_search_results'] = true
                        } else {
                            scope.view.search_results = true
                        }

                        // console.log(scope[collection])
                    }).catch((err) => {
                        scope.notify(err, 'error')
                    })

            },500)

        }

        scope.goto = function(path_start, path_end){
            window.location.href = path_start+path_end
        }

        scope.avail_hours = []


        scope.selectDate = function(date, time, clear){

            scope.view.available_dates = false
            scope.avail_hours = []

            if (clear && scope.new_appointment){
                delete scope.new_appointment.staff_id
                delete scope.new_appointment.staff_name
                delete scope.new_appointment.staff_level
                delete scope.new_appointment.price
                scope.view.select_stylist = true
            }

            let type = 'select_date'

            scope.notify('cancel')

            if (time == 'time'){

                type = 'select_time'

                if (!scope.view.setTime){
                    http('post','/api/customers/new_appointment', {date:moment().toISOString(),type: type, data:date})
                    scope.view.setTime = true
                }
                date = moment(scope.selected_date.full).utc()
                time = time.split(':')
                date.set({hours:time[0],minutes:time[1],seconds:'0'})

            } else {

                date = moment(date).utc()
                let minutes = Math.ceil(date.get('minute') / 15) * 15
                let hours = date.get('hour')
                if (minutes == 60){
                    hours++
                }
                date.set({
                    hours: hours,
                    minutes: minutes,
                    seconds: 0
                });

                if (time != 'init'){
                    if (!scope.view.setTime){
                        http('post','/api/customers/new_appointment', {date:moment().toISOString(),type: type, data:date})
                        scope.view.setTime = true
                    }
                }

            }

            scope.selected_date = {
                months: ['January','Febuary','March','April','May','June','July','August','September','October','November','December'],
                months_short: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
                dates:['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th','13th','14th','15th','16th','17th','18th','19th','20th','21st','22nd','23rd','24th','25th','26th','27th','28th','29th','30th','31st'],
                days: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
                days_short: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
                obj: date,
                full: date.toISOString(),
                year: date.format('YYYY'),
                year_short: date.format('YY'),
                month: date.format('M'),
                date: date.format('D'),
                month_padded:date.format('MM'),
                date_padded: date.format('DD'),
                date_string: date.format('YYYY-MM-DD'),
                date_string_short: date.format('ddd Do MMM'),
                date_string_long: date.format('dddd Do MMMM'),
                date_string_time: date.format('dddd Do MMMM HH:mm'),
                time: date.format('HH:mm'),
                day: date.format('dddd'),
                day_short: date.format('ddd'),
                ordinal: date.format('Do'),
                month_name: date.format('MMMM'),
                month_name_year: date.format("MMMM 'YY"),
                month_name_short: date.format('MMM'),
            }

        //    console.log(scope.selected_date)

            if (date_path){
                scope.selected_date.today = 'bg-33-light-grey'
            } else {
                scope.selected_date.today = ''
            }


            scope.post('salon/month_opening_times',{date:scope.selected_date.full}).then((salon_data) => {

                if (!scope.salon){
                    scope.salon = {}
                }
                scope.salon.monthly_opening_times = salon_data
                scope.dates = getDaysArray(scope.selected_date.year,scope.selected_date.month)
                scope.dates_short = getDaysArray(scope.selected_date.year,scope.selected_date.month,'short')

            })


            let arango_date = scope.selected_date.year+'-'+scope.selected_date.month+'-'+scope.selected_date.date,
                date_chk = date,
                day_num = date.format('d'),
                now = moment()

        //    date = scope.selected_date.year+'-'+scope.selected_date.month_padded+'-'+pad(date.date)
            if (typeof scope.salon == 'object'){
                scope.salon.is_closed = false
            }

            if (time != 'init'){
                if (date_chk.isBefore(now,'day')){

                    scope.notify('Please select a future date for your appointment', 'error')
                    return false

                // } else if (scope.salon && scope.salon.opening_times && scope.salon.opening_times[day_num] && scope.salon.opening_times[day_num].open.match(/closed|undefined/) ||
                //             scope.salon && scope.salon.opening_times && scope.salon.opening_times[day_num] && !scope.salon.opening_times[day_num].open){
                //     scope.salon.is_closed = true
                // //    scope.notify("The salon is normally closed on "+scope.selected_date.days[day_num]+"'s, select a stylist to see availability", 'error')
                //     // return false
                //
                // } else if (scope.salon && scope.salon.opening_times && scope.salon.opening_times[day_num] && parseInt(scope.salon.opening_times[day_num].close.split(":")) < 14){

                //    scope.notify('Appointments may be limited on a '+scope.selected_date.days[day_num]+'. Please check the available times below', 'error')

                }

                if (scope.new_appointment.skin_test_required === true && date_chk.diff(now,'days') < 7){
                    scope.notify('As you require a skin test, please leave at least 7 days for the results', 'error')
                    return false
                }

            //    scope.view.booking[scope.view.datepicker_simple] = new Date(date).toISOString()
                scope.view.appointment_date = date.toISOString()
                scope.view.appointment_date_parse = moment(scope.view.appointment_date).format('dddd Do MMMM')

                scope.storeNewAppointment()

                if (!time || typeof time == 'string' && !time.match(/:/)){

                    scope.get('staff','all').then((staff_data)=>{

                        scope.staff = staff_data

                        scope.get('appointments',scope.view.appointment_date+'/staff_availability','staff_availability').then((avail_data)=>{

                            scope.salon.opening_times = avail_data.opening_times

                            if (!scope.salon.opening_times.open && !scope.salon.opening_times.close){

                                scope.filteredStaff = []
                                scope.notify("Unfortunately there's no availability on that day", "error","10","close")

                            } else {

                                scope.filteredStaff = scope.staff.filter((item,i)=>{

                                    item.ignore_salon_times = false
                                    item.unavailable = true
                                    item.skilled = true

                                    if (scope.new_appointment.service && scope.new_appointment.service.skills){

                                        item.skilled = false
                                        for (var ii in item.skills){
                                            if (scope.new_appointment.service.skills.indexOf(item.skills[ii]) >= 0){
                                                item.skilled = true
                                            }
                                        }

                                    }

                                    if (avail_data.staff && avail_data.staff[item._key] && avail_data.staff[item._key].targets && avail_data.staff[item._key].targets.length > 0){
                                        item.ignore_salon_times = true
                                        item.unavailable = false
                                    }

                                    if (avail_data.staff[item._key]){ // if the stylist is available on the selected day

                                        item.unavailable = false
                                        item.opening_times = {open: avail_data.staff[item._key].open, close: avail_data.staff[item._key].close}

                                    }

                                    if (item.skilled === true && item.unavailable === false){
                                        return true
                                    }


                                })

                                if (scope.new_appointment && scope.new_appointment.staff_id){
                                    scope.getTimeSlots()
                                }

                                scope.view.page = 'staff'

                            }



                        })
                    })

                }

            }

        }

        scope.selectUser = function(staff){

            let staff_items = document.getElementsByClassName('list-item')
            if (staff_items){
                for (var i in staff_items){
                    if (staff_items[i].classList){
                        staff_items[i].classList.remove('border-purple')
                    }

                }
            }

            let selected_item = document.getElementById('staff_'+staff._key)
            if (selected_item){
                selected_item.classList.add('border-purple')
            }

            scope.view.email = staff.email
            document.getElementById('login').classList.remove('transparent')
            document.getElementById('pin').focus()

        }

        scope.selectStaff = function(key){
            scope.view.selected_staff = key
            scope.view.booking.staff_id = key
        }

        scope.addToCart = function(desc, val, type, key){
            scope.cart.items.push({description:desc, val:val, type:type, _key:key})
            scope.cart.sub_total = (parseFloat(scope.cart.sub_total))+parseFloat(val)
            scope.cart.tax = scope.cart.sub_total*0.2
            scope.cart.total = scope.cart.sub_total + scope.cart.tax
        }

        scope.serviceFilter = function(filter){

            if (scope.services){

                scope.view.serviceFilter = filter
                scope.filteredServices = scope.services.filter(function(item,i){
                    return item.category == filter && item.public == 'true'
                })

                let cat_tabs = document.querySelectorAll('a.categories')

                if (cat_tabs){
                    for (var i=0;i<cat_tabs.length;i++){

                        if (cat_tabs[i].classList){
                            cat_tabs[i].classList.remove('active')
                        }
                        if (i == filter){
                            cat_tabs[i].classList.add('active')
                        }
                    }
                }

            }

        }

        scope.bookInit = function(key){

            scope.get('services','all').then(()=>{
                scope.get('salon','54855602').then((salon_data)=>{

                    scope.selectDate(moment().toISOString(), 'init')

                    let init_cat = scope.salon.categories.find((cat)=>{
                        return !cat.name.match(/colour/i)
                    })

                    setTimeout(function(){
                        scope.serviceFilter(init_cat._id)
                    },500)

                })
            })

        }

        scope.memberServices = function(key){

            scope.get('services2','all').then(()=>{
                scope.get('salon','54855602').then((salon_data)=>{

                    scope.selectDate(moment().toISOString(), 'init')

                    let init_cat = scope.salon.categories.find((cat)=>{
                        return !cat.name.match(/colour/i)
                    })

                    setTimeout(function(){
                        scope.serviceFilter(init_cat._id)
                    },500)

                })
            })

        }

        scope.get = function(collection, id, output){
            return new Promise(function(resolve, reject){

                let url = '/api/'+collection

                if (id){
                    url += '/'+id
                }

                if (id && id.match(/keys\=/) && scope.selected_date && scope.selected_date.date_string){
                    url += '&&date='+scope.selected_date.date_string
                }

                http('get',url)
                    .then((data) => {

                        data = JSON.parse(data)

                        if (output){
                            scope[output] = data
                        } else {
                            scope[collection] = data
                        }

                        resolve(data)

                    }).catch((err) => {
                        reject(err)
                        scope.notify(err, 'error')
                    })
            })

        }

        scope.post = function(collection, obj){

            return new Promise(function(resolve, reject) {

                let url
                if (collection.match(/^\//)){
                    url = collection
                } else {
                    url = '/api/'+collection
                }

                if (obj.avatar && typeof obj.avatar != 'undefined' && obj.avatar.match(/^data:image\/(png|jpg|jpeg);base64,/)){
                    obj.avatar = document.querySelector('#fileDisplayArea img').getAttribute('src')
                }

                http('post',url,obj)
                    .then((data) => {
                        data = JSON.parse(data)

                        if (collection.match(/customers/)){
                            scope.view.selected_customer = data
                        //    console.log(scope.view.selected_customer)
                        }

                        resolve(data)

                    }).catch((err) => {
                        console.log(err)
                        reject(err)
                    })

            })


        }

        scope.put = function(collection, id, obj){

            let url = '/api/'+collection+'/'+id

            http('put',url,obj)
                .then((data) => {

                    data = JSON.parse(data)

                    if (collection == 'appointments'){

                        let appointment_el = document.getElementById('appointment-'+data[0]._key)

                        if (appointment_el){
                            appointment_el.setAttribute('data-start', data[0].staff_id+'-'+data[0].start_time)
                            appointment_el.setAttribute('data-end', data[0].staff_id+'-'+data[0].end_time)
                            scope.view.reschedule = false
                            scope.view.reschedule_key = ''
                            setLayer('day',1)
                            positionAppointments()
                        } else {
                            location.reload()
                        }

                    }

                    scope.resetNew()

                }).catch((err) => {
                    console.log(err)
                })

        }

        scope.notify = function(msg, type, duration, icon){

            return new Promise(function(resolve, reject){

                if (msg == 'cancel'){
                    scope.view.notification = {}
                    return false
                }

                if (typeof duration == 'undefined'){
                    duration = 5000
                } else {
                    duration = parseInt(duration)*1000
                }

                scope.view.notification.msg = msg

                if (type){
                    scope.view.notification.type = type
                } else {
                    scope.view.notification.type = 'notification'
                }

                if (icon){
                    scope.view.notification.icon = icon
                } else {
                    scope.view.notification.icon = 'fa-check'
                }

                if (duration > 0){
                    setTimeout(function(){
                        scope.view.notification = {}
                        resolve()
                    },duration)
                }

            })

        }

        scope.count = function(obj){
            return obj.length
        }

        scope.parseDate = function(type){

            if (type == 'short'){
                return scope.selected_date.day_short+' '+scope.selected_date.ordinal+' '+scope.selected_date.month_name_short
            } else if (type == 'month_long'){
                return scope.selected_date.month_name
            }

        }

        scope.parseName = function(name_obj){
            if (typeof name_obj == 'object'){
                return name_obj.first+' '+name_obj.last
            } else {
                return ''
            }
        }

        scope.parsePromo = function(promo){
            if (typeof promo == 'string' && promo.match(/\d/)){
                return promo+' Promotional Offer'
            } else {
                return ''
            }
        }

        scope.parsePrice = function(price){
            if (!isNaN(parseFloat(price))){
                return '£'+parseFloat(price).toFixed(2)
            } else {
                return '£0.00'
            }
        }

        scope.parseService = function(name_obj){
            if (name_obj && name_obj.name){
                return name_obj.name+' - £'+parseFloat(name_obj.price).toFixed(2)
            }
        }

        scope.parseISODate = function(date, type){

            if (date.match(/Z$/)){

                date = moment(date).utc()

                if (type == 'get_day'){
                    return date.format('ddd')
                } else if (type == 'get_date'){
                    return date.format('D')
                } else if (type == 'time'){
                    return date.format('HH:mm')
                } else if (type == 'long_day'){
                    return date.format('dddd Do MMMM')
                } else if (type == 'date_time'){
                    return date.format('Do MMM YYYY HH:mm')
                } else if (type){
                    return date.format(type)
                } else {
                    return date.format('Do MMM YYYY')
                }

            } else {
                return date
            }

        }

        scope.resetCustomer = function(){
            scope.view.selected_customer = ''
        }

        scope.toggleContext = function(id){

            let el = document.getElementById('context-'+id)

            if (el.style.display != 'none'){
                el.style.display = 'none'
            } else {
                contextCloseAll()
            }

            if (scope.view.context == id){
                scope.view.context = ''
                el.style.display = 'none'
                el.classList.remove('in-view')
            } else {
                scope.view.context = id
                el.style.display = 'block'
                el.classList.add('in-view')
            }

            if (document.getElementById('cell-'+id)){
                let cells = document.getElementsByClassName('cell')
                for (let i = 0; i < cells.length; i++){
                    cells[i].style.zIndex = 1;
                }
                document.getElementById('cell-'+id).style.zIndex = 99
            }

        }

        scope.chgMonth = function(type){

            if (type == 'next'){
                scope.selected_date.month = parseInt(scope.selected_date.month)+1
            } else {
                scope.selected_date.month = parseInt(scope.selected_date.month)-1
            }

            scope.selected_date.month_padded = pad(scope.selected_date.month)

            if (scope.selected_date.month < 1){
                scope.selected_date.month = 12
                scope.selected_date.year--
                scope.selected_date.year_short--
            }

            if (scope.selected_date.month > 12){
                scope.selected_date.month = 1
                scope.selected_date.year++
                scope.selected_date.year_short++
            }

            scope.selected_date.month_name = scope.selected_date.months[scope.selected_date.month-1]
            scope.selected_date.month_name_year = scope.selected_date.months[scope.selected_date.month-1]+" '"+scope.selected_date.year_short
            scope.selected_date.month_name_short = scope.selected_date.months_short[scope.selected_date.month-1]

            let month_chk = moment().set({year:scope.selected_date.year, month:scope.selected_date.month-1, date:1}).toISOString()
            scope.post('salon/month_opening_times',{date:month_chk}).then((salon_data) => {

                if (!scope.salon){
                    scope.salon = {}
                }
                scope.salon.monthly_opening_times = salon_data
                scope.dates = getDaysArray(scope.selected_date.year,scope.selected_date.month)

            })

        }

        scope.chgDay = function(type){

            if (type == 'next'){
                scope.selected_date.date = scope.selected_date.date+1
            } else {
                scope.selected_date.date = scope.selected_date.date-1
            }

        //    window.location.href = "/dashboard/calendar/"+scope.selected_date.year+"/"+scope.selected_date.month+"/"+scope.selected_date.date

        }

        scope.chgWeek = function(num){

            num = num*7
            let date = moment(scope.selected_date.full).add(num, 'days').format('YYYY/M/D')

            window.location.href = "/dashboard/calendar/"+date

        }

        scope.getTimeSlots = function(opening_times){

            let day_num = moment(scope.view.appointment_date).day(),
                // start_time = scope.salon.opening_times[day_num].open,
                // end_time = scope.salon.opening_times[day_num].close
                start_time = scope.salon.opening_times.open,
                end_time = scope.salon.opening_times.close,
                is_today = false

            if (opening_times){
                start_time = opening_times.open
                end_time = opening_times.close
            }

            if (scope.new_appointment.start_time){
                start_time = scope.new_appointment.start_time
            }

            if (scope.selected_date.obj.isSame(moment(),'day')){
                start_time = moment().add(7, 'minutes') // add 7 minutes to help with the rounding to the nearest 15min slot

                let mins = start_time.format('mm'),
                    hrs = start_time.format('HH')

                if (mins >= 53){
                    hrs++
                }

                mins = (Math.round(mins/15) * 15) % 60

                if (mins < 10){
                    mins = '0'+mins
                }

                start_time = hrs+':'+mins
                is_today = true

            }

            if (scope.selected_date.obj.diff(moment(),'day') < 2){
                is_today = true
            }

            scope.avail_hours = scope.getHrs(start_time, end_time, is_today)

        }

        scope.getHrs = function(open, close, is_today){

            if (!targets){
                targets = scope.staff_availability.targets
            }

            if (scope.staff_availability.staff && scope.staff_availability.staff[scope.new_appointment.staff_id] && scope.staff_availability.staff[scope.new_appointment.staff_id].targets){
                targets = scope.staff_availability.staff[scope.new_appointment.staff_id].targets
            }

            // if (targets.length > 0 && targets[0] && targets[0] < open){
            //     open = targets[0]
            // }
            //
            // if (targets.length > 0 && targets[2] && targets[2] > close){
            //     close = targets[2]
            // }

            if (targets[2] && parseInt(targets[2].replace(':','')) < parseInt(open.replace(':',''))){
                targets = [open, open, open]
            }

            var hrs = scope.getHrsArray(open, close),
                booked = -1,
                appt_slots = 0,
                any_appts = false,
                targets = targets,
                appt_data = false

            if (scope.new_appointment.start_time){
                targets.push(scope.new_appointment.start_time)
            }

            if (scope.new_appointment.duration){
                appt_slots = scope.new_appointment.duration/15
            }

            if (hrs && hrs.length > 0){
                hrs.reverse()
            } else {
                hrs = []
            }

            hrs = hrs.map(function(item,i){

                any_appts = false

                if (scope.staff_availability && scope.staff_availability.appointments && scope.staff_availability.appointments[item.time]){ // if this slot has an appointment

                    appt_data = scope.staff_availability.appointments[item.time].filter(function(appt_item, i){

                        if (scope.new_appointment.staff_id && appt_item.staff_id == scope.new_appointment.staff_id || appt_item.staff_id == 'all'){ // if there's a stylist selected
                            return appt_item
                        }

                    })

                    if (appt_data && appt_data[0]){ // if the selected stylist has an appointment at this time

                        item.available = false
                        any_appts = true
                        booked = 0

                    } else if (scope.staff_availability.appointments[item.time].length == scope.staff.length){ // all staff are booked out

                        booked = 0

                    } else { // else add up the amout of slots until the next appointment

                        booked = booked+1

                    }

                } else {

                    booked = booked+1

                }

                if (booked > 0 && any_appts === false){ // if this slot doesn't have an appt and the stylist doesn't have any appts
// console.log(targets, item.time)
                    if (targets.indexOf(item.time) >= 0){

                        item.available = true
                        item.target = true

                    }

                }

                item.booked = booked

                return item

            })

            hrs.reverse()

            hrs = hrs.map(function(item,i){ // find previous slot and add in promotions

                if (is_today === true){ // if it's today, don't group

                    if (item.booked >= appt_slots){
                        item.available = true
                    }
                    
                } else {

                    if (hrs[i+appt_slots] && !hrs[i+appt_slots].target && hrs[i+appt_slots].available == false && item.booked >= appt_slots){ // get previous available slots
                        item.available = true
                        console.log(1, item, appt_slots)
                    }

                    if (hrs[i-1] && !hrs[i-1].target && hrs[i-1].available == false && item.booked >= appt_slots){ // get next available slots
                        item.available = true
                        console.log(2, item, appt_slots)
                    }

                    if (item.available !== false && item.booked >= appt_slots && scope.staff_availability && scope.staff_availability.staff && scope.staff_availability.staff[scope.new_appointment.staff_id] && scope.staff_availability.staff[scope.new_appointment.staff_id].promotions && scope.staff_availability.staff[scope.new_appointment.staff_id].promotions[item.time]){
                        item.promotion = scope.staff_availability.staff[scope.new_appointment.staff_id].promotions[item.time]
                        item.available = true
                        console.log(3, item, appt_slots)
                    }

                    if (item.available === true && item.booked < appt_slots){
                        item.available = false
                    }

                }

                return item

            })

            return hrs.filter(function(item){
                if (item.available === true){
                    return true
                }
            })

        }

        scope.getHrsArray = function(open, close) {

            if (!close){
                return []
            }

            if (open == 'closed'){
                return ['Closed']
            } else {
                open_hr = open.split(':')[0]
                open_min = open.split(':')[1]
                close_hr = close.split(':')[0]
                close_min = close.split(':')[1]

                open_hr = parseInt(open_hr)
                open_min = parseInt(open_min)
                close_hr = parseInt(close_hr)
                close_min = parseInt(close_min)
            }

            let hrs = [], time, start_min, booked = false, slots

            for (i=open_hr; i<=close_hr; i++) {

                time = ''
                booked = false

                if (i == open_hr){
                    start_min = open_min
                } else {
                    start_min = 0
                }

                for (ii=start_min; ii<=45; ii += 15) {

                    if (i < 10){
                        time = '0'+i+':'
                    } else {
                        time = i+':'
                    }

                    if (i <= 12){
                        time_12 = i+':'
                    } else {
                        time_12 = (i-12)+':'
                    }

                    if (ii < 10){
                        time = time+'0'+ii
                        time_12 = time_12+'0'+ii
                    } else {
                        time = time+ii
                        time_12 = time_12+ii
                    }

                    if (i <= 12){
                        time_12 += 'am'
                    } else {
                        time_12 += 'pm'
                    }

                    hrs.push({time:time, time_12:time_12})

                    if (i>=close_hr){

                        if (ii>=close_min || close_min > 45 && ii == 45){
                            return hrs
                        }

                    }

                }

            }

        }

        scope.getDurationHrs = function() {

            let duration_hrs = [], time

            for(i=0; i<9; i++) {

                time = ''

                for (ii=0; ii<=45; ii += 15) {

                    time = i+'hr '

                    if (ii < 10){
                        time = time+'0'+ii
                    } else {
                        time = time+ii
                    }

                    if (i == 0 && ii == 0){

                    } else {
                        duration_hrs.push(time)
                    }

                    if (ii==45 && i == 8){
                        return duration_hrs
                    }

                }


            }

        }

        scope.getMins = function() {

            let mins = []

            for (i=0; i<=45; i += 15) {

                if (i < 10){
                    mins.push('0'+i)
                } else {
                    mins.push(i)
                }

                if (i==45){
                    return mins
                }

            }

        }

        scope.match = function(obj, input){
            let re = RegExp(input)
            if (obj.match(re)){
                return true
            } else {
                return false
            }
        }
        //
        // if (localStorage.getItem('appointment_payload')){
        //
        //     var payload = JSON.parse(localStorage.getItem('appointment_payload'))
        //
        //     if (!payload.date || !payload.customer || !payload.customer.name || !payload.customer.name.first){
        //         localStorage.removeItem('appointment_payload')
        //     } else {
        //
        //         scope.appointments = payload.appointments
        //         scope.view.selected_customer = payload.customer
        //         scope.view.customer = payload.customer
        //         scope.view.appointment_date = payload.date
        //
        //         scope.view.customer.name = scope.view.customer.name.first+' '+scope.view.customer.name.last
        //         if (scope.view.customer.email == 'false'){
        //             scope.view.customer.email = ''
        //         }
        //
        //         if (scope.appointments.length>0){
        //             scope.view.booking = true
        //             scope.view.ok_to_book = true
        //         }
        //         if (pathname[2] == 'thank-you'){
        //             scope.storeNewAppointment('reset')
        //         }
        //     }
        //
        // }




    }
