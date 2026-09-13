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

## Release work in progress

- EAS Android production versionCode 31 and iOS build 5 finished successfully.
- App Store record, version 1.1.0, English metadata, free price, categories, age rating and review contact configured.
- iPhone and iPad screenshots uploaded; availability configured. Apple processed build 5 as VALID and it is attached to version 1.1.0. Public API validation has no blocking errors. Apple privacy publication awaits the user's final certification.
- Android versionCode 31, the updated privacy policy URL, and corrected Data safety responses were sent for review. Google Play shows Changes in review while its automatic quick checks run; managed publishing is off, so approval will allow the full rollout.

See `store-release-1.1.0.md` for store identifiers, disclosure details, and remaining steps.

Do not mark this release published until each store confirms its actual submission/release state. Store review is asynchronous.
