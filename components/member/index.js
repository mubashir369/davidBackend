//
// Dashboard Module
// Includes functions and tools for all users
//

// vars

var express = require("express"),
  services = require("../../models/services"),
  seats = require("../../models/seats"),
  routes = express.Router(),
  moment = require("moment"),
  member = require("../../models/members.js"),
  home_about_us = require("../../models/home_about_us.js"),
  member_subscriptions = require("../../models/member_subscriptions"),
  appointments = require("../../models/appointments.js"),
  banner = require("../../models/banner.js"),
  about_member = require("../../models/about_member.js"),
  member_tagline = require("../../models/member_tagline.js"),
  portfolio = require("../../models/portfolio.js"),
  db = require(config.db_connector),
  settings = {
    default_route: "member",
    views: "member/views",
    menu: {
      member_menu: [
        {
          link: "Dashboard",
          slug: "/dashboard",
          protected_guards: ["member"],
          icon: "reports",
          weight: 1,
        },
        {
          link: "Appointment Calendar",
          slug: "/appointment-calendar",
          protected_guards: ["member"],
          icon: "calendar",
          weight: 1,
        },
        {
          link: "Purchase Seats",
          slug: "/purchase-seats",
          protected_guards: ["member"],
          icon: "sale",
          weight: 1,
        },
        {
          link: "Time slots",
          slug: "/slots",
          protected_guards: ["member"],
          icon: "time",
          weight: 2,
        },
        {
          link: "Services",
          slug: "/services",
          protected_guards: ["member"],
          icon: "time",
          weight: 2,
        },
        {
          link: "Price settings",
          slug: "/price-settings",
          protected_guards: ["member"],
          icon: "product",
          weight: 3,
        },
        {
          link: "CMS",
          slug: "/cms",
          protected_guards: ["member"],
          icon: "reports",
          weight: 4,
        },
        {
          link: "report",
          slug: "/report1",
          protected_guards: ["member"],
          icon: "reports",
          weight: 4,
        },
        {
          link: "Appointments",
          slug: "/book-appointments",
          protected_guards: ["member"],
          icon: "calendar",
          weight: 5,
        },
        {
          link: "Customers",
          slug: "/clients",
          protected_guards: ["member"],
          icon: "client",
          weight: 6,
        },
        {
          link: "My Transactions",
          slug: "/orders",
          protected_guards: ["member"],
          icon: "transaction",
          weight: 7,
        },
        {
          link: "Customer Transactions",
          slug: "/transactions",
          protected_guards: ["client", "member"],
          icon: "transaction",
          weight: 8,
        },
        {
          link: "Membership Packages",
          slug: "/subscription-pakages",
          protected_guards: ["member"],
          icon: "voucher",
          weight: 9,
        },
        {
          link: "Wallet",
          slug: "/wallets",
          protected_guards: ["member"],
          icon: "cardpayment",
          weight: 10,
        },
        {
          link: "Packages",
          slug: "/pakages",
          protected_guards: ["member"],
          icon: "calendar",
          weight: 10,
        },
        {
          link: "Coupons",
          slug: "/coupons",
          protected_guards: ["member"],
          icon: "calendar",
          weight: 11,
        },
        // {link:'Reports',slug: '/reports', protected_guards:['member'], icon:'reports', weight:12},
      ],
    },
    includes: [
      //{name:'epos',path:'epos.js'},
      { name: "seats", path: "seats.js" },
      /*{name:'clients',path:'clients.js'},
            {name:'reports',path:'reports.js'},
            {name:'salon',path:'salon.js'},
            {name:'promo',path:'bulk_email.js'}*/
    ],
  };

const path = require("path");
const multer = require("multer");
const salon = require("../../models/salon");
const customer = require("../../models/customers");
const memberships = require("../../models/memberships");
const members = require("../../models/members.js");
const uploadstorage = multer.diskStorage({
  destination: "public/images/banners/",
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "_" + Date.now() + path.extname(file.originalname)
    );
  },
});
const upload = multer({
  storage: uploadstorage,
});
/*const path = require('path')
    const multer  = require('multer')
    const uploadstorage = multer.diskStorage({ 
        destination: 'uploads/',
        filename: (req,file,cb) => {
            //console.log(file.fieldname)
            cb(null, file.fieldname + '_' + Date.now() + 
            path.extname(file.originalname))
        }
    })
    const upload = multer({
        storage: uploadstorage
    })*/

