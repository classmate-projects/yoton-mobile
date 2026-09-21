const { withMainActivity } = require("expo/config-plugins");

// Patient health data is shown throughout the app, so the Android window is marked FLAG_SECURE
// from the moment the activity is created: screenshots come out black, screen recording/casting
// is blocked, and the Recents thumbnail is hidden. (The MAUI app did exactly this in
// MainActivity.OnCreate.) expo-screen-capture also sets the flag from JS, but only once JS is
// running - this covers cold start and any activity re-creation before that.
//
// Developers can opt out for QA screenshots by prebuilding with EXPO_PUBLIC_ALLOW_SCREENSHOTS=1
// (the JS side honours the same variable in dev builds only - see app/_layout.tsx).
const MARKER = "YOTON_SECURE_WINDOW";

module.exports = function withSecureWindow(config) {
  return withMainActivity(config, (mod) => {
    if (process.env.EXPO_PUBLIC_ALLOW_SCREENSHOTS === "1") return mod;

    let source = mod.modResults.contents;
    if (source.includes(MARKER)) return mod;

    if (mod.modResults.language !== "kt") {
      throw new Error("withSecureWindow: expected a Kotlin MainActivity.");
    }

    const withImport = source.replace(/(\nimport android\.os\.Bundle\n)/, "$1import android.view.WindowManager\n");
    const withFlag = withImport.replace(
      /(super\.onCreate\((?:null|savedInstanceState)\)\n)/,
      `$1    window.addFlags(WindowManager.LayoutParams.FLAG_SECURE) // ${MARKER}\n`,
    );

    // Fail loudly if the Expo template changes shape: silently losing screenshot protection on a
    // health app would be far worse than a broken prebuild.
    if (withImport === source || withFlag === withImport) {
      throw new Error("withSecureWindow: could not patch MainActivity.kt - update plugins/withSecureWindow.js for the new template.");
    }

    mod.modResults.contents = withFlag;
    return mod;
  });
};
