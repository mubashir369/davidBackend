
    const bwipjs = require('bwip-js')

    var image = {

        save: async (base64, filename, path)=>{

            return new Promise(async function(resolve, reject){

                let ext = base64.split(';')[0].split('/')[1],
                    base64Data = base64.replace(/^data:image\/(png|jpg|jpeg);base64,/i, ""),
                    time = Date.now()+'',
                    dir1 = time.substr(0,3),
                    dir2 = time.substr(3,1),
                    path_check = global.basedir+'/public/images/'+path,
                    dir_check1 = global.basedir+'/public/images/'+path+'/'+dir1,
                    dir_check2 = dir_check1+'/'+dir2,
                    name = dir_check2+'/'+filename+'-'+time+'.'+ext,
                    name_url = '/images/'+path+'/'+dir1+'/'+dir2+'/'+filename+'-'+time+'.'+ext

                if (!fs.existsSync(path_check)){
                    await fs.mkdirSync(path_check);
                }

                if (!fs.existsSync(dir_check1)){
                    await fs.mkdirSync(dir_check1);
                }

                if (!fs.existsSync(dir_check2)){
                    await fs.mkdirSync(dir_check2);
                }

                await fs.writeFile(name, base64Data, 'base64', function(err) {
                    if (err){console.log('Module Images | ',err)}
                })

                resolve(name_url)

            })

        },

        saveAll: async (obj, prefix, path)=>{

            return new Promise(async function(resolve, reject) {
                for (let [key, value] of Object.entries(obj)) {
                    if (typeof value == 'string' && value.match(/^data:image\//)){
                        await image.save(obj[key], prefix, path).then((filename)=>{
                            obj[key] = filename
                        })
                    }
                }
                resolve(obj)
            })

        },

        delete: (path) => {

            if (!path.match(/^\//)){
                path = '/'+path
            }

            path = global.basedir+'/public'+path

            return new Promise(function(resolve, reject) {

                if (fs.existsSync(path)){
                    try {
                        fs.unlinkSync(path)
                        resolve('Deleted')
                    } catch(err) {
                        reject(err)
                    }
                } else {
                    reject('Image does not exist')
                }

            })

        },

        generateBarcode:(code, type, save) => {

            if (!type){
                type = 'qrcode'
            }

            return new Promise(function(resolve, reject) {

                bwipjs.toBuffer({
                    bcid:        type,       // Barcode type
                    text:        code,    // Text to encode
                    scale:       3,               // 3x scaling factor
                    height:      20,
                    width:       20,              // Bar height, in millimeters
                    includetext: true,            // Show human-readable text
                    textxalign:  'center',        // Always good to set this
                })
                .then(buffer => {
                    let base64 = `data:image/png;base64,${buffer.toString('base64')}`

                    if (save){
                        image.save(base64,'barcode-'+code,'barcodes').then((img_url)=>{
                             resolve(img_url)
                        }).catch((err)=>{
                            reject(err)
                        })
                    } else {
                        resolve(base64)
                    }

                })
                .catch(err => {
                    reject(err)
                })

            })

        }

    }

    module.exports = image
