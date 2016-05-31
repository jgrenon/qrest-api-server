var P = require('bluebird');
var Random = require('meteor-random');
var _ = require('lodash');
var Joi = require('joi');

function Model(key, schema, dbPromise) {
    this.key = key;
    this.schema = schema;
    this.validate = P.promisify(this.schema.validate, { context: this.schema });

    // Retrieve full text and spatial index fields
    this.fulltext = {};
    this.spatial = {};

    _.each(this.schema.describe().children, (value, key) => {
        if(value.meta) {

            if (_.find(value.meta, function (m) { return m.fulltext })) {
                this.fulltext[key] = 'text';
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

    this.dbPromise = dbPromise.then((db) => {
        var indexes = [];

        console.log("Creating indexes");

        if(_.keys(this.spatial).length > 0) {
            indexes.push(db.collection(this.key).ensureIndex(this.spatial));
        }

        if(_.keys(this.fulltext).length > 0) {
            indexes.push(db.collection(this.key).ensureIndex(this.fulltext));
        }

        console.log("Creating %d index(es)", indexes.length);
        return P.all(indexes).then(function() {
            console.log("All indexes were successfully created!");
            return db;
        });

    }).catch(function(err) {
        console.log(err);
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
    return this.dbPromise.then((db) => {
        return db.collection(this.key).remove({});
    })
};

Model.prototype.command = P.method(function(...args) {
    return this.dbPromise.then((db) => {
        return db.command.apply(db, args);
    })
});

Model.prototype.insert = function(data) {
    return this.validate(data).then((data) => {

        if(!data._id) {
            data._id = Random.id();
        }

        return this.dbPromise.then((db) => {
            var coll = db.collection(this.key);
            return coll.insertOne(data).then(function(result) {
                data._id = result.insertedId;
                return data;
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
        return coll.findOne(q).then( (result) => {
            if(result) {

                if(opts.projection) {
                    opts.projection.unshift(result);
                    result = _.pick.apply(_, opts.projection);
                }

                if(opts.wrap) {
                    return this.wrap(result);
                }
                else
                    return result;
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

            if(_.isString(opts.sort)) {
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
            }
            else {
                sort = opts.sort;
            }
            cursor.sort(sort);
        }

        return P.join(
            coll.count(filter),
            cursor.toArray()
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
        return coll.removeOne(filter || {}).then(function(resp) {
            return {count: resp.result.n};
        });
    });
};

Model.prototype.update = function(selector, updated, opts = {}) {
    return this.dbPromise.then((db) => {
        var coll = db.collection(this.key);
        return coll.update(selector, { $set: updated }, { safe: true, multi: opts.multi, upsert: opts.upsert }).then((result) => {
            if(result.result.n === 1) {
                return this.show(selector, opts);
            }
            else {
                return this.list(selector, opts);
            }
        });
    });
};

Model.prototype.search = P.method(function(query, opts = {type: 'fulltext', or: false, lang: 'en' }) {
    opts.type = opts.type || 'fulltext';
    opts.lang = opts.lang || 'en';

    if(opts.type === 'fulltext') {
        if(this.fulltext) {
            return this.dbPromise.then((db) => {
                var coll = db.collection(this.key);

                if(!opts.or) {
                    query = _.map(query.split(' '), function(segment) { return '\"' + segment +'\"' }).join(" ");
                }

                return coll.find({
                    $text: {
                        $search: query,
                        $language: opts.lang,
                        $caseSensitive: opts.case,
                        $diacriticSensitive: false
                    }
                }, {score: { $meta: 'textScore'}}).sort({score: { $meta: 'textScore'}}).toArray();
            });
        }
        else {
            return [];
        }
    }
    else if(opts.type === 'spatial') {
        if(this.spatial) {
            return this.dbPromise.then((db) => {
                var coll = db.collection(this.key);

                var q = {};

                q[_.keys(this.spatial)[0]] = {
                    $nearSphere : {
                        $geometry: { type: "Point",  coordinates: [ query.longitude, query.latitude ] },
                        $maxDistance: query.radius * 1000
                    }
                };

                return coll.find(q).toArray();
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
