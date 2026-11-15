# Berlin Public 1.1.0 release recovery

Updated 2026-09-13. The previous plan's blanket completion claim was inaccurate: favorite sorting did not persist, offline voting was not gated, and the Supabase project had paused.

## Completed implementation

- Upgrade Expo 55 to 57, React Native 0.83 to 0.86, compatible native modules, React Navigation, Supabase, and development tooling.
- Restore the existing Supabase project; configure its current public URL/key in EAS development, preview, and production environments.
- Save and change community votes remotely, refresh timestamps, keep one report per installation and amenity, display actual counts, prevent duplicate submissions and stale responses, and show failures honestly.
- Remove the misleading local-only voting fallback. Missing backend configuration is an unavailable service.
- Load and validate per-category cached data, preserve cached results after failed refreshes, report partial errors, and avoid dropping in-flight category loads.
- Keep the map camera mounted during loading, preserve favorite navigation, keep users outside Berlin centered on Berlin, and expose location-denial recovery.
- Persist favorite sorting and disable distance sorting when location is unavailable.
- Fix dark-mode maps, list cards, branding, details, and status banners; make the details sheet scroll and expose individual accessible controls.
- Isolate MapLibre Android requests to HTTP/1.1 with bounded concurrency/timeouts after reproducing HTTP/2 tile stalls. Native clean rebuild and restart verified.
- Correct offline and privacy claims: cached amenity details remain usable; new map tiles, geocoding, and reports need internet.

- Merge the latest remote design update and fix filter layering, dark filter contrast, and lazy clipboard loading.

## Verification

See `release-qa-1.1.0.md` for device evidence and pending checks. Jest: 19 tests in 5 suites; TypeScript passes. Expo Doctor and platform exports are part of the release gate.

## Store review pending

- EAS Android production versionCode 31 and iOS build 5 finished successfully.
- App Store record, version 1.1.0, English metadata, free price, categories, age rating and review contact configured.
- iPhone and iPad screenshots uploaded; availability configured. Apple processed build 5 as VALID and it is attached to version 1.1.0. The user approved the final privacy certification, the label was published, and the release was submitted. Apple status: WAITING_FOR_REVIEW.
- Android versionCode 31, listing corrections, the updated privacy policy URL, and corrected Data safety responses were sent for review. Google Play's quick checks completed and the console confirms Changes in review. Managed publishing is off, so approval will allow the full rollout.

See `store-release-1.1.0.md` for store identifiers, disclosure details, and remaining steps.

Do not mark this release published until each store confirms its actual submission/release state. Store review is asynchronous.

## iOS 27 launch-crash recovery

Updated 2026-09-30. Apple rejected 1.1.0 (8) on September 22 under guideline 2.1(a). Its crash report stops in `___UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption_block_invoke` before React Native starts.

- Update Expo within SDK 57 to 57.0.26 and add `expo-build-properties` 57.0.22.
- Enable `ios.enableSceneSupport` in the config plugin so prebuild generates Expo's scene delegate integration and `UIApplicationSceneManifest`.
- Use iOS build number 9, regenerate the iOS project, and verify a standalone Release build on iOS 27.
- Rebuild, upload through ASC, validate the existing version, and recover the existing review submission after successful verification.

Release simulator tests pass on iOS 27 iPhone and iPad; TypeScript and all 19 Jest tests pass. Signed build 9 is uploaded, processed VALID, and attached to 1.1.0. Resubmission is held because the existing Supabase project is paused; permission to resume the Free project has been requested. Evidence and current state are recorded in the release QA and store release documents.

## Community backend migration

Requested 2026-09-30: replace Supabase's manually paused Free database with Cloudflare D1 behind a Worker.

- Preserve existing reports, installation identities, timestamps, one-vote-per-amenity semantics, 60-day summaries, and 14-day decay.
- Add versioned HTTPS API routes, prepared database queries, input limits, server timestamps, rate limiting, and summaries that do not expose other installation IDs.
- Export the source twice, compare fingerprints, retain a private backup, import idempotently, and verify all destination records.
- Remove the mobile Supabase SDK and credentials; configure only the public API URL.
- Update and publish the privacy policy, test release startup and online/offline behavior, build iOS 10 or newer, and check both stores for required submissions.
- Keep the legacy source intact during migration. Existing store binaries cannot switch endpoints without an app update; no Expo OTA runtime is installed.

Updated 2026-10-01: the owner approved Wrangler access; EU D1 is created, all 32 reports are imported with exact destination fingerprint verification, and the Worker is deployed and passes live read/write/privacy checks. Local and EAS production configuration use the public endpoint, and the revised privacy policy is published. All 24 app tests, 12 backend tests, and both TypeScript checks pass. Standalone build 10 passes iOS 27 iPhone/iPad startup and key UI checks. Signed builds and retries exhausted disk space, so store submissions remain pending and the native-build recovery workflow requests owner direction before another attempt. Retry serially after confirming available space, and reauthenticate the Apple browser session for privacy/agreements checks. See `community-backend.md` for the runbook.
