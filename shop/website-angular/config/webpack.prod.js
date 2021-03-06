/**
 * @author: tipe.io
 */
const helpers = require('./helpers');
const buildUtils = require('./build-utils');

/**
 * Used to merge webpack configs
 */
const webpackMerge = require('webpack-merge');

/**
 * The settings that are common to prod and dev
 */
const commonConfig = require('./webpack.common.js');

/**
 * Webpack Plugins
 */

const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HashedModuleIdsPlugin = require('webpack/lib/HashedModuleIdsPlugin');
const TerserPlugin = require('terser-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

/***
 * Ref: https://github.com/mishoo/UglifyJS2/tree/harmony#minify-options
 * @param supportES2015
 * @param enableCompress disabling compress could improve the performance, see https://github.com/webpack/webpack/issues/4558#issuecomment-352255789
 * @returns {{ecma: number, warnings: boolean, ie8: boolean, mangle: boolean, compress: {pure_getters: boolean, passes: number}, output: {ascii_only: boolean, comments: boolean}}}
 */
function getUglifyOptions(supportES2015, enableCompress) {
	const uglifyCompressOptions = {
		pure_getters: true /* buildOptimizer */,
		// PURE comments work best with 3 passes.
		// See https://github.com/webpack/webpack/issues/2899#issuecomment-317425926.
		passes: 2 /* buildOptimizer */
	};

	return {
		ecma: supportES2015 ? 6 : 5,
		warnings: false, // TODO verbose based on option?
		ie8: false,
		mangle: true,
		compress: enableCompress ? uglifyCompressOptions : false,
		output: {
			ascii_only: true,
			comments: false
		}
	};
}

module.exports = function(env) {
	const ENV = (process.env.NODE_ENV = process.env.ENV = 'production');
	const supportES2015 = buildUtils.supportES2015(
		buildUtils.DEFAULT_METADATA.tsConfigPath
	);
	const sourceMapEnabled = process.env.SOURCE_MAP === '1';
	const METADATA = Object.assign({}, buildUtils.DEFAULT_METADATA, {
		host: process.env.HOST || 'localhost',
		port: process.env.PORT || 8080,
		ENV: ENV,
		HMR: false
	});

	// set environment suffix so these environments are loaded.
	METADATA.envFileSuffix = METADATA.E2E ? 'e2e.prod' : 'prod';

	return webpackMerge(commonConfig({ env: ENV, metadata: METADATA }), {
		mode: 'production',

		devtool: 'source-map',

		output: {
			path: helpers.root('dist'),
			filename: '[name].[chunkhash].bundle.js',
			sourceMapFilename: '[file].map',
			chunkFilename: '[name].[chunkhash].chunk.js'
		},

		module: {
			rules: [
				{
					test: /\.css$/,
					use: [MiniCssExtractPlugin.loader, 'css-loader'],
					include: [helpers.root('src', 'styles')]
				},
				{
					test: /\.scss$/,
					use: [
						MiniCssExtractPlugin.loader,
						'css-loader',
						'sass-loader'
					],
					include: [helpers.root('src', 'styles')]
				}
			]
		},

		optimization: {
			minimizer: [
				new TerserPlugin({
					sourceMap: sourceMapEnabled,
					parallel: true,
					cache: helpers.root('webpack-cache/uglify-cache')
					// TODO set terserOptions option instead of getUglify
					// uglifyOptions: getUglifyOptions(supportES2015, true)
				})
			],
			splitChunks: {
				chunks: 'all'
			}
		},

		plugins: [
			new MiniCssExtractPlugin({
				filename: '[name]-[hash].css',
				chunkFilename: '[name]-[chunkhash].css'
			}),
			new HashedModuleIdsPlugin()
		],

		node: {
			global: true,
			crypto: 'empty',
			process: false,
			module: false,
			clearImmediate: false,
			setImmediate: false,
			fs: 'empty'
		}
	});
};
