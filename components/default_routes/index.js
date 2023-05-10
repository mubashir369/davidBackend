//
// Default Routes
// Includes functions and tools for all users
//


// vars

var express = require('express'),
    routes = express.Router(),
    bodyParser = require("body-parser"),
    db = require(global.config.db_connector)
    const path = require('path')
    const multer  = require('multer')
    const pdf = require("html-pdf")
    const ejs = require("ejs")
    const aws = require("aws-sdk");
    const multerS3 = require("multer-s3");
    const PDFDocument = require('pdfkit');
    const { Readable } = require('stream');
    const { Parser } = require('json2csv');
    // const config=require("../../config")
    const svgToPdf = require('svg-to-pdfkit');
    const uploadstorage = multer.diskStorage({ 
        destination: 'uploads/',
        filename: (req,file,cb) => {
            //console.log(file.fieldname)
            cb(null, file.fieldname + '_' + Date.now() + 
            path.extname(file.originalname))
        }
    })

    let member_subscriptions= require('../../models/member_subscriptions');
    let transaction= require('../../models/transactions');
    let customers= require('../../models/customers');
    let appointments= require('../../models/appointments');
    let Salon= require('../../models/salon');
    let cafeproducts= require('../../models/cafeproducts');
    let reports= require('../../models/reports');
    // let logo=require("../../public/icons/DR_Logo.png")
    let member_transactions=require('../../models/member_transactions')
const config = require('../../modules/config')


    const stripe = require('stripe')(config.stripe_secret_key);


    const upload = multer({
        storage: uploadstorage
    })

    const uploadstorage2 = multer.diskStorage({ 
        destination: 'public/images/banners/',
        filename: (req,file,cb) => {
            //console.log(file.fieldname)
            cb(null, file.fieldname + '_' + Date.now() + 
            path.extname(file.originalname))
        }
    })
    const banner = multer({
        storage: uploadstorage2
    })

    settings = {
        default_route: 'root',
        views: 'default_routes/views',
        menu: {
            //nav: [{link:'Home',slug:'/'}]
        }
    }


// methods

    functions = {



    }


