// webpack.settings.js - webpack settings config

require('dotenv').config();

// noinspection WebpackConfigHighlighting
module.exports = {
    name: "Real Time CyberAttacks Map",
    copyright: "CSD UOC",
    paths: {
        src: {
            base: "./src/",
            css: "./src/css/",
            js: "./src/js/"
        },
        dist: {
            base: "./web/dist/",
            css: "./web/dist/css",
            js: "./web/dist/js",
            clean: ['**/*',]
        },
    },
    urls: {
        live: () => process.env.SERVER_HOST || null,
        publicPath: () => process.env.PUBLIC_PATH || "/dist/",
    },
    entries: {
        "app": "index.js"
        // "app": "app.ts"
    },
    productionOptions: {
        faviconsConfig: {
            logo: "./src/img/logo-cybermap-transparent.png",
            prefix: "assets/favicons/"
        },
        purgeCssConfig: {
            paths: [
                "./src/**/*.html",
            ],
            whitelist: [
                "./src/css/components/**/*.{css}"
            ],
            whitelistPatterns: [],
        },
        criticalCssConfig: {
            base: "./web/dist/criticalcss/",
            suffix: "_critical.min.css",
            criticalHeight: 1200,
            criticalWidth: 1200,
            ampPrefix: "amp_",
            ampCriticalHeight: 19200,
            ampCriticalWidth: 600,
            pages: [{
                url: "",
                template: "index"
            }]
        },
        allowCompression: false
    },
    developmentOptions: {
        devServerConfig: {
            public: () => process.env.PUBLIC_PATH || "http://localhost:8080",
            host: () => process.env.DEV_SERVER_HOST || "localhost",
            poll: () => process.env.DEV_SERVER_POLL || false,
            port: () => process.env.DEV_SERVER_PORT || 8080,
            https: () => process.env.DEV_SERVER_HTTPS || false,
        }
    }
};
