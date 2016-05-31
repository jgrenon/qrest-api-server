const crypto = require('crypto');
const config = require('./config');

module.exports = function(password) {
    return crypto.createHash('sha1').update(password).update(config.auth.salt).digest('hex')
};
