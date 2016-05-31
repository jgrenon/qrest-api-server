var P = require('bluebird'),
    Schema = require('joi');

module.exports = function(config, DBS, options) {
    options = options || {};

    const Model = require('./data-model/model');
    const MockedModel = require('./data-model/mocked-model');

    return function(key, schema, opts = {}) {

        var testMode = false;

        if(opts.testMode) {
            testMode = true;
        }
        else if(options.testMode) {
            testMode = true;
        }

        if(!schema) {
            schema = Schema.object();
        }

        var _resolveDB = P.method(function(name) {
            if(DBS) {
                return DBS.getDB(name);
            }
        });

        var dbPromise = _resolveDB(opts.db || config.db.default_db);

        if(testMode) {
            return new MockedModel(key, schema, dbPromise);
        }
        else {
            return new Model(key, schema, dbPromise);
        }

    }
};
