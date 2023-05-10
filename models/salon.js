
    const db = require('../components/arango'),
          collection = db.db.collection('salon'),
        sendMail=require("../modules/sendMail")

    const salon = {

        find:(key) => {

            return new Promise(function(resolve, reject){
                db.query('FOR s IN salon FILTER s._key == "'+key+'" RETURN s', async (data)=>{

                    if (data.length > 0){
                        data[0].monthly_opening_times = await salon.monthOpeningTimes(moment().toISOString())
                        resolve(data[0])
                    } else {
                        reject('Salon '+key+' Not found')
                    }

                })
            })

        },

        delete:(key) => {

            return new Promise(function(resolve, reject){

                collection.remove(key).then(
                    () => {resolve('deleted')},
                    err => {reject(err)}
                );

            })

        },

        search:(search)=>{

            let filter = '', search_length = 0

            return new Promise(function(resolve, reject){

                for (let i in search){
                    if (search_length < search[i].length){
                        search_length = search[i].length
                    }
                    filter += 'LOWER(c.'+i+') =~ "'+search[i]+'"'
                }

                if (search_length > 2){
                    db.query('FOR s in salon FILTER s.salon == "54855602" && '+filter+' RETURN s', (data)=>{
                        resolve(data)
                    })
                } else {
                    resolve([])
                }
            })

        },

        isOpen: (date) => {

            return new Promise( async (resolve, reject) => {

                // let salon_data = await collection.document('54855602'),
                //     day_num = moment(date).format('d')
                //
                // if (salon_data.opening_times && salon_data.opening_times[day_num]){
                //     if (salon_data.opening_times[day_num].open == 'undefined' && salon_data.opening_times[day_num].close == 'closed' || salon_data.opening_times[day_num].open == 'closed' && salon_data.opening_times[day_num].close == 'closed'){
                //         resolve(false)
                //     } else {
                //         resolve(salon_data.opening_times[day_num])
                //     }
                //
                // }

                db.query('FOR a IN appointments FILTER DATE_COMPARE(a.date,"'+date+'","years","days") && a.description == "available" RETURN a', async (appt_data) => {

                    if (appt_data && appt_data.length > 0){

                        let payload = {open:moment(appt_data[0].date).format('HH:mm'),close:moment(appt_data[0].end_date).format('HH:mm')}
                        if (appt_data[0].note){
                            payload.note = appt_data[0].note
                        }
                        resolve(payload)
                    } else {
                        let payload = {open:false,close:false}
                        resolve(payload)
                    }

                })

            })

        },

        monthOpeningTimes:(date) => {

            return new Promise( async (resolve, reject) => {

                if (typeof date == 'object' && date.date){
                    date = date.date
                }

                db.query('FOR a IN appointments FILTER DATE_COMPARE(a.date,"'+date+'","years","months") && a.description == "available" RETURN a', async (appt_data) => {

                    if (appt_data && appt_data.length > 0){

                        let days = {}

                        for (var appt of appt_data){

                            let day_key = 'day_'+moment(appt.date).format('D'),
                                open = moment(appt.date).format('HH:mm'),
                                close = moment(appt.end_date).format('HH:mm'),
                                open_chk = parseInt(open.replace(':','')),
                                close_chk = parseInt(close.replace(':',''))

                            if (!days[day_key]){
                                days[day_key] = {
                                    open: open,
                                    close: close,
                                    open_chk: open_chk,
                                    close_chk: close_chk,
                                }
                            } else {

                                if (open_chk < days[day_key].open_chk){
                                    days[day_key].open_chk = open_chk
                                    days[day_key].open = open
                                }

                                if (close_chk > days[day_key].close_chk){
                                    days[day_key].close_chk = close_chk
                                    days[day_key].close = close
                                }

                            }

                        }

                        resolve(days)

                    } else {
                        let days = {}
                        resolve(days)
                    }

                })

            })

        },

        save:(data) => {

            data.salon_id = "54855602"

            return new Promise(function(resolve, reject){
                db.query('UPSERT {_key:"'+data._key+'"} INSERT '+JSON.stringify(data)+' UPDATE '+JSON.stringify(data)+' IN salon RETURN NEW', (data)=>{

                    if (data.length > 0){
                        resolve(data[0])
                    } else {
                        reject(data)
                    }

                })
            })

        },


        appointments:() => {

            return new Promise(function(resolve, reject){
                db.query('FOR a in appointments FOR c in customers FOR s in staff FILTER a.customer_id == c._key && s._key == a.staff_id && a.status != "deleted" RETURN MERGE(a,{customer:c},{staff:s})', (data)=>{
                    if (data.length > 0){
                        resolve(data)
                    } else {
                        reject()
                    }
                })
            })

        },

        get:(type) => {

            return new Promise(function(resolve, reject){
                db.query('LET s = DOCUMENT("salon/54855602") RETURN s.'+type, (data)=>{

                    if (data.length > 0){
                        resolve(data[0])
                    } else {
                        reject('Not found')
                    }

                })
            })

        },
      
        getBasicDetail:(type) => {

            return new Promise(function(resolve, reject){
                db.query(`LET s = DOCUMENT("salon/54855602") RETURN {"address":s.address,"opening_times":s.opening_times,"email":s.email,"tel":s.tel,"email2":s.email,"tel2":s.tel2}`, (data)=>{

                    if (data.length > 0){
                        resolve(data[0])
                    } else {
                        reject('Not found')
                    }

                })
            })

        },

        chgstatus:(data) => {
            console.log('chgstatus',data._key,data.order_status)
            return new Promise(function(resolve, reject){
                let processing='';
                if(data.reason){
                    processing+=`,reason:"${data.reason}"`;
                }
                console.log(`for c in transactions filter c._key=="${data._key}" UPDATE c WITH {order_status: "${data.order_status}"${processing}} IN transactions RETURN NEW`)
                db.query(`for c in transactions filter c._key=="${data._key}" UPDATE c WITH {order_status: "${data.order_status}"${processing} }IN transactions RETURN NEW`, (data2)=>{
                    // console.log(data2)
                    if(data2 && data2.length>0){

                    db.query('FOR p in customers FILTER p._key == "'+data2[0].customer_id+'" || p._key == '+data2[0].customer_id+' RETURN p', (cust)=>{

                        // send mail for status update to customer..
                        
                            
                        let msg = {
                            to: cust[0].email,
                            subject: 'Product Order Status Update',
                             text:`Your Order ${data2[0].transaction_id} status is Changed to ${data2[0].order_status}`
                        }
                        // notification.email(msg)
                        sendMail.sendMail(msg.to,msg.subject,msg.text,msg.subject, "new.ejs")
                    // send notification to admin..
                     let msg2 = {
                        to: config.email.admin_to,
                        subject: 'Order Status Update',
                        text:`Order ${data2[0].transaction_id} status is Changed to ${data2[0].order_status}`
                    }
                    // notification.email(msg2)
                    sendMail.sendMail(msg2.to,msg.subject,msg.text,msg.subject, "new.ejs")
                        resolve(data2)
                            
                    });
                    }
                    else{
                        resolve([])
                    }   

                })
            })

        },

    }

    module.exports = salon
