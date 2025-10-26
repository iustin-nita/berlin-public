# Pre-Launch Checklist - Berlin Public

## ✅ COMPLETED

- [x] App name updated to "Berlin Public"
- [x] Bundle identifier changed to `com.blobstudio.berlinpublic`
- [x] Privacy policy created and hosted
- [x] Privacy policy URL added to app.json
- [x] App description written
- [x] Play Store listing prepared
- [x] EAS build configuration verified

---

## 📱 BEFORE BUILDING

### 1. Verify Assets
- [ ] App icon is 512x512 PNG (`./assets/icon.png`)
- [ ] Adaptive icon is correct (`./assets/adaptive-icon.png`)
- [ ] Splash screen looks good (`./assets/splash-icon.png`)
- [ ] All icons follow Google Play design guidelines

### 2. Test Thoroughly
- [ ] **On real Android device** (not just emulator)
- [ ] Test location permissions flow
  - [ ] Grant permission - works correctly
  - [ ] Deny permission - app handles gracefully
- [ ] Test offline mode
  - [ ] Turn off WiFi/data after data loads
  - [ ] Map still works
  - [ ] Favorites still accessible
  - [ ] Voting queue saves offline votes
- [ ] Test slow/bad network conditions
- [ ] Test all features:
  - [ ] Map view loads
  - [ ] Toggle between fountains/toilets
  - [ ] Details sheet opens
  - [ ] Directions work
  - [ ] Community voting works
  - [ ] Favorites save/load
  - [ ] Recenter button works
- [ ] Test edge cases:
  - [ ] No internet on first launch
  - [ ] Location disabled
  - [ ] Empty favorites list
  - [ ] No nearby amenities

### 3. Code Quality
- [ ] Remove console.logs in production code
- [ ] No hardcoded test data
- [ ] No TODO comments left behind
- [ ] Remove unused dependencies
- [ ] Check for any API key exposure

### 4. Legal Requirements
- [ ] Privacy policy is accessible and accurate
- [ ] Contact email (contact@blobstudio.dev) is monitored
- [ ] App complies with Google Play policies
- [ ] Location permission explanation is clear to users

---

## 🏗️ BUILD FOR PRODUCTION

### 1. Build Android App Bundle (AAB)

```bash
# Login to EAS (if not already)
eas login

# Build production Android
eas build --platform android --profile production
```

**What happens:**
- EAS builds an `.aab` file (Android App Bundle)
- Auto-increments version number
- Signs the app with your credentials
- Takes ~10-15 minutes

**After build completes:**
- [ ] Download the `.aab` file from EAS dashboard
- [ ] Keep it safe for Play Store upload

### 2. Optional: Build APK for testing
```bash
# Build APK for local testing (not for Play Store)
eas build --platform android --profile preview
```

---

## 📸 CREATE STORE ASSETS

### Screenshots (see PLAY_STORE_LISTING.md for details)

**Take 5-8 screenshots showing:**
1. [ ] Map view with markers
2. [ ] Details sheet with voting
3. [ ] Favorites screen
4. [ ] Toggle between views
5. [ ] Offline indicator (optional)
6. [ ] Onboarding (optional)

