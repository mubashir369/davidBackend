const db = require('../components/arango')
function addslashes (str){
    return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
}
const home_slider={



    find:(key) => {

        console.log(key,"kkkkkk")

        if (typeof key == 'object'){
            key = key['key']
        }  
     
        return new Promise(function(resolve, reject){
            console.log(key,"keyyy");
            db.query(`FOR a in home_CMS  RETURN a`, (data)=>{
                
                console.log(data,"daaaaa1")
                if(data){

                    resolve(data[0])
                }
              
          

            })
        })

    },
    getSingle: (data) => {
        console.log("inside get single slider");
        //console.log(key)
        console.log(data)
        return new Promise(function (resolve, reject) {
            db.query(`FOR a in home_CMS   RETURN NTH( a.sliders, '${data.key}' )`, (data) => {

                if (data.length>0) {
                    console.log(data,"daaata");                    
                    resolve(data[0])
                } else {
                    //console.log(data)
                    reject('Not found in portfo')
                }

            })
        })

    },
getAll:()=>{
 console.log("inside getall sliders");
    return new Promise(function(resolve, reject){
    
        db.query(`FOR a in home_CMS  RETURN a`, (data)=>{
            
            console.log(data[0],"daaaaa1")
            if(data){

                resolve(data[0])
            }
          
      

        })
    })


},

create:(data) => {
    console.log(data,"inside create")
  
    return new Promise(function(resolve, reject){
        db.query(`FOR a in home_CMS UPDATE a WITH {sliders:${JSON.stringify(data)}} IN home_CMS RETURN NEW`,
        (data)=>{
            console.log(data,"created data") 
            if (data.length > 0){
                //console.log(data)
                resolve(data[0])
            } else {
                //console.log(data)
                reject('Not found')
            }
        })
    })

},


    pushSlider: (key, data) => {
        console.log(data,"ssskillllll immmmmaaaageee0000000000");
        console.log(key);
        if (typeof key == 'object'){
            key = key['key']
        }  
        return new Promise(function (resolve, reject) {
            const query = `FOR a IN home_CMS  UPDATE a WITH  {sliders:APPEND(a.sliders,{"heading" : "${addslashes(data.heading)}","image" : "${data.image}","description":"${addslashes(data.description)}"})} IN home_CMS RETURN NEW`
           
            db.query(query, (data) => {
                console.log(data)
                if (data.length > 0) {
                    resolve(data)
                } else {
                    //console.log(data) 
                    reject('Not found')
                }
            })
        }) 

    },
    edit_slider:() => {
       
        return new Promise(function(resolve, reject){
            
            //const query = `UPDATE { "m_id": "8049824" } WITH ${JSON.stringify(data)} IN member_about RETURN NEW`
            // const query = `FOR doc IN home_CMS FILTER doc.slider UPDATE doc.slider[${data.index}] WITH ${JSON.stringify(data)} IN home_CMS RETURN NEW`
            //FOR doc IN banner FILTER doc.m_id == '${data.m_id}' UPDATE doc WITH
            const query =`FOR a in home_CMS   RETURN a`
            db.query(query, (data)=>{
                console.log(data,"dddtttaa")
                if (data.length > 0){                       
                    resolve(data[0])
                } else {
                    //console.log(data) 
                    reject('Not found')
                }
            })
        })

    },

    update_slider:(data) => {
        console.log("inside update slider query");
        return new Promise(function(resolve, reject){
         
      
            const query = `FOR doc IN home_CMS UPDATE doc WITH ${JSON.stringify(data)} IN home_CMS RETURN NEW`

            db.query(query, (data)=>{
                //console.log(data)
                if (data.length > 0){                       
                    resolve(data)
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

            db.query(`FOR a in home_CMS  RETURN a.sliders`, (sliderdata) => {

                if (sliderdata.length>0 && sliderdata[0].length>0) {  

                    sliderdata = sliderdata[0]                 

                    sliderdata[data.key] = {"heading" : data.heading,"image" : data.image,"description" : data.description}
                    //console.log(portdata)
                    //return;
                    const query = `FOR a IN home_CMS  UPDATE a WITH  {sliders:${JSON.stringify(sliderdata)}} IN home_CMS RETURN NEW`
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


    },
    delete: (data) => {
        console.log(data,"deldataa");

        return new Promise(function (resolve, reject) {
            const query = `FOR a IN home_CMS  UPDATE a WITH  {sliders:REMOVE_NTH(a.sliders,'${data.key}')} IN home_CMS RETURN NEW`

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



    }


}
module.exports=home_slider;