// methods
functions = {
  isToday: (date) => {
    if (date.match(/[0-9]{4}\/[0-9]{1,2}\/[0-9]{1,2}/)) {
      return false;
    } else {
      return true;
    }
  },

  parseName: (name_obj) => {
    return name_obj.first + " " + name_obj.last;
  },

  getDay: (date) => {
    return moment(date).format("ddd");
  },

  getDate: (date) => {
    date = new Date(date);
    return date.getDate();
  },

  getStart: (date) => {
    if (date.match(/Z$/)) {
      return moment(date).format("HH:mm");
    }
  },

  getMonth: (date) => {
    var months = [
      "January",
      "Febuary",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    date = new Date(date);
    return months[date.getMonth()] + " " + date.getFullYear();
  },

  parseCalendarLink: (date) => {
    if (date.match(/Z$/)) {
      return moment(date).format("YYYY/M/D");
    } else {
      return;
    }
  },

  parseTime: (time) => {
    if (time) {
      time = time.toString().split("");
    } else {
      return;
    }

    if (time.length == 3) {
      return "0" + "" + time[0] + ":" + time[1] + "" + time[2];
    } else {
      return time[0] + "" + time[1] + ":" + time[2] + "" + time[3];
    }
  },

  parseCalendarLink: (date) => {
    if (date.match(/Z$/)) {
      return moment(date).format("YYYY/M/D");
    } else {
      return;
    }
  },
};

// routes
routes.get("*", (req, res, next) => {
  /*console.log('innerrrr')
        return;*/
  if (
    req.session &&
    (new Date().getTime() - new Date(req.session.startTime).getTime()) / 60000 >
      10
  ) {
    console.log("logged out Due to in-activity for 10 min ");

    if (req.session.user && req.session.user.guard === "admin") {
      req.session.destroy();
      return res.redirect("/login/admin");
    } else if (req.session.user && req.session.user.guard === "member") {
      req.session.destroy();
      return res.redirect("/login/member");
    } else {
      req.session.destroy();
      return res.redirect("/login/staff");
    }
  } else {
    req.session.startTime = new Date();
  }

  console.log(req.params);

  res.set({
    "Cache-Control": "private, max-age=0, proxy-revalidate, s-maxage=0",
    Pragma: "no-cache",
    Expires: "0",
    Vary: "*",
  });

  if (
    (req.session && req.session.user && req.session.user._key) ||
    req.params[0] == "/signup" ||
    req.params[0].includes("/confirm/")
  ) {
    next();
  } else {
    res.redirect("/login/member");
  }
});

routes.get("/signup", async (req, res) => {
  view.dashboard_view = "";
  let data = {};
  data.services = await services.all();
  data.cms_data = await home_about_us.getAbout1({type:"joinUs"}) 
   
  const cat = [
    { name: "Men's Hair", key: "mens-hair-services" },
    { name: "Balyage", key: "balayage-hair-colour" },
    { name: "Creative Colouring", key: "creative-colouring" },
    { name: "Hair Loss", key: "hair-loss-system" },
    { name: "Colour Correction", key: "colour-correction" },
    { name: "Keratin Smoothing", key: "keratin-smoothing" },
    { name: "Ladies Hair", key: "ladies-hair-services" },
  ];
  data.include_scripts= [settings.views + '/scripts/purchase_seats_script.ejs']
  data.servicesCat=cat
  res.render(settings.views + "/signup.ejs", data);
});

routes.get("/cms", async (req, res) => {
  view.dashboard_view = "";
  let data = {
    title: "CMS",
    user: req.session.user,
    include_scripts: [settings.views + "/scripts/purchase_seats_script.ejs"],
  };
  //data.seats = await seats.all()
  try {
    data.member = await member.find(req.session.user._key);

    if (data.member.about) {
      data.about = data.member.about;
    } else {
      data.about = "";
    }
    const memberdetails = await member_tagline.find(req.session.user._key);

    data.tagline =
      memberdetails.length > 0 && memberdetails[0].tagline
        ? memberdetails[0].tagline
        : [];
    data.portfolios =
      data.member.portfolio && data.member.portfolio.length > 0
        ? data.member.portfolio
        : [];

    //console.log('data.portfolios',data.portfolios)

    data.allbanners = [];

    const banners = await banner.find({ key: req.session.user._key });
    if (banners.length > 0) {
      data.allbanners = banners[0].banner;
      //console.log("greater than 1");
    }

    data.skills = [];
    console.log("inside get cms");
    const about = await about_member.find(req.session.user._key);
    //member_tagline
    const tagline = await member_tagline.find(req.session.user._key);
    //console.log(tagline)
    /*if(banners.length > 0)
        data.banner = banners[0].banner;
        else
        data.banner = []*/
    /*if(about.length > 0)
        data.about = about[0];
        else
        data.about = ''
        if(tagline.length > 0)
        data.tagline = tagline[0];
        else
        data.tagline = ''*/

    //skills
    const salondata = await salon.find(54855602);
    if (salondata) {
      //console.log(salondata.skills,"salooon daata");
      data.skills = salondata.skills;
    }
    //portfolio
    //const portfolioexist = await portfolio.find()
    console.log(data.portfolios);

    //console.log(data)
    res.render(settings.views + "/cms.ejs", data);
  } catch (error) {
    console.log(error);
  }
});
routes.get("/report1", async (req, res) => {
  console.log("fkj");
  view.dashboard_view = "";
  let data = {
    title: "Report",
    user: req.session.user,
    include_scripts: [settings.views + "/scripts/purchase_seats_script.ejs"],
  };
  res.render(settings.views + "/report1.ejs", data);
});

routes.post("/signup", async (req, res) => {
  view.dashboard_view = "";
  console.log(req.body);

  let data = req.body ? req.body : {};
  data.services = await services.all();
  data.cms_data = await home_about_us.getAbout1({type:"joinUs"})
  //res.render(settings.views+'/signup.ejs',data)
  //console.log(data)
  member
    .save(req.body)
    .then(async (data) => {
      let ndata = {};
      ndata.services = await services.all();
      ndata.cms_data = await home_about_us.getAbout1({type:"joinUs"}) 
      ndata.success =
        "Thank you for registering with us, Please verify your email before login.!";
        ndata.servicesCat=[]
      res.render(settings.views + "/signup.ejs", ndata);
      //setTimeout(()=>window.location.href = '/member/login', 3000)
    })
    .catch((err) => {
      console.log(err);
      data.error = err;
      data.servicesCat= [
        { name: "Men's Hair", key: "mens-hair-services" },
        { name: "Balyage", key: "balayage-hair-colour" },
        { name: "Creative Colouring", key: "creative-colouring" },
        { name: "Hair Loss", key: "hair-loss-system" },
        { name: "Colour Correction", key: "colour-correction" },
        { name: "Keratin Smoothing", key: "keratin-smoothing" },
        { name: "Ladies Hair", key: "ladies-hair-services" },
      ];
      res.render(settings.views + "/signup.ejs", data);
    });
});

routes.post("/addprice", async (req, res) => {
  view.dashboard_view = "";
  let data = {
    title: "Price setting for services",
    user: req.session.user,
    include_scripts: [settings.views + "/scripts/slots.ejs"],
  };
  data.member = await member.find(req.session.user._key);
  data.services = await services.findbyarray(data.member.mem_services);

  console.log(req.body);
  member
    .addprice(req.body)
    .then(async (ndata) => {
      req.flash("success", "Price updated successfully!");
      //setTimeout(()=>{ res.redirect('/member/price-settings'); },2000)
      //res.render(settings.views+'/price-settings.ejs',data)
      return res.redirect("/member/price-settings");
    })
    .catch((err) => {
      console.log(err);
      data.error = err;
      res.render(settings.views + "/price-settings.ejs", data);
    });
});

routes.get("/dashboard", (req, res) => {
  view.dashboard_view = "";
  let data = {
    title: "Member Dashboard",
    user: req.session.user,
    //include_scripts: [settings.views+'/scripts/salon_events.ejs']
  };
  res.render(settings.views + "/index.ejs", data);
});
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
routes.get("/appointment-calendar", async(req, res) => {
  view.dashboard_view = "";
  res.locals.functions = functions
  let data = {
    title: "Appointment Calendar",
    user: req.session.user,
    selected_date: "Today",
    include_scripts: [settings.views+'/scripts/calendar.ejs'],
    //include_scripts: [settings.views+'/scripts/salon_events.ejs']
  };
  data.salon = await salon.find('54855602')
  data.opening_times = data.salon.opening_times[moment().format('d')]
  data.appointments = await appointments.findbystaff(req.session.user._key)
  data.staff = await members.getactivemem()
  data.member = await member.find(req.session.user._key);
  let dates = [];
  let narr = [];
  if (Array.isArray(data.member.orders)) {
    for (var i = 0; i < data.member.orders.length; i++) {
      for (var j = 0; j < data.member.orders[i].order.length; j++) {
        dates.push(data.member.orders[i].order[j].date);
        narr.push(data.member.orders[i].order[j]);

        //console.log(data.member.orders[i].order[j])
      }
    }
  }

  narr = narr.sort(function (a, b) {
    // Turn your strings into dates, and then subtract them
    // to get a value that is either negative, positive, or zero.
    var dateA = new Date(a.date);
    var dateB = new Date(b.date);
    return dateA - dateB;
  });

  let result = narr.reduce((arr, value) => {
    let found = arr.find((v) => v._key == value._key);
    if (found) {
      if (found.date < value.date) found.date = value.date;
    } else arr.push(value);

    return arr;
  }, []);

  data.dates = result;
  console.log("dddddddddd",result);
  
  res.render(settings.views+'/calendar.ejs',data)
});

let MAX = 100000;

function Print3Smallest(array = [], n) {
  let newobj = [];
  console.log(array);
  if (array.length > 0) {
    for (let i = 0; i < n; i++) {
      if (array.length > 0) {
        var result = array.reduce(function (res, obj) {
          return parseInt(obj.price) < parseInt(res.price) ? obj : res;
        });

        newobj.push(result);

        array = array.filter((item) => result._key !== item._key);
      }
    }
    console.log(newobj);
  }

  return newobj;
}

function parseTime2(s) {
  var c = s.split(":");
  return parseInt(c[0]) * 60 + parseInt(c[1]);
}

function convertHours(mins) {
  var hour = Math.floor(mins / 60);
  var mins = mins % 60;
  var converted = pad(hour, 2) + ":" + pad(mins, 2);
  return converted;
}

function pad(str, max) {
  str = str.toString();
  return str.length < max ? pad("0" + str, max) : str;
}

function calculate_time_slot(start_time, end_time, interval = "30") {
  var i, formatted_time;
  var time_slots = new Array();
  for (var i = start_time; i <= end_time; i = i + interval) {
    formatted_time = convertHours(i);
    time_slots.push(formatted_time);
  }
  return time_slots;
}

routes.get("/purchase-seats", async (req, res) => {
  try {
    view.dashboard_view = "";
    let data = {
      title: "Purchase Seats",
      user: req.session.user,
      include_scripts: [settings.views + "/scripts/purchase_seats_script.ejs"],
    };
    data.seats = await seats.all();
    data.member_subscriptions = await member_subscriptions.frontall();
    data.member = await member.find(req.session.user._key);
    data.discount = 0;
    data.valid_seats = 0;
    data.date_array = [];
    if (data.member && data.member.subscription_id) {
      let subscription = await member_subscriptions.find(
        data.member.subscription_id
      );
      let member_cycle = await member_subscriptions.getcycle(
        data.member.subscription_id,
        data.member._key
      );

      console.log(member_cycle, data.member.subscription_id, data.member._key);

      data.pending_seats =
        member_cycle && member_cycle.pending ? member_cycle.pending : 0;

      data.valid_seats =
        subscription && subscription.seats ? parseInt(subscription.seats) : 0;

      if (data.member.selected_seats && data.member.selected_seats.length > 0) {
        //console.log('member.selected_seats',data.member.selected_seats)
        let array =
          data.member.selected_seats.length > 0
            ? data.member.selected_seats
            : [];
        let n = array.length;
        let free_dates = Print3Smallest(array, data.pending_seats);

        data.discount = 0;

        if (free_dates.length > 0) {
          free_dates.map((fdata) => {
            if (fdata.price) data.discount += parseFloat(fdata.price);

            data.date_array.push(fdata.date);
          });
        }

        //console.log('free_dates',free_dates)
      }
    }

    data.purchased = [];

    if (data.member.orders) {
      for (var i = 0; i < data.member.orders.length; i++) {
        for (var j = 0; j < data.member.orders[i].order.length; j++) {
          data.purchased.push(data.member.orders[i].order[j].date);
        }
      }
    }

    if (req.cookies && !req.cookies.show_popup) {
      data.popup = true;
    } else data.popup = true;

    res.cookie("show_popup", 1, { maxAge: 900000, httpOnly: true });

    const seat = await member_subscriptions.getMembershipFreeSeats(
      req.session.user._key
    );
    console.log(seat);
    data.remainingSeat = seat.length > 0 ? seat[0].pending : 0;

    let started = seat.length > 0 ? seat[0].start_date : "";
    data.onemonth = 0;
    if (started) {
      let date1 = new Date(started);
      let date2 = new Date();
      var difference =
        (date2.getDate() - date1.getDate()) / 30 +
        date2.getMonth() -
        date1.getMonth() +
        12 * (date2.getFullYear() - date1.getFullYear());
      data.onemonth = difference;
      console.log(difference, "difference");
    }

    console.log(data.member)
    res.render(settings.views + "/purchase-seats.ejs", data);
  } catch (e) {
    res.render("../layouts/error.ejs");
  }
});

routes.get("/services", async (req, res) => {
  try {
    view.dashboard_view = "Member Services";

    res.locals.functions = functions;
    let data = {
      user: req.session.user,
      title: "Services",
      include_scripts: [settings.views + "/scripts/salon.ejs"],
    };

    if (req.cookies && req.cookies.mini_menu) {
      data.mini_menu = req.cookies.mini_menu;
    }

    data.salon = await salon.find("54855602");

    res.render(settings.views + "/services.ejs", data);
  } catch (err) {
    return res.render("../layouts/error.ejs");
  }
});
routes.get("/about", async (req, res) => {
  view.dashboard_view = "";
  let data = {
    title: "About",
    user: req.session.user,
    include_scripts: [settings.views + "/scripts/purchase_seats_script.ejs"],
  };
  data.seats = await seats.all();
  data.member = await member.find(req.session.user._key);
  res.render(settings.views + "/about.ejs", data);
});

routes.get("/slots", async (req, res) => {
  view.dashboard_view = "";
  let data = {
    title: "Time slot settings",
    user: req.session.user,
    include_scripts: [settings.views + "/scripts/slots.ejs"],
  };
  data.seats = []; //await seats.all()
  data.member = await member.find(req.session.user._key);
  data.member_slots = await member.getslotsmember(req.session.user._key);

  //console.log(data.member_slots)

  let dates = [];
  let narr = [];
  if (Array.isArray(data.member.orders)) {
    for (var i = 0; i < data.member.orders.length; i++) {
      for (var j = 0; j < data.member.orders[i].order.length; j++) {
        dates.push(data.member.orders[i].order[j].date);
        narr.push(data.member.orders[i].order[j]);

        //console.log(data.member.orders[i].order[j])
      }
    }
  }

  narr = narr.sort(function (a, b) {
    // Turn your strings into dates, and then subtract them
    // to get a value that is either negative, positive, or zero.
    var dateA = new Date(a.date);
    var dateB = new Date(b.date);
    return dateA - dateB;
  });

  let result = narr.reduce((arr, value) => {
    let found = arr.find((v) => v._key == value._key);
    if (found) {
      if (found.date < value.date) found.date = value.date;
    } else arr.push(value);

    return arr;
  }, []);

  data.dates = result;

  //console.log(result)

  /*data.member.orders.sort(function(a,b){
          return new Date(b.date) - new Date(a.date);
        });*/

  const salondata = await salon.find(54855602);
  data.times_ara = [];
  if (req.query.date) {
    req.query.date = req.query.date.split("/").join("-");
  }
  if (salondata && req.query.date) {
    //console.log(salondata.skills,"salooon daata");
    data.opening_times = salondata.opening_times;
    //console.log(data.opening_times, req.query.date)
    var d = new Date(req.query.date);
    // var dnum = d.getDay();
    // console.log(data.opening_times[d.getDay()]);
    // console.log("ffffffffff",req.query.date.split("-").pop(),d.getDay(),d,req.query.date);

    if (data.opening_times && data.opening_times[d.getDay()]) {
      var from_to = data.opening_times[d.getDay()];
      if (from_to["open"] && from_to["open"] !== "undefined") {
        var start_time = parseTime2(from_to["open"]),
          end_time = parseTime2(from_to["close"]),
          interval = 30;

        data.times_ara = calculate_time_slot(start_time, end_time, interval);
        //console.log(times_ara);
      }
    }
  }

  data.date = req.query.date;

  // const bookedDates = Object.keys(data.member_slots)
  //   .filter(
  //     (a) => a != "member_data" && a != "_key" && a != "_id" && a != "_rev"
  //   )
  //   .join("_")
  //   .split("_")
  //   .map((a) => parseInt(a))
  //   .filter((a) => !isNaN(a));
  // data.bookedDates = bookedDates.map((a) => {
  //   const obj = `${a}`.split("");
  //   const yyy = `${obj[0]}${obj[1]}${obj[2]}${obj[3]}`;
  //   const mm = `${obj[4]}${obj[5]}`;
  //   const dd = `${obj[6]}${obj[7]}`;

  //   return `${mm}/${dd}/${yyy}`;
  // });
  let newDates = data.dates.map((d) => {
    const obj = `${d.date}`.split("-");
    const yyyy = `${obj[0]}`;
    const mm = `${obj[1]}`;
    const dd = `${obj[2]}`;
    return `${mm}/${dd}/${yyyy}`;
  });
  data.bookedDates = newDates;
  console.log("ddddddd",newDates,"kkkkkkk");
  // console.log("asasasasasa", data);
  res.render(settings.views + "/slots.ejs", data);
});

routes.get("/price-settings", async (req, res) => {
  view.dashboard_view = "";
  let data = {
    title: "Price setting for services",
    user: req.session.user,
    include_scripts: [settings.views + "/scripts/slots.ejs"],
  };
  data.member = await member.find(req.session.user._key);
  data.success = req.flash("success");
  data.services = await services.findbyarray(data.member.mem_services);

  res.render(settings.views + "/price-settings.ejs", data);
});

routes.get("/book-appointments", async (req, res) => {
  try {
    view.dashboard_view = "";
    let data = {
      title: "Book Appointments",
      user: req.session.user,
      include_scripts: [settings.views + "/scripts/purchase_seats_script.ejs"],
    };
    data.seats = await seats.all();
    data.member = await member.find(req.session.user._key);
    data.user = req.session.user;
    data.appointments = await appointments.findbystaff(req.session.user._key);
    // console.log(data.appointments)
    data.allslots = await member.getslots(req.session.user._key);

    console.log("data.allslots", data.allslots, req.session.user._key);

    //console.log('data.appointments',data.appointments[2].customer)

    /*for(var i=0; i<data.appointments.length; i++) {
            console.log('data.appointments',data.appointments[i].customer)
        }*/

    if (req.query && req.query.date) {
      data.defaultDate = req.query.date;
      data.slots = data.allslots["date_" + req.query.date.split("-").join("")]
        ? data.allslots["date_" + req.query.date.split("-").join("")]
        : "";
      //console.log('slots',data.slots)
    } else {
      data.defaultDate = "";
      data.slots = "";
    }

    res.render(settings.views + "/book-appointments.ejs", data);
  } catch (e) {
    res.render("../layouts/error.ejs");
  }
});

routes.get("/new-appointment", async (req, res) => {
  res.locals.functions = functions;
  let data = {
    user: req.session.user,
    hide_datepicker: true,
    title: "New Appointment",
    customers: [],
    parseName: functions.parseName,
    customer: true,
    include_scripts: [settings.views + "/scripts/new_appointment.ejs"],
  };
  data.seats = await seats.all();
  data.member = await member.find(req.session.user._key);
  data.slots = await member.getslots(req.session.user._key);
  console.log("data.member", data.member.mem_services);

  data.mem_services = data.member.mem_services.join("-");

  console.log(data.mem_services);

  if (req.query && req.query.date) {
    data.selected_date = moment(req.query.date).format("/YYYY/M/D");
  } else {
    data.selected_date = "";
  }

  data.user = req.session.user;
  console.log("selected_date", data.selected_date);

  res.render(settings.views + "/new_appointment.ejs", data);
});

routes.get("/clients", async (req, res) => {
  try {
    view.dashboard_view = "clients";
    let data = {
      title: "Customers",
      user: req.session.user,
      include_scripts: [settings.views + "/scripts/new_appointment.ejs"],
    };
    data.member = await member.find(req.session.user._key);
    data.customerData = await customer.getcustoerForMembers(
      req.session.user._key
    );
    res.render(settings.views + "/clients.ejs", data);
  } catch (e) {
    res.render("../layouts/error.ejs");
  }
});

routes.get("/clients/appointments/:id", async (req, res) => {
  try {
    const id = req.params.id;
    view.dashboard_view = "Appointments";
    let data = {
      title: "Appointments",
      user: req.session.user,
      include_scripts: [settings.views + "/scripts/new_appointment.ejs"],
    };
    // data.member = await member.find(req.session.user._key)
    const filter = { id: id, user: req.session.user._key };
    // data.customerData = await customer.getcustomerAppointments(filter);
    data.filterId=filter
    // scope.appppoimentss=data.customerData
    //console.log(data.customerData)
    // let services=await services.getMemberServices({id:req.session.user._key})
    
    data.services= await services.getMemberServices({id:req.session.user._key})
    console.log("serviese", data.services);
    res.render(settings.views + "/clientAppointment.ejs", data);
  } catch (e) {
    res.json({ message: "somethig went wrong</p>" });
  }
});

routes.get("/orders", async (req, res) => {
  view.dashboard_view = "memberTransactions";
  let data = {
    title: "My Transactions List",
    user: req.session.user,
    //include_scripts: [settings.views+'/scripts/purchase_seats_script.ejs']
  };
  data.member = await member.find(req.session.user._key);
  data.user = req.session.user;
data.include_scripts= [settings.views + "/scripts/member_transaction.ejs"]
  //console.log(data.member.orders)

  res.render(settings.views + "/orders.ejs", data);
});

routes.get("/subscription-pakages", async (req, res) => {
  try {
    view.dashboard_view = "";
    let data = {
      title: "Membership Pakages",
      user: req.session.user,
      include_scripts: [settings.views + "/scripts/purchase_seats_script.ejs"],
    };
    //data.seats = await seats.all()
    data.member = await member.find(req.session.user._key);

    // get if cancellation is requested
    data.cancellation = await memberships.getCancelationRequest(
      data.member.subscription_id
    );

    console.log(data.cancellation);
    data.member_subscriptions = await member_subscriptions.frontall();
    const seat = await member_subscriptions.getMembershipFreeSeats(
      req.session.user._key
    );
    data.remainingSeat = seat.length > 0 ? seat[0].pending : 0;

    let started = seat.length > 0 ? seat[0].start_date : "";
    data.onemonth = 0;
    if (started) {
      let date1 = new Date(started);
      let date2 = new Date();
      var difference =
        (date2.getDate() - date1.getDate()) / 30 +
        date2.getMonth() -
        date1.getMonth() +
        12 * (date2.getFullYear() - date1.getFullYear());

      var currentDate = moment(date2);
      var exp = moment(currentDate).add(1, "M").format("DD-MM-YYYY");
      data.onemonth = difference;
      data.expires = exp;
      console.log(difference, "difference");
    }

    res.render(settings.views + "/membership-pakages.ejs", data);
  } catch (e) {
    console.log(e);
    res.render("../layouts/error.ejs");
  }
});

routes.get("/transactions", async (req, res) => {
  view.dashboard_view = "";
  res.locals.functions = functions;
  let data = {
    title: "Transactions List",
    user: req.session.user,
    include_scripts: [settings.views + "/scripts/purchase_seats_script.ejs"],
  };

  //data.appointments = await appointments.getmemappoints(req.session.user._key)

  data.total = await appointments.gettotal(req.session.user._key);
  data.services = await services.all();

  // data.appointments = await appointments.findTodaysAppointments()
  // data.unconfirmed_appointments = await appointments.findAppointmentsWithStatus('unconfirmed',req.session.user._key)
  //       data.pending_appointments = await appointments.findAppointmentsWithStatus('salon_confirmation',req.session.user._key)
  //       data.cancelled_appointments = await appointments.findAppointmentsWithStatus('cancelled',req.session.user._key)
  //       data.rescheduled_appointments = await appointments.findAppointmentsWithStatus('reschedule',req.session.user._key)
  //       data.covid_appointments = []
  //       await appointments.findAppointmentsWithCovid('salon_confirmation')
  // data.incomplete_appointments = await customer.incompleteAppointments()

  // console.log(req.session.user._key.toString(), 'data.appointments',data.appointments.length)

  res.render(settings.views + "/transactions.ejs", data);
});
routes.get("/wallets", async (req, res) => {
  view.dashboard_view = "";
  res.locals.functions = functions;
  let data = {
    title: "Wallet",
    user: req.session.user,
    include_scripts: [settings.views + "/scripts/purchase_seats_script.ejs"],
  };
  data.wallet = await member.find(req.session.user._key);
  data.redeem = await member.getRedeem({ id: req.session.user._key });
  console.log(data.redeem);
  data.wallet = data.wallet.wallet;
  if (data.wallet === undefined || data.wallet === null) {
    data.wallet = 0;
  }

  res.render(settings.views + "/wallet.ejs", data);
});

routes.get("/confirm/:id", (req, res) => {
  view.dashboard_view = "";
  console.log(req.params["id"]);
  let ndata = {};

  member
    .confirm(req.params["id"])
    .then(async (data) => {
      ndata.success =
        "Thank you, Your email is verified now. You can login after admin approves your account!!";
      res.render(settings.views + "/confirm.ejs", ndata);
    })
    .catch((err) => {
      
      ndata.error = "Email not found in our database please signup again!!";
      res.render(settings.views + "/confirm.ejs", ndata);
    });
});

routes.get("/profile", async (req, res) => {
  view.dashboard_view = "profile";

  let data = {
    user: req.session.user,
    title: "Profile",
    include_scripts: [settings.views + "/scripts/salon.ejs"],
  };

  let member_new = req.session.user; //await members.find('611108')
  member_new.appointments = [];
  member_new.availability = [];

  //data.title = member_new.name.first+" "+member_new.name.last
  //data.member = member_new
  data.member = await member.find(req.session.user._key);

  console.log(data.member);

  data.services = await services.all();

  res.render(settings.views + "/profile.ejs", data);
});

routes.get("/membership_purchase/:id", async (req, res) => {
  try {
    console.log(req.params["id"]);

    view.dashboard_view = "profile";

    let data = {
      user: req.session.user,
      title: "Membership Payment",
      include_scripts: [settings.views + "/scripts/purchase_seats_script.ejs"],
    };

    data.subscription = await member_subscriptions.find(req.params["id"]);

    data.member = await member.find(req.session.user._key);

    data.member_subscription_id = req.params["id"];

    console.log(data.subscription);

    //data.services = await services.all()

    res.render(settings.views + "/member_purchase.ejs", data);
  } catch (err) {
    res.render("../layouts/error.ejs");
  }
});

routes.post("/save-profile", async (req, res) => {
  view.dashboard_view = "";
  console.log("saveeeee", req.body);
  let data = req.body ? req.body : {};
  //data.services = await services.all()
  //res.render(settings.views+'/signup.ejs',data)
  //console.log(data)
  member
    .updateprofile(req.body)
    .then(async (data) => {
      setTimeout(() => {
        //window.location.href = '/member/profile'
        res.redirect(301, "/member/profile");
      }, 1000);
    })
    .catch((err) => {
      console.log(err);
      setTimeout(() => {
        //window.location.href = '/member/profile'
        res.redirect(301, "/member/profile");
      }, 1000);
    });
});

/*routes.get('/appointments', (req, res) => {
        view.dashboard_view = 'appointments'
        res.render(settings.views+'/appointments.ejs',req.session)
    })*/

routes.post("/cms", upload.single("img"), async (req, res) => {
  console.log(req.file, "reqqqqqqqquuueeest");
  if (req.body) {
    console.log(req.body.action);
    if (req.body.action == "slider") {
      try {
        const m_id = req.session.user._key;
        console.log(m_id, "midddd");
        let result;
        const banners = await banner.find({ key: req.session.user._key });
        console.log(banners.length, "bannerssssss");
        if (banners.length > 0) {
          console.log("inside if");
          const data = {
            heading: req.body.heading,
            description: req.body.description,
            image: req.file.filename,
          };
          result = await banner.pushBanner(m_id, data);
        } else {
          console.log("inside else");
          const data = {
            m_id: req.session.user._key,
            banner: [
              {
                heading: req.body.heading,
                description: req.body.description,
                image: req.file.filename,
              },
            ],
          };
          result = await banner.create(data);
          console.log(result);
        }
        if (result) {
          res.redirect("/member/cms");
        }
      } catch (error) {
        console.log(error);
      }
    } else if (req.body.action == "about") {
      console.log(req.body, "inside add about if");
      //return;
      try {
        const data = {};
        const m_id = req.session.user._key;
        if (req.body.image_1 !== "") data.image_1 = req.body.image_1;
        if (req.body.image_2 !== "") data.image_2 = req.body.image_2;
        if (req.body.heading !== "") data.heading = req.body.heading;
        if (req.body.sub_heading !== "")
          data.sub_heading = req.body.sub_heading;
        if (req.body.description !== "")
          data.description = req.body.description;
        console.log(data, "data comming from post");
        const member = await about_member.find(req.session.user._key);
        console.log(member.about, "lengthttttt");
        let aboutdata = member.about;
        let result;
        console.log(aboutdata, "abou");
        if (aboutdata) {
          console.log(data);
          result = await about_member.update_about(m_id, data);
        } else {
          console.log(data, "mid and data");
          console.log("inside else");
          result = await about_member.create(m_id, data);
        }

        res.redirect("/member/cms");
      } catch (error) {
        console.log(error);
      }
    } else if (req.body.action == "portfolio") {
      try {
        console.log(req.session.user._key);
        console.log(req.body, "xxxxxxxxxx");
        m_id = req.session.user._key;
        let result;
        let data;

        memberDetails = await member.find(req.session.user._key);

        console.log(memberDetails, "memeber dot about inside portfolio");
        //console.log(memberDetails.portfolio.length,"pooooooooo");
        const portfolioExist = memberDetails.portfolio
          ? memberDetails.portfolio
          : [];
        if (portfolioExist.length > 0) {
          console.log("inside if portfolio");
          console.log(req.body, "requess");
          let data = {
            skill_id: req.body.skill_id,
            image: req.body.skill_image,
            title: req.body.title,
            description: req.body.headline,
          };
          console.log(data, "object data");
          result = await portfolio.pushSkill(m_id, data);
          console.log(data);
        } else {
          console.log("inside else ");
          console.log(req.body, "reques");
          data = [
            {
              skill_id: req.body.skill_id,
              image: req.body.skill_image,
              title: req.body.title,
              description: req.body.headline,
            },
          ];

          console.log(data);
          result = await portfolio.create(m_id, data);
          console.log(data);
        }
        res.redirect("/member/cms");
      } catch (error) {
        console.log(error);
      }
    } else if (req.body.action == "Pricing") {
      res.send(req.body);
    } else if (req.body.action == "tagline") {
      console.log("inside tagline ");
      try {
        const data = {};
        const m_id = req.session.user._key;
        console.log(req.body, "tagline request body");
        if (req.body.heading !== "") data.heading = req.body.heading;
        if (req.body.sub_heading !== "")
          data.sub_heading = req.body.sub_heading;
        if (req.body.description !== "")
          data.description = req.body.description;
        //console.log(data)
        const member = await member_tagline.find(req.session.user._key);
        const taglineexist = member.tagline;
        console.log(taglineexist, "existtttt");

        let result;
        if (taglineexist) {
          console.log("inside tag line if");
          //console.log(data)
          result = await member_tagline.update_tagline(m_id, data);
        } else {
          console.log("inside tagline else");
          console.log({ m_id, ...data });
          result = await member_tagline.create(m_id, data);
        }
        res.redirect("/member/cms");
      } catch (error) {
        console.log(error);
      }
    }
    //Pricing
    //Tagline
    else {
      res.send("error");
    }
  }
});

// export

module.exports = functions;
module.exports.routes = routes;
module.exports.settings = settings;
