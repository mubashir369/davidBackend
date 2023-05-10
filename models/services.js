
    const db = require('../components/arango'),
          collection = db.db.collection('services'),
          salon_data = require('../models/salon')

    const services = {

        find:(key) => {

            return new Promise(function(resolve, reject){
                db.query('FOR s in services FILTER s._key == "'+key+'" RETURN s', (data)=>{

                    if (data.length > 0){
                        resolve(data)
                    } else {
                        reject('Service '+key+' Not found')
                    }

                })
            })

        },

        findbyarray:(key) => {

            console.log(key)

            filter_str = "FILTER "

            if(Array.isArray(key)) key['ids'] = key

            if(Array.isArray(key['ids']) && key['ids'].length>0){

                    key['ids'].forEach(function (item, index) {
                        console.log(item,index)
                        if(index==0)
                         filter_str += '( s._key == "'+item+'"'
                        else
                         filter_str += ' || s._key == "'+item+'"'
                    })

                    filter_str += ' )'
                }



            return new Promise(function(resolve, reject){
                db.query('FOR s in services '+filter_str+' RETURN s', (data)=>{

                    console.log(data)

                    if (data.length > 0){
                        resolve(data)
                    } else {
                        reject('Service '+key['ids']+' Not found')
                    }

                })
            })

        },

        getservices:(key) => {

            console.log(key)

            filter_str = "FILTER "

            if(Array.isArray(key)) key['ids'] = key

            if(Array.isArray(key['ids']) && key['ids'].length>0){

                    key['ids'].forEach(function (item, index) {
                        console.log(item,index)
                        if(index==0)
                         filter_str += '( s._key == "'+item+'"'
                        else
                         filter_str += ' || s._key == "'+item+'"'
                    })

                    filter_str += ' )'
                }



            return new Promise(function(resolve, reject){
                db.query('FOR s in services '+filter_str+' RETURN s', (data)=>{

                    console.log(data)

                    if (data.length > 0){
                        resolve(data)
                    } else {
                        reject('Service '+key['ids']+' Not found')
                    }

                })
            })

        },

        all:(key) => {

            return new Promise(function(resolve, reject){
                db.query('FOR s in services FILTER s.salon_id == "54855602" && !s._deleted SORT s.name ASC RETURN s', (data)=>{

                    if (data.length > 0){
                        resolve(data)
                    } else {
                        reject('Services Not found')
                    }

                })
            })

        },
        all2:(key) => {

            return new Promise(function(resolve, reject){
                db.query('FOR s in services FILTER s.salon_id == "54855602" && !s._deleted SORT s.name ASC RETURN {_key:s._key,name:s.name}', (data)=>{

                    if (data.length > 0){
                        resolve(data)
                    } else {
                        reject('Services Not found')
                    }

                })
            })

        },

        search:(search)=>{

            let filter = ''

            return new Promise(function(resolve, reject){

                filter = 'LOWER(s.name) =~ "'+search.str+'" && !s._deleted || LOWER(s.gender) == "'+search.str+'" && !s._deleted'

                if (search.str.length > 2){

                    salon.get('categories').then((categories)=>{

                        let re = RegExp(search.str,"i")
                        let cat_id = categories.findIndex((cat,i)=>{
                            return cat.name.match(re)
                        })

                        if (cat_id >= 0){
                            filter += ' || s.category == "'+cat_id+'" && !s._deleted'
                        }

                        db.query('FOR s in services FILTER '+filter+' RETURN s', (data)=>{
                            resolve(data)
                        })
                    })

                } else {
                    db.query('FOR s in services RETURN s', (data)=>{
                        resolve(data)
                    })
                }
            })

        },

        save:(data) => {

            data.salon_id = "54855602"

            console.log('servicedata')

            if (!data.service_items || data.service_items.length == 0){

                if (!data.duration){
                    data.duration = 45
                }

                data.service_items = [
                    {
                        "name": data.name,
                        "duration": data.duration,
                        "skills": "",
                        "wait_time": "",
                        "split": 100
                    }
                ]

            }

            data.duration = 0

            data.service_items = data.service_items.map((item)=>{
                data.duration = data.duration + parseInt(item.duration)

                if (item.wait_time){
                    data.duration = data.duration + parseInt(item.wait_time)
                }
                return item
            })

            return new Promise(function(resolve, reject){
                db.query('UPSERT {_key:"'+data._key+'"} INSERT '+JSON.stringify(data)+' UPDATE '+JSON.stringify(data)+' IN services RETURN NEW', (data)=>{

                    if (data.length > 0){
                        resolve(data[0])
                    } else {
                        reject(data)
                    }

                })
            })

        },

        delete:(key) => {

            return new Promise(function(resolve, reject){

                db.query('FOR s in services FILTER s._key == "'+key+'" UPDATE s WITH {_deleted:"'+moment().toISOString()+'"} IN services RETURN s', (data)=>{

                    if (data.length > 0){
                        resolve(data)
                    } else {
                        reject('Unable to delete Service '+key+': Not found')
                    }

                })

            })

        },

        filter:(filter)=>{

            return new Promise( async (resolve, reject) => {

                if (!filter || typeof filter != 'object'){
                    resolve([])
                    return
                }

                let filter_str = 'LOWER(s.'+filter.field+') == "'+filter.value+'"'

                if (!filter.value || filter.value && filter.value == 'none'){
                    filter_str = '!HAS(s, "'+filter.field+'") || s.'+filter.field+' == ""'
                }

                db.query('FOR s IN services FILTER '+filter_str+' RETURN s', (data)=>{

                    if (data.length > 0){
                        resolve(data)
                    } else {
                        reject('No filter options found')
                    }

                })

            })

        },
        getServiceCategories:async (filter)=>{

            return new Promise( async (resolve, reject) => {
               await db.query(`for p in salon filter p._key=='54855602' return p.categories`, (data)=>{

                    if (data.length > 0){
                        resolve(data[0])
                    } else {
                       resolve([])
                    }

                })

            })

        },
        getMemberServices :async (filter)=>{
            return new Promise( async (resolve, reject) => {
                console.log(`FOR m IN members
                FILTER m._key == '${filter.id}'
                LET services = (
                  FOR s IN services
                    FILTER s._key IN m.mem_services
                    LET tasks = (
                      FOR st IN service_tasks
                        FILTER st.service_id == s._key
                        FILTER st.member_id == m._key
                        RETURN st
                    )
                    RETURN MERGE(s, { service_tasks: tasks })
                )
                RETURN services
               `)
               await db.query(`FOR m IN members
               FILTER m._key == '${filter.id}'
               LET services = (
                 FOR s IN services
                   FILTER s._key IN m.mem_services
                   LET tasks = (
                     FOR st IN service_tasks
                       FILTER st.service_id == s._key
                       FILTER st.member_id == m._key
                       RETURN st
                   )
                   RETURN MERGE(s, { service_tasks: tasks[0] })
               )
               RETURN services
              `, (data)=>{

                    if (data.length > 0){
                        resolve(data[0])
                    } else {
                       resolve([])
                    }

                })

            })

        },
        getMemberServiceAndCategory :async (filter)=>{
            var today = new Date();
            var year = today.getFullYear();
            var month = today.getMonth() + 1;
            var day = today.getDate();

            month = (month < 10) ? "0" + month : month;
            day = (day < 10) ? "0" + day : day;

            var dateString = "date_" + year + month + day;
            const data1=[]
            return new Promise( async (resolve, reject) => {
                console.log(`FOR member IN members
                filter member._key=='${filter.id}'
                  let services = (FOR service IN services
                    FILTER  service._key IN member.mem_services return {_key:service._key,name:service.name,category:service.category})
                let categories = (for s in salon filter s._key=='54855602' return s.categories )
                 RETURN { member_id: member._key, services: services,categories:categories,prices:member.services_price }`)
               await db.query(`FOR member IN members
               filter member._key=='${filter.id}'
                 let services = (FOR service IN services
                   FILTER  service._key IN member.mem_services return {_key:service._key,name:service.name,category:service.category})
               let categories = (for s in salon filter s._key=='54855602' return s.categories )
               
                   RETURN { member_id: member._key, services: services,categories:categories,prices:member.services_price }`, (data)=>{

                    if (data.length > 0){
                        var service_task=[];
                        db.query(`for m in members filter m._key=='${filter.id}' 
                        let service_tasks = (for p in service_tasks filter p.member_id=='${filter.id}' and p.service_id in m.mem_services  return {data:p.service_tasks.service_items,service_Id:p.service_id})
                        return service_tasks`,async (data) => {
                           if(data){

                             service_task = data[0].map(({ data, service_Id }) => ({
                                
                                serviceId: service_Id,
                                totalDuration: data.reduce((acc, { duration, wait_time }) => acc + parseInt(duration) + parseInt(wait_time), 0)
                              }));
                              
                            }
                        })
                        db.query(`FOR a IN slots
                        FILTER  a.member_data == '${filter.id}'
                        LET keys = (FOR k IN ATTRIBUTES(a) FILTER k =~ "^date_[0-9]+$"  and k > "${dateString}" RETURN SUBSTRING(k,5))
                        RETURN keys`, async (data2)=>{
                        if(data2){
                        data2[0].forEach( async (item)=>{
                            const input = item;
                            const year = input.substring(0, 4);
                            const month = input.substring(4, 6);
                            const day = input.substring(6, 8);
                            const output = year + "-" + month + "-" + day;
                            data1.push(output);

                        })
                        data.selected_dates= data1
                        resolve({"data":data[0],"seats":data1,"serviceTimes":service_task})
                    }
                    else{
                        resolve([])
                    }
                })
                
            
                    }

                })

            })

        },
        getServiceByCategory:(filter)=>{
            var qr='';
            console.log(filter.category)
            if(filter.category ){
        const str = JSON.stringify(filter.category)
         qr = filter.category && filter.category.length?` filter p.category in  ${str}`:'';
        }
        console.log(`for p in services ${qr} return {"name":p.name,"_key":p._key}`)
            return new Promise( async (resolve, reject) => {
                db.query(`for p in services ${qr} return {"name":p.name,"_key":p._key}`, (data)=>{

                    if (data.length > 0){
                        resolve(data)
                    } else {
                       resolve([])
                    }

                })

            })

        },
        getMembersWithServiceCat: async (data) => {
            console.log(data)
            if(data.category){
                var str = JSON.stringify(data.category)
            // const service=data.service.split(',')
            // let arr=[];
            // service.forEach(async (item,i)=>{
            //     arr.push(`"${item}"`)
            // })
            }
            // console.log(arr)
            return new Promise(function(resolve, reject){
                console.log(`FOR member IN members
                FILTER LENGTH(
                    FOR serviceId IN member.mem_services
                        FOR service IN services
                            FILTER service._key == serviceId
                            FILTER service.category IN ${str}
                            RETURN service
                ) > 0
                LIMIT 12
                LET service = (for s in services filter s._key==FIRST(member.mem_services) return s.name)
                RETURN {
                    name: member.name,
                    email: member.email,
                    about: member.about,
                    tagline: member.tagline,
                    _key: member._key,
                    avatar: member.avatar,
                    mem_services: member.mem_services,
                    experience:service
                }
            `)
                db.query(`FOR member IN members
                FILTER LENGTH(
                    FOR serviceId IN member.mem_services
                        FOR service IN services
                            FILTER service._key == serviceId
                            FILTER service.category IN ${str}
                            RETURN service
                ) > 0
                LIMIT 12
                LET service = (for s in services filter s._key==FIRST(member.mem_services) return s.name)
                RETURN {
                    name: member.name,
                    email: member.email,
                    about: member.about,
                    tagline: member.tagline,
                    _key: member._key,
                    avatar: member.avatar,
                    mem_services: member.mem_services,
                    experience:service
                }
            `, (data)=>{
                        
                     if (data){
                        resolve(data)
                     }
                    })
                })
        
        },
        getMemberByService:(filter)=>{
            const page=parseInt(filter.page) || 0;
            if(filter.service){
                var str = JSON.stringify(filter.service)
                str= ` ${str} ANY IN doc.mem_services AND`
            }
            const serviceId=filter.service;
        console.log(`FOR doc IN members
                FILTER ${str} doc.active limit ${page}, 10
                LET service = (for s in services filter s._key==FIRST(doc.mem_services) return s.name)
                RETURN {"name":doc.name,"_key":doc._key,"rating":doc.rating,"email":doc.email,"avatar":doc.avatar,"experience":service}
                `)
            return new Promise( async (resolve, reject) => {
                db.query(`FOR doc IN members
                FILTER ${str} doc.active limit ${page}, 10
                LET service = (for s in services filter s._key==FIRST(doc.mem_services) return s.name)
                RETURN {"name":doc.name,"_key":doc._key,"rating":doc.rating,"email":doc.email,"avatar":doc.avatar,"experience":service}
                `, (data)=>{

                    if (data.length > 0){
                        resolve(data)
                    } else {
                       resolve([])
                    }

                })

            })

        },

        getFilters:(type) => {

            return new Promise( async (resolve, reject) => {

                if (type == 'init'){

                    resolve([
                        {value:'public', text:'Online'},
                        {value:'category', text:'Category'},
                        {value:'gender', text:'Gender'}
                    ])

                } else {

                    db.query('FOR s IN services COLLECT type = LOWER(s.'+type+') WITH COUNT INTO length RETURN {"type" : type, "value" : type, "count" : length}', async (data)=>{

                        if (data.length > 0){

                            if (type == 'category'){

                                let salon = await salon_data.find('54855602')

                                data = data.map((filter)=>{

                                    if (parseInt(filter.type) && parseInt(filter.type) >= 0){

                                        filter.type = salon.categories.find((cat)=>{
                                            return cat._id == filter.type
                                        })

                                        if (filter.type && filter.type.name){
                                            filter.value = filter.type._id
                                            filter.type = filter.type.name
                                        }

                                    } else {

                                        if (type == 'gender'){
                                            filter.type = 'both'
                                        } else {
                                            filter.type = 'none'
                                        }
                                        
                                    }

                                    return filter

                                })

                                resolve(data)

                            } else {
                                resolve(data)
                            }



                        } else {
                            reject('No filter options found')
                        }

                    })

                }

            })

        },


    }

    module.exports = services
