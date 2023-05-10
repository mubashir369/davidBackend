//
// ArangoDB Connector
// Connects to ArangoDB service
//


// vars

const arango = require('arangojs'),
      sha2_256 = require('simple-js-sha2-256')


// connection

var Database = arango.Database,
    aql = arango.aql,
    db = new Database(config.db.host)

    db.useDatabase(config.db.database);
    db.useBasicAuth(config.db.username, config.db.password);


// methods

    functions = {

        query:(query, callback)=>{
     
          
            db.query(query).then(
                cursor => cursor.all()
            ).then(
                (keys) => {
                        if (typeof callback == 'function'){
                          
                            callback(keys)
                        }
                    },
                (err) => {
                 
                    if (typeof callback == 'function'){
                        callback(err)
                    }

            })

        },

        hash:(str)=>{
            return sha2_256(str)
        }

    }

    module.exports = functions
    module.exports.db = db
    module.exports.aql = aql
