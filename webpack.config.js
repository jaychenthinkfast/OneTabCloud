const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    popup: './src/popup/popup.js',
    options: './src/options/options.js',
    background: './src/background.js',
    gist: './src/lib/gist.js',
    storage: './src/lib/storage.js',
    crypto: './src/lib/crypto.js',
    view: './src/view.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'src/popup/popup.html', to: 'popup.html' },
        { from: 'src/options/options.html', to: 'options.html' },
        { from: 'src/view.html', to: 'view.html' },
        { from: 'assets', to: 'assets' }
      ],
    }),
  ],
}; 