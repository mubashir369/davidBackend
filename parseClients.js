const csv = require('csv-parser');
const fs = require('fs');
const moment = require('moment');
const arango = require('arangojs')

var Database = arango.Database,
    db = new Database('http://127.0.0.1:8529')

    db.useDatabase('salonstream');
    db.useBasicAuth('claysixamnine', 'becomingCOMPLETEc@stleM1LK');
    var collection = db.collection('appointments')



const read = async () => {

    let appts = await collection.all()

    for (let i of appts._result){
        if (i.log && i.log.length > 0){
            for (let ii of i.log){
                if (ii.log == 'Customer confirmed with deposit'){
                    ii.log = 'Client accepted terms and conditions and confirmed appointment'
                }
            }

        }
    }

}

read()
