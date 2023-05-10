const db = require("../components/arango"),
  salon_data = require("../models/salon"),
  collection = db.db.collection("cafeproducts"),
  config = require("../modules/config"),
  qrcode = require("qrcode"),
  sendMail = require("../modules/sendMail");
user_notifications = require("../models/user_notifications");

const product = {
  find: (key) => {
    console.log(key);

    return new Promise(function (resolve, reject) {
      db.query(
        'FOR p in cafeproducts FILTER p._key == "' + key["id"] + '" RETURN p',
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

  all: () => {
    console.log("aaaa");

    return new Promise(function (resolve, reject) {
      db.query(
        "FOR p in cafeproducts FILTER !p._deleted SORT p._created DESC LIMIT 60 RETURN p",
        (data) => {
          if (data.length > 0) {
            resolve(data);
          } else {
            reject("cafeproducts Not found");
          }
        }
      );
    });
  },
  getAllProductWithPage: (filter) => {
    let filter_str = "";
    let page = filter.page || 0;
    let limit = filter.limit || 10;

    if (!filter.sortby) {
      filter_str += " SORT p._created DESC";
    } else {
      var myarr = filter.sortby.split("-");
      console.log(myarr);
      if (myarr[0] == "name") {
        filter_str += " SORT p.name " + myarr[1];
      } else if (myarr[0] == "price") {
        filter_str += " SORT ABS(p.price) " + myarr[1];
      } else filter_str += " SORT p.name " + myarr[1];
    }

    return new Promise(function (resolve, reject) {
      db.query(
        `FOR p in cafeproducts 
                filter p.name and p.cat and p.price and !p._deleted ${filter_str} LIMIT ${page},${limit}
                return p`,
        (data) => {
          let countQuery = `FOR p in cafeproducts 
                    
                    filter p.name and p.cat and p.price and !p._deleted COLLECT WITH COUNT INTO length RETURN length`;

          db.query(countQuery, (dat) => {
            if (data) {
              resolve({ data: data, count: dat[0] });
            } else {
              reject("cafeproducts Not found");
            }
          });
        }
      );
    });
  },
  getAll: () => {
    return new Promise((resolve, reject) => {
      let q = `FOR p in cafeproducts 
                for c in caffeCategories
                for cc in c.sub_categories
                filter p.category==cc._key and !p._deleted SORT p.name
                return merge(p,{"cat":c.name,"sub":cc.name})`;
      db.query(q, (data) => {
        resolve(data);
      });
    });
  },
  updateCharge: (data) => {
    console.log(data);
    return new Promise((resolve, reject) => {
      let query1 = `FOR p in charges FILTER p.type=="cafe"  UPDATE p WITH ${JSON.stringify(
        data
      )} IN charges RETURN NEW`;
      // let query = `FOR p in cafeproducts FILTER !p.deleted  UPDATE p WITH `;
      // if (data.vat && data.delivery) {
      //   query += `{ VAT: ${data.vat},delivery_charge:${data.delivery} } IN cafeproducts RETURN NEW`;
      // } else if (data.vat && !data.delivery) {
      //   query += `{ VAT: ${data.vat}} IN cafeproducts RETURN NEW`;
      // } else if (!data.vat && data.delivery) {
      //   query += `{ delivery_charge:${data.delivery} } IN cafeproducts RETURN NEW`;
      // } else {
      //   resolve("please Enter Updated Value");
      // }

      // console.log(query);
      db.query(query1, (data) => {
        resolve("success");
      });
    });
  },
  getCafeCharges: () => {
    return new Promise((resolve, reject) => {
      let q = `FOR p in charges FILTER p.type=="cafe" RETURN {vat:p.vat,delivery:p.delivery,status:p.status}`;
      db.query(q, (data) => {
        resolve(data);
      });
    });
  },
  getCurrentCafeCharge: () => {
    return new Promise((resolve, reject) => {
      // let query = `FOR p in cafeproducts FILTER !p.deleted RETURN {vat:p.VAT,delivery:p.delivery_charge}`;
      let query1 = `FOR p in charges FILTER p.type=="cafe" RETURN p`;
      db.query(query1, (data) => {
        console.log(data);
        resolve(data[0]);
      });
    });
  },
  getCafeTime: (id) => {
    return new Promise((resolve, reject) => {
      let q = `FOR p in cafe_time FILTER p._key=="${id.id}" RETURN p`;
      db.query(q, (data) => {
        resolve(data);
      });
    });
  },
  saveCafeTime: (data) => {
    return new Promise((resolve, reject) => {
      // console.log("jhdgjsgdjsgahags",data._key);
      // let q1=`FOR p in cafe_time FILTER p._key=="17480732" UPDATE p WITH  ${JSON.stringify(data)} IN cafe_time RETURN NEW `
      let q1 = `FOR p in cafe_time FILTER p._key=="17480732" RETURN NEW `;
      let q =
        'UPSERT {_key:"' +
        data._key +
        '"} INSERT ' +
        JSON.stringify(data) +
        " UPDATE " +
        JSON.stringify(data) +
        " IN cafe_time RETURN NEW";
      db.query(q, (data) => {
        resolve(data[0]);
      });
    });
  },
  cafeStatus: () => {
    return new Promise((resolve, reject) => {
      let q1 = `FOR p in cafe_time RETURN {time:p.opening_times}`;
      db.query(q1, (data) => {
        console.log("daaaaata", data);
        data = data[0].time;
        let date = new Date();
        let time24hr = date.toLocaleTimeString("en-US", { hour12: false });
        time24hr = time24hr.split(":").slice(0, -1);
        let week = date.getDay();

        let today = data.filter((d, index) => {
          if (index == week) {
            return d;
          }
        });
        let open = parseInt(today[0].open.split(":").join(""));
        let close = parseInt(today[0].close.split(":").join(""));
        let cTime = parseInt(time24hr.join(""));

        if (isNaN(open) && isNaN(close)) {
          resolve("closed");
        } else {
          if (open <= cTime && close >= cTime) {
            resolve("open");
          } else {
            resolve("closed");
          }
        }
      });
    });
  },
  getAllProduct: (filter) => {
    console.log("aaaa", filter);

    let filter_str = "";

    if (!filter.sortby) {
      filter_str += " SORT p._created DESC";
    } else {
      var myarr = filter.sortby.split("-");
      console.log(myarr);
      if (myarr[0] == "name") {
        filter_str += " SORT p.name " + myarr[1];
      } else if (myarr[0] == "price") {
        filter_str += " SORT ABS(p.price) " + myarr[1];
      } else filter_str += " SORT p.name " + myarr[1];
    }

    return new Promise(function (resolve, reject) {
      db.query(
        `FOR p in cafeproducts 
                for c in caffeCategories
                for cc in c.sub_categories
                filter p.category==cc._key and !p._deleted ${filter_str} LIMIT 60
                return merge(p,{"cat":c.name,"sub":cc.name})`,
        (data) => {
          console.log(`FOR p in cafeproducts 
                    for c in caffeCategories
                    for cc in c.sub_categories
                    filter p.category==cc._key and !p._deleted ${filter_str} LIMIT 60
                    return merge(p,{"cat":c.name,"sub":cc.name})`);

          if (data) {
            resolve(data);
          } else {
            reject("cafeproducts Not found");
          }
        }
      );
    });
  },
  getProductWithCat: async (data) => {
    const start = parseInt(data.start) || 0;
    const limit = parseInt(data.limit) || 10;
    var filter = "";
    if (data.category) {
      filter = `p.type=="${data.category}"`;
    } else if (data.subCategory) {
      filter = `p.category=="${data.subCategory}"`;
    }
    var query = "";
    if (filter === "") {
      query = `FOR p in cafeproducts 
               
                  FILTER p.cat and  !p._deleted && p.sell_online SORT p._created DESC LIMIT ${start},${limit}
                 return p`;
    } else {
      query = `FOR p in cafeproducts 
               
                  FILTER   ${filter} && p.cat&&p.name&&p.price &&p.sell_online&& !p._deleted SORT p._created DESC LIMIT ${start},${limit}
                 return p`;
    }

    return new Promise(async function (resolve, reject) {
      await db.query(query, (data) => {
        if (data) {
          resolve(data);
        } else {
          reject("cafeproducts Not found");
        }
      });
    });
  },

  chgstatus: (data) => {
    return new Promise(function (resolve, reject) {
      let processing = "";
      if (data.processingTime) {
        processing += `,processingTime:"${data.processingTime}"`;
      }
      if (data.reason) {
        processing += `,reason:"${data.reason}"`;
      }
      console.log(
        `for c in transactions filter c._key=="${data._key}" UPDATE c WITH {order_status: "${data.order_status}"${processing}} IN transactions RETURN NEW`
      );
      db.query(
        `for c in transactions filter c._key=="${data._key}" UPDATE c WITH {order_status: "${data.order_status}"${processing} }IN transactions RETURN NEW`,
        (data2) => {
          // console.log(data2)
          if (data2 && data2.length > 0) {
            db.query(
              'FOR p in customers FILTER p._key == "' +
                data2[0].customer_id +
                '" || p._key == ' +
                data2[0].customer_id +
                " RETURN p",
              (cust) => {
                // send mail for status update to customer..

                let msg = {
                  to: cust[0].email,
                  subject: "Order Status Update",
                  text: `Your Order ${data2[0].transaction_id} status is Changed to ${data2[0].order_status}`,
                };
                //notifytocustomerWeb
                let notiData = {
                  msg: `Your Order ${data2[0].transaction_id} status is Changed to ${data2[0].order_status}`,
                  type: "Order Status Update",
                  data: {
                    customer_id: data.customer_id,
                  },
                  status: data.order_status,
                };
                user_notifications.save(notiData);
                // notification.email(msg)
                sendMail.sendMail(
                  msg.to,
                  msg.subject,
                  msg.text,
                  msg.subject,
                  "new.ejs"
                );
                // send notification to admin..
                let msg2 = {
                  to: config.email.admin_to,
                  subject: "Order Status Update",
                  text: `Order ${data2[0].transaction_id} status is Changed to ${data2[0].order_status}`,
                };
                notification.email(msg2);
                sendMail.sendMail(
                  msg2.to,
                  msg.subject,
                  msg.text,
                  msg.subject,
                  "new.ejs"
                );
                resolve(data2);
              }
            );
          } else {
            resolve([]);
          }

          /*console.log(data2)
                    if (data2){
                        resolve(data2)
                    } else {
                        reject([])
                    }*/
        }
      );
    });
  },

  bytype: (key, data) => {
    //console.log('bytype',key,data.params.function)

    return new Promise(function (resolve, reject) {
      db.query(
        'FOR p in cafeproducts FILTER p.type=="' +
          data.params.function +
          '" AND !p._deleted SORT p._updated DESC LIMIT 60 RETURN p',
        (data) => {
          //console.log(data)
          if (data.length > 0) {
            resolve(data);
          } else {
            reject("cafeproducts Not found");
          }
        }
      );
    });
  },

  topten: () => {
    console.log("aaaa");

    return new Promise(function (resolve, reject) {
      db.query(
        "FOR p in cafeproducts FILTER !p._deleted SORT p._created DESC LIMIT 10 RETURN p",
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

  allPublic: (query) => {
    return new Promise(function (resolve, reject) {
      let filter = "",
        limit = 30;

      if (query) {
        if (query.category) {
          filter +=
            '&& LOWER(p.category) == "' + query.category.toLowerCase() + '" ';
        }

        if (query.brand) {
          filter += '&& LOWER(p.brand) == "' + query.brand.toLowerCase() + '" ';
        }

        if (query.search) {
          filter +=
            '&& LOWER(p.keywords) =~ "' + query.search.toLowerCase() + '" ';
        }

        if (query.limit) {
          limit = parseInt(query.limit);
        }
      }

      db.query(
        "FOR p in cafeproducts FILTER p.stock > 0 && !p.private && !p._deleted " +
          filter +
          "SORT p._updated DESC LIMIT " +
          limit +
          " RETURN p",
        (data) => {
          resolve(data);
        }
      );
    });
  },

  save: (data) => {
    if (!data._key) {
      data._created = new Date().toISOString();
      data._updated = new Date().toISOString();
    } else {
      data._updated = new Date().toISOString();
    }

    return new Promise(function async(resolve, reject) {
      console.log(data);
      if (data.type) {
        let query = `FOR c IN caffeCategories FILTER c._key=="${data.type}" RETURN {name:c.name,subCat:c.sub_categories}`;
        db.query(query, (dat) => {
          data.cat = dat[0].name;
          if (data.category) {
            let subCat = dat[0].subCat?.find(
              (obj) => obj._key == data.category
            );
            if (typeof subCat === "object") {
              if (Object.keys(subCat).length === 0) {
                data.sub = "";
              } else {
                data.sub = subCat?.name;
              }
            } else {
              data.sub = "";
            }
          } else {
            data.sub = "";
          }
          console.log(data);

          if (data.image && data.image.match(/^data:image\//) && data.name) {
            if (!data.brand) {
              data.brand = "";
            }

            image
              .save(data.image, data.name + "-" + data.brand, "cafeproducts")
              .then((filename) => {
                data.image = filename;

                db.query(
                  'UPSERT {_key:"' +
                    data._key +
                    '"} INSERT ' +
                    JSON.stringify(data) +
                    " UPDATE " +
                    JSON.stringify(data) +
                    " IN cafeproducts RETURN NEW",
                  (data) => {
                    if (data.length > 0) {
                      resolve(data[0]);
                    } else {
                      reject(data);
                    }
                  }
                );
              });
          } else {
            db.query(
              'UPSERT {_key:"' +
                data._key +
                '"} INSERT ' +
                JSON.stringify(data) +
                " UPDATE " +
                JSON.stringify(data) +
                " IN cafeproducts RETURN NEW",
              (data) => {
                if (data.length > 0) {
                  resolve(data[0]);
                } else {
                  reject(data);
                }
              }
            );
          }
        });
      } else {
        if (data.image && data.image.match(/^data:image\//) && data.name) {
          if (!data.brand) {
            data.brand = "";
          }

          image
            .save(data.image, data.name + "-" + data.brand, "cafeproducts")
            .then((filename) => {
              data.image = filename;

              db.query(
                'UPSERT {_key:"' +
                  data._key +
                  '"} INSERT ' +
                  JSON.stringify(data) +
                  " UPDATE " +
                  JSON.stringify(data) +
                  " IN cafeproducts RETURN NEW",
                (data) => {
                  if (data.length > 0) {
                    resolve(data[0]);
                  } else {
                    reject(data);
                  }
                }
              );
            });
        } else {
          db.query(
            'UPSERT {_key:"' +
              data._key +
              '"} INSERT ' +
              JSON.stringify(data) +
              " UPDATE " +
              JSON.stringify(data) +
              " IN cafeproducts RETURN NEW",
            (data) => {
              if (data.length > 0) {
                resolve(data[0]);
              } else {
                reject(data);
              }
            }
          );
        }
      }
    });
  },

  search: (search) => {
    let filter = "";
    let type = "false";

    type = search.str.split("-*-")[1];
    search.str = search.str.split("-*-")[0];

    console.log(type, search.str);

    return new Promise(function (resolve, reject) {
      db.query(
        `FOR p in cafeproducts 
                for c in caffeCategories
                for cc in c.sub_categories
                filter p.category==cc._key FILTER !p._deleted and LOWER(p.name) LIKE LOWER("%${search.str}%") SORT p._created DESC 
                return merge(p,{"cat":c.name,"sub":cc.name})`,
        (data) => {
          if (data) {
            resolve(data);
          } else {
            resolve([]);
          }
        }
      );
    });
  },
  search2: (search) => {
    let filter = "";

    search.str = search.str.split("-*-")[0];

    console.log(type, search.str);

    return new Promise(function (resolve, reject) {
      filter =
        'p._key == "' +
        search.str +
        '" && !p._deleted || p.barcode == "' +
        search.str +
        '" && !p._deleted || LOWER(p.brand) =~ "' +
        search.str +
        '" && !p._deleted || LOWER(p.name) =~ "' +
        search.str +
        '" && !p._deleted || LOWER(p.description) =~ "' +
        search.str +
        '" && !p._deleted || LOWER(p.category) =~ "' +
        search.str +
        '" && !p._deleted ';

      if (search.str.length > 0) {
        db.query(
          "FOR p in cafeproducts FILTER  (" + filter + ") RETURN p",
          (data) => {
            //console.log(data)
            resolve(data);
          }
        );
      } else {
        db.query(
          `FOR p in cafeproducts 
                   for c in caffeCategories
                   for cc in c.sub_categories
                   filter p.category==cc._key FILTER !p._deleted SORT p._created DESC LIMIT 60
                   return merge(p,{"cat":c.name,"sub":cc.name})`,
          (data) => {
            //console.log(data)
            resolve(data);
          }
        );
      }
    });
  },

  getproducts: (search) => {
    console.log(search);

    let filter = "";

    return new Promise(function (resolve, reject) {
      filter = 'p.type == "' + search.type + '" && !p._deleted';

      if (search.type.length > 0) {
        db.query(
          "FOR p in cafeproducts FILTER " + filter + " RETURN p",
          (data) => {
            resolve(data);
          }
        );
      } else {
        db.query(
          "FOR p in cafeproducts FILTER !p._deleted RETURN p",
          (data) => {
            resolve(data);
          }
        );
      }
    });
  },
  getProductSearch: (search) => {
    let start = parseInt(search.start) || 0;
    let limit = parseInt(search.limit) || 10;
    return new Promise(function (resolve, reject) {
      var filter = "FILTER ";
      if (search.category) {
        filter += `p.type == '${search.category}' &&`;
      }
      if (search.keyword && search.keyword.length > 0) {
        let keyword = search.keyword.split(",");
        let filter = `(`;

        keyword.map((item, index) => {
          filter += `doc.category=='${item}' OR `;
        });
        filter = filter.substring(0, filter.lastIndexOf("OR"));
        filter += ")";
        console.log(`FOR doc IN cafeproducts
                    filter ${filter} and !doc._deleted Limit ${start},${limit}  RETURN doc`);
        db.query(
          `FOR doc IN cafeproducts
                    filter  ${filter} and !doc._deleted && doc.sell_online Limit ${start},${limit}  RETURN doc`,
          (data) => {
            resolve(data);
          }
        );
      } else if (search.name === "asc") {
        db.query(
          `FOR p in cafeproducts ${filter} !p._deleted AND p.sell_online sort p.name  Limit ${start},${limit} RETURN p`,
          (data) => {
            resolve(data);
          }
        );
      } else if (search.name === "desc") {
        db.query(
          `FOR p in cafeproducts ${filter} !p._deleted AND p.sell_online sort p.name desc Limit ${start},${limit} RETURN p`,
          (data) => {
            resolve(data);
          }
        );
      } else if (search.price === "asc") {
        db.query(
          `FOR p in cafeproducts ${filter} !p._deleted  AND p.sell_online sort p.discounted Limit ${start},${limit} RETURN p`,
          (data) => {
            resolve(data);
          }
        );
      } else if (search.price === "desc") {
        console.log(
          `FOR p in cafeproducts ${filter} !p._deleted AND p.sell_online sort p.name desc Limit ${start},${limit} RETURN p`
        );
        db.query(
          `FOR p in cafeproducts ${filter} !p._deleted  AND p.sell_online sort TO_NUMBER(p.discounted) desc Limit ${start},${limit} RETURN p`,
          (data) => {
            resolve(data);
          }
        );
      } else if (search.rating === "asc") {
        db.query(
          `FOR p in cafeproducts ${filter} !p._deleted AND p.sell_online sort TO_NUMBER(p.rating) Limit ${start},${limit} RETURN p`,
          (data) => {
            resolve(data);
          }
        );
      } else if (search.rating === "desc") {
        db.query(
          `FOR p in cafeproducts ${filter} !p._deleted AND p.sell_online sort TO_NUMBER(p.rating) desc Limit ${start},${limit} RETURN p`,
          (data) => {
            resolve(data);
          }
        );
      } else {
        if (search.name) {
          db.query(
            `FOR p in cafeproducts 
                        for c in caffeCategories
                for cc in c.sub_categories
                            FILTER  p.category==cc._key 
                        FILTER !p._deleted AND p.sell_online AND LOWER(p.name) LIKE LOWER("%${search.name}%") LIMIT ${start}, ${limit} RETURN p`,
            (data) => {
              resolve(data);
            }
          );
        } else {
          db.query(
            `FOR p in cafeproducts FILTER !p._deleted  Limit ${start},${limit} RETURN p`,
            (data) => {
              resolve(data);
            }
          );
        }
      }
    });
  },

  inoutstock: (search) => {
    let filter = "";

    return new Promise(function (resolve, reject) {
      filter = ' p._key == "' + key + '" && ABS(p.stock) > 0 && !p._deleted';

      //if (search.str.length > 2){
      db.query(
        "FOR p in cafeproducts FILTER " + filter + " RETURN p",
        (data) => {
          if (data.length > 0) {
            resolve(data[0].stock);
          } else {
            resolve(false);
          }
        }
      );
      /*} else {
                    resolve(false)
                }*/
    });
  },

  delete: (key) => {
    return new Promise(function (resolve, reject) {
      db.query(
        'FOR p IN cafeproducts FILTER p._key == "' +
          key +
          '" UPDATE p WITH {_deleted:"' +
          moment().toISOString() +
          '"} IN cafeproducts RETURN p',
        (data) => {
          if (data.length > 0) {
            resolve(data);
          } else {
            reject("Unable to delete Product " + key + ": Not found");
          }
        }
      );
    });
  },

  filter: (filter) => {
    return new Promise(async (resolve, reject) => {
      if (!filter || typeof filter != "object") {
        resolve([]);
        return;
      }

      console.log(filter);

      let filter_str =
        "LOWER(p." + filter.field + ') == "' + filter.value + '"';

      if (!filter.value || (filter.value && filter.value == "none")) {
        filter_str =
          '!HAS(p, "' + filter.field + '") || p.' + filter.field + ' == ""';
      }

      if (filter.price_range) {
        //filter_str += ' && p.price 5..25 '
      }

      //console.log(filter_str)

      /*if((filter.sort_alpha || filter.sort_alpha && filter.sort_alpha == 'none') && (filter.sort_price || filter.sort_price && filter.sort_price == 'none')){
                    filter_str += ' SORT p.name, p.price '
                }*/
      // && p.price == ABS(25)
      if (
        filter.sort_price ||
        (filter.sort_price && filter.sort_price == "none")
      ) {
        filter_str += " SORT p.price " + filter.sort_price;
      } else if (
        filter.sort_alpha ||
        (filter.sort_alpha && filter.sort_alpha == "none")
      ) {
        filter_str += " SORT p.name " + filter.sort_alpha;
      }

      console.log(filter_str);

      db.query(
        "FOR p IN cafeproducts FILTER " + filter_str + " RETURN p",
        (data) => {
          if (data.length > 0) {
            resolve(data);
          } else {
            reject("No filter options found");
          }
        }
      );
    });
  },

  mysearch: (filter) => {
    return new Promise(async (resolve, reject) => {
      console.log("fillter", filter);

      if (!filter || typeof filter != "object") {
        resolve([]);
        return;
      }

      let filter_str = ' p.type=="' + filter.type + '" ';

      if (filter.delivery && filter.delivery !== "") {
        if (Array.isArray(filter.delivery) && filter.delivery.length > 0) {
          filter.delivery.forEach(function (item, index) {
            console.log(item, index);
            if (index == 0)
              filter_str += ' AND ( LOWER(p.delivery) == "' + item + '"';
            else filter_str += ' || LOWER(p.delivery) == "' + item + '"';
          });

          filter_str += " )";
        }
      }

      console.log(filter);

      let offset = 0;

      if (filter.page) {
        offset = filter.page * 12;
      }
      filter.category.filter(function (el) {
        return el != null;
      });
      console.log(filter.category);

      if (Array.isArray(filter.category) && filter.category.length > 0) {
        filter.category.forEach(function (item, index) {
          console.log(item, index);
          if (index == 0)
            filter_str += ' AND ( LOWER(p.category) == "' + item + '"';
          else filter_str += ' || LOWER(p.category) == "' + item + '"';
        });

        filter_str += " )";
      } /*else {

                    filter_str = 'LOWER(p.'+filter.field+') == "'+filter.value+'"'

                    if (!filter.value || filter.value && filter.value == 'none'){
                        filter_str = '!HAS(p, "'+filter.field+'") || p.'+filter.field+' == ""'
                    }

                }*/

      /*if(Array.isArray(filter.brands) && filter.brands.length>0){

                    if(filter_str!=="") filter_str += ' AND '

                    filter.brands.forEach(function (item, index) {
                        console.log(item,index)
                        if(index==0)
                         filter_str += '( LOWER(p.brand) == "'+item+'"'
                        else
                         filter_str += ' || LOWER(p.brand) == "'+item+'"'
                    })

                    filter_str += ' )'
                }*/

      if (filter.str) {
        filter.str = filter.str.toLowerCase();

        filter_str +=
          (filter_str !== "" ? " && " : "") +
          ' (p._key like "%' +
          filter.str +
          '%"  || p.barcode like "%' +
          filter.str +
          '%"  || LOWER(p.brand) like "%' +
          filter.str +
          '%" || p.brand like "%' +
          filter.str +
          '%"  || LOWER(p.name) like "%' +
          filter.str +
          '%" || p.name like "%' +
          filter.str +
          '%"  || LOWER(p.description) like "%' +
          filter.str +
          '%" || p.description like "%' +
          filter.str +
          '%"  || LOWER(p.category) like "%' +
          filter.str +
          '%" || p.category like "%' +
          filter.str +
          '%" )  ';
      }

      if (filter.stock && filter.stock > 0) {
        filter_str +=
          (filter_str !== "" ? " && " : "") + " FLOOR(p.stock) > 0 ";
      } else if (
        typeof filter.stock !== "undefined" &&
        typeof filter.stock !== "string" &&
        filter.stock == 0
      ) {
        filter_str +=
          (filter_str !== "" ? " && " : "") + " FLOOR(p.stock) == 0 ";
      }

      if (filter.discount && filter.discount > 0) {
        filter_str +=
          (filter_str !== "" ? " && " : "") +
          " FLOOR(p.discount) >= " +
          filter.discount;
      }

      console.log("typeof filter.stock", typeof filter.stock);

      if (
        filter.min_price &&
        filter.max_price &&
        filter.discount &&
        filter.discount > 0
      ) {
        filter_str +=
          (filter_str !== "" ? " && " : "") +
          " (ABS(p.discounted) > " +
          filter.min_price +
          " && ABS(p.discounted) < " +
          filter.max_price +
          ") ";
      } else if (filter.min_price && filter.max_price) {
        filter_str +=
          (filter_str !== "" ? " && " : "") +
          " (ABS(p.price) > " +
          filter.min_price +
          " && ABS(p.price) < " +
          filter.max_price +
          " && (!p.discount || ABS(p.discount)==0)) ";
      }

      if (filter_str !== "") {
        filter_str = " FILTER !p._deleted && " + filter_str;
      } else filter_str = " FILTER !p._deleted";

      //console.log(filter_str)

      /*if((filter.sort_alpha || filter.sort_alpha && filter.sort_alpha == 'none') && (filter.sort_price || filter.sort_price && filter.sort_price == 'none')){
                    filter_str += ' SORT p.name, p.price '
                }*/
      // && p.price == ABS(25)
      if (
        filter.sort_price ||
        (filter.sort_price && filter.sort_price == "none")
      ) {
        filter_str += " SORT p.price " + filter.sort_price;
      } else if (
        filter.sort_alpha ||
        (filter.sort_alpha && filter.sort_alpha == "none")
      ) {
        var myarr = filter.sort_alpha.split("_");
        console.log(myarr);
        if (myarr[0] == "p") {
          if (filter.discount && filter.discount > 0) {
            filter_str += " SORT ABS(p.discounted) " + myarr[1];
          } else filter_str += " SORT ABS(p.price) " + myarr[1];
        } else if (myarr[0] == "r") {
          filter_str += " SORT ABS(p.rating) " + myarr[1];
        } else filter_str += " SORT p.name " + filter.sort_alpha;
      }

      console.log(
        "FOR p IN cafeproducts " +
          filter_str +
          " limit " +
          offset +
          ", 12 RETURN p"
      );

      db.query(
        "FOR p IN cafeproducts " +
          filter_str +
          " limit " +
          offset +
          ", 12 RETURN p",
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

  getFilters: (type) => {
    return new Promise(async (resolve, reject) => {
      if (type == "init") {
        resolve([
          { value: "brand", text: "Brand" },
          { value: "category", text: "Category" },
        ]);
      } else {
        db.query(
          "FOR p IN cafeproducts COLLECT type = LOWER(p." +
            type +
            ') WITH COUNT INTO length RETURN {"type" : type, "value" : type, "count" : length}',
          async (data) => {
            if (data.length > 0) {
              if (type == "category") {
                let salon = await salon_data.find("54855602");

                data = data.map((filter) => {
                  if (parseInt(filter.type) && parseInt(filter.type) >= 0) {
                    filter.type = salon.product_categories.find((cat) => {
                      return cat._id == filter.type;
                    });

                    if (filter.type && filter.type.name) {
                      filter.value = filter.type._id;
                      filter.type = filter.type.name;
                    }
                  } else {
                    filter.type = "none";
                  }

                  return filter;
                });

                resolve(data);
              } else {
                resolve(data);
              }
            } else {
              resolve([]);
            }
          }
        );
      }
    });
  },

  removeStock: (key, data, qty) => {
    return new Promise(function (resolve, reject) {
      collection.document(key).then((doc) => {
        if (typeof doc.stock != "undefined") {
          doc.stock = parseInt(doc.stock) - parseInt(qty);

          if (doc.stock <= 0) {
            events.trigger("out_of_stock", doc);
          } else if (doc.stock < 5) {
            events.trigger("low_stock", doc);
          }
        }

        collection
          .update(doc, doc)
          .then(() => {
            resolve(doc);
          })
          .catch(() => {
            reject("not found");
          });
      });
    });
  },
  addStock: (key, val) => {
    if (!val) {
      val = "1";
    }

    return new Promise(function (resolve, reject) {
      db.query(
        'LET product = DOCUMENT("cafeproducts/' +
          key +
          '") UPDATE product WITH { stock: product.stock + ' +
          val +
          " } IN cafeproducts RETURN NEW",
        (data) => {
          if (data.length > 0) {
            resolve(data[0]);
          } else {
            reject("Not found");
          }
        }
      );
    });
  },
  addToOrder: (data) => {
    return new Promise(async (resolve, reject) => {
      db.query(
        'FOR p IN cafeproducts FILTER p._key == "' +
          data._key +
          '" UPDATE p WITH { on_order: ' +
          data.value +
          " } IN cafeproducts RETURN NEW",
        (prod_data) => {
          resolve(prod_data);
        }
      );
    });
  },
  saveCategory: (data) => {
    console.log(data);
    data.sub_categories = [];
    return new Promise(async (resolve, reject) => {
      db.query(
        `insert ${JSON.stringify(data)} INTO caffeCategories`,
        (prod_data) => {
          console.log(prod_data);
          resolve(prod_data);
        }
      );
    });
  },
  getCategory: (data) => {
    return new Promise(async (resolve, reject) => {
      await db.query(
        `for p in caffeCategories sort p._key asc return p `,
        (prod_data) => {
          resolve(prod_data);
        }
      );
    });
  },
  getCategoryById: (data) => {
    return new Promise(async (resolve, reject) => {
      await db.query(
        `for p in caffeCategories FILTER p._key=='${data.key}' return p.sub_categories`,
        (prod_data) => {
          console.log(prod_data);
          resolve(prod_data);
        }
      );
    });
  },
  deleteCategory: (data) => {
    // console.log(data);
    return new Promise(async (resolve, reject) => {
      await db.query(
        `for p in caffeCategories filter p._key=='${data.id}' remove p in caffeCategories return p`,
        (prod_data) => {
          // console.log(prod_data)
          resolve(prod_data);
        }
      );
    });
  },
  updateCategory: (data) => {
    return new Promise(async (resolve, reject) => {
      await db.query(
        `for p in caffeCategories filter p._key=='${data.id}' update p with {name:'${data.name}'} in caffeCategories return p`,
        (prod_data) => {
          console.log(prod_data);
          resolve(prod_data);
        }
      );
    });
  },
  addSubCat: (data) => {
    return new Promise(async (resolve, reject) => {
      await db.query(
        `for p in caffeCategories filter p._key=='${data.id}' update p with {sub_categories:APPEND(p.sub_categories,{name:'${data.name}',"_key":'${data.i}'})} in caffeCategories return p`,
        (prod_data) => {
          console.log(prod_data);
          resolve(prod_data);
        }
      );
    });
  },
  updateSubCat: (dataParam) => {
    console.log(dataParam);
    return new Promise(async (resolve, reject) => {
      await db.query(
        `for document in caffeCategories
                filter document._key=='${dataParam.id}' return document.sub_categories`,
        async (data1) => {
          const data2 = data1[0];
          data2[dataParam._Key].name = dataParam.name;
          await db.query(
            `for p in caffeCategories filter p._key=='${
              dataParam.id
            }' update p with {sub_categories:${JSON.stringify(
              data2
            )}} in caffeCategories return p`,
            async (data) => {
              resolve(data);
            }
          );
        }
      );
    });
  },
  removeSub: (data) => {
    console.log(data);
    return new Promise(async (resolve, reject) => {
      await db.query(
        `FOR doc IN caffeCategories
              FOR item IN doc.sub_categories 
                  FILTER item._key == '${data.name}'
                      UPDATE doc WITH { sub_categories: REMOVE_VALUE( doc.sub_categories, item ) } IN caffeCategories`,
        (prod_data) => {
          // console.log(prod_data)
          resolve(prod_data);
        }
      );
    });
  },
  getAllSubCat: async (data) => {
    console.log(data);
    return new Promise(async (resolve, reject) => {
      await db.query(
        `FOR doc IN caffeCategories
              FOR sub_category IN doc.sub_categories
                  RETURN sub_category
          `,
        async (prod_data) => {
          resolve(prod_data);
        }
      );
    });
  },
  addTable: async (data) => {
    // console.log(data)
    qrcode.toDataURL(
      JSON.stringify(data),
      {
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      },
      function (err, url) {
        if (err) throw err;
        data.qrcode = url;
        // console.log("Base64-encoded QR code:", data.qrcode);
        return new Promise(async (resolve, reject) => {
          await db.query(
            `INSERT ${JSON.stringify(data)} INTO cafeTables
              `,
            async (prod_data) => {
              resolve(prod_data);
            }
          );
        });
      }
    );
  },
  updateTable: async (data) => {
    // console.log(data)
    qrcode.toDataURL(
      JSON.stringify({ tableNumber: data.tableNumber, active: data.active }),
      {
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      },
      function (err, url) {
        if (err) throw err;
        data.qrcode = url;
        // console.log("x-encoded QR code:", data.qrcode);
        return new Promise(async (resolve, reject) => {
          await db.query(
            `for p in cafeTables filter p._key=='${
              data._key
            }' update p with ${JSON.stringify(data)} in cafeTables return p
              `,
            async (prod_data) => {
              console.log("===========", prod_data);

              resolve(prod_data);
            }
          );
        });
      }
    );
  },
  getTables: async (data) => {
    return new Promise(async (resolve, reject) => {
      await db.query(
        `for p in cafeTables limit 20 return p
          `,
        async (prod_data) => {
          resolve(prod_data);
        }
      );
    });
  },
  removeTable: async (data) => {
    return new Promise(async (resolve, reject) => {
      await db.query(
        `for p in cafeTables filter p._key=='${data._key}' REMOVE p in cafeTables return p
          `,
        async (prod_data) => {
          console.log(prod_data);
          resolve(prod_data);
        }
      );
    });
  },
  getTable: async (_key) => {
    return new Promise(async (resolve, reject) => {
      await db.query(
        `for p in cafeTables filter p._key=='${_key}' return p
          `,
        async (prod_data) => {
          console.log(prod_data);
          resolve(prod_data);
        }
      );
    });
  },
  tableSearch: async (search) => {
    let filter = "";
    let type = "false";

    type = search.str.split("-*-")[1];
    search.str = search.str.split("-*-")[0];

    console.log(type, search.str);

    return new Promise(async function (resolve, reject) {
      await db.query(
        `FOR p in cafeTables FILTER 
                 LOWER(p.tableNumber) LIKE LOWER("%${search.str}%") SORT p._created  
                return p`,
        async (data) => {
          if (data) {
            resolve(data);
          } else {
            resolve([]);
          }
        }
      );
    });
  },
  createExecutiveStamp: (body) => {
    return new Promise((resolve, reject) => {
      let q;
      if (!body._key) {
        q = `INSERT ${JSON.stringify(body)} IN ExecutiveStamp RETURN NEW`;
      } else {
        
        q = `UPSERT {_key:"${body._key}"} INSERT ${JSON.stringify(
          body
        )} UPDATE ${JSON.stringify(body)} IN ExecutiveStamp RETURN NEW`;
      
      }
     
      db.query(q,(data)=>{
        resolve(data)
      })
    });
  },
  getAllExecutiveStamp: () => {
    return new Promise((resolve, reject) => {
      let q=`FOR p IN ExecutiveStamp RETURN p`
      db.query(q,(data)=>{
        resolve(data)
      })
    });
  },
  removeExecutiveStamp:(key)=>{
    return new Promise((resolve,reject)=>{
console.log("keyeye",key);
let q=`for p in ExecutiveStamp filter p._key=='${key.key}' REMOVE p in ExecutiveStamp return p`
db.query(q,(data)=>{
  resolve(data)
})
    })
  },
};

module.exports = product;
