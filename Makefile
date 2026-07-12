# Mobile (Capacitor) dev-loop convenience targets.
#
# IMPORTANT: `cap sync` only COPIES the existing build/ into the native project —
# it does NOT rebuild the web app. So a bare `npx cap sync` ships stale code.
# These targets always rebuild the mobile web bundle first, then sync.
#
# Typical loop after editing web code:  make ios   (then press ⌘R in Xcode)

.PHONY: ios ios-sync android android-sync mobile-build

## mobile-build: build the streamed mobile web bundle (MOBILE=1, size-budgeted).
mobile-build:
	npm run build:mobile

## ios-sync: rebuild the mobile web bundle + copy it into the iOS project.
ios-sync: mobile-build
	npx cap sync ios

## ios: rebuild + sync + open Xcode. Then press ⌘R to run on the device.
ios: ios-sync
	npx cap open ios

## android-sync: rebuild the mobile web bundle + copy it into the Android project.
android-sync: mobile-build
	npx cap sync android

## android: rebuild + sync + open Android Studio.
android: android-sync
	npx cap open android