**How to take screenshots:**
- Use Android emulator or real device
- Resolution: 1080 x 1920 (or phone's native resolution)
- Clean data, realistic scenarios
- Consider adding text overlays highlighting features

**Tools:**
- Android Studio emulator screenshot tool
- Real device screenshot (Volume Down + Power)
- Screenshot editing: Figma, Canva, or Photoshop

### Feature Graphic
- [ ] Create 1024 x 500 banner image
- [ ] Should match app style/branding
- [ ] Include app name "Berlin Public"

### Optional: Video
- [ ] Record 30-60 second demo
- [ ] Upload to YouTube as unlisted
- [ ] Add URL to Play Store listing

---

## 🏪 GOOGLE PLAY CONSOLE SETUP

### 1. Create Google Play Developer Account
- [ ] Go to https://play.google.com/console
- [ ] Pay one-time $25 registration fee
- [ ] Verify identity
- [ ] Complete account setup

### 2. Create New App
- [ ] Click "Create app"
- [ ] App name: **Berlin Public**
- [ ] Default language: English (US) or German (DE)
- [ ] App type: App
- [ ] Free or paid: Free
- [ ] Declarations: Complete required forms

### 3. Store Listing
- [ ] App name: Berlin Public
- [ ] Short description: (from PLAY_STORE_LISTING.md)
- [ ] Full description: (from PLAY_STORE_LISTING.md)
- [ ] App icon: Upload 512x512 PNG
- [ ] Feature graphic: Upload 1024x500
- [ ] Screenshots: Upload 2-8 phone screenshots
- [ ] App category: Maps & Navigation
- [ ] Content rating: Complete questionnaire → Should be "Everyone"
- [ ] Contact email: contact@blobstudio.dev
- [ ] Privacy policy: https://iustin-nita.github.io/berlin-privacy-policy/PRIVACY_POLICY.md

### 4. App Content
- [ ] Privacy policy link added
- [ ] Data safety form:
  - [ ] Location data collected: YES
  - [ ] Used for: App functionality
  - [ ] Shared: NO
  - [ ] User can request deletion: YES (by uninstalling)
- [ ] Government apps: NO
- [ ] Financial features: NO
- [ ] Health features: NO

### 5. Pricing & Distribution
- [ ] Countries: Start with Germany, expand later
- [ ] Pricing: Free
- [ ] Contains ads: NO
- [ ] In-app purchases: NO
- [ ] Content rating: Everyone
- [ ] Target audience: All ages

### 6. App Access
- [ ] All features available without login: YES
- [ ] No special access needed

### 7. Upload AAB
- [ ] Go to Production → Create new release
- [ ] Upload your `.aab` file from EAS
- [ ] Release name: 1.0.0
- [ ] Release notes:
```
Initial release of Berlin Public!

- Find drinking fountains across Berlin
- Locate public restrooms
- Community voting system
- Works completely offline
- Save your favorite spots
- Beautiful map interface
```

---

## 🚀 FINAL CHECKS BEFORE SUBMITTING

- [ ] All store listing sections show green checkmarks
- [ ] Privacy policy is live and accessible
- [ ] Screenshots look professional
- [ ] App description is clear and compelling
- [ ] Contact email is correct and monitored
- [ ] AAB file uploaded successfully
- [ ] Tested APK on real device one more time
- [ ] No crash reports or critical bugs

---

## 📤 SUBMIT FOR REVIEW

- [ ] Click "Review release" in Play Console
- [ ] Verify all information is correct
- [ ] Click "Start rollout to Production"
- [ ] Wait for Google review (usually 1-3 days)

**After submission:**
- Monitor contact@blobstudio.dev for any Google communication
- Check Play Console for review status
- Be ready to respond to any review feedback

---

## 🎉 AFTER APPROVAL

- [ ] App is live on Google Play!
- [ ] Share link: `https://play.google.com/store/apps/details?id=com.blobstudio.berlinpublic`
- [ ] Monitor reviews and ratings
- [ ] Respond to user feedback
- [ ] Track crashes in Play Console
- [ ] Plan next features (bike stations, playgrounds, etc.)

---

## 🛠️ OPTIONAL IMPROVEMENTS FOR v1.1

- [ ] Add Sentry or Bugsnag for error tracking
- [ ] Add basic analytics (privacy-friendly)
- [ ] Implement rate limiting for API calls
- [ ] Add more amenity types (bike stations, playgrounds)
- [ ] Multilingual support (German, English)
- [ ] Dark mode optimization
- [ ] Share feature (share fountain locations)

---

## 📋 QUICK COMMAND REFERENCE

```bash
# Build production Android
eas build --platform android --profile production

# Check build status
eas build:list

# Submit to Play Store (alternative to manual upload)
eas submit --platform android

# Update app after changes
# 1. Make changes
# 2. Build again (version auto-increments)
eas build --platform android --profile production
# 3. Upload new AAB to Play Console
```

---

## 🆘 TROUBLESHOOTING

**Build fails:**
- Check eas build logs for errors
- Verify all dependencies are installed
- Make sure Mapbox tokens are valid

**App rejected by Google:**
- Common issues:
  - Privacy policy not accessible
  - Missing data safety declarations
  - Location permission not properly explained
  - Screenshots unclear or misleading

**App crashes on device:**
- Check Play Console crash reports
- Test on multiple devices/OS versions
- Verify all API calls handle errors

**Can't find app on Play Store:**
- Takes a few hours to appear after approval
- Search by exact package name first
- Check country availability settings

---

## 📞 SUPPORT

- EAS Documentation: https://docs.expo.dev/build/introduction/
- Play Console Help: https://support.google.com/googleplay/android-developer
- Expo Forums: https://forums.expo.dev/

Good luck with your launch! 🚀