// routes

    routes.use('default_routes/static', express.static(__dirname + '/static'))

    routes.get('*',(req, res, next)=>{
        view.current_view = 'home'
        next()
    })

    routes.get('/', (req, res) => {

        if (req.headers && typeof req.headers.host == 'string' && !req.headers.host.match('salonstream')){
            res.redirect('/book')
        } else {
            if (!req.session || !req.session.user){
                res.redirect('/login/staff')
            } else if (req.session.user && req.session.user.guard && req.session.user.guard.match(/staff|admin/)){
                res.redirect('/dashboard/calendar')
            } else {
                res.redirect('/login')
            }
        }

    })
    routes.get("/default_routes/generateReportMemberOrder", async (req, res) => {
try {
 
  const data1 = await member_transactions.findByTransaction(req.query.id)
  var name="Salon Product Invoice"
  var text ="Salon Product Invoice"
  var fileName ="invoice_salon.ejs"
  var data2='';
  var data3='';
  var salon = await Salon.getBasicDetail();
  let options = {
    "height": "11.25in",
    "width": "8.5in",
    "header": {
        "height": "20mm"
    },
    "footer": {
        "height": "20mm",
    },
};
  let html= await ejs.renderFile(`components/default_routes/views/invoice2.ejs`,{text:text,data:data1,cust:req.query,data2:data2,data3:data3,salon:salon}, { async: true })

  pdf.create(html, options).toFile(name,async function  (err, data) {
    if (err) {
      
        res.send(err);
        return
    } else {
      
       res.download(`./${name}`)
        // res.send("File created successfully");
    }
});
} catch (error) {
  console.log(error);
}
    })
    routes.get("/default_routes/generateReport", async (req, res) => {
      try{
      const data1 = await transaction.findByTransaction(req.query.id)
      var data2='';
      
      var name = req.query.text==='Foodcafe Product Invoice'?`${req.query.id}_product_invoice.pdf`:req.query.text==='Salon Product Invoice'?`${req.query.id}_salon_invoice.pdf`:
      req.query.text==='Service Booking Invoice'?`${req.query.id}_service_invoice.pdf`:'report.pdf'
      var fileName = req.query.text==='Foodcafe Product Invoice'?`invoice_food.ejs`:req.query.text==='Salon Product Invoice'?`invoice_salon.ejs`:
      req.query.text==='Service Booking Invoice'?`invoice_service.ejs`:'report.pdf'
      var text=req.query.text
      if(data1[0].customer_id !== undefined){
        data2=await customers.findByKey(data1[0].customer_id)
      }
      var data3='';
      if(req.query.appointment !== undefined){
        data3=await appointments.findByKey(req.query.appointment)
      }
      var salon = await Salon.getBasicDetail();
      let options = {
        "height": "11.25in",
        "width": "8.5in",
        "header": {
            "height": "20mm"
        },
        "footer": {
            "height": "20mm",
        },
    };
    
    data2.logo= `${config.imageUrl}/static/media/logo.04c980ce365d2880c4f1f640e3ea806a.svg`
 
     let html= await ejs.renderFile(`components/default_routes/views/${fileName}`,{text:text,data:data1,cust:req.query,data2:data2,data3:data3,salon:salon}, { async: true })
    
         
          console.log('check data: ' ,req.query)
  
           pdf.create(html, options).toFile(name,async function  (err, data) {
              if (err) {
                
                  res.send(err);
                  return
              } else {
                
                 res.download(`./${name}`)
                  // res.send("File created successfully");
              }
          });    
}catch(e){
  console.log(e.message);
}
  })
  routes.get("/default_routes/downloadQr",async(req,res)=>{
    try {
      const data=await cafeproducts.getTable(req.query._key)
      let options = {
        "height": "11.25in",
        "width": "8.5in",
        "header": {
            "height": "20mm"
        },
        "footer": {
            "height": "20mm",
        },
    };
    let name=`qr-code.pdf`
    let html= await ejs.renderFile(`components/default_routes/views/qrCode.ejs`,{qrcode:data[0].qrcode,tableNumber:data[0].tableNumber}, { async: true })
    pdf.create(html, options).toFile(name,async function  (err, data) {
      if (err) {
        
          res.send(err);
          return
      } else {
        
         res.download(`./${name}`)
          // res.send("File created successfully");
      }
  }); 
    } catch (error) {
      console.log(error);
    }
  } )

    routes.get("/default_routes/downloadQr1", async (req, res) => {
      try{
       
        const data=await cafeproducts.getTable(req.query._key)
        res.contentType("application/pdf");
res.setHeader('Content-disposition', 'attachment; filename=qr-code.pdf');

const doc = new PDFDocument();
doc.pipe(res);

const imageBuffer = Buffer.from(data[0].qrcode.split(",")[1], 'base64');
// const svg = fs.readFileSync('../../public/icons/DR_Logo.png', 'utf-8');
// const pdf = svgToPdf(doc, svg, 0, 0);
// Increase the text size
doc.lineWidth(2);
doc.fontSize(20);
doc.text(`Table : ${data[0].tableNumber}`, {align: 'center'});
const pageWidth = doc.page.width;
const pageHeight = doc.page.height;

// const c = (pageWidth - 100) / 2;
// const d = (pageHeight - 100) / 5;
// doc.rect(c - 10, d - 10, 100 + 20, 100 + 20).stroke();
// doc.image("../../public/icons/DR_Logo.png", c, d, {width: 100, height: 100, format: 'png'});
// const pageWidth = doc.page.width;
// const pageHeight = doc.page.height;

const x = (pageWidth - 200) / 2;
const y = (pageHeight - 200) / 2;

// Add a border around the QR code image
doc.rect(x - 10, y - 10, 200 + 20, 200 + 20).stroke();
doc.image(imageBuffer, x, y, {width: 200, height: 200, format: 'png'});

doc.rect(50, 30, 500, 600).stroke();

doc.end();  
}catch(e){
  console.log(e.message);
}
  })


