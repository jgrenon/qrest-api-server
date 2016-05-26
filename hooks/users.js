const crypto = require('crypto');

const SALT = process.env.PASSWORD_SALT || "232jh23EH@#EDU#GE#@E@#VEHJ@#VE@#";

module.exports = {
    pre: function(user, next) {
        if(user) {
            user.password = crypto.createHash('sha1').update(user.password).update(SALT).digest('hex');
        }

        if(next) {
            return next(null, user);
        }
        else {
            return user;
        }
    }
};
