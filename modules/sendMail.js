
const nodemailer=require('nodemailer');
const ejs=require('ejs');

const sendMail = async (to,subject,data, title,ejsName) => {
    return new Promise(async (resolve, reject) => {

      
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'basekampmailservice@gmail.com',
          pass: 'gpcesnbgauzmtemr'
        }
      });
   

       var text= 'That was easy!'
   
      ejs.renderFile(`modules/EmailTemplates/${ejsName}`,{data:data,text:text,title:title}, function(err, str){
        if (err) {
          console.log(err);
        } else {
          // Set the html property of the mailOptions object to the rendered string
          const mailOptions = {
            from: 'you@gmail.com',
            to: `${to}`,
            subject: `${subject}`,
            html: str
          };
      
          // Send the email
          transporter.sendMail(mailOptions, function(error, info){
            if (error) {
              console.log(error);
            } else {
              console.log('Email sent: ' + info.response);
            }
          });
        }
      });
      resolve([]);
    });
  }
  const sendEMail ={sendMail:sendMail }

module.exports = sendEMail