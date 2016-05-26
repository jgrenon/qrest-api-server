const express = require('express'),
    mongodb = require('mongodb'),
    bodyParser = require('body-parser'),
    cors = require('cors'),
    moment = require('moment'),
    passport= require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    BearerStrategy = require('passport-http-bearer').Strategy,
    _ = require('lodash'),
    JWT = require('jsonwebtoken'),
    requireDirectory = require('require-directory'),
    logger = require('morgan');

const app = express();

const SHARED_KEY = process.env.JWT_SHARED_KEY;
const JWT_ISSUER = process.env.JWT_ISSUER;
const JWT_AUDIENCE = process.env.JWT_AUDIENCE;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || 2592000;   // 1 month by default

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(logger('dev'));

console.log("Connecting to Mongo %s", process.env.MONGODB_URL);
var client = mongodb.MongoClient.connect(process.env.MONGODB_URL);
client.then(function(db) {
    console.log("Connected to database!");

    // Load all hooks
    const helpers = requireDirectory(module, __dirname + "/hooks");

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
                var credential = helpers.users.pre({password: password}).password;

                if(user.password !== credential) {
                    return done(null, false, { message: 'Incorrect password.' });
                }
                return done(null, user);
            });
        }
    ));

    passport.use(new BearerStrategy(
        function(token, done) {
            JWT.verify(token, SHARED_KEY, {audience:JWT_AUDIENCE, issuer: JWT_ISSUER}, function(err, tokenInfo) {
                if(err) {
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

    // Install all routers
    requireDirectory(module, __dirname + "/routes", { include: /\.router\.js$/, visit: function(factory) {
        var router = factory(db, helpers);
        if(router.path) {
            console.log("Registering router %s", router.path);
            app.use(router.path, router.router);
        }
    }});

    app.get('/', function (req, res) {
        res.send('Welcome to Lifepulz server');
    });

    app.post('/register', function(req, res, next) {
        req.body = helpers.users.pre(req.body);
        db.collection('users').insert(req.body, {}, function (e, results) {
            if (e) return next(e);

            if(helpers.users.post) {
                helpers.users.post(results);
            }

            res.send(results)
        });
    });

    app.get('/me', passport.authenticate('bearer', { session: false }), function (req, res, next) {
        db.collection('users').findOne({username: req.user.username }, function (e, result) {
            if (e) return next(e);

            if(helpers.users.post) {
                helpers.users.post(result);
            }

            res.send(result);
        })
    });

    app.get('/reports/me', passport.authenticate('bearer', { session: false }), function (req, res, next) {
        require('./lib/report-generator')(db, req.user).then(function(report) {
            return res.send(report);
        }).catch(next);
    });

    app.post('/auth', function(req, res, next) {
        passport.authenticate('local', function(err, user) {
            if (err) {
                return next(err);
            }
            if (!user) {
                return res.status(401).send("Unauthorized");
            }

            // Generate JWT token
            JWT.sign({username: user.username, userId: user._id.toString()}, SHARED_KEY, { issuer: JWT_ISSUER, audience: JWT_AUDIENCE, expiresIn: JWT_EXPIRES_IN }, function(err, token) {
                if(err) {
                    return next(err);
                }

                return res.send(token);
            });

        })(req, res, next);
    });

    app.listen(process.env.PORT || 8888, function () {
        console.log('Listening on port %d', process.env.PORT || 8888);
    });

});

