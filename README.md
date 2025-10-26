# Berlin Public

Find drinking fountains, public toilets, and essential amenities across Berlin. Works offline with community-driven updates.

## Features

- 🚰 **Drinking Fountains** - Find nearby water fountains with community verification
- 🚻 **Public Restrooms** - Locate toilets across Berlin with status updates
- 📍 **Offline Mode** - All data works without internet after initial download
- ⭐ **Favorites** - Save your go-to spots for quick access
- 👍 **Community Voting** - Vote on amenity status to help others
- 🗺️ **Beautiful Maps** - Powered by Mapbox with smooth navigation

## Tech Stack

- React Native with Expo SDK 53
- React Navigation (Native Stack + Bottom Tabs)
- Mapbox Maps for React Native
- TypeScript
- Offline-first architecture with AsyncStorage
- Community data from OpenStreetMap

## Getting Started

1. Install dependencies:
   ```sh
   npm install
   ```

2. Set up environment variables for Mapbox (see app.config.ts)

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

The `ios` and `android` folder are gitignored in the project by default as they are automatically generated during the build process ([Continuous Native Generation](https://docs.expo.dev/workflow/continuous-native-generation/)). This means that you should not edit these folders directly and use [config plugins](https://docs.expo.dev/config-plugins/) instead. However, if you need to edit these folders, you can remove them from the `.gitignore` file so that they are tracked by git.

## Publishing

See `PRE_LAUNCH_CHECKLIST.md` for complete publishing guide.

Quick commands:
```sh
# Build for Android
eas build --platform android --profile production

# Build for iOS
eas build --platform ios --profile production
```

## License

MIT

## Contact

- Email: contact@blobstudio.dev
- Privacy Policy: https://iustin-nita.github.io/berlin-privacy-policy/PRIVACY_POLICY.md
