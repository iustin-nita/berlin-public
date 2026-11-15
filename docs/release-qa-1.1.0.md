# Release QA: 1.1.0

## Cloudflare cutover — 2026-10-01

- All 32 Supabase reports imported into EU-jurisdiction D1. Full normalized destination equality and SHA-256 fingerprint verification pass before and after synthetic live-test cleanup.
- Public Worker health queries D1 successfully. Live API tests pass for empty summaries, creating/changing a vote without duplicate rows, hiding other installation IDs, and rejecting invalid status. Only a synthetic QA amenity was written, then removed; real amenity reports were not changed.
- Jest: 24 tests / 5 suites pass with Watchman disabled. Backend: 12 D1 integration/migration tests pass. Both TypeScript checks pass.
- Standalone iOS Release simulator build 10 succeeds against SDK 27. The bundled manifest contains only `communityApiUrl` and EAS metadata in `extra`, with the verified Worker URL and Expo's scene delegate configuration.
- iPhone 18 Pro Max / iOS 27: fresh startup, onboarding skip, location denial, rendered map tiles/markers, list-to-details navigation, live community summary, favorite add/navigation, and cold restart with the favorite preserved pass.
- iPad Pro 13-inch (M5) / iOS 27: fresh startup, onboarding skip, location grant, rendered map tiles/markers, and BBQ category toggle pass.
- Preserved simulator artifact: `.asc/artifacts/BerlinPublic-simulator-build10.app`. Evidence: `ios27-build10-community-status.png`, `ios27-build10-favorite-after-restart.png`, and `ios27-build10-ipad-map.png` in `.asc/artifacts`.
- Physical iPhone, Android release-device QA, and new manual offline checks have not been performed for this cutover. Existing offline behavior and automated cache/error tests remain available evidence; do not claim new offline E2E coverage.
- Signed archive 10 and local Android EAS attempts failed because the disk filled. Initial failures and retries both show `No space left on device`; there is no new signed IPA/AAB ready for upload. Android attempts consumed remote versionCodes 33 and 34; the next auto-incremented build will use a higher code.
- Only this task's old compiler caches were deleted. Build 9's simulator app, archive, IPA, all private report backups, and source are preserved; the temporary signing keychain was removed and the original keychain search list restored.
- Build retries are paused under the native-app workflow's repeated-failure rule, awaiting owner direction to retry serially or free more space. Automatic Android workspace cleanup restored approximately 7.6 GB. No cutover build was uploaded or resubmitted.

## iOS 27 scene-lifecycle recovery — 2026-09-30

- Apple rejected build 8 under guideline 2.1(a). The supplied iPhone 17 Pro Max / iOS 27 crash log traps in `___UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption_block_invoke` before React Native startup.
- Updated Expo to 57.0.26, added expo-build-properties 57.0.22 with `ios.enableSceneSupport: true`, and aligned expo-location to 57.0.20. Online `expo install --check` passes.
- Preserved the previous generated iOS project in `.ios.generated/pre-scene-20260930`, regenerated iOS, and reinstalled CocoaPods dependencies. Generated AppDelegate adopts `ExpoReactNativeFactoryProvider`; the app's `UIApplicationSceneManifest` uses `EXExpoAppSceneDelegate`.
- Standalone **Release** simulator build succeeds against the iOS 27 SDK, without Metro or development-server dependencies.
- iPhone 18 Pro Max / iOS 27: fresh launch, all four onboarding pages, location denial, rendered map tiles and markers, category toggle, list-to-details navigation, favorite add/navigation, and cold restart with the saved favorite preserved all pass.
- iPad Pro 13-inch (M5) / iOS 27: fresh launch, onboarding skip, location grant, and map tiles/markers all pass. Physical iPhone startup was not tested.
- TypeScript passes; Jest passes **19 tests / 5 suites** with Watchman disabled for the sandbox. No production reports were added or changed.
- Signed build **9**, version **1.1.0**, archives and exports successfully using the existing distribution certificate/profile. Archive code-signature validation passes, and the signed app contains the scene manifest.
- IPA: `.asc/artifacts/BerlinPublic-1.1.0-9.ipa`; SHA-256 `95d9cc639034394fc3b59389f4e38b7caabf9c841ae2f6a0e67fde164381ccdd`. Screenshot evidence: `.asc/artifacts/ios27-build9-iphone-onboarding.png`, `ios27-build9-ipad-map.png`, and `ios27-build9-favorites-after-restart.png`.
- ASC upload and processing succeed: build `967b5d67-77cf-4b49-ba60-308edd344c26` is **VALID** and attached to version 1.1.0.
- Separate operational blocker: community status displays **Unavailable**. Read-only backend check fails with DNS `ENOTFOUND`; Supabase dashboard confirms the existing `berlin-public` project `ryeqylmoxygkjolhcpme` is **paused**. Requested permission to resume it on the existing Free plan. Resubmission is held pending that recovery; no plan upgrade, database write, or security-policy change was made.
- Offline device behavior was not re-tested in this recovery pass; the earlier offline checks below and automated tests remain the available evidence.

