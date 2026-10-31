# iOS App Store — to do before asking Apple for review

A working list for when the app gets its own focus. Started 2026-10-31 from a read
of the project (Info.plist, Xcode project, fastlane, the lab-api config, the
/privacy page) — **not** from App Store Connect, which can't be read from the dev
machines (no API key there, and some answers need an Apple ID). Tick items off
here; add new ones as they come up. Build/upload how-to:
[the mobile guide](../docs/guides/mobile-build-and-deploy.md) §5.

Legend: **[blocker]** likely rejection if left · **[needed]** App Store Connect
will not let you submit without it · **[check]** probably fine, confirm once.

## 1. Fix in the app first

- [ ] **[blocker] Lab "Sign in with Google" cannot work inside the app.**
  - Inside the app the sign-in redirect is `capacitor://localhost/lab/callback`
    (`src/lib/lab/ask/config.ts`). The prod allowlist has only the three web URLs
    (`ORRERY_LAB_WEB_REDIRECT_URIS` in `.github/workflows/deploy-prod.yml`), so
    lab-api refuses it.
  - Google also refuses OAuth inside an embedded web view
    (`disallowed_useragent`).
  - A reviewer who taps the button meets a broken feature (guideline 2.1, app
    completeness).
  - Were it working, a Google-only login also triggers guideline 4.8: Sign in
    with Apple must be offered alongside it. Account deletion (5.1.1(v)) follows
    once accounts exist.
  - Options:
    - **(a) recommended for a first submission:** hide the Ask sign-in in the
      native app and show "Ask is available on orrerylearn.com".
    - **(b) later:** native sign-in through `ASWebAuthenticationSession`, a
      `orrery://` redirect added to the allowlist, Sign in with Apple, and an
      account-deletion path.
- [ ] **[check] `UIRequiredDeviceCapabilities` says `armv7`** (Info.plist).
  - The build is arm64-only (deployment target iOS 15).
  - Current Xcode templates use `arm64`.
  - Change it, or confirm the uploaded build validates without a warning.
- [ ] **[check] iPad.** The app ships for iPhone *and* iPad
  (`TARGETED_DEVICE_FAMILY = 1,2`).
  - Apple reviews on an iPad too and requires iPad screenshots.
  - Run through every route on an iPad, both orientations: layout, panels,
    AR, the offline download.
  - If iPad is not ready, ship iPhone-only for now (family `1`).
- [ ] **[check] Telemetry tier in the release build.**
  - The guide's prod DSN example ends in `/4`; `sentry.ts` says prod is
    project 18.
  - Confirm which DSN the release build bakes in before archiving (guide §5).

## 2. Privacy (App Store Connect → App Privacy)

- [ ] **[needed] Upload the App Privacy answers.**
  - The answers are in `App/fastlane/app_privacy_details.json`, the same facts as
    `App/App/PrivacyInfo.xcprivacy`: crash data, product interaction, search
    history, other user content (Lab questions), email (Lab sign-in). No
    tracking.
  - From `ios/App`, run `APPLE_ID=<your Apple ID> bundle exec fastlane privacy`.
    It asks for your password and 2FA code.
  - If the Lab sign-in is hidden in the app (§1 a), drop `EMAIL_ADDRESS` and
    `OTHER_USER_CONTENT` from both files first. The app then no longer sends
    them.
- [ ] **[needed] Privacy policy URL** — `https://orrerylearn.com/privacy`.
  - The page says "You never need an account … no name, email address or
    password to give".
  - It does not mention the Lab sign-in or that /ask questions go to an LLM.
  - Either add that section (all 14 locales), or hide sign-in in the app (§1 a).
    With sign-in hidden, the page is accurate for the app as shipped.

## 3. Store listing (App Store Connect → the app → version page)

- [ ] **[needed] Screenshots.** iPhone 6.9″ (1320 × 2868 or 1290 × 2796) and, while
  iPad is supported, iPad 13″ (2064 × 2752). Up to 10 each; the first three carry
  the listing.
- [ ] **[needed] Description, keywords (100 characters), promotional text,
  subtitle (30 characters).** English first; other locales optional (the app has
  14, the listing can follow).
- [ ] **[needed] Support URL** (a page or mailto that answers) and, optionally,
  a marketing URL (`https://orrerylearn.com`).
- [ ] **[needed] Category.** Education, with Reference or Utilities as secondary.
- [ ] **[needed] Age rating questionnaire.** No objectionable content. External
  links open in an in-app browser (SFSafariViewController) to specific sites,
  which is not "unrestricted web access".
- [ ] **[needed] Content rights.** "Does the app contain, show or access
  third-party content?" — yes (NASA, ESA, JAXA, Wikimedia imagery and others,
  each credited on `/credits`). Confirm you hold the rights the licences give.
  The posters are AI-generated originals, provenance on `/colophon`.
- [ ] **[check] Export compliance.** `ITSAppUsesNonExemptEncryption` is `false`
  (HTTPS only) — App Store Connect should not ask again.
- [ ] **[needed] Pricing and availability.** Free, which countries.
- [ ] **[check] Version.** `MARKETING_VERSION` is 0.9.1 (from package.json). The
  1.0 bump waits until you have tested the release build for a few days.

## 4. Review notes (App Store Connect → App Review Information)

- [ ] **[needed] Contact name, phone, email** for the reviewer.
- [ ] **[needed] Notes.** Say what the reviewer can't see on a quick tap:
  - The camera is used only for AR (place the solar system in the room). The
    location is used only to point at the sky (where the Moon is). Both stay on
    the device.
  - Offline packs: what they are, the sizes (170 MB / ~800 MB), and that they are
    excluded from iCloud backup.
  - It is not a website wrapper (guideline 4.2): it has offline mode, AR, native
    share and haptics, and deep links (`orrery://`).
  - If the Lab Ask is still in the app: it is an invite-only beta. Give a demo
    account, or say it is hidden on iOS.
- [ ] **[check] Demo account.** Needed only if anything behind a login stays in
  the app.

## 5. Before pressing "Submit for Review"

- [ ] A TestFlight build of the exact commit, installed and used for a few days
  (iPhone + iPad), crash-free in GlitchTip (prod project, `platform:ios`).
- [ ] Every route opens; AR on a real device; offline download, airplane mode,
  relaunch.
- [ ] Deep links: `orrery://fly?mission=curiosity` opens the right screen.
- [ ] Language switch works and survives a relaunch.

## Done

- [x] Privacy manifest `App/App/PrivacyInfo.xcprivacy` (UserDefaults CA92.1, data
  types, no tracking) — 2026-10-31; CI builds it into the app and lints it.
- [x] Offline packs excluded from iCloud backup (AppDelegate) — 2026-10-31.
- [x] Camera and location usage strings (Info.plist).
- [x] Export-compliance key (Info.plist).
- [x] TestFlight pipeline: `npm run beta` (fastlane) — guide §5.
