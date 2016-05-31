const setup = require('../setup');
const should = require('chai').should();
const Schema = require('joi');

describe('ModelFactory', function() {
    var ctx, ModelFactory;

    before(function() {
        return setup({testMode: true}).then(function(context) {
            ctx = context;
            ModelFactory = ctx.require('./lib/model-factory')(ctx.config, ctx.DB);
        });
    });

    it('should accept a null schema', function() {
        var model = ModelFactory('test1', null);
        should.exist(model);
        should.exist(model.schema);
    });

    it('should create a mocked model in test mode', function(){
        var model = ModelFactory('test1', null, { testMode: true });
        should.exist(model);
        model.mocked.should.be.true;
    });

    it('should create a real model when not in test mode', function() {
        var model = ModelFactory('test3', null, { testMode: false });
        should.exist(model);
        should.not.exist(model.mocked);
    });

});
