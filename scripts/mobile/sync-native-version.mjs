// Set the iOS MARKETING_VERSION (the App Store "version") from package.json so
// the native app cannot drift from the web build. Writes the pbxproj only when
// the value differs, so it changes once per version bump. Runs in `build:mobile`.
// Android reads package.json directly in android/app/build.gradle.
//
// The build number (CURRENT_PROJECT_VERSION) is not touched: fastlane sets it
// per TestFlight upload.
import { readFileSync, writeFileSync } from 'node:fs';

const PBXPROJ = 'ios/App/App.xcodeproj/project.pbxproj';
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
// App Store versions are up to three dot-separated integers; drop any pre-release suffix.
const version = String(pkg.version).split('-')[0];
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`[sync-native-version] ✗ package.json version "${pkg.version}" is not x.y.z`);
  process.exit(1);
}

const before = readFileSync(PBXPROJ, 'utf8');
const re = /MARKETING_VERSION = [^;]+;/g;
const count = (before.match(re) ?? []).length;
if (count === 0) {
  console.error(`[sync-native-version] ✗ no MARKETING_VERSION in ${PBXPROJ}`);
  process.exit(1);
}
const after = before.replace(re, `MARKETING_VERSION = ${version};`);
if (after === before) {
  console.log(`[sync-native-version] iOS MARKETING_VERSION already ${version}`);
} else {
  writeFileSync(PBXPROJ, after);
  console.log(`[sync-native-version] iOS MARKETING_VERSION → ${version} (${count} configurations)`);
}
