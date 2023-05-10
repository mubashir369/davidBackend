//
// Dashboard Module
// Includes functions and tools for all users
//

// vars

var express = require('express'),
home_slider = require('../../models/home_slider'),
    home_services= require('../../models/home_services'),
    home_about_us = require('../../models/home_about_us'),
    why_choose_us= require('../../models/whyChooseUs'),
    routes = express.Router(),
    dashbord_contr=require('../../models/home_about_us'),
    member = require('../../models/members.js'),
    admin = require('../../models/admins.js'),
    cafeproducts=require('../../models/cafeproducts'),
    products=require('../../models/products'),
    db = require(config.db_connector),


    settings = {
        default_route: 'dashboard',
        views:'dashboard/views',
        protected_guards:['admin','staff'],
        menu: {
            nav: [{link:'Dashboard',slug: '/salon', protected_guards:['staff','admin']}],
        },

        includes: [
            {name:'epos',path:'epos.js'},
            {name:'calendar',path:'calendar.js'},
            {name:'clients',path:'clients.js'},
            {name:'reports',path:'reports.js'},
            {name:'salon',path:'salon.js'},
            {name:'foodcafe',path:'foodcafe.js'},
            {name:'promo',path:'bulk_email.js'}
        ]
    }

const path = require('path')
const multer = require('multer')
const salon = require('../../models/salon')
const uploadstorage = multer.diskStorage({
    destination: 'public/images/homeSliders/',
    filename: (req, file, cb) => {

        cb(null, file.fieldname + '_' + Date.now() +
            path.extname(file.originalname))

    }

}) 
const upload = multer({
    storage: uploadstorage
})
 
const iconStorage = multer.diskStorage({
    destination: 'public/images/homeServices/',
    filename: (req, file, cb) => {

        cb(null, file.fieldname + '_' + Date.now() +
            path.extname(file.originalname))

    }

})

const uploadIcon =multer({
    storage:iconStorage
})

const whyIconStorage = multer.diskStorage({
    destination: 'public/images/whyIcons/',
    filename: (req, file, cb) => {

        cb(null, file.fieldname + '_' + Date.now() +
            path.extname(file.originalname))

    }

}) 
const uploadWhyIcons = multer({
    storage: whyIconStorage
})



const ServiceStorage = multer.diskStorage({ 
    destination: 'public/images/homeServices/',
    filename: (req,file,cb) => {
        console.log(file.fieldname)
        cb(null, file.fieldname + '_' + Date.now() + 
        path.extname(file.originalname))
    }
})
const uploadServiceImage = multer({
    storage: ServiceStorage
})
// methods

    functions = {



    }


