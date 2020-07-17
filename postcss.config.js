module.exports = {
    plugins: [
        require('postcss-import')({
            plugins: [
                require('stylelint')
            ]
        }),
        require('postcss-preset-env')({
            autoprefixer: {
                grid: true
            },
            features: {
                'nesting-rules': true
            }
        })
    ]
};
