// withBackupOverrides.js
const { withAndroidManifest, AndroidConfig } = require("@expo/config-plugins");

const TOOLS_NS = "http://schemas.android.com/tools";

function ensureToolsNamespace(androidManifestJson) {
  // Add xmlns:tools on the <manifest> element
  const rootAttrs =
    androidManifestJson.manifest.$ || (androidManifestJson.manifest.$ = {});
  if (!rootAttrs["xmlns:tools"]) {
    rootAttrs["xmlns:tools"] = TOOLS_NS;
  }
}

function upsertToolsReplace(appNode, keys) {
  const attrs = appNode.$ || (appNode.$ = {});
  const existing = (attrs["tools:replace"] || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const set = new Set([...existing, ...keys]);
  attrs["tools:replace"] = Array.from(set).join(", ");
}

function setBackupAttributes(appNode) {
  const attrs = appNode.$ || (appNode.$ = {});
  attrs["android:fullBackupContent"] = "@xml/secure_store_backup_rules";
  attrs["android:dataExtractionRules"] =
    "@xml/secure_store_data_extraction_rules";
}

module.exports = function withBackupOverrides(config) {
  return withAndroidManifest(config, (c) => {
    // IMPORTANT: pass the WHOLE modResults object, not modResults.manifest
    const androidManifestJson = c.modResults;

    ensureToolsNamespace(androidManifestJson);

    // Will throw if <application> is missing (it shouldn't be in a normal Expo template)
    const app =
      AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifestJson);

    // Make our app override library manifests (e.g. AppsFlyer) for these two attrs
    upsertToolsReplace(app, [
      "android:fullBackupContent",
      "android:dataExtractionRules",
    ]);

    // Point to SecureStore’s rule files so those values win
    setBackupAttributes(app);

    return c;
  });
};
