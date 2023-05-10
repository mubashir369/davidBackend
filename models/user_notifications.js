const db = require("../components/arango"),
  collection = db.db.collection("notifications");

const user_notifications = {
  all: (req) => {
    return new Promise(async (resolve, reject) => {
      db.query(
        'FOR n IN notifications FILTER HAS(n, "expiry") && n.expiry != false && n.expiry <= DATE_ISO8601(DATE_NOW()) REMOVE n IN notifications',
        () => {
          db.query(
            'FOR n IN notifications FILTER n.status != "deleted" && n.status != "complete" SORT n._created DESC RETURN n',
            (notifications) => {
              resolve(notifications);
            }
          );
        }
      );
    });
  },
  getAll: async (req) => {
    let start = parseInt(req.start) || 0;
    let limit = parseInt(req.limit) || 10;
    let userId = req.userId || req.customer_id || "";
    console.log("assasas", userId);
    return new Promise(async (resolve, reject) => {
      var query = userId !== "" ? `filter n.data.customer_id=='${userId}'` : "";
      // console.log(`FOR n IN notifications ${query} SORT n._created DESC LIMIT ${start},${limit} RETURN n`)
      await db.query(
        `
                let currentDate1 = DATE_NOW()
                let last7Days1 = DATE_SUBTRACT(currentDate1, 7, "day")
                let last7Days = DATE_TIMESTAMP(last7Days1)
                LET startOfDay = DATE_TRUNC(currentDate1, "day")
                let currentDate=DATE_TIMESTAMP(startOfDay)
                
                let notifications = (
                  FOR n IN notifications
                  FILTER n.data.customer_id == '${userId}'
                    
                  SORT n._created DESC
                  LIMIT 0, 10
                  RETURN n
                )
                return {
                  "today": (FOR n IN notifications FILTER DATE_TIMESTAMP(n._created) >= currentDate RETURN {"msg":n.msg,"created":n._created,"status":n.status}),
                  "last7": (FOR n IN notifications FILTER DATE_TIMESTAMP(n._created) >= last7Days && DATE_TIMESTAMP(n._created) <= currentDate RETURN {"msg":n.msg,"created":n._created,"status":n.status}),
                  "older": (FOR n IN notifications FILTER DATE_TIMESTAMP(n._created)  <last7Days RETURN {"msg":n.msg,"created":n._created,"status":n.status})
                }
                `,
        (notifications) => {
          resolve(notifications);
        }
      );
    });
  },

  checkNew: (req) => {
    return new Promise(async (resolve, reject) => {
      db.query(
        'FOR n IN notifications FILTER n.status == "new" COLLECT WITH COUNT INTO length RETURN length',
        (count) => {
          resolve(count);
        }
      );
    });
  },

  save: (data, req) => {
    return new Promise(function (resolve, reject) {
      if (!data.msg) {
        reject("Please add a message body");
        return;
      }

      if (!data.type) {
        reject("Please add a message subject");
        return;
      }

      if (data._key) {
        if (data.status == "new") {
          data.status = "read";
        }
        data._updated = new Date().toISOString();
        db.query(
          "UPDATE " + JSON.stringify(data) + " IN notifications RETURN NEW",
          (notification) => {
            resolve(notification);
          }
        );
      } else {
        data.status = "new";
        data._created = new Date().toISOString();
        

        if (req && req.session && req.session.user && !data.from) {
          data.from =
            req.session.user.name.first + " " + req.session.user.name.last;
        } else if (!data.from) {
          data.from = "System Notification";
          data.expiry = moment().add(5, "days").toISOString();
        }

        db.query(
          "INSERT " + JSON.stringify(data) + " IN notifications RETURN NEW",
          (notification) => {
            resolve(notification);
          }
        );
      }
    });
  },

  delete: (data, req) => {
    return new Promise(function (resolve, reject) {
      db.query(
        'LET doc = DOCUMENT("notifications/' +
          data._key +
          '") REMOVE doc IN notifications',
        (msg_data) => {
          resolve("done");
        }
      );
    });
  },
};

module.exports = user_notifications;
