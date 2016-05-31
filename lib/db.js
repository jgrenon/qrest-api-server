var P = require('bluebird');

module.exports = function(config, log, testMode) {
    log.info("Loading MongoDB database interface", config.db);

    const DBS = {};

    return {
        getDB: P.method(function(name, mock = testMode) {
            log.debug("getDB %s", name);

            if(!name) {
                name = config.db.default_db;
            }

            if(DBS[name]) {
                return DBS[name];
            }
            else {
                var cfg = config.db[name];

                if(mock) {
                    var Db = require('tingodb')({memStore: true, nativeObjectID: true, searchInArray: true}).Db;
                    return DBS[name] = new Db("", {name: name});
                }
                else {
                    var MongoDB = require('mongodb');
                    return MongoDB.MongoClient.connect(cfg.url, cfg.options).then(function(db) {
                        log.debug("Successfully connected to MongoDB database");
                        DBS[name] = db;
                        return db;
                    });
                }
            }
        })
    };
};
