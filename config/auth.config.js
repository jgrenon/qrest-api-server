module.exports = {
    // May be overriden by environment
    JWT_EXPIRES_IN: 15 * 60 * 60,   // 15 minutes
    JWT_ISSUER: "qrest-api.com",
    JWT_AUDIENCE: "my-qrest-client-app",
    JWT_SHARED_KEY: "121212121212",

    auth: {
        salt: "CHANGE_THIS_SALT_TO_SECURE_YOUR_PASSWORDS!"
    }
};