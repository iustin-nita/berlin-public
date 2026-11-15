# Store release 1.1.0

Updated 2026-10-01. Do not confuse uploaded builds or review submission with public availability.

## Backend replacement check — 2026-10-01

The user approved the scoped Wrangler permission grant. The Worker is live at `https://berlin-public-community.iustin-nitza.workers.dev`; EU-jurisdiction D1 contains all 32 legacy reports with exact source/destination fingerprint equality. Live creation/replacement, summary privacy, validation, and database-backed health pass; the synthetic cutover report was removed. The public endpoint is configured locally and in EAS production, and the updated privacy policy is published.

Fresh store checks confirm iOS 1.1.0 is PREPARE_FOR_SUBMISSION with VALID build 9 attached, and Android 1.1.0 (31) is Available on Google Play, released September 13, with no unpublished changes. Both binaries still embed Supabase configuration. Neither endpoint can be changed remotely: the app has no Expo OTA runtime.

Standalone iOS build 10 passes iOS 27 iPhone/iPad startup, map, community-read, favorite-persistence, and category-toggle checks. Signed iOS/Android attempts and retries exhausted disk space; no signed migration artifact is ready, uploaded, or submitted. Disposable compiler-cache cleanup preserved build 9 artifacts; failed Android attempts consumed versionCodes 33 and 34. Automatic workspace cleanup restored approximately 7.6 GB, but the native-build recovery rule requires owner direction before another attempt. Retry one platform at a time and use a higher Android versionCode. ASC API auth works; the browser session needs sign-in to recheck privacy/agreements. Keep the source project and existing exports intact.

## Latest App Store recovery status

- September 22 rejection: version 1.1.0/build 8 crashed at launch on iOS 27 because the generated app had no scene-lifecycle integration.
- Fixed with Expo 57.0.26 and the supported scene plugin; regenerated and tested a standalone Release app on iOS 27 iPhone and iPad simulators. See `release-qa-1.1.0.md` for evidence and test scope.
- Replacement build **9**, `967b5d67-77cf-4b49-ba60-308edd344c26`, uploaded locally through ASC and processed **VALID**. It is attached to version `1be6aa43-6298-450f-bf3d-2b82da7c697d` (1.1.0).
- Existing submission `90394766-2410-494f-967b-fd796d65f22d` has unresolved issues. Do not create a duplicate submission or describe this build as resubmitted/published yet.
- Resubmission held: the existing Supabase project `berlin-public` is paused, leaving community status unavailable. Permission requested to resume the existing Free project, then verify reporting before recovering the existing review submission. Automatic release after approval remains the intended release mode.

The September 13 store records below are historical.

## Google Play

