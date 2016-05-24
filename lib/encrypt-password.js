const crypto = require('crypto');

const SALT = "232jh23EH@#EDU#GE#@E@#VEHJ@#VE@#";

module.exports = function(user, next) {
    var pwd;

    if(user) {
        user.password = crypto.createHash('sha1').update(user.password).update(SALT).digest('hex');
    }

    if(next) {
        return next(null, user);
    }
    else {
        return user;
    }
};
