module.exports = function(wallaby) {
    return {
        files: [{pattern: "src/**/*.js", load: false}],

        tests: [{pattern: "__tests__/**/*.js", load: true}],

        compilers: {
            "**/*.js": wallaby.compilers.babel({})
        },

        testFramework: "jest",
        env: {
            type: "node"
        }
    }
}
