var P = require('bluebird');
var supertest = require("supertest-as-promised");
var config = require('../../lib/config');
var _ = require('lodash');
var MongoClient = require('mongodb').MongoClient;
var Yaml = require('js-yaml');
var fs = require('fs');
var Path = require('path');
var random = require('meteor-random');
var crypto = require('crypto');
var generateToken = require('../../lib/generate-token');
var encryptPassword = require('../../lib/encrypt-password');

module.exports = P.method(function() {

    var url = config.api.type || "http";
    url += "://";
    url += config.api.host + ":";
    url += config.api.port;

    console.log("Sending request to %s", url);

    var dbname = config.db.default_db;
    
    function preProcess(doc) {

        return P.each(_.keys(doc), function(key) {
            if(_.isString(doc[key])) {
                if(doc[key].indexOf('$$random.id') !== -1) {
                    doc[key] = random.id();
                }
                else if(doc[key].indexOf('$$encryptPassword') !== -1) {
                    var password = doc[key].match(/\$\$encryptPassword\(([^)]*?)\)/);
                    doc[key] = encryptPassword(password[1]);
                }
            }
        }).then(function() {
            return doc;
        });

    }

    var _fixtures = {};

    var _loadFixture = P.method(function(name) {
        if(!_fixtures[name]) {
            _fixtures[name] = P.map(Yaml.safeLoad(fs.readFileSync(Path.resolve('./tests/e2e/fixtures', name+".yaml"), 'utf8')), preProcess);
        }
        return _fixtures[name];
    });

    return MongoClient.connect(config.db[dbname].url).then(function(db) {
        console.log("Connected to mongodb %s", config.db[dbname].url);

        return {
            agent: supertest.agent(url),
            resetCollections: function(collections) {
                return P.map(collections, function(collName) {
                    var coll = db.collection(collName);
                    return _loadFixture(collName).then(function(documents) {
                        return coll.removeMany({}).then(function() {
                            return P.map(documents, function(doc) {
                                return coll.insertOne(doc);
                            }).then(function(rows) {
                                console.log("Initialized %d document(s) for collection %s", rows.length, collName);
                                return rows;
                            });
                        });
                    });
                });
            },
            clean: function(collections) {
                return P.map(collections, function(coll) {
                    return db.collection(coll).removeMany({}).then(function(results) {
                        return results;
                    });
                });
            },
            terminate: function() {
                return db.close();
            },
            generateToken: function(username) {
                return _loadFixture('users').then(function(users) {
                    var user = _.find(users, function(u) { return u.username === username });
                    if(user) {
                        return generateToken({
                            userId: user._id,
                            username: user.username
                        });
                    }
                });
            }
        };
    });

});
