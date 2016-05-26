var expressRouter = require('express-promise-router'),
    _ = require('lodash'),
    moment = require('moment'),
    mongodb = require('mongodb'),
    passport= require('passport');

module.exports = function(db, helpers) {

    var router = expressRouter();

    router.param('collectionName', function (req, res, next, collectionName) {
        req.collection = db.collection(collectionName);

        if(collectionName === 'users') {
            req.preProcess = helpers.users.encryptPassword;
        }

        if(helpers[collectionName].pre) {
            req.preProcess = helpers[collectionName].pre;
        }

        if(helpers[collectionName].post) {
            req.postProcess = helpers[collectionName].post;
        }

        return next()
    });

    router.get('/:collectionName', passport.authenticate('bearer', { session: false }), function (req, res) {
        req.query = req.query || {};

        var sort = _.pickBy(req.query, function (obj, key) {
            return key.indexOf('s_') === 0;
        });

        if (_.keys(sort).length > 0) {
            sort = _.map(sort, function (val, key) {
                return [key.substring(2), parseInt(val)];
            });
        }
        else {
            sort = [['_id', -1]];
        }

        var query = _.pickBy(req.query || {}, function (val, key) {
            return key !== 'limit' && key.indexOf('s_') !== 0;
        });

        const OPERATORS = ['<', '>', '!'];

        _.each(_.keys(query), function(key){
            if(OPERATORS.indexOf(query[key][0]) !== -1) {
                switch(query[key][0]) {
                    // Full-text search
                    case '*':
                        break;
                    // Spatial Search
                    case '^':
                        break;
                    case '>':
                        var val = query[key].substring(1);
                        if(val.indexOf('date:') === 0) {
                            query[key] = {$gte: moment(val.substring(5)).toDate()};
                        }
                        else if(val.indexOf('number:') === 0) {
                            query[key] = {$gte: Number(val.substring(7))};
                        }
                        else {
                            query[key] = {$gte: val};
                        }
                        break;
                    case '<':
                        var val = query[key].substring(1);
                        if(val.indexOf('date:') === 0) {
                            query[key] = {$lte: moment(val.substring(5)).toDate()};
                        }
                        else if(val.indexOf('number:') === 0) {
                            query[key] = {$lte: Number(val.substring(7))};
                        }
                        else if(val.indexof('bool:') === 0) {
                            query[key] = {$lte: Boolean(val.substring(5))};
                        }
                        else {
                            query[key] = {$lte: val};
                        }
                        break;
                    case '!':
                        query[key] = {$not: query[key].substring(1)};
                        break;
                }
            }

            // Replace contextual value operators
            if(query[key].indexOf('$$') === 0) {
                if(query[key] === '$$username') {
                    query[key] = req.user.username;
                }
                else if(query[key] === '$$uid') {
                    query[key] = req.user._id;
                }
            }
        });

        var cursor = req.collection.find(query);

        cursor.limit(parseInt(req.query.limit || "10"));
        cursor.skip(parseInt(req.query.limit || "0"));
        cursor.sort(sort);

        return cursor.toArray().then(function (results) {
            return res.send(results);
        })
    });

    router.post('/:collectionName', passport.authenticate('bearer', { session: false }), function (req, res) {
        req.body._user = req.user.username;
        req.body._ts = Date.now();

        if(req.preProcess) {
            req.body = req.preProcess(req.body);
        }

        return req.collection.insertOne(req.body, {}).then(function (results) {
            req.body._id = results.insertedId;

            if(req.postProcess) {
                req.postProcess(req.body, results);
            }

            return res.send(req.body);
        });
    });

    router.get('/:collectionName/:id', passport.authenticate('bearer', { session: false }), function (req, res) {
        return req.collection.findOne({id: req.params.id}).then(function (result) {
            return res.send(result);
        })
    });

    router.put('/:collectionName/:id', passport.authenticate('bearer', { session: false }), function (req, res) {
        req.query = req.query || {};

        if (req.query.schema && req.query.schema.length > 0) {
            console.log("Found schema", req.query.schema);
            _.forEach(req.query.schema[0], function (val, key) {
                if (val.toLowerCase() === 'date') {
                    console.log("Date value:", req.body[key]);
                    req.body[key] = moment(req.body[key]).toDate();
                }
                else if (val.toLowerCase() === 'number') {
                    req.body[key] = parseFloat(req.body[key]);
                }
                else if(val.toLowerCase() === 'bool') {
                    req.body[key] = Boolean(req.body[key]);
                }
            });
        }

        req.body._user = req.user.username;
        req.body._ts = Date.now();

        return req.collection.updateOne({id: req.params.id}, {$set: req.body}, {
            safe: true,
            multi: false,
            upsert: Boolean(req.query.upsert) || false
        }).then(function (result) {
            return res.send(result.result);
        })
    });

    router.delete('/:collectionName/:id', passport.authenticate('bearer', { session: false }), function (req, res) {
        return req.collection.removeOne({id: req.params.id}).then(function(result) {
            return res.send(result.result);
        })
    });

    return {
        path: '/v1',
        router: router
    };
};



