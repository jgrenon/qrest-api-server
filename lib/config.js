const requireDirectory = require('require-directory'),
    _ = require('lodash'),
    Confidence = require('confidence'),
    Path = require('path');

var config = {};

var configPath = Path.resolve(__dirname, "..", "config");

requireDirectory(module, configPath, { include: /\.config\.js$/, visit: function(cfg) {
    _.assign(config, cfg);
}});

var store = new Confidence.Store();
store.load(config);

const guid = Confidence.id.generate();
const criteria = Confidence.id.criteria(guid);
criteria.env = process.env.NODE_ENV;
config = store.get('/', criteria);
config = _.assign(config, process.env);

module.exports = config;
