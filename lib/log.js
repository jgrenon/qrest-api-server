const bunyan = require('bunyan');
const _ = require('lodash');
const bsyslog = require('bunyan-syslog-udp');

module.exports = function(config) {

    var streams = [];

    if(config.log) {
        if(config.log.console) {
            streams.push( {
                stream: process.stderr,
                level: config.log.console.level || 'warn'
            });
        }

        if(config.log.syslog && process.env.NODE_ENV !== 'test') {
            streams.push({
                type: 'raw',
                level: config.log.syslog.level,
                stream: bsyslog.createBunyanStream(config.log.syslog)
            });
        }

        return bunyan.createLogger({
            name: config.log.name || 'system',
            serializers: bunyan.stdSerializers,
            streams: streams
        });
    }
    else if(config.log !== false) {
        var log = bunyan.createLogger({name: 'system', level: 'info'});
        log.warn("Created default logger as no config.log is provided");
        return log;
    }
    else {
        return {
            debug: function() {},
            warn: function() {},
            info: function() {},
            trace: function() {},
            error: function() {}
        };
    }

};

