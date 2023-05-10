
    const db = require('../components/arango')

    const contacts = {

        find:(key) => {

            return new Promise(function(resolve, reject){
                db.query('FOR a in contacts FILTER a._key == "'+key+'" RETURN a', (data)=>{

                    if (data.length > 0){
                        resolve(data[0])
                    } else {
                        reject('Not found')
                    }

                })
            })

        },

        all:() => {

            return new Promise(function(resolve, reject){
                db.query('FOR a in contacts RETURN a', (data)=>{

                    resolve(data)

                })
            })

        },

        save:(data) => {

            return new Promise(function(resolve, reject){
                const query=`INSERT ${JSON.stringify(data)} INTO contacts return NEW`
                // db.query('UPSERT {_key:"'+data._key+'"} INSERT '+JSON.stringify(data)+' UPDATE '+JSON.stringify(data)+' IN contacts RETURN NEW', (data)=>{
                db.query(query, (data)=>{

                    if (data.length > 0){
                        resolve(data[0])
                    } else {
                        reject(data)
                    }

                })
            })

        },
        saveNewsLetter:(data) => {
            return new Promise(function(resolve, reject){
                db.query('INSERT '+JSON.stringify(data)+' INTO newsLetters RETURN NEW', (data)=>{

                    if (data.length > 0){
                        resolve(data[0])
                    } else {

                        reject({"msg":"invalid data"})
                        
                    }

                })
            })

        },
        getNewsLetters:  (data) => {
            data=JSON.stringify(data);
            const start=parseInt(data.start) || 0;
            const limit=parseInt(data.limit) || 10;
            var count1 =0;
            return new Promise(function(resolve, reject){
                db.query('FOR a in newsLetters LIMIT '+start+','+limit+' RETURN a', (data)=>{
                    db.query('RETURN LENGTH(newsLetters)', (count)=>{
                     count1=count[0];
                     if (data.length > 0){
                        let p=count1
                        resolve({"count":p,"data":data})
                    } else {

                        reject({"msg":"invalid data"})
                        
                    }
                    })
                    
                })
            })

        }

    }

    module.exports = contacts
