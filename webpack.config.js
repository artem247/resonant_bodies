const path = require("path");

module.exports = {
    entry: "./src/app.js",
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "resonant-bodies.bundle.js",
        library: {
            name: "ResonantBodies",
            type: "umd",
        },
    },
    module: {
        rules: [
            {
                test: /\.worker\.js$/,
                use: { loader: "worker-loader" },
            },
        ],
    },
    resolve: {
        extensions: [".js"],
    },
};
