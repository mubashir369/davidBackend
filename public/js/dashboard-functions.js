
    var file_input = document.getElementById('fileInput'),
        file_display = document.querySelector('#fileDisplayArea img'),
        calendar_element = document.querySelector('#calendar .slots'),
        slot_height = document.querySelector('.slot'),
        open_div = document.querySelector('#open'),
        close_div = document.querySelector('#close'),
        dashboard = document.getElementById('dashboard'),
        parentPos

    if (slot_height){
        slot_height = 20
    }

    if (calendar_element){
        parentPos = calendar_element.getBoundingClientRect()
    }

    if (open_div && close_div){

        var open_time = open_div.getAttribute('data-time','HHmm').split(':'),
            close_time = close_div.getAttribute('data-time','HHmm').split(':'),
            open_time_diff = moment().set({hours:8,minutes:0,seconds:0}),
            close_time_diff = moment().set({hours:23,minutes:0,seconds:0}),
            open_time_slots,
            close_time_slots

        open_time = moment().set({hours:open_time[0],minutes:open_time[1],seconds:0})
        close_time = moment().set({hours:close_time[0],minutes:close_time[1],seconds:0})


    }

    if (file_input){

        file_input.addEventListener('change', function(e) {
            var file = fileInput.files[0];
            var imageType = /image.*/;

            if (file.type.match(imageType)) {
                var reader = new FileReader();

                reader.onload = function(e) {
                    file_display.innerHTML = "";

                    var img = new Image();
                    img.src = reader.result;

                    file_display.setAttribute('src',img.src);

                    if (scope.new && scope.new.price){
                        scope.new.image = img.src
                    } else {
                        scope.new.avatar = img.src
                    }

                }

                reader.readAsDataURL(file);
            } else {
                file_display.innerHTML = "File not supported!"
            }
        });

    }



    function pad(n){return n<10 ? '0'+n : n}

    function getOrdinal(n) {
        return n + (n > 0 ? ['th', 'st', 'nd', 'rd'][(n > 3 && n < 21) || n % 10 > 3 ? 0 : n % 10] : '');
    }

    function setLayer(className, idx){

        var els = document.getElementsByClassName(className)
        for (var i in els){
            if (els[i] && els[i].style){
                els[i].style.zIndex = idx
            }
        }

    }

    function getPreviousSlot(end_time) {

        if (end_time){

            end_time = parseInt(end_time.replace(/\:/,''))
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
        }

    }

    var positionTimeline = function(){

        let timeline = document.getElementById('timeline')
        if (calendar_element){
            parentPos = calendar_element.getBoundingClientRect()
        }

        if (timeline){

            let curr_min = moment().format('mm'),
                curr_hour = moment().format('HH')

            if (curr_min >= 0 && curr_min < 15){
                curr_min = "00"
            } else if (curr_min >= 15 && curr_min < 30){
                curr_min = 15
            } else if (curr_min >= 30 && curr_min < 45){
                curr_min = 30
            } else if (curr_min >= 45){
                curr_min = 45
            }

            let slot = document.getElementById("slot-"+curr_hour+""+curr_min)

            if (!slot){
                return false
            }
            let timelineTop = slot.offsetTop,
                slots = document.getElementsByClassName('now'),
                minuteAdjust = 0 //(moment().format('m')/60)*slot_height

            slot.appendChild(timeline)

            timeline.style.top = '0'
            timeline.style.marginTop = '11px'
            timeline.style.width = (parentPos.width-8)+'px'
            timeline.style.display = 'block'

        } else if (scope.selected_date){

            let curr_min = moment().format('mm'),
                curr_hour = moment().format('HH')

            if (curr_min >= 0 && curr_min < 15){
                curr_min = 0
            } else if (curr_min >= 15 && curr_min < 30){
                curr_min = 15
            } else if (curr_min >= 30 && curr_min < 45){
                curr_min = 30
            } else if (curr_min >= 45){
                curr_min = 45
            }
            scope.selected_date.current_slot = moment().format(curr_hour+':'+curr_min)
        }

    }

    var positionOpenClose = function(){

        // if (open_time && close_time && slot_height){
        //
        // open_time_slots = open_time.diff(open_time_diff,'minutes') / 15
        // close_time_slots = close_time_diff.diff(close_time,'minutes') / 15
        // open_time_slots = open_time_slots*slot_height
        // close_time_slots = close_time_slots*slot_height
        //
        //
        //
        //     open_div.style.height = open_time_slots+'px'
        //     open_div.style.width = (parentPos.width-8)+'px'
        //     open_div.style.display = 'block'
        //     close_div.style.height = close_time_slots+'px'
        //     close_div.style.width = (parentPos.width-8)+'px'
        //     close_div.style.display = 'block'
        //
        // }

    }

    var positionAppointments = function(){

        var appointments = document.getElementsByClassName('appointment')
        if (calendar_element){
            parentPos = calendar_element.getBoundingClientRect()
        }

        if (!parentPos){
            return
        }

        if (appointments){

            for (var i=0;i<appointments.length;i++){

                if (i>=0){

                    let start = appointments[i].getAttribute('data-start'),
                        end = appointments[i].getAttribute('data-end'),
                        slot_start = document.getElementById(start),
                        slot_end = document.getElementById(end)

                    if (!slot_start || !slot_end){
                        continue;
                    }

                    let startPos = slot_start.getBoundingClientRect(),
                        endPos = slot_end.getBoundingClientRect(),
                        is_memo = appointments[i].querySelector('.appointment-details').classList.contains('memo'),
                        is_staff_appt = appointments[i].querySelector('.appointment-details').classList.contains('staff'),
                        relativePos = {}

                    relativePos.top = startPos.top - parentPos.top
                    relativePos.left = Math.round(startPos.left) - parentPos.left
                    relativePos.bottom = endPos.bottom - startPos.top
                    relativePos.width = startPos.width

                    // if (is_memo){
                    //     appointments[i].style.top = relativePos.top+'px'
                    //     appointments[i].style.left = Math.round(relativePos.left + relativePos.width)-25+'px'
                    //     appointments[i].style.height = relativePos.bottom+1+'px'
                    //     appointments[i].style.width = '25px'
                    // } else {
                        appointments[i].style.top = relativePos.top+'px'
                        appointments[i].style.left = Math.round(relativePos.left)-2+'px'
                        appointments[i].style.height = relativePos.bottom+1+'px'
                        appointments[i].style.width = relativePos.width+4+'px'
                    // }

                    if (!appointments[i].classList.contains('deleted')){
                        appointments[i].style.display = 'block'
                    }

                    if (i >= appointments.length-2){
                        checkOverlaps()
                    }


                }

            }

        }

    }

    var checkOverlaps = function(){

        var appointments = document.getElementsByClassName('appointment')

        if (appointments){

            for (var i in appointments){

                if (typeof appointments[i] == 'object'){

                    appointments[i].classList.add('co-done')
                    var appt_1 = appointments[i].getBoundingClientRect(),
                        is_memo = false

                    if (appointments[i].classList.contains('memo') || appointments[i].classList.contains('target_bookings')){
                        is_memo = true
                    }

                    for (var ii in appointments){

                        if (!is_memo && typeof appointments[ii] == 'object' && i != ii && !appointments[ii].classList.contains('co-done') && !appointments[ii].classList.contains('staff_appointment') && !appointments[i].classList.contains('staff_appointment')){

                            var appt_2 = appointments[ii].getBoundingClientRect()
                            var overlap = !(appt_1.right < appt_2.left ||
                                    appt_1.left > appt_2.right ||
                                    appt_1.bottom-1 < appt_2.top+1 ||
                                    appt_1.top+1 > appt_2.bottom-1)

                            if (overlap){

                                let el = appointments[i].getBoundingClientRect()
                                if (!appointments[i].dataset.adjusted){
                                    appointments[i].style.width = (appt_2.width/2)+'px'
                                    appointments[i].style.marginLeft = (el.width/2)+'px'
                                    appointments[i].style.zIndex = '2'
                                    appointments[i].dataset.adjusted = true
                                   appointments[i].classList.add('overlap')
                                }
                                let el2 = appointments[ii].getBoundingClientRect()
                                if (!appointments[ii].dataset.adjusted){
                                    appointments[ii].style.width = (appt_2.width/2)+'px'
                                    appointments[ii].dataset.adjusted = true
                                   appointments[ii].classList.add('overlap')
                                }

                            }

                        }

                    }

                }

            }

        }

    }

    var appointmentCloseAll = function(){

        if (scope && scope.view && scope.view.context){
            scope.view.context = false
        }

        var appts = document.querySelectorAll('.appointment')
        for (var i=0; i < appts.length; i++){

            if (appts[i].hasAttribute('data-height')){
                let height = appts[i].dataset.height,
                    width = appts[i].dataset.width,
                    is_memo = appts[i].classList.contains('memo')

                appts[i].removeAttribute('data-height')
                appts[i].removeAttribute('data-width')
                appts[i].classList.remove('open')
                appts[i].classList.remove('edit')
                appts[i].style.height = height
                appts[i].style.width = width

                if (is_memo){
                    appts[i].style.zIndex = 200
                    appts[i].style.width = width
                } else {
                    appts[i].style.zIndex = 1
                }
            }
        }
    }

    var expandMenu = function(){

        if (dashboard){

            if (dashboard.classList.contains('mini-menu')){
                dashboard.classList.remove('mini-menu')
                setCookie('mini_menu', false)
            } else {
                dashboard.classList.add('mini-menu')
                setCookie('mini_menu', true)
            }

        }

    }

    var contextCloseAll = function(){

        if (scope && scope.view && scope.view.context){
            scope.view.context = false
        }

        var contexts = document.querySelectorAll('.context')
        for (var i=0; i < contexts.length; i++){
            if (contexts[i].classList.contains('open')){
                contexts[i].classList.remove('open')
                contexts[i].classList.add('closed')
            } else {
                contexts[i].style.display = 'none'
            }

        }
    }

    var modalCloseAll = function(){
        if (scope){
            scope.view.modal = false
            scope.resetNew()
        }
        var modals = document.querySelectorAll('.modal')
        for (var i=0; i < modals.length; i++){
            modals[i].style.display = 'none'
        }
    }

    var uuid = function() {
        var date = moment().utc()
        var str = date.format('YYYY')+'-'+date.format('MM')+date.format('DD')
        return str+'-xxxx-xxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 9 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    var getDaysArray = function(year, month, short) {

        var monthIndex = month - 1,
            names = [ 'sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat' ],
            date = new Date(Date.UTC(year, monthIndex, 1)),
            pre_dates = new Date(Date.UTC(year, monthIndex, 1))
            result = [
                {date:'Mon',type:'day'},
                {date:'Tue',type:'day'},
                {date:'Wed',type:'day'},
                {date:'Thu',type:'day'},
                {date:'Fri',type:'day'},
                {date:'Sat',type:'day'},
                {date:'Sun',type:'day'},
            ],
            offset = date.getUTCDay()-1,
            today = new Date().getUTCDate(),
            this_month = new Date().getUTCMonth(),
            iso = date.toISOString()



        if (short){
            result = []
        }

        if (offset < 0){
            offset = 6
        }

        if (!short){
            pre_dates.setUTCDate(pre_dates.getUTCDate() - offset);

            for (var i=0;i<offset;i++){
                let iso = pre_dates.toISOString()
                result.push({date:pre_dates.getUTCDate()+'',type:'pre',iso:iso})
                pre_dates.setUTCDate(pre_dates.getUTCDate() + 1);
            }
        }

        while (date.getUTCMonth() == monthIndex) {

            let day = date.getUTCDate(),
                iso = date.toISOString()

            //    console.log(scope.salon.monthly_opening_times['day_'+day], day)

            if (scope.salon && scope.salon.monthly_opening_times){

                if (day >= today && scope.salon.monthly_opening_times['day_'+day] && this_month == monthIndex || scope.salon.monthly_opening_times['day_'+day] && this_month != monthIndex){
                    result.push({date:day+'',type:'selectable',iso:iso});
                } else {
                    result.push({date:day+'',type:'passed',iso:iso});
                }

            } else {

                if (day < today && this_month == monthIndex){
                    result.push({date:day+'',type:'passed',iso:iso});
                } else if (day == today && this_month == monthIndex){
                    result.push({date:day+'',type:'today',iso:iso});
                } else {
                    result.push({date:day+'',type:'reg',iso:iso});
                }

            }

            date.setUTCDate(date.getUTCDate() + 1);

        }

        if (result.length > 42){
            var post_dates = 49 - result.length;
        }

        if (!short){
            while (date.getUTCDate() <= post_dates) {

                let day = date.getUTCDate(),
                    iso = date.toISOString()

                result.push({date:day+'',type:'post',iso:iso});

                date.setUTCDate(date.getUTCDate() + 1);

            }
        }

        return result;
    }

    var checkLogin = function(){

        if (window.location.pathname.match(/login/)){

            localStorage.setItem('login',moment().toISOString())

        } else {

            var login = moment()
            if (localStorage.getItem('login')){
                login = moment(localStorage.getItem('login'))
            }

            if (moment().diff(login, 'seconds') > 300){

                localStorage.setItem('login',moment().toISOString())
                setTimeout(function(){
                    window.location.href = "/login/staff"
                },1000)

            } else {
                localStorage.setItem('login',moment().toISOString())
            }

        }

    }

    document.addEventListener("click", function (e) {

        if (e.target.classList.contains('context') || e.target.classList.contains('context-link')){

        } else {
            contextCloseAll()
        }

        if (e.target.classList.contains('modal')){
            modalCloseAll()
        }

        if (e.target.classList.contains('appointment')){
            appointmentCloseAll()
        }

    });

    window.onfocus = function() {
        positionTimeline()
    //    checkLogin()
    };

    window.onresize = function() {
        let dashboard = document.querySelector('.dashboard')
        if (dashboard){
            dashboard.style.height = window.innerHeight;
        }

    }
    window.onresize();

    //checkLogin()

    function setCookie(name,value,days) {
        var expires = "";
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days*24*60*60*1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "")  + expires + "; path=/";
    }
    function getCookie(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for(var i=0;i < ca.length;i++) {
            var c = ca[i];
            while (c.charAt(0)==' ') c = c.substring(1,c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
        }
        return null;
    }
    function eraseCookie(name) {
        document.cookie = name+'=; Max-Age=-99999999;';
    }

    function toggleMenu(){
        var nav = document.getElementById('menu')
        if (nav && nav.classList.contains('open')){
            nav.classList.remove('open')
        } else if (nav) {
            nav.classList.add('open')
        }
    }
