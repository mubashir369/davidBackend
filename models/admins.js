
    const db = require('../components/arango')

    const admins = {

        find:(key) => {

            return new Promise(function(resolve, reject){
                db.query('FOR a in admins FILTER a._key == "'+key+'" RETURN a', (data)=>{

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
                db.query('FOR a in admins RETURN a', (data)=>{

                    resolve(data)

                })
            })

        },

        save:(data) => {

            return new Promise(function(resolve, reject){
                db.query('UPSERT {_key:"'+data._key+'"} INSERT '+JSON.stringify(data)+' UPDATE '+JSON.stringify(data)+' IN admins RETURN NEW', (data)=>{

                    if (data.length > 0){
                        resolve(data[0])
                    } else {
                        reject(data)
                    }

                })
            })

        },

        authenticate:(data) => {

            return new Promise(function(resolve, reject){
                db.query('FOR a in admins FILTER a.email == "'+data.email+'" && a.password == "'+db.hash(data.password)+'" RETURN a', (data)=>{

                    if (data.length > 0){
                        data[0].guard = 'admin'
                        resolve(data[0])
                    } else {
                        reject('Incorrect Email address or password')
                    }

                })
            })

        },

        sendReset:(data) => {

            return new Promise(function(resolve, reject){

                let hash = db.hash('password-reset'+Date.now())

                db.query('FOR a in admins FILTER a.email == "'+data.email+'" UPDATE a WITH {password_reset:"'+hash+'"} IN admins RETURN NEW', (data)=>{

                    if (data.length > 0){

                        let msg = {
                            to: data[0].email,
                            subject: 'Password Reset',
                            text: "Please click the following link to reset your password. Your current password has not been changed, so if you didn't initiate this, you can ignore it. It could mean someone has attempted to access your account however, so please get in contact if you have concerns. "+config.site_url+'/login/admin/'+hash
                        }
                        notification.email(msg)
                        resolve(data[0])

                    } else {
                        reject(data)
                    }

                })
            })

        },

        resetPassword:(data) => {

            return new Promise(function(resolve, reject){

                if (data.password != data.password_conf || !data.password){
                    reject('Mismatching passwords')
                } else {

                    db.query('FOR a in admins FILTER a.email == "'+data.email+'" && a.password_reset == "'+data.hash+'" UPDATE a WITH {password:"'+db.hash(data.password)+'", password_reset:""} IN admins RETURN NEW', (data)=>{

                        if (data.length > 0){

                            resolve(data[0])

                        } else {
                            reject(data)
                        }

                    })

                }

            })

        },
        changePassword:(data) => {

            return new Promise(function(resolve, reject){

                if (data.password != data.password_conf || !data.password){
                    reject('Mismatching passwords')
                } else {

                    db.query('FOR a in admins FILTER a.email == "'+data.email+'"  UPDATE a WITH {password:"'+db.hash(data.password)+'"} IN admins RETURN NEW', (data)=>{

                        if (data.length > 0){

                            resolve(data[0])

                        } else {
                            reject(data)
                        }

                    })

                }

            })

        },
        getAdminEmails:(data) => {

            return new Promise(function(resolve, reject){
                 db.query(`LET staffEmails = (
                        FOR p IN staff
                          FILTER p.role == 'Salon'
                          RETURN p.email
                      )
                      LET adminEmails = (
                        FOR x IN admins
                          RETURN x.email
                      )
                      RETURN UNION_DISTINCT(staffEmails, adminEmails)`, (data)=>{

                        if (data.length > 0){

                            resolve(data[0])

                        } else {
                            resolve(data)
                        }
                    })
            })

        },
    }

    module.exports = admins
