module.exports = {
    log: {
        $filter: 'env',
        $base: {
            name: 'qrest-api'
        },
        production: {
            console: {
                level: 'debug'
            },
            syslog: {
                level: 'warn',
                host: "logs4.papertrailapp.com",
                port: 30643,
                facility: 'local0'
            }
        },
        $default: {
            console: {
                level: 'debug'
            }
        }
    }
};
