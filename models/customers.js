const db = require("../components/arango"),
  collection = db.db.collection("customers"),
  sendMail = require("../modules/sendMail"),
  fs = require("fs"),
  return_fields = "c";
const stripe = require("stripe")(
  "sk_test_51HTjTEHfeWtaNgKZlpkON372lx2smnr0vQekEUslVH82VpnPG0TyDbZEM1CZh4Kq8F41ZjSGnbdBXl19p7wrsPSC00mxadrWdC"
);
const { count } = require("console");
const { off } = require("process");
const config = require("../modules/config");
const user_notifications = require("./user_notifications");

const customer = {
  find: (key, fields) => {
    if (!fields || typeof fields != "string") {
      fields = return_fields;
    }

    return new Promise(function (resolve, reject) {
      db.query(
        'FOR c in customers FILTER c._key == "' +
          key +
          '" LIMIT 30 SORT c._updated DESC RETURN ' +
          fields,
        (data) => {
          if (data.length > 0) {
            resolve(data[0]);
          } else {
            reject("Client " + key + " Not found");
          }
        }
      );
    });
  },

  find1: async (body) => {
    console.log(body);
    var fields = "{ ";
    if (Array.isArray(body.fields) && body.fields.length > 0) {
      body.fields.map((value) => {
        fields += `"${value}" :c.${value},`;
        // Object.assign(fields, { [value]:`c.${value}`})
      });
    }
    fields = fields.substring(0, fields.length - 1);
    fields += " }";
    console.log(fields);

    console.log(
      'FOR c in customers FILTER c._key == "' +
        body._key +
        '" LIMIT 1 SORT c._updated DESC RETURN ' +
        fields
    );
    return new Promise(async function (resolve, reject) {
      await db.query(
        'FOR c in customers FILTER c._key == "' +
          body._key +
          '" LIMIT 1 SORT c._updated DESC RETURN ' +
          fields,
        async (data) => {
          console.log(data);
          if (data.length > 0) {
            resolve(data[0]);
          } else {
            reject("Client " + body._key + " Not found");
          }
        }
      );
    });
  },

  findDuplicates: () => {
    return new Promise((resolve, reject) => {
      let query =
        "LET duplicates = (FOR c IN customers COLLECT email = c.email WITH COUNT INTO count FILTER count > 1 && email RETURN {email: email,count: count}) FOR d IN duplicates FOR c IN customers FILTER c.email == d.email SORT c.email ASC RETURN c";
      db.query(query, async (data) => {
        resolve(data);
      });
    });
  },
  search: (search) => {
    return new Promise((resolve, reject) => {
      console.log(search);
      let s = search.str;
      let query = `FOR c in customers  FILTER c.name.first LIKE "%${s}%"
      OR c.name.last LIKE "%${s}%"
      OR c.email LIKE "%${s}%"
      OR c.tel LIKE "%${parseInt(s)}%" 
       LIMIT 0,10 SORT c._updated DESC RETURN {_key:c._key,name:{first:c.name.first,last:c.name.last},email:c.email,tel:c.tel,avatar:c.avatar, gender:c.gender, notes:LENGTH(c.notes), address: c.address, dob: c.dob}`;
      db.query(query, (data) => {
        if (data[0]) {
          let countq = `FOR c in customers  FILTER c.name.first LIKE "%${s}%"
          OR c.name.last LIKE "%${s}%"
          OR c.email LIKE "%${s}%"
          OR c.tel LIKE "%${parseInt(
            s
          )}%" COLLECT WITH COUNT INTO length RETURN length`;
          db.query(countq, (data2) => {
            resolve({ data: data, totalCount: data2[0] });
          });
        } else {
          resolve([]);
        }
      });
    });
  },

  // search: (search) => {
  //   let filter = "",
  //     return_fields =
  //       "{_key:result._key,name:{first:result.name.first,last:result.name.last},email:result.email,tel:result.tel,avatar:result.avatar, gender:result.gender, notes:LENGTH(result.notes)}";

  //   return new Promise(async (resolve, reject) => {
  //     if (search.str.length > 2) {
  //       search.str_prefix =
  //         "prefix:" + search.str.replace(/\s|\./g, ",|prefix:");
  //       //    search.str = 'prefix:'+search.str

  //       query =
  //         'let name_first = (for result in fulltext(customers,"name.first","' +
  //         search.str_prefix +
  //         '") return ' +
  //         return_fields +
  //         ') let name_last = (for result in fulltext(customers,"name.last","' +
  //         search.str_prefix +
  //         '") return ' +
  //         return_fields +
  //         ') let email = (for result in customers filter LOWER(result.email) LIKE "' +
  //         search.str +
  //         '%" return ' +
  //         return_fields +
  //         ') let tel = (for result in customers filter result.tel =~ "' +
  //         search.str +
  //         '" return ' +
  //         return_fields +
  //         ") let resultsMatch = union(name_first,name_last,email,tel) return resultsMatch";

  //       // query = 'let name_first = (for result in fulltext(customers,"name.first","'+search.str+'") return '+return_fields+') let name_last = (for result in fulltext(customers,"name.last","'+search.str+'") return '+return_fields+') let resultsMatch = union(name_first,name_last) return resultsMatch'

  //       db.query(query, async (data) => {
  //         //    db.query('FOR c IN clientView SEARCH ANALYZER(c.name.first IN TOKENS("'+search.str+'", "text_en") OR c.name.last IN TOKENS("'+search.str+'", "text_en") OR c.email IN TOKENS("'+search.str+'", "text_en"), "text_en") SORT BM25(c, 2.4, 1) DESC RETURN '+return_fields, (data)=>{

  //         let new_data = [],
  //           count = {};

  //         if (data[0]) {
  //           await data[0].forEach((i) => {
  //             if (!count[i._key]) {
  //               count[i._key] = i;
  //             }
  //             count[i._key].position = (count[i._key].position || 0) + 1;
  //           });

  //           for (let [key, item] of Object.entries(count)) {
  //             new_data.push(item);
  //           }

  //           await new_data.sort((a, b) => {
  //             return b.position - a.position;
  //           });

  //           resolve([new_data]);
  //         } else {
  //           resolve([]);
  //         }
  //       });
  //     } else {
  //       customer
  //         .today()
  //         .then((data) => {
  //           resolve(data);
  //         })
  //         .catch((err) => {
  //           reject(err);
  //         });
  //     }
  //   });
  // },

  isBlocked: (key) => {
    return new Promise(function (resolve, reject) {
      db.query(
        'LET c = DOCUMENT("customers/' + key + '") RETURN c.blocked',
        (cust_data) => {
          resolve(cust_data[0]);
        }
      );
    });
  },
  searchNew: (search) => {
    return new Promise(function (resolve, reject) {
      db.query(
        `FOR doc IN customers
                FILTER doc.name.first LIKE '${search.str}%' limit 10
                RETURN {'key':doc._key,'name':doc.name}
              `,
        (cust_data) => {
          console.log(cust_data);
          resolve(cust_data);
        }
      );
    });
  },

  saveDetails: (data) => {
    return new Promise(async (resolve, reject) => {
      let client = await collection.document(data);

      if (client) {
        if (data.dob && data.dob.date && data.dob.month) {
          let date = data.dob.date + "-" + data.dob.month;

          if (data.dob.year) {
            if (data.dob.year.length == 2 && parseInt(data.dob.year) >= 40) {
              date += "-19" + data.dob.year;
            } else if (data.dob.year.length == 4) {
              date += "-" + data.dob.year;
            } else {
              date += moment().format("YYYY");
            }
          }

          data.birth_date = moment(date, "D-M-YYYY").toISOString();
        }

        if (data.skin_test_collection === true) {
          data.full_name = data.name.first + " " + data.name.last;
          events.trigger("skin_test_collection", data);
        } else if (data.skin_test_required === true) {
          data.full_name = data.name.first + " " + data.name.last;
          events.trigger("skin_test_required", data);
        }

        delete data.skin_test_required;
        delete data.skin_test_collection;

        let res = await collection.update(client, data);

        resolve(client);
      } else {
        reject("Client details not saved");
      }
    });
  },

  saveConsultation: (data) => {
    return new Promise(function (resolve, reject) {
      collection.document(data._key).then(async (doc) => {
        data._created = moment().utc().toISOString();

        if (!doc.consultations) {
          doc.consultations = [];
        }

        if (data.signature) {
          data.signature = await image.save(
            data.signature,
            data._key,
            "signatures"
          );
        }

        delete data._key;
        doc.consultations.push(data);

        collection
          .update(doc, doc)
          .then((cust_data) => {
            resolve(doc);
          })
          .catch((err) => {
            reject(err);
          });
      });
    });
  },

  futureAppointments: (data) => {
    return new Promise(function (resolve, reject) {
      if (data._key) {
        data = data._key;
      }

      db.query(
        'FOR a in appointments FILTER a.customer_id == "' +
          data +
          '" && a.date > "' +
          moment().toISOString() +
          '" && REGEX_TEST(a.status, "salon_confirm|confirmed|unconfirmed") SORT a.date DESC LIMIT 6 RETURN a',
        (data) => {
          if (data && data.length > 0) {
            // let prev_date, prev_sid
            //
            // data = data.filter((appt)=>{
            //
            //     let curr_date = moment(appt.date)
            //     if (!prev_date || !prev_date.isSame(curr_date,'day') && prev_sid != appt.service._key){
            //         prev_date = curr_date
            //         prev_sid = appt.service_id
            //         return true
            //     }
            //
            // })

            resolve(data);
          } else {
            resolve([]);
          }
        }
      );
    });
  },

  recommendedProducts: (key) => {
    return new Promise(function (resolve, reject) {
      if (key) {
        collection
          .document(key)
          .then((doc) => {
            db.query(
              'LET cust = (FOR c IN customers FILTER c._key == "' +
                key +
                '" RETURN c) FOR rp IN cust[0].recommended_products LET staff = (FOR s IN staff FILTER s._key == rp.staff_id RETURN {name:s.name,_key:s._key}) LET product = (FOR p IN products FILTER p._key == rp.key RETURN p) RETURN MERGE(product[0],{staff:staff[0]})',
              (data) => {
                if (data.length > 0) {
                  resolve(data);
                } else {
                  resolve([]);
                }
              }
            );
          })
          .catch((err) => {
            resolve([]);
          });
      } else {
        resolve([]);
      }
    });
  },

  addRecommendedProduct: (data, req) => {
    return new Promise(async (resolve, reject) => {
      let doc = await collection.document(data);

      if (!doc.recommended_products) {
        doc.recommended_products = [];
      }

      let idx = doc.recommended_products.findIndex((item) => {
        return item.key == data.product_key;
      });

      if (idx < 0) {
        doc.recommended_products.push({
          key: data.product_key,
          staff_id: req.session.user._key,
        });
      } else {
        doc.recommended_products.splice(idx, 1);
      }

      let result = await collection.update(doc, doc);

      resolve(doc.recommended_products);
    });
  },

  resetClickCollect: (key) => {
    return new Promise(async (resolve, reject) => {
      let client = await collection.document({ _key: key });

      if (client && client.click_collect_cart) {
        client.click_collect_cart = {
          items: [],
          sub_total: 0,
          tax: 0,
          total: 0,
        };

        let result = await collection.update(client, client);
      }

      resolve();
    });
  },

  addStripeID: (email, stripe_id) => {
    return new Promise(function (resolve, reject) {
      let date = moment().toISOString(),
        query =
          'FOR c IN customers FILTER c.email == "' +
          email +
          '" UPDATE c WITH {stripe_id:"' +
          stripe_id +
          '"} IN customers RETURN NEW';

      if (email.match(/^07/)) {
        query =
          'FOR c IN customers FILTER c.tel == "' +
          email +
          '" UPDATE c WITH {stripe_id:"' +
          stripe_id +
          '"} IN customers RETURN NEW';
      }

      db.query(query, (data) => {
        if (data.length > 0) {
          resolve(date);
        } else {
          resolve([]);
        }
      });
    });
  },

  addCardInfo: (ref, method, card_details) => {
    return new Promise(function (resolve, reject) {
      let date = moment().toISOString(),
        query =
          "FOR c IN customers FILTER c." +
          method +
          ' == "' +
          ref +
          '" UPDATE c WITH {card_info:' +
          JSON.stringify(card_details) +
          "} IN customers RETURN NEW";

      db.query(query, (data) => {
        if (data.length > 0) {
          resolve(date);
        } else {
          resolve([]);
        }
      });
    });
  },

  addSubscriptionID: (stripe_data, subscription_id) => {
    return new Promise(function (resolve, reject) {
      let date = moment().toISOString(),
        query =
          'FOR c IN customers FILTER c.stripe_id == "' +
          stripe_data.customer +
          '" || c.email == "' +
          stripe_data.customer_email +
          '" UPDATE c WITH {membership: {subscription_id:"' +
          subscription_id +
          '"}} IN customers RETURN NEW';

      db.query(query, (data) => {
        if (data.length > 0) {
          resolve(data[0]);
        } else {
          resolve([]);
        }
      });
    });
  },

  addMembership: (key, membership_id) => {
    return new Promise(function (resolve, reject) {
      let date = moment().toISOString(),
        membership = {
          membership: {
            started: date,
            subscription_id: "",
            membership_id: membership_id,
          },
        };
      let query =
        'FOR c IN customers FILTER c._key == "' +
        key +
        '" UPDATE c WITH ' +
        JSON.stringify(membership) +
        " IN customers RETURN NEW";

      db.query(query, (data) => {
        if (data.length > 0) {
          resolve(data[0]);
        } else {
          resolve([]);
        }
      });
    });
  },

  cancelMembership: (key) => {
    return new Promise(async (resolve, reject) => {
      let date = moment().toISOString(),
        membership = {};

      let client = await collection.document(key);

      if (client) {
        if (!client.membership_history) {
          client.membership_history = [];
        }
        client.membership.cancelled = date;
        client.membership_history.push(client.membership);
        client.membership = false;

        await collection.update(client, client);

        resolve(client);
      } else {
        reject("Client not found");
      }
    });
  },

  addNoShow: (key, req, date) => {
    return new Promise(async (resolve, reject) => {
      let log = await customer.addLog(
        key,
        req.session.user,
        "Customer didn't turn up for appointment"
      );

      db.query(
        'FOR c IN customers FILTER c._key == "' +
          key +
          '" UPDATE c WITH {no_show:PUSH(c.no_show, "' +
          date +
          '")} IN customers RETURN NEW',
        (data) => {
          resolve(data);
        }
      );
    });
  },

  updateSkinTest: (data) => {
    return new Promise(function (resolve, reject) {
      let date;

      if (data.date) {
        date = data.date;
      } else {
        date = moment().toISOString();
      }

      db.query(
        'LET c = DOCUMENT("customers/' +
          data._key +
          '") UPDATE c WITH {skin_test:"' +
          date +
          '", skin_test_required:false} IN customers RETURN NEW',
        (data) => {
          if (data.length > 0) {
            resolve(date);
          } else {
            reject();
          }
        }
      );
    });
  },

  getTransactions: (key) => {
    return new Promise(function (resolve, reject) {
      db.query(
        'FOR t IN transactions FILTER t.customer_id == "' +
          key +
          '" && t.status == "complete" SORT t._created DESC RETURN t',
        (data) => {
          if (data.length > 0) {
            resolve(data);
          } else {
            resolve([]);
          }
        }
      );
    });
  },

  getmtransactions: (data) => {
    return new Promise(function (resolve, reject) {
      let query =
        'FOR c in transactions FILTER (c.customer_id == "' + data.key + '" ';

      if (data.start && data.end) {
        start_date = moment
          .utc(data.start, "YYYY-MM-DD")
          .add(1, "days")
          .set({ hours: 0, minutes: 0, seconds: 0 })
          .toISOString();
        end_date = moment
          .utc(data.end, "YYYY-MM-DD")
          .set({ hours: 0, minutes: 0, seconds: 0 })
          .toISOString();

        query +=
          ' and c._created >= "' +
          start_date +
          '" and c._created <= "' +
          end_date +
          '" ';
      }

      if (data.status) {
        query += ' and c.status=="' + data.status + '"';
      }

      query += ")";
      query += " SORT c._created DESC ";

      query += "RETURN c";
      console.log(query);
      //'FOR t IN transactions FILTER t.customer_id == "'+data.key+'" && t.status == "complete" SORT t._created DESC RETURN t'
      db.query(query, (data) => {
        if (data.length > 0) {
          resolve(data);
        } else {
          resolve([]);
        }
      });
    });
  },

  getcountries: (key) => {
    return new Promise(function (resolve, reject) {
      db.query("FOR cn IN countries SORT cn.name ASC RETURN cn", (data) => {
        if (data.length > 0) {
          resolve(data);
        } else {
          resolve([]);
        }
      });
    });
  },
  savephone: (data) => {
    return new Promise(function (resolve, reject) {
      db.query(
        `LET c = DOCUMENT("customers/${data.key}") UPDATE c WITH {phone: "${data.phone}"} IN customers RETURN {key:c._key,phone:${data.phone}}`,
        (data2) => {
          console.log(data2);
          if (data2) {
            resolve(data2);
          } else {
            reject([]);
          }
        }
      );
    });
  },
  addwallet: (data) => {
    return new Promise(async function (resolve, reject) {
      const charge = await stripe.charges.create({
        amount: parseInt(data.amount) * 100,
        currency: "INR",
        source: data.token,
      });

      if (charge && charge.id) {
        console.log(charge.id);

        //doc.stripe_transcation_id = charge.id

        db.query(
          'LET c = DOCUMENT("customers/' +
            data.key +
            '") UPDATE c WITH {wallet: c.wallet + ' +
            parseInt(data.amount) +
            "} IN customers RETURN NEW",
          (data2) => {
            console.log(data2);

            let date = moment().toISOString(),
              transaction = {
                transaction_id: "",
                stripe_transcation_id: charge.id,
                total: data.amount,
                type: "Wallet Payment",
                sub_total: 0,
                tax: 0,
                delivery: 0,
                delivery_method: "",
                status: "complete",
                method: "stripe",
                customer_id: data.key,
                order_status: "success",
                payment: {
                  vouchers: 0,
                  account: 0,
                  card: 0,
                  stripe: data.amount,
                  bacs: 0,
                  cash: 0,
                  change: 0,
                  payment_link: 0,
                },
                item_total: data.amount,
                temp: "true",
                _created: date,
                _updated: date,
              };

            db.query(
              "INSERT " + JSON.stringify(transaction) + " INTO transactions",
              (data) => {}
            );

            resolve(data2);
          }
        );
      }
    });
  },
  setorder: (data) => {
    //console.log('data',JSON.stringify(data.order))

    return new Promise(async function (resolve, reject) {
      /*db.query('LET c = DOCUMENT("customers/'+data.key+'") UPDATE c WITH {orders: PUSH(c.orders, '+JSON.stringify(data.order)+'), true} IN customers RETURN NEW', (data2)=>{
                    console.log(data2)
                    if (data2.length>0){
                        resolve(data2)
                    } else {
                        resolve([])
                    }

                })*/

      db.query(
        'FOR u IN home_CMS FILTER u._key == "3785478" RETURN u',
        async (data_per) => {
          let percentage = 0;

          if (data_per.length > 0 && data_per[0].share_percentage) {
            //console.log(data[0].share_percentage)
            percentage = parseInt(data_per[0].share_percentage);

            data.order.cart.map((val) => {
              if (val.member_id) {
                let commission = (val.price / 100) * percentage;

                let insert_data = {
                  created_to: "member",
                  member_id: val.member_id,
                  amount: commission,
                  name: val.name,
                  id: val._key,
                  Remarks: "Product Reference commission.",
                  _created: new Date().toISOString(),
                };
                // updating order count.....
                db.query(
                  `FOR p IN products
                                FILTER p._key == '${val._key}'
                                UPDATE p WITH { orderCount: p.orderCount + 1 } IN products`,
                  (data) => {}
                );

                db.query(
                  "INSERT " +
                    JSON.stringify(insert_data) +
                    " INTO wallet_transactions",
                  (data) => {}
                );

                db.query(
                  'FOR m IN members FILTER m._key == "' +
                    val.member_id +
                    '" UPDATE m WITH {wallet: m.wallet + ' +
                    commission +
                    "} IN members RETURN NEW.wallet",
                  (wallet) => {
                    console.log("wallet--wallet--", wallet);
                  }
                );
              }
            });
          }

          let doc = {
            order: data.order,
            total: data.total,
            order_id: Math.round(+new Date() / 1000),
            _created: new Date().toISOString(),
          };

          //const { token, currency, price } = req.body;
          const charge = await stripe.charges.create({
            amount: parseInt(data.total) * 100,
            currency: "INR",
            source: data.token,
          });

          if (charge && charge.id) {
            console.log(charge.id);

            doc.stripe_transcation_id = charge.id;

            db.query(
              'LET c = DOCUMENT("customers/' +
                data.key +
                '") UPDATE c WITH {orders: PUSH(c.orders, ' +
                JSON.stringify(doc) +
                ")} IN customers RETURN NEW",
              (data2) => {
                console.log(data2);
                if (data2) {
                  let date = moment().toISOString(),
                    transaction = {
                      items: data.order.cart,
                      transaction_id: doc.order_id,
                      stripe_transcation_id: charge.id,
                      total: data.total,
                      type: "Order Product",
                      sub_total: 0,
                      tax: 0,
                      delivery: data.delivery ? data.delivery : 0.0,
                      coupon_data: data.coupon_data ? data.coupon_data : {},
                      delivery_method: "",
                      status: "complete",
                      method: "stripe",
                      customer_id: data.key,
                      order_status: "Pending",
                      payment: {
                        vouchers: 0,
                        account: 0,
                        card: 0,
                        stripe: data.total,
                        bacs: 0,
                        cash: 0,
                        change: 0,
                        payment_link: 0,
                      },
                      item_total: data.total,
                      discount_data: data.discount_data,
                      temp: "true",
                      _created: date,
                      _updated: date,
                    };

                  db.query(
                    "INSERT " +
                      JSON.stringify(transaction) +
                      " INTO transactions",
                    (data) => {}
                  );

                  // update wallet for admin....
                  db.query(
                    'FOR u IN home_CMS FILTER u._key == "11607660" UPDATE u WITH { productWallet: u.productWallet + ' +
                      data.total +
                      " } IN home_CMS",
                    (data) => {}
                  );
                  //send email to customer..
                  //console.log(data2[0]);

                  let text1 = ` To open <a href = '${config.minor_site_url}/customer-order'>click here  </a>or copy paste Following Url into Browser: ${config.minor_site_url}/customer-order`;

                  let msg = {
                    to: `${data2[0].email}`,
                    subject: "Order Summary",

                    text: `<p>Your Order is successfully placed and Will be delivered to ${data2[0].addresses[0].address},${data2[0].addresses[0].city}, ${data2[0].addresses[0].postal}: </p> ${text1}`,
                  };
                  //  notification.email(msg);
                  sendMail.sendMail(
                    data2[0].email,
                    msg.subject,
                    msg.text,
                    msg.subject,
                    "new.ejs"
                  );

                  // send email to admin..
                  let msg2 = {
                    to: config.email.admin_to,
                    subject: "New Product Order",

                    text: `<p> Order is successfully placed for  ${data2[0].addresses[0].address},${data2[0].addresses[0].city}, ${data2[0].addresses[0].postal}: </p> ${text1}`,
                  };
                  //  notification.email(msg2);
                  sendMail.sendMail(
                    config.email.admin_to,
                    msg2.subject,
                    msg2.text,
                    msg2.subject,
                    "new.ejs"
                  );

                  resolve(data2);
                } else {
                  reject([]);
                }

                return;
              }
            );
          }
        }
      );
    });
  },
  setcafeorder: (data) => {
    //console.log('data',JSON.stringify(data.order))

    return new Promise(async function (resolve, reject) {
      /*db.query('LET c = DOCUMENT("customers/'+data.key+'") UPDATE c WITH {orders: PUSH(c.orders, '+JSON.stringify(data.order)+'), true} IN customers RETURN NEW', (data2)=>{
                    console.log(data2)
                    if (data2.length>0){
                        resolve(data2)
                    } else {
                        resolve([])
                    }

                })*/

      let doc = {
        order: data.order,
        total: data.total,
        pickup: data.pickup,
        tableNumber: data.tableNumber,
        liquor_img: data.liquor_img ? data.liquor_img : "",
        order_id: Math.round(+new Date() / 1000),
        order_status: "Pending",
        _created: new Date().toISOString(),
      };

      //const { token, currency, price } = req.body;
      const charge = await stripe.charges.create({
        amount: parseInt(data.total) * 100,
        currency: "INR",
        source: data.token,
      });

      if (charge && charge.id) {
        console.log(charge.id);

        doc.stripe_transcation_id = charge.id;

        db.query(
          'LET c = DOCUMENT("customers/' +
            data.key +
            '") UPDATE c WITH {cafeorders: PUSH(c.cafeorders, ' +
            JSON.stringify(doc) +
            ")} IN customers RETURN NEW",
          (data2) => {
            console.log(data2);
            if (data2) {
              let date = moment().toISOString(),
                transaction = {
                  items: data.order.cart,
                  transaction_id: doc.order_id,
                  stripe_transcation_id: charge.id,
                  total: data.total,
                  type: "Food Cafe Order",
                  sub_total: 0,
                  tax: 0,
                  delivery: 0,
                  cafe: 1,
                  pickup: data.pickup == 1 ? "Yes" : "No",
                  tableNumber: data.tableNumber,
                  liquor_img: data.liquor_img ? data.liquor_img : "",
                  delivery_method: "",
                  status: "complete",
                  method: "stripe",
                  customer_id: data.key,
                  payment: {
                    vouchers: 0,
                    account: 0,
                    card: 0,
                    stripe: data.total,
                    bacs: 0,
                    cash: 0,
                    change: 0,
                    payment_link: 0,
                  },
                  item_total: data.total,
                  delivery: data.delivery ? data.delivery : 0.0,
                  discount_data: data.discount_data,
                  coupan_data: data.coupan_data,
                  temp: "true",
                  order_status: "Pending",
                  _created: date,
                  _updated: date,
                };

              db.query(
                "INSERT " + JSON.stringify(transaction) + " INTO transactions",
                (data) => {}
              );
              // update wallet for admin...
              db.query(
                'FOR u IN home_CMS FILTER u._key == "11607660" UPDATE u WITH { foodWallet: u.foodWallet + ' +
                  data.total +
                  " } IN home_CMS",
                (data) => {}
              );
              //  send notification to customer for food order..

              let text1 = ` To open <a href = '${config.minor_site_url}/food-order'>click here  </a>or copy paste following url into browser: ${config.minor_site_url}/food-order `;
              let msg = {
                to: data2[0].email,
                subject: "Food order confirmation.",
                text: `<h4>Your Food Order is successfully placed for table ${data.tableNumber}.</h4> ${text1}`,
              };
              sendMail.sendMail(
                data2[0].email,
                msg.subject,
                msg.text,
                msg.subject,
                "new.ejs"
              );
              // send message to admin for food order...
              let msg2 = {
                to: config.email.admin_to,
                subject: "food order confirmation.",
                text: `<p> Cafe food order is successfully placed for table ${data.tableNumber}.</p>${text1}`,
              };
              sendMail.sendMail(
                config.email.admin_to,
                msg2.subject,
                msg2.text,
                msg2.subject,
                "new.ejs"
              );
              notification.email(msg);
              notification.email(msg2);

              resolve(data2);
            } else {
              reject([]);
            }

            return;
          }
        );
      }
    });
  },
  setcafeorderFromWallet: (data) => {
    return new Promise(async function (resolve, reject) {
      let doc = {
        order: data.order,
        total: data.total,
        pickup: data.pickup,
        tableNumber: data.tableNumber,
        liquor_img: data.liquor_img ? data.liquor_img : "",
        order_id: Math.round(+new Date() / 1000),
        order_status: "Pending",
        payment: "wallet",
        _created: new Date().toISOString(),
      };
      if (1) {
        db.query(
          'LET c = DOCUMENT("customers/' +
            data.key +
            '") UPDATE c WITH {cafeorders: PUSH(c.cafeorders, ' +
            JSON.stringify(doc) +
            ")} IN customers RETURN NEW",
          (data2) => {
            console.log(data2);
            if (data2) {
              let date = moment().toISOString(),
                transaction = {
                  items: data.order.cart,
                  transaction_id: doc.order_id,
                  stripe_transcation_id: "",
                  total: data.total,
                  type: "Food Cafe Order",
                  sub_total: 0,
                  tax: 0,
                  delivery: 0,
                  cafe: 1,
                  pickup: data.pickup == 1 ? "Yes" : "No",
                  tableNumber: data.tableNumber,
                  liquor_img: data.liquor_img ? data.liquor_img : "",
                  delivery_method: "",
                  status: "complete",
                  method: "wallet",
                  customer_id: data.key,
                  payment: {
                    vouchers: 0,
                    account: 0,
                    card: 0,
                    wallet: data.total,
                    bacs: 0,
                    cash: 0,
                    change: 0,
                    payment_link: 0,
                  },
                  item_total: data.total,
                  delivery: data.delivery ? data.delivery : 0.0,
                  discount_data: data.discount_data,
                  //   "coupan_data": data.coupan_data,
                  temp: "true",
                  order_status: "Pending",
                  _created: date,
                  _updated: date,
                };

              db.query(
                "INSERT " + JSON.stringify(transaction) + " INTO transactions",
                (data) => {}
              );
              // update wallet for admin...
              db.query(
                'FOR u IN home_CMS FILTER u._key == "11607660" UPDATE u WITH { foodWallet: u.foodWallet + ' +
                  data.total +
                  " } IN home_CMS",
                (data) => {}
              );
              //update wallet for customer
              db.query(
                `
                    for p in customers filter p._key=='${data.key}' update p with {wallet:p.wallet - ${data.total} } in  customers   
                    return {wallet:p.wallet}
                    `,
                (data) => {}
              );
              //  send notification to customer for food order..

              let text1 = ` To open <a href = '${config.minor_site_url}/food-order'>click here  </a>or copy paste following url into browser: ${config.minor_site_url}/food-order `;
              let msg = {
                to: data2[0].email,
                subject: "Food order confirmation.",
                text: `<h4>Your Food Order is successfully placed for table ${data.tableNumber}.</h4> ${text1}`,
              };
              sendMail.sendMail(
                data2[0].email,
                msg.subject,
                msg.text,
                msg.subject,
                "new.ejs"
              );
              let notiData={
                msg:`Your Food Order is successfully placed for table ${data.tableNumber}.`,
                type: "Food order confirmation.",
                data:{
                  customer_id:data.key
                },
                status:""
              }
              user_notifications.save(notiData)

              // send message to admin for food order...
              let msg2 = {
                to: config.email.admin_to,
                subject: "food order confirmation.",
                text: `<p> Cafe food order is successfully placed for table ${data.tableNumber}.</p>${text1}`,
              };
              sendMail.sendMail(
                config.email.admin_to,
                msg2.subject,
                msg2.text,
                msg2.subject,
                "new.ejs"
              );
              notification.email(msg);
              notification.email(msg2);

              resolve(data2);
            } else {
              reject([]);
            }

            return;
          }
        );
      }
    });
  },
  setorderFromWallet: (data) => {
    return new Promise(async function (resolve, reject) {
      db.query(
        'FOR u IN home_CMS FILTER u._key == "3785478" RETURN u',
        async (data_per) => {
          let percentage = 0;

          if (data_per.length > 0 && data_per[0].share_percentage) {
            //console.log(data[0].share_percentage)
            percentage = parseInt(data_per[0].share_percentage);

            data.order.cart.map((val) => {
              if (val.member_id) {
                let commission = (val.price / 100) * percentage;

                let insert_data = {
                  created_to: "member",
                  member_id: val.member_id,
                  amount: commission,
                  name: val.name,
                  id: val._key,
                  Remarks: "Product Reference commission.",
                  _created: new Date().toISOString(),
                  payment: "wallet",
                };
                // updating order count.....
                db.query(
                  `FOR p IN products
                                FILTER p._key == '${val._key}'
                                UPDATE p WITH { orderCount: p.orderCount + 1 } IN products`,
                  (data) => {}
                );

                db.query(
                  "INSERT " +
                    JSON.stringify(insert_data) +
                    " INTO wallet_transactions",
                  (data) => {}
                );

                db.query(
                  'FOR m IN members FILTER m._key == "' +
                    val.member_id +
                    '" UPDATE m WITH {wallet: m.wallet + ' +
                    commission +
                    "} IN members RETURN NEW.wallet",
                  (wallet) => {
                    console.log("wallet--wallet--", wallet);
                  }
                );
              }
            });
          }

          let doc = {
            order: data.order,
            total: data.total,
            order_id: Math.round(+new Date() / 1000),
            _created: new Date().toISOString(),
          };

          //const { token, currency, price } = req.body;
          //   const charge = await stripe.charges.create({
          //     amount: parseInt(data.total)*100,
          //     currency: 'INR',
          //     source: data.token,
          //   });

          if (1) {
            doc.stripe_transcation_id = "";

            db.query(
              'LET c = DOCUMENT("customers/' +
                data.key +
                '") UPDATE c WITH {orders: PUSH(c.orders, ' +
                JSON.stringify(doc) +
                ")} IN customers RETURN NEW",
              (data2) => {
                console.log(data2);
                if (data2) {
                  let date = moment().toISOString(),
                    transaction = {
                      items: data.order.cart,
                      transaction_id: doc.order_id,
                      stripe_transcation_id: "",
                      total: data.total,
                      type: "Order Product",
                      sub_total: 0,
                      tax: 0,
                      delivery: data.delivery ? data.delivery : 0.0,
                      coupon_data: data.coupon_data ? data.coupon_data : {},
                      delivery_method: "",
                      status: "complete",
                      method: "wallet",
                      customer_id: data.key,
                      order_status: "Pending",
                      payment: {
                        vouchers: 0,
                        account: 0,
                        card: 0,
                        wallet: data.total,
                        bacs: 0,
                        cash: 0,
                        change: 0,
                        payment_link: 0,
                      },
                      item_total: data.total,
                      discount_data: data.discount_data,
                      temp: "true",
                      _created: date,
                      _updated: date,
                    };

                  db.query(
                    "INSERT " +
                      JSON.stringify(transaction) +
                      " INTO transactions",
                    (data) => {}
                  );

                  // update wallet for admin....
                  db.query(
                    'FOR u IN home_CMS FILTER u._key == "11607660" UPDATE u WITH { productWallet: u.productWallet + ' +
                      data.total +
                      " } IN home_CMS",
                    (data) => {}
                  );
                  //update wallet for customer
                  db.query(
                    `FOR u IN customers FILTER u._key == "${data.key}" UPDATE u WITH { wallet: u.wallet - ${data.total} } IN customers`,
                    (data) => {}
                  );
                  //send email to customer..
                  //console.log(data2[0]);

                  let text1 = ` To open <a href = '${config.minor_site_url}/customer-order'>click here  </a>or copy paste Following Url into Browser: ${config.minor_site_url}/customer-order`;

                  let msg = {
                    to: `${data2[0].email}`,
                    subject: "Order Summary",

                    text: `<p>Your Order is successfully placed and Will be delivered to ${data2[0].addresses[0].address},${data2[0].addresses[0].city}, ${data2[0].addresses[0].postal}: </p> ${text1}`,
                  };
                  //  notification.email(msg);
                  sendMail.sendMail(
                    data2[0].email,
                    msg.subject,
                    msg.text,
                    msg.subject,
                    "new.ejs"
                  );
                  let notiData={
                    msg:`Your Order is successfully placed and Will be delivered to ${data2[0].addresses[0].address},${data2[0].addresses[0].city}, ${data2[0].addresses[0].postal}`,
                    type: "Order Summary",
                    data:{
                      customer_id:data.key
                    },
                    status:"Processing"
                  }
                  user_notifications.save(notiData)

                  // send email to admin..
                  let msg2 = {
                    to: config.email.admin_to,
                    subject: "New Product Order",

                    text: `<p> Order is successfully placed for  ${data2[0].addresses[0].address},${data2[0].addresses[0].city}, ${data2[0].addresses[0].postal}: </p> ${text1}`,
                  };
                  //  notification.email(msg2);
                  sendMail.sendMail(
                    config.email.admin_to,
                    msg2.subject,
                    msg2.text,
                    msg2.subject,
                    "new.ejs"
                  );

                  resolve(data2);
                } else {
                  reject([]);
                }

                return;
              }
            );
          }
        }
      );
    });
  },
  lastTransaction: (key, transaction_key) => {
    return new Promise(function (resolve, reject) {
      let date = moment().toISOString(),
        data = {
          date: date,
          transaction_key: transaction_key,
        };

      db.query(
        'LET c = DOCUMENT("customers/' +
          key +
          '") UPDATE c WITH {last_transaction:' +
          JSON.stringify(data) +
          "} IN customers RETURN NEW",
        (data) => {
          if (data.length > 0) {
            resolve(date);
          } else {
            resolve([]);
          }
        }
      );
    });
  },

  getBalance: (key) => {
    return new Promise(function (resolve, reject) {
      db.query(
        'LET c = DOCUMENT("customers/' +
          key +
          '") LET total = HAS(c,"balance") ? c.balance.total : 0 RETURN total',
        (data) => {
          resolve(data[0]);
        }
      );
    });
  },

  useBalance: (key, amount) => {
    return new Promise(function (resolve, reject) {
      customer.getBalance(key).then((balance) => {
        if (parseFloat(balance) >= parseFloat(amount)) {
          db.query(
            'LET c = DOCUMENT("customers/' +
              key +
              '") LET total = HAS(c,"balance") ? c.balance.total : 0 UPDATE c WITH {balance:{total: total - ' +
              amount +
              "}} IN customers RETURN NEW.balance.total",
            (data) => {
              resolve(data[0]);
            }
          );
        } else {
          reject("Not enough funds");
        }
      });
    });
  },

  checkBalance: (key, amount) => {
    return new Promise(function (resolve, reject) {
      customer.getBalance(key).then((balance) => {
        if (parseFloat(balance) >= parseFloat(amount)) {
          resolve(balance);
        } else {
          reject("Not enough account credit");
        }
      });
    });
  },

  getCart: (key) => {
    let query;

    if (key.match(/^[0-9]*$/)) {
      query = 'LET c = DOCUMENT("customers/' + key + '")';
    } else {
      query = 'FOR c IN customers FILTER c.payment_link == "' + key + '"';
    }

    return new Promise(function (resolve, reject) {
      db.query(
        query + ' LET cart = HAS(c,"cart") ? c.cart : null RETURN c',
        (data) => {
          if (data[0] && data[0].cart && data[0].cart.id) {
            localStorage
              .list("cart_", true)
              .then((carts) => {
                cart = carts.filter((item) => {
                  return item.id == data[0].cart.id;
                });

                if (
                  cart.length > 0 &&
                  cart[0].method == "payment_link" &&
                  cart[0].status == "pending"
                ) {
                  resolve(data[0]);
                } else {
                  reject("Payment Link Invalid");
                }
              })
              .catch(() => {
                reject("Payment Link Invalid");
              });
          } else if (data[0] && data[0].cart) {
            localStorage
              .get(data[0].cart)
              .then((cart) => {
                if (
                  cart &&
                  cart.method == "payment_link" &&
                  cart.status == "pending"
                ) {
                  data[0].cart = cart;
                  resolve(data[0]);
                } else {
                  reject("Payment Link Invalid");
                }
              })
              .catch(() => {
                reject("Payment Link Invalid");
              });
          } else {
            reject("Payment Link Invalid");
          }
        }
      );
    });
  },

  processCart: (link, cart_id, intent_id) => {
    return new Promise(function (resolve, reject) {
      db.query(
        'FOR c IN customers FILTER c.payment_link == "' +
          link +
          '" LET cart = HAS(c,"cart") ? c.cart : null UPDATE c WITH {payment_link:"",cart:""} IN customers RETURN {cart:cart,customer:c}',
        (data) => {
          if (
            data &&
            data[0] &&
            data[0].cart &&
            data[0].cart.id &&
            data[0].cart.id == cart_id
          ) {
            data[0].cart.payment_id = intent_id;
            //    data[0].cart.payment = {'online':data[0].cart.total}
            data[0].cart.method = "stripe";

            const transaction = require("../models/transactions");

            transaction
              .insertTransaction(data[0].cart)
              .then((trans_data) => {
                // customer.emptyCart(data[0].customer._key, cart_id).then((cart_data)=>{
                data[0].transaction_link =
                  "/dashboard/checkout/transactions/print/" + trans_data._key;
                resolve(data[0]);
                // }).catch((err)=>{
                //     reject(err)
                // })
                // resolve(data[0])
              })
              .catch((err) => {
                reject(err);
              });
          } else if (data && data[0] && data[0].cart) {
            localStorage.get(data[0].cart).then((cart_data) => {
              cart_data.payment_id = intent_id;
              cart_data.method = "stripe";

              const transaction = require("../models/transactions");

              transaction
                .insertTransaction(cart_data)
                .then((trans_data) => {
                  // customer.emptyCart(data[0].customer._key, cart_id).then((cart_data)=>{
                  data[0].transaction_link =
                    "/dashboard/checkout/transactions/print/" + trans_data._key;
                  resolve(data[0]);
                  // }).catch((err)=>{
                  //     reject(err)
                  // })
                  // resolve(data[0])
                })
                .catch((err) => {
                  reject(err);
                });
            });
          } else {
            reject("Payment link not found: " + link);
          }
        }
      );
    });
  },

  emptyCart: (key, cart_id) => {
    return new Promise(function (resolve, reject) {
      db.query(
        'LET c = DOCUMENT("customers/' +
          key +
          '") UPDATE c WITH {payment_link:"",cart:""} IN customers RETURN NEW',
        (data) => {
          if (data[0].cart == "") {
            resolve("ok");
          } else {
            reject("not cleared");
          }
        }
      );
    });
  },

  findOrSave: (data, req) => {
    return new Promise(async (resolve, reject) => {
      if (!data.email && !data.tel) {
        resolve("Please specify an email address and mobile number");
        return false;
      } else if (!data.email) {
        data.email = "false";
        data.tel = data.tel.replace(/\s/g, "");
      } else if (!data.tel) {
        data.tel = "false";
      }

      let existing = await customer.checkExisting(data);

      if (existing && existing[0] && existing[0]._key) {
        // req.session.client = 'existing'
        // req.session.user = existing[0]
        existing[0].existing = true;
        resolve(existing[0]);
      } else {
        customer.save(data).then((cust_data) => {
          // req.session.client = 'new'
          // req.session.user = cust_data
          // console.log(req.session)
          resolve(cust_data);
        });
      }
    });
  },

  updateBalance: (intent, req) => {
    return new Promise(async (resolve, reject) => {
      if (req && intent) {
        // if customer is topping up

        collection
          .document(intent.metadata.balance_top_up)
          .then(async (doc) => {
            if (!doc.balance) {
              doc.balance = {
                total: 0,
                payment_intents: [],
                backup: {
                  data: "never",
                  amount: 0,
                },
              };
            } else {
              doc.balance.backup = {
                date: new Date().toISOString(),
                amount: doc.balance.total,
              };
            }

            let amount = parseFloat(intent.amount) / 100;

            if (!parseFloat(doc.balance.total)) {
              doc.balance.total = 0;
            }
            doc.balance.total = parseFloat(doc.balance.total) + amount;

            if (!doc.balance.payment_intents) {
              doc.balance.payment_intents = [];
            }

            doc.balance.payment_intents.push({
              date: new Date().toISOString(),
              id: req.session.intent,
              old: doc.balance.backup.amount,
              new: doc.balance.total,
            });

            let date = moment().toISOString();
            let transaction = {
              items: [
                {
                  name: "Account Payment £" + amount,
                  price: amount,
                  type: "account",
                  quantity: "1",
                  sub_total: 0,
                  tax: 0,
                },
              ],
              total: amount,
              sub_total: 0,
              tax: 0,
              delivery: 0,
              delivery_method: "",
              status: "complete",
              method: "stripe",
              customer_id: doc._key,
              payment: {
                vouchers: 0,
                account: 0,
                card: 0,
                bacs: 0,
                cash: 0,
                change: 0,
                payment_link: amount,
              },
              item_total: amount,
              customer: {
                name: doc.name.first + " " + doc.name.last,
                avatar: doc.avatar,
              },
              temp: "true",
              _created: date,
              _updated: date,
            };

            db.query(
              "INSERT " + JSON.stringify(transaction) + " INTO transactions"
            );

            collection.update(doc, doc).then(() => {
              resolve(doc);
            });
          });
      } else if (intent && intent.customer_id && intent.amount) {
        // balance top up from checkout

        collection.document(intent.customer_id).then(async (doc) => {
          if (!doc.balance) {
            doc.balance = {
              total: 0,
              payment_intents: [],
              backup: {
                data: "never",
                amount: 0,
              },
            };
          } else {
            doc.balance.backup = {
              date: new Date().toISOString(),
              amount: doc.balance.total,
            };
          }

          let amount = parseFloat(intent.amount);

          if (!parseFloat(doc.balance.total)) {
            doc.balance.total = 0;
          }
          doc.balance.total = parseFloat(doc.balance.total) + amount;

          if (!doc.balance.payment_intents) {
            doc.balance.payment_intents = [];
          }

          doc.balance.payment_intents.push({
            date: new Date().toISOString(),
            id: intent._id,
            old: doc.balance.backup.amount,
            new: doc.balance.total,
          });

          collection.update(doc, doc).then(() => {
            resolve(doc);
          });
        });
      } else if (intent.subscription) {
        // membership payment

        collection.document(intent.client_key).then(async (doc) => {
          if (!doc.balance) {
            doc.balance = {
              total: 0,
              payment_intents: [],
              backup: {
                data: "never",
                amount: 0,
              },
            };
          } else {
            doc.balance.backup = {
              date: new Date().toISOString(),
              amount: doc.balance.total,
            };
          }

          let amount = intent.amount_paid / 100,
            deposit_amount = intent.deposit_amount;

          if (!parseFloat(doc.balance.total)) {
            doc.balance.total = 0;
          }
          doc.balance.total = parseFloat(doc.balance.total) + deposit_amount;

          if (!doc.balance.payment_intents) {
            doc.balance.payment_intents = [];
          }

          doc.balance.payment_intents.push({
            date: new Date().toISOString(),
            id: intent.payment_intent,
            old: doc.balance.backup.amount,
            new: doc.balance.total,
          });

          await customer.membershipReciept(intent, intent.membership_type);

          collection.update(doc, doc).then(() => {
            resolve(doc);
          });
        });
      } else {
        reject("Not found");
      }
    });
  },

  membershipReciept: (intent, type) => {
    return new Promise(async (resolve, reject) => {
      let doc = await collection.document(intent.client_key),
        amount = intent.amount_paid / 100;

      let date = moment().toISOString(),
        transaction = {
          items: [
            {
              name: type + " payment £" + amount,
              price: amount,
              type: "account",
              quantity: "1",
              sub_total: 0,
              tax: 0,
            },
          ],
          total: amount,
          sub_total: 0,
          tax: 0,
          delivery: 0,
          delivery_method: "",
          status: "complete",
          method: "stripe",
          customer_id: doc._key,
          payment: {
            vouchers: 0,
            account: 0,
            card: 0,
            stripe: amount,
            bacs: 0,
            cash: 0,
            change: 0,
            payment_link: 0,
          },
          item_total: amount,
          customer: {
            name: doc.name.first + " " + doc.name.last,
            avatar: doc.avatar,
          },
          temp: "true",
          _created: date,
          _updated: date,
        };

      db.query(
        "INSERT " + JSON.stringify(transaction) + " INTO transactions",
        (data) => {
          resolve();
        }
      );
    });
  },

  addRewardPoints: (key, points) => {
    return new Promise(async (resolve, reject) => {
      db.query(
        'FOR c IN customers FILTER c._key == "' +
          key +
          '" UPDATE c WITH {reward_points: c.reward_points + ' +
          points +
          "} IN customers RETURN NEW.reward_points",
        (points) => {
          resolve(points);
        }
      );
    });
  },

  sendPaymentLink: (data) => {
    return new Promise(function (resolve, reject) {
      let hash = db.hash("payment-link" + Date.now()),
        filter;

      if (!data.cart) {
        reject("Invalid data");
        return false;
      }

      if (data.email) {
        filter = 'c.email == "' + data.email + '"';
      } else if (data.key) {
        filter = 'c._key == "' + data.key + '"';
      } else {
        reject("Invalid data");
        return false;
      }

      let link_method = "sms",
        msg_text =
          "Please click the following link to pay a total of £" +
          data.cart.total +
          " for your items. Please contact us if there are any problems. Thanks very much for your business." +
          config.site_url +
          "/checkout/stripe/" +
          hash;

      if (data.cart.pl_notification_method) {
        link_method = data.cart.pl_notification_method;
      }

      db.query(
        "FOR c in customers FILTER " +
          filter +
          ' UPDATE c WITH {payment_link:"' +
          hash +
          '",cart:' +
          JSON.stringify(data.cart.id) +
          "} IN customers RETURN NEW",
        (customer_data) => {
          if (customer_data.length > 0) {
            if (
              link_method == "sms" &&
              customer_data[0].tel &&
              customer_data[0].tel.match(/^(07|\+447)/)
            ) {
              let msg = {
                to: customer_data[0].tel,
                subject: "Payment Link",
                text: msg_text,
              };

              notification.sms(msg);
              resolve("Payment link sent to " + customer_data[0].tel);
            } else if (customer_data[0].email) {
              let msg = {
                to: customer_data[0].email,
                subject: "Payment Link",
                text: msg_text,
                template_id: "d-565518adf83f4cf08c6dac8c3892ccde",
                button_text: "Pay Now",
                button_url: config.site_url + "/checkout/stripe/" + hash,
              };

              // notification.email(msg)
              sendMail.sendMail(
                customer_data[0].email,
                msg.subject,
                msg.text,
                msg.subject,
                "new.ejs"
              );
              resolve("Payment link sent to " + customer_data[0].email);
            } else {
              reject("No client email or mobile number");
            }
          } else {
            reject(customer_data);
          }
        }
      );
    });
  },

  addLog: (key, user, log) => {
    return new Promise(function (resolve, reject) {
      let date = moment().utc().toISOString();

      collection
        .document(key)
        .then((doc) => {
          if (!doc.log) {
            doc.log = [];
          }

          let payload = {
            date: date,
            user: {},
            log: log,
          };

          if (user && user._key) {
            payload.user = {
              name: user.name.first + " " + user.name.last,
              _key: user._key,
              _id: user._id,
              email: user.email,
              guard: user.guard,
            };
          }

          doc.log.push(payload);

          doc._updated = date;

          collection
            .update(doc, doc)
            .then(() => {
              resolve();
            })
            .catch(() => {
              reject("Not Saved");
            });
        })
        .catch(() => {
          reject("Not Found");
        });
    });
  },

  addNote: (key, note, req) => {
    note = {
      date: moment().utc().toISOString(),
      note: note,
      user: "system",
    };

    if (req && req.session && req.session.user) {
      note.user = req.session.user._key;
    }

    return new Promise(function (resolve, reject) {
      db.query(
        'LET c = DOCUMENT("customers/' +
          key +
          '") UPDATE c WITH {notes: PUSH(c.notes, ' +
          JSON.stringify(note) +
          "), true} IN customers RETURN NEW",
        (data) => {
          if (data[0]) {
            resolve(data[0]);
          } else {
            reject([]);
          }
        }
      );
    });
  },

  saveDocument: (key, filename, filepath) => {
    let doc = {
      name: filename,
      path: filepath,
      _created: new Date().toISOString(),
    };

    return new Promise(function (resolve, reject) {
      db.query(
        'LET c = DOCUMENT("customers/' +
          key +
          '") UPDATE c WITH {documents: PUSH(c.documents, ' +
          JSON.stringify(doc) +
          ")} IN customers RETURN NEW",
        (data) => {
          if (data[0] && data[0].documents.length > 0) {
            resolve(data[0].documents);
          } else {
            reject([]);
          }
        }
      );
    });
  },

  checkExisting: (data) => {
    return new Promise(function (resolve, reject) {
      let filter = "";

      if (data.email && data.email.match(/@/)) {
        filter += 'LOWER(c.email) == "' + data.email.toLowerCase() + '" || ';
      }

      /*if (data.tel){
                    filter += 'SUBSTITUTE(c.tel," ", "") == "'+data.tel.replace(/\s/g,'')+'"'
                }*/

      filter = filter.replace(/\s\|\|\s$/, "");

      console.log("FOR c IN customers FILTER " + filter + " RETURN c");

      db.query(
        "FOR c IN customers FILTER " + filter + " RETURN c",
        (check_data) => {
          if (check_data) {
            resolve(check_data);
          } else {
            resolve(false);
          }
        }
      );
    });
  },

  save: async (data) => {
    let existing = false;

    data.customer_of = [];
    data.customer_of.push("54855602");

    if (data.tel) {
      data.tel = data.tel.replace(/\s/g, "");
    }

    if (typeof data.name == "string") {
      let name = data.name.split(" ");
      data.name = {};
      data.name.first = name[0];
      data.name.last = name[name.length - 1];
    }

    if (data.password) {
      let pwd = db.hash(data.password);
      delete data.password;
      delete data.cpassword;

      data.password = pwd;
      data.password_reset = db.hash("password-reset" + Date.now());
      data.verify = false;
    }

    let date = new Date().toISOString();

    if (data._key) {
      data._updated = date;
    } else {
      data._created = date;
      data._updated = date;

      existing = await customer.checkExisting(data);
    }

    if (data.dob && data.dob.date && data.dob.month) {
      let date = data.dob.date + "-" + data.dob.month;

      if (data.dob.year) {
        if (data.dob.year.length == 2 && parseInt(data.dob.year) >= 40) {
          date += "-19" + data.dob.year;
        } else if (data.dob.year.length == 4) {
          date += "-" + data.dob.year;
        } else {
          date += moment().format("YYYY");
        }
      }

      data.birth_date = moment(date, "D-M-YYYY").toISOString();
    }

    return new Promise(async (resolve, reject) => {
      if (existing && existing[0] && existing[0].name) {
        reject("Client's Email already exists: " + existing[0].email); //name.first+' '+existing[0].name.last
      } else {
        if (data.name && data.name.first && data.name.last) {
          await image
            .saveAll(data, data.name.first + "-" + data.name.last, "avatars")
            .then((new_data) => {
              data = new_data;
            });
        }

        db.query(
          'UPSERT {_key:"' +
            data._key +
            '"} INSERT ' +
            JSON.stringify(data) +
            " UPDATE " +
            JSON.stringify(data) +
            " IN customers RETURN NEW",
          (data) => {
            if (data.length > 0) {
              let msg = {
                to: data[0].email,
                subject: "Verify Your Email Address",
                text:
                  "Welcome to " +
                  config.site_name +
                  "! To complete your registration, please click the link below to Verify your email address. ",
                button_text: "Verify Your Email",
                button_url:
                  config.minor_site_url + "/email-verify/" + data[0]._key,
              };
              const text = `${msg.text} <br/> <a class="verifyBtn" style=" background-color: #4e5546;margin-top:5px;border-radius: 8px;border: none; color: white;
            padding: 15px 32px;
            text-align: center;
            text-decoration: none;
            display: inline-block;
            font-size: 16px;" href="${msg.button_url}">${msg.button_text}</a>`;
              sendMail
                .sendMail(msg.to, msg.subject, text, msg.subject, "new.ejs")
                .then(() => {
                  resolve(data[0]);
                });
              // notification
              //   .toCustomer("complete_registration_minor", data[0])
              //   .then(() => {
              //     resolve(data[0]);
              //   });
              resolve(data[0]);
            } else {
              reject("Client not saved");
            }
          }
        );
      }
    });
  },

  delete: (key) => {
    return new Promise(function (resolve, reject) {
      collection.remove(key).then(
        () => {
          resolve("deleted");
        },
        (err) => {
          reject(err);
        }
      );
    });
  },

  checkRegistration: (user) => {
    return new Promise(async (resolve, reject) => {
      if (typeof user == "sting") {
        user = await collection.document(user);
      }

      if (user.email) {
        let hash = db.hash("password-reset" + Date.now()),
          email_data = {
            email: user.email,
            hash: hash,
          };

        db.query(
          'LET cust = DOCUMENT("customers/' +
            user._key +
            '") UPDATE cust WITH {password_reset:"' +
            hash +
            '"} IN customers',
          (user_data) => {
            let email_type = "password_reset";
            if (!user.password) {
              email_type = "complete_registration";
            }
            notification.toCustomer(email_type, email_data).then(() => {
              resolve("Sent");
            });
          }
        );
      } else {
        reject("Customer check registration: No email address");
      }
    });
  },

  createAuthLink: (key, req) => {
    return new Promise(function (resolve, reject) {
      let hash, hash_link;

      collection
        .document(key)
        .then((cust_data) => {
          // if (!cust_data.password){
          //     hash = db.hash('password-reset'+Date.now())
          //     hash_link = config.site_url+'/login/customer/'+hash
          //     cust_data.password_reset = hash
          // } else {
          hash = db.hash("auth-link" + Date.now());
          hash_link = config.site_url + "/login/link/" + hash;
          cust_data.login_link = hash;
          //

          collection
            .update(cust_data, cust_data)
            .then((save_data) => {
              resolve(hash_link);
            })
            .catch((err) => {
              reject(err);
            });
        })
        .catch((err) => {
          reject(err);
        });
    });
  },

  sendAuthLink: (data, req) => {
    return new Promise(async (resolve, reject) => {
      let link = await customer.createAuthLink(data.key),
        client = await customer.find(
          data.key,
          "{_id:c._id,name:c.name,email:c.email,tel:c.tel,login_link:c.login_link}"
        );

      events.trigger("send_account_link", client);
      resolve("Account link sent");
    });

    // if (!data.method){
    //     data.method == 'sms'
    // }
    //
    // let hash = db.hash('auth-link'+Date.now()),
    //     hash_link = config.site_url+'/login/link/'+hash
    //     msg_text = "Please click this one-time link to access your "+config.site_name+" account. "+hash_link
    //
    //
    // return new Promise(function(resolve, reject) {
    //
    //     collection.document(data.key).then((cust_data)=>{
    //
    //         cust_data.login_link = hash
    //
    //         collection.update(cust_data,cust_data).then((cust_new)=>{
    //
    //             if (data.method == 'sms' && cust_data.tel && cust_data.tel.match(/^(07|\+447)/)){
    //
    //                 let msg = {
    //                     to: cust_data.tel,
    //                     subject: 'Account Link',
    //                     text: msg_text
    //                 }
    //
    //                 notification.sms(msg)
    //                 customer.addLog(data.key,req.session.user,'Account link sent via '+cust_data.tel)
    //                 resolve('Account link sent to '+cust_data.tel)
    //
    //             } else if (cust_data.email) {
    //
    //                 let msg = {
    //                     to: cust_data.email,
    //                     subject: 'Account Login Link',
    //                     text: msg_text,
    //                     template_id: "d-565518adf83f4cf08c6dac8c3892ccde",
    //                     button_text: 'Login',
    //                     button_url: hash_link
    //                 }
    //
    //                 notification.email(msg)
    //                 customer.addLog(data.key,req.session.user,'Account link sent to '+cust_data.email)
    //                 resolve('Account link sent to '+cust_data.email)
    //
    //             } else {
    //                 reject('No client email or mobile number')
    //             }
    //
    //         }).catch((err)=>{
    //             reject(err)
    //         })
    //
    //     }).catch((err)=>{
    //         reject(err)
    //     })
    //
    // })
  },

  getAuthLink: (key) => {
    return new Promise(function (resolve, reject) {
      db.query(
        'FOR c in customers FILTER c.login_link == "' +
          key +
          '" UPDATE c WITH {login_link:""} IN customers RETURN c',
        (data) => {
          if (data.length > 0) {
            resolve(data[0]);
          } else {
            reject(
              "Sorry, this is a one-time link. Please ask the salon for a new link, or click 'forgot password' to reset"
            );
          }
        }
      );
    });
  },

  verify_email: (key, data) => {
    console.log("___key", key, data.params.function);

    return new Promise(function (resolve, reject) {
      db.query(
        'FOR c in customers FILTER c._key == "' +
          data.params.function +
          '" UPDATE c WITH {verify:"true"} IN customers RETURN c',
        (data) => {
          if (data.length > 0) {
            resolve([1]);
          } else {
            resolve([]);
          }
        }
      );
    });
  },

  updatecart: (data) => {
    console.log("___key", data);

    return new Promise(function (resolve, reject) {
      db.query(
        'FOR c in customers FILTER c._key == "' +
          data.key +
          '" UPDATE c WITH {cart:(' +
          data.cart +
          ")} IN customers RETURN c.cart",
        (data) => {
          console.log(data);
          if (data.length > 0) {
            resolve(data);
          } else {
            resolve([]);
          }
        }
      );
    });
  },

  authenticate: (data) => {
    return new Promise(function (resolve, reject) {
      db.query(
        'FOR c in customers FILTER c.email == "' + data.email + '" RETURN c',
        (cust_data) => {
          if (cust_data.length > 0) {
            if (
              data.password &&
              cust_data[0].password &&
              cust_data[0].password == db.hash(data.password)
            ) {
              cust_data[0].guard = "customer";
              resolve(cust_data[0]);
            } else {
              customer.checkRegistration(cust_data[0]);
              reject(
                "We have sent you a link to your registered email address with more detail."
              );
            }
          } else {
            reject("Incorrect Email address or password");
          }
        }
      );
    });
  },

  getprofile: (data) => {
    return new Promise(function (resolve, reject) {
      db.query(
        'FOR c in customers FILTER c._key == "' + data.key + '" RETURN c',
        (cust_data) => {
          if (cust_data.length > 0) {
            cust_data[0].guard = "customer";
            resolve(cust_data[0]);
          } else {
            resolve([]);
          }
        }
      );
    });
  },

  authenticateminor: (data) => {
    return new Promise(function (resolve, reject) {
      db.query(
        'FOR c in customers FILTER c.email == "' +
          data.email +
          '" RETURN {_key:c._key,password:c.password,verify:c.verify,guard:c.guard,name:c.name,email:c.email,_id:c._id,cart:c.cart,name:c.name}',
        (cust_data) => {
          console.log("cust_data", cust_data);

          if (cust_data.length > 0) {
            if (
              data.password &&
              cust_data[0].password &&
              cust_data[0].password == db.hash(data.password) &&
              cust_data[0].verify == "true"
            ) {
              cust_data[0].guard = "customer";
              resolve(cust_data[0]);
            } else if (
              cust_data[0].verify == "false" ||
              cust_data[0].verify == false
            ) {
              resolve([]);
            } else {
              //customer.checkRegistration(cust_data[0])
              reject(
                "We have sent you a link to your registered email address with more detail."
              );
            }
          } else {
            reject("Incorrect Email address or password");
          }
        }
      );
    });
  },

  appointments: (key) => {
    return new Promise(function (resolve, reject) {
      let query =
        'FOR c in customers LET a = (FOR a in appointments FOR s in staff FILTER a.customer_id == "' +
        key +
        '" && a.staff_id == s._key || a.service_client_id == "' +
        key +
        '" && a.staff_id == s._key RETURN MERGE(a,{staff:s})) FILTER c._key == "' +
        key +
        '" RETURN MERGE(c,{appointments:a})';

      db.query(query, (data) => {
        if (data.length > 0) {
          resolve(data[0]);
        } else {
          resolve({});
        }
      });
    });
  },

  today: () => {
    return new Promise(function (resolve, reject) {
      let filter = "",
        return_fields =
          "{_key:c._key,name:{first:c.name.first,last:c.name.last},email:c.email,tel:c.tel,avatar:c.avatar, gender:c.gender, notes:LENGTH(c.notes), address: c.address, dob: c.dob}";

      db.query(
        'FOR a in appointments FOR c in customers FILTER a.customer_id == c._key && DATE_COMPARE(a.date, DATE_NOW(), "years", "days") LIMIT 10 SORT a.date ASC RETURN DISTINCT ' +
          return_fields,
        (data) => {
          if (data.length > 0) {
            resolve(data);
          } else {
            db.query(
              "FOR c in customers SORT c._updated DESC LIMIT 10 RETURN " +
                return_fields,
              (data) => {
                if (data.length > 0) {
                  resolve(data);
                } else {
                  resolve([]);
                }
              }
            );
          }
        }
      );
    });
  },
  searchbymember: (data, req) => {
    console.log(req.query);
    return new Promise(function (resolve, reject) {
      let filter = "",
        return_fields =
          "{_key:c._key,name:{first:c.name.first,last:c.name.last},email:c.email,tel:c.tel,avatar:c.avatar, gender:c.gender, notes:LENGTH(c.notes), address: c.address, dob: c.dob}";

      console.log("searchbymember", req.session.user._key); //c.client_of=="'+req.session.user._key+'" &&
      db.query(
        'FOR c in customers FILTER  (LOWER(c.email) LIKE "' +
          req.query.str +
          '%" || LOWER(c.name.first) LIKE "' +
          req.query.str +
          '%" || LOWER(c.tel) LIKE "' +
          req.query.str +
          '%") SORT c._updated DESC LIMIT 30 RETURN ' +
          return_fields,
        (data) => {
          if (data.length > 0) {
            resolve(data);
          } else {
            resolve([]);
          }
        }
      );
    });
  },
  pagination: (data, req) => {
    data.page = data.page - 1;
    let offset = data.page ? data.page * 10 : 0;

    return new Promise(function (resolve, reject) {
      let return_fields =
        "{_key:c._key,name:{first:c.name.first,last:c.name.last},email:c.email,tel:c.tel,avatar:c.avatar, gender:c.gender, notes:LENGTH(c.notes), address: c.address, dob: c.dob}";

      db.query(
        "FOR c in customers LIMIT " +
          offset +
          ",10 SORT c._updated DESC RETURN " +
          return_fields,
        (data) => {
          db.query(
            "FOR u IN customers COLLECT WITH COUNT INTO length RETURN length",
            (data2) => {
              //console.log(data)
              if (data.length > 0 && data2.length > 0) {
                resolve({ data: data, total: data2[0] });
              } else {
                resolve([]);
              }
            }
          );
        }
      );
    });
  },
  todaymember: (data, req) => {
    return new Promise(function (resolve, reject) {
      let filter = "",
        return_fields =
          "{_key:c._key,name:{first:c.name.first,last:c.name.last},email:c.email,tel:c.tel,avatar:c.avatar, gender:c.gender, notes:LENGTH(c.notes), address: c.address, dob: c.dob}";

      db.query(
        'FOR a in appointments FOR c in customers FILTER a.customer_id == c._key && DATE_COMPARE(a.date, DATE_NOW(), "years", "days") && c.client_of=="' +
          req.session.user._key +
          '" SORT a.date ASC RETURN DISTINCT ' +
          return_fields,
        (data) => {
          if (data.length > 0) {
            resolve(data);
          } else {
            console.log("todaymember", req.session.user._key);
            db.query(
              'FOR c in customers FILTER c.client_of=="' +
                req.session.user._key +
                '" SORT c._updated DESC LIMIT 30 RETURN ' +
                return_fields,
              (data) => {
                if (data.length > 0) {
                  resolve(data);
                } else {
                  resolve([]);
                }
              }
            );
          }
        }
      );
    });
  },
  getcustoerForMembersPage: async (data, res) => {
    console.log(data);

    let offset = data.page ? data.page * 10 : 10;
    offset = parseInt(offset) - 10;

    console.log("offset", offset);

    console.log(`FOR q IN appointments 
            FILTER q.staff_id == "${data.cust_id}" 
            COLLECT customerID = q.customer_id INTO customerGroup 
            LET customer = (FOR r IN customers FILTER r._key == customerID LIMIT 1 RETURN r)  LIMIT ${offset},10
            RETURN {
              "id": customerID,
              "name": customer[0].name,
              "email": customer[0].email,
              "tel": customer[0].tel,
              "joined": customer[0]._created,
              "count": LENGTH(customerGroup)
            }`);

    return new Promise(async function (resolve, reject) {
      await db.query(
        `FOR q IN appointments 
             FILTER q.staff_id == "${data.cust_id}" 
             COLLECT customerID = q.customer_id INTO customerGroup 
             LET customer = (FOR r IN customers FILTER r._key == customerID LIMIT 1 RETURN r)  LIMIT ${offset},10
             RETURN {
               "id": customerID,
               "name": customer[0].name,
               "email": customer[0].email,
               "tel": customer[0].tel,
               "joined": customer[0]._created,
               "count": LENGTH(customerGroup)
             }`,
        async (data1) => {
          console.log("dataaaaa", data1.length);
          //FOR u IN customers COLLECT WITH COUNT INTO length RETURN length
          await db.query(
            `FOR q IN appointments 
                    FILTER q.staff_id == "${data.cust_id}"
                    COLLECT customerID = q.customer_id INTO customerGroup
                    LET customer = (FOR r IN customers FILTER r._key == customerID LIMIT 1 RETURN r)
                    RETURN {
                      "id": customerID
                    }`,
            (data2) => {
              console.log("dataaaaa2", data2.length);
              if (data1.length > 0 && data2.length > 0) {
                resolve({ data: data1, total: data2.length });
              } else {
                resolve([]);
              }
            }
          );
        }
      );
    });
  },
  getcustoerForMembers: async (data, res) => {
    console.log(data);

    return new Promise(async function (resolve, reject) {
      // await db.query(`for p in appointments FILter p.staff_id=="${data}" RETURN DISTINCT p.customer_id`,(data2)=>{

      //     console.log(data2)

      // })
      await db.query(
        `FOR q IN appointments 
             FILTER q.staff_id == "${data}"
             COLLECT customerID = q.customer_id INTO customerGroup
             LET customer = (FOR r IN customers FILTER r._key == customerID LIMIT 1 RETURN r)
             RETURN {
               "id": customerID,
               "name": customer[0].name,
               "email": customer[0].email,
               "tel": customer[0].tel,
               "joined": customer[0]._created,
               "count": LENGTH(customerGroup)
             }`,
        (data) => {
          if (data.length > 0) {
            resolve(data);
          } else {
            resolve([]);
          }
        }
      );
    });
  },
  getcustomerAppointments: async (data, res) => {
    console.log(`for q in appointments FILTER q.customer_id=='${data.id}' and q.staff_id=='${data.user}' and q.order_id SORT q._created DESC return
            {"service":q.service_name,"_key":q._key,"customerId":q.customer_id,"serviceId":q.service_id,"transactionId":q.order_id,"service_name":q.service_name,"staffId":q.staff_id,"date":q.date,"end_date":q.end_date,"duration":q.duration,"paid_status":q.paid,
            "source":q.source,"total":q.totals}`);

    return new Promise(async function (resolve, reject) {
      await db.query(
        `for q in appointments FILTER q.customer_id=='${data.id}' and q.staff_id=='${data.user}' and q.order_id SORT q._created DESC return
              {"service":q.service_name,"_key":q._key,"customerId":q.customer_id,"serviceId":q.service_id,"transactionId":q.order_id,"service_name":q.service_name,"staffId":q.staff_id,"date":q.date,"end_date":q.end_date,"duration":q.duration,"paid_status":q.paid,
              "source":q.source,"total":q.totals}`,
        (data) => {
          if (data.length > 0) {
            resolve(data);
          } else {
            resolve([]);
          }
        }
      );
    });
  },
  getcustomerAppointmentsNew: (data) => {
    return new Promise(async function (resolve, reject) {
      console.log(data);
      let filter=""
      data.filter?.forEach((txt)=>{   
          if(txt){
            filter+=`and ${txt}`
          }
      })
      
     
      await db.query(
        `for q in appointments FILTER q.customer_id=='${data.id}' and q.staff_id=='${data.user}' ${filter} and q.order_id  ${data.sort} LIMIT ${data.page},${data.limit} return
              {"service":q.service_name,"_key":q._key,"customerId":q.customer_id,"serviceId":q.service_id,"transactionId":q.order_id,"service_name":q.service_name,"staffId":q.staff_id,"date":q.date,"end_date":q.end_date,"duration":q.duration,"paid_status":q.paid,
              "source":q.source,"total":q.totals}`,
        (data1) => {
          if (data1.length > 0) {
            let q = `FOR q IN appointments
FILTER q.customer_id == '${data.id}' AND q.staff_id == '${data.user}' ${filter} AND q.order_id
COLLECT WITH COUNT INTO length
RETURN length `;
            db.query(q, (cou) => {
              console.log("count", cou);
              resolve({ data: data1, count: cou[0] });
            });
          } else {
            resolve([]);
          }
        }
      );
    });
  },
  sendReset: (data) => {
    return new Promise(function (resolve, reject) {
      let hash = db.hash("password-reset" + Date.now()),
        filter;

      if (data.email) {
        filter = 'c.email == "' + data.email + '"';
      } else if (data.key) {
        filter = 'c._key == "' + data.key + '"';
      } else {
        reject("Invalid data");
        return false;
      }

      db.query(
        "FOR c in customers FILTER " +
          filter +
          ' UPDATE c WITH {password_reset:"' +
          hash +
          '"} IN customers RETURN NEW',
        (customer_data) => {
          if (customer_data.length > 0) {
            let msg;

            // if (!customer_data[0].password){
            //
            //     let email_data = {
            //         hash: hash,
            //         email: customer_data[0].email
            //     }
            // //    notification.toCustomer('complete_registration',email_data)
            //
            // } else {
            //
            //     let email_data = {
            //         hash: hash,
            //         email: customer_data[0].email
            //     }
            //     notification.toCustomer('password_reset',email_data)
            //
            // }
            //
            //
            // notification.email(msg)

            events.trigger("password_reset", customer_data[0]);
            resolve(data[0]);
          } else {
            reject();
          }
        }
      );
    });
  },
  passwordreset: (data) => {
    console.log(data);

    return new Promise(function (resolve, reject) {
      let hash = db.hash(data.email + Date.now()),
        filter;

      if (data.email) {
        filter = 'c.email == "' + data.email + '"';
      } else if (data.key) {
        filter = 'c._key == "' + data.key + '"';
      } else {
        reject("Invalid data");
        return false;
      }

      db.query(
        "FOR c in customers FILTER " +
          filter +
          ' UPDATE c WITH {password_reset:"' +
          hash +
          '"} IN customers RETURN NEW',
        (customer_data) => {
          if (customer_data.length > 0) {
            let msg;

            // if (!customer_data[0].password){
            //
            //     let email_data = {
            //         hash: hash,
            //         email: customer_data[0].email
            //     }
            // //    notification.toCustomer('complete_registration',email_data)
            //
            // } else {
            //
            //     let email_data = {
            //         hash: hash,
            //         email: customer_data[0].email
            //     }
            //     notification.toCustomer('password_reset',email_data)
            //
            // }
            //
            //
            // notification.email(msg)

            notification
              .toCustomer("password_reset_minor", customer_data[0])
              .then(() => {
                resolve(customer_data[0]);
              });
          } else {
            reject();
          }
        }
      );
    });
  },

  resetPassword: (data) => {
    return new Promise(function (resolve, reject) {
      if (data.password != data.password_conf || !data.password) {
        reject("Passwords do not match");
      } else {
        db.query(
          'FOR c in customers FILTER LOWER(c.email) == "' +
            data.email.toLowerCase() +
            '" && c.password_reset == "' +
            data.hash +
            '" UPDATE c WITH {password:"' +
            db.hash(data.password) +
            '", password_reset:""} IN customers RETURN NEW',
          (data) => {
            if (data.length > 0) {
              //notification.toCustomer('password_changed',data[0]).then(()=>{
              resolve(data[0]);

              //})
            } else {
              reject(data);
            }
          }
        );
      }
    });
  },

  resetminorpassword: (data) => {
    return new Promise(function (resolve, reject) {
      if (!data.password) {
        reject("Password could not empty!");
      } else {
        //LOWER(c.email) == "'+data.email.toLowerCase()+'" &&
        db.query(
          'FOR c in customers FILTER c.password_reset == "' +
            data.hash +
            '" UPDATE c WITH {password:"' +
            db.hash(data.password) +
            '", password_reset:""} IN customers RETURN NEW',
          (data) => {
            if (data.length > 0) {
              notification.toCustomer("password_changed", data[0]).then(() => {
                resolve(data[0]);
              });
            } else {
              reject(data);
            }
          }
        );
      }
    });
  },

  updateaccount: (data) => {
    return new Promise(function (resolve, reject) {
      let newobj = data.name;
      console.log(newobj);
      //LOWER(c.email) == "'+data.email.toLowerCase()+'" &&
      db.query(
        'FOR c in customers FILTER c._key == "' +
          data.key +
          '" UPDATE c WITH {name:' +
          JSON.stringify(newobj) +
          ', email:"' +
          data.email +
          '", phone:"' +
          data.phone +
          '"} IN customers RETURN NEW',
        (data) => {
          console.log(data);
          if (data.length > 0) {
            resolve(data[0]);
          } else {
            resolve([]);
          }
        }
      );
    });
  },
  getcards: (data) => {
    console.log("aaaa");

    return new Promise(function (resolve, reject) {
      db.query(
        'FOR c in customers FILTER c._key == "' + data.key + '" RETURN c.cards',
        (data) => {
          if (data.length > 0 && data[0] !== null) {
            resolve(data[0]);
          } else {
            resolve([]);
          }
        }
      );
    });
  },

  addcard: (data) => {
    return new Promise(function (resolve, reject) {
      let keyy = data._key;

      let doc = data;
      delete doc._key;
      doc.id = Math.round(+new Date() / 1000);
      doc.default = doc.default == true ? doc.default : false;
      //LOWER(c.email) == "'+data.email.toLowerCase()+'" &&
      console.log(doc, data);
      db.query(
        'FOR c in customers FILTER c._key == "' +
          keyy +
          '" UPDATE c WITH {cards:PUSH(c.cards, ' +
          JSON.stringify(doc) +
          ")} IN customers RETURN NEW",
        (data) => {
          console.log(data);
          if (data.length > 0) {
            resolve(data[0]);
          } else {
            resolve([]);
          }
        }
      );
    });
  },

  deletecard: (data) => {
    return new Promise(function (resolve, reject) {
      console.log(data);

      //LOWER(c.email) == "'+data.email.toLowerCase()+'" &&
      db.query(
        'FOR c in customers FILTER c._key == "' +
          data.key +
          '" UPDATE c WITH {cards:' +
          JSON.stringify(data.cards) +
          "} IN customers RETURN NEW",
        (data) => {
          if (data.length > 0) {
            resolve(data[0]);
          } else {
            resolve([]);
          }
        }
      );
    });
  },
  delete: (data) => {
    console.log(data, "deldataa");

    return new Promise(function (resolve, reject) {
      const query = `FOR a IN banner FILTER a.m_id =='${data.member_id}' UPDATE a WITH  {banner:REMOVE_NTH(a.banner,'${data.key}')} IN banner RETURN NEW`;

      db.query(query, (data) => {
        console.log(data);
        if (data.length > 0) {
          resolve(data[0]);
        } else {
          //console.log(data)
          reject("Not found");
        }
      });
    });
  },
  getaddresses: (data) => {
    console.log("aaaa");

    return new Promise(function (resolve, reject) {
      db.query(
        'FOR c in customers FILTER c._key == "' +
          data.key +
          '" RETURN ( FOR p in c.addresses RETURN p )',
        (data) => {
          if (data.length > 0) {
            console.log(data[0]);
            resolve(data[0]);
          } else {
            resolve([]);
          }
        }
      );
    });
  },
  getDefaultAddress: (data) => {
    console.log("aaaa");

    return new Promise(function (resolve, reject) {
      db.query(
        'FOR c in customers FILTER c._key == "' +
          data.key +
          '" RETURN ( FOR p in c.addresses FILTER p.default==true RETURN p )',
        (data) => {
          if (data.length > 0) {
            console.log(data[0]);
            resolve(data[0]);
          } else {
            resolve([]);
          }
        }
      );
    });
  },
  cancelServiceRequest: async (data) => {
    console.log("aaaa", data);
    const refundObject = {};

    return new Promise(async function (resolve, reject) {
      // update transaction object...
      await db.query(
        `FOR u IN transactions
               FILTER u.transaction_id == ${data.transactionId}
               UPDATE u WITH { status: '${data.status}' } IN transactions return u`,
        (data2) => {
          refundObject.transaction_id = data2[0].transaction_id;
          refundObject.total = data2[0].total;
          refundObject.customer_id = data2[0].customer_id;
          // console.log(refundObject)
          // update appointments object...
          db.query(
            `
               FOR u IN appointments
               FILTER u.order_id == ${data.transactionId}
                 UPDATE u WITH { status: "${data.status}" } IN appointments return u
               `,
            (data3) => {
              refundObject.service_name = data3[0].service_name;
              refundObject.service_id = data3[0].service_id;
              refundObject.staff_id = data3[0].staff_id;
              refundObject.staff_name = data3[0].staff_name;
              refundObject.date = data3[0].date;
              refundObject.end_date = data3[0].end_date;
              refundObject.status = "request_refund";
              // console.log(refundObject)
            }
          );
        }
      );

      //adding entry to refunds...
      //    console.log(refundObject)
      //    await db.query(`insert "${refundObject}" into refunds`,(data)=>{
      //     resolve(data)
      //    })

      resolve([]);
    });
  },

  getallcafeorders: (body) => {
    return new Promise(function (resolve, reject) {
      console.log("body", body);
      let page = body.page ? (body.page - 1) * 10 : 0;
      console.log("page", page);
      db.query(
        `FOR a in transactions FILTER a.cafe==1 LET cust = (FOR c IN customers FILTER c._key == a.customer_id RETURN {name:c.name,email:c.email}) SORT a._created DESC limit ${page},12 RETURN MERGE(a,{customer:cust,transactions:a})`,
        (data) => {
          let q = `FOR a IN transactions
          FILTER a.cafe == 1
          LET cust = (FOR c IN customers FILTER c._key == a.customer_id RETURN {name: c.name, email: c.email})
          COLLECT WITH COUNT INTO length
          RETURN length`;
          db.query(q, (count) => {
            console.log("getallcafeorders", count);
            resolve({ data: data, count: count[0] });
          });
          // console.log("getallcafeorders", data[0]);
        }
      );
    });
  },
  searchCafeOrders: (val) => {
    return new Promise((resolve, reject) => {
      console.log("search call recived ", val);
      let q = `FOR a in transactions LET cust = (FOR c IN customers FILTER c._key == a.customer_id RETURN {name:c.name,email:c.email})  FILTER (a.transaction_id LIKE "%${val.value}%" || a.tableNumber LIKE "%${val.value}%" || cust[0].name LIKE "%${val.value}%" || cust[0].email LIKE "%${val.value}%") AND a.cafe==1 SORT a._created DESC limit 0,12 RETURN MERGE(a,{customer:cust,transactions:a})`;

      db.query(q, (data) => {
        resolve(data);
      });
    });
  },
  getallcafeordersFilter: (data) => {
    var filter = "";
    if (data.status) {
      filter += `&& a.order_status=='${data.status}'`;
    }
    console.log(data);
    return new Promise(function (resolve, reject) {
      db.query(
        `FOR a in transactions FILTER a.cafe==1 ${filter}  LET cust = (FOR c IN customers FILTER c._key == a.customer_id RETURN {name:c.name,email:c.email}) SORT a._created DESC limit 0,12 RETURN MERGE(a,{customer:cust,transactions:a})`,
        (data1) => {
          // console.log('getallcafeorders',data1[0].processingTime)
          resolve(data1);
        }
      );
    });
  },

  getproordershh: (data) => {
    // console.log('aaaa')

    // let query = 'FOR c in transactions FILTER (c.cafe!=1 and c.type!="Appointment booking payment"'

    // if(data.start && data.end){

    //     start_date = moment.utc(data.start,"YYYY-MM-DD").add(1, 'days').set({hours:0,minutes:0,seconds:0}).toISOString()
    //     end_date = moment.utc(data.end,"YYYY-MM-DD").set({hours:0,minutes:0,seconds:0}).toISOString()

    //     query += ' and c._created >= "'+start_date+'" and c._created <= "'+end_date+'" '
    // }

    // if(data.status){
    //     query+= ' and c.order_status=="'+data.status+'"'
    // }

    // query += ')'
    // query += ' FOR cu IN customers FILTER c.customer_id == cu._key SORT c._created DESC limit 15 '

    // query += 'RETURN MERGE(c,{customer:cu,transactions:c})'
    // console.log(query)
    const query1 = `FOR t IN transactions
            FILTER t.cafe != 1 && t.type != "Appointment booking payment" LIMIT 10
            FOR c IN customers
            FILTER t.customer_id == c._key SORT c._created DESC
            RETURN  { customer: c, transaction: t }`;
    const query3 = `FOR c in transactions FILTER c.cafe!=1 and c.type!="Appointment booking payment" LET cust = (FOR cu IN customers FILTER cu._key == c.customer_id RETURN {name:cu.name,email:cu.email}) SORT c._created DESC limit 0,12 RETURN MERGE(c,{customer:cust})`;
    //'FOR c in customers FILTER c._key == "'+data.key+'" RETURN c.orders'
    console.log(query3);
    return new Promise(function (resolve, reject) {
      db.query(query3, (data) => {
        if (data.length > 0) {
          resolve(data);
        } else {
          resolve([]);
        }
      });
    });
  },
  getproorders: (data) => {
    // let query = 'FOR c in transactions FILTER (c.cafe!=1 and c.type!="Appointment booking payment"'

    // if(data.start && data.end){

    //     start_date = moment.utc(data.start,"YYYY-MM-DD").add(1, 'days').set({hours:0,minutes:0,seconds:0}).toISOString()
    //     end_date = moment.utc(data.end,"YYYY-MM-DD").set({hours:0,minutes:0,seconds:0}).toISOString()

    //     query += ' and c._created >= "'+start_date+'" and c._created <= "'+end_date+'" '
    // }

    // if(data.status){
    //     query+= ' and c.order_status=="'+data.status+'"'
    // }

    // query += ')'
    // query += ' FOR cu IN customers FILTER c.customer_id == cu._key SORT c._created DESC limit 15 '

    // query += 'RETURN MERGE(c,{customer:cu,transactions:c})'
    // console.log(query)
    const query1 = `FOR t IN transactions
            FILTER t.cafe != 1 && t.type != "Appointment booking payment" && t.order_status=='${data.status}' LIMIT 10
            FOR c IN customers
            FILTER t.customer_id == c._key SORT c._created DESC
            RETURN  { customer: c, transaction: t }`;
    let filter = "";
    if (data.status) {
      filter = `&& c.order_status=='${data.status}'`;
    }
    const query3 = `FOR c in transactions FILTER c.cafe!=1 and c.type!="Appointment booking payment" ${filter} LET cust = (FOR cu IN customers FILTER cu._key == c.customer_id RETURN {name:cu.name,email:cu.email,phone:cu.phone}) SORT c._created DESC limit 0,12 RETURN MERGE(c,{customer:cust})`;
    //'FOR c in customers FILTER c._key == "'+data.key+'" RETURN c.orders'
    // console.log(query3)
    return new Promise(function (resolve, reject) {
      db.query(query3, (data) => {
        if (data.length > 0) {
          resolve(data);
        } else {
          resolve([]);
        }
      });
    });
  },

  getorders: (data) => {
    let query =
      'FOR c in transactions FILTER (c.customer_id == "' +
      data.key +
      '" and c.cafe!=1 and c.type!="Appointment booking payment" and c.type!="Wallet Payment"';

    if (data.start && data.end) {
      start_date = moment
        .utc(data.start, "YYYY-MM-DD")
        .add(1, "days")
        .set({ hours: 0, minutes: 0, seconds: 0 })
        .toISOString();
      end_date = moment
        .utc(data.end, "YYYY-MM-DD")
        .set({ hours: 0, minutes: 0, seconds: 0 })
        .toISOString();

      query +=
        ' and c._created >= "' +
        start_date +
        '" and c._created <= "' +
        end_date +
        '" ';
    }

    if (data.status) {
      query += ' and c.order_status=="' + data.status + '"';
    }

    query += ")";
    if (data.sort && data.sort.length > 0) {
      const field = data.sort[0] || "_created";
      const sort = data.sort[1] || "DESC";
      if (field == "item_total" || field == "Total") {
        query += ` SORT TO_NUMBER(c.item_total) ${sort.toUpperCase()} `;
      } else if (field == "Transaction ID") {
        query += ` SORT c.transaction_id ${sort.toUpperCase()} `;
      } else if (field == "Order Date") {
        query += ` SORT c._created ${sort.toUpperCase()} `;
      } else if (field == "Invoice") {
        query += ` SORT c._updated ${sort.toUpperCase()} `;
      } else if (field == "Status") {
        query += ` SORT c.order_status ${sort.toUpperCase()} `;
      } else if (field == "Action") {
        query += ` SORT c.status ${sort.toUpperCase()} `;
      } else {
        query += ` SORT c.${field} ${sort.toUpperCase()} `;
      }
    } else {
      query += " SORT c._created DESC ";
    }

    query += "RETURN c";
    // console.log(query)

    //'FOR c in customers FILTER c._key == "'+data.key+'" RETURN c.orders'

    return new Promise(function (resolve, reject) {
      db.query(query, (data) => {
        if (data.length > 0) {
          resolve(data);
        } else {
          resolve([]);
        }
      });
    });
  },

  getcafeorders: (data) => {
    let query =
      'FOR c in transactions FILTER (c.customer_id == "' +
      data.key +
      '" and c.cafe==1 ';

    if (data.start && data.end) {
      start_date = moment
        .utc(data.start, "YYYY-MM-DD")
        .add(1, "days")
        .set({ hours: 0, minutes: 0, seconds: 0 })
        .toISOString();
      end_date = moment
        .utc(data.end, "YYYY-MM-DD")
        .set({ hours: 0, minutes: 0, seconds: 0 })
        .toISOString();

      query +=
        ' and c._created >= "' +
        start_date +
        '" and c._created <= "' +
        end_date +
        '" ';
    }

    if (data.status) {
      query += ' and c.order_status=="' + data.status + '"';
    }

    query += ")";

    if (data.sort && data.sort.length > 0) {
      const field = data.sort[0] || "_created";
      const sort = data.sort[1] || "DESC";
      if (field == "item_total" || field == "Total") {
        query += ` SORT TO_NUMBER(c.item_total) ${sort.toUpperCase()} `;
      } else if (field == "Transaction ID") {
        query += ` SORT c.transaction_id ${sort.toUpperCase()} `;
      } else if (field == "Order Date") {
        query += ` SORT c._created ${sort.toUpperCase()} `;
      } else if (field == "Invoice") {
        query += ` SORT c._updated ${sort.toUpperCase()} `;
      } else if (field == "Status") {
        query += ` SORT c.order_status ${sort.toUpperCase()} `;
      } else if (field == "Action") {
        query += ` SORT c.status ${sort.toUpperCase()} `;
      } else {
        query += ` SORT c.${field} ${sort.toUpperCase()} `;
      }
    } else {
      query += " SORT c._created DESC ";
    }
    query += "RETURN c";

    return new Promise(function (resolve, reject) {
      db.query(query, (data) => {
        if (data.length > 0) {
          resolve(data);
        } else {
          resolve([]);
        }
      });
    });
  },
  getServiceOrders: (data) => {
    // console.log('aaaa')

    // let query = `FOR c in transactions FILTER (c.customer_id == "${data.key}" and c.type=='Appointment booking payment' `
    let query = `FOR c in transactions let app=(for p in appointments Filter p.order_id==c.transaction_id return {"appointment_id":p._key,"appointment_date":p.date,"appointment_end_date":p.end_date,"service_name":p.service_name,"staff_name":p.staff_name,
            "date":DATE_FORMAT(p.date,"%dd-%mm-%yyyy (%hh:%mm)"),"end_date":DATE_FORMAT(p.end_date,"%dd-%mm-%yyyy (%hh:%mm)")}) FILTER (c.customer_id == "${data.key}" and c.type=='Appointment booking payment' `;

    if (data.start && data.end) {
      start_date = moment
        .utc(data.start, "YYYY-MM-DD")
        .add(1, "days")
        .set({ hours: 0, minutes: 0, seconds: 0 })
        .toISOString();
      end_date = moment
        .utc(data.end, "YYYY-MM-DD")
        .set({ hours: 0, minutes: 0, seconds: 0 })
        .toISOString();

      query +=
        ' and c._created >= "' +
        start_date +
        '" and c._created <= "' +
        end_date +
        '" ';
    }

    if (data.status) {
      query += ' and c.order_status=="' + data.status + '"';
    }

    query += ")";
    if (data.sort && data.sort.length > 0) {
      const field = data.sort[0] || "_created";
      const sort = data.sort[1] || "DESC";
      if (field == "item_total" || field == "Total") {
        query += ` SORT TO_NUMBER(c.item_total) ${sort.toUpperCase()} `;
      } else if (field == "Transaction ID") {
        query += ` SORT c.transaction_id ${sort.toUpperCase()} `;
      } else if (field == "Order Date") {
        query += ` SORT c._created ${sort.toUpperCase()} `;
      } else if (field == "Invoice") {
        query += ` SORT c._updated ${sort.toUpperCase()} `;
      } else if (field == "Status") {
        query += ` SORT c.order_status ${sort.toUpperCase()} `;
      } else if (field == "Action") {
        query += ` SORT c.status ${sort.toUpperCase()} `;
      } else {
        query += ` SORT c.${field} ${sort.toUpperCase()} `;
      }
    } else {
      query += " SORT c._created DESC ";
    }

    query += "RETURN {app,c} ";
    console.log("query", query);

    return new Promise(function (resolve, reject) {
      db.query(query, (data) => {
        if (data.length > 0) {
          resolve(data);
        } else {
          resolve([]);
        }
      });
    });
  },

  addaddress: (data) => {
    return new Promise(function (resolve, reject) {
      let keyy = data._key;
      let doc = data;
      delete doc._key;
      doc.id = Math.round(+new Date() / 1000);
      doc.default = doc.default == true ? doc.default : false;
      //LOWER(c.email) == "'+data.email.toLowerCase()+'" &&
      console.log(doc, data);
      db.query(
        'FOR c in customers FILTER c._key == "' +
          keyy +
          '" LIMIT 1 UPDATE c WITH {addresses:PUSH(c.addresses, ' +
          JSON.stringify(doc) +
          ")} IN customers RETURN c.addresses",
        (data) => {
          console.log(data);
          if (data.length > 0) {
            resolve(data[0]);
          } else {
            resolve([]);
          }
        }
      );
    });
  },

  chgminorpassword: (data) => {
    return new Promise(function (resolve, reject) {
      console.log(data);

      if (!data.password) {
        resolve([]);
      } else {
        //LOWER(c.email) == "'+data.email.toLowerCase()+'" &&
        db.query(
          'FOR c in customers FILTER c._key == "' +
            data._key +
            '" and c.password=="' +
            db.hash(data.opassword) +
            '" UPDATE c WITH {password:"' +
            db.hash(data.password) +
            '", password_reset:""} IN customers RETURN NEW',
          (data) => {
            if (data.length > 0) {
              notification.toCustomer("password_changed", data[0]).then(() => {
                resolve(data[0]);
              });
            } else {
              resolve([]);
            }
          }
        );
      }
    });
  },

  deladdress: (data) => {
    return new Promise(function (resolve, reject) {
      console.log(data);
      //LOWER(c.email) == "'+data.email.toLowerCase()+'" &&
      db.query(
        'FOR c in customers FILTER c._key == "' +
          data.key +
          '" UPDATE c WITH {addresses:' +
          JSON.stringify(data.addresses) +
          "} IN customers RETURN c.addresses",
        (data) => {
          if (data.length > 0) {
            resolve(data[0]);
          } else {
            resolve([]);
          }
        }
      );
    });
  },

  nextAppointment: (key) => {
    return new Promise((resolve, reject) => {
      let iso_date = moment().toISOString();

      db.query(
        'FOR a IN appointments FILTER a.customer_id == "' +
          key +
          '" && a.date >= "' +
          iso_date +
          '" && a.status == "confirmed" SORT a.date ASC LIMIT 1 RETURN a',
        (appt_data) => {
          if (appt_data.length > 0) {
            resolve(appt_data[0]);
          } else {
            resolve({});
          }
        }
      );
    });
  },

  incompleteAppointments: () => {
    return new Promise((resolve, reject) => {
      db.query(
        "FOR c IN customers FILTER LENGTH(c.new_appointment) > 0 RETURN c",
        (client_data) => {
          client_data.sort((a, b) => {
            return a._updated.localeCompare(b._updated);
          });
          resolve(client_data);
        }
      );
    });
  },

  newAppointment: (data, req) => {
    return new Promise(async (resolve, reject) => {
      if (
        (!data._key && !req.session) ||
        (!data._key && req.session && !req.session.user) ||
        (!data._key &&
          req.session &&
          req.session.user &&
          !req.session.user._key)
      ) {
        resolve({});
        return;
      }

      let user_key;

      if (data._key) {
        user_key = data._key;
      } else if (req.session && req.session.user && req.session.user._key) {
        user_key = req.session.user._key;
      }

      let user = await collection.document(user_key);

      if (data.complete) {
        if (req.session.client) {
          // temp user logout
          delete req.session.user;
          req.session.destroy();
        }

        user.new_appointment = false;
      } else {
        if (!user.new_appointment) {
          user.new_appointment = [];
        }
        user.new_appointment.push(data);
      }

      await collection.update(user, user);
      resolve({});
    });
  },

  findByKey: async (key) => {
    return new Promise(async function (resolve, reject) {
      await db.query(
        `FOR c in customers
             FILTER c._key == "${key}"
             LET default_address = (
               FOR a in c.addresses
                 FILTER a.default == true
                 LIMIT 1
                 RETURN a
             )
             RETURN {
               "name": c.name, 
               "email": c.email, 
               "phone": c.phone, 
               "default_address": default_address[0] ? default_address[0] : { "default": false }
             }
           `,
        async (data) => {
          if (data.length > 0) {
            resolve(data[0]);
          } else {
            resolve([]);
          }
        }
      );
    });
  },

  email: async (data, req) => {
    return new Promise(async (resolve, reject) => {
      //    await sendMail.sendMail('anupam.dupleit@gmail.com','Order Summary',"<p>Your Order is successfully placed and Will be delivered to<br>Your Order is successfully placed and Will be delivered to</p>","user Registration", "new.ejs")
      resolve({});
    });
  },
  updateWallet: (data) => {
    let query = ``;
    if (data.type === "deduct" || data.type === "DEDUCT") {
      query = `for p in customers filter p._key=='${data._key}'
                update p with {wallet:p.wallet - ${data.amount} } in  customers   
                return {wallet:p.wallet}`;
    } else {
      query = `for p in customers filter p._key=='${data._key}'
                update p with {wallet:p.wallet + ${data.amount} } in customers    
                return {wallet:p.wallet}`;
    }
    return new Promise(function (resolve, reject) {
      console.log(query);
      db.query(query, (data2) => {
        if (data2) {
          resolve(data2[0]);
        }
      });
    });
  },
};

module.exports = customer;
