const { withAppBuildGradle } = require("expo/config-plugins");

// `expo prebuild` generates the native Android project (it isn't checked in), and the template it
// generates signs release builds with the public debug keystore. This plugin gives the generated
// project a real "release" signing config that reads the keystore from environment variables -
// which is how CI (see .github/workflows/build-android.yml) supplies it:
//
//   ANDROID_KEYSTORE_PATH, ANDROID_STORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD
//
// Without ANDROID_KEYSTORE_PATH the build falls back to the debug keystore, so a local
// `expo run:android --variant release` still works (just not Play-Store-uploadable).
const MARKER = "YOTON_RELEASE_SIGNING";

const RELEASE_CONFIG = `signingConfigs {
        release { // ${MARKER}
            def keystorePath = System.getenv("ANDROID_KEYSTORE_PATH")
            if (keystorePath) {
                storeFile file(keystorePath)
                storePassword System.getenv("ANDROID_STORE_PASSWORD")
                keyAlias System.getenv("ANDROID_KEY_ALIAS")
                keyPassword System.getenv("ANDROID_KEY_PASSWORD")
            }
        }
        debug {`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    let gradle = mod.modResults.contents;
    if (gradle.includes(MARKER)) return mod;

    const withConfig = gradle.replace(/signingConfigs \{\s*debug \{/, RELEASE_CONFIG);
    const withBuildType = withConfig.replace(
      /(release \{[^}]*?)signingConfig signingConfigs\.debug/,
      `$1signingConfig System.getenv("ANDROID_KEYSTORE_PATH") ? signingConfigs.release : signingConfigs.debug`,
    );

    // Fail loudly if the Expo template changes shape: silently shipping a debug-signed "release"
    // would be far worse than a broken prebuild.
    if (withConfig === gradle || withBuildType === withConfig) {
      throw new Error("withReleaseSigning: could not patch android/app/build.gradle - update plugins/withReleaseSigning.js for the new template.");
    }

    mod.modResults.contents = withBuildType;
    return mod;
  });
};
