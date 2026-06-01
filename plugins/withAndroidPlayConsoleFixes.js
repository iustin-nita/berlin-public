const {
  AndroidConfig,
  withAndroidManifest,
  withAndroidStyles,
  withMainActivity,
} = require('@expo/config-plugins');

const LARGE_SCREEN_THRESHOLD_DP = 600;
const ORIENTATION_IMPORT = 'import android.content.pm.ActivityInfo';
const ORIENTATION_BLOCK = `    requestedOrientation =
      if (resources.configuration.smallestScreenWidthDp < ${LARGE_SCREEN_THRESHOLD_DP}) {
        ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
      } else {
        ActivityInfo.SCREEN_ORIENTATION_FULL_USER
      }
`;

function ensureOrientationImport(contents) {
  if (contents.includes(ORIENTATION_IMPORT)) {
    return contents;
  }

  return contents.replace(
    'import android.os.Build',
    `${ORIENTATION_IMPORT}\nimport android.os.Build`,
  );
}

function ensureOrientationBlock(contents) {
  if (contents.includes('ActivityInfo.SCREEN_ORIENTATION_FULL_USER')) {
    return contents;
  }

  return contents.replace(
    '    // @generated end expo-splashscreen\n    super.onCreate(null)',
    `    // @generated end expo-splashscreen\n${ORIENTATION_BLOCK}    super.onCreate(null)`,
  );
}

const withAndroidPlayConsoleFixes = (config) => {
  config = withAndroidManifest(config, (mod) => {
    const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(mod.modResults);
    delete mainActivity.$['android:screenOrientation'];
    return mod;
  });

  config = withMainActivity(config, (mod) => {
    let contents = mod.modResults.contents;
    contents = ensureOrientationImport(contents);
    contents = ensureOrientationBlock(contents);
    mod.modResults.contents = contents;
    return mod;
  });

  config = withAndroidStyles(config, (mod) => {
    const appTheme = AndroidConfig.Styles.getAppThemeGroup();
    let styles = mod.modResults;
    styles = AndroidConfig.Styles.removeStylesItem({
      xml: styles,
      parent: appTheme,
      name: 'android:statusBarColor',
    });
    styles = AndroidConfig.Styles.removeStylesItem({
      xml: styles,
      parent: appTheme,
      name: 'android:navigationBarColor',
    });
    mod.modResults = styles;
    return mod;
  });

  return config;
};

module.exports = withAndroidPlayConsoleFixes;
