// Metro: de app deelt de domein- en datalaag met de webapp (../src/domain, ../src/core).
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const shared = path.resolve(__dirname, '..', 'src');
config.watchFolders = [...(config.watchFolders ?? []), shared];
// De gedeelde code (src/domain, src/core) heeft geen runtime-imports van pakketten; zo komt er nooit
// een tweede React of Supabase-client uit de web-node_modules in de app-bundel.
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];

module.exports = config;
