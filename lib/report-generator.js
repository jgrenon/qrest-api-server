var P = require('bluebird'),
    moment = require('moment');

module.exports = P.method(function(db, user) {

    function _countPublishedOffers() {
        return db.collection('offers').count({_user: user.username});
    }

    var report = {
        meta:{
            userId: user._id,
            username: user.username,
            reportDate: new Date()
        },
        activeOffers: 0,
        wonOffers: 0,
        lostOffers: 0,
        publishedOffers: _countPublishedOffers(),
        receivedBids: 0,
        currentValue: 0.0,
        activeMonitors: 0,
        foundOffers: 0
    };

    return P.props(report);
});
