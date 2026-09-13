# Store release 1.1.0

Updated 2026-09-13. Do not confuse uploaded builds or review submission with public availability.

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
- Community reports are unverified suggestions under the existing anonymous Supabase policies, not identity-backed votes.
- Two isolated synthetic report fixtures remain because anonymous deletion is not permitted. No real amenity received a false QA report.
- QA cleanup: restored iPhone system appearance; Android networking is on. Stopped this session's Metro processes on 8082/8083 and scoped Argent services for the iPhone, iPad and Android emulator. The unrelated RunWeather Metro on 8081 was left alone.