routes.get('/default_routes/report', async (req, res) => {

   
try{
// Create an array of objects representing the data to be exported
var data=[];
console.log(req.query.reportType)
if(req.query.reportType==='foodCaffeSales'){
  data = await reports.foodCaffeSales(req.query.type)
}
else if(req.query.reportType==='customers'){
  data = await reports.customers(req.query.type,req.query._key)
}
else if(req.query.reportType==='products'){
  data = await reports.products(req.query.type)
}
else if(req.query.reportType==='member_commission'){
  data = await reports.member_commission(req.query.type,req.query._key)
}
else{
  data = await reports.getSalonOrServiceProviderEarning(req.query.type,req.query._key)
}
if(data.length===0){
  
}
// Convert the data to a CSV string using json2csv
const json2csvParser = new Parser({ header: true });
const csvString = json2csvParser.parse(data);

// Set the content type and attachment headers
res.setHeader('Content-Type', 'text/csv');
res.setHeader('Content-Disposition', 'attachment; filename=data.csv');

// Create a Readable stream from the CSV string
const stream = new Readable();
stream.push(csvString);
stream.push(null);

// Pipe the stream to the response object
stream.pipe(res);

}catch(e){
  res.status(400).json({
    "code":"Not Enough Data"
  })
}

})

    routes.post('/post',upload.single('img'), (req, res) => {


        console.log("inside posssssssssssssstttttttttt");
        //console.log(typeof(req.file))
        if(req.file !== undefined){
            //console.log(req.file)
            res.send(req.file)
        } else {    
            res.send('no file')
        }
    })

    // This is your Stripe CLI webhook secret for testing your endpoint locally.
    const endpointSecret = "whsec_b33560c10cc18f3838a4364c8468e18f22c352e951a4598556c7fd38807005d0";

    routes.post('/webhook', express.raw({type: 'application/json'}), (request, response) => {


        const payload = request.body
        const sig = request.headers['stripe-signature']
        const payloadString = JSON.stringify(payload, null, 2);
        const secret = 'whsec_hii7Sx8cV4AHNTCurZ5Vj48YAG1aNVKD';
        const header = stripe.webhooks.generateTestHeaderString({
                payload: payloadString,
                secret,
        });
        
         let event;
         try {
              event = stripe.webhooks.constructEvent(payloadString, header, secret);
        
         } catch (err) {
                console.log(`Webhook Error: ${err.message}`)
                return res.status(400).send(`Webhook Error: ${err.message}`);
         }



        //whsec_hii7Sx8cV4AHNTCurZ5Vj48YAG1aNVKD
        /*console.log(request.headers, request.rawBody, request.body)
      const sig = request.headers['stripe-signature'];

      let event;

      try {
        event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
      } catch (err) {
      console.log(`Webhook Error: ${err.message}`)
        response.status(400).send(`Webhook Error: ${err.message}`);
        return;
      }*/

      console.log('---type',event.type)

      let subscriptionSchedule

      // Handle the event
      switch (event.type) {

        case 'customer.subscription.created':
        //subscriptionSchedule = event.data.object;
          member_subscriptions.subscription_created(event)
        // Then define and call a function to handle the event subscription_schedule.canceled
        break;

        case 'customer.subscription.deleted':
        //subscriptionSchedule = event.data.object;
          member_subscriptions.cancel_subscription(event)
        // Then define and call a function to handle the event subscription_schedule.canceled
        break;


        case 'customer.subscription.updated':
        //subscriptionSchedule = event.data.object;
            console.log('customer.subscription.updated---customer.subscription.updated')
          member_subscriptions.updatecycle(event)
        // Then define and call a function to handle the event subscription_schedule.canceled
        break;



        case 'subscription_schedule.aborted':
          //subscriptionSchedule = event.data.object;
          // Then define and call a function to handle the event subscription_schedule.aborted
          break;
        case 'subscription_schedule.canceled':
          //subscriptionSchedule = event.data.object;
            member_subscriptions.cancel_subscription(event)
          // Then define and call a function to handle the event subscription_schedule.canceled
          break;
        case 'subscription_schedule.completed':
          //subscriptionSchedule = event.data.object;
            //member_subscriptions.updatecycle(event.data.object)
          // Then define and call a function to handle the event subscription_schedule.completed
          break;
        case 'subscription_schedule.created':
          //subscriptionSchedule = event.data.object;
            member_subscriptions.subscription_schedule_created(event)
            //member_subscriptions.subscription_created(event.data.object)
          // Then define and call a function to handle the event subscription_schedule.created
          break;
        case 'subscription_schedule.expiring':
          //subscriptionSchedule = event.data.object;
          // Then define and call a function to handle the event subscription_schedule.expiring
          break;
        case 'subscription_schedule.released':
          //subscriptionSchedule = event.data.object;
            //member_subscriptions.updatecycle(event)
          // Then define and call a function to handle the event subscription_schedule.released
          break;
        case 'subscription_schedule.updated':
          //subscriptionSchedule = event.data.object;
          // Then define and call a function to handle the event subscription_schedule.updated
          break;
        // ... handle other event types
        default:
          console.log('');
      }

      // Return a 200 response to acknowledge receipt of the event
      response.send();
    });
    const ImageUpload = async (file_attribute_name, single_image_flag, multiple_image_count = 15) => {
        console.log("ImageUpload", file_attribute_name, single_image_flag)
        const spacesEndpoint = new aws.Endpoint("dvdrom.digitaloceanspaces.com");
        const s3 = new aws.S3({
          endpoint: "sgp1.digitaloceanspaces.com",
          accessKeyId: "DO00L4LB23Y8U6CLT4WM",
          secretAccessKey: "/cIPiiTq0WnsJanQFT/j4mujF2ICCgiOVtQM9q5VBgw"
        });
        const Storage = multerS3({
          s3: s3,
          bucket: 'dvdrom',
          acl: 'public-read',
          key: function (request, file, cb) {
            
            console.log("check file :", file);
            cb(null, "dvdrom" + "/" + file.fieldname + "_" + Date.now() + path.extname(file.originalname));
          }
        })
      
        let upload;
        if (single_image_flag) {
          upload = multer({ storage: Storage }).single(file_attribute_name);
        }
      
      
      
        return upload
      };

      routes.post("/image-upload", async function (req, res) {
        console.log("getingImage");
        try {
          const uploadObj = await ImageUpload(
            "image",
            true
          );
          uploadObj(req, res, async function (err) {
            try{
            const FileUrl = "https://dvdrom." + "sgp1.digitaloceanspaces.com" + "/";
            const Key = req.file.key;
            var url = FileUrl + Key;
            console.log(url);
            res.status(200).send({
              statusCode: 200,
              message: "Success",
              data: {
                url
              }
            });
          }catch(e){
          console.log(e);
          }
          })
        
        }
        catch (err) {
          res.status(400).send({ msg: err.message, status: false })
        }
      
      });

    routes.post('/banner-post',banner.single('img'), (req, res) => {


        console.log("banner post");
        //console.log(typeof(req.file))
        if(req.file !== undefined){
            //console.log(req.file)
            res.send(req.file)
        } else {    
            res.send('no file')
        }
    })

    routes.get('/testemail', (req,res) => {

        let data = {
          customer_id: '8947772',
          appointment_id: '12381051',
          timestamp: '2320938402938402'
        }

        notification.toCustomer('confirm_appointment',data).then(()=>{
            res.send('sent!')
        }).catch((err)=>{
            res.send(err)
        })

    })

    routes.get('/testsms', (req,res) => {

        let data = {
            to: '07936642915',
            text: 'This is all but a test'
        }

        notification.sms(data).then(()=>{
            res.send('sent!')
        }).catch((err)=>{
            res.send(err)
        })

    })

    routes.get('/testnotification', (req,res) => {

        let msg = {
            type: 'Shampoo 1 is out of stock',
            msg: 'Stock for Shampoo 1 is: <b>0</b>',
            data: {
                url: '/dashboard/salon/products'
            }
        }
        notification.broadcastToAdmins(msg).then((data)=>{
            res.json(data)
        }).catch((err)=>{
            res.send(err)
        })

    })

    routes.get('/logout', (req, res) => {

        let guard

        if (req.session && req.session.user && req.session.user.guard){
            guard = req.session.user.guard
        }

        delete req.session.user

        req.session.destroy((err)=>{
            if (err){
                console.log('Component Default routes | index.js: '+err)
            } else {
                if (guard == 'staff'){
                    res.redirect('/login/staff')
                } else if (guard == 'admin'){
                    res.redirect('/login/admin')
                } else if (guard == 'member'){
                    res.redirect('/login/member')
                } else {
                    res.redirect('https://www.davidrozman.co.uk')
                }

            }
        });

    })

// export

    module.exports = functions
    module.exports.routes = routes
    module.exports.settings = settings