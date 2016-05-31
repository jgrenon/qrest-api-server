module.exports = function () {
    return {
        files: [
            'config/**/*.js',
            'hooks/**/*.js',
            'lib/**/*.js',
            'models/**/*.js',
            'routes/**/*.js',
            'tests/unit/setup.js',
            'tests/unit/data/**.*'
        ],

        tests: [
            'tests/unit/**/*.spec.js'
        ],

        env: {
            type: 'node',
            runner: 'node',
            params: {
                env: 'NODE_ENV=test',
                runner: '--harmony'
            }
        },

        testFramework: 'mocha',

        workers: {
            recycle: true
        },

        debug: true
    };
};
