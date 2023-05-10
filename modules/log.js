const log = (msg)=>{

    console.log(moment().format('MMM D HH:mm:ss')+': '+JSON.stringify(msg))

}

module.exports = log
