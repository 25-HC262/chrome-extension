const { library } = require("webpack");
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    mode: 'development',
    entry: "./src/app.js",
    output: {
        filename: 'content.js',
        path: path.resolve(__dirname, 'dist'),
    },
    devtool: 'source-map',
    module: {
        rules: [
            {
                test: /\.html$/i,
                type: 'asset/source', // HTML을 문자열로 처리
            },
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },
        ],
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: 'src/public/index.html', to: 'public/index.html' },
                { from: 'src/public/index.css', to: 'public/index.css' }
            ],
        }),
    ],
    resolve: {
        extensions: ['.js'],
    },
};