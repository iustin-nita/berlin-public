const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Fix path mismatch between EAS local build temp directory and real node_modules.
 *
 * EAS local builds symlink node_modules from a temp dir, causing require.resolve()
 * to return the temp path while CMake builds run from the real path.
 * This plugin sets REACT_NATIVE_WORKLETS_NODE_MODULES_DIR relative to rootDir
 * so the path resolves consistently in both contexts.
 */
const withFixReanimatedWorklets = (config) => {
  return withAppBuildGradle(config, (mod) => {
    const extLine =
      'project.ext.REACT_NATIVE_WORKLETS_NODE_MODULES_DIR = new File(rootDir, "../node_modules/react-native-worklets")';

    if (!mod.modResults.contents.includes('REACT_NATIVE_WORKLETS_NODE_MODULES_DIR')) {
      mod.modResults.contents = mod.modResults.contents.replace(
        'apply plugin: "com.android.application"',
        `${extLine}\napply plugin: "com.android.application"`,
      );
    }

    return mod;
  });
};

module.exports = withFixReanimatedWorklets;
