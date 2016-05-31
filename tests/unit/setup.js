var P = require('bluebird'),
    Path = require('path');

module.exports = function(opts = {}) {
    var config =  require('../../lib/config');
    var log = require('../../lib/log')(config);
    var DB = require('../../lib/db')(config, log, opts.testMode);

    return P.props({
        config: config,
        log: log,
        DB: DB,
        require: function(modulePath) {
            return require(Path.resolve(modulePath));
        }
    });

};