// routes

    routes.get('*', (req, res, next) => {
        console.log(req.session.user.guard)
        if(req.session && (new Date().getTime() - new Date(req.session.startTime).getTime())/60000 >10 ){
            console.log("logged out Due to in-activity for 10 min ")
            
            if(req.session.user.guard==='admin'){
                req.session.destroy()
            return res.redirect('/login/admin')  
            }          
           else if(req.session.user.guard==='member'){
            req.session.destroy()
            return res.redirect('/login/member')  
            }          
           else {
            req.session.destroy()
            return res.redirect('/login/staff')  
            }          

        }
        else{
            req.session.startTime=new Date();
        }

        res.set({
            'Cache-Control': 'private, max-age=0, proxy-revalidate, s-maxage=0',
            'Pragma' : 'no-cache',
            'Expires' : '0',
            'Vary': '*'
        })

        if (req.session && req.session.user && req.session.user._key){
            next()
        } else {
            res.redirect('/login/staff')
        }
    })

    routes.get('/', (req, res) => {
        res.render(settings.views+'/index.ejs',req.session)
    })

    routes.get('/member-profile', (req, res) => {
        view.dashboard_view = 'profile'
        res.render(settings.views+'/profile.ejs',req.session)
    })

    routes.get('/slider', async(req, res) => {
    view.dashboard_view = 'slider'
    let data = { 
        title: "Slider",
        user: req.session.user,
        include_scripts: [settings.views + '/scripts/purchase_seats_script.ejs']
    }
 

    let home_CMS = await home_slider.find({key:req.session.user._key})
    //console.log(home_CMS.sliders,"ssssssssssssssssss");
    if(home_CMS && home_CMS.sliders!== undefined){
       
        data.allsliders= home_CMS.sliders
    }
    else{
        data.allsliders=[]
    }
    console.log(data,"daata after adding slider");
    res.render(settings.views + '/slider.ejs', data)

})
    routes.get('/home_service',async (req, res) => {
    view.dashboard_view = 'home_service'   
    let data = {
        title: "Service", 
        user: req.session.user,
        include_scripts: [settings.views + '/scripts/purchase_seats_script.ejs']
    }
    let home_CMS = await home_services.find({key:req.session.user._key})
    //console.log(home_CMS,"hooommee");
    //console.log(home_CMS.services,"seeeeee");
    data.allServices=home_CMS && home_CMS.services?home_CMS.services:[]
    console.log(data,"ddddddd");
    res.render(settings.views + '/home_service.ejs', data)
})
routes.get('/home_about',async(req, res) => {
    view.dashboard_view = 'home_about'
    let data = {
        title: "About / Why Choose Us",
        user: req.session.user,
        include_scripts: [settings.views + '/scripts/purchase_seats_script.ejs']
    }

    const home_CMS = await home_about_us.find()   
    if(home_CMS && home_CMS.about_us !== undefined ){
        data.aboutdetails = home_CMS.about_us
    }else{
        data.aboutdetails=''
    }
    if(home_CMS && home_CMS.why_choose_us!== undefined){ 
        data.why_choose_details= home_CMS.why_choose_us
    }else{
        data.why_choose_details=''
    }


    res.render(settings.views + '/home_about.ejs', data)
})
routes.get('/home_page_CMS',async(req, res) => {
    try{
    view.dashboard_view = 'home_CMS'
    let data = {
        title: "home CMS",
        user: req.session.user,
        include_scripts: [settings.views + '/scripts/purchase_seats_script.ejs']
    }
     // will update the fetch methord when getting data..
     data.topPanel = await home_about_us.getAbout1({type:"topPanel"})   
     data.section1 = await home_about_us.getAbout1({type:"section1"})   
     data.section2 = await home_about_us.getAbout1({type:"section2"})    
     data.section3 = await home_about_us.getAbout1({type:"section3"})   
     data.section4 = await home_about_us.getAbout1({type:"section4"})   
     data.section5 = await home_about_us.getAbout1({type:"section5"})   
     data.section6 = await home_about_us.getAbout1({type:"section6"})   
    res.render(settings.views + '/home_cms_new.ejs', data)
}catch(e) {
    res.render("../layouts/error.ejs");
}
})
routes.get('/join_Us_CMS',async(req, res) => {
    try{
    view.dashboard_view = 'home_CMS'
    let data = {
        title: "Join Us",
        user: req.session.user,
        include_scripts: [settings.views + '/scripts/purchase_seats_script.ejs']
    }
     // will update the fetch methord when getting data..
     data.section1 = await home_about_us.getAbout1({type:"joinUs"})   
    res.render(settings.views + '/joinUsCms.ejs', data)
}catch(e) {
    res.render("../layouts/error.ejs");
}
})
routes.get('/service_cms',async(req, res) => {
    try{
        view.dashboard_view = 'Service Categories'
        res.locals.functions = functions

        let data = {
            title: "Service Categories CMS",
            user:req.session.user,
            include_scripts: [settings.views+'/scripts/salon.ejs']
        }
        data.salon = await salon.find('54855602')


        res.render(settings.views+'/service_cms.ejs', data)
}catch(e) {
    res.render("../layouts/error.ejs");
}
})

routes.get('/profile',async(req, res) => {
    try{
        
    view.dashboard_view = 'profile'
    let data = {
        title: "Profile",
        user: req.session.user,
        include_scripts: [settings.views + '/scripts/purchase_seats_script.ejs']
    } 
     data.isSaved=req.query.saved || false;
    res.render(settings.views + '/profile.ejs', data)
}catch(e) {
    res.render("../layouts/error.ejs");
}
})

routes.post('/save-profile', async (req, res) => {
    let data = req.body?req.body:{}
    console.log(data)
    admin.changePassword(req.body).then(async (data)=>{            
        setTimeout(()=>{
            
            res.redirect('/dashboard/profile?saved=true');
        }, 1000)
    }).catch((err)=>{
        console.log(err)
        res.render('../layouts/error.ejs')
    })


})

