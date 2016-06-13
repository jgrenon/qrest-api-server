
module.exports = function(Models, config, log) {
    log.info("Registering welcome email hook");

    function welcomeEmail(initial, user, next) {
        log.warn("Welcome email is not implemented yet!", user);
        return user;
    }

    Models.users.hooks.create.post = welcomeEmail;

};
