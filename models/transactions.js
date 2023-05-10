const db = require("../components/arango"),
  memberships = require("../models/memberships"),
  collection = db.db.collection("transactions"),
  asyncLoop = require("async");

var trans_date_check = false;

const transactions = {
  newTransaction: (data, req) => {
    return new Promise(function (resolve, reject) {
      if (data.type == "appointment") {
        db.query(
          'LET appt = DOCUMENT("appointments/' +
            data.key +
            '") FOR s in services FILTER s._key == appt.service_id FOR c in customers FILTER c._key == appt.customer_id RETURN {service:s,appointment:appt,customer:c}',
          (doc) => {
            if (doc.length > 0) {
              let cart_id = data.key;

              if (data.cart_id) {
                cart_id = data.cart_id;
              }

              let new_transaction = {
                id: "cart_" + cart_id,
                items: [],
                total: 0,
                tax: 0,
                sub_total: 0,
                delivery: 0,
                delivery_method: "",
                status: "new",
                method: "",
                customer: {
                  name:
                    doc[0].customer.name.first +
                    " " +
                    doc[0].customer.name.last,
                  avatar: doc[0].customer.avatar,
                },
                customer_id: doc[0].appointment.customer_id,
                appointment_link_id: doc[0].appointment.link_id,
                staff_id: doc[0].appointment.staff_id,
                payment: {},
                _created: moment().toISOString(),
              };

              doc[0].service.type = "service";

              if (doc[0].appointment.link_id) {
                //log('New transaction from '+data.key)

                transactions
                  .getLinkedAppointments(doc[0].appointment.link_id)
                  .then(async (appts) => {
                    // log(appts)
                    asyncLoop.eachSeries(
                      appts,
                      function (item, callback) {
                        transactions
                          .addItem(item, new_transaction)
                          .then((new_cart) => {
                            //log('Added item')
                            new_transaction = new_cart;
                            callback();
                          });
                      },
                      function (err) {
                        //log('Done', err);
                        localStorage
                          .set(new_transaction.id, new_transaction)
                          .then((trans) => {
                            //  log('Saved '+new_transaction.id+' '+trans.id)
                            resolve(trans);
                          })
                          .catch((err) => {
                            reject("Transaction not added");
                          });
                      }
                    );

                    // appts = appts.map(async (item)=>{
                    //     item.appointment_id = item._key
                    //     console.log('adding')
                    //     await transactions.addItem(item, new_transaction).then(async(new_cart)=>{
                    //         console.log('saving')
                    //
                    //     })
                    //     return item
                    // })
                    //
                    // await localStorage.set(new_cart.id, new_cart).then((trans)=>{
                    //     console.log('saved')
                    //     new_transaction = trans
                    // })
                    //console.log(new_transaction)
                  });
              } else {
                doc[0].service.appointment_id = doc[0].appointment._key;

                if (doc[0].appointment.staff_id) {
                  doc[0].service.staff_id = doc[0].appointment.staff_id;
                }

                transactions
                  .addItem(doc[0].service, new_transaction)
                  .then((new_cart) => {
                    localStorage
                      .set(new_cart.id, new_cart)
                      .then((trans) => {
                        resolve(trans);
                      })
                      .catch((err) => {
                        reject("Transaction not added");
                      });
                  });
              }
            }
          }
        );
      } else if (data.type == "customer") {
        db.query('RETURN DOCUMENT("customers/' + data.key + '")', (doc) => {
          if (doc.length > 0) {
            let new_transaction = {
              id: "cart_" + Date.now(),
              items: [],
              total: 0,
              tax: 0,
              sub_total: 0,
              delivery: 0,
              delivery_method: "",
              status: "new",
              method: "",
              customer: {
                name: doc[0].name.first + " " + doc[0].name.last,
                avatar: doc[0].avatar,
              },
              customer_id: doc[0]._key,
              staff_id: "",
              payment: {},
              _created: moment().toISOString(),
            };

            localStorage
              .set(new_transaction.id, new_transaction)
              .then((trans) => {
                resolve(trans);
              });
          }
        });
      } else {
        let new_transaction = {
          id: "cart_" + Date.now(),
          items: [],
          total: "0.00",
          tax: "0.00",
          sub_total: "0.00",
          delivery: 0,
          delivery_method: "",
          status: "new",
          method: "",
          customer_id: "",
          staff_id: "",
          payment: {},
          _created: moment().toISOString(),
        };

        if (req && req.session && req.session.user) {
          new_transaction.staff_id = req.session.user._key;
          new_transaction.staff_name =
            req.session.user.name.first + " " + req.session.user.name.last;
        }

        localStorage.set(new_transaction.id, new_transaction).then((trans) => {
          resolve(trans);
        });
      }
    });
  },

  getLinkedAppointments: (link_id) => {
    return new Promise(function (resolve, reject) {
      db.query(
        'FOR a in appointments FOR s in services FILTER a.link_id == "' +
          link_id +
          '" && a.status != "paid" && a.status != "deleted" && a.service_id == s._key RETURN MERGE(s,a)',
        (appts) => {
          resolve(appts);
        }
      );
    });
  },

  search: (search) => {
    return new Promise(function (resolve, reject) {
      filter =
        't._key == "' +
        search.str +
        '" || LOWER(t.customer.name) =~ "' +
        search.str +
        '"';

      if (search.str.length > 2) {
        db.query(
          "FOR t in transactions FILTER " + filter + " RETURN t",
          (data) => {
            resolve(data);
          }
        );
      } else {
        db.query(
          "FOR t in transactions SORT t._created DESC LIMIT 100 RETURN t",
          (data) => {
            resolve(data);
          }
        );
      }
    });
  },

  searchCarts: (search) => {
    return new Promise(async (resolve, reject) => {
      let carts = await localStorage.list("cart_", true);
      let re = RegExp(search.str, "i");

      carts = carts.filter((cart) => {
        if (
          typeof cart.customer == "object" &&
          typeof cart.customer.name == "string"
        ) {
          return cart.customer.name.match(re);
        }
      });

      resolve(carts);
    });
  },

  getTotal: (key) => {
    // return the total of an appointment and delete the cart

    return new Promise(async (resolve, reject) => {
      let payload = {
        type: "appointment",
        key: key,
      };

      let trans = await transactions.newTransaction(payload);

      localStorage
        .delete(trans.id)
        .then(() => {
          let result = {
            total: trans.total,
            tax: trans.tax,
            sub_total: trans.sub_total,
            items: trans.items,
          };
          resolve(result);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },

  addItem: (data, cart) => {
    return new Promise(async (resolve, reject) => {
      if (typeof data.stock != "undefined" && parseInt(data.stock) <= 0) {
        //    reject('Not in stock') // don't allow negative stock
      }

      if (data.type == "vouchers") {
        if (data.value <= 0) {
          reject("Voucher has no value");
        } else if (data.purchased === true) {
          reject("Voucher has already been purchased");
          // } else if (data.start_date && moment().isBefore(moment(data.start_date))){
          //     reject('Voucher not available until '+moment(data.start_date).format('ddd Do MMMM YYYY'))
          // } else if (data.expiry_date && moment().isAfter(moment(data.expiry_date))){
          //     reject('Voucher expired on'+moment(data.expiry_date).format('ddd Do MMMM YYYY'))
        }
      }

      if (typeof data == "object" && typeof cart == "object") {
        if (data.price || data.price === 0 || data.prices) {
          data.quantity = 1;

          let item = false;

          if (data.service_id) {
            data.type = "services";

            let service = cart.items.filter(
              (item) => item.service_id == data.service_id
            );

            if (
              service.length > 0 &&
              service[0].service_items &&
              service[0].service_items.length > 1
            ) {
              // this service with multiple tasks has already been added

              if (!service[0].linked_items) {
                service[0].linked_items = 1;
              }

              service[0].linked_items++;

              if (
                service[0].linked_items > service[0].service_items.length &&
                service[0].linked_items % service[0].service_items.length === 0
              ) {
                service[0].quantity++;
              }

              transactions.calcPrices(cart).then((new_cart) => {
                resolve(new_cart);
              });
              return false;
            }
          } else {
            item = cart.items.find((item) => item._key == data._key);
          }

          if (item) {
            item.quantity++;
          } else {
            let new_length = cart.items.push(data);
            item = cart.items[new_length - 1];
          }

          if (typeof item == "object" && cart.customer_id) {
            let benefit = await memberships.checkBenefits(
              cart.customer_id,
              item,
              "discount"
            );

            if (benefit.amount) {
              item.adjustment = benefit.amount;
            }
          }

          if (item.promotion) {
            item.adjustment = item.promotion;
          }

          transactions.calcPrices(cart).then((new_cart) => {
            resolve(new_cart);
          });
        } else if (data.type == "vouchers" && data.value > 0) {
          data.quantity = 1;

          let item = cart.items.find((item) => item._key == data._key);

          cart.items.push(data);

          transactions.calcPrices(cart).then((new_cart) => {
            resolve(new_cart);
          });
        } else if (data.length > 0) {
          cart.items = data.filter((item, i) => {
            item.quantity = 1;
            if (i == 0) {
              // the first iteration should include the price, but not any subsequent items
              return item;
            }
          });

          transactions.calcPrices(cart).then((new_cart) => {
            resolve(new_cart);
          });
        } else {
          resolve(cart);
        }
      } else if (typeof cart == "object") {
        resolve(cart);
      } else {
        reject("1 not found");
      }
    });
  },

  calcPrices: async (cart) => {
    return new Promise(async function (resolve, reject) {
      if (typeof cart == "object") {
        cart.sub_total = 0;
        cart.item_total = 0;
        cart.refund_value = 0;
        cart.refund_total = 0;
        cart.tax = 0;
        cart.total = 0;

        cart = await transactions.calcItems(cart);
        cart.item_total = parseFloat(cart.total).toFixed(2);

        cart = await transactions.calcDiscount(cart);
        cart = await transactions.calcTax(cart);

        if (!cart.total) {
          cart.item_total = "0.00";
          cart.sub_total = "0.00";
          cart.tax = "0.00";
          cart.total = "0.00";
        } else if (cart.total && cart.refund_value) {
          cart.refund_total =
            parseFloat(cart.total) - parseFloat(cart.refund_value);
        }

        resolve(cart);
      } else {
        reject("2 not found");
      }
    });
  },

  calcItems: (cart) => {
    return new Promise(async function (resolve, reject) {
      if (typeof cart == "object") {
        cart.sub_total = 0;

        let i = 0;

        if (!cart.items || cart.items.length <= 0) {
          cart.items = [];
          cart.total = 0;
          resolve(cart);
        } else {
          for (item of cart.items) {
            if (item.staff_id && item.prices && item.prices.length > 0) {
              // if there's a service added with a stylist

              await staff
                .find(item.staff_id)
                .then((staff_data) => {
                  if (staff_data.level >= 0) {
                    item.price = item.prices[staff_data.level].value;
                  } else {
                    item.price = item.prices[0].value;
                  }
                })
                .catch(() => {
                  item.price = item.prices[0].value;
                });
            }

            if (!item.price && item.prices && item.prices.length > 0) {
              // service without a stylist
              item.price = item.prices[0].value;
            }

            if (item.type == "vouchers" && item.value) {
              // if a voucher, turn the value negative

              item.price = item.value;
              item.name = "Voucher £" + item.value;
            }

            if (
              item.type == "petty_cash" &&
              cart.payment &&
              cart.payment.petty_cash_out
            ) {
              item.adjustment =
                parseFloat(cart.payment.petty_cash_out) -
                parseFloat(item.price);
              item.adjustment = item.adjustment.toString();
              item.quantity = 1;
              cart.payment.petty_cash_in = Math.abs(
                parseFloat(item.adjustment)
              ).toFixed(2);
            }

            if (item.price) {
              item = await transactions.calcAdjustment(item);
              item = await transactions.calcRefund(item);

              if (item.refund) {
                cart.refund_time = moment().toISOString();
                cart.refund_value =
                  parseFloat(cart.refund_value) + parseFloat(item.refund_value);
              }

              if (item.quantity > 1) {
                cart.total = parseFloat(cart.total) + parseFloat(item.total);
              } else {
                item.quantity = 1;
                cart.total = parseFloat(cart.total) + parseFloat(item.total);
              }

              if (item.type != "vouchers" && item.type != "account") {
                item.sub_total = parseFloat(item.total) / config.tax_amount;
                item.tax = parseFloat(item.total) - parseFloat(item.sub_total);
                item.tax = parseFloat(item.tax).toFixed(2);
                item.sub_total = item.sub_total.toFixed(2);
              }

              item.price = parseFloat(item.price).toFixed(2);
              item.total = parseFloat(item.total).toFixed(2);
            }

            if (i >= cart.items.length - 1) {
              // console.log('done items')
              resolve(cart);
            } else {
              i++;
            }
          }
        }
      } else {
        reject("3 not found");
      }
    });
  },

  calcAdjustment: (item) => {
    return new Promise((resolve, reject) => {
      item.quantity = parseInt(item.quantity);

      if (item.adjustment) {
        if (item.original_price) {
          item.price = item.original_price;
        } else {
          item.original_price = parseFloat(item.price).toFixed(2);
        }

        item.total = parseFloat(item.price) * item.quantity; // use total price of all items for any adjustments

        item.adjustment = item.adjustment.replace(/\$|\£|\#|p/, "");

        if (item.adjustment.match(/%/)) {
          item.adjustment_value = item.adjustment.replace(/%/, "");
          item.adjustment_value = (item.total / 100) * item.adjustment_value;
          item.total =
            parseFloat(item.total) + parseFloat(item.adjustment_value);
        } else {
          item.total = parseFloat(item.total) + parseFloat(item.adjustment);
        }
      } else {
        item.total = parseFloat(item.price) * item.quantity;
      }

      item.total = item.total.toFixed(2);

      resolve(item);
    });
  },

  calcRefund: (item) => {
    return new Promise((resolve, reject) => {
      item.quantity = parseInt(item.quantity);

      if (item.refund) {
        if (typeof item.refund == "string" && item.refund.match(/%/)) {
          item.refund_value = item.refund.replace(/%/, "");
          item.refund_value = (item.total / 100) * item.refund_value;
        } else if (typeof item.refund == "string" && item.refund.match(/£/)) {
          item.refund_value = parseFloat(item.refund.replace(/£/, ""));

          if (item.refund_value > item.total) {
            item.refund = "£" + item.total;
            item.refund_value = item.total;
          }
        } else if (
          typeof item.refund == "string" &&
          item.refund.match(/\-|\d/)
        ) {
          item.refund_value = item.refund.replace(/-/, "");

          if (item.refund_value > item.quantity) {
            item.refund = item.quantity;
            item.refund_value = item.quantity;
          }
          item.refund_value = parseFloat(item.price) * parseFloat(item.refund);
        } else {
          delete item.refund;
          delete item.refund_value;
        }
      } else {
        delete item.refund;
        delete item.refund_value;
      }

      resolve(item);
    });
  },

  calcDiscount: (cart) => {
    return new Promise(async function (resolve, reject) {
      if (typeof cart == "object") {
        cart = await transactions.applyOfferCode(cart);
        cart = await transactions.applyVouchers(cart);
        cart = await transactions.applyAccountBalance(cart);

        resolve(cart);
      } else {
        reject("4 not found");
      }
    });
  },

  calcTax: (cart) => {
    return new Promise(function (resolve, reject) {
      if (typeof cart == "object") {
        for (item of cart.items) {
          if (item.price) {
            //    cart.total += parseFloat(item.price)
          }
          if (item.tax) {
            cart.tax += parseFloat(item.tax);
          }
          if (item.sub_total) {
            cart.sub_total += parseFloat(item.sub_total);
          }
        }

        cart.sub_total = parseFloat(cart.sub_total).toFixed(2);
        cart.tax = parseFloat(cart.tax).toFixed(2);
        cart.total = parseFloat(cart.total).toFixed(2);
        resolve(cart);
      } else {
        reject("5 not found");
      }
    });
  },

  applyOfferCode: (cart) => {
    return new Promise(async (resolve, reject) => {
      if (
        cart.offer_code_data &&
        cart.offer_code_data.method &&
        cart.offer_code_data.value
      ) {
        let item_discount;

        cart.payment.discount = 0;

        for (let item of cart.items) {
          if (!item.original_price) {
            item.original_price = item.price;
          }

          if (cart.offer_code_data.method == "percent_off") {
            item_discount =
              item.original_price *
              (parseFloat(cart.offer_code_data.value) / 100);
          } else if (cart.offer_code_data.method == "fixed_off") {
            item_discount =
              item.original_price - parseFloat(cart.offer_code_data.value);
          }

          cart.payment.discount = cart.payment.discount + item_discount;

          item.price = parseFloat(item.original_price) - item_discount;
          item.price = item.price.toFixed(2);
        }

        resolve(cart);
      } else {
        cart.payment.discount = 0;

        for (let item of cart.items) {
          if (item.original_price) {
            item.price = item.original_price;
          }
          if (item.price) {
            item.price = parseFloat(item.price).toFixed(2);
          }
        }

        resolve(cart);
      }
    });
  },

  applyVouchers: (cart) => {
    return new Promise(function (resolve, reject) {
      if (cart.vouchers && cart.vouchers.length > 0) {
        cart.payment.vouchers = cart.vouchers.reduce((total, a) => {
          return total + parseFloat(a.value);
        }, 0);

        cart.vouchers_total = cart.payment.vouchers;
        cart.total = cart.total - cart.payment.vouchers;

        if (cart.total <= 0) {
          let diff = Math.abs(cart.total) * 1;
          cart.total = 0;
          cart.payment.vouchers = cart.payment.vouchers - diff;
          cart.vouchers_total = cart.payment.vouchers;
        }

        resolve(cart);
      } else {
        cart.payment.vouchers = 0;
        resolve(cart);
      }
    });
  },

  applyAccountBalance: (cart) => {
    return new Promise(function (resolve, reject) {
      if (cart.account_balance) {
        cart.payment.account = parseFloat(cart.account_balance);

        cart.total = cart.total - cart.payment.account;

        if (cart.total <= 0) {
          let diff = Math.abs(cart.total) * 1;
          cart.total = 0;
          cart.payment.account = cart.payment.account - diff;
        }
        cart.account_total = cart.payment.account;
        resolve(cart);
      } else {
        cart.payment.account = 0;
        resolve(cart);
      }
    });
  },

  addToCart: (body, req) => {
    return new Promise(function (resolve, reject) {
      if (body.cart_id && body.type) {
        localStorage.get(body.cart_id).then((cart) => {
          if (body.type == "remove") {
            if (cart.items && cart.items.length > 0) {
              cart.items = cart.items
                .map((item) => {
                  if (item._key == body.key) {
                    item.quantity -= 1;
                  }

                  return item;
                })
                .filter((item) => {
                  return item.quantity > 0;
                });
            }

            transactions.calcPrices(cart).then((cart) => {
              //    console.log(cart)
              localStorage.set(cart.id, cart).then((cart) => {
                resolve(cart);
              });
            });
          } else if (body.type == "update") {
            if (body.data) {
              cart = body.data;
            }

            if (cart.items && cart.items.length > 0) {
              cart.items = cart.items.map((item) => {
                if (item._key == body.key) {
                  item = Object.assign(item, body.data);
                }

                return item;
              });
            }

            transactions.calcPrices(cart).then((cart) => {
              localStorage
                .set(cart.id, cart)
                .then((stored_cart) => {
                  //    console.log(stored_cart)
                  resolve(stored_cart);
                })
                .catch((err) => {
                  console.log("Model transactions: Cart Update: ", err);
                  reject(err);
                });
            });
          } else if (body.type == "offer_code") {
            if (body.key && body.key != "remove") {
              db.query(
                'FOR i in offer_codes FILTER i.code == "' +
                  body.key +
                  '" RETURN i',
                (data) => {
                  if (data.length > 0 && cart) {
                    cart.offer_code_data = data[0];
                    transactions.calcPrices(cart).then((cart) => {
                      localStorage.set(cart.id, cart).then((cart) => {
                        resolve(cart);
                      });
                    });
                  } else {
                    reject("Item not found");
                  }
                }
              );
            } else {
              cart.offer_code = "";
              cart.offer_code_data = {};
              transactions.calcPrices(cart).then((cart) => {
                localStorage.set(cart.id, cart).then((cart) => {
                  resolve(cart);
                });
              });
            }
          } else if (body.type == "add_customer") {
            if (body.key) {
              db.query(
                'LET c = DOCUMENT("customers/' + body.key + '") RETURN c',
                (cust_data) => {
                  if (cust_data[0] && cust_data[0]._key) {
                    cart.customer_id = cust_data[0]._key;
                    cart.customer = {
                      name:
                        cust_data[0].name.first + " " + cust_data[0].name.last,
                      avatar: cust_data[0].avatar,
                    };

                    localStorage.set(cart.id, cart).then((cart) => {
                      resolve(cart);
                    });
                  } else {
                    delete cart.customer;
                    delete cart.customer_id;

                    cart.account_balance = 0;
                    transactions.calcPrices(cart).then((cart) => {
                      localStorage.set(cart.id, cart).then((cart) => {
                        resolve(cart);
                      });
                    });
                  }
                }
              );
            }
          } else if (body.type == "account") {
            let credit_obj = {
              price: 5,
              type: "account",
              name: "Account Credit",
            };

            transactions
              .addItem(credit_obj, cart)
              .then((cart) => {
                localStorage.set(cart.id, cart).then((cart) => {
                  resolve(cart);
                });
              })
              .catch((err) => {
                reject(err);
              });
          } else if (body.type == "account_credit") {
            if (body.key) {
              db.query(
                'LET c = DOCUMENT("customers/' +
                  body.key +
                  '") RETURN c.balance.total',
                (balance) => {
                  if (balance) {
                    cart.account_balance = parseFloat(balance);
                    transactions.calcPrices(cart).then((cart) => {
                      localStorage.set(cart.id, cart).then((cart) => {
                        resolve(cart);
                      });
                    });
                  } else {
                    reject("Insufficient Funds");
                    return false;
                  }
                }
              );
            }
          } else if (body.type == "remove_account_credit") {
            cart.account_balance = 0;
            transactions.calcPrices(cart).then((cart) => {
              localStorage.set(cart.id, cart).then((cart) => {
                resolve(cart);
              });
            });
          } else if (body.type == "petty_cash") {
            if (body.key) {
              let item = {
                name: body.key,
                type: body.type,
                price: 0,
                _key: "petty_cash",
              };

              transactions
                .addItem(item, cart)
                .then((cart_data) => {
                  cart_data.method = "petty_cash";
                  localStorage
                    .set(cart_data.id, cart_data)
                    .then((cart_data) => {
                      resolve(cart_data);
                    });
                })
                .catch((err) => {
                  console.log("Model Transactions | petty_cash:" + err);
                  reject(err);
                });
            }
          } else if (body.type == "voucher") {
            if (body.key && body.key != "remove") {
              db.query(
                'FOR i IN vouchers FILTER i.barcode == "' +
                  body.key +
                  '" RETURN i',
                (data) => {
                  if (data.length > 0 && cart) {
                    if (
                      data[0].start_date &&
                      moment().isBefore(moment(data[0].start_date))
                    ) {
                      reject(
                        "Voucher not available until " +
                          moment(data[0].start_date).format("ddd Do MMMM YYYY")
                      );
                      return false;
                    }

                    if (
                      data[0].expiry_date &&
                      moment().isAfter(moment(data[0].expiry_date))
                    ) {
                      reject(
                        "Voucher expired on " +
                          moment(data[0].expiry_date).format("ddd Do MMMM YYYY")
                      );
                      return false;
                    }

                    if (parseFloat(data[0].value) <= 0) {
                      reject("This voucher has no value");
                      return false;
                    }

                    if (!data[0].purchased) {
                      reject("This voucher has not been purchased");
                      return false;
                    }

                    if (!cart.vouchers) {
                      cart.vouchers = [];
                    }

                    let index = cart.vouchers.findIndex((item) => {
                      return item.barcode == body.key;
                    });

                    if (index === -1) {
                      cart.vouchers.push(data[0]);
                    }

                    transactions.calcPrices(cart).then((cart) => {
                      localStorage.set(cart.id, cart).then((cart) => {
                        resolve(cart);
                      });
                    });
                  } else {
                    reject("Item not found");
                  }
                }
              );
            } else {
              cart.vouchers = [];
              transactions.calcPrices(cart).then((cart) => {
                localStorage.set(cart.id, cart).then((cart) => {
                  resolve(cart);
                });
              });
            }
          } else {
            db.query(
              "FOR i in " +
                body.type +
                ' FILTER i._key == "' +
                body.key +
                '" RETURN i',
              (data) => {
                if (data.length > 0) {
                  data[0].type = body.type;

                  if (body.type == "vouchers" && data[0].expiry_date) {
                    data[0].name =
                      data[0].name +
                      " (Expires: " +
                      moment(data[0].expiry_date).format("Do MMM YY") +
                      ")";
                  }

                  transactions
                    .addItem(data[0], cart)
                    .then((cart) => {
                      localStorage.set(cart.id, cart).then((cart) => {
                        resolve(cart);
                      });
                    })
                    .catch((err) => {
                      reject(err);
                    });
                } else {
                  reject("Item not found");
                }
              }
            );
          }
        });
      } else {
        //    console.log(body)
        reject({
          error: "Missing data: cart_id, item key and item type are required",
        });
      }
    });
  },

  applyoffer_code: (query, req) => {
    return new Promise(function (resolve, reject) {
      if (query.code) {
        db.query(
          'FOR i in offer_codes FILTER i.code == "' + query.code + '" RETURN i',
          (data) => {
            if (data.length > 0) {
              localStorage.get(query.id, cart).then((cart) => {
                cart.offer_code = data;
                localStorage.set(cart.id, cart).then((cart) => {
                  resolve(cart);
                });
              });
            } else {
              reject("Item not found");
            }
          }
        );
      } else {
        reject("No code supplied");
      }
    });
  },

  cart: (query, req) => {
    return new Promise(function (resolve, reject) {
      localStorage.get(query.id).then((cart) => {
        resolve(cart);
      });
    });
  },

  deleteCart: (query, req) => {
    // log('Deleting cart '+query)
    return new Promise(function (resolve, reject) {
      if (typeof query == "object") {
        query = query.id;
      }

      localStorage.get(query).then((cart) => {
        if (cart && cart._key) {
          cart.status = "deleted";
          transactions.save(cart, req);

          localStorage.delete(query).then(() => {
            resolve([]);
          });
        } else {
          localStorage.delete(query).then(() => {
            resolve([]);
          });
        }
      });
    });
  },

  removeCart: (query, req) => {
    // log('removeing cart '+query)
    return new Promise(function (resolve, reject) {
      localStorage.delete(query.id).then(() => {
        resolve([]);
      });
    });
  },

  find: (key, user) => {
    let query;

    if (user == true) {
      query =
        'FOR t in transactions FILTER t.customer_id == "' + key + '" RETURN t';
    } else {
      query = 'FOR t in transactions FILTER t._key == "' + key + '" RETURN t';
    }

    return new Promise(function (resolve, reject) {
      db.query(query, (data) => {
        if (data.length > 0) {
          resolve(data);
        } else {
          reject("Not found");
        }
      });
    });
  },
  findByTransaction: async (key) => {
    let query;

    query =
      "FOR t in transactions FILTER t.transaction_id == " + key + " RETURN t";
    console.log(query);
    return new Promise(async function (resolve, reject) {
      await db.query(query, (data) => {
        if (data.length > 0) {
          resolve(data);
        } else {
          reject("Not found");
        }
      });
    });
  },

  findGrouped: (keys) => {
    return new Promise(function (resolve, reject) {
      keys = keys.split("|");

      localStorage
        .list("cart_", true)
        .then((carts) => {
          carts = carts.filter((item) => {
            item.id_chk = item.id.replace(/cart\_/, "");
            return keys.indexOf(item.id_chk) >= 0;
          });

          resolve(carts);
        })
        .catch(() => {
          resolve([]);
        });
    });
  },

  findGroupTotals: (keys) => {
    return new Promise(function (resolve, reject) {
      keys = keys.split("|");

      localStorage
        .list("cart_", true)
        .then((carts) => {
          let totals = {
            total: 0,
            sub_total: 0,
            tax: 0,
          };

          for (var i in carts) {
            if (carts[i].total) {
              totals.total += parseFloat(carts[i].total);
              totals.sub_total += parseFloat(carts[i].sub_total);
              totals.tax += parseFloat(carts[i].tax);
            }
          }

          resolve(totals);
        })
        .catch(() => {
          resolve([]);
        });
    });
  },

  saveGrouped: (keys, req) => {
    return new Promise(function (resolve, reject) {
      keys = keys.split("|");

      localStorage
        .list("cart_", true)
        .then((carts) => {
          let i = 0;

          function processCart(carts, i) {
            carts[i].id_chk = carts[i].id.replace(/cart\_/, "");

            if (keys.indexOf(carts[i].id_chk) >= 0) {
              transactions.save(carts[i], req).then(() => {
                let ii = i + 1;
                if (ii < carts.length) {
                  processCart(carts, ii);
                } else {
                  resolve("done");
                }
              });
            } else {
              let ii = i + 1;
              if (ii < carts.length) {
                processCart(carts, ii);
              } else {
                resolve("done");
              }
            }
          }

          processCart(carts, 0);
        })
        .catch(() => {
          resolve([]);
        });
    });
  },

  sendReceipt: (key) => {
    return new Promise(function (resolve, reject) {
      db.query(
        'LET t = DOCUMENT("transactions/' + key + '") RETURN t',
        (data) => {
          if (data.length > 0) {
            delete data[0].method;
            notification
              .toCustomer("send_receipt", data[0])
              .then((email_data) => {
                if (email_data) {
                  email_data = JSON.parse(email_data);
                  resolve(
                    "Receipt sent to " +
                      email_data.personalizations[0].to[0].email
                  );
                } else {
                  resolve("Complete");
                }
              })
              .catch((err) => {
                resolve("Unable to send reciept: " + err);
              });
          } else {
            resolve("Unable to send reciept, client not found");
          }
        }
      );
    });
  },

  all: (req) => {
    let filter = "";

    if (req.query) {
      filter = "FILTER ";
      for (var i in req.query) {
        filter = filter + " t." + i + ' == "' + req.query[i] + '" &&';
      }
    }

    filter == filter.replace(/\s\&\&$/, "");

    return new Promise(function (resolve, reject) {
      db.query(
        'FOR t in transactions FILTER t.status != "deleted" SORT t._updated DESC LIMIT 100 RETURN t',
        (data) => {
          //    db.query('FOR t in transactions FILTER t.status != "deleted" RETURN t', (data)=>{

          if (data.length > 0) {
            resolve(data);
          } else {
            reject("Not found");
          }
        }
      );
    });
  },

  markAsProcessed: (data, date) => {
    return new Promise(function (resolve, reject) {
      if (data && data.length) {
        data.map((key, i) => {
          db.query(
            'LET t = DOCUMENT("transactions/' +
              key +
              '") UPDATE t WITH {processed:"' +
              date +
              '"} IN transactions'
          );
        });
        resolve();
      }
    });
  },

  processRefund: (transaction) => {
    return new Promise(async (resolve, reject) => {
      if (
        typeof transaction.refund_total != "undefined" &&
        parseFloat(transaction.refund_total) >= 0 &&
        transaction.refund_method
      ) {
        let date = moment().toISOString();
        let refund_transaction = {
          items: [
            {
              name:
                "Refund for transaction " +
                transaction._key +
                " of £" +
                transaction.refund_value,
              price: Math.abs(transaction.refund_value) * -1,
              type: "refund",
              quantity: "1",
              sub_total: 0,
              tax: 0,
            },
          ],
          total: Math.abs(transaction.refund_value) * -1,
          sub_total: 0,
          tax: 0,
          delivery: 0,
          delivery_method: "",
          status: "complete",
          method: transaction.refund_method,
          customer_id: transaction.customer_id,
          payment: {
            vouchers: 0,
            account: 0,
            card: 0,
            bacs: 0,
            cash: 0,
            change: 0,
            payment_link: 0,
            refund: 0,
          },
          note:
            "Refund for transaction " +
            transaction._key +
            " of £" +
            transaction.refund_value +
            " - " +
            transaction.customer.name,
          item_total: Math.abs(transaction.refund_value) * -1,
          customer: {
            name: transaction.customer.name,
          },
          temp: "true",
          _created: date,
          _updated: date,
        };

        delete transaction.refund_total;
        delete transaction.refund_method;
        delete transaction.refund_value;

        for (let item of transaction.items) {
          if (item.refund) {
            item.refund_date = moment().toISOString();
          }
          delete item.refund;
        }

        let refund_data = await collection.save(refund_transaction); // db.query('INSERT '+JSON.stringify(refund_transaction)+' INTO transactions')

        if (!transaction.refunds) {
          transaction.refunds = [];
        }

        transaction.refunds.push(refund_data._key);

        resolve(transaction);
      } else {
        reject("Please specify refund amount and method");
      }
    });
  },

  save: (data, req) => {
    if (data._key) {
      return new Promise(async (resolve, reject) => {
        transactions.calcPrices(data).then(async (new_data) => {
          if (
            typeof new_data.refund_total != "undefined" &&
            parseFloat(new_data.refund_total) > 0
          ) {
            try {
              new_data = await transactions.processRefund(data);
            } catch (error) {
              reject("refund error: " + error);
              return;
            }
          }

          db.query(
            "UPDATE " +
              JSON.stringify(new_data) +
              " IN transactions RETURN NEW",
            (transaction_data) => {
              if (transaction_data.length > 0) {
                localStorage.delete(data.id).then(() => {
                  resolve(transaction_data[0]);
                });
              } else {
                reject("Not saved");
              }
            }
          );
        });
      });
    } else {
      if (!data._created && data.status != "deleted") {
        // new transaction

        data._created = new Date().toISOString();

        // let i = 0
        //
        // while (data.items[i]){
        //     if (data.items[i].type == 'products'){
        //         let prod_data = {
        //             customer_id: data.customer_id,
        //             cart_id: data.id
        //         }
        //         product.removeStock(data.items[i]._key, prod_data, data.items[i].quantity)
        //     }
        //     if (data.items[i].type == 'vouchers' && data.customer_id && data.method != 'payment_link'){
        //         voucher.send(data.items[i]._key, data.customer_id)
        //     }
        //     i++
        // }
      }

      data.staff_id = req.session.user._key;
      data.staff_name = req.session.user.name;
      data._updated = new Date().toISOString();

      if (!data.method.match(/split|cash/)) {
        //    data.payment[data.method] = data.total
      }

      return new Promise(function (resolve, reject) {
        if (data.method == "payment_link" && !data.status.match(/complete/)) {
          let payment_data = {
            key: data.customer_id,
            cart: data,
          };

          customer
            .sendPaymentLink(payment_data)
            .then((payment_result) => {
              localStorage.get(data.id).then((cart) => {
                cart.status = "pending";
                cart.link_sent = new Date().toISOString();

                localStorage.set(cart.id, cart).then((new_cart) => {
                  resolve(payment_result);
                });
              });
            })
            .catch((err) => {
              reject(err);
            });
        } else if (data.payment.account > 0) {
          customer
            .checkBalance(data.customer_id, data.payment.account)
            .then((balance) => {
              transactions
                .insertTransaction(data)
                .then((trans_data) => {
                  if (data.status != "deleted") {
                    //    appointment.paid(data.items)
                  }
                  resolve(trans_data);
                })
                .catch((err) => {
                  reject(err);
                });
            })
            .catch((err) => {
              reject(err);
            });
        } else {
          transactions
            .insertTransaction(data)
            .then((trans_data) => {
              if (data.status != "deleted") {
                //    appointment.paid(data.items)
              }
              resolve(trans_data);
            })
            .catch((err) => {
              reject(err);
            });
        }
      });
    }
  },

  insertTransaction: async (data) => {
    var total = 0,
      transaction_date = new Date().toISOString();

    for (let method of Object.keys(data.payment)) {
      if (method.match(/change/)) {
        total -= parseFloat(data.payment[method]);
      } else if (method.match(/petty_cash_in/)) {
      } else {
        total += parseFloat(data.payment[method]);
      }
      //    console.log(method, data.payment[method])
    }

    if (!data._created) {
      data._created = transaction_date;
    }

    data._updated = transaction_date;

    if (trans_date_check && trans_date_check == data._created) {
      console.err("duplicate transaction blocked", data._created);
      return false;
    } else {
      trans_date_check = data._created;
    }

    return new Promise(async (resolve, reject) => {
      if (total != parseFloat(data.item_total)) {
        // console.log(data.payment)
        // console.log(total, data.item_total)
        reject("Incorrect amounts specified");
      } else {
        if (Number.isInteger(data.total)) {
          data.total = data.total.toFixed(2);
        }

        if (data.status != "deleted") {
          data.status = "complete";
        }

        collection.save(data).then(
          async (trans_data) => {
            if (data.status != "deleted" && customer && data.customer_id) {
              await customer.lastTransaction(data.customer_id, trans_data._key);
              await customer.resetClickCollect(data.customer_id);

              // customer.recommendedProducts(data.customer_id).then((rp_data)=>{
              // })

              await transactions.sendReceipt(trans_data._key);

              if (data.appointment_link_id) {
                await appointment.markLinkedAsPaid(data.appointment_link_id);
              }

              if (data.payment.account > 0) {
                await customer.useBalance(
                  data.customer_id,
                  data.payment.account
                );
              }

              let i = 0;

              for (let item of data.items) {
                if (item.type == "account" && item.price) {
                  let account_credit = {
                    customer_id: data.customer_id,
                    amount: item.price,
                    _id: trans_data._id,
                  };
                  await customer.updateBalance(account_credit);
                }

                if (item.type == "products") {
                  let prod_data = {
                    customer_id: data.customer_id,
                    cart_id: data.id,
                  };
                  await product.removeStock(
                    item._key,
                    prod_data,
                    item.quantity
                  );
                }

                if (data.method != "payment_link") {
                  if (item.type == "vouchers" && data.customer_id) {
                    await voucher.send(item._key, data.customer_id);
                  }

                  if (item.link_id) {
                    await appointment.markLinkedAsPaid(item.link_id);
                  } else if (item.appointment_id) {
                    await appointment.paid(item.appointment_id);
                  } else if (item._id && item._id.match(/appointments/)) {
                    await appointment.paid(item._key);
                  }
                }
                i++;
              }

              if (data.vouchers && data.payment.vouchers) {
                var voucher_total = parseFloat(data.payment.vouchers);

                for (let item of data.vouchers) {
                  let voucher_diff = item.value - voucher_total,
                    voucher_off = item.value;

                  if (voucher_diff > 0) {
                    voucher_off = voucher_total;
                  }

                  await voucher.updateValue(item._key, voucher_off);

                  voucher_total = voucher_total - voucher_off;
                }
              }
            } else if (data.status != "deleted") {
              let i = 0;

              for (let item of data.items) {
                if (item.type == "products") {
                  let prod_data = {
                    customer_id: "n/a",
                    cart_id: data.id,
                  };
                  await product.removeStock(
                    item._key,
                    prod_data,
                    item.quantity
                  );
                }
                i++;
              }

              if (data.vouchers && data.payment.vouchers) {
                var voucher_total = parseFloat(data.payment.vouchers);

                for (let item of data.vouchers) {
                  let voucher_diff = item.value - voucher_total,
                    voucher_off = item.value;

                  if (voucher_diff > 0) {
                    voucher_off = voucher_total;
                  }

                  await voucher.updateValue(item._key, voucher_off);

                  voucher_total = voucher_total - voucher_off;
                }
              }
            }

            localStorage.delete(data.id).then(() => {
              resolve(trans_data);
            });
          },

          (err) => {
            reject("Not saved: " + err);
          }
        );
      }
    });
  },
  newCafeTransaction: (body, req) => {
    return new Promise((resolve, reject) => {
      console.log(body);
     if(!body){
        let new_transaction = {
            id: "cafe_cart_" + Date.now(),
            items: [],
            total: "0.00",
            tax: "0.00",
            sub_total: "0.00",
            delivery: 0,
            delivery_method: "",
            status: "new",
            method: "",
            customer_id: "",
            staff_id: "",
            payment: {},
            _created: moment().toISOString(),
          };
  
          if (req && req.session && req.session.user) {
            new_transaction.staff_id = req.session.user._key;
            new_transaction.staff_name =
              req.session.user.name.first + " " + req.session.user.name.last;
          }
  
          localStorage.set(new_transaction.id, new_transaction).then((trans) => {
            resolve(trans);
          });
     }
    });
  },
};

module.exports = transactions;