routes.get('/about', async(req, res) => {
    
    view.dashboard_view = 'about'
    const data1 =  await dashbord_contr.getAbout1({type:"whoWeAre"})
    const data2 = await dashbord_contr.getAbout1({type:"timeline"})
    console.log(data1,data2,'IN ABOUT')
    let data = {
        title: "About",
        user: req.session.user,
        data1:data1,
        data2:data2,
        include_scripts: [settings.views + '/scripts/purchase_seats_script.ejs']
    }
    //console.log(data.data1,data.data2,'IN ABOUT')
    res.render(settings.views + '/about.ejs', data)
})
routes.get('/enquiry', async (req, res) => {
    let start=parseInt(req.query.start) || 0;
    let limit=parseInt(req.query.limit) || 10;
    view.dashboard_view = 'Enquiry'
    let data = {
        title: "Enquiry",
        user:req.session.user,
        include_scripts: [settings.views+'/scripts/enquiry.ejs']
    }
     data.member = await member.getEnquiry({"start":start,"limit":10})
    // console.log(data)
    res.render(settings.views+'/enquiry.ejs',data)
})
routes.get('/wallet', async (req, res) => {

    view.dashboard_view = 'Wallet'
    let data = {
        title: "Wallet",
        user:req.session.user,
        // include_scripts: [settings.views+'/scripts/new_appointment.ejs']
    }
    data.wallet = await dashbord_contr.getAboutbackend({"type":"wallet"})
    
     data.food = parseInt(data.wallet.foodWallet)
     data.product = parseInt(data.wallet.productWallet)
     data.service = parseFloat(data.wallet.serviceWallet).toFixed(2)
    res.render(settings.views+'/wallet.ejs',data)
})
routes.get('/blogs', (req, res) => {
    view.dashboard_view = 'blogs'
    let data = {
        title: "Blog List",
        user: req.session.user,
        include_scripts: [settings.views + '/scripts/purchase_seats_script.ejs']
    }
    res.render(settings.views + '/blogs.ejs', data)
})

    
    routes.get('/appointments', (req, res) => {
        view.dashboard_view = 'appointments'
        res.render(settings.views+'/appointments.ejs',req.session)
    })


routes.post('/slider', async (req, res) => {
    console.log(req.body,"dddd");

    const m_id = req.session.user._key    
    
   
    const home_CMS = await home_slider.find({ key: req.session.user._key })
    //console.log(home_CMS.sliders,"ssssssssssssssssssllllllliiiiiddddeeee");
    if (home_CMS && home_CMS.sliders!== undefined && home_CMS.sliders.length>0 ) {
     

            const data = {
                heading : req.body.heading,
                description : req.body.description,
                image : req.body.sliderImage
            }
            result = await home_slider.pushSlider(m_id,data)
            console.log(result,"ressssuulltt");
            if(result){
              
                res.redirect('/dashboard/slider')  
            }
        
    } else {
        
        data= [{
            heading : req.body.heading,
            description : req.body.description,
            image : req.body.sliderImage
        }]   
          
        console.log("inside else");
        console.log(data,"data inside else");
        const result = await home_slider.create(data)
        console.log(result,"ressssss");
        if(result){
            //window.alert('Slider added succesfully')   
            res.redirect('/dashboard/slider')
            setTimeout(()=>{  res.redirect('/dashboard/slider') }, 2000)
         }
    }


})

routes.post('/addSlider', async (req, res) => {
 
    console.log(req.body,"bddddddd"); 
    const m_id = req.session.user._key
    
   
    const home_CMS = await home_slider.find({ key: req.session.user._key })
    console.log(home_CMS.sliders,"ssssssssssssssssssllllllliiiiiddddeeee");
    if (home_CMS.sliders!== undefined &&home_CMS.sliders.length>0 ) {
     
      
            const data = {
                heading : req.body.heading,
                description : req.body.description,
                image : req.body.sliderImage
            }
            result = await home_slider.pushSlider(m_id,data)
            console.log(result,"ressssuulltt");
            if(result){
                res.redirect('/dashboard/slider')  
            }
        
    } else {
        
            data= [{
                heading : req.body.heading,
                description : req.body.description,
                image : req.body.sliderImage
            }]   
          
        console.log("inside else");
        console.log(data,"data inside else");
        const result = await home_slider.create(data)
        console.log(result,"ressssss");
        if(result){
            res.redirect('/dashboard/slider')
         }
    }


})





