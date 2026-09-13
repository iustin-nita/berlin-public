const { withMainApplication, withAppBuildGradle } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// HTTP/2 tile requests stalled on Android while the same URLs loaded on iOS
// and through fetch. Use HTTP/1.1 for MapLibre only, with bounded concurrency
// and timeouts. TLS verification and the app's other HTTP clients are unchanged.
module.exports = function withMapLibreNetworking(config) {
  config = withAppBuildGradle(config, (mod) => {
    const props = fs.readFileSync(path.join(path.dirname(require.resolve('@maplibre/maplibre-react-native/package.json')), 'android/gradle.properties'), 'utf8');
    const version = props.match(/^org\.maplibre\.reactnative\.nativeVersion=(.+)$/m)?.[1];
    if (!version) throw new Error('MapLibre native version could not be resolved');
    const dependency = `    implementation("org.maplibre.gl:android-sdk-opengl:${version}")`;
    if (!mod.modResults.contents.includes(dependency)) {
      mod.modResults.contents = mod.modResults.contents.replace('dependencies {', `dependencies {\n${dependency}`);
    }
    return mod;
  });
  return withMainApplication(config, (mod) => {
    const marker = '// Berlin Public map networking';
    if (mod.modResults.contents.includes(marker)) return mod;
    mod.modResults.contents = mod.modResults.contents.replace(
      '    super.onCreate()',
      `    super.onCreate()
    ${marker}
    org.maplibre.android.MapLibre.getInstance(this)
    org.maplibre.android.module.http.HttpRequestUtil.setOkHttpClient(
      okhttp3.OkHttpClient.Builder()
        .protocols(listOf(okhttp3.Protocol.HTTP_1_1))
        .connectTimeout(15, java.util.concurrent.TimeUnit.SECONDS)
        .readTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
        .callTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
        .dispatcher(okhttp3.Dispatcher().apply { maxRequestsPerHost = 6 })
        .build()
    )`,
    );
    return mod;
  });
};
