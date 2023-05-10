const db = require("../components/arango");
const config = require("../modules/config");
const sendMail = require("../modules/sendMail");
const Admins = require("./admins");
const members = {
  find: (key) => {
    console.log(key);

    if (typeof key == "object") {
      key = key["id"];
    }

    return new Promise(function (resolve, reject) {
      db.query(
        'FOR a in members FILTER a._key == "' + key + '" RETURN a',
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

  byPurchasedDate: (key, data) => {
    console.log(key);

    if (typeof key == "object") {
      key = key["date"];
    }

    return new Promise(function (resolve, reject) {
      db.query(
        'FOR a in member_transactions FILTER "' +
          key +
          '" IN a.items[*].date AND a.type=="Service Payment" LET member = (FOR m IN members FILTER m._key == a.member_id RETURN {name:m.name,image:m.avatar}) RETURN MERGE(a,{member:member})',
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

  getslotsmember: (key, data) => {
    console.log(key);

    if (Object.keys(key).length == 0) {
      key = data.params.function;
    }

    return new Promise(function (resolve, reject) {
      db.query(
        'FOR a in slots FILTER a.member_data == "' + key + '" RETURN a',
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
  reedeem: (key) => {
    console.log(key);

    if (Object.keys(key).length == 0) {
      key = data.params.function;
    }

    return new Promise(function (resolve, reject) {
      // send mail for reedeem....
      try {
        let msg2 = {
          to: config.email.admin_to,
          // to: 'pankajpo0115@yopmail.com',
          subject: "New Reedeem Request",

          text: `<p> ${key.name} Has requested for Wallet Balance Reedeem. </p>`,
        };
        notification.email(msg2);
        //   sendMail.sendMail(msg2.to,msg2.subject,msg2.text,msg2.subject, "new.ejs")
        resolve([]);
      } catch (e) {
        reject(["something went wrong"]);
      }
      // db.query('FOR a in slots FILTER a.member_data == "'+key+'" RETURN a', (data)=>{

      //     console.log(data)

      //     if (data.length > 0){
      //         resolve(data[0])
      //     } else {
      //         resolve([])
      //     }

      // })
    });
  },

  slotsbymember: (key, data) => {
    console.log("slotsbymember", key);
    if (Object.keys(key).length == 0) {
      key = data.params.function.split("**");
    }
    //console.log(`FOR a in slots FILTER a.member_data == "${key[0]}" and a.${key[1].toString()} RETURN a`)

    return new Promise(function (resolve, reject) {
      db.query(
        `FOR a in slots FILTER a.member_data == "${key[0]}" RETURN a`,
        (data) => {
          console.log("slotsdata", data);

          if (data.length > 0) {
            resolve(data[0]);
          } else {
            resolve([]);
          }
        }
      );
    });
  },
  slotsbymember: (key, data) => {
    console.log("slotsbymember", key);
    if (Object.keys(key).length == 0) {
      key = data.params.function.split("**");
    }
    //console.log(`FOR a in slots FILTER a.member_data == "${key[0]}" and a.${key[1].toString()} RETURN a`)

    return new Promise(function (resolve, reject) {
      db.query(
        `FOR a in slots FILTER a.member_data == "${key[0]}" RETURN a`,
        (data) => {
          console.log("slotsdata", data);

          if (data.length > 0) {
            resolve(data[0]);
          } else {
            resolve([]);
          }
        }
      );
    });
  },
  getMemberSlots: async (key, data) => {
    console.log("slotsbymember", key);
    if (Object.keys(key).length == 0) {
      key = data.params.function.split("**");
    }
    const data1 = [];
    var today = new Date();
    var year = today.getFullYear();
    var month = today.getMonth() + 1;
    var day = today.getDate();

    month = month < 10 ? "0" + month : month;
    day = day < 10 ? "0" + day : day;

    var dateString = "date_" + year + month + day;

    return new Promise(async function (resolve, reject) {
      await db.query(
        `FOR a IN slots
                FILTER  a.member_data == '${key}'
                LET keys = (FOR k IN ATTRIBUTES(a) FILTER k =~ "^date_[0-9]+$"  and k > "${dateString}" RETURN SUBSTRING(k,5))
                RETURN keys`,
        async (data) => {
          if (data) {
            data[0].forEach(async (item) => {
              const input = item;
              const year = input.substring(0, 4);
              const month = input.substring(4, 6);
              const day = input.substring(6, 8);
              const output = year + "-" + month + "-" + day;
              data1.push(output);
            });
          }

          if (data.length > 0) {
            resolve(data1);
          } else {
            resolve([]);
          }
        }
      );
    });
  },
  getSlotTimeOnDate: async (filter) => {
    const key = filter.key;
    const date = filter.date;
    let modifiedDateString = "date_" + date.replace(/-/g, "");

    return new Promise(async function (resolve, reject) {
      console.log(`FOR a IN slots
                FILTER  a.member_data == '${key}'
                RETURN a['${modifiedDateString}']`);
      await db.query(
        `FOR a IN slots
               FILTER  a.member_data == '${key}'
               RETURN a['${modifiedDateString}']`,
        async (data) => {
          if (data.length > 0) {
            resolve(data);
          } else {
            resolve([]);
          }
        }
      );
    });
  },
  getBookedSlots: async (filter) => {
    console.log("===");
    const key = filter.key;
    const start = filter.start;
    const end = filter.end;
    const dateString = start.substring(0, 10);
    console.log(dateString);
    let modifiedDateString = "date_" + dateString.replace(/-/g, "");
    console.log(modifiedDateString);
    // let modifiedDateString ="date_"+ date.replace(/-/g, "");

    return new Promise(async function (resolve, reject) {
      console.log(`for p in appointments filter p.staff_id=='${key}' FILTER DATE_ISO8601(p.date)
                > DATE_ISO8601('${start}')
               FILTER DATE_ISO8601(p.date) < DATE_ISO8601('${end}')
               filter p.status!='cancelled' return {date: SUBSTRING(p.start, 11, 5),
               end_date: SUBSTRING(p.end, 11, 5)}`);
      await db.query(
        `for p in appointments filter p.staff_id=='${key}' FILTER DATE_ISO8601(p.date)
                > DATE_ISO8601('${start}')
               FILTER DATE_ISO8601(p.date) < DATE_ISO8601('${end}')
               filter p.status!='cancelled' return {start: SUBSTRING(p.date, 11, 5),
               end: SUBSTRING(p.end_date, 11, 5)}`,
        async (data) => {
          if (data) {
            console.log(`FOR a IN slots
                        FILTER  a.member_data == '${key}'
                        RETURN a['${modifiedDateString}']`);
            await db.query(
              `FOR a IN slots
               FILTER  a.member_data == '${key}'
               RETURN a['${modifiedDateString}']`,
              async (data1) => {
                resolve({ slots: data1, booked: data });
              }
            );
          } else {
            resolve([]);
          }
        }
      );
    });
  },

  getactivemem: () => {
    return new Promise(function (resolve, reject) {
      db.query('FOR a in members FILTER a.active=="true" RETURN a', (data) => {
        //console.log(data)

        resolve(data);
      });
    });
  },
  confirm: (key) => {
    return new Promise(function (resolve, reject) {
      db.query(
        'FOR a in members FILTER a.hash_email == "' +
          key +
          '" UPDATE a WITH {active:"true"} IN members RETURN a',
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

  addtocart: (data, key) => {
    console.log(data);

    let mem_id = data.member_id;
    delete data.member_id;

    console.log(mem_id, data);

    return new Promise(function (resolve, reject) {
      //UPSERT {_key:"'+mem_id+'"} UPDATE '+JSON.stringify(data)+' IN members RETURN NEW

      //console.log('FOR u IN members FILTER u._key == "'+mem_id+'" UPDATE u WITH { selected_seats: '+JSON.stringify(data.selected_seats)+' } IN members')

      db.query(
        'FOR u IN members FILTER u._key == "' +
          mem_id +
          '" UPDATE u WITH { selected_seats: ' +
          JSON.stringify(data.selected_seats) +
          " } IN members",
        (data) => {
          console.log(data);

          resolve(data);
        }
      );
    });
  },

  all: () => {
    return new Promise(function (resolve, reject) {
      db.query("FOR a in members SORT a._key DESC RETURN a", (data) => {
        resolve(data);
      });
    });
  },

  mysearch: async (filter) => {
    return new Promise(async (resolve, reject) => {
      if (!filter || typeof filter != "object") {
        resolve([]);
        return;
      }
      let filter_str = "";

      let offset = 0;

      if (filter.page) {
        offset = filter.page * 12;
      }

      if (Array.isArray(filter.service) && filter.service.length > 0) {
        filter.service.forEach(function (item, index) {
          if (index == 0) filter_str = '( "' + item + '" in p.mem_services ';
          else filter_str += ' || "' + item + '" in p.mem_services ';
        });

        filter_str += " )";
      }

      if (filter.str) {
        filter.str = filter.str.toLowerCase();
        filter_str +=
          (filter_str !== "" ? " && " : "") +
          ' (LOWER(p.name) like "%' +
          filter.str +
          '%" || p.name like "%' +
          filter.str +
          '%"  || LOWER(p.description) like "%' +
          filter.str +
          '%" || p.description like "%' +
          filter.str +
          '%" )  ';
      }

      if (
        !filter.selected_seats &&
        Array.isArray(filter.rating) &&
        filter.rating.length > 0
      ) {
        if (filter_str !== "") filter_str += " AND ";

        filter.rating.forEach(function (item, index) {
          console.log(item, index);
          if (index == 0)
            filter_str +=
              "( LOWER(p.rating) " +
              (item == 0 ? ' < "1"' : '== "' + item + '"');
          else
            filter_str +=
              " || LOWER(p.rating) " +
              (item == 0 ? ' < "1"' : '== "' + item + '"');
        });

        filter_str += " )";
      }

      if (filter.rating && !Array.isArray(filter.rating)) {
        filter_str +=
          (filter_str !== "" ? " && " : "") +
          " (ABS(p.rating) <= " +
          filter.rating +
          " && ABS(p.rating) )  ";
      }

      if (filter_str !== "") {
        filter_str = ' FILTER p.status!="false" && ' + filter_str;
      } else filter_str = ' FILTER p.status!="false"';

      if (filter.selected_seats) {
        var newDateString = filter.selected_seats.replace(/-/g, "");
        var query = `FOR doc IN slots
                    FILTER 'date_${newDateString}' IN ATTRIBUTES(doc)  
                    LET member = DOCUMENT(members, doc.member_data)
                    FILTER  member.status!="false"
                    FILTER member!=null  LIMIT 0,12
                    LET service = (for s in services filter s._key==FIRST(p.mem_services) return s.name)
                RETURN MERGE(p, {experience: service})`;
        if (filter.rating) {
          query = `FOR doc IN slots
                    FILTER 'date_${newDateString}' IN ATTRIBUTES(doc)  
                    LET member = DOCUMENT(members, doc.member_data)
                    FILTER  member.status!="false"
                    FILTER member!=null  LIMIT ${offset},12
                    LET service = (for s in services filter s._key==FIRST(p.mem_services) return s.name)
                RETURN MERGE(p, {experience: service})`;
        }
        if (Array.isArray(filter.service) && filter.service.length > 0) {
          filter.service.forEach(function (item, index) {
            console.log(item, index);
            if (index == 0)
              filter_str = '( "' + item + '" in member.mem_services ';
            else filter_str += ' || "' + item + '" in member.mem_services ';
          });

          filter_str += " )";
          query = `FOR doc IN slots
                        FILTER 'date_${newDateString}' IN ATTRIBUTES(doc)  
                        LET member = DOCUMENT(members, doc.member_data)
                        FILTER  member.status!="false"
                        FILTER member!=null
                        FILTER ${filter_str} 
                         LIMIT ${offset},12
                         LET service = (for s in services filter s._key==FIRST(p.mem_services) return s.name)
                RETURN MERGE(p, {experience: service})`;
        }
        db.query(query, (data) => {
          if (data.length > 0) {
            // console.log(data)
            resolve(data);
          } else {
            resolve([]);
          }
        });
      } else {
        console.log(`FOR p in members ${filter_str} limit ${offset} ,12 
                LET service = (for s in services filter s._key==FIRST(p.mem_services) return s.name)
                RETURN MERGE(p, {experience: service})`);
        db.query(
          `FOR p in members ${filter_str} limit ${offset} ,12 
                LET service = (for s in services filter s._key==FIRST(p.mem_services) return s.name)
                RETURN MERGE(p, {experience: service})`,
          (data) => {
            if (data.length > 0) {
              resolve(data);
            } else {
              resolve([]);
            }
          }
        );
      }
    });
  },

  addslots: (data) => {
    return new Promise(async function (resolve, reject) {
      console.log("data", data);
      let ndata = {};

      if (data.key) {
        delete data.slots[data.date][data.key];
        ndata = data.slots;
        ndata["member_data"] = data.member_data;
      } else {
        let old_data = await members.getslotsmember(data.member_data); //.then((old_data)=>{ })

        if (old_data.length == 0) {
          old_data = {};
          old_data["member_data"] = data.member_data;
        }

        console.log("old_data", old_data);
        old_data[data.date] = data.slots;
        ndata = old_data;
        console.log("udata", ndata);

        //return;
      }

      /*delete data.slots
                delete data.key
                delete data.date*/

      //return false;

      db.query(
        'UPSERT {member_data:"' +
          data.member_data +
          '"} INSERT ' +
          JSON.stringify(ndata) +
          " REPLACE " +
          JSON.stringify(ndata) +
          ' IN slots RETURN { doc: NEW, type: OLD ? "update" : "insert" }',
        (data) => {
          console.log(data);

          if (data.length > 0) {
            resolve(data[0]);
          } else {
            reject("Something wrong!!");
          }
        }
      );
    });
  },

  addprice: (data) => {
    return new Promise(function (resolve, reject) {
      console.log("data", data);

      db.query(
        'FOR a in members FILTER a._key == "' +
          data.member_id +
          '" UPDATE a WITH {services_price:' +
          JSON.stringify(data.price) +
          "} IN members RETURN NEW",
        (data2) => {
          console.log(data2);

          if (data2.length > 0) {
            resolve(data2[0]);
          } else {
            reject("Something wrong!!");
          }
        }
      );
    });
  },

  getorders: (data) => {
    console.log("aaaa");

    return new Promise(function (resolve, reject) {
      db.query(
        'FOR c in members FILTER c._key == "' + data.key + '" RETURN c.orders',
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

  getslots: (data) => {
    //console.log(data)

    return new Promise(function (resolve, reject) {
      db.query(
        'FOR c in slots FILTER c.member_data == "' +
          data +
          '" OR c.member_data == ' +
          data +
          " RETURN c",
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

  updateprofile: (data) => {
    console.log("data", data._key);
    return new Promise(function (resolve, reject) {
      //return;
      //db.query('UPSERT {_key:"'+data._key+'"} INSERT '+JSON.stringify(data)+' UPDATE '+JSON.stringify(data)+' IN members RETURN NEW', (data)=>{

      db.query(
        'FOR a in members FILTER a._key == "' +
          data._key +
          '" UPDATE a WITH ' +
          JSON.stringify(data) +
          " IN members RETURN a",
        (data) => {
          if (data.length > 0) {
            console.log("success", data[0]);

            resolve(data[0]);
          } else {
            resolve([]);
          }
        }
      );
    });
  },

  save: (data) => {
    return new Promise(function (resolve, reject) {
      let err = {};
      if (!data.update) {
        if (
          data.email == "" ||
          !data.email.match(
            /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
          )
        ) {
          err["email"] = "Email is not valid!";
        }
        if (data.name == "") {
          err["name"] = "Name could not be empty!";
        }
        if (data.password == "") {
          err["password"] = "Password could not be empty!";
        }
        if (
          data.password &&
          !data.password.match(
            /^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$/
          )
        ) {
          err["password"] =
            "Must contain at least one number and one uppercase and lowercase letter, and at least 8 or more characters";
        }

        if (data.passwordValid == 0) {
          err["password"] = "Password not valid!";
        }

        if (data.cpassword == "" && !data._key) {
          err["cpassword"] = "Confirm password could not be empty!";
        }

        if (
          data.password !== "" &&
          data.cpassword !== "" &&
          data.password !== data.cpassword &&
          !data._key
        ) {
          err["cpassword"] = "Confirm Password not matched with password!";
        }

        if (data.phone == "") {
          err["phone"] = "Phone Number could not be empty!";
        }
        var phoneNum = data.phone.replace(/[^\d]/g, "");

        if (data.phone !== "" && phoneNum.length !== 10) {
          err["phone"] = "Phone Number not valid!";
        }

        if (
          !data.mem_services ||
          (data.mem_services && data.mem_services.length == 0)
        ) {
          err["service"] = "Please select atleast one service!";
        }
        // if(!data.mem_services_cat|| (data.mem_services_cat && data.mem_services_cat.length == 0)){
        //     err['serviceCat'] = 'Please select atleast one service Category!'
        // }
      }

      if (Object.keys(err).length == 0) {
        if (!data._key) {
          db.query(
            'FOR a in members FILTER a.email == "' + data.email + '" RETURN a',
            (data2) => {
              if (data2.length == 0) {
                data.password = db.hash(data.password);
                data.status = "false";
                data.active = "false";

                let hash_email = db.hash("email-confirm" + Date.now());
                data.hash_email = hash_email;

                delete data.cpassword;
                let serv = data.services;
                delete data.services;

                db.query(
                  'UPSERT {_key:"' +
                    data._key +
                    '"} INSERT ' +
                    JSON.stringify(data) +
                    " UPDATE " +
                    JSON.stringify(data) +
                    " IN members RETURN NEW",
                  (data) => {
                    if (data.length > 0) {
                      let msg;
                      msg = {
                        to: data[0].email,
                        subject:
                          "Verify your email for member login - " +
                          config.site_name +
                          "!",
                        text:
                          "We're pleased to have you on board, but first you need to verify your email for your " +
                          config.site_name +
                          " account. Please click the following link to get started. ",
                        button_text: "Verify Email",
                        button_url:
                          config.backend_url + "/member/confirm/" + hash_email,
                      };
                      const text = `${msg.text} <br/> <a class="verifyBtn" style=" background-color: #4e5546;margin-top:5px;border-radius: 8px;border: none; color: white;
                                    padding: 15px 32px;
                                    text-align: center;
                                    text-decoration: none;
                                    display: inline-block;
                                    font-size: 16px;" href="${msg.button_url}"> Verify</a>`;
                      // notification.email(msg)
                      sendMail.sendMail(
                        msg.to,
                        msg.subject,
                        text,
                        msg.subject,
                        "new.ejs"
                      );

                      data[0].services = serv;
                      resolve(data[0]);
                    } else {
                      data.services = serv;
                      reject(data);
                    }
                  }
                );
              } else {
                let err = {};
                err["email"] = "Email already exist!!";
                reject(err);
              }
            }
          );
        } else {
          console.log("aaaa---------");

          db.query(
            'UPSERT {_key:"' +
              data._key +
              '"} INSERT ' +
              JSON.stringify(data) +
              " UPDATE " +
              JSON.stringify(data) +
              " IN members RETURN NEW",
            (data) => {
              if (data.length > 0) {
                //send email for acount activation.
                if (data[0].status === "true" || data[0].success === true) {
                  const status =
                    data[0].active === "true" ? "Activated" : "De-Activated";
                  console.log(
                    "Welcome " +
                      data[0].name +
                      "!. Your Account Status is now " +
                      status
                  );
                  let msg = {
                    to: data[0].email,
                    subject: "Account Status Update",
                    text:
                      "Welcome " +
                      data[0].name +
                      "!. Your Account Status is now " +
                      status,
                  };
                  // notification.email(msg)
                  sendMail.sendMail(
                    msg.to,
                    msg.subject,
                    msg.text,
                    msg.subject,
                    "new.ejs"
                  );
                }
                resolve(data[0]);
              } else {
                data.services = serv;
                reject(data);
              }
            }
          );
        }
      } else {
        reject(err);
      }
    });
  },

  authenticate: (data) => {
    return new Promise(function (resolve, reject) {
      // && a.password == "'+db.hash(data.password)+'"
      db.query(
        'FOR a in members FILTER a.email == "' +
          data.email +
          '" && a.password == "' +
          db.hash(data.password) +
          '" RETURN a',
        (data) => {
          if (data.length > 0) {
            if (data[0].active == "false") {
              reject(
                "Email not confirmed please check your email inbox or in spam!!"
              );
            } else if (data[0].status == "false") {
              reject(
                "Admin not approved yet, we will notify you by email when approved!!"
              );
            } else {
              data[0].guard = "member";
              resolve(data[0]);
            }
          } else {
            reject("Incorrect Email address or password");
          }
        }
      );
    });
  },

  sendReset: (data) => {
    return new Promise(function (resolve, reject) {
      let hash = db.hash("password-reset" + Date.now());

      db.query(
        'FOR a in members FILTER a.email == "' +
          data.email +
          '" UPDATE a WITH {password_reset:"' +
          hash +
          '"} IN members RETURN NEW',
        (data) => {
          if (data.length > 0) {
            let msg = {
              to: data[0].email,
              subject: "Password Reset",
              // text: "Please click the following link to reset your password. Your current password has not been changed, so if you didn't initiate this, you can ignore it. It could mean someone has attempted to access your account however, so please get in contact if you have concerns. "+config.site_url+'/login/member/'+hash
              text: `Please click the following link to reset your password. Your current password has not been changed, so if you didn't initiate this, you can ignore it. It could mean someone has attempted to access your account however, so please get in contact if you have concerns. <a href="${config.backend_url}/login/member/${hash}" >${config.backend_url}/login/member/${hash}</a> `,
            };
            // notification.email(msg)
            sendMail.sendMail(
              msg.to,
              msg.subject,
              msg.text,
              msg.subject,
              "new.ejs"
            );
            resolve(data[0]);
          } else {
            reject(data);
          }
        }
      );
    });
  },

  resetPassword: (data) => {
    return new Promise(function (resolve, reject) {
      console.log("daaaaaaaaata", data);
      if (data.password != data.password_conf || !data.password) {
        reject("Mismatching passwords");
      } else {
        db.query(
          'FOR a in members FILTER a.email == "' +
            data.email +
            '" && a.password_reset == "' +
            data.hash +
            '" UPDATE a WITH {password:"' +
            db.hash(data.password) +
            '", password_reset:""} IN members RETURN NEW',
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
  },
  addEnquiry: (data) => {
    console.log("=====");
    return new Promise(function (resolve, reject) {
      db.query(
        `INSERT  ${JSON.stringify(data)} INTO member_enquiry RETURN NEW`,
        (data) => {
          console.log(data, "created data");
          if (data.length > 0) {
            //console.log(data)
            resolve(data[0]);
          } else {
            //console.log(data)
            reject("Not found");
          }
        }
      );
    });
  },
  getEnquiry: async (data) => {
    data = JSON.stringify(data);
    let start = parseInt(data.start) || 0;
    let limit = parseInt(data.limit) || 10;
    var count1 = 0;
    console.log(
      "FOR a in member_enquiry LIMIT " + start + "," + limit + " RETURN a"
    );
    return new Promise(function (resolve, reject) {
      db.query(
        "FOR a in member_enquiry LIMIT " + start + "," + limit + " RETURN a",
        (data) => {
          db.query("RETURN LENGTH(member_enquiry)", (count) => {
            count1 = count[0];
            if (data.length > 0) {
              let p = count1;
              resolve({ count: p, data: data, start: start });
            } else {
              reject({ msg: "invalid data" });
            }
          });
        }
      );
    });
  },
  getEnquiry2: async (data) => {
    data=JSON.stringify(data);
    let start=parseInt(data.start) || 0;
    let limit=parseInt(data.limit) || 10;
    var count1 =0;
    console.log('FOR a in member_inquiery LIMIT '+start+','+limit+' RETURN a')
    return new Promise(function(resolve, reject){
        db.query('FOR a in member_inquiery LIMIT '+start+','+limit+' SORT a._key desc RETURN a', (data)=>{
            db.query('RETURN LENGTH(member_inquiery)', (count)=>{
             count1=count[0];
             if (data.length > 0){
                let p=count1
                resolve({"count":p,"data":data,"start":start})
            } else {
                reject({"msg":"invalid data"})
            }
            })
        })
    })
},
  getMembersWithSubsId: async (data) => {
    return new Promise(function (resolve, reject) {
      db.query(
        'for p in members FILTER p.subscription_id =="' +
          data +
          '" RETURN {"id":p._key,"name":p.name,"email":p.email,"phone":p.phone}',
        (data) => {
          console.log(data);
          if (data) {
            resolve(data);
          } else {
            reject({ msg: "invalid data" });
          }
        }
      );
    });
  },
  getMembersWithServiceCat: async (data) => {
    console.log(data);
    if (data.category) {
      var str = JSON.stringify(data.category);
      // const service=data.service.split(',')
      // let arr=[];
      // service.forEach(async (item,i)=>{
      //     arr.push(`"${item}"`)
      // })
    }
    // console.log(arr)
    return new Promise(function (resolve, reject) {
      console.log(`FOR member IN members
                FILTER LENGTH(
                    FOR serviceId IN member.mem_services
                        FOR service IN services
                            FILTER service._key == serviceId
                            FILTER service.category IN ${str}
                            RETURN service
                ) > 0
                LIMIT 12
                RETURN {
                    name: member.name,
                    email: member.email,
                    about: member.about,
                    tagline: member.tagline,
                    _key: member._key,
                    avatar: member.avatar,
                    mem_services: member.mem_services
                }
            `);
      db.query(
        `FOR member IN members
                FILTER LENGTH(
                    FOR serviceId IN member.mem_services
                        FOR service IN services
                            FILTER service._key == serviceId
                            FILTER service.category IN ${str}
                            RETURN service
                ) > 0
                LIMIT 12
                RETURN {
                    name: member.name,
                    email: member.email,
                    about: member.about,
                    tagline: member.tagline,
                    _key: member._key,
                    avatar: member.avatar,
                    mem_services: member.mem_services
                }
            `,
        (data) => {
          if (data) {
            resolve(data);
          }
        }
      );
    });
  },
  redeemRequest: async (data) => {
    console.log(data);
    const member = data.id;
    const amount = parseInt(data.amount);
    data._created = new Date();
    console.log(
      `INSERT   ${JSON.stringify(data)} INTO wallet_transactions RETURN NEW`
    );
    return new Promise(async function (resolve, reject) {
      await db.query(
        `INSERT  ${JSON.stringify(data)} INTO wallet_transactions RETURN NEW`,
        async (data) => {
          console.log(
            `for p in members filter p._key =='${member}' update p with {wallet:p.wallet - ${amount}} in members return {wallet:p.wallet}`
          );
          await db.query(
            `for p in members filter p._key =='${member}' update p with {wallet:p.wallet - ${amount}} in members return {wallet:p.wallet}`,
            async (data2) => {
              console.log("wallet update in member");
            }
          );
          if (data) {
            resolve(data);
          }
        }
      );
    });
  },
  getRedeem: async (data) => {
    console.log(data);
    var filter = ``;
    if (data.status) {
      filter = `&& p.status=="${data.status}"`;
    }
    console.log(filter);
    let query = ``;
    if (data.id) {
      query = `for p in wallet_transactions filter p.id =='${data.id}' filter p.status=='pending' filter p.Remarks =='redeem request' sort p._created desc limit 1 return p`;
    } else if (data.str) {
      query = `FOR p IN wallet_transactions 
               FILTER p.Remarks == 'redeem request' 
               FOR q IN members 
                   FILTER q._key == p.id &&( LIKE(LOWER(q.name), "%${data.str}%") ||  LIKE(LOWER(q.email), "%${data.str}%"))
                   SORT p._created DESC 
                   RETURN {
                       name: q.name,
                       email: q.email,
                       _key: p._key,
                       amount: p.amount,
                       created_at: DATE_FORMAT(p._created, '%dd-%mm-%yyyy'),
                       status: p.status,
                       memberId: p.id
                   }
           `;
    } else {
      query = `for p in wallet_transactions 
                filter p.Remarks =='redeem request' ${filter}
                for q in members filter q._key==p.id 
                sort p._created desc  return {name: q.name,email:q.email,_key:p._key,amount:p.amount,created_at:DATE_FORMAT(p._created, '%dd-%mm-%yyyy'),status:p.status}`;
    }
    console.log(query);
    return new Promise(async function (resolve, reject) {
      await db.query(query, async (data1) => {
        if (data) {
          if (data.id) {
            console.log(data1);
            resolve(data1[0]);
          } else {
            resolve(data1);
          }
        }
      });
    });
  },
  updateRedeemStatus: async (data) => {
    console.log(data);
    let query = ``;
    let now = new Date();
    if (data._key) {
      query = `for p in wallet_transactions filter p._key =='${data._key}' UPDATE p with {status:"${data.status}",_updated:"${now}" } in wallet_transactions
                return p`;
    }

    return new Promise(async function (resolve, reject) {
      console.log(query);
      await db.query(query, async (data) => {
        if (data) {
          resolve(data);
        }
      });
    });
  },
  salonMemSearch: (data) => {
    return new Promise((resolve, reject) => {
      if (data.str) {
        let q = `FOR a in members FILTER LOWER(a.name) LIKE(CONCAT("%${data.str}%"))||LOWER(a.email) LIKE(CONCAT("%${data.str}%"))||LOWER(a.phone) LIKE(CONCAT("%${data.str}%")) RETURN a`;
        db.query(q, (data) => {
          resolve(data);
        });
      } else {
        let q = `FOR a in members RETURN a`;
        db.query(q, (data) => {
          resolve(data);
        });
      }
    });
  },
  saveServiceTasks: async (data) => {
    console.log(`INSERT ${JSON.stringify(data)} INTO service_tasks return NEW`);
    await db.query(
      `INSERT ${JSON.stringify(data)} INTO service_tasks return NEW`,
      (data) => {
        return data;
      }
    );
  },
  memberInquiery:async (body) => {
    return new Promise(async (resolve, reject) => {
      console.log("call Recived");
      console.log(body);
      // resolve(body)
      let q = `INSERT ${JSON.stringify(body)} INTO member_inquiery return NEW`;
      //get admin emails....
    const emailList = await Admins.getAdminEmails();
    console.log(emailList)
     await db.query(q,async (data) =>{
        
        let msg = {
          to: config.email.admin_to,
          subject: "Call Back Requested from "+body.name,
          text:`<p style='text-align:left;'>Dear Admin, </p>
          I hope this email finds you well. A user has submitted their information through the callback form
           on our website. Please take note of the following details and follow up with the user as soon as possible:<br><br>
          Name: ${body.name}
          <br/>
          Email: ${body.email}
          <br/>
          Phone: ${body.phone}
            <br/>
         Message: ${body.message}`,
        };
      await sendMail.sendMail(
        emailList,
          msg.subject,
          msg.text,
          msg.subject,
          "new.ejs"
        );
    
        resolve(data);
      });
     
    });
  },
};

module.exports = members;