routes.post('/home_services', async (req, res) => {
    console.log(req.body,"req dot body");
   
    const m_id=req.session.user._key    
    console.log(m_id,"keyyyyyyyyy of admin");
    const homeCMS= await  home_services.find(req.session.user._key)
    console.log(homeCMS,"hhhhhhhhhhhhhhhh");  
    const services= homeCMS.services
    if(services){
        console.log("services more than zero");
        const data = {
            service_name:req.body.service_name,
            image:req.body.serviceImage,
            service_description:req.body.service_description    
        }
        result = await  home_services.pushService(m_id,data)
        console.log(result,"ressssuulltt");
        if(result){ 
            res.redirect('/dashboard/home_service')  
        }

 

    }
    else{
            console.log("inside else part of add home service"); 
        data= [{
            service_name:req.body.service_name,
            image:req.body.serviceImage,
            service_description:req.body.service_description    
        }]
        const result = await home_services.create(m_id,data)
        if(result){
            res.redirect('/dashboard/home_service')
         }
    }

})



routes.post('/serviceImage',uploadIcon.single('img'),(req,res)=>{
    console.log("inside add image route service");
    console.log(req.file,"fffiillleeee");
    if(req.file !== undefined){
        console.log("not undefined");
        res.send(req.file)

    }
    else{ 
        res.send('file not saved')
    }
})


routes.post('/sliderImage',upload.single('img'),(req,res)=>{
    console.log("inside slider image upload");  
     if(req.file !== undefined){
        res.send(req.file)
    }
    else{
        res.send('file not saved')
    }
})


routes.post('/addAboutUs',async(req,res)=>{

console.log(req.body,"bodddyyy");
try {
    const data={}
   
   
    if(req.body.heading !== '')
        data.heading = req.body.heading
    if(req.body.sub_heading !== '')
        data.sub_heading = req.body.sub_heading
    if(req.body.description !== '')
        data.description = req.body.description 
    if(req.body.button_text !=='')
        data.button_text = req.body.button_text          
    console.log(data,"data comming from post")
    const home_CMS= await home_about_us.find()
    console.log(home_CMS.about_us,"lengthttttt");
  
    if(home_CMS.about_us!==undefined && home_CMS.about_us.length>0){

        console.log(data)
        result = await home_about_us.update_about(m_id,data)
    }else{   
        console.log(data,"mid and data")  
        console.log("inside else");        
        result = await home_about_us.create(data)
        if(result){
            res.redirect('/dashboard/home_about') 
        }
    }
                
                 
    } catch (error) {
        console.log(error)
    }       

})

