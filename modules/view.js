


    const path = require('path')

    var view = {
        menus: {},
        dont_track: ["/login"],
        meta:{
            title: 'SalonStream | By David Rozman'
        },
        site: {
            name: config.site_name,
            url: config.site_url,
            tel: config.site_tel,
            icon:config.site_logo.icon,
            logo: config.site_logo.regular,
            platform: config.platform
        },
        basedir: global.basedir,
        functions:{

            getPath:() => {
                return path.dirname(__filename)
            },

            isPlural:(input)=>{
                return input.match(/(s|ies)$/)
            },

            depluralise:(input)=>{

                let plural = view.functions.isPlural(input)

                if (plural){
                    let re = RegExp(plural[0]+'$')
                    return input.replace(re,'')
                } else {
                    return input
                }

            },

            parseName:(input, depluralise)=>{
                input = input.replace(/^_/,'').replace(/_/g,' ')
                input = view.functions.capitalise(input)

                if (depluralise){
                    return view.functions.depluralise(input)
                } else {
                    return input
                }
            },

            parseSlug:(input)=>{
                return input.replace(/-/g,' ').toLowerCase()
            },

            parseSnake:(input)=>{
                return input.replace(/\s/g,'_').toLowerCase()
            },

            parseCamelCase: (name, to_snake)=>{

                if (to_snake){
                    name = name.replace( /([A-Z])/g, " $1" )
                    name = name.trim()
                    return name.split(' ').join('_').toLowerCase()
                } else {
                    return name.replace(/[_-]([a-z])/g, function (g) { return g[1].toUpperCase(); })
                }
            
            
            },

            capitalise:(str, lower = false) => {
                return (lower ? str.toLowerCase() : str).replace(/(?:^|\s|["'([{])+\S/g, match => match.toUpperCase());
            },

            parseDate:(date, format)=>{
                date = moment(date)
                if (date.isDST()){
                    return date.format(format)
                } else {
                    return date.format(format)
                }

            },

            dateDiff:(date1, date2, diff)=>{

                if (date2 == 'now'){
                    date2 = moment()
                } else {
                    date2 = moment(date2)
                }

                return moment(date1).diff(date2,diff)

            },

            getDay:(date)=>{

                var dayNames = {1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun'}
                date = new Date(date)
                return dayNames[date.getDay()]

            },

            getDate:(date)=>{

                date = new Date(date)
                return date.getDate()

            },

            getMonth:(date)=>{

                var months = ['January','Febuary','March','April','May','June','July','August','September','October','November','December']
                date = new Date(date)
                return months[date.getMonth()]+' '+date.getFullYear()

            },

            getTimeOfDay:(date)=>{

                if (!date){
                    date = moment().format('HH')
                } else {
                    date = moment(date).format('HH')
                }

                if (date < 12){
                    return 'Morning'
                } else if (date >= 12 && date < 17){
                    return 'Afternoon'
                } else {
                    return 'Evening'
                }

            },

            parseTime:(time)=>{

                time = time.toString().split("")

                if (time.length == 3){
                    return '0'+''+time[0]+':'+time[1]+''+time[2]
                } else {
                    return time[0]+''+time[1]+':'+time[2]+''+time[3]
                }

            },

            getPrice:(item,field,show_discount)=>{

                let discount_string = ''

                if (item.adjustment){

                    if (item.original_price){
                        item.price = item.original_price
                    } else {
                        item.original_price = parseFloat(item.price).toFixed(2)
                    }

                    item.total = parseFloat(item.price)*parseInt(item.quantity) // use total price of all items for any adjustments

                    item.adjustment = item.adjustment.replace(/\$|\£|\#|p/,'')

                    if (item.adjustment.match(/%/)){

                        item.adjustment_value = item.adjustment.replace(/%/,'')
                        item.adjustment_value = (item.price/100)*item.adjustment_value
                        item.total = parseFloat(item.total)+parseFloat(item.adjustment_value)

                    } else {

                        item.total = parseFloat(item.total)+parseFloat(item.adjustment)

                    }

                } else {
                    item.total = parseFloat(item.price)*parseInt(item.quantity)
                }

                if (item.price <= 0 && item.total > 0){
                    item.price = item.total
                }

                item.price = parseFloat(item.price).toFixed(2)

                if (item.type != 'vouchers' && item.type != 'account'){
                    item.sub_total = parseFloat(item.total)/config.tax_amount
                    item.tax = parseFloat(item.total)-parseFloat(item.sub_total)
                    item.tax = parseFloat(item.tax).toFixed(2)
                    item.sub_total = parseFloat(item.sub_total).toFixed(2)
                }

                item.total = parseFloat(item.total).toFixed(2)

                if (show_discount && item.adjustment && item.adjustment.match(/^-/)){
                    discount_string = '<span class="strikethrough"> £'+parseFloat(item.original_price).toFixed(2)+'</span>'
                }

                if (item.original_price){
                    item.original_price = parseFloat(item.original_price).toFixed(2)
                }

                if (field && item[field]){
                    return item[field]+discount_string
                } else {
                    return item.total+discount_string
                }

            },

            groupByArray(xs, key) { return xs.reduce(function (rv, x) { let v = key instanceof Function ? key(x) : x[key]; let el = rv.find((r) => r && r.key === v); if (el) { el.values.push(x); } else { rv.push({ key: v, values: [x] }); } return rv; }, []); }

        }
    }

    module.exports = view
