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
    generateToken = require('../lib/generate-token'),
    passport= require('passport');

module.exports = function(db, config, Models) {

    var router = expressRouter();

    router.get('/', function (req, res) {
        res.redirect('/documentation');
    });

    router.post('/register', function(req, res, next) {
        var pre = _.get(hooks.users, "create.pre");
        var post = _.get(hooks.users, "create.post");

        if(pre) {
            req.body = pre(req.body, req);
        }

        Models.users.insert(req.body).then(function(user) {
            if(post) {
                user = post(req.body, user);
            }
            res.send(user);
        }).catch(next);
    });

    router.get('/me', passport.authenticate(config.auth.type, { session: false }), function (req, res, next) {
        var pre = _.get(hooks.users, 'show.pre');
        var post = _.get(hooks.users, 'show.post');

        var q = {username: req.user.username };
        if(pre) {
            q = pre(q, req);
        }

        Models.users.show(req.user._id).then(function(user) {
            if(post) {
                user = post(user);
            }

            res.send(user);
        });
    });
    
    router.post('/auth', function(req, res, next) {
        passport.authenticate('local', function(err, user) {
            if (err) {
                return next(err);
            }
            if (!user) {
                return res.status(401).send("Unauthorized");
            }

            return generateToken({username: user.username, userId: user._id.toString()}).then(function(token) {
                res.send(token);
            }).catch(function(err) {
                res.status(500).send('security-error');
            });

        })(req, res, next);
    });

    return {
        path: '/',
        router: router
    };
};
