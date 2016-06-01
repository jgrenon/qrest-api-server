/*
 Copyright 2016 Covistra Technologies Inc.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */
var expressRouter = require('express-promise-router'),
    _ = require('lodash'),
    moment = require('moment'),
    passport= require('passport');

module.exports = function(db, config, Models, ModelFactory, log) {
    var router = expressRouter();

    router.param('collectionName', function (req, res, next, collectionName) {
        req.model = Models[collectionName];
        if(!req.model) {
            req.model = ModelFactory(collectionName, config, log);
        }
        return next()
    });

    // List operation
    router.get('/:collectionName', passport.authenticate('bearer', { session: false }), function (req, res, next) {
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
                        return req.model.search(query[key].substring(1), req.query);
                    // Spatial Search
                    case '^':
                        var coordString = query[key].substring(1);
                        var lon = parseFloat(coordString.substring(0, coordString.indexOf(',')));
                        var lat = parseFloat(coordString.substring(coordString.indexOf(',')+1));
                        return req.model.search({latitude: lat, longitude: lon, radius: req.query.radius }, { type: 'spatial' });
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

        var pre = _.get(req.model, "hooks.list.pre");
        var post = _.get(req.model, "hooks.list.post");

        if(pre) {
            query = pre(query, req, next);
        }

        return req.model.find(query, { sort: sort, limit: parseInt(req.query.limit || "10"), offset: parseInt(req.query.limit || "0")}).then(function(results){
            if(post) {
                results = post(results, next);
            }

            return res.send(results);
        });
    });

    // Create operation
    router.post('/:collectionName', passport.authenticate('bearer', { session: false }), function (req, res, next) {
        req.body._user = _.get(req, "user.username");
        req.body._ts = Date.now();

        var pre = _.get(req.model, "hooks.create.pre");
        var post = _.get(req.model, "hooks.create.post");

        if(pre) {
            req.body = pre(req.body, req, next);
        }

        return req.model.insert(req.body).then(function(result) {
            if(post) {
                result = post(result, req.body, next);
            }
            return res.send(result);
        });

    });

    router.get('/:collectionName/:id', passport.authenticate('bearer', { session: false }), function (req, res, next) {
        var pre = _.get(req.model, "hooks.show.pre");
        var post = _.get(req.model, "hooks.show.post");

        var q = {_id: req.params.id};
        if(pre) {
            q = pre(q, req, next);
        }

        return req.model.show(q).then(function (result) {
            if(post) {
                result = post(result, next);
            }

            return res.send(result);
        })
    });

    // Update operation
    router.put('/:collectionName/:id', passport.authenticate('bearer', { session: false }), function (req, res) {
        req.query = req.query || {};

        var pre = _.get(req.model, "hooks.update.pre");
        var post = _.get(req.model, "hooks.update.post");

        req.body._user = _.get(req, "user.username");
        req.body._ts = Date.now();

        if(pre) {
            req.body = pre(req.body, req, next);
        }
        
        return req.model.update({id: req.params.id}, req.body,{
            safe: true,
            multi: false,
            upsert: Boolean(req.query.upsert) || false
        }).then(function (result) {
            if(post) {
                result = post(result, req.body, req, next);
            }

            return res.send(result.result);
        })
    });

    router.delete('/:collectionName/:id', passport.authenticate('bearer', { session: false }), function (req, res, next) {
        var pre = _.get(req.model, "hooks.remove.pre");
        var post = _.get(req.model, "hooks.remove.post");

        var q = {_id: req.params.id};
        if(pre) {
            q = pre(q, req, next);
        }

        return req.model.delete(req.params.id).then(function(result) {
            if(post) {
                result = post(result, next);
            }

            return res.send(result.result);
        })
    });

    return {
        path: config.api.root,
        router: router
    };
};
