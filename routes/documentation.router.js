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
var expressRouter = require('express-promise-router'),
    _ = require('lodash'),
    P = require('bluebird'),
    Hbs = require('express-handlebars'),
    passport= require('passport');

module.exports = function(db, config, Models, ModelFactory, log, app) {

    var router = expressRouter();

    var hbs = Hbs.create({});

    app.engine('handlebars', hbs.engine);
    app.set('view engine', 'handlebars');
    app.set('views', './documentation');

    var extractConfigEntries = P.method(function(config) {
        return P.map(_.keys(config), function(module) {
            var cfg = {key: module};
            var settings = config[module];

            if(_.isObject(settings)) {
                cfg.settings = P.map(_.keys(config[module]), function(key) {
                    return {key: key, value: JSON.stringify(config[module][key]) };
                });
            }
            else {
                cfg.value = settings;
            }
            return P.props(cfg);
        });
    });

    var buildDocumentation = P.method(function() {

        return P.props({
            title: 'Documentation',
            version: 'v1',
            models: P.map(_.keys(Models), function(modelName){

                var fields = Models[modelName].Schema.describe().children;

                return {
                    name: modelName,
                    fields: _.map(_.keys(fields), function(name) {
                        fields[name].name = name;
                        return fields[name];
                    })
                };
            }),
            routers: [],
            config: extractConfigEntries(config)
        });
    });

    router.get('/', function (req, res, next) {

        buildDocumentation().then(function(doc) {
            res.render('index', { doc: doc });
        }).catch(next)

    });


    return {
        path: '/documentation',
        router: router
    };
};