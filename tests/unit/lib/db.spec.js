const setup = require('../setup');
const should = require('chai').should();

describe('DB', function() {
    var ctx;
    
    before(function(){
        return setup({testMode: true}).then(function(context) {
            ctx = context;
        });
    });

    it('should expose a test default DB', function() {
        return ctx.DB.getDB().then(function(db) {
            should.exist(db);
            should.exist(db._gopts.memStore);
        });
    });

    it('should return the same DB if asked twice (cached)', function() {
        return ctx.DB.getDB("qrest_api").then(function(db) {
            should.exist(db);
            return ctx.DB.getDB("qrest_api").then(function(db2) {
                db.should.equal(db2);
            });
        });
    });
});
