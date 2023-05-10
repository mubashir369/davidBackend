controller = function () {
  // vars

  var pathname = window.location.pathname.split("/"),
    pathquery = window.location.search.replace(/^\?/, "").split(/&|&&/),
    query = {},
    search_timer,
    date = moment().utc(),
    date_path = window.location.pathname.match(/([0-9]+)\/([0-9]+)\/([0-9]+)/);

  if (date_path) {
    // if a date has been selected in the url somewhere

    date = moment.utc(
      parseInt(date_path[1]) +
        "-" +
        parseInt(date_path[2]) +
        "-" +
        parseInt(date_path[3]),
      "YYYY-M-D"
    );
  }

  scope.query = {};
  scope.view = {
    timer: "",
    selected_customer: null,
    datepicker: false,
    context: "",
    search: "",
    save: false,
    tab: "one",
    booking: {},
    notification: {},
    reschedule: {
      enabled: false,
      key: "",
      prev_start_time: "",
    },
    report: {
      slug: "",
      value: "",
    },
    search_results: false,
    last_path: pathname[pathname.length - 1],
    modal: false,
    add_product: "",
    update_cart: false,
    ok_to_book: false,
    today: moment(),
    header: "calendar",
    print: {},
  };
  scope.view2 = {
    timer: "",
    selected_customer: null,
    datepicker: false,
    context: "",
    search: "",
    save: false,
    tab: "0",
    booking: {},
    notification: {},
    reschedule: {
      enabled: false,
      key: "",
      prev_start_time: "",
    },
    report: {
      slug: "",
      value: "",
    },
    search_results: false,
    last_path: pathname[pathname.length - 1],
    modal: false,
    add_product: "",
    update_cart: false,
    ok_to_book: false,
    today: moment(),
    header: "calendar",
    print: {},
  };

  if (pathquery.length > 0) {
    for (var i = 0; i < pathquery.length; i++) {
      var obj = pathquery[i].split("=");
      scope.query[obj[0]] = obj[1];
    }
  }

  scope.new = {};
  scope.appointments = [];
  scope.dates = [];
  scope.visual_appointments = [];
  scope.new_appointment = {
    service_id: "",
    staff_id: "",
    start_time: "09:00",
    duration: "",
  };

  setTimeout(function () {
    let table_search = document.getElementById("table-search");
    if (scope.query.search && table_search) {
      table_search.value = scope.query.search;
      table_search.dispatchEvent(new KeyboardEvent("keyup", { keyCode: 70 }));
    }
  }, 500);

  scope.cart = {};

  // functions

  scope.clientFilter = function () {
    return scope.clients;
  };

  scope.chgstatus = function (mid) {
    alert(mid);
  };

  scope.toggleContext = function (id, get) {
    let el = document.getElementById("context-" + id);

    if (el.style.display != "none") {
      el.style.display = "none";
    } else {
      contextCloseAll();
    }

    if (scope.view.context == id) {
      scope.view.context = "";
      el.style.display = "none";
      el.classList.remove("in-view");
    } else {
      scope.view.context = id;
      el.style.display = "block";
      el.classList.add("in-view");
    }

    if (document.getElementById("cell-" + id)) {
      let cells = document.getElementsByClassName("cell");
      for (let i = 0; i < cells.length; i++) {
        cells[i].style.zIndex = 1;
      }
      document.getElementById("cell-" + id).style.zIndex = 99;
    }

    if (get) {
      scope.get(get);
    }
  };

  scope.goto = function (path_start, path_end, target) {
    if (path_start && path_start != "undefined") {
      let a = document.createElement("a");
      if (target) {
        a.target = target;
      }
      a.href = path_start + path_end;
      a.click();
    } else if (path_end && path_end != "undefined") {
      let a = document.createElement("a");
      if (target) {
        a.target = target;
      }
      a.href = path_end;
      a.click();
    }
  };
  scope.cafeGroupTransaction = function (key, data) {
    let grouped = [];
    console.log(key ,data);

    if (!localStorage.getItem("cafe_grouped_transactions")) {
      localStorage.setItem("cafe_grouped_transactions", JSON.stringify(grouped));
    } else {
      grouped = JSON.parse(localStorage.getItem("cafe_grouped_transactions"));
    }

    // if (key == "process") {
    //   //    localStorage.removeItem('grouped_transactions')
    //   //    grouped = grouped.join('|')
    //   window.location.href = "/dashboard/foodcafe/foodCafeCheckout/" + grouped[0].id;
    // } else if (key == "ungroup") {
    //   localStorage.removeItem("cafe_grouped_transactions");
    //   window.location.href = "/dashboard/foodcafe/foodCafeCheckout/";
    // } else if (key == "calc_totals") {
    //   scope.grouped_carts = {
    //     total: 0,
    //     sub_total: 0,
    //     tax: 0,
    //   };

    //   grouped_str = grouped
    //     .map((item) => {
    //       item = item.id;
    //       return item;
    //     })
    //     .join("|");

    //   scope.get(
    //     "transactions",
    //     grouped_str + "/find_group_totals",
    //     "grouped_totals"
    //   );
    // } else {
    //   if (scope.view.group_transactions) {
    //     if (scope.view["grouped_" + key]) {
    //       scope.view["grouped_" + key] = "";

    //       grouped = grouped.filter((item) => {
    //         return item.id != key;
    //       });
    //       localStorage.setItem("cafe_grouped_transactions", JSON.stringify(grouped));
    //     } else {
    //       scope.view["grouped_" + key] = "cart-selected";
    //       if (data) {
    //         grouped.push({ id: key, name: data });
    //       } else {
    //         grouped.push({ id: key, name: key });
    //       }
    //       localStorage.setItem("cafe_grouped_transactions", JSON.stringify(grouped));
    //     }
    //   } else {
    //     window.location.href = "/dashboard/foodcafe/foodCafeCheckout/" + key;
    //   }
    // }
  };
  scope.groupTransaction = function (key, data) {
    let grouped = [];

    if (!localStorage.getItem("grouped_transactions")) {
      localStorage.setItem("grouped_transactions", JSON.stringify(grouped));
    } else {
      grouped = JSON.parse(localStorage.getItem("grouped_transactions"));
    }

    if (key == "process") {
      //    localStorage.removeItem('grouped_transactions')
      //    grouped = grouped.join('|')
      window.location.href = "/dashboard/checkout/" + grouped[0].id;
    } else if (key == "ungroup") {
      localStorage.removeItem("grouped_transactions");
      window.location.href = "/dashboard/checkout";
    } else if (key == "calc_totals") {
      scope.grouped_carts = {
        total: 0,
        sub_total: 0,
        tax: 0,
      };

      grouped_str = grouped
        .map((item) => {
          item = item.id;
          return item;
        })
        .join("|");

      scope.get(
        "transactions",
        grouped_str + "/find_group_totals",
        "grouped_totals"
      );
    } else {
      if (scope.view.group_transactions) {
        if (scope.view["grouped_" + key]) {
          scope.view["grouped_" + key] = "";

          grouped = grouped.filter((item) => {
            return item.id != key;
          });
          localStorage.setItem("grouped_transactions", JSON.stringify(grouped));
        } else {
          scope.view["grouped_" + key] = "cart-selected";
          if (data) {
            grouped.push({ id: key, name: data });
          } else {
            grouped.push({ id: key, name: key });
          }
          localStorage.setItem("grouped_transactions", JSON.stringify(grouped));
        }
      } else {
        window.location.href = "/dashboard/checkout/" + key;
      }
    }
  };

  scope.selectDate = function (date, type, time) {
    scope.view.datepicker_simple = false;

    if (typeof date == "string" && !time) {
      date = moment(date).utc();
      let minutes = Math.ceil(date.get("minute") / 15) * 15;
      let hours = date.get("hour");
      if (minutes == 60) {
        hours++;
      }

      date.set({
        hours: hours,
        minutes: minutes,
        seconds: 0,
      });
    } else if (!date && scope.selected_date && scope.selected_date.full) {
      date = moment(scope.selected_date.full).utc();
      let minutes = Math.ceil(date.get("minute") / 15) * 15;
      let hours = date.get("hour");
      if (minutes == 60) {
        hours++;
      }

      date.set({
        hours: hours,
        minutes: minutes,
        seconds: 0,
      });
    }

    if (type == "end") {
      if (!scope.selected_end_date) {
        scope.selected_end_date = scope.selected_date;
      }

      if (time == "time") {
        date = date.split(":");

        if (date.length > 2) {
          date = scope.selected_end_date.obj.set({
            hours: date[0],
            minutes: date[1],
            seconds: 0,
          });
        } else {
          date = scope.selected_end_date.obj.set({
            hours: date[0],
            minutes: date[1],
            seconds: 0,
          });
        }

        if (!date.isDST()) {
          //    date.add(1, 'hours')
        }
      } else if (scope.selected_end_date && scope.selected_end_date.obj) {
        let minutes =
          Math.ceil(scope.selected_date.obj.get("minute") / 15) * 15;
        date.set({
          hours: scope.selected_date.obj.get("hour"),
          minutes: minutes,
          seconds: 0,
        });
      }

      scope.selected_end_date = {
        obj: date,
        full: date.toISOString(),
        year: date.format("YYYY"),
        year_short: date.format("YY"),
        month: date.format("M"),
        date: date.format("D"),
        month_padded: date.format("MM"),
        date_padded: date.format("DD"),
        date_string: date.format("YYYY-MM-DD"),
        date_string_short: date.format("ddd Do MMM"),
        date_string_long: date.format("dddd Do MMMM"),
        date_string_time: date.format("dddd Do MMMM [at] H:mm a"),
        time: date.format("HH:mm"),
        day: date.format("dddd"),
        day_short: date.format("ddd"),
        ordinal: date.format("Do"),
        month_name: date.format("MMMM"),
        month_name_year: date.format("MMMM 'YY"),
        month_name_short: date.format("MMM"),
      };

      scope.dates = getDaysArray(
        scope.selected_date.year,
        scope.selected_date.month
      );
    } else {
      if (time == "time") {
        date = date.split(":");

        if (date.length > 2) {
          date = scope.selected_date.obj.set({
            hours: date[0],
            minutes: date[1],
            seconds: 0,
          });
        } else {
          date = scope.selected_date.obj.set({
            hours: date[0],
            minutes: date[1],
            seconds: 0,
          });
        }

        if (!date.isDST()) {
          //    date.add(1, 'hours')
        }
      } else if (scope.selected_date && scope.selected_date.obj) {
        let minutes =
          Math.ceil(scope.selected_date.obj.get("minute") / 15) * 15;
        date.set({
          hours: scope.selected_date.obj.get("hour"),
          minutes: minutes,
          seconds: 0,
        });
      }

      scope.selected_date = {
        months: [
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
        ],
        months_short: [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ],
        dates: [
          "1st",
          "2nd",
          "3rd",
          "4th",
          "5th",
          "6th",
          "7th",
          "8th",
          "9th",
          "10th",
          "11th",
          "12th",
          "13th",
          "14th",
          "15th",
          "16th",
          "17th",
          "18th",
          "19th",
          "20th",
          "21st",
          "22nd",
          "23rd",
          "24th",
          "25th",
          "26th",
          "27th",
          "28th",
          "29th",
          "30th",
          "31st",
        ],
        days: [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ],
        days_short: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        obj: date,
        full: date.toISOString(),
        year: date.format("YYYY"),
        year_short: date.format("YY"),
        month: date.format("M"),
        date: date.format("D"),
        month_padded: date.format("MM"),
        date_padded: date.format("DD"),
        date_string: date.format("YYYY-MM-DD"),
        date_string_short: date.format("ddd Do MMM"),
        date_string_long: date.format("dddd Do MMMM"),
        date_string_time: date.format("dddd Do MMMM [at] H:mm a"),
        time: date.format("HH:mm"),
        day: date.format("dddd"),
        day_short: date.format("ddd"),
        ordinal: date.format("Do"),
        month_name: date.format("MMMM"),
        month_name_year: date.format("MMMM 'YY"),
        month_name_short: date.format("MMM"),
      };

      if (date.isSame(moment(), "day")) {
        scope.selected_date.today = "is-today";
      } else {
        scope.selected_date.today = "isnt-today";
      }

      scope.dates = getDaysArray(
        scope.selected_date.year,
        scope.selected_date.month
      );
    }
  };

  scope.datepickerClass = function (date, time, obj) {
    if (time) {
      if (scope.selected_date && scope.selected_date.time == date) {
        return "start_time";
      } else if (
        scope.selected_end_date &&
        scope.selected_end_date.time == date
      ) {
        return "end_time";
      } else {
      }
    } else {
      if (date.iso) {
        let date_obj = moment(date.iso);

        if (obj) {
          if (
            !scope.view.date_check ||
            obj != scope.view.date_check.toISOString()
          ) {
            scope.view.date_check = moment(obj);
          }

          if (scope.view.date_check.isSame(date_obj, "day")) {
            return "end_date";
          }
        } else {
          if (
            scope.selected_date &&
            scope.selected_date.obj &&
            scope.selected_date.obj.isSame(date_obj, "day")
          ) {
            return "start_date";
          } else if (
            scope.selected_end_date &&
            scope.selected_end_date.obj &&
            scope.selected_end_date.obj.isSame(date_obj, "day")
          ) {
            return "end_date";
          } else {
            return date.type;
          }
        }
      } else {
        return date.type;
      }
    }
  };

  scope.getDay = function (idx) {
    return scope.selected_date.days[idx];
  };

  scope.selectStaff = function (key) {
    scope.view.selected_staff = key;
    scope.view.booking.staff_id = key;
  };

  scope.searchApi2 = function (collection, str, prefix, client_key) {
    //alert('a')

    clearTimeout(scope.view.typing);
    scope.view.typing = setTimeout(function () {
      let url = "/api/" + collection + "/search?str=" + str.toLowerCase();

      if (client_key) {
        url += "&client_key=" + client_key;
      }
      console.log(url);
      http(url)
        .then((data) => {
          scope[collection] = JSON.parse(data);

          if (prefix) {
            scope.view[prefix + "_search_results"] = true;
          } else {
            scope.view.search_results = true;
          }

          if (
            collection == "products" &&
            scope[collection].length == 1 &&
            scope.cart &&
            scope.view.pasted === true
          ) {
            scope.view.product_search = "";
            scope.view.pasted = false;
            scope.view.product_search_results = false;
            scope.addToCart("products", scope.products[0]._key, scope.cart.id);
          }

          if (scope[collection].length == 0) {
            scope.notify(
              "Item not found",
              "error",
              50,
              "fa-exclamation-circle"
            );
          }

          // console.log(scope[collection])
        })
        .catch((err) => {
          scope.notify(err, "error");
        });
    }, 500);
  };
  scope.searchSalonMem = function (val) {
    let url = `/api/members/salonMemSearch?str=${val.toLowerCase()}`;
    http(url).then((data) => {
      scope.members = JSON.parse(data);
    });
  };
  scope.searchApi = function (collection, str, prefix, client_key, link1) {
    clearTimeout(scope.view.typing);
    scope.view.typing = setTimeout(function () {
      var link = "search";
      if (link1) {
        link = link1;
      }
      // let url = '/api/'+collection+'/search?str='+str.toLowerCase()
      let url = `/api/${collection}/${link}?str=${str.toLowerCase()}`;

      if (client_key) {
        url += "&client_key=" + client_key;
      }

      http(url)
        .then((data) => {
          scope[collection] = JSON.parse(data);
          if (collection == "customers") {
            let newData = JSON.parse(data);
            scope[collection] = newData.data;
            scope.changepaginationcount(newData.totalCount);
          }

          if (prefix) {
            scope.view[prefix + "_search_results"] = true;
          } else {
            scope.view.search_results = true;
          }

          if (
            collection == "products" &&
            scope[collection].length == 1 &&
            scope.cart &&
            scope.view.pasted === true
          ) {
            scope.view.product_search = "";
            scope.view.pasted = false;
            scope.view.product_search_results = false;
            scope.addToCart("products", scope.products[0]._key, scope.cart.id);
          }

          if (scope[collection].length == 0) {
            scope.notify(
              "Item not found",
              "error",
              50,
              "fa-exclamation-circle"
            );
          }

          // console.log(scope[collection])
        })
        .catch((err) => {
          scope.notify(err, "error");
        });
    }, 500);
  };
  scope.searchCustom = async function (url, param) {
    await scope
      .get(url)
      .then(async (data) => {
        console.log(data);
        scope.members = data;
        return false;
      })
      .catch((err) => {
        scope.notify(err);
      });
  };

  scope.searchMemCustomerApi = function (collection, str, prefix) {
    clearTimeout(scope.view.typing);
    scope.view.typing = setTimeout(function () {
      let url =
        "/api/" + collection + "/searchbymember?str=" + str.toLowerCase();

      http(url)
        .then((data) => {
          scope[collection] = JSON.parse(data);

          if (prefix) {
            scope.view[prefix + "_search_results"] = true;
          } else {
            scope.view.search_results = true;
          }

          // console.log(scope[collection])
        })
        .catch((err) => {
          scope.notify(err, "error");
        });
    }, 500);
  };

  scope.newServiceItem = function (type, index) {
    if (!scope.new.service_items) {
      scope.new.service_items = [];
    }

    if (type == "remove" && index >= 0) {
      scope.new.service_items.splice(parseInt(index), 1);
    } else {
      scope.new.service_items.push({
        name: "",
        duration: "",
        skills: "",
        wait_time: "",
      });
    }
  };
  scope.newServiceItem1 = function (type, index) {
    // console.log("=====================",scope.new.service_tasks)
    if (!scope.new.service_tasks) {
      scope.new.service_tasks = {};
      scope.new.service_tasks.service_tasks = {};
      scope.new.service_tasks.service_tasks.service_items = [];
    }

    if (type == "remove" && index >= 0) {
      scope.new.service_tasks.service_tasks.service_items.splice(
        parseInt(index),
        1
      );
    } else {
      if (
        scope.new.service_tasks === null ||
        scope.new.service_tasks === undefined
      ) {
        scope.new.service_tasks = {};
        scope.new.service_tasks.service_items = [];
        scope.new.service_tasks.service_items.push({
          name: "",
          duration: "",
          skills: "",
          wait_time: "",
        });
      } else {
        console.log(scope.new.service_tasks);
        scope.new.service_tasks.service_tasks.service_items.push({
          name: "",
          duration: "",
          skills: "",
          wait_time: "",
        });
      }
    }
  };
  /***home slider */
  scope.newhomeSlider_items = function (type, index) {
    if (!scope.new.homeSlider_items) {
      scope.new.homeSlider_items = [];
    }

    if (type == "remove" && index >= 0) {
      scope.new.homeSlider_items.splice(parseInt(index), 1);
    } else {
      scope.new.homeSlider_items.push({
        img: "",
        name: "",
        split_percent: "",
      });
    }
  };
  scope.newAboutService_items = function (type, index) {
    // alert("gchf")
    if (!scope.new.aboutService_items) {
      scope.new.aboutService_items = [];
    }

    if (type == "remove" && index >= 0) {
      scope.new.aboutService_items.splice(parseInt(index), 1);
    } else {
      scope.new.aboutService_items.push({
        aboutService_name: "",
      });
    }
  };
  scope.newTimelineItem = function (type, index) {
    if (!scope.new.timeline_items) {
      scope.new.timeline_items = [];
    }

    if (type == "remove" && index >= 0) {
      scope.new.timeline_items.splice(parseInt(index), 1);
    } else {
      scope.new.timeline_items.push({
        timeIcon: "",
        timeTitle: "",
        timeDescrip: "",
      });
    }
  };
  scope.downloadInvoiceForOrder = async function (id, a, b, c, d) {
    let member = localStorage.getItem("appointment_payload");
    member = JSON.parse(member).customer;
    d = "Salon Product Invoice";
    // console.log("sss",member);
    // console.log(`../../../default_routes/generateReport?id=${id}&first=${member.name.first}&last=${member.name.last}&email=${member.email}&text=${d}`);
    // window.location.href =`../../../default_routes/generateReportMemberOrder?id=${id}&first=${member.name.first}&last=${member.name.last}&email=${member.email}&text=${d}`
  };
  scope.downloadInvoice = async function (id, a, b, c, d) {
    console.log(id, a, b, c);
    window.location.href = `../../../default_routes/generateReport?id=${id}&first=${a}&last=${b}&email=${c}&text=${d}`;
  };
  scope.downloadQr = async function (id) {
    window.location.href = `../../../default_routes/downloadQr?_key=${id}`;
  };

  // ===== Micro website====
  scope.microSlider = function (type, index) {
    // alert("gchf")
    if (!scope.new.microSlider_items) {
      scope.new.microSlider_items = [];
    }

    if (type == "remove" && index >= 0) {
      scope.new.microSlider_items.splice(parseInt(index), 1);
    } else {
      scope.new.microSlider_items.push({
        aboutService_name: "",
      });
    }
  };
  scope.microPortfolio = function (type, index) {
    // alert("gchf")
    if (!scope.new.microPortfolio_items) {
      scope.new.microPortfolio_items = [];
    }

    if (type == "remove" && index >= 0) {
      scope.new.microPortfolio_items.splice(parseInt(index), 1);
    } else {
      scope.new.microPortfolio_items.push({
        img: "",
        portfolioTitle: "",
        portfolioDescrip: "",
      });
    }
  };

  scope.sortStaff = function () {
    scope.staff.map((stylist, i) => {
      stylist.position = i;
      scope.post("staff", stylist);
    });
  };

  scope.resetNew = function () {
    return new Promise(function (resolve, reject) {
      scope.new = {};
      resolve();
    });
  };

  watch["new.start_date"] = function (data) {
    scope.new.expiry_date = moment(data).add(1, "years").toISOString();
  };

  scope.edit = function (collection, obj, del) {
    if (obj.consultation) {
      obj = obj.consultation;
    }
    if (obj.items) {
      scope.new.items = JSON.parse(JSON.stringify(obj.items));
    }
    if (obj.service_items) {
      scope.new.service_items = JSON.parse(JSON.stringify(obj.service_items));
    }

    if (typeof obj == "string") {
      scope.new._key = obj;
    } else {
      scope.new = JSON.parse(JSON.stringify(obj));
    }
    
    if(collection=="cafeproducts"){  
      changed(scope.new)
     
    }
    if (collection == "services") {
      if (!scope.new.prices) {
        scope.new.prices = [];
      }
      if (scope.salon.levels) {
        scope.new.prices = scope.salon.levels.map((item, i) => {
          if (scope.new.prices[i] && scope.new.prices[i].value) {
            item.value = scope.new.prices[i].value;
          }
          return item;
        });
      }
    }

    if (del) {
      if (collection == "appointments") {
        let appt = document.querySelector("#appointment-" + obj);
        if (appt && appt.dataset.link_id) {
          scope
            .get("appointments/" + appt.dataset.link_id + "/get_linked", false)
            .then((app_data) => {
              if (app_data.length > 1) {
                scope.view.linked_appts_show = true;
              } else {
                scope.view.linked_appts_show = false;
              }

              scope.view.modal = "show_delete";
            })
            .catch(() => {
              scope.view.modal = "show_delete";
            });
        } else {
          scope.view.modal = "show_delete";
        }
      } else {
        scope.view.modal = "show_delete";
      }
    } else if (collection == "template") {
      scope.view.modal = "show_template";
    } else {
      scope.view.modal = "show_edit";
    }
  };

  scope.print = function (key) {
    var a = document.createElement("a");
    a.target = "print";
    a.href = "/dashboard/checkout/transactions/print/" + key;
    a.click();
  };
  scope.toggleSellOnline = function () {
    scope.new.sell_online = !scope.new.sell_online;
    // scope.post('products',scope.new).then((product_data)=>{
    //     scope.notify('Saved')
    // })
  };
  scope.emailReceipt = function (key) {
    if (key) {
      scope.view.modal = "send";
      scope.view.receipt = {
        key: key,
      };
    } else if (scope.view.receipt) {
      scope.view.modal = false;
      scope
        .get(
          "transactions",
          scope.view.receipt.key + "/send_receipt",
          "receipt"
        )
        .then((data) => {
          scope.notify(data);
          delete scope.view.receipt;
        })
        .catch((err) => {
          scope.notify(err, "error");
        });
    }
  };

  scope.newClient = function (modal) {
    let img_upload = document.querySelector("#fileDisplayArea img");
    if (img_upload) {
      img_upload.setAttribute("src", "/images/avatars/Profile_Placeholder.svg");
    }
    scope.new.items = [];
    scope.new.service_items = [];
    scope.new = {};
    if (modal) {
      scope.view.modal = modal;
    } else {
      scope.view.modal = "show_edit";
    }
  };

  scope.blockClient = function (client) {
    client.blocked = !client.blocked;
    scope.post("customers", client).then((cust_data) => {
      scope.notify("Customer Blocked");
    });
  };

  scope.newObj = function (type) {
    let img_upload = document.querySelector("#fileDisplayArea img");

    if (img_upload) {
      img_upload.setAttribute("src", "/images/avatars/Profile_Placeholder.svg");
    }
    scope.new.items = [];
    scope.new.service_items = [];
    scope.new.avatar = "";
    scope.new = {};

    if (type == "services") {
      scope.new.prices = scope.salon.levels;
    }

    if (type == "liquor products") {
      scope.new.type = false;
      scope.new.typeoff = 1;
      //alert('liquor products')
    }

    if (type == "vouchers") {
      scope.new.barcode = uuid();
      if (scope.cart && scope.cart.id) {
        scope.new.cart_id = scope.cart.id;
      }
    }

    scope.view.modal = "show_edit";
  };
  scope.addNewStaff = function () {
    scope
      .post("staff/saveStaff", scope.new)
      .then((data) => {
        scope.notify("Saved");
        modalCloseAll();
        window.location.href = window.location.href;
      })
      .catch((err) => {
        scope.notify(err);
      });
  };

  scope.newTemplate = function (type, index, value) {
    if (type == "add_input") {
      scope.new.inputs.push({
        field: "",
        value: "",
        type: "textparagraph",
        description: "",
      });
    } else if (type == "remove_input") {
      let inputs = JSON.parse(JSON.stringify(scope.new.inputs));

      inputs.splice(index, 1);

      scope.new.inputs = JSON.parse(JSON.stringify(inputs));
    } else if (type == "add_option") {
      let inputs = JSON.parse(JSON.stringify(scope.new.inputs));
      if (!inputs[index].options) {
        inputs[index].options = [];
      }
      inputs[index].options.push({ value: "" });

      scope.new.inputs = JSON.parse(JSON.stringify(inputs));
    } else if (type == "remove_option") {
      let inputs = JSON.parse(JSON.stringify(scope.new.inputs));

      inputs[parseInt(index)].options.filter((item) => {
        return item.value != value;
      });

      scope.new.inputs = JSON.parse(JSON.stringify(inputs));
    } else if (type == "update") {
      let inputs = JSON.parse(JSON.stringify(scope.new.inputs));
      scope.new.inputs = JSON.parse(JSON.stringify(inputs));
    } else if (type == "delete") {
      scope.salon.consultation_forms.splice(index, 1);
      scope
        .post("salon", scope.salon)
        .then((salon_data) => {
          scope.notify("Template Deleted");
        })
        .catch((err) => {
          scope.notify(err, "error");
        });
    } else if (type == "edit") {
      scope.new = JSON.parse(
        JSON.stringify(scope.salon.consultation_forms[index])
      );
      scope.new.index = index;
      scope.view.modal = "show_template";
    } else if (type == "save") {
      if (scope.new.index) {
        index = scope.new.index;
        delete scope.new.index;
        scope.salon.consultation_forms[index] = scope.new;
      } else {
        if (!scope.salon.consultation_forms) {
          scope.salon.consultation_forms = [];
        }
        scope.salon.consultation_forms.push(scope.new);
      }

      scope
        .post("salon", scope.salon)
        .then((salon_data) => {
          scope.notify("Template Saved");
        })
        .catch((err) => {
          scope.notify(err, "error");
        });
    } else {
      scope.new = {
        name: "",
        inputs: [],
      };

      scope.view.modal = "show_template";
    }
  };

  scope.reissueVoucher = function (voucher) {
    scope
      .post("vouchers/reissue", voucher)
      .then((voucher_data) => {
        if (voucher_data.email) {
          scope.notify("Voucher Reissued to " + voucher_data.email);
        } else {
          scope.notify("Voucher Reissued");
        }
      })
      .catch((err) => {
        scope.notify(err, "error");
      });
  };

  scope.save = function (collection, obj, member_id) {
    if (collection == "services") {
      let key = obj._key; // needed as obj will be reset
      //
      // if (!obj.service_items || obj.service_items.length == 0){
      //     scope.notify('Please add at least 1 service item', 'error')
      //     return
      // }

      scope.post("services", obj).then((data) => {
        scope.view.modal = false;

        if (key) {
          scope.notify("Service Saved");
        } else {
          scope.notify("Service Added");
        }
      });
    } else if (collection == "salon") {
      scope
        .post("salon", obj)
        .then((data) => {
          scope.view.save = false;
          scope.notify("Saved");
        })
        .catch((err) => {
          scope.notify(err, "error");
        });
    } else if (collection == "service_tasks") {
      const data1 = {};

      data1.service_tasks = obj.service_tasks.service_tasks;
      data1.service_id = obj._key;
      data1.member_id = member_id;
      data1._key = obj.service_tasks._key;
      scope
        .post(`members/saveServiceTasks`, data1)
        .then((data) => {
          // scope.view.save = false;
          scope.notify("Saved");
          setTimeout((win) => {
            window.location.href = window.location.href;
          }, 2000);
        })
        .catch((err) => {
          scope.notify(err, "error");
        });
    }
  };

  scope.approveAbsence = function (key, val) {
    var payload = {
      key: key,
      approved: val,
    };

    scope.post("staff/approve_booking", payload).then((data) => {
      scope.notify(data.status);
      scope.staff_bookings = scope.staff_bookings.map((booking) => {
        if (booking._key == data._key) {
          booking = data;
        }
        return booking;
      });
    });
  };

  scope.newNotification = function (data, key) {
    if (data == "new") {
      contextCloseAll();
      scope.new_notification = {
        type: "New Notification",
        msg: "",
        data: {
          url: "",
          customer_id: "",
          appointment_url: "",
        },
      };
      scope.view.modal = "new_notification";
    } else if (data == "send") {
      scope
        .post("user_notifications/save", scope.new_notification)
        .then((data) => {
          scope.get("user_notifications/check_new").then((count) => {
            scope.view.user_notifications = count[0];
            if (
              scope.notifications &&
              scope.notifications.length > 0 &&
              count[0] > 0
            ) {
              scope.get("user_notifications", "all", "notifications");
            }
          });

          scope.new_notification = {
            type: "New Notification",
            msg: "",
            data: {
              url: "",
              customer_id: "",
              appointment_url: "",
            },
          };
          modalCloseAll();
          scope.notify("Sent");
        })
        .catch((err) => {
          scope.notify(err, "error");
        });
    } else if (data && key) {
      contextCloseAll();

      scope.new_notification = {
        type: "New Notification",
        msg: "",
        data: {
          url: "",
          customer_id: "",
          appointment_url: "",
        },
      };

      if (data == "appointment_url") {
        let client_name =
          key.customer.name.first + " " + key.customer.name.last;
        client_name = client_name
          .toLowerCase()
          .replace(/\b[a-z]/g, function (letter) {
            return letter.toUpperCase();
          });
        scope.new_notification.type =
          client_name + " on " + moment(key.date).format("ddd Do MMM h:mma");
        scope.new_notification.data.customer_id = key.customer._key;
        key =
          "/dashboard/calendar/" +
          moment(key.date).format("YYYY/MM/DD") +
          "?appointment_id=" +
          key._key;
      }

      if (data == "customer_id") {
        let client_name = key.name.first + " " + key.name.last;
        client_name = client_name
          .toLowerCase()
          .replace(/\b[a-z]/g, function (letter) {
            return letter.toUpperCase();
          });
        scope.new_notification.type = client_name;
        key = key._key;
      }

      scope.new_notification.data[data] = key;

      scope.view.modal = "new_notification";
    }
  };
  scope.saveFoodProduct1 = function () {
    console.log(scope.new);
    if(scope.new.variants.length<0){
    
     return scope.notify("Please Provide Atleast one variant");
    }

    if (parseInt(scope.new.rating) > 5 || parseInt(scope.new.rating) < 1) {
      scope.notify("Rating should be between 1 to 5 number");
    } else {
      scope.new.discounted =
        scope.new.price -
        (parseFloat(scope.new.price) * scope.new.discount) / 100;

      scope.post("cafeproducts", scope.new).then((product_data) => {
        scope.view.modal = false;
        scope.new = product_data;
        // scope.new = {}
        scope.notify("Saved");
          setTimeout(() => {
            window.location.reload();
          }, 2000);
      });
    }
  };
  scope.getCafeTime = () => {
    let url = `/api/cafeproducts/getCafeTime?id=17480732`;
    console.log("cafeTimeUrl", url);
    http("get", url).then((data) => {
      data = JSON.parse(data);

      scope.cafe = data[0];
    });
  };
  scope.get = function (collection, id, output) {
    return new Promise(function (resolve, reject) {
      let url = collection;
      if (!collection.match(/^\//)) {
        url = "/api/" + collection;
      }

      if (id) {
        url += "/" + id;
      }

      if (
        id &&
        id.match(/keys\=/) &&
        scope.selected_date &&
        scope.selected_date.date_string
      ) {
        url += "&&date=" + scope.selected_date.date_string;
      }
      console.log("urllllllllllllll", url, scope.view.dashboard_view);
      //    scope.view.modal = false
      http("get", url)
        .then((data) => {
          data = JSON.parse(data);
          console.log(url, "sssssssswwwwwwww", data, url);
          if (output) {
            scope[output] = data;
          } else {
            scope[collection] = data;
          }
          if (collection == "transactions") {
            if (output == "cart") {
              scope.cart = data;
            } else if (id.match(/find_grouped/)) {
              scope.groupTransaction("select", scope.transactions[0]);
              scope.groupTransaction("calc_totals");
            } else if (id.match(/delete/)) {
              scope.notify("Deleted", "notification", 2).then(() => {
                scope.view.modal = "close";
                //    window.location.href="/dashboard/checkout"
              });
            }
          }

          if (collection == "reports" && data.inputs) {
            let inputs = JSON.parse(JSON.stringify(data.inputs));
            scope.report_inputs = inputs;
          }

          resolve(data);
        })
        .catch((err) => {
          if (err.match(/^\[/) || err.match(/^\{/)) {
            err = JSON.parse(err);
          }
          resolve([]);
        });
    });
  };

  scope.post = function (collection, obj) {
    return new Promise(function (resolve, reject) {
      let url;

      if (collection.match(/^\//)) {
        url = collection;
      } else {
        url = "/api/" + collection;
      }
      //
      // scope.view.modal = false

      http("post", url, obj)
        .then((data) => {
          if (data.match(/^{/)) {
            data = JSON.parse(data);
            console.log(scope[collection]);
            if (
              scope[collection] &&
              typeof scope[collection] == "object" &&
              typeof scope[collection].findIndex == "function"
            ) {
              let idx = scope[collection].findIndex((item) => {
                return item._key == data._key;
              });

              if (idx >= 0) {
                scope[collection][idx] = data;
              } else {
                window.location.reload();
                // scope[collection].push(data)
                // scope[collection].reverse()
                //    scope.get(collection)
              }

              // for (var i in scope[collection]){
              //     console.log('newo',1)
              //     if (scope[collection][i]._key == data._key){
              //         scope[collection][i] = data
              //         break;
              //     }
              //     if (i >= scope[collection].length-1){
              //         scope[collection].unshift(data)
              //     }
              // }
            } else {
              scope[collection] = data;
            }
          }

          if (typeof data == "string" && data.match(/^\[/)) {
            data = JSON.parse(data);
          }

          if (collection == "vouchers" && data.cart_id) {
            scope.addToCart("vouchers", data._key, data.cart_id);
          }

          resolve(data);
          scope.resetNew();
        })
        .catch((err) => {
          console.log(err);
          reject(err);
        });
    });
  };

  scope.put = function (collection, id, obj) {
    return new Promise(function (resolve, reject) {
      let url;

      if (collection.match(/^\//)) {
        url = collection + "/" + id;
      } else {
        url = "/api/" + collection + "/" + id;
      }

      scope.view.modal = false;

      http("put", url, obj)
        .then((data) => {
          data = JSON.parse(data);

          if (collection == "appointments") {
          }

          if (collection == "transactions") {
            scope.cart = data;
            let items = JSON.parse(JSON.stringify(data.items));
            scope.cart.items = items;
            scope.notify("Updated");
          }

          resolve(data);

          scope.resetNew();
        })
        .catch((err) => {
          console.log(err);
          scope.notify(err, "error", 10, "fa-exclamation-circle");
        });
    });
  };

  scope.delete = function (collection, id, output) {
    if (!collection || !id) {
      return false;
    }

    let url;

    if (collection == "staff_bookings") {
      url = "/api/staff/" + id + "/deletebooking";
    } else {
      if (collection.match(/^\//)) {
        url = collection;
      } else {
        url = "/api/" + collection + "/" + id;
      }
    }

    http("delete", url)
      .then((data) => {
        data = JSON.parse(data);

        if (collection == "appointments") {
          let appointment_el = document.getElementById("appointment-" + id);

          if (appointment_el) {
            appointment_el.parentNode.removeChild(appointment_el);
          }
        } else {
          location.reload();

          // if (output){
          //     let obj = scope[output].find((o, i) => {
          //         if (i == id || o._key === id) {
          //             scope[output].splice(i,1)
          //             return true; // stop searching
          //         }
          //     })
          // } else {
          //     let obj = scope[collection].find((o, i) => {
          //         if (i == id || o._key === id) {
          //             scope[collection].splice(i,1)
          //             return true; // stop searching
          //         }
          //     })
          // }
        }

        if (collection == "transactions") {
          scope.view.modal = false;
        }

        scope.view.modal = false;
        scope.notify("Deleted");
      })
      .catch((err) => {
        scope.notify(err, "error", 5, "fa-times");
        scope.view.modal = false;
        //    console.log(err)
      });
  };

  scope.push = function (obj, item, save, save_obj) {
    copy = JSON.parse(JSON.stringify(item));

    if (!copy._id) {
      copy._id = Date.now();
    }

    if (typeof obj == "string") {
      let obj_ref = obj.replace("scope.", ""),
        obj_val = [];
      _.setWith(scope, obj_ref, obj_val, Object);
      obj = _.get(scope, obj_ref);
    }

    if (obj.indexOf(item) >= 0) {
      obj.splice(obj.indexOf(item), 1);
    } else if (
      typeof item == "object" ||
      (typeof item == "string" && !item.match(/(.*?)\.(.*?)/)) ||
      typeof item == "number"
    ) {
      obj.push(copy);
      item = "";
    } else {
      scope.notify("Please add a value", "error", 5, "fa-edit");
      return;
    }

    if (save) {
      if (!save_obj) {
        save_obj = obj;
      }
      scope.post(save, save_obj).then((data) => {
        scope.notify("Saved");
      });
    }
  };

  scope.update = function (obj, idx, item, save, save_obj) {
    obj[idx] = item;

    if (save) {
      scope.post(save, save_obj).then((data) => {
        scope.notify("Saved");
      });
    }
  };

  scope.splice = function (obj, item, save, save_obj) {
    obj.splice(item, 1);

    if (save) {
      scope.post(save, save_obj).then((data) => {
        scope.notify("Saved");
      });
    }
  };
  scope.saveSub = async function (id, pk, i) {
    const obj = document.getElementById(id).value;
    const d = new Date();
    let time = d.getTime();
    const pp = time;
    const data1 = { name: obj, id: pk, i: pp };
    console.log(data1);
    if (obj) {
      copy = JSON.parse(JSON.stringify(data1));
      //    console.log("=============",copy)

      await scope.post("cafeproducts/addSubCat", copy);
      scope.notify("Category added");
      //    scope.get('dashboard/subCategory')
      window.location.href = window.location.href;
    }
  };
  scope.changeTab = function (i) {
    scope.currentTab = i;
    // console.log(scope.currentTab)
    scope.view2.tab = i;
    localStorage.setItem("currentTab", scope.currentTab);
    //   console.log(localStorage.getItem("currentTab"))
  };
  scope.loadMenu = function () {
    if (localStorage.getItem("currentTab")) {
      scope.view2.tab = localStorage.getItem("currentTab");
    }
  };

  scope.isSelected = function (data1, data2) {
    if (data1 && data2 && data1 == data2) {
      return "selected";
    }
  };

  scope.notify = function (msg, type, duration, icon) {
    if (!msg || typeof msg != "string") {
      return;
    }

    return new Promise(function (resolve, reject) {
      if (msg == "cancel") {
        scope.view.notification = {};
        return false;
      }

      if (typeof duration == "undefined") {
        duration = 3000;
      } else {
        duration = parseInt(duration) * 1000;
      }

      scope.view.notification.msg = msg
        .replace(/<\/?[^>]+(>|$)/g, "")
        .replace(/^"(.+(?="$))"$/, "$1");

      if (type) {
        scope.view.notification.type = type;
      } else {
        scope.view.notification.type = "";
      }

      if (icon) {
        scope.view.notification.icon = icon;
      } else {
        if (type == "error") {
          scope.view.notification.icon = "fa-exclamation-circle";
        } else {
          scope.view.notification.icon = "fa-check";
        }
      }

      if (duration > 0) {
        setTimeout(function () {
          scope.view.notification = {};
          resolve();
        }, duration);
      }
    });
  };

  scope.gotoDate = function (data) {
    if (data.iso && data.iso.match(/Z$/)) {
      window.location.href =
        "/dashboard/calendar/" + moment(data.iso).format("YYYY/M/D");
    }
  };

  scope.count = function (obj) {
    return obj.length;
  };

  scope.truncate = function (str, length) {
    if (str.length >= length) {
      str = str.substring(0, length) + "...";
    }
    return str;
  };

  scope.parseTDate = function (name_obj) {
    console.log(name_obj);
    if (new Date(name_obj) !== "Invalid Date" && !isNaN(new Date(name_obj))) {
      //let n  = name_obj.split('T')[1].split(':')
      //return name_obj.split('T')[0]+' '+n[0]+':'+n[1]
      return moment(name_obj).format("YYYY-MM-DD hh:mm");
    }
  };

  scope.parseDate = function (type) {
    if (type == "short") {
      return (
        scope.selected_date.day_short +
        " " +
        scope.selected_date.ordinal +
        " " +
        scope.selected_date.month_name
      );
    } else if (type == "month_long") {
      return scope.selected_date.month_name;
    }
  };

  scope.parseName = function (name_obj) {
    if (name_obj && name_obj.first && name_obj.last) {
      return name_obj.first + " " + name_obj.last;
    } else if (name_obj && name_obj.first) {
      return name_obj.first;
    } else if (name_obj && name_obj.last) {
      return name_obj.last;
    }
  };

  scope.parsePrice = function (price) {
    if (price && parseFloat(price)) {
      return "£" + parseFloat(price).toFixed(2);
    } else {
      return "£0.00";
    }
  };

  scope.parseString = function (input) {
    if (input) {
      return input.replace(/_/g, " ");
    }
  };

  scope.parseService = function (name_obj) {
    if (name_obj && name_obj.name) {
      return name_obj.name + " - £" + parseFloat(name_obj.price).toFixed(2);
    }
  };

  scope.parseISODate = function (date, type, bst) {
    if (typeof date == "string" && date.match(/Z$/)) {
      if (bst) {
        date = moment(date).tz("Europe/London");
      } else {
        date = moment(date);
        if (date.isDST()) {
          date = date.subtract(1, "hour");
        }
      }

      //    date.tz('Europe/London').isDST()

      if (type == "get_day") {
        return date.format("ddd");
      } else if (type == "get_date") {
        return date.format("D");
      } else if (type == "time") {
        return date.format("HH:mm");
      } else if (type == "ago") {
        return date.fromNow();
      } else if (type == "date_time") {
        return date.format("Do MMM YYYY HH:mm");
      } else if (type) {
        return date.format(type);
      } else {
        return date.format("Do MMM YYYY");
      }
    } else {
      return ""; //date
    }
  };

  scope.getLength = function (obj) {
    if (obj) {
      return obj.length;
    }
  };

  scope.resetCustomer = function () {
    scope.view.selected_customer = "";
  };

  scope.chgMonth = function (type) {
    if (type == "next") {
      scope.selected_date.month = parseInt(scope.selected_date.month) + 1;
    } else {
      scope.selected_date.month = parseInt(scope.selected_date.month) - 1;
    }

    scope.selected_date.month_padded = pad(scope.selected_date.month);

    if (scope.selected_date.month < 1) {
      scope.selected_date.month = 12;
      scope.selected_date.year--;
      scope.selected_date.year_short--;
    }

    if (scope.selected_date.month > 12) {
      scope.selected_date.month = 1;
      scope.selected_date.year++;
      scope.selected_date.year_short++;
    }

    scope.selected_date.month_name =
      scope.selected_date.months[scope.selected_date.month - 1];
    scope.selected_date.month_name_year =
      scope.selected_date.months[scope.selected_date.month - 1] +
      " '" +
      scope.selected_date.year_short;
    scope.selected_date.month_name_short =
      scope.selected_date.months_short[scope.selected_date.month - 1];

    scope.dates = getDaysArray(
      scope.selected_date.year,
      scope.selected_date.month
    );
  };

  scope.chgDay = function (type) {
    if (type == "next") {
      scope.selected_date.obj.add(1, "days");
    } else {
      scope.selected_date.obj.subtract(1, "days");
    }

    window.location.href =
      "/dashboard/calendar/" + scope.selected_date.obj.format("YYYY/M/D");
  };

  scope.chgWeek = function (num) {
    num = num * 7;
    let date = moment(scope.selected_date.full)
      .add(num, "days")
      .format("YYYY/M/D");

    window.location.href = "/dashboard/calendar/" + date;
  };

  scope.getHrs = function () {
    let hrs = [],
      time,
      start_min,
      booked = false;

    for (i = 8; i <= 23; i++) {
      time = "";

      for (ii = 0; ii <= 45; ii += 15) {
        if (i < 10) {
          time = "0" + i + ":";
        } else {
          time = i + ":";
        }

        if (ii < 10) {
          time = time + "0" + ii;
        } else {
          time = time + ii;
        }

        let time_check = time;
        if (scope.new_appointment.duration) {
          time_check = moment()
            .set({ hours: i, minutes: ii })
            .add(parseInt(scope.new_appointment.duration) - 15, "minutes")
            .format("HH:mm");
        }

        if (scope.staff_availability) {
          if (scope.staff_availability.end[time]) {
            // if there's an appointment ending at this time

            if (scope.new_appointment.staff_id.length) {
              // if a stylist is selected
              if (
                scope.staff_availability.end[time].indexOf(
                  scope.new_appointment.staff_id
                ) >= 0
              ) {
                booked = false;
              }
            } else {
              if (
                scope.staff_availability.end[time].length <= scope.staff.length
              ) {
                booked = false;
              }
            }
          }

          if (scope.staff_availability.end[time_check]) {
            // if there's an appointment ending at this time

            if (scope.new_appointment.staff_id.length) {
              // if a stylist is selected
              if (
                scope.staff_availability.end[time_check].indexOf(
                  scope.new_appointment.staff_id
                ) >= 0
              ) {
                booked = true;
              }
            } else {
              if (
                scope.staff_availability.end[time_check].length <=
                scope.staff.length
              ) {
                booked = true;
              }
            }
          }

          if (scope.staff_availability.start[time_check]) {
            // if there's an appointment at this time

            if (scope.new_appointment.staff_id.length) {
              // if a stylist is selected
              if (
                scope.staff_availability.start[time_check].indexOf(
                  scope.new_appointment.staff_id
                ) >= 0
              ) {
                booked = true;
              }
            } else {
              if (
                scope.staff_availability.start[time_check].length >=
                scope.staff.length
              ) {
                booked = true;
              }
            }
          }

          if (scope.staff_availability.start[time]) {
            // if there's an appointment at this time

            if (scope.new_appointment.staff_id) {
              // if a stylist is selected
              if (
                scope.staff_availability.start[time].indexOf(
                  scope.new_appointment.staff_id
                ) >= 0
              ) {
                booked = true;
              }
            } else {
              if (
                scope.staff_availability.start[time].length >=
                scope.staff.length
              ) {
                booked = true;
              }
            }
          }
        }

        if (booked == false) {
          hrs.push(time);
        }

        if (i == 23) {
          if (ii == 45) {
            return hrs;
          }
        }
      }
    }
  };

  scope.getDurationHrs = function () {
    let duration_hrs = [],
      time;

    for (i = 0; i < 9; i++) {
      time = "";

      for (ii = 0; ii <= 45; ii += 15) {
        time = i + "hr ";

        if (ii < 10) {
          time = time + "0" + ii;
        } else {
          time = time + ii;
        }

        if (i == 0 && ii == 0) {
        } else {
          mins = i * 60 + ii;
          duration_hrs.push({ val: mins, text: mins + "mins" });
        }

        if (ii == 45 && i == 3) {
          return duration_hrs;
        }
      }
    }
  };

  scope.getSlots = function () {
    let mins = [],
      end = 300;

    for (i = 0; i <= end; i += 15) {
      if (i < 10) {
        //    mins.push('0'+i)
      } else {
        mins.push({ duration: i + "" });
      }

      if (i == end) {
        return mins;
      }
    }
  };

  scope.match = function (obj, input) {
    let re = RegExp(input);
    if (obj.match(re)) {
      return true;
    } else {
      return false;
    }
  };

  scope.inArray = function (arr, input) {
    if (typeof input == "object" && input.hasOwnProperty("_id")) {
      input = input._id.toString();
    }
    if (!arr || arr == null || typeof arr == "string") {
      return false;
    }
    if (typeof arr == "string") {
      arr = _.get(scope, arr);
    }

    if (typeof arr == "object" && arr.length > 0) {
      return arr.indexOf(input) >= 0;
    } else {
      return false;
    }
  };

  scope.getSalonSetting = function (type, idx) {
    if (!idx.match(/^\d$/)) {
      return "";
    }
    if (
      scope.salon &&
      scope.salon[type] &&
      scope.salon[type].length > 0 &&
      scope.salon[type][idx]
    ) {
      return scope.salon[type][idx].name;
    } else if (!scope.salon) {
      scope.get("salon", "54855602").then((salon) => {
        console.log("dddddsssssssssss");
        scope.salon = salon;
        return scope.salon[type][idx].name;
      });
    } else {
      return "";
    }
  };

  // init functions

  if (typeof extendedController == "function") {
    extendedController();
  }

  if (scope.query.date && scope.query.date.match("Z")) {
    scope.selectDate(scope.query.date);

    if (typeof scope.newAppointment == "function") {
      scope.newAppointment(
        "set_start",
        scope.selected_date.obj.format("HH:mm")
      );
    }
  } else {
    scope.selectDate(date);
  }

  if (scope.query.staff_id) {
    scope.get("staff/" + scope.query.staff_id).then((staff) => {
      if (typeof scope.newAppointment == "function") {
        scope.newAppointment("add_stylist", staff);
      }
    });
  }

  if (scope.query.client_id) {
    scope.get("customers/" + scope.query.client_id).then((customer) => {
      if (typeof scope.newAppointment == "function") {
        scope.newAppointment("add_customer", customer);
      }
    });
  }

  if (scope.query.new_client) {
    scope.newClient();
  }

  if (scope.query.appointment_id) {
    let appt_bg = document.getElementById(
      "appointment-" + scope.query.appointment_id
    );
    if (appt_bg) {
      scope.showAppointment(appt_bg.dataset.link_id);
    }
  }

  // if (localStorage.getItem('appointment_payload')){
  //
  //     var payload = JSON.parse(localStorage.getItem('appointment_payload'))
  //
  //     scope.appointments = payload.appointments
  //     scope.view.selected_customer = payload.customer
  //     scope.view.customer = payload.customer
  //     scope.view.appointment_date = payload.date
  //
  //     if (scope.view.customer.email == 'false'){
  //         scope.view.customer.email = ''
  //     }
  //
  //     if (scope.appointments.length>0){
  //         scope.view.ok_to_book = true
  //     }
  //     if (pathname[2] == 'thank-you'){
  //         localStorage.setItem('appointment_payload','')
  //     }
  //
  // }

  if (localStorage.getItem("grouped_transactions")) {
    let grouped_carts = JSON.parse(
      localStorage.getItem("grouped_transactions")
    );
    if (grouped_carts.length > 0) {
      scope.view.grouped_carts = grouped_carts;
      scope.groupTransaction("calc_totals");
    }
  }

  scope.get("user_notifications/check_new").then((count) => {
    scope.view.user_notifications = count[0];
  });
  setInterval(function () {
    scope.get("user_notifications/check_new").then((count) => {
      scope.view.user_notifications = count[0];
      if (
        scope.notifications &&
        scope.notifications.length > 0 &&
        count[0] > 0
      ) {
        scope.get("user_notifications", "all", "notifications");
      }
    });
  }, 10000);

  positionAppointments();
  // positionOpenClose()
  positionTimeline();

  // ==== Service Page =====
  scope.price_itemsBtn = function (type, index) {
    if (!scope.services_cms_data.service_prices) {
      scope.services_cms_data.service_prices = [];
    }

    if (type == "remove" && index >= 0) {
      scope.services_cms_data.service_prices.splice(parseInt(index), 1);
    } else {
      scope.services_cms_data.service_prices.push({
        name: "",
        senior_price: "",
        exe_price: "",
        david_price: "",
      });
    }
  };
  scope.choose_itemsBtn = function (type, index) {
    if (!scope.services_cms_data.ChooseStyle_items) {
      scope.services_cms_data.ChooseStyle_items = [];
    }

    if (type == "remove" && index >= 0) {
      scope.services_cms_data.ChooseStyle_items.splice(parseInt(index), 1);
    } else {
      scope.services_cms_data.ChooseStyle_items.push({
        heading: "",
        description: "",
      });
    }
  };

  scope.newAboutService_items = function (type, index) {
    // alert("gchf")
    if (!scope.new.aboutService_items) {
      scope.new.aboutService_items = [];
    }

    if (type == "remove" && index >= 0) {
      scope.new.aboutService_items.splice(parseInt(index), 1);
    } else {
      scope.new.aboutService_items.push({
        aboutService_name: "",
      });
    }
  };
  scope.newTimelineItem = function (type, index) {
    if (!scope.new.timeline_items) {
      scope.new.timeline_items = [];
    }

    if (type == "remove" && index >= 0) {
      scope.new.timeline_items.splice(parseInt(index), 1);
    } else {
      scope.new.timeline_items.push({
        timeIcon: "",
        timeTitle: "",
        timeDescrip: "",
      });
    }
  };
  scope.addCategory = function (item) {
    copy = JSON.parse(JSON.stringify(item));
    scope.post("cafeproducts/saveCategory", copy);
    scope.notify("Category added");
    window.location.href = window.location.href;
  };

  scope.saveCategory = async function () {
    console.log("saveCategory");
    const data4 = document.getElementById("newCategory").value;
    var data2 = {};
    // console.log("============",data)
    if (data4) {
      const cv = document.getElementById("new_image");

      var pp = "";
      let flag = 0;
      if (cv.files.length > 0) {
        // console.log(cv.files)
        var fileToLoad = cv.files[0];
        pp = fileToLoad;
      }
      let formData = new FormData();
      formData.append("image", pp);
      let post_data = {
        method: "POST",
        body: formData,
      };
      //   console.log(formData)
      await fetch("/image-upload", post_data)
        .then((response) => response.json())
        .then((data) => {
          data2 = { name: data4, image: data.data.url };
          console.log(data2);
        });

      //  const data2={"name":data,image=data.data.url};
      copy = JSON.parse(JSON.stringify(data2));

      await scope.post("cafeproducts/saveCategory", copy);
      scope.notify("Category added");
      // scope.get('dashboard/category')
      window.location.href = window.location.href;
    }
  };

  scope.deleteCat = async function (data) {
    console.log("deleteCat", data);
    console.log("deleteCat");
    const data2 = { id: data };
    copy = JSON.parse(JSON.stringify(data2));
    await scope.post("cafeproducts/deleteCategory", copy);
    scope.notify("Category removed");
    window.location.href = window.location.href;
  };
  scope.updateCatg = async function (id) {
    const val = document.getElementById(id).value;
    const data2 = {};
    data2.id = id;
    data2.name = val;
    copy = JSON.parse(JSON.stringify(data2));
    console.log(data2);
    await scope.post("cafeproducts/updateCategory", copy);
    scope.notify("Category updated");
    window.location.href = window.location.href;
  };
  scope.updateSub = async function (a, b, c) {
    console.log(a, b, c);
    const val = document.getElementById(`${b}`).value;
    console.log(val);
    const data2 = {};
    data2._Key = c;
    data2.id = a;
    data2.name = val;
    copy = JSON.parse(JSON.stringify(data2));
    console.log(data2);
    await scope.post("cafeproducts/updateSubCat", copy);
    scope.notify("Category updated");
    window.location.href = window.location.href;
  };
  scope.removeSub = async function (id, pk) {
    const data1 = { name: id, id: pk };
    // console.log(data1)

    copy = JSON.parse(JSON.stringify(data1));
    await scope.post("cafeproducts/removeSub", copy);
    scope.notify("Category removed");
    window.location.href = window.location.href;
  };

  scope.updateMemStatus = async function (id, subsId, key) {
    const data = await scope.post("memberships/updateMemStatus", {
      id: id,
      subsId: subsId,
      key: key,
    });
    if (data.length > 0) {
      window.location.href = window.location.href;
    }
  };

  scope.submitFoodcafeCms = async function () {
    var arr = [];
    const payload = {};
    payload.type = "foodcafeCms";
    const img0 = document.getElementById("img0").src;
    const img1 = document.getElementById("img1").src;
    console.log(img0, img1);
    const background0 = document.getElementById("file0");
    const iconImage0 = document.getElementById("file1");
    const images = [];
    var updated0 = 0;
    var updated1 = 0;
    if (background0.value !== "") {
      images.push({ type: "backgroundImage", value: background0 });
    }
    if (iconImage0.value !== "") {
      images.push({ type: "iconImage", value: iconImage0 });
    }

    if (images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        var pp = "";
        let flag = 0;
        if (images[i].value.files.length > 0) {
          var fileToLoad = images[i].value.files[0];
          pp = fileToLoad;
        }
        let formData = new FormData();
        formData.append("image", pp);
        let post_data = {
          method: "POST",
          body: formData,
        };
        let response = await fetch("/image-upload", post_data);
        let data = await response.json();
        arr.push({ type: images[i].type, url: data.data.url });
        if (images[i].type == "backgroundImage") {
          payload.backgroundImage = data.data.url;
          updated0 = 1;
        }
        if (images[i].type == "iconImage") {
          payload.iconImage = data.data.url;
          updated1 = 1;
        }
      }
    } else {
      payload.backgroundImage = updated0 === 1 ? payload.backgroundImage : img0;
      payload.iconImage = updated1 === 1 ? payload.iconImage : img1;
    }

    payload.buttonText = document.getElementById("buttonText").value;
    payload.headingText = document.getElementById("headingText").value;
    payload.rating = document.getElementById("rating").value;
    console.log(payload);

    await scope
      .post("home_about_us/updateCafeCms", payload)
      .then((camp_data) => {
        scope.notify("Items Updated Successfully!!");
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      });
  };

  scope.submitHomeTopPanel = async function () {
    var arr = [];
    const payload = {};
    payload.type = "topPanel";
    payload.menu = "homeScreen";

    const background0 = document.getElementById("file0");
    const iconImage0 = document.getElementById("file1");
    const images = [];
    var updated0 = 0;
    var updated1 = 0;
    if (background0.value !== "") {
      images.push({ type: "backgroundImage", value: background0 });
    }
    if (iconImage0.value !== "") {
      images.push({ type: "logoImage", value: iconImage0 });
    }

    if (images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        var pp = "";
        let flag = 0;
        if (images[i].value.files.length > 0) {
          var fileToLoad = images[i].value.files[0];
          pp = fileToLoad;
        }
        let formData = new FormData();
        formData.append("image", pp);
        let post_data = {
          method: "POST",
          body: formData,
        };
        let response = await fetch("/image-upload", post_data);
        let data = await response.json();
        arr.push({ type: images[i].type, url: data.data.url });
        if (images[i].type == "backgroundImage") {
          payload.backgroundImage = data.data.url;
          updated0 = 1;
        }
        if (images[i].type == "logoImage") {
          payload.iconImage = data.data.url;
          updated1 = 1;
        }
      }
    } else {
      payload.backgroundImage = updated0 === 1 ? payload.backgroundImage : img0;
      payload.iconImage = updated1 === 1 ? payload.iconImage : img1;
    }

    await scope
      .post("home_about_us/addTopPanelImages", payload)
      .then((camp_data) => {
        scope.notify("Items Updated Successfully!!");
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      });
  };

  scope.submitSection1 = async function () {
    const head = document.getElementById("section1Head").value;
    // const desc=document.getElementById("section1Desc").value;
    const descEditor = CKEDITOR.instances.section1Desc;
    const desc = descEditor.getData();
    const button_text = document.getElementById("section1Button").value;
    const button_url = document.getElementById("section1ButtonUrl").value;
    const payload = {};
    payload.type = "section1";
    payload.menu = "homeScreen";
    payload.heading = head;
    payload.desc = desc;
    payload.button_text = button_text;
    payload.button_url = button_url;
    await scope
      .post("home_about_us/addSectionData", payload)
      .then((camp_data) => {
        scope.notify("Items Updated Successfully!!");
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      });
  };
  scope.submitJoinUs = async function () {
    const head = document.getElementById("section1Head").value;
    // const desc=document.getElementById("section1Desc").value;
    const descEditor = CKEDITOR.instances.section1Desc;
    const desc = descEditor.getData();
    const payload = {};
    payload.type = "joinUs";
    payload.menu = "joinUs";
    payload.heading = head;
    payload.desc = desc;
    await scope
      .post("home_about_us/addSectionData", payload)
      .then((camp_data) => {
        scope.notify("Items Updated Successfully!!");
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      });
  };
  scope.submitSection4 = async function () {
    const head = document.getElementById("section4Head").value;
    // const desc=document.getElementById("section4Desc").value;
    const descEditor = CKEDITOR.instances.section4Desc;
    const desc = descEditor.getData();
    const payload = {};
    const button_text = document.getElementById("section4Button").value;
    const button_url = document.getElementById("section4ButtonUrl").value;
    payload.type = "section4";
    payload.menu = "homeScreen";
    payload.heading = head;
    payload.desc = desc;
    payload.button_text = button_text;
    payload.button_url = button_url;
    await scope
      .post("home_about_us/addSectionData", payload)
      .then((camp_data) => {
        scope.notify("Items Updated Successfully!!");
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      });
  };

  scope.submitSection2 = async function () {
    const head = document.getElementById("section2Head").value;
    // const desc=document.getElementById("section2Desc").value;
    const descEditor = CKEDITOR.instances.section2Desc;
    const desc = descEditor.getData();
    const button_text = document.getElementById("section2Button").value;
    const button_url = document.getElementById("section2ButtonUrl").value;
    const img = document.getElementById("section2Img");
    const payload = {};
    payload.type = "section2";
    payload.menu = "homeScreen";
    payload.heading = head;
    payload.desc = desc;
    payload.button_text = button_text;
    payload.button_url = button_url;

    // const cv = document.getElementById("cv");

    var pp = "";
    var flag = 0;
    var formData = new FormData();
    if (img.value !== "" && img.files.length > 0) {
      // console.log(cv.files)
      var fileToLoad = img.files[0];
      pp = fileToLoad;
      formData.append("image", pp);
      let post_data = {
        method: "POST",
        body: formData,
      };
      console.log(formData);
      let response = await fetch("/image-upload", post_data);
      let data = await response.json();
      payload.image = data.data.url;
      await scope
        .post("home_about_us/addSectionData", payload)
        .then((camp_data) => {
          scope.notify("Items Updated Successfully!!");
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        });
    } else {
      payload.image = document.getElementById("imgs2").src;
      console.log(payload);
      await scope
        .post("home_about_us/addSectionData", payload)
        .then((camp_data) => {
          scope.notify("Items Updated Successfully!!");
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        });
    }
  };

  scope.submitSection3 = async function () {
    const head = document.getElementById("section3Head").value;
    // const desc=document.getElementById("section3Desc").value;
    const descEditor = CKEDITOR.instances.section3Desc;
    const desc = descEditor.getData();
    const button_text = document.getElementById("section3Button").value;
    const button_url = document.getElementById("section3ButtonUrl").value;
    const img = document.getElementById("section3Img");
    const payload = {};
    payload.type = "section3";
    payload.menu = "homeScreen";
    payload.heading = head;
    payload.desc = desc;
    payload.button_text = button_text;
    payload.button_url = button_url;
    console.log(payload);
    // const cv = document.getElementById("cv");

    var pp = "";
    let flag = 0;
    let formData = new FormData();
    if (img.value !== "" && img.files.length > 0) {
      // console.log(cv.files)
      var fileToLoad = img.files[0];
      pp = fileToLoad;
      formData.append("image", pp);
      let post_data = {
        method: "POST",
        body: formData,
      };
      console.log(formData);
      let response = await fetch("/image-upload", post_data);
      let data = await response.json();
      payload.image = data.data.url;
      await scope
        .post("home_about_us/addSectionData", payload)
        .then((camp_data) => {
          scope.notify("Items Updated Successfully!!");
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        });
    } else {
      payload.image = document.getElementById("imgs3").src;
      await scope
        .post("home_about_us/addSectionData", payload)
        .then((camp_data) => {
          scope.notify("Items Updated Successfully!!");
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        });
    }
  };
  scope.submitSection5 = async function () {
    const head = document.getElementById("section5Head").value;
    // const desc=document.getElementById("section5Desc").value;
    const descEditor = CKEDITOR.instances.section5Desc;
    const desc = descEditor.getData();
    const button_text = document.getElementById("section5Button").value;
    const button_url = document.getElementById("section5ButtonUrl").value;
    const img = document.getElementById("section5Img");
    const payload = {};
    payload.type = "section5";
    payload.menu = "homeScreen";
    payload.heading = head;
    payload.desc = desc;
    payload.button_text = button_text;
    payload.button_url = button_url;
    console.log(payload);
    // const cv = document.getElementById("cv");

    var pp = "";
    let flag = 0;
    let formData = new FormData();
    if (img.value !== "" && img.files.length > 0) {
      // console.log(cv.files)
      var fileToLoad = img.files[0];
      pp = fileToLoad;
      formData.append("image", pp);
      let post_data = {
        method: "POST",
        body: formData,
      };
      console.log(formData);
      let response = await fetch("/image-upload", post_data);
      let data = await response.json();
      payload.image = data.data.url;
      await scope
        .post("home_about_us/addSectionData", payload)
        .then((camp_data) => {
          scope.notify("Items Updated Successfully!!");
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        });
    } else {
      payload.image = document.getElementById("imgs5").src;
      await scope
        .post("home_about_us/addSectionData", payload)
        .then((camp_data) => {
          scope.notify("Items Updated Successfully!!");
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        });
    }
  };
  scope.submitSection6 = async function () {
    const head = document.getElementById("section6Head").value;
    // const desc=document.getElementById("section6Desc").value;
    const descEditor = CKEDITOR.instances.section6Desc;
    const desc = descEditor.getData();
    const button_text = document.getElementById("section6Button").value;
    const button_url = document.getElementById("section6ButtonUrl").value;
    const img = document.getElementById("section6Img");
    const payload = {};
    payload.type = "section6";
    payload.menu = "homeScreen";
    payload.heading = head;
    payload.desc = desc;
    payload.button_text = button_text;
    payload.button_url = button_url;
    console.log(payload);
    // const cv = document.getElementById("cv");

    var pp = "";
    let flag = 0;
    let formData = new FormData();
    if (img.value !== "" && img.files.length > 0) {
      // console.log(cv.files)
      var fileToLoad = img.files[0];
      pp = fileToLoad;
      formData.append("image", pp);
      let post_data = {
        method: "POST",
        body: formData,
      };
      console.log(formData);
      let response = await fetch("/image-upload", post_data);
      let data = await response.json();
      payload.image = data.data.url;
      await scope
        .post("home_about_us/addSectionData", payload)
        .then((camp_data) => {
          scope.notify("Items Updated Successfully!!");
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        });
    } else {
      payload.image = document.getElementById("imgs6").src;
      await scope
        .post("home_about_us/addSectionData", payload)
        .then((camp_data) => {
          scope.notify("Items Updated Successfully!!");
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        });
    }
  };

  // to update product cms page
  scope.submitProductCms = async function () {
    var arr = [];
    const payload = {};
    payload.type = "productCMS";
    const img0 = document.getElementById("img0").src;
    // const img1 = document.getElementById("img1").src;
    console.log(img0);
    const background0 = document.getElementById("file0");
    // const iconImage0 = document.getElementById("file1");
    const images = [];
    var updated0 = 0;
    // var updated1=0
    if (background0.value !== "") {
      images.push({ type: "backgroundImage", value: background0 });
    }
    // if(iconImage0.value!==''){
    //     images.push({type: "iconImage", value: iconImage0})
    // }

    if (images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        var pp = "";
        let flag = 0;
        if (images[i].value.files.length > 0) {
          var fileToLoad = images[i].value.files[0];
          pp = fileToLoad;
        }
        let formData = new FormData();
        formData.append("image", pp);
        let post_data = {
          method: "POST",
          body: formData,
        };
        let response = await fetch("/image-upload", post_data);
        let data = await response.json();
        arr.push({ type: images[i].type, url: data.data.url });
        if (images[i].type == "backgroundImage") {
          payload.backgroundImage = data.data.url;
          updated0 = 1;
        }
      }
    } else {
      payload.backgroundImage = updated0 === 1 ? payload.backgroundImage : img0;
    }

    //    payload.buttonText=document.getElementById('buttonText').value;
    payload.headingText = document.getElementById("headingText").value;
    //    payload.rating=document.getElementById('rating').value;
    console.log(payload);

    await scope
      .post("home_about_us/updateProductCMS", payload)
      .then((camp_data) => {
        scope.notify("Items Updated Successfully!!");
        document.body.classList.add("notificationAlert");
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      });
  };
  scope.saveTable = async function () {
    console.log(scope.new);
    var route = "addTable";
    if (scope.new._key) {
      route = "updateTable";
    }
    await scope
      .post("cafeproducts/" + route, scope.new)
      .then(async (product_data) => {
        scope.view.modal = false;
        scope.notify("Saved");
        setTimeout(async function () {
          // scope.promoServiceFilter()
          window.location.href = window.location.href;
        }, 1000);
        // scope.new = {}
      });
  };
  scope.removeTable = async function () {
    console.log(scope.new);
    var route = "removeTable";
    if (scope.new._key) {
      route = "removeTable";
    }
    await scope
      .post("cafeproducts/" + route, scope.new)
      .then(async (product_data) => {
        scope.view.modal = false;
        scope.notify("Saved");
        setTimeout(async function () {
          // scope.promoServiceFilter()
          window.location.href = window.location.href;
        }, 1000);
        // scope.new = {}
      });
  };
  scope.updateRedeemStatus = async function (_key, status) {
    const data = await scope.post("members/updateRedeemStatus", {
      _key: _key,
      status: status,
      _updated: new Date(),
    });
    if (data.length > 0) {
      window.location.href = window.location.href;
    }
  };
};
