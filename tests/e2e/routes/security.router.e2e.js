var should = require("chai").should();

describe('security.router', function() {
    var ctx;

    before(function () {
        return require('../setup')().then(function (arg0) {
            ctx = arg0;
        });
    });

    before('setup-data', function () {
        return ctx.resetCollections(['users', 'clients']);
    });

    after('setup-data', function () {
        return ctx.clean(['users', 'clients']);
    });

    after(function () {
        return ctx.terminate();
    });

    it('should generate a valid token if a valid client & user is provided', function() {
        return ctx.agent.post('/gateway/tokens')
            .send({nickname: 'test1', password: "test123", client: 'unit-test-app-1'})
            .expect('Content-Type', /json/)
            .expect(200).then(function(res) {
                should.exist(res.body.token);
            });
    });

});
