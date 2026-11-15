# Project Environment

Updated 2026-09-30.

- Expo 57.0.26 / React Native 0.86.3 / React 19.2.3; iOS and Android native dev builds using MapLibre 11.3.10.
- npm with package-lock.json. Run `npm install`, `npm test -- --runInBand`, and `npx tsc --noEmit`.
- Native directories are generated and ignored; edit `app.config.ts` and config plugins.
- `npm run prebuild:ios` installs pods and generates the Xcode workspace; `npm run ios -- --device <UDID>`.
- `npm run android -- --device Pixel_9a`; production signing and version codes managed by EAS.
- `npm start -- --port 8082` for this session (8081 belongs to a separate RunWeather workspace).
- Bundle/package: `com.blobstudio.berlinpublic`; EAS project `3b7bdd53-574d-4362-ae7c-6d9883b4dfca`.
- Community reporting uses a Cloudflare Worker and D1; the app receives only the public `COMMUNITY_API_URL`. See `community-backend.md`. Never save credential values in documentation.
- Available: Xcode 27, CocoaPods 1.16.2, Java 17, Android SDK, Argent, asc, EAS CLI.
- Initial checkout had no node_modules and an incomplete iOS workspace; npm dependencies restored this session.

Xcode 27 supports local iOS 27 simulator verification and signed release builds. Production iOS signing uses ignored credentials.json and signing material outside the repository. Scene support is enabled through expo-build-properties; regenerate native projects after configuration changes.
