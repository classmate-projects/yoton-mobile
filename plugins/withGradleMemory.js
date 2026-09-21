const { withGradleProperties } = require("expo/config-plugins");

// The Expo template generates `org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m`, which is
// too small for a release build of this app's native modules (the Kotlin compile fails with
// "Metaspace" partway through). Raise the ceilings so `gradlew bundleRelease` is reliable locally
// and in CI.
const JVM_ARGS = "-Xmx4096m -XX:MaxMetaspaceSize=1024m";

module.exports = function withGradleMemory(config) {
  return withGradleProperties(config, (mod) => {
    mod.modResults = mod.modResults.filter((item) => !(item.type === "property" && item.key === "org.gradle.jvmargs"));
    mod.modResults.push({ type: "property", key: "org.gradle.jvmargs", value: JVM_ARGS });
    return mod;
  });
};
