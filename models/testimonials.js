const db = require("../components/arango"),
  salon_data = require("../models/salon"),
  collection = db.db.collection("testimonials");

const testimonial = {
  find: (key) => {
    return new Promise(function (resolve, reject) {
      db.query(
        'FOR p in testimonials FILTER p._key == "' + key + '" RETURN p',
        (data) => {
          if (data.length > 0) {
            resolve(data);
          } else {
            reject("testimonial " + key + " Not found");
          }
        }
      );
    });
  },

  all: () => {
    return new Promise(function (resolve, reject) {
      db.query(
        "FOR p in testimonials FILTER !p._deleted SORT p._updated DESC LIMIT 60 RETURN p",
        (data) => {
          if (data.length > 0) {
            resolve(data);
          } else {
            reject("testimonials Not found");
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
        "FOR p in testimonials FILTER p.stock > 0 && !p.private && !p._deleted " +
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

    return new Promise(function (resolve, reject) {
      if (data.image && data.image.match(/^data:image\//) && data.name) {
        if (!data.brand) {
          data.brand = "";
        }

        image
          .save(data.image, data.name + "-" + data.brand, "testimonials")
          .then((filename) => {
            data.image = filename;

            db.query(
              'UPSERT {_key:"' +
                data._key +
                '"} INSERT ' +
                JSON.stringify(data) +
                " UPDATE " +
                JSON.stringify(data) +
                " IN testimonials RETURN NEW",
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
            " IN testimonials RETURN NEW",
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

  search: (search) => {
    let filter = "";

    return new Promise(function (resolve, reject) {
      if (search.str) {
        // filter = 'p._key == "'+search.str+'" && !p._deleted || p.barcode == "'+search.str+'" && !p._deleted || LOWER(p.brand) =~ "'+search.str+'" && !p._deleted || LOWER(p.name) =~ "'+search.str+'" && !p._deleted || LOWER(p.description) =~ "'+search.str+'" && !p._deleted || LOWER(p.category) =~ "'+search.str+'"&& !p._deleted '

        filter = `!p._deleted && LOWER(p._key) LIKE LOWER(CONCAT("%${search.str}%")) ||!p._deleted &&  LOWER(p.name) LIKE LOWER(CONCAT("%${search.str}%"))||!p._deleted &&  LOWER(p.location) LIKE LOWER(CONCAT("%${search.str}%"))`;

        db.query(
          "FOR p in testimonials FILTER " + filter + " RETURN p",
          (data) => {
            resolve(data);
          }
        );
      } else {
        let q = `FOR p in testimonials FILTER !p._deleted SORT p._updated DESC LIMIT 60 RETURN p`;
        db.query(q, (data) => {
          resolve(data);
        });
      }
    });
  },

  delete: (key) => {
    return new Promise(function (resolve, reject) {
      db.query(
        'FOR p IN testimonials FILTER p._key == "' +
          key +
          '" UPDATE p WITH {_deleted:"' +
          moment().toISOString() +
          '"} IN testimonials RETURN p',
        (data) => {
          if (data.length > 0) {
            resolve(data);
          } else {
            reject("Unable to delete testimonial " + key + ": Not found");
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

      let filter_str =
        "LOWER(p." + filter.field + ') == "' + filter.value + '"';

      if (!filter.value || (filter.value && filter.value == "none")) {
        filter_str =
          '!HAS(p, "' + filter.field + '") || p.' + filter.field + ' == ""';
      }

      db.query(
        "FOR p IN testimonials FILTER " + filter_str + " RETURN p",
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

  getFilters: (type) => {
    return new Promise(async (resolve, reject) => {
      if (type == "init") {
        resolve([
          { value: "brand", text: "Brand" },
          { value: "category", text: "Category" },
        ]);
      } else {
        db.query(
          "FOR p IN testimonials COLLECT type = LOWER(p." +
            type +
            ') WITH COUNT INTO length RETURN {"type" : type, "value" : type, "count" : length}',
          async (data) => {
            if (data.length > 0) {
              if (type == "category") {
                let salon = await salon_data.find("54855602");

                data = data.map((filter) => {
                  if (parseInt(filter.type) && parseInt(filter.type) >= 0) {
                    filter.type = salon.testimonial_categories.find((cat) => {
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
              reject("No filter options found");
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
        'LET testimonial = DOCUMENT("testimonials/' +
          key +
          '") UPDATE testimonial WITH { stock: testimonial.stock + ' +
          val +
          " } IN testimonials RETURN NEW",
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
        'FOR p IN testimonials FILTER p._key == "' +
          data._key +
          '" UPDATE p WITH { on_order: ' +
          data.value +
          " } IN testimonials RETURN NEW",
        (prod_data) => {
          resolve(prod_data);
        }
      );
    });
  },
};

module.exports = testimonial;
