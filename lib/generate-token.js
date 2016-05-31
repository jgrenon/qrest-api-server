var JWT = require('jsonwebtoken'),
    config = require('./config'),
    P = require('bluebird');

module.exports = function(credentials) {
    return P.promisify(JWT.sign, {context: JWT})(credentials, config.SHARED_KEY, {
        issuer: config.JWT_ISSUER,
        audience: config.JWT_AUDIENCE,
        expiresIn: config.JWT_EXPIRES_IN
    });
};
