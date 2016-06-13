const JWT = require('jsonwebtoken'),
    config = require('./config'),
    P = require('bluebird');

const JwtSign = P.promisify(JWT.sign, {context: JWT});

module.exports = function(credentials) {
    return JwtSign(credentials, config.JWT_SHARED_KEY, {
        issuer: config.JWT_ISSUER,
        audience: config.JWT_AUDIENCE,
        expiresIn: config.JWT_EXPIRES_IN
    });
};
