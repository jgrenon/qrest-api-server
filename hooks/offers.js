const _ = require('lodash'),
    moment = require('moment'),
    random = require('meteor-random'),
    trim = require('trim');

module.exports = {
    pre: function(offer, next) {

        offer._id = random.id(20);

        if(_.isString(offer.tags)) {
            offer.tags = _.map(offer.tags.split(','), function(tag) {
                return trim(tag).toLowerCase();
            });
        }

        if(!offer.bid_start) {
            offer.bid_start = moment().startOf('day').toDate();
            offer.bid_time = moment().startOf('hour').add(2, 'hour').diff(offer.bid_start).asMilliseconds();
        }

        if(!offer.bid_duration) {
            offer.bid_duration = 120;
        }

        // Compute the end of bid period
        if(offer.bid_start) {
            offer.bid_end = moment(offer.bid_start).startOf('day').add(offer.bid_time, 'milliseconds').add(offer.bid_duration, 'minutes').toDate();
        }

        if(next) {
            return next(null, offer);
        }
        else {
            return offer;
        }
    },
    post: function(offer, next) {

    }
};
