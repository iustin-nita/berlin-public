# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Berlin Public — an Expo/React Native app for finding public fountains, toilets, and amenities in Berlin. Uses MapLibre + OpenFreeMap for maps, Supabase for community features, and Berlin Open Data WFS endpoints for fountain/toilet data.

**Requires dev builds** (not Expo Go) due to the MapLibre native module. New Architecture is enabled (SDK 55 default).

## Commands

| Task | Command |
|------|---------|
| Dev server | `npm start` (uses `expo start --dev-client`) |
| iOS build | `npm run ios` |
| Android build | `npm run android` |
| Web (limited) | `npm run web` — map features are native-only |
| Type check | `tsc --noEmit` |
| Tests | `npm test` (Jest) |
| Run single test | `npx jest path/to/file.test.ts` |
| Clear Metro cache | `npm start -- --clear` |
| Nuke Metro cache | `rm -rf /tmp/metro-* /tmp/haste-map-*` |
| Android release APK | `npm run build:apk` |
| Android release AAB | `npm run build:aab` |
| Prebuild (regenerate native dirs) | `npm run prebuild` |

## Architecture

### Entry & Navigation
- `index.tsx` → mounts `src/App.tsx` (theme, asset preloading, splash hide, deep-link prefixes)
- `src/navigation/index.tsx` → root navigation tree using `@react-navigation` v7 static config (native-stack + bottom-tabs)
- Deep-link scheme: `berlinpublic://`

### Map Screen (`src/navigation/screens/Map.tsx` + `src/navigation/screens/map/`)
The main screen. Heavy module with sub-components being extracted into `map/`:
- `useFountainsData.ts` / `useCachedFountainsData.ts` — fetch + cache WFS data
- `DetailsSheet.tsx` — bottom sheet for selected fountain/toilet
- `ToggleBar.tsx` — dataset segment toggle (Fountains vs Toilets)
- `ChoiceBar.tsx` — disambiguation when multiple features under tap
- `RecenterButton.tsx`, `MapHint.tsx`, `MapHeader.tsx`, `MapScaleBar.tsx`, `OfflineBanner.tsx`, `OutOfBoundsBanner.tsx`
- `utils.ts` — haversine distance, ETA, data parsing
- `navigationIntents.ts` — external navigation (Citymapper → Google Maps → Apple Maps → web fallback)
- `Map.styles.ts` — StyleSheet extracted from Map screen

### Data Flow
- Three WFS datasets from `gdi.berlin.de`: drinking fountains (`trinkwasserbrunnen`), ornamental fountains (`zierbrunnen`), toilets (`toiletten`)
- Features rendered via MapLibre `GeoJSONSource` + `Layer` (symbol/circle) with custom marker icons per dataset
- Feature IDs prefixed per dataset (`drink_`, `decor_`, `toilet_`) to avoid key collisions
- Clustering enabled for dense areas

### Other Modules
- `src/favorites/` — FavoritesContext + AsyncStorage persistence
- `src/community/` — Supabase-backed community status (voting, device ID, store)
- `src/hooks/useNetworkStatus.ts` — online/offline detection
- `src/utils/location.ts` — location utilities
- `src/components/BrandMark.tsx` — shared branding component
- `src/navigation/MapNavigationContext.tsx` — cross-screen map coordination

### Configuration
- `app.config.ts` — dynamic Expo config; Supabase config, scheme, plugins
- Maps use MapLibre + OpenFreeMap — no token/key required
- Supabase via `SUPABASE_URL` and `SUPABASE_ANON_KEY` env vars

## Key Conventions

- TypeScript strict mode. No `any`. Explicit types for exported APIs and navigation params.
- Functional components + hooks only. No classes.
- Navigation: `@react-navigation` v7 with static config. Do NOT migrate to `expo-router`.
- New screens go in `src/navigation/screens/`, registered in `src/navigation/index.tsx`.
- Platform-agnostic code preferred; platform checks only when required.
- Prefer Expo modules and config plugins over manual native edits. Use `expo install` for dependencies.
- Do not hand-edit `android/` or `ios/` directories; use `app.config.ts` and config plugins.