routes.post('/whyIcons',uploadWhyIcons.single('img'),(req,res)=>{
    console.log("inside slider image upload");  
     if(req.file !== undefined){
        res.send(req.file)
    }
    else{
        res.send('file not saved')
    }
})
routes.get('/cafe_charges',async(req,res)=>{
    try{
    view.dashboard_view = 'cafeCharge'
    let data = {
        user:req.session.user,
        title: "Food Cafe Products",
        appointments:[],
        selected_date: "Today",
        include_scripts: [settings.views+'/scripts/charges.ejs'],
        mini_menu: false
    }
    // data.include_scripts= [settings.views+'/scripts/foodCafe.ejs']
   let charge=await cafeproducts.getCurrentCafeCharge()
  data.eatInVat=charge.eatInVat||0
  data.takeawayVat=charge.takeawayVat||0
  data.delivery=charge.delivery||0
  data.status=charge.status
    res.render(settings.views+'/charges_cafe_products.ejs',data)
}catch(e){
    console.log(e)
    res.render('../layouts/error.ejs')
}
})
routes.get('/salon_charges',async(req,res)=>{
    view.dashboard_view = 'salonCharge'
    let data = {
        user:req.session.user,
        title: "Salon Products",
        appointments:[],
        selected_date: "Today",
        include_scripts: [settings.views+'/scripts/charges.ejs'],
        mini_menu: false
    }
    // data.include_scripts= [  settings.views+'/scripts/foodCafe.ejs']
   let charge=await products.getCurrentCharge()
  data.vat=charge.vat||0
  data.delivery=charge.delivery||0
  data.status=charge.status
    res.render(settings.views+'/charges_salon_products.ejs',data)
})
routes.post('/addWhyChooseUs',async(req,res)=>{

console.log(req.files,"request dot filee");
console.log(req.body,"bodddddyyyy");

const home_CMS= await home_about_us.find()
console.log(home_CMS.why_choose_us,"lengthttttt");

if(home_CMS.why_choose_us!==undefined){
    console.log("not undefinnnnnnnneeeeed");
const why = home_CMS.why_choose_us
    
    let data={
        heading:why.heading,
        sub_heading:why.sub_heading,
        description:why.description,
        icon1:{
                iconImage:why.icon1.iconImage,
                countervalue:why.icon1.countervalue,
                counter_text:why.icon1.counter_text
              },
        icon2:{
            iconImage:why.icon2.iconImage,
            countervalue:why.icon2.countervalue,
            counter_text:why.icon2.counter_text
              },
        icon3:{
            iconImage:why.icon3.iconImage,
            countervalue:why.icon3.countervalue,
            counter_text:why.icon3.counter_text
              }
    }
    console.log(data,"daaata fetchedddddd");



    if(req.body.heading!==''){
        data.heading = req.body.heading
        }
        if(req.body.sub_heading!==''){
        data.sub_heading=req.body.sub_heading
        }
        if(req.body.description!==''){
        data.description=req.body.description
        }
        if(req.body.icon_1!==''){
        data.icon1.iconImage=req.body.icon_1
        }
        if(req.body.countervalue1!==''){
        data.icon1.countervalue= req.body.countervalue1
        }
        if(req.body.counter_text1!==''){
        data.icon1.counter_text=req.body.counter_text1
        }
        
        if(req.body.icon_2!==''){
        data.icon2.iconImage=req.body.icon_2
        }
        if(req.body.countervalue2!==''){
        data.icon2.countervalue= req.body.countervalue2
        }
        if(req.body.counter_text2!==''){
        data.icon2.counter_text=req.body.counter_text2
        }
        
        if(req.body.icon_3!==''){
        data.icon3.iconImage=req.body.icon_3
        }else{
        
        }
        if(req.body.countervalue3!==''){
        data.icon3.countervalue= req.body.countervalue3
        }
        if(req.body.counter_text3!==''){
        data.icon3.counter_text=req.body.counter_text3
        }
console.log(data,"data after adding");
const result = await why_choose_us.create(data)
if(result){
console.log(result,"resssss");
res.redirect("/dashboard/home_about")
}



}

else{
    let data={
        heading:'',
        sub_heading:'',
        description:'',
        icon1:{
                iconImage:'',
                countervalue:'',
                counter_text:''
              },
        icon2:{
                iconImage:'',
                countervalue:'',
                counter_text:''
              },
        icon3:{
                iconImage:'',
                countervalue:'',
                counter_text:''
              }
}
if(req.body.heading!==undefined){
data.heading = req.body.heading
}
if(req.body.sub_heading!==undefined){
data.sub_heading=req.body.sub_heading
}
if(req.body.description!==undefined){
data.description=req.body.description
}
if(req.body.icon_1!==undefined){
data.icon1.iconImage=req.body.icon_1
}
if(req.body.countervalue1!==undefined){
data.icon1.countervalue= req.body.countervalue1
}
if(req.body.counter_text1!==undefined){
data.icon1.counter_text=req.body.counter_text1
}

if(req.body.icon_2!==undefined){
data.icon2.iconImage=req.body.icon_2
}
if(req.body.countervalue2!==undefined){
data.icon2.countervalue= req.body.countervalue2
}
if(req.body.counter_text2!==undefined){
data.icon2.counter_text=req.body.counter_text2
}

if(req.body.icon_3!==undefined){
data.icon3.iconImage=req.body.icon_3
}else{

}
if(req.body.countervalue3!==undefined){
data.icon3.countervalue= req.body.countervalue3
}
if(req.body.counter_text3!==undefined){
data.icon3.counter_text=req.body.counter_text3
}





const result = await why_choose_us.create(data)
if(result){
console.log(result,"resssss");
res.redirect("/dashboard/home_about")
}


}



})

// export

    module.exports = functions
    module.exports.routes = routes
    module.exports.settings = settings
