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

const P = require('bluebird'),
    _ = require('lodash'),
    encryptPassword = require('../lib/encrypt-password'),
    Random = require('meteor-random'),
    Schema = require('joi');

module.exports = function(ModelFactory, config, log) {

    const Status = {
        ACTIVE: 'ACTIVE',
        SUSPENDED: 'SUSPENDED',
        REVOKED: 'REVOKED',
        PENDING: 'PENDING'
    };

    const schema = Schema.object().keys({
        _id: Schema.string().alphanum().default(() => {return Random.id() }, 'auto-generated unique id'),
        username: Schema.string().meta({index: 1, unique: true}).required(),
        email: Schema.string().lowercase().email().meta({index: 1, unique: true}).required(),
        email_verified: Schema.boolean().default(false).meta({public: false }),
        password: Schema.string().meta({public: false }),
        status: Schema.string().default(Status.PENDING),
        validation_code: Schema.string().meta({public: false })
    });

    return {
        model: ModelFactory('users', schema),
        Schema: schema,
        validate: P.promisify(schema.validate, {context: schema}),
        Status: Status,
        hooks:{
            create:{
                pre: function(user, req, next) {
                    if(user) {
                        user.password = encryptPassword(user.password)
                    }
                    return user;
                }
            },
            update:{},
            remove:{},
            show:{
                post: function(user) {
                    user.password = null;
                    return user;
                }
            },
            list:{
                post: function(users) {
                    return _.map(users, function(user){ user.password = null; return user });
                }
            }
        }
    }

};
