// webpack.prod.js - production builds

/*region [section] configuration files */
const common = require('./webpack.common.js');
const pkg = require('./package.json');
const settings = require('./webpack.settings.js');
/*endregion*/

/*region [section] Node modules */
const git = require('git-rev-sync');
const glob = require('glob-all');
const merge = require('webpack-merge');
const moment = require('moment');
const path = require('path');
const webpack = require('webpack');
/*endregion*/

/*region [section] Webpack plugins */
const HtmlWebpackPlugin = require('html-webpack-plugin');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const ExtractCssChunks = require('extract-css-chunks-webpack-plugin');
const FaviconsWebpackPlugin = require('favicons-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const ImageminWebpWebpackPlugin = require('imagemin-webp-webpack-plugin');
const Critters = require('critters-webpack-plugin');
const PurgecssPlugin = require('purgecss-webpack-plugin');
const PurgecssWhitelisterPlugin = require('purgecss-whitelister');
const CompressionPlugin = require('compression-webpack-plugin');
const zopfli = require('@gfx/zopfli');

// const MiniCssExtractPlugin = require('mini-css-extract-plugin');
// const FixStyleOnlyEntriesPlugin = require("webpack-fix-style-only-entries");
// const ExtraneousFileCleanupPlugin = require('webpack-extraneous-file-cleanup-plugin');
/*endregion*/

const configureCompression = () => {
    const allowed = settings.productionOptions.allowCompression;
    if (!allowed) return null;
    return new CompressionPlugin({
        test: /\.(js|css|html|svg|png|webp)$/,
        filename: '[path].gz[query]',
        // threshold: 10240,
        threshold: 8192, // in bytes => 8Kb
        minRatio: 0.8,
        deleteOriginalAssets: false,
        compressionOptions: {
            numiterations: 15,
            level: 9
        },
        algorithm(input, compressionOptions, callback) {
            return zopfli.gzip(input, compressionOptions, callback);
        }
    });
};
const configurePurgeCss = () => {
    let paths = [];
    settings.productionOptions.purgeCssConfig.paths.forEach((value) => {
        paths.push(path.join(__dirname, value));
    });
    // for (const [key, value] of Object.entries(settings.purgeCssConfig.paths)) {
    //     paths.push(path.join(__dirname, value));
    // }
    return {
        paths: glob.sync(paths),
        whitelist: PurgecssWhitelisterPlugin(settings.productionOptions.purgeCssConfig.whitelist),
        whitelistPatterns: settings.productionOptions.purgeCssConfig.whitelistPatterns,
        extractors: [{
            extractor: purgeCssExtractor,
            extensions: ["html", "js"]
        }]
    };
};

const purgeCssExtractor = (content) => {
    /**
     * @description Custom PurgeCSS extractor that allows special characters in class names
     * @returns array of css selectors
     */
    return content.match(/[A-Za-z0-9-_:\/]+/g) || [];
};


production = {
    mode: 'production',
    output: {
        filename: path.join('./js', '[name].[contenthash:8].js')
    },
    devtool: 'source-map',
    module: {
        rules: [
            {
                test: /\.(sa|sc|pc|c)ss$/,
                use: [
                    {
                        loader: ExtractCssChunks.loader, options: {
                            hmr: false,
                            esModule: true,
                        }
                    },
                    {
                        loader: "css-loader", options: {
                            url: false,
                            importLoaders: 2,
                            sourceMap: false,
                        }
                    },
                    {
                        loader: "resolve-url-loader", options: {
                            sourceMap: false
                        }
                    },
                    {
                        loader: "postcss-loader", options: {
                            sourceMap: false
                        }
                    },
                    {
                        loader: "sass-loader", options: {
                            sourceMap: false
                        }
                    }
                ]
            },
            {
                test: /\.(png|jpe?g|gif|svg|webp)$/i,
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            name: 'img/[name].[hash].[ext]'
                        }
                    },
                    {
                        loader: 'img-loader',
                        options: {
                            plugins: [
                                require('imagemin-gifsicle')({
                                    interlaced: true,
                                }),
                                require('imagemin-mozjpeg')({
                                    progressive: true,
                                    arithmetic: false,
                                }),
                                require('imagemin-optipng')({
                                    optimizationLevel: 5,
                                }),
                                require('imagemin-svgo')({
                                    plugins: [{convertPathData: false}]
                                }),
                            ]
                        }
                    }
                ]
            },
        ],
    },
    optimization: {
        runtimeChunk: "single",
        splitChunks: {
            maxInitialRequests: Infinity,
            minSize: 1000,
            automaticNameDelimiter: '~',
            cacheGroups: {
                /* The default webpack cacheGroups. Disable them for full customization */
                default: false,
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    // test(module, chunks) {
                    //     // let ret_val = module.resource &&
                    //     //     module.resource.endsWith('.js') &&
                    //     //     module.resource.includes(`${path.sep}node_modules${path.sep}`);
                    //     // return ret_val;
                    //     return module.type === 'javascript/auto'
                    // },
                    chunks: "all",
                    name(module, chunks, cacheGroupKey) {
                        /* cross platform using path.sep */
                        const moduleFileName = module.identifier()
                            .split(path.sep)
                            .reduceRight(item => item)
                            .replace('@', '')
                            .split(/\.(?:js|css)(?:\s\d+)?$/gm)
                            [0];
                        const allChunksNames = chunks.map((item) => item.name).join('~');
                        return `vendors${path.sep}${moduleFileName}`;
                    },
                    priority: 10
                },
                // styles: {
                //     test: /\.css$/,
                //     name: (module, chunks, cacheGroupKey) => {
                //         /* cross platform with path.sep*/
                //         const moduleFileName = module.identifier()
                //             .split(path.sep)
                //             .reduceRight(item => item)
                //             .replace('@', '')
                //             .split(/\.(?:css)(?:\s\d+)?$/gm)
                //             [0];
                //         console.log(`styles -> ${moduleFileName}`);
                //         return `vendors${path.sep}${moduleFileName}`;
                //     },
                //     chunks: 'all',
                //     priority: 7
                // },
                // geojson: {
                //     test: /\.(?:geojson)$/gm,
                //     name(module, chunks) {
                //         const moduleFileName = module.identifier()
                //             .split(path.sep)
                //             .reduceRight(item => item)
                //             .replace('@', '')
                //             .split(/\.geojson/gm)
                //             [0];
                //         return moduleFileName;
                //     }
                // },
                common: {
                    name: 'common',
                    minChunks: 2,
                    chunks: 'all',
                    priority: 5,
                    reuseExistingChunk: true,
                    enforce: true
                }
            }
        },
        removeEmptyChunks: true,
        mergeDuplicateChunks: true,
        flagIncludedChunks: true,
        concatenateModules: true,
        minimize: true,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    parse: {
                        /**
                         * We want terser to parse ecma 8 code. However, we don't want it
                         * to apply any minification steps that turns valid ecma 5 code
                         * into invalid ecma 5 code. This is why the 'compress' and 'output'
                         * sections only apply transformations that are ecma 5 safe
                         * https://github.com/facebook/create-react-app/pull/4234
                         **/
                        ecma: 8
                    },
                    compress: {
                        ecma: 5,
                        /**
                         * Disabled because of an issue with Uglify breaking seemingly valid code:
                         * https://github.com/facebook/create-react-app/issues/2376
                         * Pending further investigation: https://github.com/mishoo/UglifyJS2/issues/2011
                         **/
                        warnings: false,
                        /**
                         * Disabled because of an issue with Terser breaking valid code:
                         * https://github.com/facebook/create-react-app/issues/5250
                         * Pending further investigation: https://github.com/terser-js/terser/issues/120
                         **/
                        comparisons: false,
                        inline: 2
                    },
                    mangle: {
                        safari10: true
                    },
                    output: {
                        ecma: 5,
                        comments: false,
                        ascii_only: true
                    }
                },
                cache: true,
                parallel: true,
                sourceMap: true
            }),
            new OptimizeCSSAssetsPlugin()
        ]
    },
    plugins: [
        new CleanWebpackPlugin({
            cleanOnceBeforeBuildPatterns: settings.paths.dist.clean,
            verbose: false,
            dry: false
        }),
        new HtmlWebpackPlugin({
            template: path.join(settings.paths.src.base, pkg.browser)
        }),
        new ExtractCssChunks({
            filename: path.join('./css', '[name].[contenthash:8].css'),
        }),
        // new PurgecssPlugin({
        //     paths: glob.sync(`${settings.paths.src.base}/**/*`, {nodir: true})
        // }),
        // new Critters({
        //     preload: 'swap', // Outputs: <link rel="preload" onload="this.rel='stylesheet'">
        //     preloadFonts: true // Don't inline critical font-face rules, but preload the font URLs:
        // }),
        new FaviconsWebpackPlugin({
            logo: settings.productionOptions.faviconsConfig.logo,
            prefix: settings.productionOptions.faviconsConfig.prefix,
            cache: false,
            inject: true,
            favicons: {
                appName: pkg.name,
                appDescription: pkg.description,
                developerName: pkg.author.name,
                developerURL: pkg.author.url,
                path: settings.paths.dist.base,

                icons: {
                    // Platform Options:
                    // - offset - offset in percentage
                    // - background:
                    //   * false - use default
                    //   * true - force use default, e.g. set background for Android icons
                    //   * color - set background for the specified icons
                    //   * mask - apply mask in order to create circle icon (applied by default for firefox). `boolean`
                    //   * overlayGlow - apply glow effect after mask has been applied (applied by default for firefox). `boolean`
                    //   * overlayShadow - apply drop shadow after mask has been applied .`boolean`
                    //
                    android: true,              // Create Android homescreen icon. `boolean` or `{ offset, background, mask, overlayGlow, overlayShadow }`
                    appleIcon: true,            // Create Apple touch icons. `boolean` or `{ offset, background, mask, overlayGlow, overlayShadow }`
                    appleStartup: false,         // Create Apple startup images. `boolean` or `{ offset, background, mask, overlayGlow, overlayShadow }`
                    coast: true,                // Create Opera Coast icon. `boolean` or `{ offset, background, mask, overlayGlow, overlayShadow }`
                    favicons: true,             // Create regular favicons. `boolean` or `{ offset, background, mask, overlayGlow, overlayShadow }`
                    firefox: true,              // Create Firefox OS icons. `boolean` or `{ offset, background, mask, overlayGlow, overlayShadow }`
                    windows: true,              // Create Windows 8 tile icons. `boolean` or `{ offset, background, mask, overlayGlow, overlayShadow }`
                    yandex: false                // Create Yandex browser icon. `boolean` or `{ offset, background, mask, overlayGlow, overlayShadow }`
                }

            }
        }),
        new ImageminWebpWebpackPlugin({
            detailedLogs: true,
            silent: false,
            strict: true
        }),
        new webpack.BannerPlugin({
            banner: [
                '/*',
                ' * @project        ' + settings.name,
                ' * @name           ' + '[filebase]',
                ' * @author         ' + pkg.author.name,
                ' * @build          ' + moment().format('llll') + ' ET',
                // TODO: change below to real git
                ' * @release        ' + 'git.long()' + ' [' + 'git.branch()' + ']',
                ' * @copyright      Copyright (c) ' + moment().format('YYYY') + ' ' + settings.copyright,
                ' *',
                ' */',
                ''
            ].join('\n'),
            raw: true
        }),
        configureCompression,
        new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: 'bundle-analyzer-report.html',
        }),
    ],
};


module.exports = merge(
    common, production
);
