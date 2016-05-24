var P = require('bluebird'),
    moment = require('moment');

module.exports = P.method(function(db, user) {

    // Tracked Games (match with at least one event from this user)
    const _computeTrackedGames = P.method(function() {
        var coll = db.collection('events');
        return P.promisify(coll.distinct, { context: coll})('match', {_user: user.username }).then(function(result) {
            return result.length;
        });
    });

    // Average quality of user events (recorded after they've been aggregated)
    const _computeAvgQuality = P.method(function() {
        return 100.0;
    });

    // Earned money
    const _computeEarnedMoney = P.method(function() {
        return {
            amount: 0,
            currency: 'USD'
        };
    });

    // Last Payment (amount and date)
    const _getLastPaymentInfo = P.method(function() {
        // return {
        //     amount: 0,
        //     currency: "USD",
        //     date: moment().subtract(1, 'month').toDate()
        // };
    });

    var report = {
        meta:{
            userId: user._id,
            username: user.username,
            reportDate: new Date()
        },
        trackedGames: _computeTrackedGames(),
        avgQuality: _computeAvgQuality(),
        earnedMoney: _computeEarnedMoney(),
        lastPayment: _getLastPaymentInfo()
    };

    return P.props(report);
});
