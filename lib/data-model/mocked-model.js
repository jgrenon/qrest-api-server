var P = require('bluebird');
var Random = require('meteor-random');
var _ = require('lodash');
var Joi = require('joi');
var geolib = require('geolib');

function Model(key, schema, dbPromise) {
    this.key = key;
    this.mocked = true;
    this.schema = schema;
    this.dbPromise = dbPromise;
    this.validate = P.promisify(this.schema.validate, { context: this.schema });

    // Retrieve full text and spatial index fields
    this.fulltext = {};
    this.spatial = {};

    _.each(this.schema.describe().children, (value, key) => {
        if(value.meta) {

            if (_.find(value.meta, function (m) { return m.fulltext })) {
                this.fulltext[key] = true;
            }

            if (_.find(value.meta, function (m) { return m.spatial })) {
                var lat = 'latitude', lng = 'longitude', radius;

                if(value.children) {
                    if(value.children.lat)
                        lat = 'lat';

                    if(value.children.lon) {
                        lng = 'lon';
                    }
                    else if(value.children.lng) {
                        lng = 'lng';
                    }

                    if(value.children.radius) {
                        radius = 'radius';
                    }
                }

                this.spatial[key] = '2dsphere';
            }
        }

    });

}

Model.prototype.wrap = function(data, options = {strip: true }) {
    var _this = this;
    var model = new Model(this.key, this.schema, this.dbPromise);
    var result = Joi.validate(data, this.schema, { stripUnknown: options.strip, allowUnknown: true });
    if(!result.error) {
        _.assign(model, result.value);

        // Attach a quick save method
        model.save = function() {
            return _this.update({_id: this._id}, { $set: _this.unwrap(this) });
        };

        return model;
    }
    else {
        throw result.error;
    }
};

Model.prototype.unwrap = function() {
    return this.schema.validate(this, {stripUnknown: true });
};

Model.prototype.removeAll = function() {
    return this.dbPromise.then( (db) => {
        var coll = db.collection(this.key);
        return P.promisify(coll.remove, { context: coll})({});
    });
};

Model.prototype.command = P.method(function() {
    return {
        ok: 1,
        results: []
    }
});

Model.prototype.insert = function(data) {
    return this.validate(data).then((data) => {

        if(!data._id) {
            data._id = Random.id();
        }

        return this.dbPromise.then((db) => {
            var coll = db.collection(this.key);
            return P.promisify(coll.insert, {context: coll})(data).then(function(results) {
                if(results && results.length === 1) {
                    return results[0];
                }
                else {
                    return results;
                }
            });
        });
    });
};

Model.prototype.show = function(id, opts = {wrap: false}) {
    return this.dbPromise.then((db) => {
        var coll = db.collection(this.key);
        var q;
        if(_.isString(id)) {
            var keyField = opts.keyField || '_id';
            q = {};
            q[keyField] = id;
        }
        else {
            q = id;
        }
        var cursor = coll.find(q);
        return P.promisify(cursor.toArray, {context: cursor})().then( (results) => {
            if(results && results.length === 1) {

                if(opts.projection) {
                    opts.projection.unshift(results[0]);
                    results[0] = _.pick.apply(_, opts.projection);
                }

                if(opts.wrap) {
                    return this.wrap(results[0]);
                }
                else
                    return results[0];
            }
        });
    });
};

Model.prototype.list = function(filter, opts = {}) {
    return this.dbPromise.then((db) => {
        var coll = db.collection(this.key);
        var cursor = coll.find(filter);

        opts.limit = opts.limit || 1000;
        opts.offset = opts.offset || 0;

        if(opts.limit) {
            cursor.limit(opts.limit);
        }

        if(opts.offset) {
            cursor.skip(opts.offset);
        }

        if(opts.sort) {

            var criteria = opts.sort.split(',');
            var sort = {};
            _.each(criteria, function(c) {
                if(c.indexOf('-') === 0) {
                    sort[c.substring(1)] = -1;
                }
                else {
                    sort[c] = 1;
                }
            });

            cursor.sort(sort);
        }

        return P.join(
            P.promisify(coll.count, {context: coll})(filter),
            P.promisify(cursor.toArray, {context: cursor })()
        ).spread((count, results) => {

            if(opts.wrap) {
                results = _.map(results, (r) => {
                    return this.wrap(r);
                });
            }

            // Create metadata to ease paging
            if(opts.meta) {
                return {
                    data: results,
                    meta: {
                        total: count,
                        offset: opts.offset || 0,
                        limit: opts.limit,
                        page: Math.floor((opts.offset / count) * (count / opts.limit )) + 1
                    }
                };
            }
            else {
                return results;
            }

        });

    });
};

Model.prototype.delete = function(filter, opts = {}) {
    return this.dbPromise.then((db) => {
        var coll = db.collection(this.key);

        if(_.isString(filter)) {
            filter = { _id: filter }
        }

        return P.promisify(coll.remove, {context: coll})(filter).then(function(count){
            return { count: count};
        });
    });
};

Model.prototype.update = function(selector, updated, opts = {}) {
    return this.dbPromise.then((db) => {
        var coll = db.collection(this.key);
        return P.promisify(coll.update, {context: coll})(selector, { $set: updated }, { multi: opts.multi}).then((result) => {
            if(result === 1) {
                return this.show(selector, opts);
            }
            else {
                console.log("Returning a list of items", result);
                return this.list(selector, opts);
            }
        });
    });
};

Model.prototype.search = P.method(function(query, opts = {type: 'fulltext', or: false }) {
    opts.type = opts.type || 'fulltext';

    if(opts.type === 'fulltext') {
        if(this.fulltext) {
            return this.list().then((results) => {
                return _.filter(results, (r) => {
                    var include = false;

                    _.each(this.fulltext, (value, key) => {
                        var val = r[key];
                        if(opts.case === false) {
                            val = val.toLowerCase();
                        }

                        var termInclude = !opts.or;
                        _.each(query.split(' '), function(t) {
                            if(opts.or) {
                                termInclude |= val.indexOf(t) !== -1;
                            }
                            else {
                                termInclude &= val.indexOf(t) !== -1;
                            }
                        });

                        include |= termInclude;
                    });

                    return include;
                });
            });
        }
        else {
            return [];
        }
    }
    else if(opts.type === 'spatial') {
        if(this.spatial) {
            return this.list().then((results) => {
                return _.filter(results, (r) => {
                    var coordField = _.keys(this.spatial)[0];

                    if(r[coordField] && r[coordField].type === 'Point') {
                        var latVal = r[coordField].coordinates[1];
                        var lngVal = r[coordField].coordinates[0];

                        return geolib.isPointInCircle({
                            latitude: query.latitude, longitude: query.longitude}, {
                            latitude: latVal,
                            longitude: lngVal
                        }, query.radius * 1000);

                    }
                    else {
                        return false;
                    }
                });
            });
        }
        else {
            return [];
        }
    }
    else {
        throw new Error("Unsupported search type:"+opts.type);
    }
});

module.exports = Model;
