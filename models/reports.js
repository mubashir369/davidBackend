
    const db = require('../components/arango'),
          aql = db.aql,
          collection = db.db.collection('reports'),
          product = require('./products'),
          services = require('./services'),
          appointments = require('./appointments'),
          staff = require('./staff')

    const reports = {

        find:(key) => {

            return new Promise(function(resolve, reject){
                db.query('FOR t in transactions FILTER t._key == "'+key+'" RETURN t', (data)=>{

                    if (data.length > 0){
                        resolve(data[0])
                    } else {
                        reject('Report '+key+' Not found')
                    }

                })
            })

        },

        cashOutHistorical:(query) => {

            return new Promise(function(resolve, reject) {

                if (query.key){

                    db.query('FOR r IN reports FILTER r.meta.name == "cash_out" && r._key == "'+query.key+'" RETURN r', (data)=>{
                        localStorage.set('report_results', data)
                        resolve(data)
                    })

                } else {

                    db.query('FOR r IN reports FILTER r.meta.name == "cash_out" RETURN {_key:r._key,_created:r._created, transactions:COUNT(r.transactions)}', (data)=>{
                        localStorage.set('report_results', data)
                        resolve(data)
                    })

                }

            })

        },

        cashOutHistoricalRange:(query) => {

            return new Promise(async (resolve, reject) => {

                let schema = {
                        meta: {
                            from:'Please select',
                            to: 'Please select',
                            start:'',
                            end:'',
                            name:'month_end'
                        }
                    }

                if (query.schema){

                    resolve(schema)

                } else {
   
                    if (query.from && query.to){

                        db.query('FOR r IN reports FILTER r.meta.name == "cash_out" && r._created >= DATE_ISO8601("'+query.from+'") && r._created <= DATE_ISO8601("'+query.to+'") RETURN {totals:r.totals, date:r._created}', (data)=>{
  
                            let arr = ["date","new_float","cash_opening_float","cash_closing_float","card_total_entered","card_tips","card_total","card_total_calculated","card_total_difference","cash_total","cash_total_calculated","cash_total_difference","bacs_total","stripe_total","bank","petty_cash_in_total","petty_cash_out_total","account_spent","vouchers_spent","account_sub_total","account_tax","account_total","vouchers_sub_total","vouchers_tax","vouchers_total","service_count","service_sub_total","service_tax","service_total","products_count","products_sub_total","products_tax","products_total","transactions_sub_total","transactions_tax","transactions_total"]
// cash_closing_float - end of day cash
                            let csv = ''

                            arr.map((arr_item)=>{

                                let str = arr_item.replace(/\_/g,' ')

                                if (arr_item == 'cash_closing_float'){
                                    str = 'End of day cash'
                                }

                                csv += '"'+str.charAt(0).toUpperCase() + str.slice(1)+'",'

                            })
    
                            csv = csv.replace(/\,$/,'')+'\r\n'

                            if (data && data.length > 0){

                                data.forEach((item, i)=>{

                                    // csv += '"'+moment(item.date).format("DD/MM/YYYY HH:mm")+'","'+item.totals.new_float+'","'+item.totals.cash_opening_float+'","'+item.totals.cash_closing_float+'","'+item.totals.card_total_entered+'","'+item.totals.card_tips+'","'+item.totals.card_total+'","'+item.totals.card_total_calculated+'","'+item.totals.card_total_difference+'","'+item.totals.cash_total+'","'+item.totals.cash_total_calculated+'","'+item.totals.cash_total_difference+'","'+item.totals.bacs_total+'","'+item.totals.stripe_total+'","'+item.totals.bank+'","'+item.totals.petty_cash_in_total+'","'+item.totals.petty_cash_out_total+'","'+item.totals.account_spent+'","'+item.totals.vouchers_spent+'","'+item.totals.new_float+'","'+item.totals.new_float+'","'+item.totals.new_float+'","'+item.totals.new_float+'","'+item.totals.new_float+'","'+item.totals.new_float+'","'+item.totals.new_float+'","'+item.totals.new_float+'","'+item.totals.new_float+'","'+item.totals.new_float+'","'+item.totals.new_float+'","'+item.totals.new_float+'","'+item.totals.new_float+'","'+item.totals.new_float+'","'+item.totals.new_float+'","'+item.totals.new_float+'","'+item.totals.new_float+'","'+item.totals.new_float+'"\r\n'
                                    //
    
                                    arr.map((arr_item)=>{
    
                                        if (arr_item == 'date'){
                                            csv += '"'+moment(item.date).format("DD/MM/YYYY HH:mm")+'",'
                                        } else {
                                            if (!isNaN(item.totals[arr_item]) &&  item.totals[arr_item] % 1 != 0){
                                                item.totals[arr_item] = parseFloat(item.totals[arr_item]).toFixed(2)
                                            }
                                            csv += '"'+item.totals[arr_item]+'",'
                                        }
    
                                    })
    
                                    csv = csv.replace(/\,$/,'')+'\r\n'
    
                                    if (i >= data.length-1){

                                        reports.saveDocument('cash_out_historical.csv',csv).then((output)=>{
                                            resolve(output)
                                        }).catch((err)=>{
                                            reject(err)
                                        })
    
                                    }
    
                                })

                            } else {
                                reject('No data found')
                            }
                            
                        })

                    }

                }

            })

        },

        cashOut:(query) => {

            return new Promise(function(resolve, reject){

                let schema = {
                        id:'',
                        totals: {
                            transactions_total:0,
                            transactions_tax:0,
                            transactions_sub_total:0,
                            card_total_entered:0,
                            stripe_total: 0,
                            bacs_total: 0,
                            card_total: 0,
                            cash_total: 0,
                            card_tips:0,
                            cash_closing_float:0,
                            cash_opening_float:0,
                            petty_cash_in_total: 0,
                            petty_cash_out_total: 0,
                            service_total: 0,
                            service_sub_total: 0,
                            service_tax: 0,
                            account_total:0,
                            vouchers_total: 0,
                            vouchers_sub_total: 0,
                            vouchers_tax: 0,
                            products_total: 0,
                            products_sub_total: 0,
                            products_tax: 0,
                            account_spent:0,
                            vouchers_spent:0,
                            new_float:0
                        },
                        meta: {
                            start:'',
                            end: '',
                            name:'cash_out'
                        },
                        inputs:[
                            {
                                field:'cash_opening_float',
                                value:'',
                                description:'Start float (leave blank to get from last report)'
                            },
                            {
                                field:'cash_closing_float',
                                value:'',
                                description:'Cash'
                            },
                            {
                                field:'card_total_entered',
                                value:'',
                                description:'Card total inc. tips'
                            },
                            {
                                field:'new_float',
                                value:'',
                                description:"Tomorrow's float"
                            },
                            {
                                field:'card_tips',
                                value:'',
                                description:'Card tips'
                            }
                        ]
                    }

                if (query.schema){

                    resolve(schema)

                } else {

                    db.query('LET transactions = (FOR t IN transactions FILTER !t.processed && t.status == "complete" SORT t._created ASC RETURN t) LET prev_report = (FOR r IN reports FILTER r.meta.name == "cash_out" SORT r._created DESC LIMIT 1 RETURN r) RETURN {transactions:transactions, prev_report:prev_report}', (data)=>{

                        if (data && data[0].transactions.length > 0){


                            schema.meta.start = data[0].transactions[0]._created
                            schema.meta.end = data[0].transactions[data[0].transactions.length-1]._created
                            schema.id = moment(schema.meta.start).format('X')

                            if (query){
                                for (var i in query){
                                    schema.totals[i] = parseFloat(query[i].replace(/[£$]/g,''))
                                }
                            }

                            if (!schema.totals.cash_opening_float){
                                schema.totals.cash_opening_float = data[0].prev_report[0].totals.new_float
                            }

                            data[0].transactions.forEach((transaction, idx1, array1) => {

                                let methods = ['cash','card','stripe','bacs','petty_cash','split']

                                for (var i in methods){

                                    if (transaction.method == methods[i]){

                                        if (methods[i] == 'split'){

                                            if (!schema.totals['cash_total']){
                                                schema.totals['cash_total'] = 0
                                            }

                                            schema.totals['cash_total'] += parseFloat(transaction.payment.cash)

                                            if (!schema.totals['stripe_total']){
                                                schema.totals['stripe_total'] = 0
                                            }

                                            schema.totals['stripe_total'] += parseFloat(transaction.payment.stripe)

                                            if (!schema.totals['card_total']){
                                                schema.totals['card_total'] = 0
                                            }

                                            schema.totals['card_total'] += parseFloat(transaction.payment.card)

                                        } else {

                                            if (!schema.totals[methods[i]+'_total']){
                                                schema.totals[methods[i]+'_total'] = 0
                                            }
                                            if (methods[i] == 'petty_cash'){
                                                schema.totals['petty_cash_in_total'] += parseFloat(transaction.payment.petty_cash_in)
                                                schema.totals['petty_cash_out_total'] += parseFloat(transaction.payment.petty_cash_out)
                                            } else {
                                                schema.totals[methods[i]+'_total'] += parseFloat(transaction.total)
                                            }

                                        }

                                    }

                                }

                                if (transaction.payment && transaction.payment.account >= 0){
                                    schema.totals.account_spent += parseFloat(transaction.payment.account)
                                }

                                if (transaction.payment && transaction.payment.vouchers >= 0){
                                    schema.totals.vouchers_spent += parseFloat(transaction.payment.vouchers)
                                }

                                if (transaction.method != 'petty_cash'){
                                    schema.totals.transactions_total += parseFloat(transaction.total)
                                    schema.totals.transactions_tax += parseFloat(transaction.tax)
                                    schema.totals.transactions_sub_total += parseFloat(transaction.sub_total)
                                }

                                transaction.items.forEach((item, idx2, array2) => {

                                    if (item.type == 'services' || !item.type && item.service_id || !item.type && item._id.match('appointments|service') || !item.type && item.service_items){
                                        item.type = 'service'
                                    }

                                    if (item.type){

                                        if (!schema.totals[item.type+'_total']){
                                            schema.totals[item.type+'_sub_total'] = 0
                                            schema.totals[item.type+'_tax'] = 0
                                            schema.totals[item.type+'_total'] = 0
                                            schema.totals[item.type+'_count'] = 0
                                        }

                                        if (!item.price){
                                            item.price = 0
                                        }

                                        item.total = parseFloat(item.price)*parseInt(item.quantity)

                                        if (item.adjustment){

                                            item.adjustment = item.adjustment.replace(/\$|\£|\#|p/,'')

                                            if (item.adjustment.match(/%/)){

                                                item.adjustment_value = item.adjustment.replace(/%/,'')
                                                item.adjustment_value = (item.total/100)*item.adjustment_value
                                                item.total = parseFloat(item.total)+parseFloat(item.adjustment_value)

                                            } else {

                                                item.total = parseFloat(item.total)+parseFloat(item.adjustment)

                                            }
                                        }

                                        item.sub_total = parseFloat(item.total)/config.tax_amount
                                        item.tax = parseFloat(item.total)-parseFloat(item.sub_total)

                                        schema.totals[item.type+'_count'] = parseInt(schema.totals[item.type+'_count'])+parseInt(item.quantity)
                                        schema.totals[item.type+'_total'] += item.total

                                        if (!item.type.match(/account|vouchers/)){
                                            schema.totals[item.type+'_sub_total'] += item.sub_total
                                            schema.totals[item.type+'_tax'] += item.tax
                                        }

                                    }

                                    if (idx1 === array1.length - 1 && idx2 === array2.length - 1){

                                        schema.totals.cash_total_calculated = parseFloat(schema.totals.cash_opening_float)+schema.totals.cash_total-schema.totals.petty_cash_out_total
                                        schema.totals.cash_total_difference = parseFloat(schema.totals.cash_closing_float) - schema.totals.cash_total_calculated

                                        schema.totals.card_total_entered = parseFloat(schema.totals.card_total_entered)
                                        schema.totals.card_total_calculated = parseFloat(schema.totals.card_total)
                                        schema.totals.card_total_difference = parseFloat(schema.totals.card_total_entered)-parseFloat(schema.totals.card_tips)-schema.totals.card_total_calculated

                                        schema.totals.bank = parseFloat(schema.totals.cash_closing_float) - parseFloat(schema.totals.new_float)

                                        schema.totals.transactions_total += parseFloat(schema.totals.vouchers_spent)
                                        schema.totals.transactions_total += parseFloat(schema.totals.account_spent)

                                        schema.transactions = data[0].transactions

                                        localStorage.set('report_'+schema.id,schema)
                                        localStorage.set('report_results', schema)

                                        resolve(schema)

                                    }

                                })


                                if (idx1 === array1.length - 1 && transaction.items.length < 1){ // random issue if the last transaction doesn't have any items added to it, the repost won't complete

                                    schema.totals.cash_total_calculated = parseFloat(schema.totals.cash_opening_float)+schema.totals.cash_total-schema.totals.petty_cash_out_total
                                    schema.totals.cash_total_difference = parseFloat(schema.totals.cash_closing_float) - schema.totals.cash_total_calculated

                                    schema.totals.card_total_entered = parseFloat(schema.totals.card_total_entered)
                                    schema.totals.card_total_calculated = parseFloat(schema.totals.card_total)
                                    schema.totals.card_total_difference = parseFloat(schema.totals.card_total_entered)-parseFloat(schema.totals.card_tips)-schema.totals.card_total_calculated

                                    schema.totals.bank = parseFloat(schema.totals.cash_closing_float) - parseFloat(schema.totals.new_float)

                                    schema.totals.transactions_total += parseFloat(schema.totals.vouchers_spent)
                                    schema.totals.transactions_total += parseFloat(schema.totals.account_spent)

                                    schema.transactions = data[0].transactions

                                    localStorage.set('report_'+schema.id,schema)
                                    localStorage.set('report_results', schema)

                                    resolve(schema)
                                    return

                                }

                            })


                        } else {
                            reject('No newly completed transactions to process since last report on '+moment(data[0].prev_report[0]._created).format('llll'))
                        }

                    })

                }

            })

        },

        monthEnd: async (query) => {

            return new Promise(async (resolve, reject) => {

                let schema = {
                        id:'',
                        totals: {

                        },
                        difference:{
                            total:0,
                            services:0,
                            products:0,
                            vouchers:0
                        },
                        meta: {
                            from:'Please select',
                            to: 'Please select',
                            start:'',
                            end:'',
                            name:'month_end'
                        },
                        transactions:[],
                        date_range:true,
                        inputs:[]
                    }

                if (query.schema){

                    resolve(schema)

                } else {

                    resolve('running')

                    if (!query.from){
                        query.from = moment().set({hours:0,minutes:0,seconds:0}).toISOString()
                    }

                    if (!query.to){
                        query.to = query.from
                    }

                    if (query.to && query.to.match(/Z$/)){
                        query.to = moment(query.to).add(23,'hours').add(59,'minutes').toISOString()
                    }

                    schema.meta.start = query.from
                    schema.meta.end = query.to

                    db.query('FOR t IN transactions FILTER t.status == "complete" && t._created >= DATE_ISO8601("'+query.from+'") && t._created <= DATE_ISO8601("'+query.to+'") RETURN t',async (data)=>{

                        schema.transactions = data

                        for (let transaction of data){

                            if (!schema.totals.salon){
                                schema.totals.all = {
                                    total: 0,
                                    total_check:0,
                                    count:0,
                                    services: {
                                        count:0,
                                        total: 0
                                    },
                                    vouchers: {
                                        count:0,
                                        total: 0
                                    },
                                    appointments: {
                                        with_products:0,
                                        total:0
                                    },
                                    products: {
                                        count:0,
                                        total: 0
                                    },
                                    account: {
                                        count:0,
                                        total: 0
                                    }
                                }
                                schema.totals.salon = {
                                    total: 0,
                                    count:0,
                                    services: {
                                        count:0,
                                        total: 0,
                                        items:[]
                                    },
                                    vouchers: {
                                        count:0,
                                        total: 0
                                    },
                                    appointments: {
                                        with_products:0,
                                        total:0
                                    },
                                    products: {
                                        count:0,
                                        total: 0
                                    },
                                    account: {
                                        count:0,
                                        total: 0
                                    }
                                }
                                schema.totals.no_staff = {
                                    total: 0,
                                    count:0,
                                    services: {
                                        count:0,
                                        total: 0
                                    },
                                    vouchers: {
                                        count:0,
                                        total: 0
                                    },
                                    products: {
                                        count:0,
                                        total: 0
                                    },
                                    account: {
                                        count:0,
                                        total: 0
                                    }
                                }
                            }

                            if (transaction.total){
                                schema.totals.all.total += parseFloat(transaction.item_total)
                                schema.totals.all.count++
                            }

                            let iterations = transaction.items.length,
                                appointments_total = false,
                                appointments_products = false,
                                appointments_services = false

                            for (let item of transaction.items){

                                if (item.staff_id){

                                    if (!schema.totals[item.staff_id]){
                                        let staff_data = await staff.find(item.staff_id)

                                        if (!staff_data.hourly_rate){
                                            staff_data.hourly_rate = 0
                                        }

                                        schema.totals[item.staff_id] = {
                                            name: staff_data.name.first+' '+staff_data.name.last,
                                            hourly_rate: parseFloat(staff_data.hourly_rate),
                                            total: 0,
                                            count: 0,
                                            services: {
                                                count:0,
                                                total: 0
                                            },
                                            appointments: {
                                                with_products:0,
                                                total:0
                                            },
                                            vouchers: {
                                                count:0,
                                                total: 0
                                            },
                                            products: {
                                                count:0,
                                                total: 0
                                            },
                                            account: {
                                                count:0,
                                                total: 0
                                            }
                                        }
                                    }

                                    if (item.price){

                                        item.total = parseFloat(await view.functions.getPrice(item,'sub_total'))

                                        if (item.service_id || item._id && item._id.match(/appointment|services/)){

                                            let service_id, split_total = 0, split_difference, staff_data

                                            item.split = 100

                                            if (item.service_id){
                                                service_id = item.service_id
                                            } else if (item._id.match(/services/)){
                                                service_id = item._key
                                            }

                                            let service

                                            try {
                                                service = await services.find(service_id)
                                            }
                                            catch(e){
                                                log('Service and retail report: '+e)
                                            }

                                            if (service && service[0] && service[0].service_items && item._id.match(/appointment/)){

                                                if (!appointments_total){
                                                    schema.totals.salon.appointments.total++
                                                    appointments_total = true
                                                }


                                                try {
                                                    staff_data = await appointments.findStaffFromClientAppts(transaction._created,transaction.customer_id)
                                                }
                                                catch(e){
                                                    log('Service and retail report: '+e)
                                                }

                                                if (!staff_data || staff_data.length == 0){

                                                    try {
                                                        staff_data = await appointments.findStaffFromLinkedAppts(item._key)
                                                    }
                                                    catch(e){
                                                        log('Service and retail report: '+e)
                                                    }
                                                }

                                                for (let service_item of service[0].service_items){

                                                    if (service_item.split_percent){
                                                        service_item.split_percent = parseFloat(service_item.split_percent)
                                                    } else {
                                                        service_item.split_percent = 100
                                                    }

                                                    split_total += service_item.split_percent

                                                    let staff_idx = staff_data.findIndex((staff_item,i) => {
                                                        return staff_item.service_name == service_item.name
                                                    })

                                                    if (staff_idx >= 0){

                                                        service_item.staff_id = staff_data[staff_idx].staff_id

                                                        service_item.split_value = service_item.split_percent/100
                                                        service_item.split_value = item.total*service_item.split_value

                                                        if (!schema.totals[service_item.staff_id]){
                                                            let stylist_data = await staff.find(service_item.staff_id)

                                                            if (!stylist_data.hourly_rate){
                                                                stylist_data.hourly_rate = 0
                                                            }

                                                            schema.totals[service_item.staff_id] = {
                                                                name: stylist_data.name.first+' '+stylist_data.name.last,
                                                                hourly_rate: parseFloat(stylist_data.hourly_rate),
                                                                total: 0,
                                                                count: 0,
                                                                services: {
                                                                    count:0,
                                                                    total: 0
                                                                },
                                                                appointments: {
                                                                    with_services:0,
                                                                    with_products:0,
                                                                    total:0
                                                                },
                                                                vouchers: {
                                                                    count:0,
                                                                    total: 0
                                                                },
                                                                products: {
                                                                    count:0,
                                                                    total: 0
                                                                },
                                                                account: {
                                                                    count:0,
                                                                    total: 0
                                                                }
                                                            }
                                                        }

                                                        service_item.staff_name = schema.totals[service_item.staff_id].name

                                                        schema.totals[service_item.staff_id].services.count = parseInt(schema.totals[service_item.staff_id].services.count)+parseInt(item.quantity)
                                                        schema.totals[service_item.staff_id].services.total += service_item.split_value
                                                        schema.totals[service_item.staff_id].total += service_item.split_value

                                                        schema.totals.all.services.count = parseInt(schema.totals.all.services.count)+parseInt(item.quantity)

                                                    } else {


                                                        service_item.staff_name = schema.totals[item.staff_id].name
                                                    }

                                                }

                                                item.service_items = service[0].service_items

                                                if (split_total < 100){

                                                    item.split_value = split_total/100
                                                    item.split_value = item.total*item.split_value

                                                    // if (!staff_data)
                                                    //
                                                    // schema.totals[item.staff_id].services.count = parseInt(schema.totals[item.staff_id].services.count)+parseInt(item.quantity)
                                                    // schema.totals[item.staff_id].services.total += item.split_value
                                                    // schema.totals[item.staff_id].total += item.split_value

                                                    if (split_total < 100 && schema.totals.salon.services.items.indexOf(item._id) === -1){

                                                        split_difference = 100 - split_total
                                                        item.cost = split_difference/100
                                                        item.cost = item.total*item.cost
                                                        schema.totals.salon.services.count = parseInt(schema.totals[item.staff_id].services.count)+parseInt(item.quantity)
                                                        schema.totals.salon.services.total += item.cost
                                                        schema.totals.salon.total += item.cost

                                                        item.service_items.push({staff_name:'Cost',split_percent:split_difference,split_value:item.cost})

                                                        if (item._id.match(/appointment/)){
                                                            schema.totals.salon.services.items.push(item._id)
                                                        }

                                                    }

                                                }

                                            } else {

                                                schema.totals[item.staff_id].services.count = parseInt(schema.totals[item.staff_id].services.count)+parseInt(item.quantity)
                                                schema.totals[item.staff_id].services.total += item.total
                                                schema.totals[item.staff_id].total += item.total

                                                item.service_items.push({staff_name:schema.totals[item.staff_id].name,split_percent:100,split_value:item.total})

                                            }


                                            schema.totals.all.services.total += item.total

                                        }

                                        if (item.type == 'products'){

                                            if (!appointments_products && appointments_total === true){
                                                schema.totals.salon.appointments.with_products++
                                                appointments_products = true
                                            }

                                            schema.totals[item.staff_id].products.count = parseInt(schema.totals[item.staff_id].products.count)+parseInt(item.quantity)
                                            schema.totals[item.staff_id].products.total += item.total
                                            schema.totals[item.staff_id].total += item.total
                                            schema.totals.all.products.count = parseInt(schema.totals.all.services.count)+parseInt(item.quantity)
                                            schema.totals.all.products.total += item.total
                                        }

                                        if (item.type == 'vouchers'){
                                            // schema.totals[item.staff_id].vouchers.count++
                                            // schema.totals[item.staff_id].vouchers.total += item.total
                                        //    schema.totals[item.staff_id].total -= item.total
                                            schema.totals.all.vouchers.count = parseInt(schema.totals.all.vouchers.count)+parseInt(item.quantity)
                                            schema.totals.all.vouchers.total += item.total
                                        //    schema.totals.all.total -= item.total
                                        }

                                        if (item.type == 'account'){
                                            schema.totals[item.staff_id].account.count = parseInt(schema.totals[item.staff_id].account.count)+parseInt(item.quantity)
                                            schema.totals[item.staff_id].account.total += item.total
                                        //    schema.totals[item.staff_id].total -= item.total
                                            schema.totals.all.account.count = parseInt(schema.totals.all.account.count)+parseInt(item.quantity)
                                            schema.totals.all.account.total += item.total
                                        //    schema.totals.all.total -= item.total
                                        }

                                        schema.totals.all.total_check += item.total

                                    }

                                } else {

                                    if (item.price){

                                        item.total = parseFloat(await view.functions.getPrice(item,'sub_total'))

                                        if (item.service_id || item._id && item._id.match(/appointment|services/)){
                                            schema.totals.no_staff.services.count = parseInt(schema.totals.no_staff.services.count)+parseInt(item.quantity)
                                            schema.totals.no_staff.services.total += item.total
                                            schema.totals.all.services.count = parseInt(schema.totals.all.services.count)+parseInt(item.quantity)
                                            schema.totals.all.services.total += item.total

                                            schema.totals.no_staff.total += item.total
                                        }

                                        if (item.type == 'products'){
                                            schema.totals.no_staff.products.count = parseInt(schema.totals.no_staff.products.count)+parseInt(item.quantity)
                                            schema.totals.no_staff.products.total += item.total
                                            schema.totals.all.products.count = parseInt(schema.totals.all.products.count)+parseInt(item.quantity)
                                            schema.totals.all.products.total += item.total

                                            schema.totals.no_staff.total += item.total
                                        }

                                        if (item.type == 'vouchers'){
                                            // schema.totals.no_staff.vouchers.count++
                                            // schema.totals.no_staff.vouchers.total += item.total
                                            // schema.totals.no_staff.total -= item.total
                                            schema.totals.all.vouchers.count = parseInt(schema.totals.all.vouchers.count)+parseInt(item.quantity)
                                            schema.totals.all.vouchers.total += item.total
                                        //    schema.totals.all.total -= item.total
                                        }

                                        if (item.type == 'account'){
                                            // schema.totals.no_staff.account.count++
                                            // schema.totals.no_staff.account.total += item.total
                                            // schema.totals.no_staff.total -= item.total
                                            schema.totals.all.account.count = parseInt(schema.totals.all.account.count)+parseInt(item.quantity)
                                            schema.totals.all.account.total += item.total
                                        //    schema.totals.all.total -= item.total
                                        }

                                        schema.totals.all.total_check += item.total

                                    }

                                }

                            }

                        }

                        for (let [key, value] of Object.entries(schema.totals)){
                            schema.totals[key].sub_total = parseFloat(schema.totals[key].total)/config.tax_amount
                        }

                        if (!schema.totals.all){
                            schema.totals.all = {
                                appointments: {
                                    total:0
                                },
                                services:{
                                    count:0,
                                    total:0
                                },
                                products:{
                                    count:0,
                                    total:0
                                },
                                account: {
                                    total:0
                                },
                                vouchers: {
                                    total:0
                                },
                                total:0
                            }
                        }

                        if (!schema.totals.salon){
                            schema.totals.salon = {
                                appointments: {
                                    total:0
                                },
                                services:{
                                    count:0,
                                    total:0
                                },
                                products:{
                                    count:0,
                                    total:0
                                },
                                account: {
                                    total:0
                                },
                                vouchers: {
                                    total:0
                                },
                                total:0
                            }

                        }

                        if (!schema.totals.no_staff){
                            schema.totals.no_staff = {
                                appointments: {
                                    total:0
                                },
                                services:{
                                    count:0,
                                    total:0
                                },
                                products:{
                                    count:0,
                                    total:0
                                },
                                account: {
                                    total:0
                                },
                                vouchers: {
                                    total:0
                                },
                                total:0
                            }

                        }

                        if (!schema.totals.salon.appointments || !schema.totals.salon.appointments.totals){
                            schema.totals.salon.appointments = {
                                    total:0,
                                    with_products:0
                                }

                        }

                        schema.totals.all.total = parseFloat(schema.totals.all.total) - parseFloat(schema.totals.all.account.total) - parseFloat(schema.totals.all.vouchers.total)
                        schema.totals.all.total_check = parseFloat(schema.totals.all.total_check) - parseFloat(schema.totals.all.account.total) - parseFloat(schema.totals.all.vouchers.total)

                        schema.totals.all.sub_total = parseFloat(schema.totals.all.total)/config.tax_amount

                        let day_count = moment(schema.meta.end).diff(moment(schema.meta.start), 'days'),
                            days = Array.from(Array(day_count+1).keys()),
                            staff_data = {},
                            day_data

                        if (days.length == 0){
                            days = ['0']
                        }

                        for (const day of days){
                            let iso = moment(schema.meta.start).add(day,'days').toISOString()
                            day_data = await reports.getWorkingHours(iso)
                            staff_data[iso] = day_data
                        }

                        schema.staff = await staff.allNames()

                        schema.working_hours = staff_data

                        localStorage.set('report_results', schema)

                        
                    //    resolve(schema)
                        
                        

                    })

                }

            })

        },

        productStaff: async (query) => {

            return new Promise(async (resolve, reject) => {

                let schema = {
                        id:'',
                        totals: {
                            product_total:0,
                            products:{},
                            product_count:0,
                            transaction_count:0
                        },
                        meta: {
                            from:'Please select',
                            to: 'Please select',
                            start:'',
                            end:'',
                            name:'product_staff',
                        },
                        transactions:[],
                        date_range:true,
                        inputs:[{
                            field:'staff_id',
                            value:'',
                            description:'Select stylist'
                        }]
                    }

                if (query.schema){

                    resolve(schema)

                } else {

                    if (!query.from){
                        query.from = moment().set({hours:0,minutes:0,seconds:0}).toISOString()
                    }

                    if (!query.to){
                        query.to = query.from
                    }

                    if (query.to && query.to.match(/Z$/)){
                        query.to = moment(query.to).add(23,'hours').add(59,'minutes').toISOString()
                    }

                    schema.meta.start = query.from
                    schema.meta.end = query.to

                    if (!query.staff_id){
                        query.staff_id = '171467'
                    }

                    db.query('FOR t IN transactions FILTER t.status == "complete" && t._created >= DATE_ISO8601("'+query.from+'") && t._created <= DATE_ISO8601("'+query.to+'") RETURN t',async (data)=>{

                        schema.transactions = data

                        for (let [key,transaction] of data.entries()){

                            let iterations = transaction.items.length

                            transaction.product_total = 0
                            transaction.include = false

                            for (let item of transaction.items){

                                if (item.type == 'products' && item.staff_id == "171467"){

                                    transaction.include = true

                                    item.total = parseFloat(await view.functions.getPrice(item,'sub_total'))

                                    transaction.product_total += item.total

                                    if (!schema.totals.products[item._key]){
                                        schema.totals.products[item._key] = {
                                            name: item.name,
                                            count: parseInt(item.quantity),
                                            total: parseFloat(item.total)
                                        }
                                    } else {
                                        schema.totals.products[item._key].count = parseInt(schema.totals.products[item._key].count) + parseInt(item.quantity)
                                        schema.totals.products[item._key].total += parseFloat(item.total)
                                    }

                                    schema.totals.product_total += item.total
                                    schema.totals.product_count = schema.totals.product_count+parseInt(item.quantity)

                                }

                            }

                            if (transaction.include === true){
                                schema.totals.transaction_count++
                            }

                        }

                        schema.totals.average_sale = parseFloat(schema.totals.product_total/schema.totals.transaction_count).toFixed(2)
                        resolve(schema)

                    })
                }

            })

        },

        getWorkingHours: (iso) => {

            return new Promise( async (resolve, reject) => {

                db.query('FOR s IN staff FILTER s.role != "not_employed" SORT s.position ASC LET appts = ( FOR a IN appointments FILTER DATE_COMPARE(a.date, DATE_ISO8601("'+iso+'"), "years", "days") && a.staff_id == s._key && a.status != "deleted" && a.event_type == "staff_appointment" && a.description == "available" SORT a.date ASC RETURN a ) LET absence = ( FOR a IN appointments FILTER DATE_COMPARE(a.date, DATE_ISO8601("'+iso+'"), "years", "days") && a.staff_id == s._key && a.status != "deleted" && a.event_type == "staff_appointment" && a.description != "available" SORT a.date ASC RETURN a) LET hours = appts[0].date ? CEIL(DATE_DIFF(appts[0].date,appts[-1].end_date,"minutes",true)) : 0 LET absence_hours = SUM(FLATTEN(FOR r IN absence RETURN CEIL(DATE_DIFF(r.date,r.end_date,"minutes",true)))) LET absence_reason = absence[0].description RETURN {staff_id:s._key, hours:hours, absence:absence_hours, absence_start:absence[0].date,absence_end:absence[-1].end_date,appt_start:appts[0].date,appt_end:appts[-1].end_date,start:appts[0].date,end:appts[-1].end_date, description:absence_reason}', (day_data)=>{
                    
                    resolve(day_data)
                })

            })

        },

        orderProducts:()=>{

            return new Promise(function(resolve, reject) {

                db.query('FOR p IN products FILTER HAS(p,"re_order") && HAS(p,"re_order_threshold") && TO_NUMBER(p.stock) <= TO_NUMBER(p.re_order_threshold) || p.on_order == true SORT p.brand ASC RETURN p', (data)=>{

                    if (data.length >= 0){
                        let result = {
                            data: data
                        }
                        resolve(result)
                    } else {
                        reject('report failed, no data found')
                    }


                })

            })

        },

        orderProductsDownload:()=>{

            return new Promise(function(resolve, reject) {

                db.query('FOR p IN products FILTER p.on_order == true SORT p.brand ASC RETURN p', (data)=>{

                    let csv = '"Barcode","Brand","Name","Current Stock","Order Threshold","Order Amount"\r\n'

                    if (Array.isArray(data) && data.length > 0){
                        data.forEach((item, i)=>{

                            csv += '"'+item.barcode+'","'+item.brand+'","'+item.name+'","'+item.stock+'","'+item.re_order_threshold+'","'+item.re_order+'"\r\n'

                            if (i >= data.length-1){

                                reports.saveDocument('product_order.csv',csv).then((output)=>{
                                    let result = {
                                        data: data,
                                        output: output
                                    }
                                    resolve(result)
                                }).catch((err)=>{
                                    reject(err)
                                })

                            }
                        })
                    } else {
                        reject('No products added to order list')
                    }


                })

            })

        },

        clientEmail:()=>{

            return new Promise(function(resolve, reject) {

                db.query('FOR c IN customers RETURN {email:c.email,first_name:c.name.first, last_name:c.name.last,address_line_1: c.address.line1,address_line_2: c.address.line2,city: c.address.town,postal_code: c.address.postcode,country: "UK"}', (data)=>{

                    let csv = '"email","first_name","last_name","address_line_1","address_line_2","city","postal_code","country"\r\n'

                    data.forEach((item, i)=>{

                        csv += '"'+item.email+'","'+item.first_name+'","'+item.last_name+'","'+item.address_line_1+'","'+item.address_line_2+'","'+item.city+'","'+item.postal_code+'","'+item.country+'"\r\n'

                        if (i >= data.length-1){

                            reports.saveDocument('client_email.csv',csv).then((output)=>{
                                resolve(output)
                            }).catch((err)=>{
                                reject(err)
                            })

                        }
                    })

                })

            })

        },

        // futureAppointmentTotal()

        saveDocument:(filename, contents)=>{

            return new Promise(function(resolve, reject) {

                let new_filename = Date.now()+'-'+filename,
                    full_path = '/websites/salonstream/documents/reports/'+new_filename

                fs.writeFile(full_path, contents, 'utf8', function(err) {
                    if(err) {
                        console.log("err: ",err)
                        reject(err)
                        return
                    }
                    resolve('/dashboard/reports/download/'+new_filename)
                })

            })

        },
        getSalonOrServiceProviderEarning:async (data,_key)=>{
            // console.log(data)
            var filter='';
            if(_key){
               filter= ` AND p.member_id=="${_key}"`
            }   
            return new Promise(async function(resolve, reject) {
                console.log(`LET today = DATE_NOW()
                LET weekly = DATE_SUBTRACT(today, 7, "day")
                LET monthly = DATE_SUBTRACT(today, 30, "day")
                LET yearly = DATE_SUBTRACT(today, 365, "day")
                FOR p IN transactions
                    FILTER (p.type == 'Appointment booking payment' OR p.type == 'Order Product') AND p.status == 'complete' AND p._created >= DATE_ISO8601(${data}) ${filter}
                    RETURN {"total": p.item_total, "date": p._created, "customer": p.customer_id, "type": p.type, "transaction_id": p.transaction_id}
                `)
                db.query(`LET today = DATE_NOW()
                LET weekly = DATE_SUBTRACT(today, 7, "day")
                LET monthly = DATE_SUBTRACT(today, 30, "day")
                LET yearly = DATE_SUBTRACT(today, 365, "day")
                FOR p IN transactions
                    FILTER (p.type == 'Appointment booking payment' OR p.type == 'Order Product') AND p.status == 'complete' AND p._created >= DATE_ISO8601(${data}) ${filter}
                    RETURN {"total": p.item_total, "date": p._created, "customer": p.customer_id, "type": p.type, "transaction_id": p.transaction_id
                    ,"stripe_transaction_id":p.stripe_transcation_id,"tax":p.tax,"delivery":p.delivery,"method":p.method}
                `, (data)=>{
                    // console.log(data)
                    resolve(data)
                })
            
                
            })

        },
        foodCaffeSales:async (data)=>{
            // console.log(data)
            return new Promise(async function(resolve, reject) {
                console.log(`LET today = DATE_NOW()
                LET weekly = DATE_SUBTRACT(today, 7, "day")
                LET monthly = DATE_SUBTRACT(today, 30, "day")
                LET yearly = DATE_SUBTRACT(today, 365, "day")
                FOR p IN transactions
                    FILTER p.type == 'Food Cafe Order' AND p.status == 'complete' AND p._created >= DATE_ISO8601(${data})
                    RETURN {"total": p.item_total, "date": p._created, "customer": p.customer_id, "type": p.type, "transaction_id": p.transaction_id
                    ,"stripe_transaction_id":p.stripe_transcation_id,"tax":p.tax,"delivery":p.delivery,"method":p.method}
                `)
                db.query(`LET today = DATE_NOW()
                LET weekly = DATE_SUBTRACT(today, 7, "day")
                LET monthly = DATE_SUBTRACT(today, 30, "day")
                LET yearly = DATE_SUBTRACT(today, 365, "day")
                FOR p IN transactions
                    FILTER p.type == 'Food Cafe Order' AND p.status == 'complete' AND p._created >= DATE_ISO8601(${data})
                    RETURN {"total": p.item_total, "date": p._created, "customer": p.customer_id, "type": p.type, "transaction_id": p.transaction_id
                    ,"stripe_transaction_id":p.stripe_transcation_id,"tax":p.tax,"delivery":p.delivery,"method":p.method}
                `, (data)=>{
                    console.log(data)
                    resolve(data)
                })
            
                
            })

        },
        customers:async (data,_key)=>{
            // console.log(data)
            var filter=``;
            if(_key){
                filter=` AND "${_key}" IN p.member_array`
            }
            return new Promise(async function(resolve, reject) {
                console.log(`LET today = DATE_NOW()
                LET weekly = DATE_SUBTRACT(today, 7, "day")
                LET monthly = DATE_SUBTRACT(today, 30, "day")
                LET yearly = DATE_SUBTRACT(today, 365, "day")
                for p in customers FILTER p._created >= DATE_ISO8601(${data}) ${filter} sort p._key desc  return
                 {"_key":p._key,"firstName":p.name.first,"lastName":p.name.last,"phone":p.phone,
                 "gender":p.gende,"last_transaction":p.last_transaction.date,"email":p.email,
                 "orderCount":LENGTH(p.orders),"cafeOrders":Length(p.cafeorders),"verify":p.verify}`)
                db.query(`LET today = DATE_NOW()
                LET weekly = DATE_SUBTRACT(today, 7, "day")
                LET monthly = DATE_SUBTRACT(today, 30, "day")
                LET yearly = DATE_SUBTRACT(today, 365, "day")
                for p in customers FILTER p._created >= DATE_ISO8601(${data}) ${filter} sort p._key desc  return
                 {"_key":p._key,"firstName":p.name.first,"lastName":p.name.last,"phone":p.phone,
                 "gender":p.gende,"last_transaction":p.last_transaction.date,"email":p.email,
                 "orderCount":LENGTH(p.orders),"cafeOrders":Length(p.cafeorders),"verify":p.verify}`, (data)=>{
                    console.log(data)
                    resolve(data)
                })
            
                
            })

        },
        member_commission:async (data,_key)=>{
            // console.log(data)
            var filter=``;
            if(_key){
                filter=`&& p.member_id=="${_key}"`
              
            }
            return new Promise(async function(resolve, reject) {
                console.log(`LET today = DATE_NOW()
                LET weekly = DATE_SUBTRACT(today, 7, "day")
                LET monthly = DATE_SUBTRACT(today, 30, "day")
                LET yearly = DATE_SUBTRACT(today, 365, "day")
                for p in wallet_transactions FILTER p._created >= DATE_ISO8601(${data}) ${filter} sort p._key desc return p`)
                db.query(`LET today = DATE_NOW()
                LET weekly = DATE_SUBTRACT(today, 7, "day")
                LET monthly = DATE_SUBTRACT(today, 30, "day")
                LET yearly = DATE_SUBTRACT(today, 365, "day")
                for p in wallet_transactions FILTER p._created >= DATE_ISO8601(${data}) ${filter} sort p._key desc return p`, (data)=>{
                    // console.log(data)
                    resolve(data)
                })
            
                
            })

        },
        products:async (data)=>{
            // console.log(data)
            return new Promise(async function(resolve, reject) {
                console.log(`LET today = DATE_NOW()
                LET weekly = DATE_SUBTRACT(today, 7, "day")
                LET monthly = DATE_SUBTRACT(today, 30, "day")
                LET yearly = DATE_SUBTRACT(today, 365, "day")
                FOR p IN products
                return {"_key":p._key,"brand":p.brand,"name":p.name,"category":p.category,"rating":p.rating,
                "price":p.price,"stock":p.stock,"re_order_threshold":p.re_order_threshold,"size":p.size,
                "size_units":p.size_units,"sell_online":p.sell_online,"delivery_width":p.delivery_width,
                "delivery_height":p.delivery_height,"delivery_length":p.delivery_length,"orderCount":p.orderCount,
                "_created":p._created}`)
                db.query(`LET today = DATE_NOW()
                LET weekly = DATE_SUBTRACT(today, 7, "day")
                LET monthly = DATE_SUBTRACT(today, 30, "day")
                LET yearly = DATE_SUBTRACT(today, 365, "day")
                FOR p IN products FILTER p._created >= DATE_ISO8601(${data}) sort p._key desc 
                return {"_key":p._key,"brand":p.brand,"name":p.name,"category":p.category,"rating":p.rating,
                "price":p.price,"stock":p.stock,"re_order_threshold":p.re_order_threshold,"size":p.size,
                "size_units":p.size_units,"sell_online":p.sell_online,"delivery_width":p.delivery_width,
                "delivery_height":p.delivery_height,"delivery_length":p.delivery_length,"orderCount":p.orderCount,
                "_created":p._created}`, (data)=>{
                    console.log(data)
                    resolve(data)
                })
            
                
            })

        }


    }

    module.exports = reports