- App: `4975257907426970417`, package `com.blobstudio.berlinpublic`.
- Production release 1.1.0 uses versionCode **31**. EAS build: `17116113-ebd6-4c77-b20f-8807437975e6` (finished).
- Uploaded bundle accepted; target SDK 36, minimum API 24, existing device support preserved.
- Sent five changes together for review: production full rollout, English description, phone screenshot correction, current privacy policy URL, and corrected Data safety questionnaire. The review was restarted to include the listing corrections. Automatic quick checks completed; console confirms **Your changes are now in review**. Managed publishing is off.
- [Publishing overview](https://play.google.com/console/u/1/developers/5687902761139331902/app/4975257907426970417/publishing).

Data safety now declares optional installation IDs and community reports, plus address-search queries and approximate map-area data sent to providers, for app functionality. Data is encrypted in transit. The app has no account creation or advertising tracking. Provider/service and user-initiated transfer exemptions were applied to the sharing question. No ephemeral-retention exemption was claimed for provider requests because their complete retention behavior is not under our control.

The policy and report-deletion request link point to the current repository privacy policy. Deletion requests cover community reports we can identify; this is not a promise to delete independent provider logs.

The English full description was refreshed to explain voting, optional location, and the distinction between cached amenity information and offline maps. Removed the old "No signal? Still works" marketing screenshot from the listing submitted for review. The original app icon is explicitly named `ChatGPT Image Oct 26, 2025, 07_51_00 PM.png`; it and the feature graphic containing that artwork were labeled as AI-created/edited through Play's asset declaration. The five remaining screenshots retain their existing labels. Canonical description: `metadata/google-play/en-US/full-description.txt`.

## App Store

- App: **6811594594**, Berlin Public.
- Version: `1be6aa43-6298-450f-bf3d-2b82da7c697d`, **1.1.0**, automatic release after approval.
- EAS build: `99576d4b-8221-4cd2-9a3e-d8fc95a80edf` (finished).
- Build **5**: `8df47c70-ee74-444e-af32-3b1a0f893324`, processed **VALID** and attached to the version.
- English listing, free pricing, Navigation/Travel categories, age rating, availability, three iPhone and three iPad screenshots are configured.
- Review contact uses Iustin Nita, contact@blobstudio.dev, and the existing RunWeather review phone number as explicitly requested. No login is required.
- Public API validation: zero blocking errors. Empty What's New is a warning on this first App Store release.
- Browser regulatory section checked: non-trader status is inherited; medical-device requirement does not apply to this Navigation/Travel app with no medical content. China ICP and Vietnam game license entries are not claimed.
- **WAITING_FOR_REVIEW:** the user explicitly approved the final privacy certification, the browser confirmed the label was published by Iustin Nita, and `asc review submit` successfully submitted version 1.1.0/build 5.
- Review submission: `5a57c0b4-ef79-4e2d-a240-0d98a294af6f`, submitted `2026-09-13T15:10:38.369Z`. `asc review status` independently confirms WAITING_FOR_REVIEW. Automatic release after approval remains configured.
- [App Privacy](https://appstoreconnect.apple.com/apps/6811594594/distribution/privacy).

The published Apple privacy label declares Other User Content and Device ID, used for app functionality, linked to the installation, without tracking. Native geocoder data collected independently by Apple is outside the app developer's disclosure responsibility under Apple's framework guidance. Device GPS is processed locally; the app does not upload a GPS history. The privacy policy describes map tile requests and providers' operational logs.

## Disclosure references

- [Google Play data safety definitions](https://support.google.com/googleplay/android-developer/answer/10787469): off-device requests, pseudonymous identifiers, ephemeral processing, and sharing exemptions.
- [Apple app privacy details](https://developer.apple.com/app-store/app-privacy-details/): collection definition and Apple framework/service responsibility.
- [OpenFreeMap privacy](https://openfreemap.org/privacy/): anonymized operational logs, no regular IP logging, and temporary IP logging for security incidents.

## Remaining operational limits

- Android tile loading is improved but intermittent provider timeouts and slow cold loads were observed; cached amenity browsing remains available. See the QA report for scope.
- Community reports are unverified suggestions keyed by an anonymous installation ID, not identity-backed votes. Limits: per installation, per IP, and per-IP writes (30/min) on the Cloudflare Worker.
- QA cleanup: restored iPhone system appearance; Android networking is on. Stopped this session's Metro processes on 8082/8083 and scoped Argent services for the iPhone, iPad and Android emulator. The unrelated RunWeather Metro on 8081 was left alone.

## Resubmission after rejections (2026-11-15)

Rejections: 5.1.1(iv) on build 5 (Sep 19), Skip bypassed the location prompt; 2.1(a) on build 8 (Sep 22), crash on launch on iOS 27 because the app had no UIScene lifecycle.

- Fixes: `expo-build-properties` `ios.enableSceneSupport` (EXExpoAppSceneDelegate); every onboarding exit calls `requestForegroundPermissionsAsync`; no Skip on the location slide.
- Community backend moved from Supabase to the Cloudflare Worker + D1. Worker deployed (version fa9d21fb), `/health` ok.
- iOS build 1.1.0 (10): signed locally (`.asc/build-10-signed.sh`), VALID, attached to version 1.1.0. Tested on iOS 27 simulators (iPhone 17 Pro Max, iPad Air 11 M3) and on a real iPhone via TestFlight (internal group "Internal Testers").
- Review notes explain both fixes. Attachment: `berlin-public-1.1.0-10-ios27-fresh-install.mp4` (fresh install, onboarding, system prompt, map). The ASC web reply was not posted (no web session).
- Existing submission `90394766-2410-494f-967b-fd796d65f22d`: rejected item marked resolved, resubmitted 2026-11-15T12:32Z. `asc review status`: WAITING_FOR_REVIEW.
- Android 1.1.0 (versionCode 36, EAS cloud build): internal testing, then promoted to production with a 10% staged rollout (about 3 of 27 active installs). Sent for Google review 2026-11-15. Raise the rollout in Play Console after review if vitals stay clean.
