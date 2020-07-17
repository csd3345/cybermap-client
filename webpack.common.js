/* webpack.common.js - webpack common configuration */

/*[section] configuration files */
const pkg = require('./package.json');
const settings = require('./webpack.settings.js');

/*[section] node modules */
const path = require('path');
const webpack = require("webpack");

/*[section]  Webpack plugins */
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ManifestPlugin = require('webpack-manifest-plugin');
const WebpackNotifierPlugin = require('webpack-notifier');

/*[section] Loaders */
const configureBabelLoader = () => ({
    loader: 'babel-loader',
    options: {
        cacheDirectory: true
    },
});

/*[section] Entries */
const configureEntries = () => {
    let entries = {};
    Object.entries(settings.entries).forEach(([key, value]) => {
        entries[key] = path.resolve(__dirname, settings.paths.src.js + value);
    });
    // for (const [key, value] of Object.entries(settings.entries)) {
    //     entries[key] = path.resolve(__dirname, settings.paths.src.js + value);
    // }
    return entries;
};

/*[section] Common module exports - The base webpack config */
module.exports = {
    name: pkg.name,
    target: "web", // enum
    entry: configureEntries(),
    output: {
        path: path.resolve(__dirname, settings.paths.dist.base),
        // publicPath: settings.urls.publicPath()
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".json", ".geojson"]
    },
    module: {
        rules: [
            {
                test: /\.(ttf|eot|woff2?)$/i,
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            name: 'fonts/[name].[ext]'
                        }
                    }
                ]
            },
            {
                test: /\.js$/,
                exclude: [/(node_modules|bower_components)/],
                use: [configureBabelLoader(),]
            },
            {
                test: /\.tsx?$/,
                exclude: [/(node_modules|bower_components)/],
                use: [
                    configureBabelLoader(),
                    {
                        loader: "ts-loader",
                        options: {}
                    }
                ]
            },
            {
                test: /\.geojson$/,
                use: [{
                    loader: 'json-loader'
                }],
            }
        ],
    },
    plugins: [
        new WebpackNotifierPlugin({
            title: 'Cybermap',
            excludeWarnings: true,
            alwaysNotify: false
        }),
        new ManifestPlugin({
            fileName: "manifest.json",
            basePath: "",
            map: (file) => {
                file.name = file.name.replace(/(\.[a-f0-9]{32})(\..*)$/, '$2');
                return file;
            },
        }),
        new webpack.ProvidePlugin({
            p5: "p5",
            $: 'jquery',
            jQuery: 'jquery',
            // 'window.jQuery': 'jquery',
            'window.$': 'jquery',
            // bootstrap: 'bootstrap',
            // mapboxgl: 'mapbox-gl',
            d3: 'd3',
        }),
    ]
};
