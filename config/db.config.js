module.exports = {
    db: {
        qrest_api:{
            $filter: 'env',
            $base: {
                options: {}
            },
            production: {
                url: process.env.MONGODB_URL || 'mongodb://mongodb:27017/qrest_api'
            },
            $default: {
                url: process.env.MONGODB_URL || 'mongodb://localhost:27017/qrestapi_dev'
            }
        },
        default_db: 'qrest_api'
    }

};

