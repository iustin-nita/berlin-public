# Berlin Public

Find drinking fountains, public toilets, and essential amenities across Berlin. Amenity data is cached for offline browsing after the first successful sync, with community-driven status updates.

## Features

- 🚰 **Drinking Fountains** - Find nearby water fountains with community verification
- 🚻 **Public Restrooms** - Locate toilets across Berlin with status updates
- 📍 **Offline Browsing** - Cached amenity data remains available after the first successful sync
- ⭐ **Favorites** - Save your go-to spots for quick access
- 👍 **Community Voting** - Vote on amenity status to help others
- 🗺️ **Beautiful Maps** - Powered by MapLibre + OpenFreeMap (free & open-source)

## Tech Stack

- React Native with Expo SDK 55 (New Architecture)
- React Navigation (Native Stack + Bottom Tabs)
- MapLibre Native for React Native (with OpenFreeMap tiles — no API key)
- TypeScript
- Offline-first amenity caching with AsyncStorage
- Berlin public GIS/WFS data feeds plus community status reports

## Getting Started

1. Install dependencies:
   ```sh
   npm install
   ```

2. Set up environment variables:
   ```sh
   cp .env.example .env
   ```
   Maps need no key (MapLibre + OpenFreeMap). Fill in (optional) Supabase credentials. See
   [`.env.example`](.env.example) for what each variable is for.

3. Start the development server:
   ```sh
   npm start
   ```

4. Build and run on device:
   ```sh
   npm run ios
   # or
   npm run android
   ```

## Notes

This project uses a [development build](https://docs.expo.dev/develop/development-builds/introduction/) and cannot be run with [Expo Go](https://expo.dev/go). To run the app with Expo Go, edit the `package.json` file, remove the `expo-dev-client` package and `--dev-client` flag from the `start` script.

We highly recommend using the development builds for normal development and testing.

This project is now prebuild-first: `app.config.ts` is the source of truth for native configuration, and `ios/` and `android/` are generated artifacts. Regenerate them with `npm run prebuild`, `npm run prebuild:android`, or `npm run prebuild:ios` instead of editing committed native files by hand.

## Publishing

See `PRE_LAUNCH_CHECKLIST.md` for complete publishing guide.

Quick commands:
```sh
# Build for Android
eas build --platform android --profile production

# Build for iOS
eas build --platform ios --profile production
```

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for
setup, conventions, and the pull-request process. By participating you agree to
our [Code of Conduct](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE) © Iustin Nita

## Contact

- Email: contact@blobstudio.dev
- Privacy Policy: https://iustin-nita.github.io/berlin-privacy-policy/PRIVACY_POLICY.md
