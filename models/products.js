
    const db = require('../components/arango'),
    salon_data = require('../models/salon'),
    collection = db.db.collection('products')

const product = {

  find:(key) => {
      console.log(key)

      return new Promise(function(resolve, reject){
          db.query('FOR p in products FILTER p._key == "'+key['id']+'" RETURN p', (data)=>{

              if (data.length > 0){
                  resolve(data)
              } else {
                  reject('Product '+key+' Not found')
              }

          })
      })

  },

  getbycat:(key,data) => {
      console.log(key)

      return new Promise(function(resolve, reject){
          console.log('FOR p in products FILTER (p.category == "'+parseInt(key['id'])+'" OR p.category == '+parseInt(key['id'])+') SORT p._updated DESC RETURN {_key:p._key,name:p.name,category:p.category}')
          db.query('FOR p in products FILTER (p.category == "'+parseInt(key['id'])+'" OR p.category == '+parseInt(key['id'])+') SORT p._updated DESC RETURN {_key:p._key,name:p.name,category:p.category}', (data)=>{

              console.log(data)

              if (data.length > 0){
                  resolve(data)
              } else {
                  reject('Product '+key+' Not found')
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
          db.query('FOR s in products '+filter_str+' RETURN s', (data)=>{

              console.log(data)

              if (data.length > 0){
                  resolve(data)
              } else {
                  reject('Product '+key['ids']+' Not found')
              }

          })
      })

  },

  list:() => {
      console.log('aaaa')

      return new Promise(function(resolve, reject){
          db.query('FOR p in products FILTER !p._deleted SORT p._updated DESC LIMIT 60 RETURN {_key:p._key,name:p.name}', (data)=>{

              if (data.length > 0){
                  resolve(data)
              } else {
                  reject('Products Not found')
              }

          })
      })

  },

  all:() => {
      console.log('aaaa')

      return new Promise(function(resolve, reject){
          db.query('FOR p in products FILTER !p._deleted SORT p._updated DESC LIMIT 60 RETURN p', (data)=>{

              if (data.length > 0){
                  resolve(data)
              } else {
                  reject('Products Not found')
              }

          })
      })

  },

  topten:() => {
      console.log('aaaa')

      return new Promise(function(resolve, reject){
          db.query('FOR p in products FILTER !p._deleted SORT p._created DESC LIMIT 10 RETURN p', (data)=>{

              if (data.length > 0){
                  resolve(data)
              } else {
                  resolve([])
              }

          })
      })

  },

  allPublic:(query) => {

      return new Promise(function(resolve, reject){

          let filter = '',
              limit = 30

          if (query){

              if (query.category){
                  filter += '&& LOWER(p.category) == "'+query.category.toLowerCase()+'" '
              }

              if (query.brand){
                  filter += '&& LOWER(p.brand) == "'+query.brand.toLowerCase()+'" '
              }

              if (query.search){
                  filter += '&& LOWER(p.keywords) =~ "'+query.search.toLowerCase()+'" '
              }

              if (query.limit){
                  limit = parseInt(query.limit)
              }
          }

          db.query('FOR p in products FILTER p.stock > 0 && !p.private && !p._deleted '+filter+'SORT p._updated DESC LIMIT '+limit+' RETURN p', (data)=>{

              resolve(data)

          })
      })

  },

  save:(data) => {

      if (!data._key){
          data._created = new Date().toISOString()
          data._updated = new Date().toISOString()
      } else {
          data._updated = new Date().toISOString()
      }

      return new Promise(function(resolve, reject){

          if (data.image && data.image.match(/^data:image\//) && data.name){

              if (!data.brand){
                  data.brand = ''
              }

              image.save(data.image, data.name+'-'+data.brand, 'products').then((filename)=>{
                  data.image = filename

                  db.query('UPSERT {_key:"'+data._key+'"} INSERT '+JSON.stringify(data)+' UPDATE '+JSON.stringify(data)+' IN products RETURN NEW', (data)=>{

                      if (data.length > 0){
                          resolve(data[0])
                      } else {
                          reject(data)
                      }

                  })
              })

          } else {
              db.query('UPSERT {_key:"'+data._key+'"} INSERT '+JSON.stringify(data)+' UPDATE '+JSON.stringify(data)+' IN products RETURN NEW', (data)=>{

                  if (data.length > 0){
                      resolve(data[0])
                  } else {
                      reject(data)
                  }

              })

          }

      })

  },

  search:(search)=>{

      let filter = ''

      return new Promise(function(resolve, reject){

          filter = 'p._key == "'+search.str+'" && !p._deleted || p.barcode == "'+search.str+'" && !p._deleted || LOWER(p.brand) =~ "'+search.str+'" && !p._deleted || LOWER(p.name) =~ "'+search.str+'" && !p._deleted || LOWER(p.description) =~ "'+search.str+'" && !p._deleted || LOWER(p.category) =~ "'+search.str+'"&& !p._deleted '

          if (search.str.length > 2){
              db.query('FOR p in products FILTER '+filter+' RETURN p', (data)=>{
                  resolve(data)
              })
          } else {
              resolve([])
          }
      })

  },

  inoutstock:(search)=>{

      let filter = ''

      return new Promise(function(resolve, reject){

          filter = ' p._key == "'+key+'" && ABS(p.stock) > 0 && !p._deleted'

          //if (search.str.length > 2){
              db.query('FOR p in products FILTER '+filter+' RETURN p', (data)=>{
                  if (data.length > 0){
                      resolve(data[0].stock)
                  } else {
                      resolve(false)
                  }
              })
          /*} else {
              resolve(false)
          }*/
      })

  },

  delete:(key) => {

      return new Promise(function(resolve, reject){

          db.query('FOR p IN products FILTER p._key == "'+key+'" UPDATE p WITH {_deleted:"'+moment().toISOString()+'"} IN products RETURN p', (data)=>{

              if (data.length > 0){
                  resolve(data)
              } else {
                  reject('Unable to delete Product '+key+': Not found')
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

          console.log(filter)

          let filter_str = 'LOWER(p.'+filter.field+') == "'+filter.value+'" && !p._deleted '

          if (!filter.value || filter.value && filter.value == 'none'){
              filter_str = '!HAS(p, "'+filter.field+'") || p.'+filter.field+' == ""'
          }

          if(filter.price_range){
              //filter_str += ' && p.price 5..25 '
          }

          //console.log(filter_str)                

          /*if((filter.sort_alpha || filter.sort_alpha && filter.sort_alpha == 'none') && (filter.sort_price || filter.sort_price && filter.sort_price == 'none')){
              filter_str += ' SORT p.name, p.price '
          }*/  
          // && p.price == ABS(25)
          if(filter.sort_price || filter.sort_price && filter.sort_price == 'none'){
              filter_str += ' SORT p.price '+filter.sort_price
          }else if(filter.sort_alpha || filter.sort_alpha && filter.sort_alpha == 'none'){
              filter_str += ' SORT p.name '+filter.sort_alpha
          }

          console.log(filter_str)

          db.query('FOR p IN products FILTER '+filter_str+' RETURN p', (data)=>{

              if (data.length > 0){
                  resolve(data)
              } else {
                  reject('No filter options found')
              }

          })

      })

  },

  mysearch:(filter)=>{
      return new Promise( async (resolve, reject) => {

          console.log('fillter',filter)

          if (!filter || typeof filter != 'object'){
              resolve([])
              return
          } 
          let filter_str = ''

          console.log(filter)
          
          let offset = 0

          if(filter.page){
              offset = filter.page * 12
          }

          if(Array.isArray(filter.category) && filter.category.length>0){

              filter.category.forEach(function (item, index) {
                  console.log(item,index)
                  if(index==0)
                   filter_str = '( LOWER(p.category) == "'+item+'"'
                  else
                   filter_str += ' || LOWER(p.category) == "'+item+'"'
              })

              filter_str += ' )'
          }/*else {

              filter_str = 'LOWER(p.'+filter.field+') == "'+filter.value+'"'

              if (!filter.value || filter.value && filter.value == 'none'){
                  filter_str = '!HAS(p, "'+filter.field+'") || p.'+filter.field+' == ""'
              }

          }*/

          if(Array.isArray(filter.brands) && filter.brands.length>0){

              if(filter_str!=="") filter_str += ' AND '

              filter.brands.forEach(function (item, index) {
                  console.log(item,index)
                  if(index==0)
                   filter_str += '( LOWER(p.brand) == "'+item+'"'
                  else
                   filter_str += ' || LOWER(p.brand) == "'+item+'"'
              })

              filter_str += ' )'
          }

          

          if (filter.str){

              filter.str = filter.str.toLowerCase()

              filter_str += (filter_str!==""?' && ':'')+' (LOWER(p.brand) like "%'+filter.str+'%" || p.brand like "%'+filter.str+'%"  || LOWER(p.name) like "%'+filter.str+'%" || p.name like "%'+filter.str+'%" )  '
              //filter_str += (filter_str!==""?' && ':'')+' (p._key like "%'+filter.str+'%"  || p.barcode like "%'+filter.str+'%"  || LOWER(p.brand) like "%'+filter.str+'%" || p.brand like "%'+filter.str+'%"  || LOWER(p.name) like "%'+filter.str+'%" || p.name like "%'+filter.str+'%"  || LOWER(p.description) like "%'+filter.str+'%" || p.description like "%'+filter.str+'%"  || LOWER(p.category) like "%'+filter.str+'%" || p.category like "%'+filter.str+'%" )  '

          }

          if (filter.stock && filter.stock>0){
              filter_str += (filter_str!==""?' && ':'')+' FLOOR(p.stock) > 0 '
          }else if(typeof filter.stock !== 'undefined' && typeof filter.stock !== 'string' && filter.stock == 0) {
              filter_str += (filter_str!==""?' && ':'')+' FLOOR(p.stock) == 0 '
          }

          if (filter.discount && filter.discount>0){
              filter_str += (filter_str!==""?' && ':'')+' FLOOR(p.discount) >= '+filter.discount
          }

          console.log('typeof filter.stock',typeof filter.stock)

                         

          

          if(filter.min_price && filter.max_price && filter.discount && filter.discount>0){
              filter_str += (filter_str!==""?' && ':'')+' (ABS(p.discounted) > '+filter.min_price+' && ABS(p.discounted) < '+filter.max_price+') '
          }else if(filter.min_price && filter.max_price){
              filter_str += (filter_str!==""?' && ':'')+' (ABS(p.price) > '+filter.min_price+' && ABS(p.price) < '+filter.max_price+' ) ' //&& (!p.discount || ABS(p.discount)==0)
          }


          if(filter_str!==""){
              filter_str = ' FILTER !p._deleted && p.sell_online!=false && '+filter_str
          }else filter_str = ' FILTER !p._deleted && p.sell_online!=false '


          if(filter.rating && filter.rating.length > 0 ){
            var filter_sub_str='';
            filter.rating.map((item)=>{
                filter_sub_str+=` p.rating== '${item}' ||`
            })
            filter_sub_str= filter_sub_str.substring(0, filter_sub_str.length - 2);
            filter_sub_str+=" )"
            filter_str += filter_str===''?` FILTER ${filter_sub_str}`:` && ( ${filter_sub_str}`
          }
          //console.log(filter_str)                

          /*if((filter.sort_alpha || filter.sort_alpha && filter.sort_alpha == 'none') && (filter.sort_price || filter.sort_price && filter.sort_price == 'none')){
              filter_str += ' SORT p.name, p.price '
          }*/  
          // && p.price == ABS(25)
          if(filter.sort_price || filter.sort_price && filter.sort_price == 'none'){
              filter_str += ' SORT p.price '+filter.sort_price
          }else if(filter.sort_alpha || filter.sort_alpha && filter.sort_alpha == 'none'){
              var myarr = filter.sort_alpha.split("_");
              console.log(myarr)
              if(myarr[0]=='p'){
                  if(filter.discount && filter.discount>0){
                      filter_str += ' SORT ABS(p.discounted) '+myarr[1]
                  }else filter_str += ' SORT ABS(p.price) '+myarr[1]
              }else if(myarr[0]=='r'){
                  filter_str += ' SORT ABS(p.rating) '+myarr[1]
              }else filter_str += ' SORT p.name '+filter.sort_alpha
          }

          console.log('FOR p IN products '+filter_str+' limit '+offset+', 12 RETURN p')

          db.query('FOR p IN products '+filter_str+' limit '+offset+', 12 RETURN p', (data)=>{

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
                  {value:'brand', text:'Brand'},
                  {value:'category', text:'Category'}
              ])

          } else {

              db.query('FOR p IN products filter !p._deleted COLLECT type = LOWER(p.'+type+') WITH COUNT INTO length RETURN {"type" : type, "value" : type, "count" : length}', async (data)=>{

                  if (data.length > 0){

                      if (type == 'category'){

                          let salon = await salon_data.find('54855602')
                        let total = 0
                          data = data.map((filter)=>{

                            console.log(filter)

                              if (parseInt(filter.value) && parseInt(filter.value) >= 0 && parseInt(filter.type) > 0){

                                  filter.type = salon.product_categories.find((cat)=>{
                                      return cat._id == filter.type
                                  })

                                  if (filter.type && filter.type.name){
                                      filter.value = filter.type._id
                                      filter.type = filter.type.name
                                  }else {

                                    filter.type = 'none'
                                    filter.value = ''
                                    total += filter.count

                                  }

                              }else {
                                  filter.type = 'none'
                                  filter.value = ''
                                  total += filter.count
                              }

                              return filter

                          })

                          

                          data = data.filter((val)=>val.type!=='none')

                          data.push({type:'none',value:'',count:total})
                          console.log(data, total)

                          resolve(data)

                      } else {
                          resolve(data)
                      }

                  } else {
                      resolve([])
                  }

              })

          }

      })

  },

  removeStock: (key, data, qty) => {

      return new Promise(function(resolve, reject){

          collection.document(key).then((doc)=>{

              if (typeof doc.stock != 'undefined'){
                  doc.stock = parseInt(doc.stock)-parseInt(qty)

                  if (doc.stock <= 0){

                      events.trigger('out_of_stock', doc)

                  } else if (doc.stock < 5){

                      events.trigger('low_stock', doc)

                  }

              }

              collection.update(doc,doc).then(()=>{
                  resolve(doc)
              }).catch(()=>{
                  reject('not found')
              })

          })

      })

  },
  addStock: (key, val) => {

      if (!val){
          val = '1'
      }

      return new Promise(function(resolve, reject){
          db.query('LET product = DOCUMENT("products/'+key+'") UPDATE product WITH { stock: product.stock + '+val+' } IN products RETURN NEW', (data)=>{

              if (data.length > 0){
                  resolve(data[0])
              } else {
                  reject('Not found')
              }

          })
      })

  },
  addToOrder: (data) => {

      return new Promise( async (resolve, reject) => {

          db.query('FOR p IN products FILTER p._key == "'+data._key+'" UPDATE p WITH { on_order: '+data.value+' } IN products RETURN NEW', (prod_data)=>{
              resolve(prod_data)
          })

      })

  },
  getCurrentCharge:()=>{
    return new Promise((resolve,reject)=>{
let q=`FOR p in products FILTER !p._deleted RETURN {vat:p.VAT,delivery:p.delivery_charge} `
let query1=`FOR p in charges FILTER p.type=="salon" RETURN p`
db.query(query1,(data)=>{
    console.log(data);
    resolve(data[0])
})

    })
  },
  
  updateCharge:(data)=>{
    return new Promise((resolve,reject)=>{
        let query1=`FOR p in charges FILTER p.type=="salon"  UPDATE p WITH ${JSON.stringify(data)} IN charges RETURN NEW`
        console.log("fdsdfdf",data);
        let query=`FOR p in products FILTER !p.deleted UPDATE p WITH `
        if(data.vat&&data.delivery){
            query+=`{ VAT: ${data.vat},delivery_charge:${data.delivery} } IN products RETURN NEW`
        }else if(data.vat&&!data.delivery){
            query+=`{ VAT: ${data.vat}} IN products RETURN NEW`
        }else if(!data.vat&&data.delivery){
            query+=`{ delivery_charge:${data.delivery} } IN products RETURN NEW` 
        }else{
            resolve("please Enter Updated Value")
        }
      
        db.query(query1,(data)=>{
            resolve("success")
        })
    })
  },
  getSalonCharges:()=>{
    return new Promise((resolve,reject)=>{
        let q=`FOR p in charges FILTER p.type=="salon" RETURN {vat:p.vat,delivery:p.delivery,status:p.status}`
  db.query(q,(data)=>{
    resolve(data)
  })
    })
  }

}

module.exports = product
