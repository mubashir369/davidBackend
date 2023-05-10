const db = require('../components/arango')

const portfolio = {

    find: (key) => {
        console.log("inside find portfolio");
        //console.log(key)

        if (typeof key == 'object') {
            key = key['id']
        }
        console.log(key)
        return new Promise(function (resolve, reject) {
            db.query('FOR a in members FILTER a._key == "' + key + '" RETURN a', (data) => {

                if (data) {
                    console.log(data[0], "data iniside find")
                    resolve(data)
                } else {
                    //console.log(data)
                    reject('Not found in portfo')
                }

            })
        })

    },

    getSingle: (data) => {
        console.log("inside find portfolio");
        //console.log(key)
        console.log(data)
        return new Promise(function (resolve, reject) {
            db.query(`FOR a in members FILTER a._key == '${data.member_id}' RETURN NTH( a.portfolio, '${data.key}' )`, (data) => {

                if (data.length>0) {                    
                    resolve(data[0])
                } else {
                    //console.log(data)
                    reject('Not found in portfo')
                }

            })
        })

    },
    //INSERT { value: 1 } INTO numbers

    getAll: (key) => {
        console.log("inside getalll portfolio");

        if (typeof key == 'object') {
            key = key['id']  
        }

        return new Promise(function (resolve, reject) {
            db.query('FOR m in members FOR s in salon  FILTER m._key ==  "'+key+'"   FILTER s_key =="54855602" FILTER s.skills.skill_id == m.portfolio.skills.skill_id RETURN MERGE(m,{members:m},{salon:s})', (data) => {

                if (data.length > 0) {
                    console.log(data,"data from getall");
                    resolve(data[0])

                } else {
                    console.log("inside reject");
                    reject('Not found')
                }

            })
        })
    },




    create: (key, data) => {

        console.log("inside create portfolio");
        return new Promise(function (resolve, reject) {
            db.query(`FOR a in members FILTER a._key == '${key}' UPDATE a WITH {portfolio:${JSON.stringify(data)}} IN members RETURN NEW`, (data) => {
                //console.log(data)
                if (data.length > 0) {
                    //console.log(data)
                    resolve(data[0])
                } else {
                    //console.log(data)
                    reject('Not found')
                }
            })
        })

    },
    pushSkill: (key, data) => {
        console.log(data,"ssskillllll immmmmaaaageee0000000000");
        // const query = `FOR doc IN banner FILTER doc.m_id == '${m_id}' UPDATE doc WITH { banner: APPEND(doc.banner,{"heading" : '${data.heading}',"description" : '${data.description}',"image" : '${data.image}'})} IN banner RETURN NEW`
        return new Promise(function (resolve, reject) {
            const query = `FOR a IN members FILTER a._key =='${key}' UPDATE a WITH  {portfolio:APPEND(a.portfolio,{"skill_id" : '${data.skill_id}',"image" : '${data.image}',"title" : '${data.title}',"description":'${data.description}'})} IN members RETURN NEW`

            db.query(query, (data) => {
                console.log(data)
                if (data.length > 0) {
                    resolve(data[0])
                } else {
                    //console.log(data)
                    reject('Not found')
                }
            })
        })

    },
    delete: (data) => {
        console.log(data,"deldataa");

        return new Promise(function (resolve, reject) {
            const query = `FOR a IN members FILTER a._key =='${data.member_id}' UPDATE a WITH  {portfolio:REMOVE_NTH(a.portfolio,'${data.key}')} IN members RETURN NEW`

            db.query(query, (data) => {
                console.log(data)
                if (data.length > 0) {
                    resolve(data[0])
                } else {
                    //console.log(data)
                    reject('Not found')
                }
            })
        })



    },
    update: (data) => {
        console.log(data,"update");

        data.key = data.key?data.key:0

        return new Promise(function (resolve, reject) {

            db.query(`FOR a in members FILTER a._key == '${data.member_id}' RETURN a.portfolio`, (portdata) => {

                if (portdata.length>0 && portdata[0].length>0) {  

                    portdata = portdata[0]                 

                    portdata[data.key] = {"skill_id" : data.skill_id,"image" : data.image,"title" : data.title,"description":data.description}
                    //console.log(portdata)
                    //return;
                    const query = `FOR a IN members FILTER a._key =='${data.member_id}' UPDATE a WITH  {portfolio:${JSON.stringify(portdata)}} IN members RETURN NEW`
                    //console.log(query)
                    db.query(query, (data) => {
                        //console.log(data)
                        if (data.length > 0) {
                            resolve(data[0])
                        } else {
                            //console.log(data)
                            reject('Not found')
                        }
                    })
                }
            })
        })


    }
}

module.exports = portfolio;