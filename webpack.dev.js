/* webpack.dev.js - webpack developmental configuration */

/*region [section] configuration files */
const pkg = require('./package.json');
const settings = require('./webpack.settings.js');              // custom application settings
const common = require('./webpack.common.js');                  // development && production common configuration
/*endregion*/

/*region [section] Node modules */
const merge = require('webpack-merge');
const path = require('path');
const webpack = require('webpack');
/*endregion*/

/*region [section] Webpack plugins */
const DashboardPlugin = require('webpack-dashboard/plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
// const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const ExtractCssChunks = require('extract-css-chunks-webpack-plugin');
/*endregion*/

/*region [section] Rules */
const configureImagesRule = () => ({
    test: /\.(png|jpe?g|gif|svg|webp)$/i,
    use: [
        {
            loader: 'file-loader',
            options: {
                name: 'img/[name].[hash].[ext]'
            }
        }
    ]
});
const configureCssRule = () => ({
    test: /\.(sa|sc|pc|c)ss$/,
    use: [
        {
            loader: ExtractCssChunks.loader, options: {
                hmr: true,
                esModule: true
            }
        },
        {
            loader: "css-loader", options: {
                url: false,
                importLoaders: 2,
                sourceMap: true,
            }
        },
        {
            loader: "resolve-url-loader", options: {
                sourceMap: true
            }
        },
        {
            loader: "postcss-loader", options: {
                sourceMap: true
            }
        },
        // Compiles Sass to CSS
        {
            loader: 'sass-loader', options: {
                // implementation: require('sass'),
                sourceMap: true,
            }
        }
    ]
});
/*endregion*/

/*region [section] Dev Server config*/
const configureDevServer = () => {
    return {
        // public: settings.developmentOptions.devServerConfig.public(),
        // host: settings.developmentOptions.devServerConfig.host(),
        host: "0.0.0.0",
        port: settings.developmentOptions.devServerConfig.port(),
        https: !!parseInt(settings.developmentOptions.devServerConfig.https()),
        disableHostCheck: true,
        hot: true,
        overlay: true,
        watchContentBase: true,
        watchOptions: {
            poll: !!parseInt(settings.developmentOptions.devServerConfig.poll()),
            ignored: /node_modules/,
        },
        headers: {
            'Access-Control-Allow-Origin': '*'
        },
    };
};
/*endregion*/

development = {
    mode: 'development',
    output: {
        filename: path.join('./js', '[name].[hash].js'),
        // publicPath: settings.devServerConfig.public() + '/',
    },
    devtool: 'inline-source-map',
    devServer: configureDevServer(),
    module: {
        rules: [
            configureCssRule(),
            configureImagesRule(),
        ],
    },
    plugins: [
        new webpack.HotModuleReplacementPlugin(),
        new DashboardPlugin(),
        new ExtractCssChunks({
            filename: path.join('./css', '[name].css'),
        }),
        new HtmlWebpackPlugin({
            template: path.join(settings.paths.src.base, pkg.browser)
        }),
    ],
    optimization: {
        minimize: false,
        splitChunks: {
            chunks: 'all',
        }
    }
};

module.exports = merge(
    common, development
);
