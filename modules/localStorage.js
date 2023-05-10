
    const redis = require('redis'),
          redis_client = redis.createClient()

    redis_client.on('connect', function (err, response) {
      'use strict';
    });


    const localStorage = {

        set:(key, data)=>{
            return new Promise(function(resolve, reject){
   
                if (!key || key == 'undefined'){
                    reject('Invalid key')
                } else {
                    redis_client.set(key, JSON.stringify(data), function(err, reply) {
                        if (err){
                            console.log('redis err: ',err)
                            reject(err)
                        } else {
                            resolve(data)
                        }

                    })

                }

            })
        },

        get:(key)=>{

            return new Promise(function(resolve, reject){
                redis_client.get(key, function (error, result) {

                    if (error) {
                        reject(error)
                    } else {
                        resolve(JSON.parse(result))
                    }

                })
            })

        },

        delete:(key)=>{

            return new Promise(function(resolve, reject){
                redis_client.del(key, function (error, result) {

                    if (error) {
                        reject(error)
                    } else {
                        resolve([])
                    }

                })
            })

        },

        list:(prefix, array) => {

            if (!prefix){
                prefix = ''
            }

            let result = {}

            if (array){
                result = []
            }

            return new Promise(function(resolve, reject){

                if (!prefix){
                    prefix = ''
                }

                redis_client.keys(prefix+'*', function(error, keys){

                    if (keys.length == 0){

                        resolve(result)

                    } else {

                        keys.forEach(async (item, i)=>{
                            await redis_client.get(item, function (err, value) {

                                if (array){
                                    result.push(JSON.parse(value))
                                } else {
                                    result[item] = JSON.parse(value)
                                }


                                if (i == keys.length-1){
                                    resolve(result)
                                }

                            })

                        })

                    }

                })

            })

        }

    }


    module.exports = localStorage
