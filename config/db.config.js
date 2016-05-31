module.exports = {
    db: {
        qrest_api:{
            $filter: 'env',
            $base: {
                options: {}
            },
            production: {
                url: 'mongodb://mongodb:27017/qrest_api'
            },
            $default: {
                url: 'mongodb://localhost:27017/qrest_api'
            }
        },
        default_db: 'qrest_api'
    }

};

