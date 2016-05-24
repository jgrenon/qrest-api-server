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
    logger = require('morgan');

const app = express();

const SHARED_KEY = "G@UGW!@W&^!@W^&!@W!@W@!W@!W!@()*IHJKJHiuh23876786w21w2";

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(logger('dev'));

console.log("Connecting to Mongo %s", process.env.MONGODB_URL || 'mongodb://localhost:27017/lifepulz');
var client = mongodb.MongoClient.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/lifepulz');
client.then(function(db) {
    console.log("Connected to database!");

    const helpers = {
        users: {
            encryptPassword: require('./lib/encrypt-password')
        }
    };

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
                var credential = helpers.users.encryptPassword({password: password}).password;

                if(user.password !== credential) {
                    return done(null, false, { message: 'Incorrect password.' });
                }
                return done(null, user);
            });
        }
    ));

    passport.use(new BearerStrategy(
        function(token, done) {
            JWT.verify(token, SHARED_KEY, {audience:'lifepulz.com', issuer: 'lifepulz.com'}, function(err, tokenInfo) {
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

    // Install the generic REST API router
    app.use('/collections', require('./routes/generic-rest-api.router')(db, helpers));

    app.get('/', function (req, res) {
        res.send('please select a collection, e.g., /collections/messages')
    });

    app.post('/register', function(req, res, next) {
        req.body = helpers.users.encryptPassword(req.body);
        db.collection('users').insert(req.body, {}, function (e, results) {
            if (e) return next(e);
            res.send(results)
        });
    });

    app.get('/me', passport.authenticate('bearer', { session: false }), function (req, res, next) {
        db.collection('users').findOne({username: req.user.username }, function (e, result) {
            if (e) return next(e);
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
            JWT.sign({username: user.username, userId: user._id.toString()}, SHARED_KEY, { issuer: 'scorum.io', audience: 'scorum.io', expiresIn: 30 * 24 * 60 * 60 }, function(err, token) {
                if(err) {
                    return next(err);
                }

                return res.send(token);
            });

        })(req, res, next);
    });

    app.listen(process.env.PORT || 8888, function () {
        console.log('Lifepulz server listening on port %d', process.env.PORT || 8888);
    });

});