## Historical release verification

Date: 2026-09-13. Devices: iPhone 17 Pro / iOS 26.2, Pixel 9a emulator / Android 16 API 36; iPad Pro 13-inch (M5) / iOS 26.2 added for tablet coverage. Argent controls all in-app interaction.

## Verified

- Clean SDK 57 native development builds on iOS (EAS) and Android (local).
- Four-page onboarding on iPhone and Android, optional location granted on iPhone and denied on Android; browsing remains available.
- All nine Berlin WFS sources respond successfully (7,842 combined records at test time).
- iPhone map rendering and dark theme; readable dark details/list cards/brand.
- Android blank map reproduced; MapLibre HTTP/1.1 configuration improves loading. Restart, pan, and favorite navigation show tiles, but intermittent provider timeouts and slow cold tile loading remain observable.
- Android favorite add, persistent storage across restarts, return to the correct amenity and scrollable details; distance sort disabled without permission.
- iPhone community report saved and changed from working to not working, with a single database row and refreshed timestamp. UI counts moved from 1/0 to 0/1.
- Voting used synthetic QA feature IDs, never false reports on real amenities. `qa_release_20260913` and `qa_release_ui_20260913` are isolated fixtures. Anonymous deletion is not permitted; privileged cleanup remains pending.
- Details sheet's accessible=false fix exposes its buttons individually in iOS accessibility tree.
- Jest 19/19 tests and TypeScript check pass.

## Still to verify / finish

- Store review outcomes remain pending. The local Android release smoke build is separate from Google's store-signed delivery APKs.
- Apple privacy label published with the user's explicit approval; iOS submission is WAITING_FOR_REVIEW. Google Play quick checks completed and all five changes are in review.

## Operational notes

- Supabase project berlin-public was paused; restored the existing project and data. Dashboard browser session is signed in.
- Existing anonymous report policies permit public read/insert/update; reports remain unverified community suggestions. This is not identity-backed or abuse-resistant voting. Do not describe them as verified status.
- No production reports were deleted or database policies changed during recovery.

## Additional passes

- iPad map, list, details and system sharing popover work; all nine categories toggle on and back down to one. The final active category intentionally stays enabled.
- Full-resolution iPad screenshots uploaded and processed; iPhone captures validate at the accepted 6.5-inch dimensions.
- iPhone address search reproduced a geocoding miss for Alexanderplatz; explicit Berlin/Germany hint returns the correct location. Results are filtered to Berlin.
- Android offline detection keeps cached details and disables both vote controls. Removed the overlapping map banner while details are open (the sheet contains its own offline explanation).
- iPhone Navigate opens Apple Maps; provider onboarding remains controlled by Apple Maps.
- Expo Doctor: 21/21 checks pass.
- The initial iOS production signing bundle was rejected by the build keychain. Re-exported PKCS#12 with compatible encryption and verified a valid code-signing identity in a temporary keychain.

## Latest-design integration

- Fetched and merged the previously missing June 8 design update from origin/main (26fdf9c). Preserved the new markers, floating controls, filter sheet and redesigned screens together with all reliability fixes.
- Fixed filter contrast in dark mode and filter/details layering above list results. Select-all and reset work on iPhone and iPad.
- Changed clipboard to a static import after reproducing a Metro lazy-module failure; iPhone Copy link now shows success.
- Regenerated and replaced all six App Store screenshots with the merged design.
- Standalone Android release: offline status appears inside details without an overlapping banner; both vote controls disable offline and re-enable online.
- Android address search after resetting location permission: denial shows "Search needs location access" and keeps map browsing available. Retrying and allowing approximate location successfully centers the rendered map on Alexanderplatz (200 m scale).
- Final EAS artifacts: Android 31 (1.1.0) accepted by Google Play; iOS 5 (1.1.0) processed as VALID by Apple, bundle com.blobstudio.berlinpublic, SDK 26.5, minimum iOS 16.4.
- Play confirms no reduction in supported devices. Its only bundle warning is the absent deobfuscation file; R8/minification is not enabled. Native debug symbols are attached.
