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
const express = require('express'),
    mongodb = require('mongodb'),
    bodyParser = require('body-parser'),
    compression = require('compression'),
    cors = require('cors'),
    moment = require('moment'),
    passport= require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    BearerStrategy = require('passport-http-bearer').Strategy,
    JWT = require('jsonwebtoken'),
    requireDirectory = require('require-directory'),
    logger = require('morgan');

const http = require('http');
const https = require('https');

http.globalAgent.maxSockets = Infinity;
https.globalAgent.maxSockets = Infinity;

const app = express();

const config = require('./lib/config');

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(logger('dev'));
app.use(compression());

var log = require('./lib/log')(config);
var DB = require('./lib/db')(config, log);

DB.getDB(config.db.default_db).then(function(db) {

    var ModelFactory = require('./lib/model-factory')(config, DB);

    // Register all models
    var Models = {};
    requireDirectory(module, __dirname + "/models", { include: /\.model\.js$/, visit: function(factory, path, filename) {
        var model = factory(ModelFactory, config, log);
        var modelKey = filename.match(/(.+?)\.model\.js$/)[1];
        Models[modelKey] = model;
        return model;
    }});

    passport.use(new LocalStrategy(
        function(username, password, done) {
            db.collection('users').findOne({username: username }, function(err, user) {
                if(err) {
                    return done(err);
                }

                if(!user) {
                    return done(null, false, { message: 'Incorrect username.' });
                }

                // Validate password
                var credential = hooks.users.pre({password: password}).password;

                if(user.password !== credential) {
                    return done(null, false, { message: 'Incorrect password.' });
                }
                return done(null, user);
            });
        }
    ));

    passport.use(new BearerStrategy(
        function(token, done) {
            JWT.verify(token, config.SHARED_KEY, {audience:config.JWT_AUDIENCE, issuer: config.JWT_ISSUER}, function(err, tokenInfo) {
                if(err) {
                    log.error(err);
                    return done(err);
                }

                db.collection('users').findOne({username: tokenInfo.username}, function(err, user) {
                    if(err) {
                        return done(err);
                    }

                    if(!user) {
                        return done(null, false, { message: "Invalid token"});
                    }

                    return done(null, user, { scope: 'all'});
                });
            });

        }
    ));
    
    // Install all routes
    requireDirectory(module, __dirname + "/routes", { include: /\.router\.js$/, visit: function(factory) {
        var router = factory(db, config, Models, ModelFactory, log, app);
        if(router.path) {
            log.info("Registering router %s", router.path);
            app.use(router.path, router.router);
        }
    }});

    app.listen(config.PORT || 8888, function () {
        log.info('Listening on port %d', config.PORT || 8888);
    });

});

