const { withAndroidManifest } = require('expo/config-plugins');

// Android 11+ package visibility otherwise hides browsers without a Custom
// Tabs service (including some Huawei browsers) from Expo's activity query.
function addBrowserQuery(androidManifest) {
  const queries = (androidManifest.manifest.queries ??= []);
  const group = queries[0] ?? (queries[0] = {});
  const intents = (group.intent ??= []);
  if (!intents.some(intent =>
    intent.action?.some(action => action.$?.['android:name'] === 'android.intent.action.VIEW') &&
    intent.data?.some(data => data.$?.['android:scheme'] === 'https') &&
    !intent.data?.some(data => Object.keys(data.$ ?? {}).some(key => key !== 'android:scheme'))
  )) {
    intents.push({
      action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
      category: [{ $: { 'android:name': 'android.intent.category.BROWSABLE' } }],
      data: [{ $: { 'android:scheme': 'https' } }],
    });
  }
  return androidManifest;
}

module.exports = config => withAndroidManifest(config, mod => {
  mod.modResults = addBrowserQuery(mod.modResults);
  return mod;
});
module.exports.addBrowserQuery = addBrowserQuery;
