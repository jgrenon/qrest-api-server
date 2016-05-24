var expressRouter = require('express-promise-router'),
    _ = require('lodash'),
    random = require('meteor-random'),
    mongodb = require('mongodb'),
    passport= require('passport');

module.exports = function(db) {

    var router = expressRouter();

    // Open a new delivery stream with the specified stream spec
    router.post('/streams', passport.authenticate('bearer', { session: false }), function (req, res) {

        //TODO: Check the number of open streams for a specific user

        var stream = {
            owner: req.user._id,
            id: random.id(25),
            created_at: Date.now(),
            filter: req.body,
            status: 'P',
            server: 'ws://deliver.scorum.io/'
        };

        //Create the new delivery stream
        return db.collection('delivery_streams').insertOne(stream).then(function() {
            return stream;
        });

    });

    // Close a previously opened stream
    router.delete('/streams/:streamId', passport.authenticate('bearer', { session: false }), function (req, res) {
        db.collection('delivery_streams').findOne({id: req.params.id, owner: req.user._id}).then(function(stream) {
            if(stream) {
                return db.collection('delivery_streams').updateOne({_id: stream._id}, {
                    $set: {
                        status: 'C',
                        closed_at: Date.now()
                    }
                }).then(function() {
                    return {
                        success:true,
                        id: stream.id,
                        status: 'C'
                    }
                });
            }
            else {
                res.send(404, "Invalid-stream:"+req.params.id);
            }
        });
    });

    return router;
};
