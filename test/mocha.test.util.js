
const path = require('path')
exports.getMockfsConfig = (dirname, filename, content) => {
    const obj = {}
    obj[path.join(dirname, filename)] = content
    return obj
}