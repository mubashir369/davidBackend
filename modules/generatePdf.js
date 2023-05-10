
const nodemailer=require('nodemailer');
const ejs=require('ejs');

const generatePdf1 = async (ejsName,data) => {
    return new Promise(async (resolve, reject) => {

      ejs.renderFile(`modules/PdfTemplate/${ejsName}`, data, {}, function(err, str){
        if (err) {
          console.log(err);
        } else {
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
            pdf.create(data, options).toFile("report.pdf", function (err, data) {
                if (err) {
                    res.send(err);
                } else {
                    res.send("File created successfully");
                }
            });

        
  }
})})}
  const gereratePdf1 ={generatePdf:generatePdf1 }

module.exports = gereratePdf1