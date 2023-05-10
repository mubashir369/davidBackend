//
// Dashboard Module
// Includes functions and tools for all users
//

const transactions = require("../../models/transactions");

// vars

let express = require("express"),
  routes = express.Router(),
  moment = require("moment"),
  db = require(global.config.db_connector),
  notifications = require("../../models/user_notifications"),
  appointments = require("../../models/appointments"),
  customer = require("../../models/customers"),
  staff = require("../../models/staff"),
  salon = require("../../models/salon"),
  seats = require("../../models/seats"),
  cafeproducts = require("../../models/cafeproducts"),
  home_about_us = require("../../models/home_about_us"),
  settings = {
    default_route: "dashboard",
    views: "dashboard/views",
    protected_guards: ["admin", "staff"],
    menu: {
      dashboard_menu: [
        {
          link: "FoodCafe",
          slug: "/foodcafe",
          weight: 1,
          icon: "food",
          protected_guards: ["staff", "admin"],
          min_role: 1,
          subitems: [
            // {link:'Food Products',slug: '/foodcafe/food-products',min_role:2, weight:3},
            {
              link: "Products",
              slug: "/foodcafe/products",
              min_role: 2,
              weight: 3,
            },
            {
              link: "Tables",
              slug: "/foodcafe/tables",
              min_role: 2,
              weight: 3,
            },
            // {link:'Liquor Products',slug: '/foodcafe/liquor-products',min_role:2, weight:3},
            // {link:'Sub Categories',slug: '/dashboard/foodcafe',min_role:2, weight:2},
            {
              link: "Sub Categories",
              slug: "/dashboard/subCategory",
              min_role: 2,
              weight: 2,
            },
            {
              link: "Categories",
              slug: "/dashboard/category",
              min_role: 2,
              weight: 1,
            },
            {
              link: "Orders",
              slug: "/foodcafe/orders",
              min_role: 2,
              weight: 4,
            },
            {
              link: "Availability",
              slug: "/foodcafe/availability",
              min_role: 2,
              weight: 4,
            },
            {
              link: "Executive Stamp",
              slug: "/foodcafe/executiveStamp",
              min_role: 2,
              weight: 4,
            },
            {
              link: "Checkout",
              slug: "/foodcafe/foodCafeCheckout",
              min_role: 2,
              weight: 4,
            },
            // {link:'Cms',slug: '/foodcafe/cms',min_role:2, weight:5},
          ],
        },
      ],
    },
  },
  // methods

  functions = {
    parseTimeSlot: (time, appointment, selected_date, opening_times) => {
      if (appointment && appointment.event_type == "staff_appointment") {
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

        return moment(appointment.date).format("HHmm");
      } else if (time) {
        return time.replace(/\:/, "");
      } else {
        return "0000";
      }
    },

    getPreviousSlot: (end_time, appointment, selected_date, opening_times) => {
      if (appointment && appointment.event_type == "staff_appointment") {
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

        end_time = moment(appointment.end_date).format("HHmm");
      } else if (end_time) {
        end_time = end_time.replace(/\:/, "");
      } else {
        end_time = "0000";
      }

      if (end_time.match(/[0-9]{4}/)) {
        // get the previous slot, otherwise all appointments are 1 slot too big

        last_two = end_time.toString().match(/[0-9][0-9]$/)[0];

        if (last_two == "00") {
          end_time = end_time - 55;
        } else {
          end_time = end_time - 15;
        }

        if (end_time.toString().length == 3) {
          end_time = "0" + end_time;
        }

        return end_time;
      } else {
        return "0000";
      }
    },

    getStaffAppointmentTimes: (appt, selected_date) => {
      let start = moment(appt.date),
        end = moment(appt.end_date);

      if (selected_date == "Today") {
        selected_date = moment();
      } else {
        selected_date = moment(selected_date, "YYYY/MM/DD").set({ hour: 8 });
      }

      if (end.diff(selected_date, "hours") > 8) {
        // if the appt ends today
        return (
          start.format("Do MMM h:mma") + " - " + end.format("Do MMM h:mma")
        );
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

        return;
      }
    },

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

routes.use("/static", express.static(__dirname + "/static"));

routes.get("*", (req, res, next) => {
  if (req.session && req.session.user && req.session.user._key) {
    view.current_view = "dashboard";
    view.dashboard_category = "foodcafe";
    next();
  } else {
    res.redirect("/login/staff");
  }
});

routes.get("/foodcafe/food-products", async (req, res) => {
  view.dashboard_view = "foodproducts";

  res.locals.functions = functions;
  let data = {
    user: req.session.user,
    title: "FoodProducts",
    appointments: [],
    selected_date: "Today",
    include_scripts: [settings.views + "/scripts/salon.ejs"],
    mini_menu: false,
  };

  if (req.cookies.selected_date) {
    // if there's a date that's been previously selected, go to that instead
    res.redirect("/dashboard/foodcafe/food-products");
  } else {
    if (req.cookies && req.cookies.mini_menu) {
      data.mini_menu = req.cookies.mini_menu;
    }

    data.appointments = await appointments.all();
    // data.staff = await staff.all()
    data.salon = await salon.find("54855602");

    for (var appt of data.appointments) {
      if (appt.staff_id == "0000") {
        data.staff.unshift({
          _key: "0000",
          name: { first: "Unassigned", last: "Appointments" },
        });
        break;
      }
    }

    data.opening_times = data.salon.opening_times[moment().format("d")];

    data.collection = "true";
    res.render(settings.views + "/foodcafe_products.ejs", data);
  }
});
routes.get("/foodcafe/products", async (req, res) => {
  view.dashboard_view = "products";

  res.locals.functions = functions;
  let data = {
    user: req.session.user,
    title: "Products",
    appointments: [],
    selected_date: "Today",
    include_scripts: [settings.views + "/scripts/salon.ejs"],
    mini_menu: false,
  };

  if (req.cookies.selected_date) {
    // if there's a date that's been previously selected, go to that instead
    res.redirect("/dashboard/foodcafe/food-products");
  } else {
    if (req.cookies && req.cookies.mini_menu) {
      data.mini_menu = req.cookies.mini_menu;
    }

    // data.appointments = await appointments.all()

    // data.staff = await staff.all()
    data.category = await cafeproducts.getCategory("get");
    data.salon = await salon.find("54855602");
    for (var appt of data.appointments) {
      if (appt.staff_id == "0000") {
        data.staff.unshift({
          _key: "0000",
          name: { first: "Unassigned", last: "Appointments" },
        });

        break;
      }
    }

    data.opening_times = data.salon.opening_times[moment().format("d")];

    data.collection = "true";
    data.include_scripts = [settings.views + "/scripts/foodCafe.ejs"];

    res.render(settings.views + "/products.ejs", data);
  }
});
routes.get("/foodcafe/tables", async (req, res) => {
  view.dashboard_view = "tables";

  res.locals.functions = functions;
  let data = {
    user: req.session.user,
    title: "Tables",
    appointments: [],
    selected_date: "Today",
    include_scripts: [settings.views + "/scripts/salon.ejs"],
    mini_menu: false,
  };

  if (req.cookies.selected_date) {
    // if there's a date that's been previously selected, go to that instead
    res.redirect("/dashboard/foodcafe/food-products");
  } else {
    if (req.cookies && req.cookies.mini_menu) {
      data.mini_menu = req.cookies.mini_menu;
    }

    // data.appointments = await appointments.all()

    // data.staff = await staff.all()
    data.category = await cafeproducts.getCategory("get");
    data.salon = await salon.find("54855602");
    for (var appt of data.appointments) {
      if (appt.staff_id == "0000") {
        data.staff.unshift({
          _key: "0000",
          name: { first: "Unassigned", last: "Appointments" },
        });

        break;
      }
    }

    data.opening_times = data.salon.opening_times[moment().format("d")];

    data.collection = "true";
    res.render(settings.views + "/tables.ejs", data);
  }
});

routes.get("/foodcafe/liquor-products", async (req, res) => {
  view.dashboard_view = "foodproducts";

  res.locals.functions = functions;
  let data = {
    user: req.session.user,
    title: "Liquor Products",
    appointments: [],
    selected_date: "Today",
    include_scripts: [settings.views + "/scripts/salon.ejs"],
    mini_menu: false,
  };

  if (req.cookies.selected_date) {
    // if there's a date that's been previously selected, go to that instead
    res.redirect("/dashboard/foodcafe/food-products");
  } else {
    if (req.cookies && req.cookies.mini_menu) {
      data.mini_menu = req.cookies.mini_menu;
    }

    data.appointments = await appointments.all();
    data.staff = await staff.all();
    data.salon = await salon.find("54855602");

    for (var appt of data.appointments) {
      if (appt.staff_id == "0000") {
        data.staff.unshift({
          _key: "0000",
          name: { first: "Unassigned", last: "Appointments" },
        });
        break;
      }
    }

    data.opening_times = data.salon.opening_times[moment().format("d")];

    data.collection = "false";

    res.render(settings.views + "/foodcafe_products.ejs", data);
  }
});

routes.get("/foodcafe/orders", async (req, res) => {
  try {
    view.dashboard_view = "orders";

    res.locals.functions = functions;
    let data = {
      user: req.session.user,
      title: "Food Orders",
      appointments: [],
      selected_date: "Today",
      include_scripts: [settings.views + "/scripts/salon.ejs"],
      mini_menu: false,
    };

    if (req.cookies.selected_date) {
      // if there's a date that's been previously selected, go to that instead
      res.redirect("/dashboard/foodcafe/food-products");
    } else {
      if (req.cookies && req.cookies.mini_menu) {
        data.mini_menu = req.cookies.mini_menu;
      }

      // data.appointments = await appointments.all()
      // data.staff = await staff.all()
      // data.salon = await salon.find('54855602')

      // for (var appt of data.appointments){
      //     if (appt.staff_id == '0000'){
      //         data.staff.unshift({_key:'0000', name: {first: 'Unassigned',last:'Appointments'}})
      //         break
      //     }
      // }

      // data.opening_times = data.salon.opening_times[moment().format('d')]

      data.collection = "false";

      res.render(settings.views + "/foodcafe_orders.ejs", data);
    }
  } catch (e) {
    console.log(e);
  }
});

routes.get("/subCategory", async (req, res) => {
  try {
    if (req.session.user.role && req.session.user.role < 2) {
      res.redirect("/dashboard/foodcafe/food-products");
    }

    view.dashboard_view = "sub categories";

    res.locals.functions = functions;
    let data = {
      user: req.session.user,
      title: "FoodCafe",
      salon: {},
      appointments: [],
      include_scripts: [settings.views + "/scripts/salon.ejs"],
    };

    if (req.cookies && req.cookies.mini_menu) {
      data.mini_menu = req.cookies.mini_menu;
    }

    data.salon = await salon.find("54855602");
    data.category = await cafeproducts.getCategory("get");

    res.render(settings.views + "/foodCaffeSubCategory.ejs", data);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});
routes.get("/foodcafe", async (req, res) => {
  try {
    if (req.session.user.role && req.session.user.role < 2) {
      res.redirect("/dashboard/foodcafe/food-products");
    }

    view.dashboard_view = "foodcafe";

    res.locals.functions = functions;
    let data = {
      user: req.session.user,
      title: "FoodCafe",
      salon: {},
      appointments: [],
      include_scripts: [settings.views + "/scripts/salon.ejs"],
    };

    if (req.cookies && req.cookies.mini_menu) {
      data.mini_menu = req.cookies.mini_menu;
    }

    data.salon = await salon.find("54855602");

    // res.render(settings.views+'/foodcafe.ejs',data)
    res.redirect("/dashboard/category");
  } catch (e) {
    // res.json("message",e.message)
    res.render("../layouts/error.ejs");
  }
});

routes.get("/category", async (req, res) => {
  if (req.session.user.role && req.session.user.role < 2) {
    res.redirect("/dashboard/foodcafe/food-products");
  }

  view.dashboard_view = "categories";

  res.locals.functions = functions;
  let data = {
    user: req.session.user,
    title: "FoodCafe Categories",
    salon: {},
    appointments: [],
    include_scripts: [settings.views + "/scripts/salon.ejs"],
  };
  data.category = await cafeproducts.getCategory("get");
  //  console.log("================",data.category)

  if (req.cookies && req.cookies.mini_menu) {
    data.mini_menu = req.cookies.mini_menu;
  }

  data.salon = await salon.find("54855602");

  res.render(settings.views + "/foodCaffeCategory.ejs", data);
});
routes.get("/foodCMS", async (req, res) => {
  try {
    if (req.session.user.role && req.session.user.role < 2) {
      res.redirect("/dashboard/foodcafe/food-products");
    }

    view.dashboard_view = "Food Caffe CMS";

    res.locals.functions = functions;
    let data = {
      user: req.session.user,
      title: "FoodCafe CMS",
      salon: {},
      appointments: [],
      include_scripts: [settings.views + "/scripts/salon.ejs"],
    };
    data.details = await home_about_us.getAbout1({ type: "foodcafeCms" });

    if (req.cookies && req.cookies.mini_menu) {
      data.mini_menu = req.cookies.mini_menu;
    }
    res.render(settings.views + "/caffeCms.ejs", data);
  } catch (err) {
    res.render("../layouts/error.ejs");
  }
});
routes.get("/foodcafe/availability", async (req, res) => {
  view.dashboard_view = "availability";
  let data = {
    user: req.session.user,
    title: "Cafe Availability",
    salon: {},
    appointments: [],
    include_scripts: [settings.views + "/scripts/foodCafe.ejs"],
  };
  console.log(settings.views + "/caffeCms.ejs");
  res.render(settings.views + "/cafe_availability.ejs", data);
});
routes.get("/foodcafe/executiveStamp", async (req, res) => {
  view.dashboard_view = "executiveStamp";
  res.locals.functions = functions;
  let data = {
    user: req.session.user,
    title: "Executive Stamp",
    include_scripts: [settings.views + "/scripts/foodCafe.ejs"],
  };

  if (req.cookies && req.cookies.mini_menu) {
    data.mini_menu = req.cookies.mini_menu;
  }

  data.stylists = [];
  res.render(settings.views + "/executiveStamp.ejs", data);
});
routes.get("/foodcafe/foodCafeCheckout/:id?", async (req, res) => {
    view.dashboard_view = "foodCafeCheckout";
    res.locals.functions = functions
    let data = {
            user:req.session.user,
            title: "Checkout",
            include_scripts: [settings.views+'/scripts/checkout.ejs']
        }

    if (req.cookies && req.cookies.mini_menu){
        data.mini_menu = req.cookies.mini_menu
    }

    data.staff = await staff.all()

    if (req.params.id && req.params.id == 'new'){

        transactions.newCafeTransaction(false, req).then((new_cart) => {

            res.redirect('/dashboard/foodcafe/foodCafeCheckout/'+new_cart.id.replace('cafe_cart_',''))

        }).catch(err=>{
            res.send(err)
        })

    } else if (req.params.id){

        localStorage.get('cafe_cart_'+req.params.id).then( async (cart)=>{

            if (cart){

                data.cart_id = 'cafe_cart_'+req.params.id
                data.cart = cart

                if (cart.customer_id){
                    data.customer = await customer.find(cart.customer_id)
                }

                if (typeof data.customer == 'object'){
                    data.recommended_products = await customer.recommendedProducts(data.customer._key)
                    data.customer.next_appointments = await customer.futureAppointments(data.customer._key)
                }


                res.render(settings.views+'/foodCafeCheckout.ejs',data)

            } else {

                transaction.find(req.params.id).then(async (transaction_data)=>{

                    localStorage.set(transaction_data[0].id, transaction_data[0])

                    data.cart_id = transaction_data[0].id
                    data.transaction_key = transaction_data[0]._key
                    data.cart_id = transaction_data[0].id
                    data.cart = transaction_data[0]

                    data.recommended_products = []
                    data.customer = {}

                    if (transaction_data[0].customer_id){
                        try {
                            data.customer = await customer.find(transaction_data[0].customer_id)
                        }
                        catch(err){
                            data.customer = {}
                        }
                    }

                    res.render(settings.views+'/foodCafeCheckout.ejs',data)

                })

            }

        })

    } else {

        data.cart_id = null

        localStorage.list('cafe_cart_').then((carts)=>{

            var sortable = [];
            for (var i in carts) {
                if (!carts[i]._created){
                    carts[i]._created = moment().subtract(1,'day').toISOString()
                }
                sortable.push(carts[i]);
            }

            sortable.sort(function(a,b) {
                return -a._created.localeCompare(b._created)
            });

            data.carts = {}

            sortable.forEach(function(item){
                data.carts[item.id]=item
            })

            res.render(settings.views+'/foodCafeCheckout.ejs',data)
        })

    }
  });
// export

module.exports = functions;
module.exports.routes = routes;
module.exports.settings = settings;
