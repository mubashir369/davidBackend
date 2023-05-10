const isSet = (obj, level,  ...rest)=>{
    if (obj === undefined) return false
    if (rest.length == 0 && obj.hasOwnProperty(level)) return true
    return isSet(obj[level], ...rest)
}

module.exports = isSet
