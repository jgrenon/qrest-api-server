var should = require("chai").should();

describe('security.router', function() {
    var ctx;

    before(function () {
        return require('../setup')().then(function (arg0) {
            ctx = arg0;
        });
    });

    before(function () {
        return ctx.resetCollections(['users', 'applications']);
    });

    after(function () {
        return ctx.clean(['users', 'applications']);
    });

    after(function () {
        return ctx.terminate();
    });

    it('should create a new user account', function() {
        return ctx.agent.post('/register')
            .send({username: 'test2', password: "test123", email: 'test@testm.com'})
            .expect('Content-Type', /json/)
            .expect(200).then(function(res) {
                should.not.exist(res.body.password);
                should.exist(res.body._id);
                should.not.exist(res.body.validation_code);
                res.body.username.should.equal('test2');
                res.body.email.should.equal('test@testm.com');
                res.body.email_verified.should.be.false;
                res.body.status.should.equal('PENDING');
            });
    });

    it('should produce a 400 error if username is missing', function() {
        return ctx.agent.post('/register')
            .send({ password: "test123", email: 'test@testm.com'})
            .expect('Content-Type', /json/)
            .expect(400).then(function(res) {
                res.body[0].message.should.contains('username');
                res.body[0].context.key.should.equal('username');
            });
    });

    it('should produce a 400 error if bad email is provided', function() {
        return ctx.agent.post('/register')
            .send({ username: 'test2', password: "test123", email: 'test2.testm.com'})
            .expect('Content-Type', /json/)
            .expect(400).then(function(res) {
                res.body[0].message.should.contains('email');
                res.body[0].context.key.should.equal('email');
            });
    });

    it('should produce a 400 error username already exists in database', function() {
        return ctx.agent.post('/register')
            .send({ username: 'test1', password: "test123", email: 'test@testm.com'})
            .expect('Content-Type', /json/)
            .expect(400).then(function(res) {
                res.body.uniqueKeys.should.contains('username');
            });
    });

    it('should produce a 400 error email already exists in database', function() {
        return ctx.agent.post('/register')
            .send({ username: 'test5', password: "test123", email: 'test@testm.com'})
            .expect('Content-Type', /json/)
            .expect(400).then(function(res) {
                res.body.uniqueKeys.should.contains('email');
            });
    });

    it('should create a valid token if username and password are correct', function(){
        return ctx.agent.post('/auth')
            .send({username: 'test1', password: 'test123'})
            .expect('Content-type', /json/)
            .expect(200).then(function(res) {
                res.body.username.should.equal('test1');
                should.exist(res.body.token);
            });
    });

    describe('Authenticated tests', function() {
        var token;

        before(function() {
            return ctx.agent.post('/auth')
                .send({username: 'test1', password: 'test123'}).then(function(res) {
                    token = res.body.token;
                });
        });

        it('should return the current user profile', function() {
            return ctx.agent.get('/me')
                .set('authorization', 'Bearer '+token)
                .expect('Content-Type', /json/)
                .expect(200).then(function(res) {
                    res.body.username.should.equal('test1');
                    res.body.email.should.equal('test@test.unit');
                    res.body.status.should.equal('ACTIVE');
                    should.not.exist(res.body.password);
                });
        });

    });

});
