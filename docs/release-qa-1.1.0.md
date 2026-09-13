# Release QA: 1.1.0

Date: 2026-09-13. Devices: iPhone 17 Pro / iOS 26.2, Pixel 9a emulator / Android 16 API 36; iPad Pro 13-inch (M5) / iOS 26.2 added for tablet coverage. Argent controls all in-app interaction.

## Verified

- Clean SDK 57 native development builds on iOS (EAS) and Android (local).
- Four-page onboarding on iPhone and Android, optional location granted on iPhone and denied on Android; browsing remains available.
- All nine Berlin WFS sources respond successfully (7,842 combined records at test time).
- iPhone map rendering and dark theme; readable dark details/list cards/brand.
- Android blank map reproduced and fixed by MapLibre HTTP/1.1 configuration; restart, pan, and favorite navigation show tiles.
- Android favorite add, persistent storage across restarts, return to the correct amenity and scrollable details; distance sort disabled without permission.
- iPhone community report saved and changed from working to not working, with a single database row and refreshed timestamp. UI counts moved from 1/0 to 0/1.
- Voting used synthetic QA feature IDs, never false reports on real amenities. `qa_release_20260913` and `qa_release_ui_20260913` are isolated fixtures. Anonymous deletion is not permitted; privileged cleanup remains pending.
- Details sheet's accessible=false fix exposes its buttons individually in iOS accessibility tree.
- Jest 19/19 tests and TypeScript check pass.

## Still to verify / finish

- Final production artifact smoke checks remain.
- Android address-search permission recovery and final offline layout retest.
- Store upload, privacy declarations, availability and review submission.

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
