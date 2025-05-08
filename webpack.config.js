const { library } = require("webpack");

module.exports = {
    entry: "./src/main.js",
    output: {
        library: 'helloWorld'
    }
}