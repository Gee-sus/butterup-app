// ButterUpMobile/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Only watch this app folder
config.watchFolders = [projectRoot];

// Resolve modules only from this app's node_modules
config.resolver = config.resolver || {};
config.resolver.nodeModulesPaths = [path.join(projectRoot, 'node_modules')];

module.exports = config;
